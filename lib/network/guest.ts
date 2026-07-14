/**
 * Guest network module.
 *
 * Responsibilities:
 * - Maintain a single DataConnection to the host
 * - Send ClientMessages on user actions
 * - Apply HostMessages to local state
 * - Cache last received FULL_STATE (for host migration)
 * - Implement host migration algorithm on host disconnection
 *
 * HOST MIGRATION ALGORITHM:
 * When the host disconnects, all guests independently run:
 * 1. Wait: baseDelay + (joinIndex * 500ms) + jitter(0–200ms)
 *    (joinIndex 0 = earliest joiner = tries first)
 * 2. Attempt to claim the deterministic host peer ID (new Peer(hostId))
 * 3. Success → become new host, seed from lastKnownState
 * 4. Failure (ID taken) → reconnect as guest to that ID
 * No coordination message needed — self-organizing.
 */

import type { DataConnection } from 'peerjs';
import {
  RoomState,
  ClientMessage,
  HostMessage,
  PeerInfo,
  BeatSyncInfo,
} from '../types';
import {
  getHostPeerId,
  MIGRATION_BASE_DELAY_MS,
  MIGRATION_PER_PEER_DELAY_MS,
  MIGRATION_JITTER_MS,
} from '../constants';
import { getAudioContext } from '../audio/audioContext';
import { getSequencer } from '../audio/scheduler';
import { buildICEServers } from './host';

export type ConnectionState = 'connecting' | 'connected' | 'disconnected' | 'migrating' | 'failed';

export interface GuestCallbacks {
  onStateChange: (state: RoomState) => void;
  onBeatSync: (sync: BeatSyncInfo) => void;
  onPeerJoined: (peer: PeerInfo) => void;
  onPeerLeft: (peerId: string) => void;
  onConnectionStateChange: (state: ConnectionState) => void;
  onBecomingHost: (lastState: RoomState) => void;
  onError: (err: Error) => void;
}

export class GuestManager {
  private peer: import('peerjs').Peer | null = null;
  private conn: DataConnection | null = null;
  private roomCode: string;
  private myPeerId: string | null = null;
  private callbacks: GuestCallbacks;
  private migrationTimer: ReturnType<typeof setTimeout> | null = null;

  /** Last received FULL_STATE — survives host disconnection for migration seeding */
  private lastKnownState: RoomState | null = null;

  /** Our joinIndex from the last FULL_STATE (0 = earliest = promoted first) */
  private myJoinIndex: number = 999;

  constructor(roomCode: string, callbacks: GuestCallbacks) {
    this.roomCode = roomCode;
    this.callbacks = callbacks;
  }

  async connect(): Promise<void> {
    const { Peer } = await import('peerjs');
    this.callbacks.onConnectionStateChange('connecting');

    return new Promise((resolve, reject) => {
      const iceServers = buildICEServers();
      // Guest gets a random peer ID
      this.peer = new Peer({ config: { iceServers } });

      this.peer.on('open', (id) => {
        this.myPeerId = id;
        this.connectToHost(resolve, reject);
      });

      this.peer.on('error', (err: Error) => {
        this.callbacks.onConnectionStateChange('failed');
        this.callbacks.onError(err);
        reject(err);
      });
    });
  }

  private connectToHost(
    resolve?: (v: void) => void,
    reject?: (e: Error) => void,
  ): void {
    if (!this.peer) return;
    const hostPeerId = getHostPeerId(this.roomCode);
    const conn = this.peer.connect(hostPeerId, { reliable: true, serialization: 'raw' });
    this.conn = conn;

    const timeout = setTimeout(() => {
      reject?.(new Error('Connection timeout'));
      this.callbacks.onConnectionStateChange('failed');
    }, 15000);

    conn.on('open', () => {
      clearTimeout(timeout);
      this.callbacks.onConnectionStateChange('connected');
      resolve?.();
    });

    conn.on('data', (raw: unknown) => {
      try {
        const msg: HostMessage = typeof raw === 'string' ? JSON.parse(raw) : raw as HostMessage;
        this.handleHostMessage(msg);
      } catch (e) {
        console.warn('[Guest] Failed to parse host message', e);
      }
    });

    conn.on('close', () => {
      this.handleHostDisconnect();
    });

    conn.on('error', (err: Error) => {
      console.warn('[Guest] Connection error', err);
      this.handleHostDisconnect();
    });
  }

  private handleHostMessage(msg: HostMessage): void {
    switch (msg.type) {
      case 'FULL_STATE': {
        this.lastKnownState = msg.state;
        // Find our joinIndex
        const me = msg.state.connectedPeers.find((p) => p.peerId === this.myPeerId);
        if (me) this.myJoinIndex = me.joinIndex;
        this.callbacks.onStateChange(msg.state);

        // Apply the beat sync embedded in FULL_STATE
        const ctx = getAudioContext();
        this.callbacks.onBeatSync({
          hostAudioContextTime: msg.hostAudioContextTime,
          nextBeatIndex: msg.state.capturedAtBeat ?? 0,
          bpm: msg.state.bpm,
          receivedAt: ctx.currentTime,
        });
        break;
      }

      case 'STEP_UPDATED': {
        if (!this.lastKnownState) return;
        const newGrid = this.lastKnownState.grid.map((row) => [...row]);
        const newAuthorship = this.lastKnownState.cellAuthorship.map((row) => [...row]);
        newGrid[msg.track][msg.step] = msg.active;
        newAuthorship[msg.track][msg.step] = msg.active ? msg.byPeerId : null;
        this.lastKnownState = {
          ...this.lastKnownState,
          grid: newGrid,
          cellAuthorship: newAuthorship,
        };
        this.callbacks.onStateChange(this.lastKnownState);
        break;
      }

      case 'TEMPO_UPDATED': {
        if (!this.lastKnownState) return;
        this.lastKnownState = { ...this.lastKnownState, bpm: msg.bpm };
        this.callbacks.onStateChange(this.lastKnownState);
        break;
      }

      case 'TRACK_PARAM_UPDATED': {
        if (!this.lastKnownState) return;
        const newConfigs = this.lastKnownState.trackConfigs.map((c, i) =>
          i === msg.track ? { ...c, [msg.param]: msg.value } : c,
        );
        this.lastKnownState = { ...this.lastKnownState, trackConfigs: newConfigs };
        this.callbacks.onStateChange(this.lastKnownState);
        break;
      }

      case 'BEAT_SYNC': {
        const ctx = getAudioContext();
        this.callbacks.onBeatSync({
          hostAudioContextTime: msg.hostAudioContextTime,
          nextBeatIndex: msg.nextBeatIndex,
          bpm: msg.bpm,
          receivedAt: ctx.currentTime,
        });
        break;
      }

      case 'PEER_JOINED': {
        if (this.lastKnownState) {
          this.lastKnownState = {
            ...this.lastKnownState,
            connectedPeers: [...this.lastKnownState.connectedPeers, msg.peer],
          };
          this.callbacks.onStateChange(this.lastKnownState);
        }
        this.callbacks.onPeerJoined(msg.peer);
        break;
      }

      case 'PEER_LEFT': {
        if (this.lastKnownState) {
          this.lastKnownState = {
            ...this.lastKnownState,
            connectedPeers: this.lastKnownState.connectedPeers.filter(
              (p) => p.peerId !== msg.peerId,
            ),
          };
          this.callbacks.onStateChange(this.lastKnownState);
        }
        this.callbacks.onPeerLeft(msg.peerId);
        break;
      }

      case 'GRID_RANDOMIZED': {
        if (!this.lastKnownState) return;
        this.lastKnownState = {
          ...this.lastKnownState,
          grid: msg.grid,
          cellAuthorship: msg.cellAuthorship,
        };
        this.callbacks.onStateChange(this.lastKnownState);
        break;
      }
    }
  }

  private handleHostDisconnect(): void {
    this.conn = null;
    this.callbacks.onConnectionStateChange('migrating');

    if (!this.lastKnownState) {
      // No state to work with — just report failed
      this.callbacks.onConnectionStateChange('failed');
      return;
    }

    // Attempt host migration after join-order-weighted delay
    const jitter = Math.random() * MIGRATION_JITTER_MS;
    const delay =
      MIGRATION_BASE_DELAY_MS +
      this.myJoinIndex * MIGRATION_PER_PEER_DELAY_MS +
      jitter;

    this.migrationTimer = setTimeout(() => {
      this.attemptHostMigration();
    }, delay);
  }

  private async attemptHostMigration(): Promise<void> {
    if (!this.peer || !this.lastKnownState) return;

    const hostPeerId = getHostPeerId(this.roomCode);

    // Attempt to claim the deterministic host peer ID by creating a new Peer with it
    try {
      const { Peer } = await import('peerjs');
      const iceServers = buildICEServers();
      const promotionPeer = new Peer(hostPeerId, { config: { iceServers } });

      await new Promise<void>((resolve, reject) => {
        const t = setTimeout(() => reject(new Error('timeout')), 5000);
        promotionPeer.on('open', () => {
          clearTimeout(t);
          resolve();
        });
        promotionPeer.on('error', (err: Error) => {
          clearTimeout(t);
          reject(err);
        });
      });

      // Success — we are the new host
      this.peer.destroy();
      this.peer = promotionPeer;
      this.callbacks.onBecomingHost(this.lastKnownState);
    } catch {
      // Failed — another guest already claimed the ID. Connect to them as a guest.
      this.callbacks.onConnectionStateChange('connecting');
      this.connectToHost();
    }
  }

  sendMessage(msg: ClientMessage): void {
    if (this.conn?.open) {
      this.conn.send(JSON.stringify(msg));
    }
  }

  getMyPeerId(): string | null {
    return this.myPeerId;
  }

  destroy(): void {
    if (this.migrationTimer) clearTimeout(this.migrationTimer);
    this.conn?.close();
    this.peer?.destroy();
    this.peer = null;
    this.conn = null;
  }
}
