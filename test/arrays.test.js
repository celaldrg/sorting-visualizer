import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PATTERNS, generateArray } from '../src/arrays.js';
import { createRng } from '../src/rng.js';

const ascending = (n) => Array.from({ length: n }, (_, i) => i + 1);
const sortedCopy = (values) => values.slice().sort((a, b) => a - b);

function inversions(values) {
  let count = 0;
  for (let i = 0; i < values.length; i++) {
    for (let j = i + 1; j < values.length; j++) if (values[i] > values[j]) count++;
  }
  return count;
}

test('patterns are listed in display order', () => {
  assert.deepEqual(PATTERNS, ['random', 'nearlySorted', 'reversed', 'fewUnique']);
  assert.ok(Object.isFrozen(PATTERNS));
});

test('every pattern returns `size` integers in [1, size]', () => {
  for (const pattern of PATTERNS) {
    for (const size of [0, 1, 2, 5, 60, 300]) {
      const values = generateArray(pattern, size, createRng(size + 1));
      assert.equal(values.length, size, `${pattern} ${size}`);
      assert.ok(values.every((v) => Number.isInteger(v) && v >= 1 && v <= size), `${pattern} ${size}`);
    }
  }
});

test('the same seed gives the same array; another seed gives another one', () => {
  for (const pattern of ['random', 'nearlySorted', 'fewUnique']) {
    assert.deepEqual(generateArray(pattern, 60, createRng(3)), generateArray(pattern, 60, createRng(3)), pattern);
    assert.notDeepEqual(generateArray(pattern, 60, createRng(3)), generateArray(pattern, 60, createRng(4)), pattern);
  }
});

test('random is a shuffled permutation of 1..size', () => {
  for (let seed = 1; seed <= 20; seed++) {
    const values = generateArray('random', 60, createRng(seed));
    assert.deepEqual(sortedCopy(values), ascending(60));
    assert.ok(inversions(values) > 500, `seed=${seed} should be well mixed`);
  }
});

test('reversed counts down from size to 1', () => {
  assert.deepEqual(generateArray('reversed', 6, createRng(1)), [6, 5, 4, 3, 2, 1]);
});

test('nearly sorted is a permutation with only a few local inversions', () => {
  for (let seed = 1; seed <= 20; seed++) {
    const values = generateArray('nearlySorted', 60, createRng(seed));
    assert.deepEqual(sortedCopy(values), ascending(60));
    const count = inversions(values);
    assert.ok(count > 0 && count < 60, `seed=${seed}: ${count} inversions`);
  }
});

test('few unique uses at most five evenly spaced heights', () => {
  for (let seed = 1; seed <= 20; seed++) {
    const distinct = new Set(generateArray('fewUnique', 60, createRng(seed)));
    assert.ok(distinct.size >= 2 && distinct.size <= 5, `seed=${seed}`);
    for (const v of distinct) assert.ok([12, 24, 36, 48, 60].includes(v), `seed=${seed}: ${v}`);
  }
});

test('unknown patterns and bad sizes are rejected', () => {
  assert.throws(() => generateArray('zigzag', 10, createRng(1)), RangeError);
  assert.throws(() => generateArray('toString', 10, createRng(1)), RangeError);
  for (const size of [-1, 2.5, Number.NaN, '10']) {
    assert.throws(() => generateArray('random', size, createRng(1)), RangeError, String(size));
  }
});
