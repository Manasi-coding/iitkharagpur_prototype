// Person 1 — associative-memory weight-matrix builder.
//
// Phase 3 implementation, the last of Person 1's three core files. Builds
// a symmetric, zero-diagonal weight matrix from a set of stored patterns,
// via Hebbian outer-product accumulation.
//
// Dimension source: with real input, the matrix is sized from
// patterns[0].length (same "derive from input, don't hardcode
// CONFIG.PATTERN_DIM" convention as similarity.js/injectNoise.js, Phase
// 1/2) — this is also what lets tests/write.test.js use a short,
// hand-verifiable 8-element fixture against this real function without
// producing a matrix full of NaN from reading past a short pattern's end.
// With patterns = [], there's nothing to derive a size from, so
// CONFIG.PATTERN_DIM is the only available source — the one place in this
// file CONFIG.PATTERN_DIM is load-bearing rather than incidental.
import { CONFIG } from '../config.js';

// BDH-style sparsification of a single pattern's contribution, applied
// BEFORE that pattern's outer product is accumulated into W — never
// applied to the shared accumulator itself. Getting this backwards
// (sparsifying the final summed W instead of each pattern's contribution)
// would silently produce a different, wrong matrix: sparsifying after
// summation throws away *interference between patterns*, not each
// pattern's own weak connections, which is not what the contract asks for.
//
// Two steps, in order: (1) zero out negative values — only
// positive/excitatory contributions survive at all; (2) of what's left,
// keep only the top sparsityPct% by magnitude, zero the rest. For this
// codebase's bipolar (+1/-1) patterns, step 1 already reduces every
// surviving value to exactly 1 (tied magnitude), so step 2's "top by
// magnitude" degrades to "the first keepCount surviving positions by
// index" via a stable sort. Written as a general magnitude-sort rather
// than a bipolar-specific shortcut, so it stays correct if this is ever
// fed a non-bipolar vector.
function sparsifyPattern(pattern, sparsityPct) {
  const keepCount = Math.round((pattern.length * sparsityPct) / 100);

  const positiveOnly = pattern.map(value => (value > 0 ? value : 0));

  const order = positiveOnly
    .map((_, index) => index)
    .sort((a, b) => Math.abs(positiveOnly[b]) - Math.abs(positiveOnly[a]));
  const keepIndices = new Set(order.slice(0, keepCount));

  return positiveOnly.map((value, index) => (keepIndices.has(index) ? value : 0));
}

/**
 * @param {number[][]} patterns - stored patterns (all the same length)
 * @param {Object} [options]
 * @param {number} [options.decay] - decay factor applied per incremental write (default CONFIG.DECAY_DEFAULT, i.e. no decay)
 * @param {boolean} [options.sparse] - if true, keep only the top options.sparsityPct% of magnitudes per pattern before accumulating
 * @param {number} [options.sparsityPct] - sparsity cutoff percentage, only read when options.sparse is true (default CONFIG.SPARSITY_PCT)
 * @returns {number[][]} a symmetric, zero-diagonal weight matrix (CONFIG.PATTERN_DIM x CONFIG.PATTERN_DIM for PATTERN_DIM-length input patterns)
 */
export function write(patterns, options) {
  // options ?? {} (not a parameter default) so write.length stays 2 —
  // matching the already-gate-passed arity test from Phase 0, which a
  // `options = {}` parameter default would have silently changed to 1.
  const { decay = CONFIG.DECAY_DEFAULT, sparse = false, sparsityPct = CONFIG.SPARSITY_PCT } = options ?? {};

  const dim = patterns.length === 0 ? CONFIG.PATTERN_DIM : patterns[0].length;
  const W = Array.from({ length: dim }, () => new Array(dim).fill(0));

  // One incremental loop handles both the "classical" and "decayed" paths
  // — they are not two different formulas. W = decay*W_prev +
  // outer(contribution, contribution), applied per pattern in input
  // order, is exactly the classical W = sum of outer products when
  // decay === CONFIG.DECAY_DEFAULT (1.0): multiplying an accumulator by
  // the exact float 1.0 changes nothing (IEEE754 guarantees 1.0 * x === x
  // bit-for-bit), so it reduces to plain summation, which is commutative —
  // pattern order doesn't matter. Order DOES matter whenever decay !== 1.0,
  // since decay*a + b !== decay*b + a in general — proved directly in
  // tests/write.test.js by reversing pattern order under decay and
  // asserting the result differs.
  for (const pattern of patterns) {
    const contribution = sparse ? sparsifyPattern(pattern, sparsityPct) : pattern;
    for (let i = 0; i < dim; i++) {
      for (let j = 0; j < dim; j++) {
        W[i][j] = decay * W[i][j] + contribution[i] * contribution[j];
      }
    }
  }

  // Zeroed once, after every pattern is accumulated — not per-pattern.
  // Whatever value built up on the diagonal during the loop (including
  // under decay) is simply discarded here, so it doesn't matter that the
  // loop above never special-cased i === j.
  for (let i = 0; i < dim; i++) {
    W[i][i] = 0;
  }

  return W;
}
