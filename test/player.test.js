import { test } from 'node:test';
import assert from 'node:assert/strict';
import { applyStep, createStepPlayer } from '../src/player.js';

const freshState = (array) => ({
  array,
  sorted: new Array(array.length).fill(false),
  stats: { comparisons: 0, swaps: 0, writes: 0, steps: 0 },
});

test('applyStep counts a compare without changing the array', () => {
  const state = freshState([3, 1, 2]);
  applyStep(state, { type: 'compare', indices: [0, 1] });
  assert.deepEqual(state.array, [3, 1, 2]);
  assert.deepEqual(state.stats, { comparisons: 1, swaps: 0, writes: 0, steps: 1 });
});

test('applyStep swaps two positions', () => {
  const state = freshState([3, 1, 2]);
  applyStep(state, { type: 'swap', indices: [0, 2] });
  assert.deepEqual(state.array, [2, 1, 3]);
  assert.deepEqual(state.stats, { comparisons: 0, swaps: 1, writes: 0, steps: 1 });
});

test('applyStep overwrites one position with the step value', () => {
  const state = freshState([3, 1, 2]);
  applyStep(state, { type: 'overwrite', indices: [1], value: 9 });
  assert.deepEqual(state.array, [3, 9, 2]);
  assert.deepEqual(state.stats, { comparisons: 0, swaps: 0, writes: 1, steps: 1 });
});

test('applyStep marks positions as sorted', () => {
  const state = freshState([1, 2, 3]);
  applyStep(state, { type: 'sorted', indices: [0, 2] });
  assert.deepEqual(state.sorted, [true, false, true]);
  assert.deepEqual(state.stats, { comparisons: 0, swaps: 0, writes: 0, steps: 1 });
});

test('applyStep rejects unknown step types', () => {
  assert.throws(() => applyStep(freshState([1]), { type: 'teleport', indices: [0] }), TypeError);
});

const STEPS = [
  { type: 'compare', indices: [0, 1] },
  { type: 'swap', indices: [0, 1] },
  { type: 'overwrite', indices: [2], value: 7 },
  { type: 'sorted', indices: [0, 1, 2] },
];

test('a new player starts from a copy of the input', () => {
  const input = [2, 1, 5];
  const player = createStepPlayer(input, STEPS);
  assert.deepEqual(player.array, [2, 1, 5]);
  assert.notEqual(player.array, input);
  assert.deepEqual(player.sorted, [false, false, false]);
  assert.deepEqual(player.stats, { comparisons: 0, swaps: 0, writes: 0, steps: 0 });
  assert.equal(player.total, 4);
  assert.equal(player.done, false);
  assert.equal(player.last, null);
});

test('next() applies the steps in order, then returns null', () => {
  const input = [2, 1, 5];
  const player = createStepPlayer(input, STEPS);
  for (const expected of STEPS) {
    assert.equal(player.next(), expected);
    assert.equal(player.last, expected);
  }
  assert.equal(player.next(), null);
  assert.equal(player.done, true);
  assert.deepEqual(player.array, [1, 2, 7]);
  assert.deepEqual(player.sorted, [true, true, true]);
  assert.deepEqual(player.stats, { comparisons: 1, swaps: 1, writes: 1, steps: 4 });
  assert.deepEqual(input, [2, 1, 5], 'input is never mutated');
});

test('reset() rewinds to the original input', () => {
  const player = createStepPlayer([2, 1, 5], STEPS);
  while (!player.done) player.next();
  player.reset();
  assert.deepEqual(player.array, [2, 1, 5]);
  assert.deepEqual(player.sorted, [false, false, false]);
  assert.deepEqual(player.stats, { comparisons: 0, swaps: 0, writes: 0, steps: 0 });
  assert.equal(player.done, false);
  assert.equal(player.last, null);
});

test('a player without steps is done immediately', () => {
  const player = createStepPlayer([], []);
  assert.equal(player.done, true);
  assert.equal(player.next(), null);
});
