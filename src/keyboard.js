/**
 * Keyboard shortcuts as pure functions, so they can be tested without a DOM:
 * Space plays or pauses, Right arrow applies one step, R shuffles.
 * A shortcut steps aside when the focused control needs the key itself
 * (Space on a button or a select, arrows on a slider, letters in a select).
 * @module keyboard
 */

/**
 * What kind of element has focus, as far as shortcuts care.
 * @typedef {'text'|'select'|'range'|'button'|'other'} TargetKind
 */

/**
 * App action triggered by a key.
 * @typedef {'togglePlay'|'step'|'shuffle'} KeyAction
 */

const BUTTON_INPUT_TYPES = new Set(['button', 'submit', 'reset', 'checkbox', 'radio']);

/** Focus kinds that keep each action's key for their own behavior. */
const NATIVE_USES = Object.freeze({
  togglePlay: new Set(['text', 'select', 'button']),
  step: new Set(['text', 'select', 'range']),
  shuffle: new Set(['text', 'select']),
});

/**
 * Classifies the focused element from its tag name, type and editability.
 * @param {{tagName?: string, type?: string, isContentEditable?: boolean}|null|undefined} target Focused element.
 * @returns {TargetKind}
 */
export function classifyTarget(target) {
  if (!target) return 'other';
  if (target.isContentEditable) return 'text';
  const tag = String(target.tagName ?? '').toUpperCase();
  if (tag === 'TEXTAREA') return 'text';
  if (tag === 'SELECT') return 'select';
  if (tag === 'BUTTON') return 'button';
  if (tag !== 'INPUT') return 'other';
  const type = String(target.type ?? 'text').toLowerCase();
  if (type === 'range') return 'range';
  return BUTTON_INPUT_TYPES.has(type) ? 'button' : 'text';
}

/**
 * Maps a key press to an app action.
 * Shortcuts with Ctrl, Cmd or Alt are left to the browser (Ctrl+R still reloads),
 * and held-down keys only repeat the step action.
 * @param {{key: string, repeat?: boolean, ctrlKey?: boolean, metaKey?: boolean, altKey?: boolean}} event Key event (or a plain object in tests).
 * @param {TargetKind} targetKind Kind of the focused element, from {@link classifyTarget}.
 * @returns {KeyAction|null} The action, or null when the key is not a shortcut here.
 */
export function keyAction(event, targetKind) {
  if (event.ctrlKey || event.metaKey || event.altKey) return null;
  const action = actionForKey(event.key);
  if (action === null) return null;
  if (event.repeat && action !== 'step') return null;
  return NATIVE_USES[action].has(targetKind) ? null : action;
}

/** @param {string} key KeyboardEvent.key @returns {KeyAction|null} */
function actionForKey(key) {
  if (key === ' ') return 'togglePlay';
  if (key === 'ArrowRight') return 'step';
  if (key === 'r' || key === 'R') return 'shuffle';
  return null;
}
