// ─── Core Domain Types ────────────────────────────────────────────────────────

/** Waveform types available for melodic tracks */
export type WaveformType = 'sine' | 'square' | 'sawtooth' | 'triangle' | 'pulse';

/** Instrument family for a track */
export type InstrumentType = 'kick' | 'snare' | 'hihat' | 'hihat-open' | 'clap' | 'bass' | 'lead' | 'pad';

/** Configuration for a single track row */
export interface TrackConfig {
  id: string;
  instrument: InstrumentType;
  label: string;
  /** Base pitch in Hz (for melodic tracks) or root pitch modifier (for drums) */
  pitch: number;
  /** Low-pass filter cutoff in Hz */
  filterCutoff: number;
  /** Gain / velocity 0–1 */
  gain: number;
  /** For melodic tracks */
  waveform: WaveformType;
  /** Whether this track is muted */
  muted: boolean;
  /** Whether this track is currently unlocked (milestone gating) */
  unlocked: boolean;
  /** Neon color accent for this track row */
  color: string;
}

/** Full grid state — sparse set of active steps per track */
export type GridState = boolean[][];

/** Peer presence info */
export interface PeerInfo {
  peerId: string;
  /** Neon color assigned to this peer */
  color: string;
  /** Emoji avatar */
  emoji: string;
  /** Join timestamp (Unix ms) for host-migration ordering */
  joinedAt: number;
  /** 0-based index in join order (0 = earliest = promoted first) */
  joinIndex: number;
}

/** Which peer last activated each cell (for color coding) */
export type CellAuthorship = (string | null)[][];

/** Full room state (canonical at host, mirrored at guests) */
export interface RoomState {
  grid: GridState;
  cellAuthorship: CellAuthorship;
  bpm: number;
  trackConfigs: TrackConfig[];
  connectedPeers: PeerInfo[];
  /** Host's local peer ID */
  hostPeerId: string;
  /** Beat index when FULL_STATE was captured (for sync) */
  capturedAtBeat?: number;
}

// ─── Message Protocol ─────────────────────────────────────────────────────────

export type ClientMessage =
  | { type: 'TOGGLE_STEP'; track: number; step: number; clientTimestamp: number }
  | { type: 'SET_TEMPO'; bpm: number }
  | { type: 'RANDOMIZE' }
  | { type: 'SET_TRACK_PARAM'; track: number; param: 'pitch' | 'filterCutoff' | 'gain' | 'waveform' | 'muted'; value: number | string | boolean }
  | { type: 'CURSOR_MOVE'; x: number; y: number }
  | { type: 'PLAY' }
  | { type: 'STOP' };

export type HostMessage =
  | { type: 'FULL_STATE'; state: RoomState; hostAudioContextTime: number }
  | { type: 'STEP_UPDATED'; track: number; step: number; active: boolean; byPeerId: string }
  | { type: 'TEMPO_UPDATED'; bpm: number }
  | { type: 'TRACK_PARAM_UPDATED'; track: number; param: string; value: number | string | boolean }
  | { type: 'BEAT_SYNC'; hostAudioContextTime: number; nextBeatIndex: number; bpm: number }
  | { type: 'PEER_JOINED'; peer: PeerInfo }
  | { type: 'PEER_LEFT'; peerId: string }
  | { type: 'GRID_RANDOMIZED'; grid: GridState; cellAuthorship: CellAuthorship }
  /** Play command: startAt is host AudioContext.currentTime + a small pre-roll so all guests can start together */
  | { type: 'PLAY'; startAtHostTime: number; startBeat: number; bpm: number }
  /** Stop command: all peers stop immediately */
  | { type: 'STOP' };

// ─── Milestone / Unlock Types ─────────────────────────────────────────────────

export interface UnlockEvent {
  id: string;
  sessionCount: number;
  title: string;
  description: string;
  /** What was unlocked */
  unlockType: 'track' | 'waveform' | 'palette';
  unlockValue: string;
}

// ─── Audio Scheduling ─────────────────────────────────────────────────────────

export interface ScheduledNote {
  trackIndex: number;
  stepIndex: number;
  audioTime: number;
}

export interface BeatSyncInfo {
  hostAudioContextTime: number;
  nextBeatIndex: number;
  bpm: number;
  receivedAt: number; // local AudioContext.currentTime when received
}
