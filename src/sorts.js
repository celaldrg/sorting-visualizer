/**
 * Sorting algorithms written as generator functions.
 *
 * Each generator sorts its own copy of `input` (the input is never mutated)
 * and yields one step per elementary operation, so a player can replay the
 * run on another copy of the input and end with the same sorted array:
 *
 * - `compare`   indices [i, j]: the elements at i and j are compared
 * - `swap`      indices [i, j]: the elements at i and j trade places
 * - `overwrite` indices [i] plus `value`: position i is set to `value`
 * - `sorted`    indices [...]: these positions now hold their final elements
 *
 * Every index is reported as sorted exactly once and is never written again
 * afterwards. Elements can be anything: `key` maps an element to the number it
 * is ordered by (plain numbers by default). Counting and radix sort need
 * integer keys.
 * @module sorts
 */

/** @typedef {'compare'|'swap'|'overwrite'|'sorted'} StepType */

/**
 * One visualization step.
 * @typedef {object} Step
 * @property {StepType} type What happened.
 * @property {number[]} indices Positions involved.
 * @property {*} [value] Element written by an `overwrite` step.
 */

/**
 * Maps an element to the number it is sorted by.
 * @callback KeyFn
 * @param {*} item
 * @returns {number}
 */

const identity = (item) => item;

/** Radix sort works on decimal digits: ones, then tens, then hundreds... */
const RADIX = 10;

/**
 * Bubble sort: sweeps left to right swapping neighbours that are out of order;
 * stops early after a pass without swaps. Stable.
 * @param {Array} input Elements to sort (not mutated).
 * @param {KeyFn} [key] Sort key, identity by default.
 * @yields {Step}
 */
export function* bubbleSort(input, key = identity) {
  const a = input.slice();
  const marks = createMarks(a.length);
  for (let end = a.length - 1; end > 0; end--) {
    let swapped = false;
    for (let j = 0; j < end; j++) {
      yield compare(j, j + 1);
      if (key(a[j]) > key(a[j + 1])) {
        yield swap(a, j, j + 1);
        swapped = true;
      }
    }
    yield marks.mark([end]);
    if (!swapped) break;
  }
  yield* marks.rest();
}

/**
 * Insertion sort: moves each element left past larger neighbours
 * (adjacent swaps, so the swap count equals the number of inversions). Stable.
 * @param {Array} input Elements to sort (not mutated).
 * @param {KeyFn} [key] Sort key, identity by default.
 * @yields {Step}
 */
export function* insertionSort(input, key = identity) {
  const a = input.slice();
  for (let i = 1; i < a.length; i++) {
    for (let j = i; j > 0; j--) {
      yield compare(j - 1, j);
      if (key(a[j - 1]) <= key(a[j])) break;
      yield swap(a, j - 1, j);
    }
  }
  yield* sortedStep(range(a.length));
}

/**
 * Selection sort: finds the minimum of the unsorted part and swaps it to the
 * front. Always n(n-1)/2 comparisons, at most n-1 swaps. Not stable.
 * @param {Array} input Elements to sort (not mutated).
 * @param {KeyFn} [key] Sort key, identity by default.
 * @yields {Step}
 */
export function* selectionSort(input, key = identity) {
  const a = input.slice();
  const marks = createMarks(a.length);
  for (let i = 0; i < a.length - 1; i++) {
    let min = i;
    for (let j = i + 1; j < a.length; j++) {
      yield compare(min, j);
      if (key(a[j]) < key(a[min])) min = j;
    }
    if (min !== i) yield swap(a, i, min);
    yield marks.mark([i]);
  }
  yield* marks.rest();
}

/**
 * Shell sort: insertion sort over shrinking gaps (Knuth's 1, 4, 13, 40, 121...),
 * so far-away elements move early. Not stable.
 * @param {Array} input Elements to sort (not mutated).
 * @param {KeyFn} [key] Sort key, identity by default.
 * @yields {Step}
 */
export function* shellSort(input, key = identity) {
  const a = input.slice();
  let gap = 1;
  while (gap < a.length / 3) gap = 3 * gap + 1;
  for (; gap > 0; gap = (gap - 1) / 3) {
    for (let i = gap; i < a.length; i++) {
      for (let j = i; j >= gap; j -= gap) {
        yield compare(j - gap, j);
        if (key(a[j - gap]) <= key(a[j])) break;
        yield swap(a, j - gap, j);
      }
    }
  }
  yield* sortedStep(range(a.length));
}

/**
 * Top-down merge sort: sorts both halves recursively, then merges them.
 * The merge reads both halves while comparing and then writes the merged run
 * back with `overwrite` steps. Stable.
 * @param {Array} input Elements to sort (not mutated).
 * @param {KeyFn} [key] Sort key, identity by default.
 * @yields {Step}
 */
export function* mergeSort(input, key = identity) {
  const a = input.slice();
  yield* mergeRange(a, 0, a.length - 1, key);
  yield* sortedStep(range(a.length));
}

/**
 * Quick sort with the Lomuto partition: the last element is the pivot and
 * ends in its final place after each partition. Not stable.
 * @param {Array} input Elements to sort (not mutated).
 * @param {KeyFn} [key] Sort key, identity by default.
 * @yields {Step}
 */
export function* quickSortLomuto(input, key = identity) {
  yield* quickSort(input, key, lomutoPartition);
}

/**
 * Quick sort with the Hoare partition: the middle element is the pivot and two
 * pointers walk towards each other swapping misplaced pairs. Not stable.
 * @param {Array} input Elements to sort (not mutated).
 * @param {KeyFn} [key] Sort key, identity by default.
 * @yields {Step}
 */
export function* quickSortHoare(input, key = identity) {
  yield* quickSort(input, key, hoarePartition);
}

/**
 * Heap sort: builds a max-heap, then repeatedly swaps the root (the maximum)
 * to the end of the shrinking heap. Not stable.
 * @param {Array} input Elements to sort (not mutated).
 * @param {KeyFn} [key] Sort key, identity by default.
 * @yields {Step}
 */
export function* heapSort(input, key = identity) {
  const a = input.slice();
  const marks = createMarks(a.length);
  for (let root = (a.length >> 1) - 1; root >= 0; root--) {
    yield* siftDown(a, root, a.length, key);
  }
  for (let end = a.length - 1; end > 0; end--) {
    yield swap(a, 0, end);
    yield marks.mark([end]);
    yield* siftDown(a, 0, end, key);
  }
  yield* marks.rest();
}

/**
 * Counting sort: counts how often every key occurs, then writes the elements
 * back in key order. No comparisons at all. Stable; needs integer keys.
 * @param {Array} input Elements to sort (not mutated).
 * @param {KeyFn} [key] Integer sort key, identity by default.
 * @yields {Step}
 * @throws {TypeError} When a key is not a safe integer.
 */
export function* countingSort(input, key = identity) {
  const a = input.slice();
  const keys = integerKeys(a, key);
  if (a.length > 0) {
    const { min, max } = bounds(keys);
    const buckets = keys.map((k) => k - min);
    yield* writeAll(a, distribute(a, buckets, max - min + 1));
  }
  yield* sortedStep(range(a.length));
}

/**
 * LSD radix sort (base 10): one stable counting pass per decimal digit,
 * least significant digit first. No comparisons at all. Stable; needs
 * integer keys (negative keys are shifted to start at zero).
 * @param {Array} input Elements to sort (not mutated).
 * @param {KeyFn} [key] Integer sort key, identity by default.
 * @yields {Step}
 * @throws {TypeError} When a key is not a safe integer.
 */
export function* radixSort(input, key = identity) {
  const a = input.slice();
  const keys = integerKeys(a, key);
  if (a.length > 0) {
    const { min, max } = bounds(keys);
    const offset = Math.min(0, min);
    for (let place = 1; Math.floor((max - offset) / place) > 0; place *= RADIX) {
      const digits = a.map((item) => Math.floor((key(item) - offset) / place) % RADIX);
      yield* writeAll(a, distribute(a, digits, RADIX));
    }
  }
  yield* sortedStep(range(a.length));
}

/* ---------- step builders ---------- */

function compare(i, j) {
  return { type: 'compare', indices: [i, j] };
}

/** Swaps a[i] and a[j] in the working copy and describes it. */
function swap(a, i, j) {
  const held = a[i];
  a[i] = a[j];
  a[j] = held;
  return { type: 'swap', indices: [i, j] };
}

/** Writes `value` to a[i] in the working copy and describes it. */
function overwrite(a, i, value) {
  a[i] = value;
  return { type: 'overwrite', indices: [i], value };
}

/** Yields one `sorted` step for `indices`, or nothing when the list is empty. */
function* sortedStep(indices) {
  if (indices.length > 0) yield { type: 'sorted', indices };
}

/** Remembers which indices were already reported as sorted. */
function createMarks(length) {
  const marked = new Uint8Array(length);
  return {
    mark(indices) {
      for (const i of indices) marked[i] = 1;
      return { type: 'sorted', indices };
    },
    rest() {
      return sortedStep(range(length).filter((i) => marked[i] === 0));
    },
  };
}

function range(length) {
  return Array.from({ length }, (_, i) => i);
}

/* ---------- algorithm helpers ---------- */

function* mergeRange(a, lo, hi, key) {
  if (lo >= hi) return;
  const mid = (lo + hi) >> 1;
  yield* mergeRange(a, lo, mid, key);
  yield* mergeRange(a, mid + 1, hi, key);
  yield* merge(a, lo, mid, hi, key);
}

/**
 * Merges the sorted runs a[lo..mid] and a[mid+1..hi]. The array is only read
 * while comparing, so compare steps point at the real elements. Right-run
 * elements left over at the end are already in place and are not copied.
 */
function* merge(a, lo, mid, hi, key) {
  const merged = [];
  let i = lo;
  let j = mid + 1;
  while (i <= mid && j <= hi) {
    yield compare(i, j);
    merged.push(key(a[j]) < key(a[i]) ? a[j++] : a[i++]);
  }
  while (i <= mid) merged.push(a[i++]);
  for (let k = 0; k < merged.length; k++) yield overwrite(a, lo + k, merged[k]);
}

/**
 * What a quick sort partition leaves behind.
 * @typedef {object} Split
 * @property {Array<[number, number]>} parts The two inclusive [lo, hi] ranges still to sort (either may be empty).
 * @property {number} [placed] Index of the pivot when the partition put it in its final place.
 */

/**
 * Quick sort driver with an explicit stack of inclusive [lo, hi] ranges.
 * `partition` splits a[lo..hi] (lo < hi), yielding its steps. The larger part
 * is pushed first, so the smaller one is sorted next. Each range that leaves a
 * part waiting is then at most half the size of the range that left the part
 * below it, so at most log2(n) parts wait at once: O(log n) extra space, even
 * in the worst case.
 */
function* quickSort(input, key, partition) {
  const a = input.slice();
  const marks = createMarks(a.length);
  const ranges = [[0, a.length - 1]];
  while (ranges.length > 0) {
    const [lo, hi] = ranges.pop();
    if (lo < hi) {
      const { parts, placed } = yield* partition(a, lo, hi, key);
      if (placed !== undefined) yield marks.mark([placed]);
      ranges.push(...largerFirst(parts));
    } else if (lo === hi) {
      yield marks.mark([lo]);
    }
  }
}

/** Orders two ranges for pushing: larger first, so the smaller one (the left one on a tie) is popped next. */
function largerFirst([left, right]) {
  return rangeSize(left) > rangeSize(right) ? [left, right] : [right, left];
}

function rangeSize([lo, hi]) {
  return hi - lo + 1;
}

/**
 * Lomuto partition of a[lo..hi] around a[hi]; the pivot ends in its final place.
 * @returns {Generator<Step, Split>}
 */
function* lomutoPartition(a, lo, hi, key) {
  const pivot = key(a[hi]);
  let store = lo;
  for (let j = lo; j < hi; j++) {
    yield compare(j, hi);
    if (key(a[j]) < pivot) {
      if (store !== j) yield swap(a, store, j);
      store++;
    }
  }
  if (store !== hi) yield swap(a, store, hi);
  return { parts: [[lo, store - 1], [store + 1, hi]], placed: store };
}

/**
 * Hoare partition around the middle element of a[lo..hi] (lo < hi). The parts
 * a[lo..j] and a[j+1..hi] it returns satisfy left <= right and lo <= j < hi,
 * so neither part is empty. The pivot element's position is tracked so compare
 * steps highlight it; when a scan reaches the pivot itself the step compares
 * that index with itself, and the scan stops there.
 * @returns {Generator<Step, Split>}
 */
function* hoarePartition(a, lo, hi, key) {
  let pivotAt = (lo + hi) >> 1;
  const pivot = key(a[pivotAt]);
  let i = lo - 1;
  let j = hi + 1;
  for (;;) {
    do {
      i++;
      yield compare(i, pivotAt);
    } while (key(a[i]) < pivot);
    do {
      j--;
      yield compare(j, pivotAt);
    } while (key(a[j]) > pivot);
    if (i >= j) return { parts: [[lo, j], [j + 1, hi]] };
    yield swap(a, i, j);
    if (pivotAt === i) pivotAt = j;
    else if (pivotAt === j) pivotAt = i;
  }
}

/** Restores the max-heap property below `root` within a[0..size-1]. */
function* siftDown(a, root, size, key) {
  let parent = root;
  while (2 * parent + 1 < size) {
    let child = 2 * parent + 1;
    if (child + 1 < size) {
      yield compare(child, child + 1);
      if (key(a[child]) < key(a[child + 1])) child++;
    }
    yield compare(parent, child);
    if (key(a[parent]) >= key(a[child])) return;
    yield swap(a, parent, child);
    parent = child;
  }
}

/** Returns every element's key, rejecting keys that are not safe integers. */
function integerKeys(items, key) {
  return items.map((item) => {
    const k = key(item);
    if (!Number.isSafeInteger(k)) throw new TypeError(`Counting and radix sort need integer keys, got ${k}`);
    return k;
  });
}

function bounds(keys) {
  let min = keys[0];
  let max = keys[0];
  for (const k of keys) {
    if (k < min) min = k;
    if (k > max) max = k;
  }
  return { min, max };
}

/**
 * Stable counting distribution: returns `items` ordered by their bucket
 * number (0..bucketCount-1), keeping the input order inside each bucket.
 */
function distribute(items, buckets, bucketCount) {
  const ends = new Array(bucketCount).fill(0);
  for (const b of buckets) ends[b]++;
  for (let b = 1; b < bucketCount; b++) ends[b] += ends[b - 1];
  const output = new Array(items.length);
  for (let i = items.length - 1; i >= 0; i--) output[--ends[buckets[i]]] = items[i];
  return output;
}

/** Copies `items` over the working array, one overwrite step per position. */
function* writeAll(a, items) {
  for (let i = 0; i < items.length; i++) yield overwrite(a, i, items[i]);
}
