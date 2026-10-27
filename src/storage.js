/**
 * Tiny localStorage wrapper. Storage can be missing or throw (private mode,
 * blocked site data, sandboxed frames), so every read and write is wrapped in
 * try/catch: the app then simply forgets preferences instead of crashing.
 * Nothing is touched at import time.
 * @module storage
 */

/** Keeps this app's keys apart from other pages on the same origin. */
const PREFIX = 'sorting-visualizer:';

/**
 * The part of the Web Storage API used here.
 * @typedef {object} StringStore
 * @property {(key: string) => (string|null)} getItem
 * @property {(key: string, value: string) => void} setItem
 */

/** Returns the page's localStorage; reading the property itself may throw. */
function browserStore() {
  return globalThis.localStorage;
}

/**
 * Reads a saved string.
 * @param {string} key Key without the app prefix.
 * @param {string|null} [fallback=null] Returned when nothing usable is stored.
 * @param {() => (StringStore|undefined)} [getStore] Store provider; tests inject one.
 * @returns {string|null} The stored string, or `fallback`.
 */
export function loadValue(key, fallback = null, getStore = browserStore) {
  try {
    const value = getStore()?.getItem(PREFIX + key);
    return typeof value === 'string' ? value : fallback;
  } catch {
    return fallback;
  }
}

/**
 * Saves a string; failures are swallowed.
 * @param {string} key Key without the app prefix.
 * @param {string} value Value to store.
 * @param {() => (StringStore|undefined)} [getStore] Store provider; tests inject one.
 * @returns {boolean} True when the value was stored.
 */
export function saveValue(key, value, getStore = browserStore) {
  try {
    const store = getStore();
    if (!store) return false;
    store.setItem(PREFIX + key, String(value));
    return true;
  } catch {
    return false;
  }
}
