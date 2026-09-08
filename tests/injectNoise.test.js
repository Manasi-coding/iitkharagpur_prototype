import test from 'node:test';
import assert from 'node:assert/strict';
import { CONFIG } from '../src/config.js';
import { injectNoise } from '../src/core/injectNoise.js';
import { similarity } from '../src/core/similarity.js';
import { createPresetPatterns } from '../src/core/createPresetPatterns.js';

// Phase 2. injectNoise(pattern, pct, seed?) is implemented — see
// src/core/injectNoise.js. Not the same algorithm as guidedSequence.js's
// pre-existing withNoise() (fixed-prefix flip, no RNG) — see
// README_PHASE0.md, "Open assumptions" for the full comparison. This file
// never imports guidedSequence.js, and vice versa.

const FIXTURE = [1, -1, 1, 1, -1, -1, 1, -1];

test('injectNoise is exported as a function with the contracted arity (pattern, pct, seed)', () => {
  assert.equal(typeof injectNoise, 'function');
  assert.equal(injectNoise.length, 3);
});

test(`injectNoise(pattern, CONFIG.NOISE_MIN) returns a pattern identical to the input (${CONFIG.NOISE_MIN}% corruption)`, () => {
  // flipCount = Math.round(8 * 0 / 100) = 0 -> empty flip set, regardless
  // of seed, so no seed is needed for this to be deterministic.
  assert.deepStrictEqual(injectNoise(FIXTURE, CONFIG.NOISE_MIN), FIXTURE);
});

test(`injectNoise(pattern, CONFIG.NOISE_MAX) flips every position (${CONFIG.NOISE_MAX}% corruption)`, () => {
  // flipCount = Math.round(8 * 100 / 100) = 8 -> every index is in the
  // flip set regardless of shuffle order, so no seed is needed here either.
  // Hand-computed: every sign in FIXTURE flipped.
  const expected = [-1, 1, -1, -1, 1, 1, -1, 1];
  assert.deepStrictEqual(injectNoise(FIXTURE, CONFIG.NOISE_MAX), expected);
});

test('a specific pct flips exactly the documented rounding count of positions (checked via similarity(), not reimplemented)', () => {
  const PCT = 25;
  const SEED = 42; // arbitrary but fixed, so a failure here is reproducible
  const noised = injectNoise(FIXTURE, PCT, SEED);

  // Documented rounding rule: Math.round(8 * 25 / 100) = Math.round(2) = 2
  // positions flip. Bipolar values are always nonzero, so a sign flip
  // always changes the value — the flip count IS the mismatch count.
  // Expected similarity: (8 - 2) / 8 * 100 = 75%. This holds for any seed
  // (or none): the *count* is fixed by the rounding rule, only *which*
  // positions flip is random, so there's no need to special-case the seed
  // to make this assertion exact.
  assert.equal(similarity(FIXTURE, noised), 75);
});

test('injectNoise(pattern, pct, seed) is deterministic: two calls with the same seed produce identical output', () => {
  const first = injectNoise(FIXTURE, 30, 7);
  const second = injectNoise(FIXTURE, 30, 7);
  assert.deepStrictEqual(first, second);
});

test('different seeds typically produce different output', () => {
  // Real 64-length preset, not the 8-element FIXTURE: at pct=10,
  // flipCount = Math.round(64 * 10 / 100) = 6, and there are C(64, 6) =
  // 74,974,368 possible 6-element flip-sets. Two arbitrary distinct seeds
  // landing on the exact same set by chance is a ~1.3e-8 event, so one
  // comparison is safe here without flaking — unlike on the 8-element
  // FIXTURE, where a pct=25 flip-set only has C(8, 2) = 28 possibilities
  // and a single comparison would be a real flakiness risk.
  const pattern = createPresetPatterns()[0].pattern;
  const a = injectNoise(pattern, 10, 1);
  const b = injectNoise(pattern, 10, 2);
  assert.notDeepStrictEqual(a, b);
});

test('unseeded calls (Math.random()-driven) typically produce different output', () => {
  // Same C(64, 6) ~= 75 million argument as the different-seeds case above
  // — safe as a single comparison on a real 64-length preset.
  const pattern = createPresetPatterns()[0].pattern;
  const a = injectNoise(pattern, 10);
  const b = injectNoise(pattern, 10);
  assert.notDeepStrictEqual(a, b);
});

test('pct outside [CONFIG.NOISE_MIN, CONFIG.NOISE_MAX] throws instead of clamping', () => {
  assert.throws(() => injectNoise(FIXTURE, CONFIG.NOISE_MAX + 1), /pct/i);
  assert.throws(() => injectNoise(FIXTURE, CONFIG.NOISE_MIN - 1), /pct/i);
});

test('does not mutate its input pattern array', () => {
  const pattern = [...FIXTURE];
  const before = [...pattern];
  injectNoise(pattern, 50, 123);
  assert.deepStrictEqual(pattern, before);
});
