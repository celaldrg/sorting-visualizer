/**
 * Pure helpers for the bar chart: where each bar goes horizontally and which
 * color role it gets. The canvas code in chart.js only paints the result.
 * @module bars
 */

/**
 * Color role of a bar.
 * @typedef {'bar'|'sorted'|'compare'|'swap'|'write'} BarRole
 */

/** Role of the bars touched by the last step, by step type. */
const STEP_ROLES = Object.freeze({ compare: 'compare', swap: 'swap', overwrite: 'write', sorted: 'sorted' });

/**
 * Horizontal span of one bar, in CSS pixels from the left edge of the plot.
 * @typedef {object} BarSpan
 * @property {number} x Left edge.
 * @property {number} width Bar width (the gap to the next bar is not included).
 */

/**
 * Lays out `count` bars across `width` CSS pixels. Bar edges fall on whole
 * device pixels so bars stay crisp, and a gap is kept between bars while they
 * are wide enough to afford one.
 * @param {number} count Number of bars.
 * @param {number} width Plot width in CSS pixels.
 * @param {number} [pixelRatio=1] Device pixels per CSS pixel (devicePixelRatio).
 * @returns {BarSpan[]} One span per bar, left to right.
 */
export function barSpans(count, width, pixelRatio = 1) {
  if (!(count > 0) || !(width > 0) || !(pixelRatio > 0)) return [];
  const slot = Math.round(width * pixelRatio) / count;
  const gap = gapFor(slot, pixelRatio);
  return Array.from({ length: count }, (_, i) => {
    const left = Math.round(i * slot);
    const right = Math.round((i + 1) * slot) - gap;
    return { x: left / pixelRatio, width: Math.max(right - left, 1) / pixelRatio };
  });
}

/** Gap between bars in device pixels: none for hairline bars, about a fifth of the slot otherwise. */
function gapFor(slot, pixelRatio) {
  if (slot < 3) return 0;
  if (slot < 8) return 1;
  return Math.min(Math.round(slot * 0.2), Math.round(4 * pixelRatio));
}

/**
 * Color role of every bar. The bars touched by the last step win over
 * bars that are already sorted, so the current action is always visible.
 * @param {number} count Number of bars.
 * @param {boolean[]} sorted True for bars known to be in their final place.
 * @param {{type: string, indices: number[]}|null} highlight Last applied step, if any.
 * @returns {BarRole[]}
 */
export function barRoles(count, sorted, highlight) {
  const roles = Array.from({ length: count }, (_, i) => (sorted[i] ? 'sorted' : 'bar'));
  const role = highlight && Object.hasOwn(STEP_ROLES, highlight.type) ? STEP_ROLES[highlight.type] : null;
  if (role === null) return roles;
  for (const i of highlight.indices) {
    if (Number.isInteger(i) && i >= 0 && i < count) roles[i] = role;
  }
  return roles;
}
