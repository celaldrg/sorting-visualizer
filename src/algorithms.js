/**
 * Algorithm catalogue: each sort generator plus the language-neutral facts
 * shown in the info panel (stability and Big-O complexity). Localized names
 * and descriptions belong to the i18n strings, keyed by `id`.
 *
 * Symbols: n = number of elements, k = key range (max - min + 1),
 * d = number of decimal digits, b = base (10).
 * @module algorithms
 */

import {
  bubbleSort,
  countingSort,
  heapSort,
  insertionSort,
  mergeSort,
  quickSortHoare,
  quickSortLomuto,
  radixSort,
  selectionSort,
  shellSort,
} from './sorts.js';

/**
 * @typedef {object} Complexity
 * @property {string} best Best-case time.
 * @property {string} average Average-case time.
 * @property {string} worst Worst-case time.
 * @property {string} space Extra memory.
 */

/**
 * @typedef {object} Algorithm
 * @property {string} id Identifier, also used as the i18n key.
 * @property {(input: Array, key?: import('./sorts.js').KeyFn) => Generator<import('./sorts.js').Step>} sort Step generator.
 * @property {boolean} stable True when equal keys keep their input order.
 * @property {Complexity} complexity Time and space complexity.
 */

const N2 = 'O(n²)';
const N_LOG_N = 'O(n log n)';
const COUNTING = 'O(n + k)';
const RADIX = 'O(d·(n + b))';

/**
 * All algorithms, in display order.
 * @type {ReadonlyArray<Readonly<Algorithm>>}
 */
export const ALGORITHMS = Object.freeze(
  [
    {
      id: 'bubble',
      sort: bubbleSort,
      stable: true,
      complexity: { best: 'O(n)', average: N2, worst: N2, space: 'O(1)' },
    },
    {
      id: 'insertion',
      sort: insertionSort,
      stable: true,
      complexity: { best: 'O(n)', average: N2, worst: N2, space: 'O(1)' },
    },
    {
      id: 'selection',
      sort: selectionSort,
      stable: false,
      complexity: { best: N2, average: N2, worst: N2, space: 'O(1)' },
    },
    {
      id: 'shell',
      sort: shellSort,
      stable: false,
      complexity: { best: N_LOG_N, average: '~O(n^1.25)', worst: 'O(n^1.5)', space: 'O(1)' },
    },
    {
      id: 'merge',
      sort: mergeSort,
      stable: true,
      complexity: { best: N_LOG_N, average: N_LOG_N, worst: N_LOG_N, space: 'O(n)' },
    },
    {
      id: 'quickLomuto',
      sort: quickSortLomuto,
      stable: false,
      complexity: { best: N_LOG_N, average: N_LOG_N, worst: N2, space: 'O(log n)' },
    },
    {
      id: 'quickHoare',
      sort: quickSortHoare,
      stable: false,
      complexity: { best: N_LOG_N, average: N_LOG_N, worst: N2, space: 'O(log n)' },
    },
    {
      id: 'heap',
      sort: heapSort,
      stable: false,
      complexity: { best: N_LOG_N, average: N_LOG_N, worst: N_LOG_N, space: 'O(1)' },
    },
    {
      id: 'counting',
      sort: countingSort,
      stable: true,
      complexity: { best: COUNTING, average: COUNTING, worst: COUNTING, space: COUNTING },
    },
    {
      id: 'radix',
      sort: radixSort,
      stable: true,
      complexity: { best: RADIX, average: RADIX, worst: RADIX, space: 'O(n + b)' },
    },
  ].map((entry) => Object.freeze({ ...entry, complexity: Object.freeze(entry.complexity) })),
);

/**
 * Looks an algorithm up by id.
 * @param {string} id Algorithm id, e.g. "quickLomuto".
 * @returns {Readonly<Algorithm>|undefined} The algorithm, or undefined for an unknown id.
 */
export function getAlgorithm(id) {
  return ALGORITHMS.find((algorithm) => algorithm.id === id);
}
