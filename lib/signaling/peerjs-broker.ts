/**
 * PeerJS broker-based signaling adapter.
 *
 * How it works:
 * - The host's PeerJS peer ID is derived deterministically from the room code:
 *     `gridsync-{ROOMCODE}-host`
 * - Guests simply compute this ID to know who to connect to — no server lookup needed.
 * - "Registering" a room = attempting to create a Peer with that exact ID.
 *   If the ID is already taken (stale or live room), PeerJS throws an error,
 *   and the caller retries with a new code.
 *
 * SWAP NOTE: To replace with Firebase or a custom signaling server,
 * implement the SignalingAdapter interface in a new file and export it here.
 */

import { SignalingAdapter } from './types';
import { getHostPeerId } from '../constants';

export class PeerJSBrokerSignaling implements SignalingAdapter {
  // We don't need to keep a Peer instance here — the host PeerJS instance
  // is managed by the host network module. This adapter is just for the
  // ID derivation and collision detection contract.

  lookupRoom(roomCode: string): string {
    return getHostPeerId(roomCode);
  }

  async registerRoom(roomCode: string): Promise<void> {
    // Registration is handled by the host module when it attempts to create
    // a Peer with the deterministic ID. If the ID is taken, PeerJS fires
    // an 'error' event with type 'unavailable-id'. The host module surfaces
    // this as a rejection so generateUniqueRoomCode() can retry.
    // This method is a no-op — registration = Peer creation attempt.
    void roomCode;
  }

  cleanup(): void {
    // Nothing to clean up — no persistent connection to a signaling server
  }
}

/** Singleton adapter instance */
export const signalingAdapter: SignalingAdapter = new PeerJSBrokerSignaling();
