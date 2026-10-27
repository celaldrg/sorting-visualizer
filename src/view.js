/**
 * DOM rendering. Translates the static labels, fills the selects and keeps
 * the counters, status, step narration, controls and algorithm info in sync
 * with the visualizer state. Every visible string goes through i18n.
 * DOM writes only happen when a value actually changes.
 * @module view
 */

import { ALGORITHMS, getAlgorithm } from './algorithms.js';
import { PATTERNS } from './arrays.js';
import { complexitySymbols, describeStep, prettyComplexity, statusKey } from './describe.js';
import { DEFAULT_LANGUAGE, translate } from './i18n.js';
import { SIZE_RANGE, SPEED_RANGE } from './visualizer.js';

const LOCALES = Object.freeze({ en: 'en-US', tr: 'tr-TR' });
const COMPLEXITY_FIELDS = Object.freeze(['best', 'average', 'worst', 'space']);
const STAT_FIELDS = Object.freeze(['comparisons', 'swaps', 'writes', 'steps']);
const PLAY_LABELS = Object.freeze({ play: 'controls.play', pause: 'controls.pause', replay: 'controls.replay' });

/**
 * @typedef {object} View
 * @property {(lang: string) => void} setLanguage Switches every visible string to `lang`.
 * @property {(on: boolean) => void} setSound Shows the sound button as on or off.
 * @property {(state: import('./visualizer.js').VisualizerState) => void} render Updates the page from a state.
 */

/**
 * Binds the page's elements by id.
 * @param {Document} doc The page.
 * @returns {View}
 */
export function createView(doc) {
  const byId = (id) => doc.getElementById(id);
  const refs = {
    title: byId('algo-title'),
    status: byId('status'),
    stepText: byId('step-text'),
    chart: byId('chart'),
    progress: byId('progress'),
    progressFill: byId('progress-fill'),
    play: byId('play'),
    playLabel: byId('play-label'),
    sound: byId('sound'),
    algorithm: byId('algorithm'),
    pattern: byId('pattern'),
    size: byId('size'),
    sizeValue: byId('size-value'),
    speed: byId('speed'),
    speedValue: byId('speed-value'),
    total: byId('stat-total'),
    stats: Object.fromEntries(STAT_FIELDS.map((field) => [field, byId(`stat-${field}`)])),
    complexity: Object.fromEntries(COMPLEXITY_FIELDS.map((field) => [field, byId(`cx-${field}`)])),
    infoText: byId('info-text'),
    infoStable: byId('info-stable'),
    infoSymbols: byId('info-symbols'),
  };
  let lang = DEFAULT_LANGUAGE;
  let numbers = numberFormats(lang);
  let shownInfo = '';
  const t = (key, params) => translate(lang, key, params);

  setRange(refs.size, SIZE_RANGE);
  setRange(refs.speed, SPEED_RANGE);

  function setLanguage(next) {
    lang = next;
    numbers = numberFormats(next);
    doc.documentElement.lang = next;
    doc.title = t('app.title');
    for (const node of doc.querySelectorAll('[data-i18n]')) setText(node, t(node.dataset.i18n));
    for (const node of doc.querySelectorAll('[data-i18n-aria-label]')) {
      setAttr(node, 'aria-label', t(node.dataset.i18nAriaLabel));
    }
    for (const node of doc.querySelectorAll('[data-i18n-title]')) setAttr(node, 'title', t(node.dataset.i18nTitle));
    fillOptions(doc, refs.algorithm, ALGORITHMS.map(({ id }) => [id, t(`algo.${id}.name`)]));
    fillOptions(doc, refs.pattern, PATTERNS.map((pattern) => [pattern, t(`pattern.${pattern}`)]));
  }

  function setSound(on) {
    setAttr(refs.sound, 'aria-pressed', String(on));
    showIcon(refs.sound, on ? 'sound-on' : 'sound-off');
  }

  function render(state) {
    setText(refs.title, t(`algo.${state.algorithm}.name`));
    renderStatus(state);
    renderStats(state);
    renderProgress(state);
    renderPlayButton(state);
    renderSettings(state);
    renderInfo(state.algorithm);
    const { key, params } = describeStep(state);
    setText(refs.stepText, t(key, formatParams(params)));
  }

  function renderStatus(state) {
    const key = statusKey(state);
    setText(refs.status, t(key));
    setAttr(refs.status, 'data-state', key.slice('status.'.length));
  }

  function renderStats(state) {
    for (const field of STAT_FIELDS) setText(refs.stats[field], numbers.integer.format(state.stats[field]));
    setText(refs.total, numbers.integer.format(state.totalSteps));
  }

  function renderProgress(state) {
    const fraction = state.totalSteps > 0 ? state.stats.steps / state.totalSteps : 0;
    setStyle(refs.progressFill, 'transform', `scaleX(${Math.round(fraction * 1000) / 1000})`);
    setAttr(refs.progress, 'aria-valuenow', String(Math.round(fraction * 100)));
  }

  function renderPlayButton(state) {
    let mode = 'play';
    if (state.playing) mode = 'pause';
    else if (state.done) mode = 'replay';
    showIcon(refs.play, mode);
    setText(refs.playLabel, t(PLAY_LABELS[mode]));
  }

  function renderSettings(state) {
    setValue(refs.algorithm, state.algorithm);
    setValue(refs.pattern, state.pattern);
    setValue(refs.size, String(state.size));
    setValue(refs.speed, String(state.speed));
    const size = numbers.integer.format(state.size);
    const rate = (state.stepsPerSecond < 10 ? numbers.decimal : numbers.integer).format(state.stepsPerSecond);
    setText(refs.sizeValue, size);
    setText(refs.speedValue, t('settings.speedValue', { rate }));
    setAttr(refs.size, 'aria-valuetext', t('settings.sizeValue', { size }));
    setAttr(refs.speed, 'aria-valuetext', t('settings.speedValueLong', { rate }));
    setStyle(refs.size, '--fill', fillPercent(state.size, SIZE_RANGE));
    setStyle(refs.speed, '--fill', fillPercent(state.speed, SPEED_RANGE));
    setAttr(refs.chart, 'aria-label', t('chart.label', { count: size }));
  }

  function renderInfo(id) {
    if (shownInfo === `${lang}:${id}`) return;
    shownInfo = `${lang}:${id}`;
    const { complexity, stable } = getAlgorithm(id);
    setText(refs.infoText, t(`algo.${id}.desc`));
    for (const field of COMPLEXITY_FIELDS) setText(refs.complexity[field], prettyComplexity(complexity[field]));
    setAttr(refs.infoStable, 'data-stable', String(stable));
    setText(refs.infoStable, t(stable ? 'info.stableYes' : 'info.stableNo'));
    setText(refs.infoSymbols, complexitySymbols(complexity).map((symbol) => t(`symbol.${symbol}`)).join(' · '));
  }

  /** Formats the numbers in a step narration for the current language. */
  function formatParams(params) {
    return Object.fromEntries(Object.entries(params).map(([name, value]) => [name, numbers.integer.format(value)]));
  }

  return { setLanguage, setSound, render };
}

/** Number formats for a language: whole numbers and one-decimal rates. */
function numberFormats(lang) {
  const locale = LOCALES[lang] ?? LOCALES.en;
  return {
    integer: new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }),
    decimal: new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }),
  };
}

/** Creates or relabels the options of a select, keeping the current choice. */
function fillOptions(doc, select, entries) {
  entries.forEach(([value, label], index) => {
    const option = select.options[index] ?? select.appendChild(doc.createElement('option'));
    option.value = value;
    setText(option, label);
  });
}

/** Shows the one icon inside `button` whose data-icon matches `name`. */
function showIcon(button, name) {
  for (const icon of button.querySelectorAll('[data-icon]')) {
    const hidden = icon.dataset.icon !== name;
    if (icon.hasAttribute('hidden') !== hidden) icon.toggleAttribute('hidden', hidden);
  }
}

function setRange(input, range) {
  input.min = String(range.min);
  input.max = String(range.max);
}

/** Position of `value` in `range` as a CSS percentage, for the slider fill. */
function fillPercent(value, range) {
  return `${(((value - range.min) / (range.max - range.min)) * 100).toFixed(1)}%`;
}

function setText(node, text) {
  if (node.textContent !== text) node.textContent = text;
}

function setAttr(node, name, value) {
  if (node.getAttribute(name) !== value) node.setAttribute(name, value);
}

function setValue(control, value) {
  if (control.value !== value) control.value = value;
}

function setStyle(node, property, value) {
  if (node.style.getPropertyValue(property) !== value) node.style.setProperty(property, value);
}
