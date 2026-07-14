import { GridState, CellAuthorship } from './types';
import {
  STEP_COUNT,
  BASE_TRACK_COUNT,
  makeEmptyGrid,
  makeEmptyAuthorship,
  PENTATONIC_INTERVALS,
} from './constants';

/**
 * Returns a pre-baked default pattern that always sounds musical.
 * Kick on quarter notes, snare on 2&4, hi-hat 8ths, bass root note.
 */
export function generateDefaultPattern(trackCount: number = BASE_TRACK_COUNT): {
  grid: GridState;
  authorship: CellAuthorship;
} {
  const grid = makeEmptyGrid(trackCount);
  const authorship = makeEmptyAuthorship(trackCount);

  // Track 0: Kick — quarter notes (beats 0, 4, 8, 12)
  [0, 4, 8, 12].forEach((s) => { grid[0][s] = true; });

  // Track 1: Snare — beats 4 and 12 (2 and 4 in 4/4)
  [4, 12].forEach((s) => { grid[1][s] = true; });

  // Track 2: Hi-hat — 8th notes
  [0, 2, 4, 6, 8, 10, 12, 14].forEach((s) => { grid[2][s] = true; });

  // Track 3: Clap — off-beats
  [2, 6, 10, 14].forEach((s) => { grid[3][s] = true; });

  // Track 4: Bass — root notes on beat 0 and upbeat on beat 10
  if (trackCount > 4) {
    [0, 2, 8, 10].forEach((s) => { grid[4][s] = true; });
  }

  // Track 5: Lead — a simple 4-note motif
  if (trackCount > 5) {
    [0, 3, 8, 11].forEach((s) => { grid[5][s] = true; });
  }

  return { grid, authorship };
}

/** Pseudo-random seeded number (deterministic per roomCode) */
function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
}

/**
 * Generates a musically-biased random pattern.
 * Rules:
 *  - Kick ALWAYS on beats 0, 8; with ~60% on 4, 12; random fills
 *  - Snare biased to beats 4, 12
 *  - Hi-hat: pick a subdivision (8ths or 16ths) and fill it consistently
 *  - Bass & Lead: quantized to pentatonic scale
 */
export function generateRandomPattern(
  trackCount: number = BASE_TRACK_COUNT,
  seed?: number,
): { grid: GridState; authorship: CellAuthorship } {
  const rand = seededRandom(seed ?? Date.now());
  const grid = makeEmptyGrid(trackCount);
  const authorship = makeEmptyAuthorship(trackCount);

  // Track 0: Kick
  grid[0][0] = true;
  grid[0][8] = true;
  if (rand() > 0.4) grid[0][4] = true;
  if (rand() > 0.4) grid[0][12] = true;
  // Random kick fills
  for (let s = 0; s < STEP_COUNT; s++) {
    if (!grid[0][s] && rand() > 0.85) grid[0][s] = true;
  }

  // Track 1: Snare
  if (rand() > 0.2) grid[1][4] = true;
  if (rand() > 0.2) grid[1][12] = true;
  for (let s = 0; s < STEP_COUNT; s++) {
    if (!grid[1][s] && rand() > 0.88) grid[1][s] = true;
  }

  // Track 2: Hi-hat — choose a subdivision pattern
  const hh = rand();
  if (hh < 0.33) {
    // 8th notes
    [0, 2, 4, 6, 8, 10, 12, 14].forEach((s) => { grid[2][s] = true; });
  } else if (hh < 0.66) {
    // 16th notes with random dropouts
    for (let s = 0; s < STEP_COUNT; s++) {
      grid[2][s] = rand() > 0.25;
    }
  } else {
    // Offbeat pattern
    [1, 3, 5, 7, 9, 11, 13, 15].forEach((s) => { grid[2][s] = true; });
  }

  // Track 3: Clap
  if (rand() > 0.3) grid[3][4] = true;
  if (rand() > 0.3) grid[3][12] = true;
  for (let s = 0; s < STEP_COUNT; s++) {
    if (!grid[3][s] && rand() > 0.9) grid[3][s] = true;
  }

  // Track 4: Bass — sparse, quantized steps
  if (trackCount > 4) {
    const bassSteps = [0, 2, 4, 6, 8, 10, 12, 14];
    bassSteps.forEach((s) => {
      if (rand() > 0.5) grid[4][s] = true;
    });
    // Always have at least beat 0
    grid[4][0] = true;
  }

  // Track 5: Lead — sparser still, pentatonic feel
  if (trackCount > 5) {
    for (let s = 0; s < STEP_COUNT; s++) {
      if (rand() > 0.75) grid[5][s] = true;
    }
    // Ensure at least 2 notes
    if (!grid[5].some(Boolean)) {
      grid[5][0] = true;
      grid[5][8] = true;
    }
  }

  return { grid, authorship };
}

/**
 * Returns the pentatonic pitch for a step index (for melodic tracks).
 * Cycles through the pentatonic scale.
 */
export function getPentatonicPitch(
  stepIndex: number,
  rootHz: number,
  octave: number = 0,
): number {
  const intervalIdx = stepIndex % PENTATONIC_INTERVALS.length;
  const semitones = PENTATONIC_INTERVALS[intervalIdx] + octave * 12;
  return rootHz * Math.pow(2, semitones / 12);
}
