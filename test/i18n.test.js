import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { ALGORITHMS } from '../src/algorithms.js';
import { PATTERNS } from '../src/arrays.js';
import { DEFAULT_LANGUAGE, LANGUAGES, STRINGS, otherLanguage, resolveLanguage, translate } from '../src/i18n.js';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const SRC = new URL('../src/', import.meta.url);
const sources = readdirSync(SRC)
  .filter((name) => name.endsWith('.js') && name !== 'i18n.js')
  .map((name) => readFileSync(new URL(name, SRC), 'utf8'));
const COMPLEXITY_SYMBOLS = ['n', 'k', 'd', 'b'];

const placeholders = (text) => [...text.matchAll(/\{(\w+)\}/g)].map(([, name]) => name).sort();

/** Values of every `name="..."` attribute in index.html. */
const attributeValues = (name) => [...html.matchAll(new RegExp(`\\s${name}="([^"]*)"`, 'g'))].map(([, value]) => value);

/** Keys that index.html translates through data-i18n attributes. */
const pageKeys = () => ['data-i18n', 'data-i18n-aria-label', 'data-i18n-title'].flatMap(attributeValues);

/** Keys written out as string literals in the source code, such as 'status.ready'. */
function literalKeys() {
  const prefixes = [...new Set(Object.keys(STRINGS.en).map((key) => key.split('.')[0]))];
  const literal = new RegExp(`['"\`]((?:${prefixes.join('|')})(?:\\.[A-Za-z]+)+)['"\`]`, 'g');
  return sources.flatMap((source) => [...source.matchAll(literal)].map(([, key]) => key));
}

/** Keys the view builds from ids: algorithm names and descriptions, patterns, complexity symbols. */
function builtKeys() {
  return [
    ...ALGORITHMS.flatMap(({ id }) => [`algo.${id}.name`, `algo.${id}.desc`]),
    ...PATTERNS.map((pattern) => `pattern.${pattern}`),
    ...COMPLEXITY_SYMBOLS.map((symbol) => `symbol.${symbol}`),
  ];
}

/** Text nodes of index.html, each with the tag name and attributes of its parent element. */
function textNodes() {
  const VOID = new Set(['meta', 'link', 'input', 'br', 'hr', 'img']);
  const token = /<!--[\s\S]*?-->|<![^>]*>|<(\/?)([a-zA-Z][\w-]*)([^>]*?)(\/?)>|([^<]+)/g;
  const open = [];
  const nodes = [];
  for (const [, closing, tag, attributes, selfClosing, text] of html.matchAll(token)) {
    if (text !== undefined) {
      if (text.trim() !== '') nodes.push({ text: text.trim(), parent: open.at(-1) });
    } else if (closing) {
      open.pop();
    } else if (tag && !selfClosing && !VOID.has(tag.toLowerCase())) {
      open.push({ tag: tag.toLowerCase(), attributes });
    }
  }
  return nodes;
}

test('English is the default language and every language has a frozen table', () => {
  assert.equal(DEFAULT_LANGUAGE, 'en');
  assert.equal(LANGUAGES[0], DEFAULT_LANGUAGE);
  assert.match(html, /<html lang="en">/);
  assert.deepEqual(Object.keys(STRINGS).sort(), [...LANGUAGES].sort());
  assert.ok(Object.isFrozen(STRINGS));
  for (const lang of LANGUAGES) assert.ok(Object.isFrozen(STRINGS[lang]), lang);
});

test('English and Turkish define exactly the same keys', () => {
  assert.deepEqual(Object.keys(STRINGS.tr).sort(), Object.keys(STRINGS.en).sort());
});

test('no string is empty and translations keep the same placeholders', () => {
  for (const lang of LANGUAGES) {
    for (const [key, text] of Object.entries(STRINGS[lang])) {
      assert.equal(typeof text, 'string', `${lang}: ${key}`);
      assert.notEqual(text.trim(), '', `${lang}: ${key}`);
      assert.deepEqual(placeholders(text), placeholders(STRINGS.en[key]), `${lang}: ${key}`);
    }
  }
});

test('every algorithm and pattern has a distinct name in each language, and every algorithm a description', () => {
  for (const lang of LANGUAGES) {
    const table = STRINGS[lang];
    for (const key of builtKeys()) assert.ok(Object.hasOwn(table, key), `${lang}: ${key}`);
    const algorithmNames = ALGORITHMS.map(({ id }) => table[`algo.${id}.name`]);
    const patternNames = PATTERNS.map((pattern) => table[`pattern.${pattern}`]);
    assert.equal(new Set(algorithmNames).size, ALGORITHMS.length, lang);
    assert.equal(new Set(patternNames).size, PATTERNS.length, lang);
  }
});

test('every key used by index.html or the code exists in both languages', () => {
  const used = [...pageKeys(), ...literalKeys(), ...builtKeys()];
  assert.ok(pageKeys().length > 30 && literalKeys().length > 10, 'the key scan found the keys');
  for (const key of used) {
    for (const lang of LANGUAGES) assert.ok(Object.hasOwn(STRINGS[lang], key), `${lang}: ${key}`);
  }
});

test('every string in the tables is used by the page or the code', () => {
  const used = new Set([...pageKeys(), ...literalKeys(), ...builtKeys()]);
  assert.deepEqual(
    Object.keys(STRINGS.en).filter((key) => !used.has(key)),
    [],
  );
});

test('static texts in index.html are English strings, values filled in by the view, or symbols', () => {
  const FILLED_BY_VIEW = /\sid="(?:algo-title|status|play-label|size-value|stat-[a-z]+)"/;
  const NEUTRAL = new Set(['→', 'R', '·', '/', 'MIT ·']);
  const nodes = textNodes();
  assert.ok(nodes.length > 30, 'the page scan found the texts');
  for (const { text, parent } of nodes) {
    const key = /\sdata-i18n="([^"]+)"/.exec(parent.attributes)?.[1];
    if (key) {
      assert.equal(text, STRINGS.en[key], `text of ${key}`);
    } else {
      const allowed = parent.tag === 'title' || FILLED_BY_VIEW.test(parent.attributes) || NEUTRAL.has(text);
      assert.ok(allowed, `untranslated text "${text}"`);
    }
  }
});

test('aria-labels and titles in index.html are translated, except the chart label that the view sets', () => {
  for (const [tag] of html.matchAll(/<[a-z][^>]*>/g)) {
    if (tag.includes('id="chart"')) continue;
    for (const [, name, value] of tag.matchAll(/\s(aria-label|title)="([^"]*)"/g)) {
      const key = new RegExp(`\\sdata-i18n-${name}="([^"]+)"`).exec(tag)?.[1];
      assert.ok(key, `untranslated ${name} "${value}"`);
      assert.equal(value, STRINGS.en[key], `${name} of ${key}`);
    }
  }
});

test('translate fills placeholders and falls back to English, then to the key', () => {
  assert.equal(translate('en', 'step.compare', { i: 3, j: 9, a: 17, b: 4 }), 'Compare a[3] = 17 with a[9] = 4');
  assert.equal(translate('tr', 'step.done', { steps: '1.234' }), '1.234 adımda sıralandı');
  assert.equal(translate('de', 'controls.play'), 'Play');
  assert.equal(translate('tr', 'no.such.key'), 'no.such.key');
  assert.equal(translate('en', 'toString'), 'toString');
});

test('placeholders without a value stay visible and values are inserted literally', () => {
  assert.equal(translate('en', 'settings.sizeValue'), '{size} bars');
  assert.equal(translate('en', 'settings.sizeValue', { size: '$&' }), '$& bars');
});

test('saved language codes are checked before use', () => {
  assert.equal(resolveLanguage('en'), 'en');
  assert.equal(resolveLanguage('tr'), 'tr');
  for (const value of [null, undefined, '', 'de', 'tr ', 42]) assert.equal(resolveLanguage(value), DEFAULT_LANGUAGE);
});

test('the language button names and switches to the other language', () => {
  assert.equal(otherLanguage('en'), 'tr');
  assert.equal(otherLanguage('tr'), 'en');
  assert.equal(otherLanguage('xx'), 'tr');
  assert.equal(STRINGS.en['lang.next'], 'TR');
  assert.equal(STRINGS.tr['lang.next'], 'EN');
});
