/**
 * Pure text helpers for the panels: run status, a narration of the last step
 * and complexity notation. They return i18n keys plus parameters, so they stay
 * independent of the display language.
 * @module describe
 */

/**
 * An i18n key with the values for its placeholders.
 * @typedef {object} Message
 * @property {string} key Key in the i18n tables.
 * @property {Object<string, number>} params Placeholder values.
 */

/** Unicode superscripts for exponents such as n^1.25. */
const SUPERSCRIPTS = Object.freeze({
  0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹', '.': '·',
});

/** Complexity symbols, in the order the info panel explains them. */
const SYMBOLS = Object.freeze(['n', 'k', 'd', 'b']);

/**
 * Status of the run as an i18n key.
 * @param {{playing: boolean, done: boolean, stats: {steps: number}}} state Visualizer state.
 * @returns {'status.ready'|'status.playing'|'status.paused'|'status.done'}
 */
export function statusKey(state) {
  if (state.done) return 'status.done';
  if (state.playing) return 'status.playing';
  return state.stats.steps > 0 ? 'status.paused' : 'status.ready';
}

/**
 * Narrates the last applied step, e.g. "Compare a[3] = 17 with a[9] = 4".
 * Only Hoare's quick sort compares an index with itself: its pointers compare
 * each element with the pivot, so that step means a pointer reached the pivot
 * element, where it always stops. It is narrated as such.
 * @param {{array: number[], highlight: ({type: string, indices: number[]}|null), done: boolean, stats: {steps: number}}} state Visualizer state.
 * @returns {Message}
 */
export function describeStep(state) {
  const { array, highlight } = state;
  if (state.done) return { key: 'step.done', params: { steps: state.stats.steps } };
  if (!highlight) return { key: 'step.idle', params: {} };
  const [i, j] = highlight.indices;
  switch (highlight.type) {
    case 'compare':
      return i === j
        ? { key: 'step.comparePivot', params: { i, a: array[i] } }
        : { key: 'step.compare', params: { i, j, a: array[i], b: array[j] } };
    case 'swap':
      return { key: 'step.swap', params: { i, j } };
    case 'overwrite':
      return { key: 'step.write', params: { i, value: array[i] } };
    default:
      return highlight.indices.length === 1
        ? { key: 'step.sortedOne', params: { i } }
        : { key: 'step.sortedMany', params: { count: highlight.indices.length } };
  }
}

/**
 * Writes exponents as superscripts: "O(n^1.5)" becomes "O(n¹·⁵)".
 * @param {string} text Complexity in ASCII notation.
 * @returns {string}
 */
export function prettyComplexity(text) {
  return text.replace(/\^([\d.]+)/g, (_, power) => [...power].map((char) => SUPERSCRIPTS[char]).join(''));
}

/**
 * Symbols used in an algorithm's complexity table, so the panel can explain them.
 * @param {{best: string, average: string, worst: string, space: string}} complexity Complexity strings.
 * @returns {string[]} A subset of n, k, d, b in that order.
 */
export function complexitySymbols(complexity) {
  const text = [complexity.best, complexity.average, complexity.worst, complexity.space].join(' ');
  return SYMBOLS.filter((symbol) => new RegExp(`\\b${symbol}\\b`).test(text));
}
