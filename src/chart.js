/**
 * Canvas bar chart. The canvas fills its container; its backing store follows
 * the container size and devicePixelRatio, so bars stay sharp on any screen.
 * Colors come from CSS custom properties (--bar, --compare, ... and their
 * "-top" variants), so the legend and the chart always match.
 * @module chart
 */

import { barRoles, barSpans } from './bars.js';

/** Paint order: highlighted bars last, so their glow lies on top. */
const ROLES = Object.freeze(['bar', 'sorted', 'write', 'swap', 'compare']);
const HIGHLIGHTED = new Set(['compare', 'swap', 'write']);

/** Space around the plot in CSS pixels; the bottom strip holds the step markers. */
const PADDING = Object.freeze({ top: 14, right: 10, bottom: 16, left: 10 });
const GRID_COLOR = 'rgba(148, 163, 184, 0.10)';
const BASELINE_COLOR = 'rgba(148, 163, 184, 0.28)';
const FALLBACK_COLOR = '#94a3b8';
const GLOW_BLUR = 16;
const MAX_RADIUS = 4;

/**
 * @typedef {object} Chart
 * @property {(state: import('./visualizer.js').VisualizerState) => void} draw Paints a visualizer state.
 */

/**
 * Creates a chart on a canvas that fills a sized container.
 * @param {HTMLCanvasElement} canvas Target canvas.
 * @returns {Chart}
 */
export function createChart(canvas) {
  const context = canvas.getContext('2d');
  const palette = readPalette(canvas);
  const box = { width: 0, height: 0, ratio: 1 };
  let current = null;

  function fit() {
    const rect = canvas.getBoundingClientRect();
    box.width = rect.width;
    box.height = rect.height;
    box.ratio = window.devicePixelRatio || 1;
    const width = Math.max(1, Math.round(rect.width * box.ratio));
    const height = Math.max(1, Math.round(rect.height * box.ratio));
    if (canvas.width !== width) canvas.width = width;
    if (canvas.height !== height) canvas.height = height;
  }

  function draw(state) {
    current = state;
    if ((window.devicePixelRatio || 1) !== box.ratio) fit();
    paint(context, box, palette, state);
  }

  new ResizeObserver(() => {
    fit();
    if (current) paint(context, box, palette, current);
  }).observe(canvas);
  fit();
  return { draw };
}

/** Reads the bar colors from the CSS custom properties. */
function readPalette(element) {
  const style = getComputedStyle(element);
  const read = (name) => style.getPropertyValue(name).trim() || FALLBACK_COLOR;
  return Object.fromEntries(ROLES.map((role) => [role, { base: read(`--${role}`), top: read(`--${role}-top`) }]));
}

/** Paints the grid, the bars and the markers under the bars of the last step. */
function paint(ctx, box, palette, state) {
  const { width, height, ratio } = box;
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  ctx.clearRect(0, 0, width, height);
  const left = Math.round(PADDING.left * ratio) / ratio;
  const plot = {
    left,
    top: PADDING.top,
    width: width - left - PADDING.right,
    bottom: height - PADDING.bottom,
  };
  if (plot.width <= 0 || plot.bottom <= plot.top) return;
  drawGrid(ctx, plot);
  const count = state.array.length;
  const bars = {
    spans: barSpans(count, plot.width, ratio),
    roles: barRoles(count, state.sorted, state.highlight),
    values: state.array,
    unit: (plot.bottom - plot.top) / Math.max(1, state.size),
    minHeight: 1 / ratio,
  };
  for (const role of ROLES) drawRole(ctx, plot, bars, role, palette[role]);
  drawMarkers(ctx, plot, bars, palette);
}

/** Dashed guide lines at quarter heights and a solid baseline. */
function drawGrid(ctx, plot) {
  const right = plot.left + plot.width;
  ctx.lineWidth = 1;
  ctx.setLineDash([3, 5]);
  ctx.strokeStyle = GRID_COLOR;
  ctx.beginPath();
  for (let quarter = 1; quarter <= 3; quarter++) {
    const y = Math.round(plot.top + ((plot.bottom - plot.top) * quarter) / 4) + 0.5;
    ctx.moveTo(plot.left, y);
    ctx.lineTo(right, y);
  }
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.strokeStyle = BASELINE_COLOR;
  ctx.beginPath();
  ctx.moveTo(plot.left, plot.bottom + 0.5);
  ctx.lineTo(right, plot.bottom + 0.5);
  ctx.stroke();
}

/** Fills every bar of one role in a single path with a vertical gradient. */
function drawRole(ctx, plot, bars, role, colors) {
  ctx.beginPath();
  let drawn = 0;
  for (let i = 0; i < bars.roles.length; i++) {
    if (bars.roles[i] !== role) continue;
    const barHeight = Math.max(bars.minHeight, bars.values[i] * bars.unit);
    const { x, width } = bars.spans[i];
    addBar(ctx, plot.left + x, plot.bottom - barHeight, width, barHeight);
    drawn++;
  }
  if (drawn === 0) return;
  const gradient = ctx.createLinearGradient(0, plot.top, 0, plot.bottom);
  gradient.addColorStop(0, colors.top);
  gradient.addColorStop(1, colors.base);
  ctx.fillStyle = gradient;
  if (HIGHLIGHTED.has(role)) {
    ctx.shadowColor = colors.base;
    ctx.shadowBlur = GLOW_BLUR;
  }
  ctx.fill();
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
}

/** Adds one bar to the current path, with rounded top corners when it is wide enough. */
function addBar(ctx, x, y, width, height) {
  const radius = width >= 4 ? Math.min(MAX_RADIUS, width / 3) : 0;
  if (radius > 0 && typeof ctx.roundRect === 'function') {
    ctx.roundRect(x, y, width, height, [radius, radius, 0, 0]);
  } else {
    ctx.rect(x, y, width, height);
  }
}

/** Small triangles under the bars of the last step, visible even for hairline bars. */
function drawMarkers(ctx, plot, bars, palette) {
  for (let i = 0; i < bars.roles.length; i++) {
    const role = bars.roles[i];
    if (!HIGHLIGHTED.has(role)) continue;
    const { x, width } = bars.spans[i];
    const center = plot.left + x + width / 2;
    const half = Math.min(6, Math.max(3.5, width / 2));
    const top = plot.bottom + 4;
    ctx.beginPath();
    ctx.moveTo(center, top);
    ctx.lineTo(center + half, top + half * 1.4);
    ctx.lineTo(center - half, top + half * 1.4);
    ctx.closePath();
    ctx.fillStyle = palette[role].base;
    ctx.fill();
  }
}
