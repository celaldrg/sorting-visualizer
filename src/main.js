/**
 * Entry point. Creates the visualizer (or the deterministic `?demo` scene),
 * wires the buttons, selects, sliders, keyboard shortcuts, chart taps and
 * sound, and runs the frame loop that advances playback and redraws.
 * @module main
 */

import { createTonePlayer } from './audio.js';
import { createChart } from './chart.js';
import { otherLanguage, resolveLanguage } from './i18n.js';
import { classifyTarget, keyAction } from './keyboard.js';
import { loadValue, saveValue } from './storage.js';
import { createView } from './view.js';
import { createDemoVisualizer, createVisualizer } from './visualizer.js';

const LANGUAGE_KEY = 'language';
const SOUND_KEY = 'sound';
/** A press that travels further than this many CSS pixels is not a tap. */
const TAP_SLOP = 12;

const isDemo = new URLSearchParams(window.location.search).has('demo');
const visualizer = isDemo ? createDemoVisualizer() : createVisualizer({ seed: freshSeed() });
const canvas = document.getElementById('chart');
const chart = createChart(canvas);
const view = createView(document);
const tones = createTonePlayer();

let language = resolveLanguage(loadValue(LANGUAGE_KEY));
let soundOn = loadValue(SOUND_KEY) === 'on';
let dirty = true;
let lastFrameTime = null;
/** True while the latest input came from a mouse, pen or finger rather than the keyboard. */
let pointerInput = false;

/** User actions shared by the buttons, the keyboard and chart taps. */
const actions = {
  togglePlay() {
    tones.unlock();
    visualizer.togglePlay();
  },
  step() {
    tones.unlock();
    const step = visualizer.step();
    if (step) playTone([step], visualizer.getState(), performance.now());
  },
  shuffle() {
    visualizer.shuffle();
  },
  reset() {
    visualizer.reset();
  },
};

/** A new random seed per visit, so every visit starts with a different array. */
function freshSeed() {
  return crypto.getRandomValues(new Uint32Array(1))[0];
}

function run(action) {
  actions[action]();
  dirty = true;
}

/** Sounds the newest comparison or write among `steps`. */
function playTone(steps, state, now) {
  const step = steps.findLast(({ type }) => type === 'compare' || type === 'overwrite');
  if (!step) return;
  const value = step.type === 'overwrite' ? step.value : state.array[step.indices[1]];
  tones.play(value, state.size, now);
}

function setLanguage(next) {
  language = next;
  saveValue(LANGUAGE_KEY, next);
  view.setLanguage(next);
  dirty = true;
}

function toggleSound() {
  soundOn = !soundOn;
  tones.setEnabled(soundOn);
  tones.unlock();
  saveValue(SOUND_KEY, soundOn ? 'on' : 'off');
  view.setSound(soundOn);
}

/**
 * After a mouse or touch interaction, takes focus off the control so the
 * shortcuts (Space, Right arrow, R) keep working. Keyboard users keep focus.
 */
function releasePointerFocus(event) {
  if (pointerInput) event.currentTarget.blur();
}

function trackInputModality() {
  document.addEventListener(
    'pointerdown',
    () => {
      pointerInput = true;
    },
    true,
  );
  document.addEventListener(
    'keydown',
    () => {
      pointerInput = false;
    },
    true,
  );
}

function onClick(id, handler) {
  document.getElementById(id).addEventListener('click', (event) => {
    handler();
    releasePointerFocus(event);
  });
}

function bindButtons() {
  onClick('play', () => run('togglePlay'));
  onClick('step', () => run('step'));
  onClick('shuffle', () => run('shuffle'));
  onClick('reset', () => run('reset'));
  onClick('lang', () => setLanguage(otherLanguage(language)));
  onClick('sound', toggleSound);
}

/** Selects apply on change; sliders apply live while they are dragged. */
function bindSettings() {
  const settings = [
    ['algorithm', 'change'],
    ['pattern', 'change'],
    ['size', 'input'],
    ['speed', 'input'],
  ];
  for (const [name, applyOn] of settings) {
    const control = document.getElementById(name);
    control.addEventListener(applyOn, () => {
      visualizer.configure({ [name]: control.value });
      dirty = true;
    });
    control.addEventListener('change', releasePointerFocus);
  }
}

function bindKeyboard() {
  document.addEventListener('keydown', (event) => {
    const action = keyAction(event, classifyTarget(event.target));
    if (action === null) return;
    event.preventDefault();
    run(action);
  });
}

/** A tap (press and release without dragging) on the chart plays or pauses. */
function bindChartTap() {
  let press = null;
  canvas.addEventListener('pointerdown', (event) => {
    press = event.isPrimary && event.button === 0 ? { id: event.pointerId, x: event.clientX, y: event.clientY } : null;
  });
  canvas.addEventListener('pointerup', (event) => {
    const tapped =
      press !== null &&
      press.id === event.pointerId &&
      Math.hypot(event.clientX - press.x, event.clientY - press.y) <= TAP_SLOP;
    press = null;
    if (tapped) run('togglePlay');
  });
  canvas.addEventListener('pointercancel', () => {
    press = null;
  });
}

/** Advances playback by the elapsed time and redraws when anything changed. */
function frame(now) {
  const applied = visualizer.update(lastFrameTime === null ? 0 : now - lastFrameTime);
  lastFrameTime = now;
  if (applied.length > 0 || dirty) {
    const state = visualizer.getState();
    if (applied.length > 0) playTone(applied, state, now);
    view.render(state);
    chart.draw(state);
    dirty = false;
  }
  requestAnimationFrame(frame);
}

view.setLanguage(language);
view.setSound(soundOn);
tones.setEnabled(soundOn);
trackInputModality();
bindButtons();
bindSettings();
bindKeyboard();
bindChartTap();
requestAnimationFrame(frame);
