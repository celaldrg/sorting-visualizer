import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadValue, saveValue } from '../src/storage.js';

/** In-memory stand-in for localStorage. */
function memoryStore() {
  const data = new Map();
  return {
    data,
    getItem: (key) => (data.has(key) ? data.get(key) : null),
    setItem: (key, value) => {
      data.set(key, value);
    },
  };
}

const blocked = () => {
  throw new Error('SecurityError: access to storage is denied');
};

test('saved values are read back under an app-specific key', () => {
  const store = memoryStore();
  assert.equal(saveValue('language', 'tr', () => store), true);
  assert.deepEqual([...store.data], [['sorting-visualizer:language', 'tr']]);
  assert.equal(loadValue('language', null, () => store), 'tr');
});

test('values are stored as strings', () => {
  const store = memoryStore();
  saveValue('sound', true, () => store);
  assert.equal(loadValue('sound', null, () => store), 'true');
});

test('a missing key gives the fallback, null by default', () => {
  const store = memoryStore();
  assert.equal(loadValue('language', 'en', () => store), 'en');
  assert.equal(loadValue('language', undefined, () => store), null);
});

test('non-string values in the store count as missing', () => {
  const store = { getItem: () => 42, setItem() {} };
  assert.equal(loadValue('language', 'en', () => store), 'en');
});

test('a store whose calls throw is ignored', () => {
  const store = { getItem: blocked, setItem: blocked };
  assert.equal(loadValue('language', 'en', () => store), 'en');
  assert.equal(saveValue('language', 'tr', () => store), false);
});

test('blocked, missing or incomplete storage is ignored', () => {
  for (const provider of [blocked, () => undefined, () => null, () => ({})]) {
    assert.equal(loadValue('language', 'en', provider), 'en');
    assert.equal(saveValue('language', 'tr', provider), false);
  }
});
