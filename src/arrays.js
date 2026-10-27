/**
 * Input arrays for the visualizer. Every pattern returns integer bar heights
 * in [1, size], so a chart can always scale bars against `size`.
 * @module arrays
 */

import { randomInt } from './rng.js';

/** Input patterns in display order. */
export const PATTERNS = Object.freeze(['random', 'nearlySorted', 'reversed', 'fewUnique']);

/** Number of distinct heights used by the "few unique" pattern. */
const FEW_UNIQUE_LEVELS = 5;

/**
 * Builds an input array.
 * @param {string} pattern One of {@link PATTERNS}.
 * @param {number} size Number of elements (non-negative integer).
 * @param {import('./rng.js').Rng} rng Random source; the same seed gives the same array.
 * @returns {number[]} Integers in [1, size].
 */
export function generateArray(pattern, size, rng) {
  if (!PATTERNS.includes(pattern)) throw new RangeError(`Unknown pattern: ${pattern}`);
  if (!Number.isInteger(size) || size < 0) throw new RangeError(`Invalid size: ${size}`);
  switch (pattern) {
    case 'random':
      return shuffle(ascending(size), rng);
    case 'nearlySorted':
      return perturb(ascending(size), rng);
    case 'reversed':
      return ascending(size).reverse();
    default: // 'fewUnique'
      return fewUnique(size, rng);
  }
}

/** @param {number} size @returns {number[]} 1, 2, ..., size */
function ascending(size) {
  return Array.from({ length: size }, (_, i) => i + 1);
}

/** Fisher-Yates shuffle in place. */
function shuffle(values, rng) {
  for (let i = values.length - 1; i > 0; i--) {
    swapItems(values, i, randomInt(rng, 0, i));
  }
  return values;
}

/** Swaps a few nearby pairs so the array stays almost in order. */
function perturb(values, rng) {
  const n = values.length;
  if (n < 2) return values;
  const swaps = Math.max(1, Math.round(n * 0.08));
  const reach = Math.max(1, Math.round(n * 0.05));
  for (let s = 0; s < swaps; s++) {
    const i = randomInt(rng, 0, n - 2);
    const j = Math.min(n - 1, i + randomInt(rng, 1, reach));
    swapItems(values, i, j);
  }
  return values;
}

/** Random picks from a handful of evenly spaced heights. */
function fewUnique(size, rng) {
  const count = Math.min(size, FEW_UNIQUE_LEVELS);
  const levels = Array.from({ length: count }, (_, i) => Math.round(((i + 1) * size) / count));
  return Array.from({ length: size }, () => levels[randomInt(rng, 0, count - 1)]);
}

function swapItems(values, i, j) {
  const held = values[i];
  values[i] = values[j];
  values[j] = held;
}
