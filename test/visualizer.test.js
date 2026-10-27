import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ALGORITHMS, getAlgorithm } from '../src/algorithms.js';
import { generateArray } from '../src/arrays.js';
import { createRng } from '../src/rng.js';
import {
  DEFAULT_OPTIONS,
  DEMO_OPTIONS,
  SIZE_RANGE,
  SPEED_RANGE,
  createDemoVisualizer,
  createVisualizer,
} from '../src/visualizer.js';

const ZERO_STATS = { comparisons: 0, swaps: 0, writes: 0, steps: 0 };
const isAscending = (values) => values.every((v, i) => i === 0 || values[i - 1] <= v);
const stepCount = (id, input) => [...getAlgorithm(id).sort(input)].length;
const settingsOf = ({ algorithm, pattern, size, speed, seed }) => ({ algorithm, pattern, size, speed, seed });

/** Plays at full speed in 250 ms frames until playback stops by itself. */
function runToEnd(visualizer) {
  visualizer.configure({ speed: SPEED_RANGE.max });
  visualizer.play();
  for (let frame = 0; frame < 10000 && visualizer.getState().playing; frame++) visualizer.update(250);
  return visualizer.getState();
}

test('starts paused at the beginning, using the default settings', () => {
  const state = createVisualizer().getState();
  assert.deepEqual(settingsOf(state), DEFAULT_OPTIONS);
  assert.deepEqual(state.array, generateArray('random', 50, createRng(1)));
  assert.deepEqual(state.sorted, new Array(50).fill(false));
  assert.deepEqual(state.stats, ZERO_STATS);
  assert.equal(state.totalSteps, stepCount(DEFAULT_OPTIONS.algorithm, state.array));
  assert.equal(state.highlight, null);
  assert.equal(state.playing, false);
  assert.equal(state.done, false);
});

test('unusable options fall back to the defaults', () => {
  const state = createVisualizer({ algorithm: 'bogo', pattern: 'zigzag', size: 'big', speed: Number.NaN, seed: {} }).getState();
  assert.deepEqual(settingsOf(state), DEFAULT_OPTIONS);
});

test('size and speed are clamped and rounded; numeric strings are accepted', () => {
  assert.deepEqual(SIZE_RANGE, { min: 5, max: 300 });
  assert.deepEqual(SPEED_RANGE, { min: 1, max: 100 });
  const pick = (options) => {
    const { size, speed, seed } = createVisualizer(options).getState();
    return [size, speed, seed];
  };
  assert.deepEqual(pick({ size: 1, speed: 0, seed: -1 }), [5, 1, 2 ** 32 - 1]);
  assert.deepEqual(pick({ size: 1000, speed: 500, seed: 2 ** 32 + 3 }), [300, 100, 3]);
  assert.deepEqual(pick({ size: '120', speed: '7.6', seed: '42' }), [120, 8, 42]);
});

test('speed levels map to 2..5000 steps per second, always increasing', () => {
  const rate = (speed) => createVisualizer({ size: 5, speed }).getState().stepsPerSecond;
  assert.equal(rate(SPEED_RANGE.min), 2);
  assert.equal(rate(SPEED_RANGE.max), 5000);
  for (let level = SPEED_RANGE.min + 1; level <= SPEED_RANGE.max; level++) {
    assert.ok(rate(level) > rate(level - 1), `level ${level}`);
  }
});

test('update() does nothing while paused', () => {
  const visualizer = createVisualizer();
  assert.deepEqual(visualizer.update(1000), []);
  assert.deepEqual(visualizer.getState().stats, ZERO_STATS);
});

test('update() turns elapsed time into steps and carries fractions between frames', () => {
  const visualizer = createVisualizer({ speed: 1 });
  visualizer.play();
  const counts = [250, 250, 100, 150, 250].map((dt) => visualizer.update(dt).length);
  assert.deepEqual(counts, [0, 1, 0, 0, 1]);
  assert.equal(visualizer.getState().stats.steps, 2);
});

test('update() returns the applied steps and counts at most 250 ms per frame', () => {
  const visualizer = createVisualizer({ algorithm: 'bubble', pattern: 'reversed', size: 300, speed: 100 });
  visualizer.play();
  const applied = visualizer.update(60000);
  const state = visualizer.getState();
  assert.equal(applied.length, 1250);
  assert.equal(state.stats.steps, 1250);
  assert.deepEqual(state.highlight, { type: applied.at(-1).type, indices: applied.at(-1).indices });
});

test('update() ignores frame times that are not usable', () => {
  const visualizer = createVisualizer({ speed: 100 });
  visualizer.play();
  for (const dt of [Number.NaN, -500, Number.POSITIVE_INFINITY, undefined]) {
    assert.deepEqual(visualizer.update(dt), [], String(dt));
  }
  assert.equal(visualizer.getState().stats.steps, 0);
});

test('step() applies exactly one step and pauses', () => {
  const visualizer = createVisualizer();
  visualizer.play();
  const step = visualizer.step();
  const state = visualizer.getState();
  assert.equal(state.playing, false);
  assert.equal(state.stats.steps, 1);
  assert.deepEqual(state.highlight, { type: step.type, indices: step.indices });
});

test('every algorithm plays to a sorted, finished state', () => {
  for (const { id } of ALGORITHMS) {
    const visualizer = createVisualizer({ algorithm: id, size: 40, seed: 5 });
    const state = runToEnd(visualizer);
    assert.ok(isAscending(state.array), id);
    assert.ok(state.sorted.every(Boolean), id);
    assert.equal(state.stats.steps, state.totalSteps, id);
    assert.equal(state.done, true, id);
    assert.equal(state.playing, false, id);
    assert.deepEqual(visualizer.update(1000), [], id);
    assert.equal(visualizer.step(), null, id);
  }
});

test('play() after the end starts the run over', () => {
  const visualizer = createVisualizer({ size: 5 });
  runToEnd(visualizer);
  visualizer.play();
  const state = visualizer.getState();
  assert.equal(state.playing, true);
  assert.equal(state.done, false);
  assert.deepEqual(state.stats, ZERO_STATS);
});

test('togglePlay() switches between playing and paused', () => {
  const visualizer = createVisualizer();
  visualizer.togglePlay();
  assert.equal(visualizer.getState().playing, true);
  visualizer.togglePlay();
  assert.equal(visualizer.getState().playing, false);
});

test('reset() rewinds to the unsorted input and pauses', () => {
  const visualizer = createVisualizer();
  const initial = visualizer.getState();
  visualizer.play();
  visualizer.update(250);
  visualizer.reset();
  const state = visualizer.getState();
  assert.deepEqual(state.array, initial.array);
  assert.deepEqual(state.sorted, initial.sorted);
  assert.deepEqual(state.stats, ZERO_STATS);
  assert.equal(state.highlight, null);
  assert.equal(state.playing, false);
});

test('shuffle() moves to the next seed and builds a new array', () => {
  const visualizer = createVisualizer({ seed: 10 });
  const before = visualizer.getState().array;
  visualizer.step();
  visualizer.shuffle();
  const state = visualizer.getState();
  assert.equal(state.seed, 11);
  assert.deepEqual(state.array, generateArray('random', 50, createRng(11)));
  assert.notDeepEqual(state.array, before);
  assert.deepEqual(state.stats, ZERO_STATS);

  const last = createVisualizer({ seed: 2 ** 32 - 1 });
  last.shuffle();
  assert.equal(last.getState().seed, 0);
});

test('changing the algorithm restarts on the same array', () => {
  const visualizer = createVisualizer({ seed: 3 });
  const input = visualizer.getState().array;
  visualizer.play();
  visualizer.update(250);
  visualizer.configure({ algorithm: 'merge' });
  const state = visualizer.getState();
  assert.equal(state.algorithm, 'merge');
  assert.deepEqual(state.array, input);
  assert.deepEqual(state.stats, ZERO_STATS);
  assert.equal(state.totalSteps, stepCount('merge', input));
  assert.equal(state.playing, false);
});

test('changing size or pattern builds a new array from the same seed', () => {
  const visualizer = createVisualizer({ seed: 8 });
  visualizer.configure({ size: 80 });
  assert.deepEqual(visualizer.getState().array, generateArray('random', 80, createRng(8)));
  visualizer.configure({ pattern: 'reversed' });
  assert.deepEqual(visualizer.getState().array, generateArray('reversed', 80, createRng(8)));
});

test('changing only the speed keeps playing without losing progress', () => {
  const visualizer = createVisualizer();
  visualizer.play();
  visualizer.update(250);
  const steps = visualizer.getState().stats.steps;
  assert.ok(steps > 0);
  visualizer.configure({ speed: 80 });
  const state = visualizer.getState();
  assert.equal(state.speed, 80);
  assert.equal(state.playing, true);
  assert.equal(state.stats.steps, steps);
});

test('unusable changes keep the current settings and progress', () => {
  const visualizer = createVisualizer({ algorithm: 'heap', size: 30 });
  visualizer.step();
  visualizer.configure({ algorithm: 'bogus', pattern: 'zigzag', size: 'huge', speed: null });
  const state = visualizer.getState();
  assert.deepEqual(settingsOf(state), { ...DEFAULT_OPTIONS, algorithm: 'heap', size: 30 });
  assert.equal(state.stats.steps, 1);
});

test('getState() hands out copies', () => {
  const visualizer = createVisualizer();
  visualizer.step();
  const state = visualizer.getState();
  state.array.fill(0);
  state.sorted.fill(true);
  state.stats.steps = 99;
  state.highlight.indices.push(7);
  const again = visualizer.getState();
  assert.ok(again.array.every((v) => v > 0));
  assert.ok(again.sorted.every((flag) => !flag));
  assert.equal(again.stats.steps, 1);
  assert.equal(again.highlight.indices.length, 2);
});

test('the demo is quick sort paused halfway through a 60-element random array', () => {
  const state = createDemoVisualizer().getState();
  assert.deepEqual(settingsOf(state), DEMO_OPTIONS);
  assert.deepEqual({ algorithm: state.algorithm, pattern: state.pattern, size: state.size }, {
    algorithm: 'quickLomuto',
    pattern: 'random',
    size: 60,
  });
  assert.equal(state.stats.steps, Math.floor(state.totalSteps / 2));
  assert.equal(state.playing, false);
  assert.equal(state.done, false);
  assert.equal(isAscending(state.array), false);
  const placed = state.sorted.filter(Boolean).length;
  assert.ok(placed > 0 && placed < 60, `${placed} bars placed`);
});

test('the demo is deterministic', () => {
  const state = createDemoVisualizer().getState();
  assert.deepEqual(createDemoVisualizer().getState(), state);
  assert.equal(state.totalSteps, 472);
  assert.deepEqual(state.highlight, { type: 'compare', indices: [26, 59] });
});

test('the demo plays on to a sorted finish', () => {
  const state = runToEnd(createDemoVisualizer());
  assert.ok(isAscending(state.array));
  assert.equal(state.done, true);
});
