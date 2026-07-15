import { TrackConfig, GridState, CellAuthorship } from './types';

// ─── Sequencer Constants ───────────────────────────────────────────────────────

export const STEP_COUNT = 16;
export const DEFAULT_BPM = 120;
export const MAX_BPM = 240;
export const MIN_BPM = 40;
export const MAX_PEERS = 5; // host + 4 guests

// Lookahead scheduler timing (milliseconds)
export const LOOKAHEAD_MS = 100;
export const SCHEDULE_INTERVAL_MS = 25;

// Beat sync: re-sync period in seconds
export const BEAT_SYNC_INTERVAL_S = 10;

// Host migration timing
export const MIGRATION_BASE_DELAY_MS = 500;
export const MIGRATION_PER_PEER_DELAY_MS = 500;
export const MIGRATION_JITTER_MS = 200;

// Room
export const ROOM_CODE_LENGTH = 4;
export const MAX_ROOM_CLAIM_ATTEMPTS = 5;
export const PEER_ID_PREFIX = 'gridsync';

// ─── Analog Color Palettes ─────────────────────────────────────────────────────

/** Colors assigned to peers in join order */
export const PEER_COLORS = [
  '#c89a40', // brass-gold
  '#a05828', // copper
  '#4e6a52', // sage-green
  '#4a4070', // dusty-violet
  '#8a4040', // muted-rust
] as const;

/** Emojis assigned to peers in join order */
export const PEER_EMOJIS = ['🎹', '🥁', '🎸', '🎺', '🎻'] as const;

// ─── Track Definitions ─────────────────────────────────────────────────────────

export const BASE_TRACKS: Omit<TrackConfig, 'id'>[] = [
  {
    instrument: 'kick',
    label: 'KICK',
    pitch: 60,
    filterCutoff: 200,
    gain: 0.9,
    waveform: 'sine',
    muted: false,
    unlocked: true,
    color: '#c87010', // amber-orange
  },
  {
    instrument: 'snare',
    label: 'SNARE',
    pitch: 200,
    filterCutoff: 3000,
    gain: 0.8,
    waveform: 'sine',
    muted: false,
    unlocked: true,
    color: '#a03028', // deep rust-red
  },
  {
    instrument: 'hihat',
    label: 'HI-HAT',
    pitch: 8000,
    filterCutoff: 8000,
    gain: 0.6,
    waveform: 'sine',
    muted: false,
    unlocked: true,
    color: '#9a8020', // olive-brass
  },
  {
    instrument: 'clap',
    label: 'CLAP',
    pitch: 1000,
    filterCutoff: 5000,
    gain: 0.7,
    waveform: 'sine',
    muted: false,
    unlocked: true,
    color: '#986030', // copper
  },
  {
    instrument: 'bass',
    label: 'BASS',
    pitch: 55,
    filterCutoff: 600,
    gain: 0.85,
    waveform: 'sawtooth',
    muted: false,
    unlocked: true,
    color: '#345848', // forest
  },
  {
    instrument: 'lead',
    label: 'LEAD',
    pitch: 440,
    filterCutoff: 2000,
    gain: 0.6,
    waveform: 'square',
    muted: false,
    unlocked: true,
    color: '#4e4068', // dusty violet
  },
  // Milestone-gated tracks (unlocked at 3rd and 10th session)
  {
    instrument: 'hihat-open',
    label: 'OPEN HH',
    pitch: 6000,
    filterCutoff: 6000,
    gain: 0.5,
    waveform: 'sine',
    muted: false,
    unlocked: false,
    color: '#7a6818', // dark olive
  },
  {
    instrument: 'pad',
    label: 'PAD',
    pitch: 220,
    filterCutoff: 800,
    gain: 0.5,
    waveform: 'triangle',
    muted: false,
    unlocked: false,
    color: '#3a5e68', // teal-slate
  },
];

/** The 6 tracks visible on first session */
export const BASE_TRACK_COUNT = 6;

export function makeDefaultTracks(unlockedCount: number = BASE_TRACK_COUNT): TrackConfig[] {
  return BASE_TRACKS.map((t, i) => ({
    ...t,
    id: `track-${i}`,
    unlocked: i < BASE_TRACK_COUNT || (unlockedCount > BASE_TRACK_COUNT && i < unlockedCount),
  }));
}

/** Empty grid for N tracks */
export function makeEmptyGrid(trackCount: number = BASE_TRACK_COUNT): GridState {
  return Array.from({ length: trackCount }, () => Array(STEP_COUNT).fill(false));
}

/** Empty cell authorship */
export function makeEmptyAuthorship(trackCount: number = BASE_TRACK_COUNT): CellAuthorship {
  return Array.from({ length: trackCount }, () => Array(STEP_COUNT).fill(null));
}

// ─── Pentatonic Scale (for melodic randomization) ─────────────────────────────

/** Pentatonic scale intervals in semitones from root */
export const PENTATONIC_INTERVALS = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21] as const;

/** Convert semitones from A4 (440 Hz) to frequency */
export function semitonesToHz(semitones: number): number {
  return 440 * Math.pow(2, semitones / 12);
}

// ─── Signaling ─────────────────────────────────────────────────────────────────

export function getHostPeerId(roomCode: string): string {
  return `${PEER_ID_PREFIX}-${roomCode.toUpperCase()}-host`;
}
