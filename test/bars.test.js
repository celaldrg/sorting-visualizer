import { test } from 'node:test';
import assert from 'node:assert/strict';
import { barRoles, barSpans } from '../src/bars.js';

const EPSILON = 1e-9;
const onDevicePixel = (cssPx, ratio) => Math.abs(cssPx * ratio - Math.round(cssPx * ratio)) < 1e-6;
const deviceSlot = (count, width, ratio) => Math.round(width * ratio) / count;

/** Bar counts, plot widths and pixel ratios with at least one device pixel per bar. */
const LAYOUTS = [1, 5, 7, 60, 199, 300]
  .flatMap((count) => [120, 293.5, 640, 1013.3].flatMap((width) => [1, 1.25, 1.5, 2, 3].map((ratio) => [count, width, ratio])))
  .filter(([count, width, ratio]) => deviceSlot(count, width, ratio) >= 1);

test('barSpans returns no bars for unusable input', () => {
  const cases = [
    [0, 100, 1],
    [-3, 100, 1],
    [NaN, 100, 1],
    [10, 0, 1],
    [10, -50, 1],
    [10, NaN, 1],
    [10, 100, 0],
    [10, 100, NaN],
  ];
  for (const [count, width, ratio] of cases) assert.deepEqual(barSpans(count, width, ratio), [], `${count} ${width} ${ratio}`);
});

test('wide bars keep a gap of at most four CSS pixels', () => {
  assert.deepEqual(barSpans(4, 100), [
    { x: 0, width: 21 },
    { x: 25, width: 21 },
    { x: 50, width: 21 },
    { x: 75, width: 21 },
  ]);
});

test('bar edges are snapped to device pixels', () => {
  assert.deepEqual(barSpans(3, 10, 2), [
    { x: 0, width: 3 },
    { x: 3.5, width: 2.5 },
    { x: 6.5, width: 3 },
  ]);
});

test('every bar lies inside the plot, at least one device pixel wide, with edges on device pixels', () => {
  assert.ok(LAYOUTS.length > 100);
  for (const [count, width, ratio] of LAYOUTS) {
    const spans = barSpans(count, width, ratio);
    const label = `${count} bars in ${width}px at ${ratio}x`;
    const plotRight = Math.round(width * ratio) / ratio;
    assert.equal(spans.length, count, label);
    for (const span of spans) {
      assert.ok(span.x >= 0 && span.x + span.width <= plotRight + EPSILON, label);
      assert.ok(span.width >= 1 / ratio - EPSILON, label);
      assert.ok(onDevicePixel(span.x, ratio) && onDevicePixel(span.width, ratio), label);
    }
  }
});

test('bars never overlap; they touch while narrow and keep a gap from three device pixels on', () => {
  for (const [count, width, ratio] of LAYOUTS) {
    const spans = barSpans(count, width, ratio);
    const label = `${count} bars in ${width}px at ${ratio}x`;
    const hasGap = deviceSlot(count, width, ratio) >= 3;
    for (let i = 1; i < spans.length; i++) {
      const gap = spans[i].x - (spans[i - 1].x + spans[i - 1].width);
      if (hasGap) assert.ok(gap >= 1 / ratio - EPSILON, label);
      else assert.ok(Math.abs(gap) < EPSILON, label);
    }
  }
});

test('with more bars than device pixels each bar stays one pixel wide inside the plot', () => {
  const spans = barSpans(300, 200, 1);
  assert.equal(spans.length, 300);
  for (let i = 0; i < spans.length; i++) {
    assert.equal(spans[i].width, 1);
    assert.ok(spans[i].x + spans[i].width <= 200);
    if (i > 0) assert.ok(spans[i].x >= spans[i - 1].x);
  }
});

test('barRoles marks sorted bars and leaves the rest plain', () => {
  assert.deepEqual(barRoles(4, [true, false, false, true], null), ['sorted', 'bar', 'bar', 'sorted']);
});

test('the bars of the last step take the color of its type, even when already sorted', () => {
  const sorted = [true, false, false, false];
  assert.deepEqual(barRoles(4, sorted, { type: 'compare', indices: [0, 2] }), ['compare', 'bar', 'compare', 'bar']);
  assert.deepEqual(barRoles(4, sorted, { type: 'swap', indices: [1, 3] }), ['sorted', 'swap', 'bar', 'swap']);
  assert.deepEqual(barRoles(4, sorted, { type: 'overwrite', indices: [2] }), ['sorted', 'bar', 'write', 'bar']);
  assert.deepEqual(barRoles(4, [], { type: 'sorted', indices: [1, 2] }), ['bar', 'sorted', 'sorted', 'bar']);
});

test('unknown step types and out-of-range indices are ignored, and inputs are left untouched', () => {
  const sorted = [false, true, false];
  const highlight = { type: 'compare', indices: [-1, 3, 1.5, NaN] };
  assert.deepEqual(barRoles(3, sorted, highlight), ['bar', 'sorted', 'bar']);
  assert.deepEqual(barRoles(3, sorted, { type: 'toString', indices: [0] }), ['bar', 'sorted', 'bar']);
  assert.deepEqual(sorted, [false, true, false]);
  assert.deepEqual(highlight.indices, [-1, 3, 1.5, NaN]);
});
