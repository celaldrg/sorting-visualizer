import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ALGORITHMS } from '../src/algorithms.js';
import { PATTERNS, generateArray } from '../src/arrays.js';
import { complexitySymbols, describeStep, prettyComplexity, statusKey } from '../src/describe.js';
import { LANGUAGES, STRINGS, translate } from '../src/i18n.js';
import { createStepPlayer } from '../src/player.js';
import { createRng } from '../src/rng.js';
import { quickSortHoare } from '../src/sorts.js';
import { createDemoVisualizer } from '../src/visualizer.js';

const state = (overrides = {}) => ({
  array: [5, 3, 8, 1],
  highlight: null,
  playing: false,
  done: false,
  stats: { steps: 0 },
  ...overrides,
});

/** One state per narration, with the message it should produce. */
const NARRATIONS = [
  [state(), 'step.idle', {}],
  [state({ highlight: { type: 'compare', indices: [1, 3] } }), 'step.compare', { i: 1, j: 3, a: 3, b: 1 }],
  [state({ highlight: { type: 'compare', indices: [2, 2] } }), 'step.comparePivot', { i: 2, a: 8 }],
  [state({ highlight: { type: 'swap', indices: [0, 2] } }), 'step.swap', { i: 0, j: 2 }],
  [state({ highlight: { type: 'overwrite', indices: [2], value: 8 } }), 'step.write', { i: 2, value: 8 }],
  [state({ highlight: { type: 'sorted', indices: [3] } }), 'step.sortedOne', { i: 3 }],
  [state({ highlight: { type: 'sorted', indices: [0, 1, 2] } }), 'step.sortedMany', { count: 3 }],
  [state({ done: true, highlight: { type: 'sorted', indices: [0] }, stats: { steps: 42 } }), 'step.done', { steps: 42 }],
];

test('statusKey: ready before the first step, then playing, paused and done', () => {
  assert.equal(statusKey(state()), 'status.ready');
  assert.equal(statusKey(state({ playing: true })), 'status.playing');
  assert.equal(statusKey(state({ stats: { steps: 4 } })), 'status.paused');
  assert.equal(statusKey(state({ done: true, stats: { steps: 9 } })), 'status.done');
  assert.equal(statusKey(state({ done: true, playing: true })), 'status.done');
});

test('describeStep narrates each step type with the values on the bars', () => {
  for (const [input, key, params] of NARRATIONS) assert.deepEqual(describeStep(input), { key, params }, key);
});

test('every status and narration translates completely in both languages', () => {
  const messages = [
    ...NARRATIONS.map(([input]) => describeStep(input)),
    ...['status.ready', 'status.playing', 'status.paused', 'status.done'].map((key) => ({ key, params: {} })),
  ];
  for (const { key, params } of messages) {
    for (const lang of LANGUAGES) {
      assert.ok(Object.hasOwn(STRINGS[lang], key), `${lang}: ${key}`);
      assert.doesNotMatch(translate(lang, key, params), /\{\w+\}/, `${lang}: ${key}`);
    }
  }
});

test('only Hoare quick sort compares an index with itself, so such a step can be narrated as its pivot', () => {
  for (let seed = 1; seed <= 5; seed++) {
    for (const pattern of PATTERNS) {
      const input = generateArray(pattern, 60, createRng(seed));
      for (const { id, sort } of ALGORITHMS) {
        const selfCompares = [...sort(input)].filter(({ type, indices: [i, j] }) => type === 'compare' && i === j);
        assert.equal(selfCompares.length > 0, id === 'quickHoare', `${id} ${pattern} seed=${seed}`);
      }
    }
  }
});

test('when a Hoare pointer reaches the pivot, the narration says so instead of comparing a bar with itself', () => {
  // [2, 3, 1]: the pivot is the middle element 3; the left pointer passes 2 and stops on the pivot.
  const player = createStepPlayer([2, 3, 1], [...quickSortHoare([2, 3, 1])]);
  player.next();
  const step = player.next();
  assert.deepEqual(step, { type: 'compare', indices: [1, 1] });
  const message = describeStep({ array: player.array, highlight: step, done: player.done, stats: player.stats });
  assert.deepEqual(message, { key: 'step.comparePivot', params: { i: 1, a: 3 } });
  assert.equal(translate('en', message.key, message.params), 'Pointer stops at the pivot a[1] = 3');
  assert.equal(translate('tr', message.key, message.params), 'İşaretçi pivotta durur: a[1] = 3');
});

test('the demo scene is paused on a comparison, narrated with the compared values', () => {
  const demo = createDemoVisualizer().getState();
  const [i, j] = demo.highlight.indices;
  assert.equal(statusKey(demo), 'status.paused');
  assert.deepEqual(describeStep(demo), { key: 'step.compare', params: { i, j, a: demo.array[i], b: demo.array[j] } });
});

test('prettyComplexity writes exponents as superscripts', () => {
  assert.equal(prettyComplexity('O(n^1.5)'), 'O(n¹·⁵)');
  assert.equal(prettyComplexity('~O(n^1.25)'), '~O(n¹·²⁵)');
  assert.equal(prettyComplexity('O(n^2) + O(k^10)'), 'O(n²) + O(k¹⁰)');
  assert.equal(prettyComplexity('O(n log n)'), 'O(n log n)');
});

test('no complexity in the catalogue is shown with a caret', () => {
  for (const { id, complexity } of ALGORITHMS) {
    for (const text of Object.values(complexity)) assert.ok(!prettyComplexity(text).includes('^'), `${id}: ${text}`);
  }
});

test('complexitySymbols lists the symbols an algorithm uses, in a fixed order', () => {
  const symbols = Object.fromEntries(ALGORITHMS.map(({ id, complexity }) => [id, complexitySymbols(complexity)]));
  assert.deepEqual(symbols.bubble, ['n']);
  assert.deepEqual(symbols.shell, ['n']);
  assert.deepEqual(symbols.counting, ['n', 'k']);
  assert.deepEqual(symbols.radix, ['n', 'd', 'b']);
});

test('every one-letter symbol in the catalogue is explained in both languages', () => {
  for (const { id, complexity } of ALGORITHMS) {
    const letters = [...new Set(Object.values(complexity).join(' ').match(/\b[a-z]\b/g))].sort();
    assert.deepEqual([...complexitySymbols(complexity)].sort(), letters, id);
    for (const symbol of letters) {
      for (const lang of LANGUAGES) assert.ok(Object.hasOwn(STRINGS[lang], `symbol.${symbol}`), `${lang}: ${symbol}`);
    }
  }
});
