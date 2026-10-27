import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createTonePlayer, toneFrequency } from '../src/audio.js';

const close = (actual, expected) => Math.abs(actual - expected) < 1e-9;
const MIDDLE_HZ = 200 * Math.sqrt(900 / 200);

/** Installs a minimal Web Audio stand-in that records what the player does. */
function installFakeAudio(t) {
  const log = { contexts: 0, resumes: 0, tones: [] };
  const param = () => ({ value: 0, setValueAtTime() {}, exponentialRampToValueAtTime() {} });
  const node = (extra) => ({ connect: (target) => target, ...extra });
  globalThis.AudioContext = class {
    constructor() {
      log.contexts++;
      this.state = 'suspended';
      this.currentTime = 0;
      this.destination = node();
    }

    resume() {
      log.resumes++;
      this.state = 'running';
      return Promise.resolve();
    }

    createGain() {
      return node({ gain: param() });
    }

    createOscillator() {
      const oscillator = node({
        frequency: param(),
        start: () => log.tones.push(oscillator.frequency.value),
        stop() {},
      });
      return oscillator;
    }
  };
  t.after(() => {
    delete globalThis.AudioContext;
  });
  return log;
}

test('toneFrequency runs from 200 Hz for the lowest bar to 900 Hz for the tallest', () => {
  assert.ok(close(toneFrequency(1, 50), 200));
  assert.ok(close(toneFrequency(50, 50), 900));
});

test('taller bars always sound higher', () => {
  for (let value = 2; value <= 300; value++) assert.ok(toneFrequency(value, 300) > toneFrequency(value - 1, 300), value);
});

test('out-of-range and unusable values stay inside the 200-900 Hz band', () => {
  assert.ok(close(toneFrequency(-5, 50), 200));
  assert.ok(close(toneFrequency(80, 50), 900));
  for (const [value, max] of [[1, 1], [3, 0], [NaN, 50], [Infinity, Infinity]]) {
    assert.ok(close(toneFrequency(value, max), MIDDLE_HZ), `${value} of ${max}`);
  }
});

test('without Web Audio the player does nothing and never throws', () => {
  assert.equal(typeof globalThis.AudioContext, 'undefined');
  const tones = createTonePlayer();
  tones.setEnabled(true);
  tones.unlock();
  tones.play(10, 50, 1000);
});

test('a disabled player creates no audio context and stays silent', (t) => {
  const log = installFakeAudio(t);
  const tones = createTonePlayer();
  tones.unlock();
  tones.play(10, 50, 1000);
  assert.deepEqual(log, { contexts: 0, resumes: 0, tones: [] });
});

test('an enabled player reuses one context and plays at most one tone per 30 ms', (t) => {
  const log = installFakeAudio(t);
  const tones = createTonePlayer();
  tones.setEnabled(true);
  tones.unlock();
  tones.unlock();
  assert.equal(log.contexts, 1);
  assert.equal(log.resumes, 1);
  tones.play(1, 50, 1000);
  tones.play(50, 50, 1010);
  tones.play(50, 50, 1030);
  assert.deepEqual(log.tones, [toneFrequency(1, 50), toneFrequency(50, 50)]);
  tones.setEnabled(false);
  tones.play(25, 50, 2000);
  assert.equal(log.tones.length, 2);
});
