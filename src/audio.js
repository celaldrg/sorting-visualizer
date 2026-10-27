/**
 * Optional tones through the Web Audio API: a short blip per comparison or
 * write, pitched by bar height. Browsers only allow audio after a user
 * gesture, so the AudioContext is created lazily from `unlock()`, which the UI
 * calls inside click and key handlers. Importing this module has no side effects.
 * @module audio
 */

const LOW_HZ = 200;
const HIGH_HZ = 900;
const TONE_SECONDS = 0.07;
const ATTACK_SECONDS = 0.008;
const PEAK_GAIN = 0.05;
const SILENT_GAIN = 0.0001;
/** At high speeds tones are thinned out to at most one per this many milliseconds. */
const MIN_GAP_MS = 30;

/**
 * Pitch for a bar value: low bars sound low, tall bars high, on an exponential
 * (musical) scale.
 * @param {number} value Bar value, 1..max.
 * @param {number} max Largest possible value.
 * @returns {number} Frequency in Hz, from 200 to 900.
 */
export function toneFrequency(value, max) {
  const position = max > 1 ? (value - 1) / (max - 1) : 0.5;
  const t = Number.isFinite(position) ? Math.min(Math.max(position, 0), 1) : 0.5;
  return LOW_HZ * (HIGH_HZ / LOW_HZ) ** t;
}

/**
 * @typedef {object} TonePlayer
 * @property {(on: boolean) => void} setEnabled Turns tones on or off.
 * @property {() => void} unlock Creates or resumes the audio context; call it from a user gesture.
 * @property {(value: number, max: number, now: number) => void} play Plays one tone; `now` is a timestamp in ms.
 */

/**
 * Creates a tone player. It starts disabled and silent.
 * @returns {TonePlayer}
 */
export function createTonePlayer() {
  let enabled = false;
  let context = null;
  let lastToneAt = -Infinity;

  function unlock() {
    if (!enabled || typeof globalThis.AudioContext !== 'function') return;
    context ??= new globalThis.AudioContext();
    if (context.state === 'suspended') context.resume().catch(() => {});
  }

  function play(value, max, now) {
    if (!enabled || context?.state !== 'running' || now - lastToneAt < MIN_GAP_MS) return;
    lastToneAt = now;
    const start = context.currentTime;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = 'triangle';
    oscillator.frequency.value = toneFrequency(value, max);
    gain.gain.setValueAtTime(SILENT_GAIN, start);
    gain.gain.exponentialRampToValueAtTime(PEAK_GAIN, start + ATTACK_SECONDS);
    gain.gain.exponentialRampToValueAtTime(SILENT_GAIN, start + TONE_SECONDS);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start(start);
    oscillator.stop(start + TONE_SECONDS);
  }

  return {
    setEnabled(on) {
      enabled = Boolean(on);
    },
    unlock,
    play,
  };
}
