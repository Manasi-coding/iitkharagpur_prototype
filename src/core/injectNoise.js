// Person 1 — pattern noise injector.
//
// Phase 2 implementation. Flips the sign of pct% of pattern's positions
// (+1 <-> -1, the bipolar representation used throughout this codebase —
// see createPresetPatterns.js). Unseeded, draws from Math.random() and is
// non-deterministic across calls. Seeded, draws only from the inline
// mulberry32 PRNG below (zero Math.random() calls in that path) and is
// fully deterministic: the same (pattern, pct, seed) always flips the same
// positions.
//
// NOT the same algorithm as guidedSequence.js's withNoise() (Person 2,
// pre-existing, fixed 10% prefix flip with no RNG at all) — see
// README_PHASE0.md, "Open assumptions" for the full comparison. This file
// does not import or depend on that one, and vice versa.
import { CONFIG } from '../config.js';

// Standard mulberry32 PRNG (public-domain; the usual choice for exactly
// this "small seeded generator, no dependency" need) — implemented inline
// per the task contract, not pulled in as a package. Returns a function
// with the same interface as Math.random: no arguments, yields a float in
// [0, 1).
function mulberry32(seed) {
  let state = seed >>> 0;
  return function next() {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * @param {number[]} pattern - source pattern (not mutated)
 * @param {number} pct - percentage of positions to flip, in [CONFIG.NOISE_MIN, CONFIG.NOISE_MAX]
 * @param {number} [seed] - optional RNG seed for deterministic, reproducible corruption; omit for non-deterministic (Math.random()-driven) noise
 * @returns {number[]} a new array the same length as pattern
 */
export function injectNoise(pattern, pct, seed) {
  // Throw, not clamp: a caller passing e.g. pct=150 (a percentage/fraction
  // mix-up) almost certainly has a bug, and silently clamping to 100 would
  // hide it — the same way the degenerate unsigned-Math.random() write()
  // bug (README_PHASE0.md, "The degenerate-matrix bug") stayed hidden
  // because nothing complained loudly when its output was structurally
  // wrong. Fail loud instead.
  if (pct < CONFIG.NOISE_MIN || pct > CONFIG.NOISE_MAX) {
    throw new Error(`injectNoise: pct (${pct}) must be within [${CONFIG.NOISE_MIN}, ${CONFIG.NOISE_MAX}]`);
  }

  // seed === undefined (not a falsy check) so seed=0 is treated as a real,
  // valid seed rather than silently falling back to Math.random().
  const randomFn = seed === undefined ? Math.random : mulberry32(seed);

  // Rounding rule — the exact source of any off-by-one disagreement
  // between a caller's expected flip count and the actual output: nearest
  // integer, e.g. pct=10 on a 64-length pattern flips Math.round(6.4) = 6
  // positions, not 6.4 and not 7.
  const flipCount = Math.round((pattern.length * pct) / 100);

  // Fisher-Yates shuffle of all valid indices, then take the first
  // flipCount — guarantees exactly flipCount *distinct* positions flip,
  // never fewer via an accidental repeat draw (as a naive "pick a random
  // index flipCount times" loop could produce).
  const indices = Array.from({ length: pattern.length }, (_, index) => index);
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(randomFn() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }
  const flipSet = new Set(indices.slice(0, flipCount));

  return pattern.map((value, index) => (flipSet.has(index) ? -value : value));
}
