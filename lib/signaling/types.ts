/** Signaling adapter interface — swap implementations without touching game logic */
export interface SignalingAdapter {
  /**
   * Register this client as the host for roomCode.
   * Uses a deterministic peer ID derived from the room code.
   * Throws if the ID is already taken (room code collision or stale ID).
   */
  registerRoom(roomCode: string): Promise<void>;

  /**
   * Look up the host's peer ID for a given room code.
   * Returns the deterministic ID — no server round-trip needed with PeerJS broker.
   */
  lookupRoom(roomCode: string): string;

  /** Tear down any resources */
  cleanup(): void;
}
