'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useSequencer } from '@/hooks/useSequencer';
import { useExport } from '@/hooks/useExport';
import { Grid } from '@/components/Grid';
import { TrackHeader } from '@/components/TrackHeader';
import { TransportBar } from '@/components/TransportBar';
import { RoomBar } from '@/components/RoomBar';
import { UnlockToast } from '@/components/UnlockToast';
import { HostManager } from '@/lib/network/host';
import { GuestManager, ConnectionState } from '@/lib/network/guest';
import { getSequencer } from '@/lib/audio/scheduler';
import { getAudioContext } from '@/lib/audio/audioContext';
import {
  makeDefaultTracks,
  makeEmptyGrid,
  makeEmptyAuthorship,
  getHostPeerId,
  MAX_ROOM_CLAIM_ATTEMPTS,
} from '@/lib/constants';
import { validateRoomCode } from '@/lib/roomCode';
import { generateDefaultPattern, generateRandomPattern } from '@/lib/patterns';
import {
  incrementSessionCount,
  getSessionCount,
  checkAndFireUnlocks,
  getUnlockedTrackCount,
  loadUnlockedTrackCount,
  saveUnlockedTrackCount,
} from '@/lib/milestones';
import { RoomState, PeerInfo, UnlockEvent, BeatSyncInfo } from '@/lib/types';

interface RoomPageProps {
  params: { code: string };
}

export default function RoomPage({ params }: RoomPageProps) {
  const roomCode = params.code?.toUpperCase() ?? '';
  const router = useRouter();

  // ── Role detection ────────────────────────────────────────────────────────
  const [role, setRole] = useState<'host' | 'guest' | 'solo'>('solo');
  const [hostManager, setHostManager] = useState<HostManager | null>(null);
  const [guestManager, setGuestManager] = useState<GuestManager | null>(null);
  const [myPeerId, setMyPeerId] = useState<string | null>(null);
  const [peers, setPeers] = useState<PeerInfo[]>([]);
  const [connectionState, setConnectionState] = useState<ConnectionState | 'idle'>('idle');
  const [pendingUnlocks, setPendingUnlocks] = useState<UnlockEvent[]>([]);
  const [kickPulseClass, setKickPulseClass] = useState('');

  // Peer color map: peerId → color
  const peerColorsRef = useRef<Record<string, string>>({});
  const [peerColors, setPeerColors] = useState<Record<string, string>>({});

  // ── Sequencer ─────────────────────────────────────────────────────────────
  const unlockedTrackCount = loadUnlockedTrackCount();
  const initialTracks = makeDefaultTracks(unlockedTrackCount);
  const { grid: defaultGrid, authorship: defaultAuth } = generateDefaultPattern(
    initialTracks.filter((t) => t.unlocked).length,
  );

  const {
    grid,
    cellAuthorship,
    trackConfigs,
    bpm,
    isPlaying,
    currentStep,
    audioReady,
    kickPulse,
    togglePlay,
    toggleStep,
    setTempo,
    setGrid,
    setTrackConfigs,
    updateTrackParam,
    initAudio,
  } = useSequencer(defaultGrid, initialTracks, 120);

  // Export
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const { isRecording, recordingDuration, startRecording, stopRecording } = useExport();

  // ── Kick pulse body animation ──────────────────────────────────────────────
  useEffect(() => {
    if (kickPulse) {
      setKickPulseClass('kick-pulse');
      const t = setTimeout(() => setKickPulseClass(''), 80);
      return () => clearTimeout(t);
    }
  }, [kickPulse]);

  // ── Validate room code ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!validateRoomCode(roomCode)) {
      router.replace('/');
    }
  }, [roomCode, router]);

  // ── Milestone check ────────────────────────────────────────────────────────
  useEffect(() => {
    const count = incrementSessionCount();
    const unlocked = getUnlockedTrackCount(count);
    const prev = loadUnlockedTrackCount();
    if (unlocked > prev) {
      saveUnlockedTrackCount(unlocked);
      setTrackConfigs(makeDefaultTracks(unlocked));
    }
    const newUnlocks = checkAndFireUnlocks(count);
    if (newUnlocks.length > 0) {
      setPendingUnlocks(newUnlocks);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Beat sync from host → sequencer ───────────────────────────────────────
  const handleBeatSync = useCallback((sync: BeatSyncInfo) => {
    const seq = getSequencer();
    if (seq && seq.isPlaying) {
      seq.syncToBeat(sync);
    }
  }, []);

  // ── Networking setup ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!validateRoomCode(roomCode)) return;

    const isHost =
      typeof window !== 'undefined' &&
      sessionStorage.getItem(`gridsync_role_${roomCode}`) === 'host';

    if (isHost) {
      sessionStorage.removeItem(`gridsync_role_${roomCode}`);
      setRole('host');
      setMyPeerId(getHostPeerId(roomCode));

      const trackCount = loadUnlockedTrackCount();
      const tracks = makeDefaultTracks(trackCount);
      const { grid: seedGrid, authorship: seedAuth } = generateDefaultPattern(
        tracks.filter((t) => t.unlocked).length,
      );

      const seedState: RoomState = {
        grid: seedGrid,
        cellAuthorship: seedAuth,
        bpm: 120,
        trackConfigs: tracks,
        connectedPeers: [],
        hostPeerId: getHostPeerId(roomCode),
      };

      let attempts = 0;
      const tryStartHost = async () => {
        if (attempts >= MAX_ROOM_CLAIM_ATTEMPTS) {
          console.error('[Room] Failed to claim host ID after max attempts');
          setRole('solo');
          return;
        }
        attempts++;

        try {
          const manager = new HostManager(roomCode, seedState, {
            onStateChange: (state) => {
              setGrid(state.grid, state.cellAuthorship);
              setTrackConfigs(state.trackConfigs);
              setTempo(state.bpm);
              setPeers(state.connectedPeers);
              const colorMap: Record<string, string> = {};
              state.connectedPeers.forEach((p) => { colorMap[p.peerId] = p.color; });
              peerColorsRef.current = colorMap;
              setPeerColors({ ...colorMap });
            },
            onPeerJoined: (peer) => {
              peerColorsRef.current[peer.peerId] = peer.color;
              setPeerColors({ ...peerColorsRef.current });
            },
            onPeerLeft: (peerId) => {
              delete peerColorsRef.current[peerId];
              setPeerColors({ ...peerColorsRef.current });
            },
            onError: (err) => console.error('[Room] Host error:', err),
          });

          await manager.start();
          setHostManager(manager);
          setConnectionState('connected');
        } catch (err: unknown) {
          if (err instanceof Error && err.message === 'ROOM_CODE_TAKEN') {
            console.warn('[Room] Room code collision, retrying…');
            setTimeout(tryStartHost, 500);
          } else {
            console.error('[Room] Host start failed:', err);
            setRole('solo');
          }
        }
      };

      tryStartHost();
    } else {
      // Guest flow
      setRole('guest');

      const manager = new GuestManager(roomCode, {
        onStateChange: (state) => {
          setGrid(state.grid, state.cellAuthorship);
          setTrackConfigs(state.trackConfigs);
          setTempo(state.bpm);
          setPeers(state.connectedPeers);
          const colorMap: Record<string, string> = {};
          state.connectedPeers.forEach((p) => { colorMap[p.peerId] = p.color; });
          peerColorsRef.current = colorMap;
          setPeerColors({ ...colorMap });
        },
        onBeatSync: handleBeatSync,
        onPeerJoined: (peer) => {
          peerColorsRef.current[peer.peerId] = peer.color;
          setPeerColors({ ...peerColorsRef.current });
        },
        onPeerLeft: (peerId) => {
          delete peerColorsRef.current[peerId];
          setPeerColors({ ...peerColorsRef.current });
        },
        onConnectionStateChange: (state) => {
          setConnectionState(state);
          if (state === 'failed') {
            setRole('solo');
          }
        },
        onBecomingHost: (lastState) => {
          setRole('host');
          setMyPeerId(getHostPeerId(roomCode));
          const newManager = new HostManager(roomCode, lastState, {
            onStateChange: (state) => {
              setGrid(state.grid, state.cellAuthorship);
              setTrackConfigs(state.trackConfigs);
              setTempo(state.bpm);
              setPeers(state.connectedPeers);
            },
            onPeerJoined: (peer) => {
              peerColorsRef.current[peer.peerId] = peer.color;
              setPeerColors({ ...peerColorsRef.current });
            },
            onPeerLeft: (peerId) => {
              delete peerColorsRef.current[peerId];
              setPeerColors({ ...peerColorsRef.current });
            },
            onError: (err) => console.error('[Room] Promoted host error:', err),
          });
          setHostManager(newManager);
          setConnectionState('connected');
        },
        onError: (err) => {
          console.warn('[Room] Guest connection error:', err);
        },
      });

      setGuestManager(manager);
      manager.connect().then(() => {
        setMyPeerId(manager.getMyPeerId());
      }).catch((err) => {
        console.warn('[Room] Guest failed to connect, going solo:', err);
        setRole('solo');
        setConnectionState('failed');
      });

      return () => {
        manager.destroy();
        setGuestManager(null);
      };
    }

    return () => {
      hostManager?.destroy();
      setHostManager(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomCode]);

  // ── User actions — routed through host/guest ──────────────────────────────
  const handleToggleStep = useCallback(
    (track: number, step: number) => {
      if (!audioReady) initAudio();
      if (role === 'host' && hostManager) {
        hostManager.applyLocalToggle(track, step, myPeerId ?? 'host');
      } else if (role === 'guest' && guestManager) {
        guestManager.sendMessage({
          type: 'TOGGLE_STEP',
          track,
          step,
          clientTimestamp: Date.now(),
        });
        toggleStep(track, step, myPeerId ?? 'guest');
      } else {
        toggleStep(track, step, 'local');
      }
    },
    [role, hostManager, guestManager, myPeerId, audioReady, initAudio, toggleStep],
  );

  const handleSetTempo = useCallback(
    (newBpm: number) => {
      setTempo(newBpm);
      if (role === 'host' && hostManager) {
        hostManager.applyLocalTempo(newBpm);
      } else if (role === 'guest' && guestManager) {
        guestManager.sendMessage({ type: 'SET_TEMPO', bpm: newBpm });
      }
    },
    [role, hostManager, guestManager, setTempo],
  );

  const handleRandomize = useCallback(() => {
    if (role === 'host' && hostManager) {
      hostManager.applyLocalRandomize();
    } else if (role === 'guest' && guestManager) {
      guestManager.sendMessage({ type: 'RANDOMIZE' });
    } else {
      const { grid: newGrid, authorship } = generateRandomPattern(
        trackConfigs.filter((t) => t.unlocked).length,
      );
      setGrid(newGrid, authorship);
    }
  }, [role, hostManager, guestManager, trackConfigs, setGrid]);

  const handleTrackParam = useCallback(
    (track: number, param: string, value: number | string | boolean) => {
      updateTrackParam(track, param, value);
      if (role === 'host' && hostManager) {
        hostManager.applyLocalTrackParam(track, param, value);
      } else if (role === 'guest' && guestManager) {
        guestManager.sendMessage({
          type: 'SET_TRACK_PARAM',
          track,
          param: param as 'pitch' | 'filterCutoff' | 'gain' | 'waveform' | 'muted',
          value,
        });
      }
    },
    [role, hostManager, guestManager, updateTrackParam],
  );

  const handleToggleRecord = useCallback(() => {
    if (isRecording) {
      stopRecording();
    } else {
      const canvas = document.createElement('canvas');
      canvas.width = 800;
      canvas.height = 200;
      startRecording(canvas);
    }
  }, [isRecording, startRecording, stopRecording]);

  // ── Render ─────────────────────────────────────────────────────────────────
  const unlockedTracks = trackConfigs.filter((t) => t.unlocked);
  const lockedTracks = trackConfigs.filter((t) => !t.unlocked);

  return (
    <div
      className={`relative min-h-screen flex flex-col pb-8 ${kickPulseClass}`}
      style={{ backgroundColor: 'var(--bg-void)' }}
    >
      <div className="relative z-10 flex flex-col gap-3 px-3 sm:px-6 pt-4 max-w-5xl mx-auto w-full">

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between gap-2">
          <a
            href="/"
            className="hover:opacity-70 transition-opacity"
            aria-label="Grid-Sync home"
          >
            <span
              className="font-display italic font-medium text-xl"
              style={{ color: 'var(--ink)', letterSpacing: '-0.01em' }}
            >
              Grid&#8209;Sync
            </span>
          </a>

          {!audioReady && (
            <button
              className="hw-btn hw-btn-ghost text-xs py-1.5 px-3"
              onClick={initAudio}
              aria-label="Enable audio"
            >
              Enable Audio
            </button>
          )}
        </div>

        {/* ── Room bar ────────────────────────────────────────────────────── */}
        <div className="hw-panel p-3 sm:p-4">
          <RoomBar
            roomCode={roomCode}
            peers={peers}
            myPeerId={myPeerId}
            connectionState={connectionState}
            role={role}
          />
        </div>

        {/* ── Transport bar ────────────────────────────────────────────────── */}
        <div className="hw-panel p-3 sm:p-4">
          <TransportBar
            isPlaying={isPlaying}
            bpm={bpm}
            isRecording={isRecording}
            recordingDuration={recordingDuration}
            onTogglePlay={togglePlay}
            onSetTempo={handleSetTempo}
            onRandomize={handleRandomize}
            onToggleRecording={handleToggleRecord}
          />
        </div>

        {/* ── Sequencer grid ───────────────────────────────────────────────── */}
        <div className="hw-panel p-3 sm:p-4">
          {trackConfigs.length > 0 && (
            <div className="flex">
              {/* Track headers column */}
              <div className="flex flex-col gap-0.5 shrink-0">
                {/* Spacer for step index labels */}
                <div className="h-5" />
                {trackConfigs.map((config, i) => (
                  <TrackHeader
                    key={config.id}
                    config={config}
                    trackIndex={i}
                    onParamChange={handleTrackParam}
                  />
                ))}
                {/* Spacer for beat dots */}
                <div className="h-5" />
              </div>

              {/* Grid */}
              <div className="flex-1 overflow-hidden">
                <Grid
                  grid={grid}
                  trackConfigs={trackConfigs}
                  cellAuthorship={cellAuthorship}
                  currentStep={currentStep}
                  isPlaying={isPlaying}
                  myPeerId={myPeerId}
                  peerColors={peerColors}
                  onToggleStep={handleToggleStep}
                />
              </div>
            </div>
          )}

          {/* Locked tracks notice */}
          {lockedTracks.length > 0 && (
            <div
              className="mt-3 pt-3 text-[10px] font-mono text-center"
              style={{
                borderTop: '1px solid var(--border-dim)',
                color: 'var(--ink-mute)',
              }}
            >
              {lockedTracks.length} track{lockedTracks.length > 1 ? 's' : ''} unlock with more sessions
            </div>
          )}
        </div>

        {/* ── WebRTC failed notice ─────────────────────────────────────────── */}
        {connectionState === 'failed' && role === 'solo' && (
          <div
            className="hw-panel p-4"
            style={{ borderColor: 'var(--rust)' }}
          >
            <div
              className="font-mono font-semibold text-[11px] uppercase tracking-wider mb-1"
              style={{ color: 'var(--copper)' }}
            >
              Collaboration Unavailable
            </div>
            <p
              className="font-mono text-[11px] leading-relaxed"
              style={{ color: 'var(--ink-mute)' }}
            >
              WebRTC could not connect — this sometimes happens on restrictive networks.
              You can still use the sequencer in solo mode.
            </p>
          </div>
        )}

        {/* ── Footer ──────────────────────────────────────────────────────── */}
        <div
          className="text-center font-mono text-[9px] uppercase tracking-widest pt-2"
          style={{ color: 'var(--ink-mute)' }}
        >
          Grid-Sync &middot; Real-time collaborative sequencer &middot; No servers, no accounts
        </div>
      </div>

      {/* Unlock notifications */}
      <UnlockToast unlocks={pendingUnlocks} />
    </div>
  );
}
