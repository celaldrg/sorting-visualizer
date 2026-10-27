/**
 * Seeded pseudo-random numbers (mulberry32).
 * There is no global state: every consumer receives its own generator,
 * so tests can inject a fixed seed and get the same numbers every run.
 * @module rng
 */

/**
 * A random source returning floats in [0, 1).
 * @callback Rng
 * @returns {number}
 */

/**
 * Creates a deterministic random number generator.
 * @param {number} seed Any number; it is reduced to an unsigned 32-bit integer.
 * @returns {Rng} A function returning floats in [0, 1).
 */
export function createRng(seed) {
  let state = seed >>> 0;
  return function next() {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Picks a random integer between `min` and `max`, both inclusive.
 * @param {Rng} rng Random source.
 * @param {number} min Smallest possible result (integer).
 * @param {number} max Largest possible result (integer, >= min).
 * @returns {number}
 */
export function randomInt(rng, min, max) {
  return min + Math.floor(rng() * (max - min + 1));
}
