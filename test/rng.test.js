import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRng, randomInt } from '../src/rng.js';

const take = (rng, count) => Array.from({ length: count }, () => rng());

test('the same seed always gives the same sequence', () => {
  assert.deepEqual(take(createRng(123), 1000), take(createRng(123), 1000));
});

test('known values for seed 42 are stable across runs and platforms', () => {
  assert.deepEqual(take(createRng(42), 3), [0.6011037519201636, 0.44829055899754167, 0.8524657934904099]);
});

test('different seeds give different sequences', () => {
  assert.notDeepEqual(take(createRng(1), 20), take(createRng(2), 20));
});

test('seeds are reduced to unsigned 32-bit integers', () => {
  assert.deepEqual(take(createRng(2 ** 32 + 5), 10), take(createRng(5), 10));
  assert.deepEqual(take(createRng(-1), 10), take(createRng(2 ** 32 - 1), 10));
});

test('values lie in [0, 1) and average about one half', () => {
  const values = take(createRng(7), 20000);
  assert.ok(values.every((v) => v >= 0 && v < 1));
  const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
  assert.ok(Math.abs(mean - 0.5) < 0.01, `mean ${mean}`);
});

test('randomInt covers [min, max] inclusively and nothing else', () => {
  const rng = createRng(99);
  const seen = new Set(Array.from({ length: 2000 }, () => randomInt(rng, -2, 3)));
  assert.deepEqual([...seen].sort((a, b) => a - b), [-2, -1, 0, 1, 2, 3]);
  assert.equal(randomInt(createRng(1), 4, 4), 4);
});

test('randomInt is deterministic for a seed', () => {
  const draw = () => {
    const rng = createRng(2026);
    return Array.from({ length: 50 }, () => randomInt(rng, 0, 1000));
  };
  assert.deepEqual(draw(), draw());
});
