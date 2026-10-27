import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { ALGORITHMS, getAlgorithm } from '../src/algorithms.js';
import { PATTERNS, generateArray } from '../src/arrays.js';
import { createStepPlayer } from '../src/player.js';
import { createRng, randomInt } from '../src/rng.js';
import { countingSort, quickSortHoare, quickSortLomuto, radixSort } from '../src/sorts.js';

const numeric = (a, b) => a - b;
const byKey = (record) => record.key;

const SIZES = [0, 1, 2, 10, 50, 200];

/** Input families; crossed with SIZES they make the seeded corpus. */
const KINDS = {
  permutation: (n, rng) => generateArray('random', n, rng),
  duplicates: (n, rng) => Array.from({ length: n }, () => randomInt(rng, 0, Math.max(1, n >> 3))),
  alreadySorted: (n, rng) => Array.from({ length: n }, () => randomInt(rng, 0, 99)).sort(numeric),
  reversed: (n, rng) => generateArray('reversed', n, rng),
  nearlySorted: (n, rng) => generateArray('nearlySorted', n, rng),
  fewUnique: (n, rng) => generateArray('fewUnique', n, rng),
  allEqual: (n, rng) => new Array(n).fill(randomInt(rng, 0, 9)),
  negatives: (n, rng) => Array.from({ length: n }, () => randomInt(rng, -500, 500)),
};
const KIND_NAMES = Object.keys(KINDS);

/** 200 seeded arrays; the first 48 already cover every size x kind pair. */
const CORPUS = Array.from({ length: 200 }, (_, i) => {
  const size = SIZES[i % SIZES.length];
  const kind = KIND_NAMES[Math.floor(i / SIZES.length) % KIND_NAMES.length];
  const seed = 1000 + i;
  return { label: `${kind} n=${size} seed=${seed}`, input: KINDS[kind](size, createRng(seed)) };
});

function playToEnd(player) {
  while (!player.done) player.next();
  return player;
}

/** Records the algorithm's steps and replays them on a copy of `input`. */
function replay(algorithm, input, key) {
  const steps = [...algorithm.sort(input, key)];
  return { steps, player: playToEnd(createStepPlayer(input, steps)) };
}

function inversions(values) {
  let count = 0;
  for (let i = 0; i < values.length; i++) {
    for (let j = i + 1; j < values.length; j++) if (values[i] > values[j]) count++;
  }
  return count;
}

const ARITY = { compare: 2, swap: 2, overwrite: 1 };

function assertWellFormed(step, length, label) {
  assert.ok(['compare', 'swap', 'overwrite', 'sorted'].includes(step.type), `${label}: type ${step.type}`);
  assert.ok(Array.isArray(step.indices) && step.indices.length > 0, `${label}: indices`);
  for (const i of step.indices) {
    assert.ok(Number.isInteger(i) && i >= 0 && i < length, `${label}: index ${i} out of range`);
  }
  if (step.type === 'sorted') return;
  assert.equal(step.indices.length, ARITY[step.type], `${label}: ${step.type} arity`);
  assert.equal('value' in step, step.type === 'overwrite', `${label}: value only on overwrite`);
  if (step.type === 'swap') assert.notEqual(step.indices[0], step.indices[1], `${label}: self-swap`);
}

test('the corpus has 200 arrays covering every required size and shape', () => {
  assert.equal(CORPUS.length, 200);
  const lengths = new Set(CORPUS.map(({ input }) => input.length));
  assert.deepEqual([...lengths].sort(numeric), SIZES);
  for (const kind of ['duplicates', 'alreadySorted', 'reversed']) {
    assert.ok(CORPUS.some(({ label }) => label.startsWith(kind)), kind);
  }
  assert.ok(CORPUS.some(({ input }) => new Set(input).size < input.length), 'has duplicates');
});

for (const algorithm of ALGORITHMS) {
  describe(`${algorithm.id} sort`, () => {
    test('DONE: replayed steps sort 200 seeded arrays exactly like a numeric Array.prototype.sort', () => {
      for (const { label, input } of CORPUS) {
        const original = input.slice();
        const expected = input.slice().sort(numeric);
        const { player } = replay(algorithm, input);
        assert.deepEqual(player.array, expected, label);
        assert.deepEqual(input, original, `${label}: input was mutated`);
      }
    });

    test('every yielded step is well-formed', () => {
      for (const { label, input } of CORPUS) {
        const steps = [...algorithm.sort(input)];
        assert.equal(steps.length === 0, input.length === 0, `${label}: steps only for non-empty input`);
        for (const step of steps) assertWellFormed(step, input.length, label);
      }
    });

    test('each index is marked sorted once, already final, and never moved again', () => {
      for (const { label, input } of CORPUS) {
        const expected = input.slice().sort(numeric);
        const player = createStepPlayer(input, [...algorithm.sort(input)]);
        const marks = new Array(input.length).fill(0);
        for (let step = player.next(); step !== null; step = player.next()) {
          if (step.type === 'sorted') {
            for (const i of step.indices) {
              marks[i]++;
              assert.equal(player.array[i], expected[i], `${label}: index ${i} marked before it was final`);
            }
          } else if (step.type !== 'compare') {
            for (const i of step.indices) assert.equal(marks[i], 0, `${label}: ${step.type} moved sorted index ${i}`);
          }
        }
        assert.deepEqual(marks, new Array(input.length).fill(1), label);
      }
    });

    test('step sequence and counts are deterministic for a given seed', () => {
      for (let seed = 1; seed <= 5; seed++) {
        for (const pattern of PATTERNS) {
          const first = replay(algorithm, generateArray(pattern, 60, createRng(seed)));
          const second = replay(algorithm, generateArray(pattern, 60, createRng(seed)));
          assert.deepEqual(second.steps, first.steps, `${pattern} seed=${seed}`);
          assert.deepEqual(second.player.stats, first.player.stats, `${pattern} seed=${seed}`);
        }
      }
    });
  });
}

describe('known step counts (seed 42, random array of 100)', () => {
  const EXPECTED = {
    bubble: { comparisons: 4797, swaps: 2589, writes: 0, steps: 7469 },
    insertion: { comparisons: 2681, swaps: 2589, writes: 0, steps: 5271 },
    selection: { comparisons: 4950, swaps: 95, writes: 0, steps: 5145 },
    shell: { comparisons: 684, swaps: 391, writes: 0, steps: 1076 },
    merge: { comparisons: 535, swaps: 0, writes: 629, steps: 1165 },
    quickLomuto: { comparisons: 562, swaps: 277, writes: 0, steps: 939 },
    quickHoare: { comparisons: 908, swaps: 163, writes: 0, steps: 1171 },
    heap: { comparisons: 1027, swaps: 577, writes: 0, steps: 1704 },
    counting: { comparisons: 0, swaps: 0, writes: 100, steps: 101 },
    radix: { comparisons: 0, swaps: 0, writes: 300, steps: 301 },
  };

  test('every algorithm has a pinned expectation', () => {
    assert.deepEqual(Object.keys(EXPECTED), ALGORITHMS.map((algorithm) => algorithm.id));
  });

  for (const algorithm of ALGORITHMS) {
    test(algorithm.id, () => {
      const input = generateArray('random', 100, createRng(42));
      assert.deepEqual(replay(algorithm, input).player.stats, EXPECTED[algorithm.id]);
    });
  }
});

describe('operation counts follow the textbook', () => {
  const ascending = (n) => Array.from({ length: n }, (_, i) => i + 1);
  const descending = (n) => ascending(n).reverse();
  const statsOf = (id, input) => replay(getAlgorithm(id), input).player.stats;

  test('bubble and insertion sort swap exactly once per inversion', () => {
    for (const { label, input } of CORPUS) {
      const expected = inversions(input);
      assert.equal(statsOf('bubble', input).swaps, expected, label);
      assert.equal(statsOf('insertion', input).swaps, expected, label);
    }
  });

  test('bubble and insertion sort need n-1 comparisons on sorted input and n(n-1)/2 on reversed input', () => {
    for (const id of ['bubble', 'insertion']) {
      const sorted = statsOf(id, ascending(50));
      assert.equal(sorted.comparisons, 49, id);
      assert.equal(sorted.swaps, 0, id);
      assert.equal(statsOf(id, descending(50)).comparisons, 1225, id);
    }
  });

  test('selection sort always compares n(n-1)/2 times and swaps at most n-1 times', () => {
    for (const { label, input } of CORPUS) {
      const n = input.length;
      const stats = statsOf('selection', input);
      assert.equal(stats.comparisons, n < 2 ? 0 : (n * (n - 1)) / 2, label);
      assert.ok(stats.swaps <= Math.max(0, n - 1), label);
    }
  });

  test('Lomuto quick sort hits its quadratic worst case on sorted input; Hoare stays near n log n', () => {
    assert.equal(statsOf('quickLomuto', ascending(200)).comparisons, (200 * 199) / 2);
    assert.ok(statsOf('quickHoare', ascending(200)).comparisons < 2 * 200 * Math.log2(200));
  });

  test('merge sort and heap sort stay within their n log n bounds', () => {
    for (const { label, input } of CORPUS) {
      const n = input.length;
      if (n < 2) continue;
      const logN = Math.ceil(Math.log2(n));
      const merge = statsOf('merge', input);
      assert.ok(merge.comparisons <= n * logN - n + 1, `${label}: merge comparisons`);
      assert.ok(merge.writes <= n * logN, `${label}: merge writes`);
      assert.ok(statsOf('heap', input).comparisons <= 2 * n * logN + 2 * n, `${label}: heap comparisons`);
    }
  });

  test('swap-based sorts never overwrite; merge, counting and radix never swap', () => {
    const input = generateArray('random', 80, createRng(5));
    for (const id of ['bubble', 'insertion', 'selection', 'shell', 'quickLomuto', 'quickHoare', 'heap']) {
      assert.equal(statsOf(id, input).writes, 0, id);
    }
    for (const id of ['merge', 'counting', 'radix']) {
      assert.equal(statsOf(id, input).swaps, 0, id);
    }
  });

  test('counting and radix sort never compare; radix writes n per decimal digit', () => {
    for (const { label, input } of CORPUS) {
      const counting = statsOf('counting', input);
      const radix = statsOf('radix', input);
      assert.equal(counting.comparisons, 0, label);
      assert.equal(counting.writes, input.length, label);
      assert.equal(radix.comparisons, 0, label);
    }
    assert.equal(statsOf('radix', ascending(9)).writes, 9);
    assert.equal(statsOf('radix', descending(99)).writes, 2 * 99);
    assert.equal(statsOf('radix', descending(300)).writes, 3 * 300);
  });

  test('counting and radix sort reject keys that are not integers', () => {
    assert.throws(() => [...countingSort([3, 1.5, 2])], TypeError);
    assert.throws(() => [...radixSort([3, Number.NaN])], TypeError);
    assert.throws(() => [...radixSort([{ key: '7' }], byKey)], TypeError);
  });
});

describe('quick sort keeps O(log n) parts waiting on its stack', () => {
  /** V shape, e.g. 8 6 4 2 1 3 5 7: every Lomuto split leaves a one-element part on the right. */
  const vee = (n) => Array.from({ length: n }, (_, i) => (i < n / 2 ? n - 2 * i : 2 * i - n + 1));

  /**
   * Rebuilds Lomuto's parts from its steps and returns the most parts that
   * waited while another one was sorted. A partition of [lo, hi] opens with
   * compare(lo, hi) and ends by marking its pivot; a one-element part is only marked.
   */
  function mostWaitingParts(input) {
    const waiting = input.length > 0 ? [[0, input.length - 1]] : [];
    let most = 0;
    let opening = null;
    for (const step of quickSortLomuto(input)) {
      if (step.type !== 'sorted') {
        opening ??= step;
        continue;
      }
      const [pivot] = step.indices;
      const [lo, hi] = opening ? opening.indices : [pivot, pivot];
      const at = waiting.findIndex((part) => part[0] === lo && part[1] === hi);
      assert.ok(at >= 0, `part ${lo}..${hi} was not waiting`);
      waiting.splice(at, 1);
      most = Math.max(most, waiting.length);
      if (opening) waiting.push(...[[lo, pivot - 1], [pivot + 1, hi]].filter(([from, to]) => from <= to));
      opening = null;
    }
    assert.equal(waiting.length, 0, 'every part was sorted');
    return most;
  }

  const log2Floor = (n) => Math.floor(Math.log2(Math.max(1, n)));

  test('Lomuto sorts the smaller part first, so at most log2(n) parts wait at once', () => {
    for (const { label, input } of CORPUS) assert.ok(mostWaitingParts(input) <= log2Floor(input.length), label);
    // Sorting the left part first would leave about n/2 parts waiting here.
    for (const n of [60, 200, 300]) assert.ok(mostWaitingParts(vee(n)) <= log2Floor(n), `vee n=${n}`);
  });

  test('Hoare sorts the smaller part first too', () => {
    // [2, 3, 1] splits into [2, 1] and [3]: the lone 3 is placed before the pair is partitioned.
    const steps = [...quickSortHoare([2, 3, 1])];
    const marks = steps.filter((step) => step.type === 'sorted').map((step) => step.indices);
    assert.deepEqual(marks, [[2], [0], [1]]);
    const firstMark = steps.findIndex((step) => step.type === 'sorted');
    assert.ok(steps.slice(firstMark).some((step) => step.type === 'swap'), 'the pair is partitioned afterwards');
  });
});

describe('stability', () => {
  /** Records with small, repeated (also negative) keys; `id` is the input position. */
  function makeRecords(seed) {
    const rng = createRng(seed);
    const length = randomInt(rng, 0, 120);
    return Array.from({ length }, (_, id) => ({ key: randomInt(rng, -5, 9), id }));
  }

  /** True when keys ascend and equal keys keep ascending input positions. */
  function keepsInputOrder(records) {
    return records.every((r, i) => {
      if (i === 0) return true;
      const previous = records[i - 1];
      return r.key > previous.key || (r.key === previous.key && r.id > previous.id);
    });
  }

  test('the registry flags bubble, insertion, merge, counting and radix as the stable sorts', () => {
    const stable = ALGORITHMS.filter((algorithm) => algorithm.stable).map((algorithm) => algorithm.id);
    assert.deepEqual(stable, ['bubble', 'insertion', 'merge', 'counting', 'radix']);
  });

  for (const algorithm of ALGORITHMS.filter((entry) => entry.stable)) {
    test(`${algorithm.id} keeps records with equal keys in input order`, () => {
      for (let seed = 1; seed <= 60; seed++) {
        const records = makeRecords(seed);
        const { player } = replay(algorithm, records, byKey);
        assert.equal(new Set(player.array).size, records.length, `seed=${seed}: every record exactly once`);
        assert.ok(keepsInputOrder(player.array), `seed=${seed}`);
      }
    });
  }

  for (const algorithm of ALGORITHMS.filter((entry) => !entry.stable)) {
    test(`${algorithm.id} is flagged unstable for a reason: it reorders some equal keys`, () => {
      const results = Array.from({ length: 60 }, (_, i) => replay(algorithm, makeRecords(i + 1), byKey).player.array);
      for (const sorted of results) {
        assert.ok(sorted.every((r, i) => i === 0 || r.key >= sorted[i - 1].key), 'sorted by key');
      }
      assert.ok(results.some((sorted) => !keepsInputOrder(sorted)));
    });
  }
});

describe('algorithm registry', () => {
  test('lists ten algorithms with unique ids in display order', () => {
    assert.deepEqual(
      ALGORITHMS.map((algorithm) => algorithm.id),
      ['bubble', 'insertion', 'selection', 'shell', 'merge', 'quickLomuto', 'quickHoare', 'heap', 'counting', 'radix'],
    );
  });

  test('every entry has a generator and best/average/worst/space complexity', () => {
    for (const algorithm of ALGORITHMS) {
      assert.equal(typeof algorithm.sort, 'function', algorithm.id);
      assert.equal(typeof algorithm.stable, 'boolean', algorithm.id);
      for (const field of ['best', 'average', 'worst', 'space']) {
        assert.match(algorithm.complexity[field], /^~?O\(.+\)$/, `${algorithm.id}.${field}`);
      }
    }
  });

  test('entries are frozen so the UI cannot change shared data', () => {
    assert.ok(Object.isFrozen(ALGORITHMS));
    for (const algorithm of ALGORITHMS) {
      assert.ok(Object.isFrozen(algorithm) && Object.isFrozen(algorithm.complexity), algorithm.id);
    }
  });

  test('getAlgorithm finds by id and returns undefined otherwise', () => {
    assert.equal(getAlgorithm('heap').id, 'heap');
    for (const id of ['bogus', 'toString', '__proto__', undefined]) assert.equal(getAlgorithm(id), undefined);
  });
});
