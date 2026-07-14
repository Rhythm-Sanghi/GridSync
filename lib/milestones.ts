import { UnlockEvent } from './types';

const SESSION_COUNT_KEY = 'gridsync_session_count';
const UNLOCKS_SHOWN_KEY = 'gridsync_unlocks_shown';
const UNLOCKED_TRACKS_KEY = 'gridsync_unlocked_tracks';

/** All possible milestone unlocks in order */
const MILESTONE_UNLOCKS: UnlockEvent[] = [
  {
    id: 'session_3',
    sessionCount: 3,
    title: '🥁 Open Hi-Hat Unlocked!',
    description: 'Your 3rd jam unlocks the Open Hi-Hat track + Triangle waveform. Keep jamming!',
    unlockType: 'track',
    unlockValue: 'hihat-open',
  },
  {
    id: 'session_10',
    sessionCount: 10,
    title: '🎹 Pad Synth Unlocked!',
    description: 'Your 10th jam unlocks the Pad track + Pulse waveform. You\'re a regular!',
    unlockType: 'track',
    unlockValue: 'pad',
  },
  {
    id: 'session_25',
    sessionCount: 25,
    title: '✨ FM Synth Unlocked!',
    description: 'Your 25th jam unlocks the FM waveform + prismatic grid colors. Legend status!',
    unlockType: 'waveform',
    unlockValue: 'pulse',
  },
];

/** Increment session count and return new total */
export function incrementSessionCount(): number {
  if (typeof window === 'undefined') return 0;
  const current = getSessionCount();
  const next = current + 1;
  localStorage.setItem(SESSION_COUNT_KEY, String(next));
  return next;
}

export function getSessionCount(): number {
  if (typeof window === 'undefined') return 0;
  return parseInt(localStorage.getItem(SESSION_COUNT_KEY) ?? '0', 10);
}

/** Get which unlock IDs have already been shown to the user */
function getShownUnlocks(): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = localStorage.getItem(UNLOCKS_SHOWN_KEY);
    return new Set(raw ? JSON.parse(raw) : []);
  } catch {
    return new Set();
  }
}

/** Mark an unlock as shown — fires exactly once per unlock */
export function markUnlockShown(unlockId: string): void {
  if (typeof window === 'undefined') return;
  const shown = getShownUnlocks();
  shown.add(unlockId);
  localStorage.setItem(UNLOCKS_SHOWN_KEY, JSON.stringify([...shown]));
}

/**
 * Returns unlocks that have been earned but not yet shown to the user.
 * Caller must call markUnlockShown() for each returned event after displaying.
 */
export function checkAndFireUnlocks(sessionCount: number): UnlockEvent[] {
  const shown = getShownUnlocks();
  return MILESTONE_UNLOCKS.filter(
    (u) => sessionCount >= u.sessionCount && !shown.has(u.id),
  );
}

/** How many tracks should be unlocked based on session count */
export function getUnlockedTrackCount(sessionCount: number): number {
  if (sessionCount >= 10) return 8; // both bonus tracks
  if (sessionCount >= 3) return 7;  // open hi-hat
  return 6;                          // base tracks only
}

/** Persist unlocked track count for cross-session memory */
export function saveUnlockedTrackCount(count: number): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(UNLOCKED_TRACKS_KEY, String(count));
}

export function loadUnlockedTrackCount(): number {
  if (typeof window === 'undefined') return 6;
  return parseInt(localStorage.getItem(UNLOCKED_TRACKS_KEY) ?? '6', 10);
}
