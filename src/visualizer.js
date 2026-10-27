/**
 * Visualizer controller. It owns the settings, the input array and a step
 * player, and turns elapsed time into steps. It never touches the DOM: the UI
 * forwards user actions, calls `update(dt)` once per frame and draws
 * `getState()`.
 * @module visualizer
 */

import { getAlgorithm } from './algorithms.js';
import { PATTERNS, generateArray } from './arrays.js';
import { createStepPlayer } from './player.js';
import { createRng } from './rng.js';

/** Allowed array sizes (slider bounds). */
export const SIZE_RANGE = Object.freeze({ min: 5, max: 300 });

/** Speed levels (slider bounds); level 1 is 2 steps/s, level 100 is 5000 steps/s. */
export const SPEED_RANGE = Object.freeze({ min: 1, max: 100 });

/** Settings used for missing or invalid options. */
export const DEFAULT_OPTIONS = Object.freeze({
  algorithm: 'quickLomuto',
  pattern: 'random',
  size: 50,
  speed: 50,
  seed: 1,
});

/** The `?demo` scene: quick sort (Lomuto) on a 60-element random array. */
export const DEMO_OPTIONS = Object.freeze({
  algorithm: 'quickLomuto',
  pattern: 'random',
  size: 60,
  speed: 50,
  seed: 21,
});

const SLOWEST_STEPS_PER_SECOND = 2;
const FASTEST_STEPS_PER_SECOND = 5000;

/** Longest frame that counts, so a long-hidden tab does not jump ahead. */
const MAX_FRAME_MS = 250;

/**
 * @typedef {object} Options
 * @property {string} [algorithm] Algorithm id from ALGORITHMS.
 * @property {string} [pattern] Input pattern from PATTERNS.
 * @property {number|string} [size] Array size, clamped to SIZE_RANGE.
 * @property {number|string} [speed] Speed level, clamped to SPEED_RANGE.
 * @property {number|string} [seed] Seed for the input array (unsigned 32-bit).
 */

/**
 * @typedef {object} VisualizerState
 * @property {string} algorithm Current algorithm id.
 * @property {string} pattern Current input pattern.
 * @property {number} size Number of bars; values are integers in [1, size].
 * @property {number} speed Speed level.
 * @property {number} seed Seed of the current input.
 * @property {number} stepsPerSecond Playback rate for the speed level.
 * @property {number[]} array Current bar values (a copy).
 * @property {boolean[]} sorted Bars known to be in their final place (a copy).
 * @property {{type: string, indices: number[]}|null} highlight Last applied step, or null before the first one.
 * @property {import('./player.js').Stats} stats Counters; `stats.steps` is the elapsed step count.
 * @property {number} totalSteps Steps in the whole run.
 * @property {boolean} playing True while update() advances.
 * @property {boolean} done True once the array is sorted.
 */

/**
 * @typedef {object} Visualizer
 * @property {() => VisualizerState} getState Snapshot for drawing.
 * @property {(changes: Options) => void} configure Applies settings; a new pattern, size or seed builds a new array, a new algorithm restarts on the same array, speed changes keep playing.
 * @property {() => void} play Starts playback (from the beginning when already done).
 * @property {() => void} pause Stops playback.
 * @property {() => void} togglePlay Play/Pause button and Space key.
 * @property {() => (import('./sorts.js').Step|null)} step Pauses and applies exactly one step (Right arrow); null when done.
 * @property {(dtMs: number) => import('./sorts.js').Step[]} update Advances by elapsed time while playing; returns the applied steps.
 * @property {() => void} reset Rewinds to the unsorted input and pauses.
 * @property {() => void} shuffle Builds a new array from the next seed (R key).
 */

/**
 * Creates a visualizer.
 * @param {Options} [options] Initial settings; invalid values fall back to DEFAULT_OPTIONS.
 * @returns {Visualizer}
 */
export function createVisualizer(options = {}) {
  let settings = normalizeOptions(options, DEFAULT_OPTIONS);
  let input = [];
  let player;
  let playing = false;
  let pendingSteps = 0;

  function load(regenerate) {
    if (regenerate) input = generateArray(settings.pattern, settings.size, createRng(settings.seed));
    player = createStepPlayer(input, [...getAlgorithm(settings.algorithm).sort(input)]);
    pause();
  }

  function play() {
    if (player.done) player.reset();
    playing = true;
  }

  function pause() {
    playing = false;
    pendingSteps = 0;
  }

  function configure(changes) {
    const next = normalizeOptions({ ...settings, ...changes }, settings);
    const regenerate =
      next.pattern !== settings.pattern || next.size !== settings.size || next.seed !== settings.seed;
    const restart = regenerate || next.algorithm !== settings.algorithm;
    settings = next;
    if (restart) load(regenerate);
  }

  function update(dtMs) {
    if (!playing) return [];
    const dt = Number.isFinite(dtMs) ? Math.min(Math.max(dtMs, 0), MAX_FRAME_MS) : 0;
    pendingSteps += (dt / 1000) * stepsPerSecond(settings.speed);
    const applied = [];
    while (pendingSteps >= 1 && !player.done) {
      applied.push(player.next());
      pendingSteps -= 1;
    }
    if (player.done) pause();
    return applied;
  }

  function getState() {
    const last = player.last;
    return {
      ...settings,
      stepsPerSecond: stepsPerSecond(settings.speed),
      array: player.array.slice(),
      sorted: player.sorted.slice(),
      highlight: last ? { type: last.type, indices: last.indices.slice() } : null,
      stats: { ...player.stats },
      totalSteps: player.total,
      playing,
      done: player.done,
    };
  }

  load(true);
  return {
    getState,
    configure,
    play,
    pause,
    togglePlay() {
      if (playing) pause();
      else play();
    },
    step() {
      pause();
      return player.next();
    },
    update,
    reset() {
      player.reset();
      pause();
    },
    shuffle() {
      configure({ seed: settings.seed + 1 });
    },
  };
}

/**
 * Builds the deterministic `?demo` scene: DEMO_OPTIONS, paused exactly halfway
 * through the run.
 * @returns {Visualizer}
 */
export function createDemoVisualizer() {
  const visualizer = createVisualizer(DEMO_OPTIONS);
  const halfway = Math.floor(visualizer.getState().totalSteps / 2);
  for (let i = 0; i < halfway; i++) visualizer.step();
  return visualizer;
}

/** Maps a speed level to steps per second on an exponential scale. */
function stepsPerSecond(level) {
  const t = (level - SPEED_RANGE.min) / (SPEED_RANGE.max - SPEED_RANGE.min);
  return SLOWEST_STEPS_PER_SECOND * (FASTEST_STEPS_PER_SECOND / SLOWEST_STEPS_PER_SECOND) ** t;
}

/** Validates every option, using `fallback` for anything unusable. */
function normalizeOptions(options, fallback) {
  const seed = toNumber(options.seed);
  return {
    algorithm: getAlgorithm(options.algorithm) ? options.algorithm : fallback.algorithm,
    pattern: PATTERNS.includes(options.pattern) ? options.pattern : fallback.pattern,
    size: clampInteger(options.size, SIZE_RANGE, fallback.size),
    speed: clampInteger(options.speed, SPEED_RANGE, fallback.speed),
    seed: seed === null ? fallback.seed : seed >>> 0,
  };
}

function clampInteger(value, range, fallback) {
  const number = toNumber(value);
  if (number === null) return fallback;
  return Math.min(range.max, Math.max(range.min, Math.round(number)));
}

/** Accepts finite numbers and numeric strings (slider values); anything else is null. */
function toNumber(value) {
  const number = typeof value === 'string' && value.trim() !== '' ? Number(value) : value;
  return typeof number === 'number' && Number.isFinite(number) ? number : null;
}
