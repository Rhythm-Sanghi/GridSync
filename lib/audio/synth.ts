/**
 * Pure synthesis functions.
 * Each function takes an AudioContext, a scheduled start time, parameters,
 * and a destination node — then schedules audio nodes with precise timing.
 * No state, no side effects outside of the Web Audio graph.
 */

import { getMasterGain } from './audioContext';
import { TrackConfig } from '../types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function createGainEnvelope(
  ctx: AudioContext,
  dest: AudioNode,
  startTime: number,
  peak: number,
  attackTime: number,
  decayTime: number,
  sustainLevel: number,
  releaseTime: number,
  totalDuration: number,
): GainNode {
  const gain = ctx.createGain();
  gain.connect(dest);
  gain.gain.setValueAtTime(0, startTime);
  gain.gain.linearRampToValueAtTime(peak, startTime + attackTime);
  gain.gain.linearRampToValueAtTime(sustainLevel * peak, startTime + attackTime + decayTime);
  gain.gain.setValueAtTime(sustainLevel * peak, startTime + totalDuration - releaseTime);
  gain.gain.linearRampToValueAtTime(0, startTime + totalDuration);
  return gain;
}

function createWhiteNoise(ctx: AudioContext, duration: number): AudioBufferSourceNode {
  const bufferSize = ctx.sampleRate * duration;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  return source;
}

// ─── Kick Drum ────────────────────────────────────────────────────────────────

/**
 * Kick: short sine burst with exponential pitch drop from startPitch → endPitch.
 * Classic 808-style thud.
 */
export function scheduleKick(
  ctx: AudioContext,
  startTime: number,
  config: TrackConfig,
): void {
  const dest = getMasterGain();
  const startPitch = config.pitch * 3; // e.g. 180 Hz start
  const endPitch = config.pitch * 0.5; // e.g. 30 Hz end

  const osc = ctx.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(startPitch, startTime);
  osc.frequency.exponentialRampToValueAtTime(endPitch, startTime + 0.08);

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(config.gain, startTime);
  gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.35);

  osc.connect(gain);
  gain.connect(dest);

  osc.start(startTime);
  osc.stop(startTime + 0.35);
}

// ─── Snare Drum ───────────────────────────────────────────────────────────────

/**
 * Snare: filtered noise burst + sine transient for the "crack" attack.
 */
export function scheduleSnare(
  ctx: AudioContext,
  startTime: number,
  config: TrackConfig,
): void {
  const dest = getMasterGain();
  const duration = 0.18;

  // Noise component
  const noise = createWhiteNoise(ctx, duration + 0.05);
  const noiseFilter = ctx.createBiquadFilter();
  noiseFilter.type = 'bandpass';
  noiseFilter.frequency.value = config.filterCutoff;
  noiseFilter.Q.value = 0.8;

  const noiseGain = ctx.createGain();
  noiseGain.gain.setValueAtTime(config.gain * 0.8, startTime);
  noiseGain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

  noise.connect(noiseFilter);
  noiseFilter.connect(noiseGain);
  noiseGain.connect(dest);
  noise.start(startTime);
  noise.stop(startTime + duration);

  // Sine transient (the crack)
  const osc = ctx.createOscillator();
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(config.pitch, startTime);
  osc.frequency.exponentialRampToValueAtTime(config.pitch * 0.5, startTime + 0.05);

  const oscGain = ctx.createGain();
  oscGain.gain.setValueAtTime(config.gain * 0.6, startTime);
  oscGain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.08);

  osc.connect(oscGain);
  oscGain.connect(dest);
  osc.start(startTime);
  osc.stop(startTime + 0.08);
}

// ─── Hi-Hat (Closed) ──────────────────────────────────────────────────────────

/**
 * Closed hi-hat: very short high-pass filtered noise burst.
 */
export function scheduleHiHat(
  ctx: AudioContext,
  startTime: number,
  config: TrackConfig,
  open: boolean = false,
): void {
  const dest = getMasterGain();
  const duration = open ? 0.3 : 0.06;

  const noise = createWhiteNoise(ctx, duration + 0.02);

  const hipass = ctx.createBiquadFilter();
  hipass.type = 'highpass';
  hipass.frequency.value = config.filterCutoff;
  hipass.Q.value = 1.5;

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(config.gain, startTime);
  gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

  noise.connect(hipass);
  hipass.connect(gain);
  gain.connect(dest);
  noise.start(startTime);
  noise.stop(startTime + duration);
}

// ─── Clap ─────────────────────────────────────────────────────────────────────

/**
 * Clap: 3 rapid noise bursts slightly offset to create the slap feel.
 */
export function scheduleClap(
  ctx: AudioContext,
  startTime: number,
  config: TrackConfig,
): void {
  const dest = getMasterGain();
  const offsets = [0, 0.010, 0.022]; // 3 slap layers

  offsets.forEach((offset, i) => {
    const t = startTime + offset;
    const dur = i === offsets.length - 1 ? 0.15 : 0.04;
    const noise = createWhiteNoise(ctx, dur);

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = config.filterCutoff;
    filter.Q.value = 0.5;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(config.gain * (i === offsets.length - 1 ? 0.9 : 0.5), t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(dest);
    noise.start(t);
    noise.stop(t + dur);
  });
}

// ─── Bass / Melodic Synth ─────────────────────────────────────────────────────

/**
 * Bass or melodic synth: oscillator through a lowpass filter with ADSR envelope.
 * waveform, pitch, and filter cutoff are all configurable per track.
 */
export function scheduleMelodic(
  ctx: AudioContext,
  startTime: number,
  config: TrackConfig,
  pitchHz?: number, // override pitch for pentatonic step variations
): void {
  const dest = getMasterGain();
  const freq = pitchHz ?? config.pitch;
  const isBass = config.instrument === 'bass';

  const osc = ctx.createOscillator();
  // 'pulse' isn't native — use 'square' with a periodic wave for slight variation
  osc.type = config.waveform === 'pulse' ? 'square' : (config.waveform as OscillatorType);
  osc.frequency.setValueAtTime(freq, startTime);

  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(config.filterCutoff, startTime);
  // Slight filter sweep for expressiveness
  filter.frequency.linearRampToValueAtTime(
    config.filterCutoff * (isBass ? 0.6 : 0.8),
    startTime + 0.15,
  );
  filter.Q.value = isBass ? 2 : 1;

  const totalDuration = isBass ? 0.2 : 0.25;
  const env = createGainEnvelope(
    ctx,
    filter,
    startTime,
    config.gain,
    0.005,   // attack
    0.04,    // decay
    0.6,     // sustain
    0.08,    // release
    totalDuration,
  );

  osc.connect(env);
  filter.connect(dest);

  osc.start(startTime);
  osc.stop(startTime + totalDuration + 0.01);
}

// ─── Pad Synth ────────────────────────────────────────────────────────────────

/**
 * Pad: slow-attack oscillator pair (slight detuning) with long sustain.
 * Lush ambient sound.
 */
export function schedulePad(
  ctx: AudioContext,
  startTime: number,
  config: TrackConfig,
  pitchHz?: number,
): void {
  const dest = getMasterGain();
  const freq = pitchHz ?? config.pitch;
  const duration = 0.5;

  [0, 7].forEach((detuneOffset) => {
    const osc = ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.value = freq * Math.pow(2, detuneOffset / 1200); // detune by cents

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = config.filterCutoff;
    filter.Q.value = 0.5;

    const env = createGainEnvelope(
      ctx,
      filter,
      startTime,
      config.gain * 0.5,
      0.08,  // slow attack
      0.1,
      0.7,
      0.15,
      duration,
    );

    osc.connect(env);
    filter.connect(dest);
    osc.start(startTime);
    osc.stop(startTime + duration);
  });
}

// ─── Dispatcher ───────────────────────────────────────────────────────────────

/**
 * Dispatch to the correct synth function based on instrument type.
 * stepIndex is used to derive pentatonic pitch variations for melodic tracks.
 */
export function scheduleInstrument(
  ctx: AudioContext,
  startTime: number,
  config: TrackConfig,
  stepIndex: number,
): void {
  switch (config.instrument) {
    case 'kick':
      scheduleKick(ctx, startTime, config);
      break;
    case 'snare':
      scheduleSnare(ctx, startTime, config);
      break;
    case 'hihat':
      scheduleHiHat(ctx, startTime, config, false);
      break;
    case 'hihat-open':
      scheduleHiHat(ctx, startTime, config, true);
      break;
    case 'clap':
      scheduleClap(ctx, startTime, config);
      break;
    case 'bass': {
      // Pentatonic pitch variation based on step
      const pentatonicSemitones = [0, 0, 7, 0, 5, 0, 3, 0, 0, 5, 7, 0, 5, 0, 7, 12];
      const semitones = pentatonicSemitones[stepIndex % 16];
      const pitchHz = config.pitch * Math.pow(2, semitones / 12);
      scheduleMelodic(ctx, startTime, config, pitchHz);
      break;
    }
    case 'lead': {
      const pentatonicSemitones = [0, 4, 7, 9, 12, 9, 7, 4, 0, 4, 7, 9, 12, 7, 4, 0];
      const semitones = pentatonicSemitones[stepIndex % 16];
      const pitchHz = config.pitch * Math.pow(2, semitones / 12);
      scheduleMelodic(ctx, startTime, config, pitchHz);
      break;
    }
    case 'pad': {
      const pentatonicSemitones = [0, 7, 12, 7, 0, 7, 12, 7, 0, 7, 12, 7, 0, 7, 12, 7];
      const semitones = pentatonicSemitones[stepIndex % 16];
      const pitchHz = config.pitch * Math.pow(2, semitones / 12);
      schedulePad(ctx, startTime, config, pitchHz);
      break;
    }
  }
}
