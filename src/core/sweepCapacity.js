// Phase person3/sweep-crossover-bdh — Person 3.
// Pure function (no side effects, no module-level mutable state).
// Reports empirical curves only; no theoretical capacity formula.
//
// Dependencies (write, retrieveIterative, computeSimilarity, injectNoise) are
// injected via the optional third argument so the real implementations can
// replace stubs without modifying this file. Only write is required — the
// rest have safe defaults following established project conventions.

import { CONFIG } from '../config.js';
import { retrieveIterative as defaultRetrieve } from './retrieveIterative.js';

// ---------------------------------------------------------------------------
// Default noise helper.
// Matches the deterministic first-N-elements flip convention used in
// guidedSequence.js (withNoise) and retrieveIterative.test.js (addNoise).
// noisePct is 0-100, matching CONFIG.NOISE_MIN / NOISE_MAX scale.
// Returns a NEW array; the original pattern is never mutated.
// ---------------------------------------------------------------------------
function defaultInjectNoise(pattern, noisePct) {
  const flipCount = Math.round((noisePct / 100) * pattern.length);
  return pattern.map((value, index) => (index < flipCount ? -value : value));
}

// ---------------------------------------------------------------------------
// Default similarity helper.
// 0-100 exact-element-match percentage, matching CONFIG.PASS_THRESHOLD scale
// and the stub-similarity.js contract (computeSimilarity returns 0-100).
// Returns a scalar; inputs are never mutated.
// ---------------------------------------------------------------------------
function defaultComputeSimilarity(original, retrieved) {
  const matchCount = original.filter((value, index) => value === retrieved[index]).length;
  return (matchCount / original.length) * 100;
}

/**
 * sweepCapacity(patterns, options, deps): { n, avgSimilarity }[]
 *
 * Runs an empirical capacity sweep from n=1 up to min(maxN, patterns.length).
 * For each n, the first n patterns are written into memory, then ALL n of them
 * are probed with noisy queries; retrieval output is compared to the clean
 * original and averaged.
 *
 * The sweep works for both sparse:false and sparse:true — the flag is forwarded
 * verbatim to write(); how it alters the weight matrix is entirely write()'s
 * concern, not this function's. Callers must supply a write() that understands
 * the flag; the current scratch/stub-write.js does not, but passing a real
 * write() later requires no changes to this file.
 *
 * @param {Array<{ id: string, pattern: number[] }>} patterns
 *   Preset patterns as returned by createPresetPatterns(). Not mutated.
 *
 * @param {{ sparse: boolean, noisePct: number, maxN: number }} options
 *   sparse   — forwarded verbatim to deps.write(patternVectors, { sparse }).
 *              This file does NOT interpret or act on sparse; that is entirely
 *              write()'s responsibility.
 *   noisePct — 0-100. Approximate percentage of pattern elements flipped per
 *              noisy query, using the same scale as CONFIG.NOISE_MIN/NOISE_MAX.
 *   maxN     — Upper bound for the sweep. Silently capped to patterns.length
 *              to avoid indexing past available preset data (known gap: only 9
 *              presets exist while CONFIG.MAX_PATTERNS is 20).
 *
 * @param {{ write, retrieveIterative?, computeSimilarity?, injectNoise? }} [deps={}]
 *   write             — REQUIRED. Called as write(patternVectors, { sparse }).
 *                       Must return a weight matrix (number[][]) compatible
 *                       with retrieveIterative's W argument.
 *   retrieveIterative — optional; defaults to src/core/retrieveIterative.js.
 *                       Signature: (query, W) => { finalOutput, ... }
 *   computeSimilarity — optional; defaults to 0-100 exact-element-match pct.
 *                       Signature: (original, retrieved) => number
 *   injectNoise       — optional; defaults to deterministic first-N-flip.
 *                       Signature: (pattern, noisePct) => number[]
 *
 * @returns {{ n: number, avgSimilarity: number }[]}
 *   One entry per n from 1 to effectiveMaxN. avgSimilarity is on the 0-100
 *   scale matching CONFIG.PASS_THRESHOLD.
 */
export function sweepCapacity(patterns, { sparse, noisePct, maxN }, deps = {}) {
  const {
    write,
    retrieveIterative: retrieve = defaultRetrieve,
    computeSimilarity: similarity = defaultComputeSimilarity,
    injectNoise: noise = defaultInjectNoise,
  } = deps;

  if (typeof write !== 'function') {
    throw new Error('sweepCapacity: deps.write is required and must be a function');
  }

  // Cap maxN at the number of available patterns (known preset-count gap).
  const effectiveMaxN = Math.min(maxN, patterns.length);
  const results = [];

  for (let n = 1; n <= effectiveMaxN; n++) {
    // First n patterns only. Extract raw number[] vectors for write().
    // slice() and map() both create new arrays — originals are not mutated.
    const subset = patterns.slice(0, n);
    const patternVectors = subset.map(({ pattern }) => pattern);

    // sparse is forwarded here verbatim — write() decides what it means.
    const W = write(patternVectors, { sparse });

    // Probe every stored pattern; compare retrieval output to the clean original.
    let totalSimilarity = 0;
    for (const { pattern: original } of subset) {
      const noisyQuery = noise(original, noisePct);
      const { finalOutput } = retrieve(noisyQuery, W);
      totalSimilarity += similarity(original, finalOutput);
    }

    results.push({ n, avgSimilarity: totalSimilarity / n });
  }

  return results;
}
