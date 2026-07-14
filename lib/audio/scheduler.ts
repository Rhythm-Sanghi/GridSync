/**
 * Lookahead Scheduler — "A Tale of Two Clocks" pattern (Chris Wilson).
 *
 * A fast JS timer fires every SCHEDULE_INTERVAL_MS to check what notes
 * need to be scheduled in the next LOOKAHEAD_MS window. Actual note timing
 * is scheduled on AudioContext nodes using ctx.currentTime — never setInterval.
 *
 * This decouples JS event-loop jitter from audio precision.
 */

import { LOOKAHEAD_MS, SCHEDULE_INTERVAL_MS } from '../constants';
import { GridState, TrackConfig, BeatSyncInfo } from '../types';
import { getAudioContext } from './audioContext';
import { scheduleInstrument } from './synth';

export interface SequencerCallbacks {
  /** Called when the playhead moves to a new step (for visual update) */
  onStep: (stepIndex: number) => void;
  /** Called on kick step for screen pulse effect */
  onKick: () => void;
}

export class Sequencer {
  private ctx: AudioContext | null = null;
  private timerId: ReturnType<typeof setTimeout> | null = null;
  private isRunning = false;

  // Current beat tracking
  private currentBeat = 0;
  private nextNoteTime = 0; // AudioContext time of next note
  private bpm: number;
  private stepCount: number;

  // Clock sync state
  private beatSyncOffset = 0; // offset to align with host's clock

  // References (mutable — updated in real time)
  private gridRef: GridState;
  private trackConfigsRef: TrackConfig[];
  private callbacks: SequencerCallbacks;

  constructor(
    bpm: number,
    stepCount: number,
    grid: GridState,
    trackConfigs: TrackConfig[],
    callbacks: SequencerCallbacks,
  ) {
    this.bpm = bpm;
    this.stepCount = stepCount;
    this.gridRef = grid;
    this.trackConfigsRef = trackConfigs;
    this.callbacks = callbacks;
  }

  get isPlaying(): boolean {
    return this.isRunning;
  }

  get currentStep(): number {
    return this.currentBeat % this.stepCount;
  }

  /** Update grid reference (called when grid state changes externally) */
  updateGrid(grid: GridState): void {
    this.gridRef = grid;
  }

  /** Update track configs reference */
  updateTrackConfigs(configs: TrackConfig[]): void {
    this.trackConfigsRef = configs;
  }

  /** Seconds per step (1/16th note) at current BPM */
  private get secondsPerStep(): number {
    return 60.0 / (this.bpm * 4);
  }

  setTempo(bpm: number): void {
    this.bpm = bpm;
    // nextNoteTime recalculates automatically on next tick
  }

  start(): void {
    if (this.isRunning) return;
    this.ctx = getAudioContext();
    this.isRunning = true;
    this.currentBeat = 0;
    // Schedule slightly in the future to avoid pre-roll clicks
    this.nextNoteTime = this.ctx.currentTime + 0.05;
    this.tick();
  }

  stop(): void {
    this.isRunning = false;
    if (this.timerId !== null) {
      clearTimeout(this.timerId);
      this.timerId = null;
    }
  }

  /**
   * Apply a BEAT_SYNC message from the host to align our clock.
   * hostAudioContextTime: the host's AudioContext.currentTime at nextBeatIndex
   * nextBeatIndex: which beat that corresponds to
   * receivedAt: our local AudioContext.currentTime when the message arrived
   */
  syncToBeat(sync: BeatSyncInfo): void {
    if (!this.ctx) return;

    // Compute how long ago the host sent this (network + processing latency)
    const localNow = this.ctx.currentTime;
    const elapsed = localNow - sync.receivedAt;

    // The host's beat N will sound at: hostAudioTime + elapsed (approx)
    // Our equivalent should be: nextNoteTime aligned to that beat
    this.currentBeat = sync.nextBeatIndex;
    const hostBeatTime = sync.hostAudioContextTime + elapsed;

    // Compute phase offset — how many steps we're off
    const stepDuration = 60.0 / (sync.bpm * 4);
    this.nextNoteTime = hostBeatTime;

    // If the host beat is in the past, advance to next beat boundary
    while (this.nextNoteTime < localNow + 0.01) {
      this.nextNoteTime += stepDuration;
      this.currentBeat++;
    }
  }

  /**
   * The scheduling tick — runs every SCHEDULE_INTERVAL_MS via setTimeout (NOT setInterval).
   * Schedules any notes within the lookahead window on the AudioContext directly.
   */
  private tick(): void {
    if (!this.isRunning || !this.ctx) return;

    const now = this.ctx.currentTime;
    const lookaheadEnd = now + LOOKAHEAD_MS / 1000;

    while (this.nextNoteTime < lookaheadEnd) {
      const stepIndex = this.currentBeat % this.stepCount;

      // Schedule all active steps for this beat
      this.trackConfigsRef.forEach((config, trackIndex) => {
        if (config.muted || !config.unlocked) return;
        const isActive = this.gridRef[trackIndex]?.[stepIndex] ?? false;
        if (isActive) {
          scheduleInstrument(this.ctx!, this.nextNoteTime, config, stepIndex);
        }
      });

      // Fire visual callback slightly before the audio plays (schedule it via setTimeout)
      const visualDelay = Math.max(0, (this.nextNoteTime - now) * 1000 - 5);
      const capturedStep = stepIndex;
      const capturedBeat = this.currentBeat;

      // Check if kick is playing this step (track 0)
      const kickActive = this.gridRef[0]?.[stepIndex] ?? false;

      setTimeout(() => {
        this.callbacks.onStep(capturedStep);
        if (kickActive && capturedBeat === this.currentBeat) {
          this.callbacks.onKick();
        }
      }, visualDelay);

      this.nextNoteTime += this.secondsPerStep;
      this.currentBeat++;
    }

    // Schedule next tick using setTimeout (not setInterval — avoids accumulation drift)
    this.timerId = setTimeout(() => this.tick(), SCHEDULE_INTERVAL_MS);
  }

  /**
   * Returns the current AudioContext time + beat index for BEAT_SYNC broadcasting.
   * Called by host before broadcasting sync message.
   */
  getBeatSyncInfo(): { audioContextTime: number; nextBeatIndex: number } {
    const ctx = getAudioContext();
    return {
      audioContextTime: this.nextNoteTime,
      nextBeatIndex: this.currentBeat,
    };
  }
}

let _sequencer: Sequencer | null = null;

export function createSequencer(
  bpm: number,
  stepCount: number,
  grid: GridState,
  trackConfigs: TrackConfig[],
  callbacks: SequencerCallbacks,
): Sequencer {
  if (_sequencer) {
    _sequencer.stop();
  }
  _sequencer = new Sequencer(bpm, stepCount, grid, trackConfigs, callbacks);
  return _sequencer;
}

export function getSequencer(): Sequencer | null {
  return _sequencer;
}
