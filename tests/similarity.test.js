import test from 'node:test';
import assert from 'node:assert/strict';
import { CONFIG } from '../src/config.js';
import { similarity } from '../src/core/similarity.js';
import { createPresetPatterns } from '../src/core/createPresetPatterns.js';

// Phase 1. similarity(a, b) is implemented — see src/core/similarity.js.
// Scale: 0-100, percentage of positions where a[i] === b[i], directly
// comparable to CONFIG.PASS_THRESHOLD. See README_PHASE0.md, "Open
// assumptions" for how that scale question was resolved (confirmed by the
// task's own contract text, not by matching scratch/stub-similarity.js —
// that file is a coincidence, not a dependency; it is never imported here).

const FIXTURE_A = [1, -1, 1, 1, -1, -1, 1, -1];
// Chosen so exactly 5 of 8 positions match FIXTURE_A (verified below), for
// the hand-computed partial-overlap case:
//   index:      0    1    2   3    4    5   6   7
//   FIXTURE_A:  1   -1    1   1   -1   -1   1  -1
//   FIXTURE_B:  1   -1   -1   1   -1    1   1   1
//   match?      y    y    n   y    y    n   y   n
// 5 matches / 8 positions -> 5/8 * 100 = 62.5%.
const FIXTURE_B = [1, -1, -1, 1, -1, 1, 1, 1];

test('similarity is exported as a function with the contracted arity (a, b)', () => {
  assert.equal(typeof similarity, 'function');
  assert.equal(similarity.length, 2);
});

test('identical vectors score 100', () => {
  assert.equal(similarity(FIXTURE_A, [...FIXTURE_A]), 100);
});

test('a fully inverted vector (every position flipped) scores 0', () => {
  // Bipolar {-1, +1} values are never 0, so a[i] === -a[i] never holds:
  // every position mismatches regardless of the specific pattern content.
  const inverted = FIXTURE_A.map(value => -value);
  assert.equal(similarity(FIXTURE_A, inverted), 0);
});

test('an all-(-1) vector vs. a real preset lands at chance level, not a deceptively high score', () => {
  // Regression test for the degenerate-matrix bug (see README_PHASE0.md,
  // "The degenerate-matrix bug"): an all-(-1) fixed point is exactly the
  // kind of output a broken write() can converge to, and it must score
  // near chance (~50%), not read as a plausible retrieval.
  //
  // Pulled from the real createPresetPatterns() (not a hand-rolled
  // fixture) so this breaks loudly if the preset data changes. presets[0]
  // is the 'l' shape (the same "first preset" used as the fixed probe
  // elsewhere in this codebase, e.g. guidedSequence.js) — hand-verifiable
  // from its ASCII rows in createPresetPatterns.js: 28 ON cells / 64
  // total, so 36 OFF cells, and OFF cells are exactly where an all-(-1)
  // vector matches: 36 / 64 = 56.25%. This matches the ~56% this exact
  // scenario produced in Person 2's original bug report almost exactly.
  const [{ pattern: target }] = createPresetPatterns();
  const allNegOnes = target.map(() => -1);
  assert.equal(similarity(allNegOnes, target), 56.25);
});

test('a hand-computed partial-overlap case returns the exact expected percentage', () => {
  // See the FIXTURE_A / FIXTURE_B comment above for the index-by-index
  // computation: 5/8 matches -> 62.5%.
  assert.equal(similarity(FIXTURE_A, FIXTURE_B), 62.5);
});

test('mismatched lengths throw instead of silently truncating or padding', () => {
  const a = [1, -1, 1];
  const b = [1, -1, 1, 1];
  assert.throws(() => similarity(a, b), /length/i);
});

test('similarity is deterministic: two independent calls on the same inputs agree', () => {
  assert.deepStrictEqual(similarity(FIXTURE_A, FIXTURE_B), similarity(FIXTURE_A, FIXTURE_B));
});

// Carried over from the Phase 0 test.todo() list (not re-stated in the
// Phase 1 task prompt, but not dropped either — see README_PHASE0.md,
// "Test-runner convention": every todo documents a required invariant to
// be turned into a real assertion, not deleted and re-derived).

test('similarity is symmetric: similarity(a, b) === similarity(b, a)', () => {
  assert.equal(similarity(FIXTURE_A, FIXTURE_B), similarity(FIXTURE_B, FIXTURE_A));
});

test('similarity(a, b) stays inside [0, 100] across every pair of real presets — the scale that makes it directly comparable to CONFIG.PASS_THRESHOLD (currently ' + CONFIG.PASS_THRESHOLD + ')', () => {
  const presets = createPresetPatterns();
  for (const { pattern: a } of presets) {
    for (const { pattern: b } of presets) {
      const score = similarity(a, b);
      assert.ok(score >= 0 && score <= 100, `expected a score in [0, 100], got ${score}`);
    }
  }
});
