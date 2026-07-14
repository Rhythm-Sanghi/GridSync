/**
 * Singleton AudioContext manager.
 * The AudioContext must be created/resumed after a user gesture (browser policy).
 */

let _ctx: AudioContext | null = null;
let _masterGain: GainNode | null = null;

/** Get or create the singleton AudioContext + master gain chain */
export function getAudioContext(): AudioContext {
  if (!_ctx) {
    _ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    _masterGain = _ctx.createGain();
    _masterGain.gain.value = 0.85;
    _masterGain.connect(_ctx.destination);
  }
  return _ctx;
}

export function getMasterGain(): GainNode {
  getAudioContext(); // ensure initialized
  return _masterGain!;
}

/** Resume the AudioContext after a user gesture (required by browsers) */
export async function resumeAudioContext(): Promise<void> {
  const ctx = getAudioContext();
  if (ctx.state === 'suspended') {
    await ctx.resume();
  }
}

/** Returns whether the AudioContext has been started */
export function isAudioContextRunning(): boolean {
  return _ctx !== null && _ctx.state === 'running';
}

/** Get a MediaStreamDestination for recording */
export function getRecordingDestination(): MediaStreamAudioDestinationNode | null {
  if (!_ctx || !_masterGain) return null;
  const dest = _ctx.createMediaStreamDestination();
  _masterGain.connect(dest);
  return dest;
}
