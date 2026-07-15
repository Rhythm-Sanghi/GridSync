/**
 * Host network module.
 *
 * Responsibilities:
 * - Own the canonical grid state (source of truth)
 * - Accept incoming guest connections
 * - Process ClientMessages: validate, apply to state, broadcast to all guests
 * - Send BEAT_SYNC immediately on new connection + every 10s
 * - Manage peer presence list
 *
 * HOST SEEDING CONTRACT:
 * When a promoted guest becomes the new host, it MUST initialize its canonical
 * grid state from the last FULL_STATE it received — never from pattern defaults.
 * startAsHost(seedState?) enforces this: omitting seedState in dev mode throws.
 */

import type Peer from 'peerjs';
import type { DataConnection } from 'peerjs';
import {
  RoomState,
  ClientMessage,
  HostMessage,
  PeerInfo,
  GridState,
  CellAuthorship,
  TrackConfig,
} from '../types';
import { PEER_COLORS, PEER_EMOJIS, MAX_PEERS, BEAT_SYNC_INTERVAL_S, getHostPeerId } from '../constants';
import { getAudioContext } from '../audio/audioContext';
import { getSequencer } from '../audio/scheduler';

export interface HostCallbacks {
  onStateChange: (state: RoomState) => void;
  onPeerJoined: (peer: PeerInfo) => void;
  onPeerLeft: (peerId: string) => void;
  onError: (err: Error) => void;
  /** Called when a PLAY command is issued — host should start its sequencer at this time */
  onPlay: (startAtHostTime: number, startBeat: number, bpm: number, sentAt: number) => void;
  /** Called when a STOP command is issued */
  onStop: () => void;
}

export class HostManager {
  private peer: Peer | null = null;
  private connections: Map<string, DataConnection> = new Map();
  private state: RoomState;
  private callbacks: HostCallbacks;
  private beatSyncTimer: ReturnType<typeof setInterval> | null = null;
  private roomCode: string;

  constructor(roomCode: string, seedState: RoomState, callbacks: HostCallbacks) {
    if (process.env.NODE_ENV === 'development' && !seedState) {
      throw new Error('HostManager: seedState is required. Never start host with default state — seed from last FULL_STATE.');
    }
    this.roomCode = roomCode;
    this.state = { ...seedState };
    this.callbacks = callbacks;
  }

  /**
   * Initialize PeerJS with the deterministic host peer ID.
   * Rejects if the ID is unavailable (room code collision).
   */
  async start(): Promise<void> {
    const { Peer } = await import('peerjs');
    const hostPeerId = getHostPeerId(this.roomCode);

    return new Promise((resolve, reject) => {
      const iceServers = buildICEServers();
      this.peer = new Peer(hostPeerId, { config: { iceServers } });

      this.peer.on('open', () => {
        this.setupBeatSyncInterval();
        resolve();
      });

      this.peer.on('connection', (conn) => {
        this.handleNewConnection(conn);
      });

      this.peer.on('error', (err: Error & { type?: string }) => {
        if (err.type === 'unavailable-id') {
          reject(new Error('ROOM_CODE_TAKEN'));
        } else {
          this.callbacks.onError(err);
        }
      });
    });
  }

  private handleNewConnection(conn: DataConnection): void {
    if (this.connections.size >= MAX_PEERS - 1) {
      conn.close();
      return;
    }

    conn.on('open', () => {
      // Assign peer color and emoji by join index
      const joinIndex = this.state.connectedPeers.length;
      const peer: PeerInfo = {
        peerId: conn.peer,
        color: PEER_COLORS[joinIndex % PEER_COLORS.length],
        emoji: PEER_EMOJIS[joinIndex % PEER_EMOJIS.length],
        joinedAt: Date.now(),
        joinIndex,
      };

      this.state.connectedPeers = [...this.state.connectedPeers, peer];
      this.connections.set(conn.peer, conn);

      // 1. Send FULL_STATE immediately
      this.sendToConnection(conn, {
        type: 'FULL_STATE',
        state: this.state,
        hostAudioContextTime: getAudioContext().currentTime,
      });

      // 2. Send BEAT_SYNC immediately (don't wait for the 10s interval)
      this.sendBeatSync(conn);

      // 3. Broadcast PEER_JOINED to all other guests
      this.broadcast({ type: 'PEER_JOINED', peer }, conn.peer);

      this.callbacks.onPeerJoined(peer);
      this.callbacks.onStateChange(this.state);
    });

    conn.on('data', (data: unknown) => {
      this.handleClientMessage(conn.peer, data as ClientMessage);
    });

    conn.on('close', () => {
      this.handleDisconnection(conn.peer);
    });

    conn.on('error', (err: Error) => {
      console.warn('[Host] Connection error from', conn.peer, err);
      this.handleDisconnection(conn.peer);
    });
  }

  private handleClientMessage(fromPeerId: string, msg: ClientMessage): void {
    switch (msg.type) {
      case 'TOGGLE_STEP': {
        const { track, step } = msg;
        if (track < 0 || track >= this.state.grid.length) return;
        if (step < 0 || step >= this.state.grid[track].length) return;

        // Host applies last-write-wins (arrival order, not client timestamp)
        const newGrid = this.state.grid.map((row) => [...row]);
        newGrid[track][step] = !newGrid[track][step];

        const newAuthorship = this.state.cellAuthorship.map((row) => [...row]);
        newAuthorship[track][step] = newGrid[track][step] ? fromPeerId : null;

        this.state = { ...this.state, grid: newGrid, cellAuthorship: newAuthorship };

        const update: HostMessage = {
          type: 'STEP_UPDATED',
          track,
          step,
          active: newGrid[track][step],
          byPeerId: fromPeerId,
        };
        this.broadcast(update);
        this.callbacks.onStateChange(this.state);
        break;
      }

      case 'SET_TEMPO': {
        const bpm = Math.max(40, Math.min(240, msg.bpm));
        this.state = { ...this.state, bpm };
        this.broadcast({ type: 'TEMPO_UPDATED', bpm });
        this.callbacks.onStateChange(this.state);
        break;
      }

      case 'RANDOMIZE': {
        // Host generates the random pattern and broadcasts it
        // (import lazily to avoid circular deps)
        import('../patterns').then(({ generateRandomPattern }) => {
          const { grid, authorship } = generateRandomPattern(
            this.state.grid.length,
          );
          // Mark all randomized cells as authored by the requesting peer
          const newAuthorship = authorship.map((row, t) =>
            row.map((_, s) => (grid[t][s] ? fromPeerId : null)),
          );
          this.state = { ...this.state, grid, cellAuthorship: newAuthorship };
          this.broadcast({ type: 'GRID_RANDOMIZED', grid, cellAuthorship: newAuthorship });
          this.callbacks.onStateChange(this.state);
        });
        break;
      }

      case 'SET_TRACK_PARAM': {
        const { track, param, value } = msg;
        if (track < 0 || track >= this.state.trackConfigs.length) return;
        const newConfigs = this.state.trackConfigs.map((c, i) =>
          i === track ? { ...c, [param]: value } : c,
        );
        this.state = { ...this.state, trackConfigs: newConfigs };
        this.broadcast({ type: 'TRACK_PARAM_UPDATED', track, param, value });
        this.callbacks.onStateChange(this.state);
        break;
      }

      case 'PLAY': {
        // Host is authoritative: broadcast a PLAY with a future start time
        // so all peers (including latecomers) can sync to the same beat grid
        const ctx = getAudioContext();
        // 300ms pre-roll gives guests time to receive and prepare
        const PRE_ROLL = 0.3;
        const startAtHostTime = ctx.currentTime + PRE_ROLL;
        const startBeat = 0;
        this.broadcast({ type: 'PLAY', startAtHostTime, startBeat, bpm: this.state.bpm });
        this.callbacks.onPlay(startAtHostTime, startBeat, this.state.bpm, ctx.currentTime);
        break;
      }

      case 'STOP': {
        this.broadcast({ type: 'STOP' });
        this.callbacks.onStop();
        break;
      }
    }
  }

  private handleDisconnection(peerId: string): void {
    this.connections.delete(peerId);
    this.state = {
      ...this.state,
      connectedPeers: this.state.connectedPeers.filter((p) => p.peerId !== peerId),
    };
    this.broadcast({ type: 'PEER_LEFT', peerId });
    this.callbacks.onPeerLeft(peerId);
    this.callbacks.onStateChange(this.state);
  }

  /** Broadcast a message to all connected guests (optionally exclude one peer) */
  private broadcast(msg: HostMessage, excludePeerId?: string): void {
    const data = JSON.stringify(msg);
    this.connections.forEach((conn, peerId) => {
      if (peerId !== excludePeerId && conn.open) {
        conn.send(data);
      }
    });
  }

  private sendToConnection(conn: DataConnection, msg: HostMessage): void {
    if (conn.open) {
      conn.send(JSON.stringify(msg));
    }
  }

  /** Apply a local toggle (host clicking the grid themselves) */
  applyLocalToggle(track: number, step: number, hostPeerId: string): void {
    this.handleClientMessage(hostPeerId, {
      type: 'TOGGLE_STEP',
      track,
      step,
      clientTimestamp: Date.now(),
    });
  }

  applyLocalPlay(): void {
    this.handleClientMessage('host', { type: 'PLAY' });
  }

  applyLocalStop(): void {
    this.handleClientMessage('host', { type: 'STOP' });
  }

  applyLocalTempo(bpm: number): void {
    this.handleClientMessage('host', { type: 'SET_TEMPO', bpm });
  }

  applyLocalRandomize(): void {
    this.handleClientMessage('host', { type: 'RANDOMIZE' });
  }

  applyLocalTrackParam(track: number, param: string, value: number | string | boolean): void {
    this.handleClientMessage('host', {
      type: 'SET_TRACK_PARAM',
      track,
      param: param as 'pitch' | 'filterCutoff' | 'gain' | 'waveform' | 'muted',
      value,
    });
  }

  private sendBeatSync(conn?: DataConnection): void {
    const seq = getSequencer();
    if (!seq || !seq.isPlaying) return;

    const ctx = getAudioContext();
    const { audioContextTime, nextBeatIndex } = seq.getBeatSyncInfo();
    const msg: HostMessage = {
      type: 'BEAT_SYNC',
      hostAudioContextTime: audioContextTime,
      nextBeatIndex,
      bpm: this.state.bpm,
    };

    if (conn) {
      this.sendToConnection(conn, msg);
    } else {
      this.broadcast(msg);
    }
  }

  private setupBeatSyncInterval(): void {
    this.beatSyncTimer = setInterval(() => {
      this.sendBeatSync();
    }, BEAT_SYNC_INTERVAL_S * 1000);
  }

  getState(): RoomState {
    return this.state;
  }

  updateLocalGrid(grid: GridState, authorship: CellAuthorship): void {
    this.state = { ...this.state, grid, cellAuthorship: authorship };
  }

  destroy(): void {
    if (this.beatSyncTimer) clearInterval(this.beatSyncTimer);
    this.connections.forEach((conn) => conn.close());
    this.peer?.destroy();
    this.peer = null;
  }
}

// ─── ICE Server Config ─────────────────────────────────────────────────────────

function buildICEServers(): RTCIceServer[] {
  const servers: RTCIceServer[] = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ];

  // Add self-hosted TURN if configured via env vars
  const turnUrl = process.env.NEXT_PUBLIC_TURN_URL;
  const turnUser = process.env.NEXT_PUBLIC_TURN_USERNAME;
  const turnCred = process.env.NEXT_PUBLIC_TURN_CREDENTIAL;

  if (turnUrl && turnUser && turnCred) {
    servers.push({
      urls: turnUrl,
      username: turnUser,
      credential: turnCred,
    });
  }

  return servers;
}

export { buildICEServers };
