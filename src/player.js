/**
 * Step player: replays recorded sorting steps on a copy of the input and keeps
 * the counters shown in the UI (comparisons, swaps, writes, elapsed steps).
 * @module player
 */

/**
 * @typedef {object} Stats
 * @property {number} comparisons Applied `compare` steps.
 * @property {number} swaps Applied `swap` steps.
 * @property {number} writes Applied `overwrite` steps.
 * @property {number} steps All applied steps.
 */

/**
 * @typedef {object} PlaybackState
 * @property {Array} array Working copy that swap and overwrite steps change.
 * @property {boolean[]} sorted True where a `sorted` step marked the position final.
 * @property {Stats} stats Counters.
 */

/**
 * @typedef {object} StepPlayer
 * @property {() => (import('./sorts.js').Step|null)} next Applies the next step and returns it, or null at the end.
 * @property {() => void} reset Rewinds to the original input.
 * @property {Array} array Current working array (live; do not mutate).
 * @property {boolean[]} sorted Positions known to be final (live; do not mutate).
 * @property {Stats} stats Counters (live; do not mutate).
 * @property {number} total Number of recorded steps.
 * @property {boolean} done True once every step has been applied.
 * @property {import('./sorts.js').Step|null} last Most recently applied step.
 */

/**
 * Applies one step to a playback state, in place.
 * @param {PlaybackState} state State to change.
 * @param {import('./sorts.js').Step} step Step to apply.
 * @throws {TypeError} For an unknown step type.
 */
export function applyStep(state, step) {
  const { array, sorted, stats } = state;
  switch (step.type) {
    case 'compare':
      stats.comparisons++;
      break;
    case 'swap': {
      const [i, j] = step.indices;
      const held = array[i];
      array[i] = array[j];
      array[j] = held;
      stats.swaps++;
      break;
    }
    case 'overwrite':
      array[step.indices[0]] = step.value;
      stats.writes++;
      break;
    case 'sorted':
      for (const i of step.indices) sorted[i] = true;
      break;
    default:
      throw new TypeError(`Unknown step type: ${step.type}`);
  }
  stats.steps++;
}

/**
 * Creates a player that replays `steps` on a fresh copy of `input`.
 * @param {Array} input The unsorted array the steps were recorded from (copied).
 * @param {import('./sorts.js').Step[]} steps Steps recorded from a sort generator.
 * @returns {StepPlayer}
 */
export function createStepPlayer(input, steps) {
  const source = input.slice();
  let state;
  let position;
  let last;

  function reset() {
    state = {
      array: source.slice(),
      sorted: new Array(source.length).fill(false),
      stats: { comparisons: 0, swaps: 0, writes: 0, steps: 0 },
    };
    position = 0;
    last = null;
  }

  function next() {
    if (position >= steps.length) return null;
    last = steps[position];
    position++;
    applyStep(state, last);
    return last;
  }

  reset();
  return {
    next,
    reset,
    get array() {
      return state.array;
    },
    get sorted() {
      return state.sorted;
    },
    get stats() {
      return state.stats;
    },
    get total() {
      return steps.length;
    },
    get done() {
      return position >= steps.length;
    },
    get last() {
      return last;
    },
  };
}
