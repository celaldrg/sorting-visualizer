import { test } from 'node:test';
import assert from 'node:assert/strict';
import { classifyTarget, keyAction } from '../src/keyboard.js';

const press = (key, extra = {}) => ({ key, ...extra });

test('classifyTarget sorts focused elements by how they use keys', () => {
  const cases = [
    [null, 'other'],
    [undefined, 'other'],
    [{ tagName: 'BODY' }, 'other'],
    [{ tagName: 'CANVAS' }, 'other'],
    [{ tagName: 'DIV', isContentEditable: true }, 'text'],
    [{ tagName: 'TEXTAREA' }, 'text'],
    [{ tagName: 'INPUT' }, 'text'],
    [{ tagName: 'INPUT', type: 'search' }, 'text'],
    [{ tagName: 'INPUT', type: 'range' }, 'range'],
    [{ tagName: 'input', type: 'RANGE' }, 'range'],
    [{ tagName: 'INPUT', type: 'checkbox' }, 'button'],
    [{ tagName: 'INPUT', type: 'submit' }, 'button'],
    [{ tagName: 'SELECT' }, 'select'],
    [{ tagName: 'BUTTON' }, 'button'],
  ];
  for (const [target, kind] of cases) assert.equal(classifyTarget(target), kind, JSON.stringify(target));
});

test('Space plays or pauses, Right arrow steps and R shuffles', () => {
  assert.equal(keyAction(press(' '), 'other'), 'togglePlay');
  assert.equal(keyAction(press('ArrowRight'), 'other'), 'step');
  assert.equal(keyAction(press('r'), 'other'), 'shuffle');
  assert.equal(keyAction(press('R'), 'other'), 'shuffle');
});

test('other keys are not shortcuts', () => {
  for (const key of ['Enter', 'Escape', 'Tab', 'ArrowLeft', 'ArrowUp', 's', '1']) {
    assert.equal(keyAction(press(key), 'other'), null, key);
  }
});

test('shortcuts with Ctrl, Cmd or Alt are left to the browser', () => {
  for (const modifier of ['ctrlKey', 'metaKey', 'altKey']) {
    for (const key of [' ', 'ArrowRight', 'r']) {
      assert.equal(keyAction(press(key, { [modifier]: true }), 'other'), null, `${modifier} ${JSON.stringify(key)}`);
    }
  }
});

test('holding a key down repeats only the step', () => {
  assert.equal(keyAction(press('ArrowRight', { repeat: true }), 'other'), 'step');
  assert.equal(keyAction(press(' ', { repeat: true }), 'other'), null);
  assert.equal(keyAction(press('r', { repeat: true }), 'other'), null);
});

test('a shortcut steps aside when the focused control needs the key itself', () => {
  const expected = {
    text: { ' ': null, ArrowRight: null, r: null },
    select: { ' ': null, ArrowRight: null, r: null },
    range: { ' ': 'togglePlay', ArrowRight: null, r: 'shuffle' },
    button: { ' ': null, ArrowRight: 'step', r: 'shuffle' },
    other: { ' ': 'togglePlay', ArrowRight: 'step', r: 'shuffle' },
  };
  for (const [kind, keys] of Object.entries(expected)) {
    for (const [key, action] of Object.entries(keys)) {
      assert.equal(keyAction(press(key), kind), action, `${JSON.stringify(key)} on ${kind}`);
    }
  }
});
