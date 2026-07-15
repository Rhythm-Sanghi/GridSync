'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { RoomState, PeerInfo, ClientMessage, BeatSyncInfo } from '@/lib/types';
import { HostManager } from '@/lib/network/host';
import { GuestManager, ConnectionState } from '@/lib/network/guest';
import { getSequencer } from '@/lib/audio/scheduler';
import { generateRoomCode, validateRoomCode } from '@/lib/roomCode';
import { getHostPeerId } from '@/lib/constants';

export type RoomRole = 'host' | 'guest' | 'solo';

export interface UseRoomReturn {
  role: RoomRole;
  roomCode: string;
  peers: PeerInfo[];
  connectionState: ConnectionState | 'idle';
  myPeerId: string | null;
  roomState: RoomState | null;

  // Actions (host sends directly, guest sends via data channel)
  sendToggleStep: (track: number, step: number) => void;
  sendSetTempo: (bpm: number) => void;
  sendRandomize: () => void;
  sendTrackParam: (track: number, param: string, value: number | string | boolean) => void;

  // Callbacks for room to drive sequencer
  onRoomStateChange: (handler: (state: RoomState) => void) => void;
  onBeatSync: (handler: (sync: BeatSyncInfo) => void) => void;
  onBecomingHost: (handler: (state: RoomState) => void) => void;
}

export function useRoom(
  roomCode: string,
  role: RoomRole,
  hostPeerId?: string, // passed from initial room creation
): UseRoomReturn {
  const [peers, setPeers] = useState<PeerInfo[]>([]);
  const [connectionState, setConnectionState] = useState<ConnectionState | 'idle'>('idle');
  const [myPeerId, setMyPeerId] = useState<string | null>(
    role === 'host' ? (hostPeerId ?? getHostPeerId(roomCode)) : null,
  );
  const [roomState, setRoomState] = useState<RoomState | null>(null);

  const hostManagerRef = useRef<HostManager | null>(null);
  const guestManagerRef = useRef<GuestManager | null>(null);

  const stateChangeHandlerRef = useRef<((state: RoomState) => void) | null>(null);
  const beatSyncHandlerRef = useRef<((sync: BeatSyncInfo) => void) | null>(null);
  const becomingHostHandlerRef = useRef<((state: RoomState) => void) | null>(null);

  const onRoomStateChange = useCallback((handler: (state: RoomState) => void) => {
    stateChangeHandlerRef.current = handler;
  }, []);

  const onBeatSync = useCallback((handler: (sync: BeatSyncInfo) => void) => {
    beatSyncHandlerRef.current = handler;
  }, []);

  const onBecomingHost = useCallback((handler: (state: RoomState) => void) => {
    becomingHostHandlerRef.current = handler;
  }, []);

  // Initialize networking based on role
  useEffect(() => {
    if (role === 'solo' || !roomCode) return;

    if (role === 'host') {
      // Host initialization happens in the room page with the seed state
      // This hook just tracks state
      return;
    }

    if (role === 'guest' && validateRoomCode(roomCode)) {
      const guestManager = new GuestManager(roomCode, {
        onStateChange: (state) => {
          setRoomState(state);
          setPeers(state.connectedPeers);
          stateChangeHandlerRef.current?.(state);
        },
        onBeatSync: (sync) => {
          beatSyncHandlerRef.current?.(sync);
        },
        onPeerJoined: (peer) => {
          setPeers((prev) => [...prev.filter((p) => p.peerId !== peer.peerId), peer]);
        },
        onPeerLeft: (peerId) => {
          setPeers((prev) => prev.filter((p) => p.peerId !== peerId));
        },
        onConnectionStateChange: setConnectionState,
        onBecomingHost: (state) => {
          becomingHostHandlerRef.current?.(state);
        },
        onError: (err) => console.error('[Room] Guest error:', err),
        // Play/stop is managed by the room page directly via the sequencer
        onPlay: () => {},
        onStop: () => {},
      });

      guestManagerRef.current = guestManager;
      setMyPeerId(null);
      guestManager.connect().then(() => {
        setMyPeerId(guestManager.getMyPeerId());
      }).catch((err) => {
        console.error('[Room] Failed to connect:', err);
        setConnectionState('failed');
      });

      return () => {
        guestManager.destroy();
        guestManagerRef.current = null;
      };
    }
  }, [role, roomCode]);

  /** Register the host manager from outside (room page calls this after creating state) */
  const registerHostManager = useCallback((manager: HostManager) => {
    hostManagerRef.current = manager;
    setConnectionState('connected');
  }, []);

  const sendToggleStep = useCallback((track: number, step: number) => {
    if (role === 'host') {
      hostManagerRef.current?.applyLocalToggle(track, step, myPeerId ?? 'host');
    } else {
      guestManagerRef.current?.sendMessage({
        type: 'TOGGLE_STEP',
        track,
        step,
        clientTimestamp: Date.now(),
      });
    }
  }, [role, myPeerId]);

  const sendSetTempo = useCallback((bpm: number) => {
    if (role === 'host') {
      hostManagerRef.current?.applyLocalTempo(bpm);
    } else {
      guestManagerRef.current?.sendMessage({ type: 'SET_TEMPO', bpm });
    }
  }, [role]);

  const sendRandomize = useCallback(() => {
    if (role === 'host') {
      hostManagerRef.current?.applyLocalRandomize();
    } else {
      guestManagerRef.current?.sendMessage({ type: 'RANDOMIZE' });
    }
  }, [role]);

  const sendTrackParam = useCallback(
    (track: number, param: string, value: number | string | boolean) => {
      if (role === 'host') {
        hostManagerRef.current?.applyLocalTrackParam(track, param, value);
      } else {
        guestManagerRef.current?.sendMessage({
          type: 'SET_TRACK_PARAM',
          track,
          param: param as 'pitch' | 'filterCutoff' | 'gain' | 'waveform' | 'muted',
          value,
        });
      }
    },
    [role],
  );

  return {
    role,
    roomCode,
    peers,
    connectionState,
    myPeerId,
    roomState,
    sendToggleStep,
    sendSetTempo,
    sendRandomize,
    sendTrackParam,
    onRoomStateChange,
    onBeatSync,
    onBecomingHost,
  };
}
