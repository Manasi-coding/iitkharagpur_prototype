import test from 'node:test';
import assert from 'node:assert/strict';
import { createPresetPatterns, CORRELATION_THRESHOLD } from '../src/core/createPresetPatterns.js';
import { similarity } from '../src/core/similarity.js';
import { CONFIG } from '../src/config.js';

// Phase 6. Closes Person 2's outstanding item 3: "Presets never checked
// against the real (non-stub) similarity()." Person 2's own correlation
// check (createPresetPatterns.js's internal positionalMatchFraction, and
// the identical copy in tests/createPresetPatterns.test.js) was
// deliberately built independent of any similarity.js — per that file's
// own Phase 1 comment: "no imports from Person 1's write()/similarity()/
// injectNoise() (real or stub)." That was the right call when
// similarity.js didn't exist yet, but it meant the presets were never
// actually verified against the REAL similarity() used everywhere else in
// this app. This file closes that gap, now that similarity.js is real
// (Phase 1) and stable.
//
// NEW FILE, not an addition to tests/createPresetPatterns.test.js: keeping
// this separate leaves Person 2's existing, already gate-passed test file
// untouched, and preserves the independence their own comments went out of
// their way to establish (that file still imports nothing from Person 1's
// scope after this phase). This file's entire purpose is the opposite —
// cross-checking against similarity() specifically — so it belongs on its
// own, not folded into the file it's re-verifying.
//
// SCALE CONVERSION (read before touching either number below):
// CORRELATION_THRESHOLD (createPresetPatterns.js) is 0.70 on a 0-1
// fraction scale. similarity() (Phase 1) returns 0-100, a percentage.
// These are not directly comparable without converting one to the other's
// scale — exactly the kind of mismatch that produced a real, silently
// wrong number once already in this project (Phase 1: Person 2's
// scratch/stub-similarity.js divided by the constant CONFIG.PATTERN_DIM
// instead of the actual input length, and gave a wrong answer on
// non-PATTERN_DIM-length input). Here the conversion is simple —
// multiply the 0-1 fraction by 100 — but it still gets a name
// (CORRELATION_THRESHOLD_PCT) and gets computed once, rather than repeated
// as a bare "* 100" at every comparison site.
const CORRELATION_THRESHOLD_PCT = CORRELATION_THRESHOLD * 100;

// Mirrors createPresetPatterns.js's own internal positionalMatchFraction
// exactly (matchCount / CONFIG.PATTERN_DIM) — that function isn't
// exported (by design: its own comment calls it "independent from Person
// 1's similarity(),"a build-time-only check on that file's own data), so
// this is a second, independently-typed copy of the same small algorithm,
// not an import. That's deliberate, not a shortcut: the whole point of
// this file is comparing two independently-implemented checks against
// each other, so importing one into the other's test would defeat the
// exercise. Returned already converted to the 0-100 scale.
function positionalMatchPct(patternA, patternB) {
  const matchCount = patternA.filter((value, index) => value === patternB[index]).length;
  return (matchCount / CONFIG.PATTERN_DIM) * 100;
}

test('every pair of real presets, scored by the real similarity(), stays within CORRELATION_THRESHOLD (converted to the 0-100 scale)', () => {
  const presets = createPresetPatterns();
  for (const presetA of presets) {
    for (const presetB of presets) {
      if (presetA === presetB) continue;
      const score = similarity(presetA.pattern, presetB.pattern);
      assert.ok(
        score <= CORRELATION_THRESHOLD_PCT,
        `"${presetA.id}" and "${presetB.id}" score ${score}% by the real similarity(), exceeding CORRELATION_THRESHOLD_PCT (${CORRELATION_THRESHOLD_PCT}%)`
      );
    }
  }
});

test('the real similarity() and the independent positionalMatchFraction check agree on every pair — including, specifically, which pair is worst', () => {
  const presets = createPresetPatterns();
  const disagreements = [];
  let worstBySimilarity = null;
  let worstByPositionalMatch = null;

  for (const presetA of presets) {
    for (const presetB of presets) {
      if (presetA === presetB) continue;
      const bySimilarity = similarity(presetA.pattern, presetB.pattern);
      const byPositionalMatch = positionalMatchPct(presetA.pattern, presetB.pattern);

      // Checked on every pair, not just the worst one — a discrepancy
      // anywhere would be a previously-undetected bug in one of the two
      // independent checks, not something to notice only at the extreme.
      if (bySimilarity !== byPositionalMatch) {
        disagreements.push({ a: presetA.id, b: presetB.id, bySimilarity, byPositionalMatch });
      }
      if (!worstBySimilarity || bySimilarity > worstBySimilarity.score) {
        worstBySimilarity = { a: presetA.id, b: presetB.id, score: bySimilarity };
      }
      if (!worstByPositionalMatch || byPositionalMatch > worstByPositionalMatch.score) {
        worstByPositionalMatch = { a: presetA.id, b: presetB.id, score: byPositionalMatch };
      }
    }
  }

  // Reported side by side regardless of pass/fail — this is the actual
  // close-out evidence for Person 2's item 3, not just a pass/fail bit.
  console.log(
    `[presetCorrelation] worst pair by real similarity():          ${worstBySimilarity.a}/${worstBySimilarity.b} at ${worstBySimilarity.score}%`
  );
  console.log(
    `[presetCorrelation] worst pair by positionalMatchFraction:    ${worstByPositionalMatch.a}/${worstByPositionalMatch.b} at ${worstByPositionalMatch.score}%`
  );

  if (disagreements.length > 0) {
    console.error(
      `[presetCorrelation] DISAGREEMENT: similarity() and positionalMatchFraction differ on ${disagreements.length} pair(s):`,
      JSON.stringify(disagreements)
    );
  }

  assert.deepStrictEqual(disagreements, [], 'similarity() and positionalMatchFraction must agree exactly on every pair — see the logged detail above if this fails');

  // Order-independent: {a,b} and {b,a} name the same pair.
  const samePair =
    (worstBySimilarity.a === worstByPositionalMatch.a && worstBySimilarity.b === worstByPositionalMatch.b) ||
    (worstBySimilarity.a === worstByPositionalMatch.b && worstBySimilarity.b === worstByPositionalMatch.a);
  assert.ok(
    samePair,
    `worst-pair disagreement: similarity() says ${worstBySimilarity.a}/${worstBySimilarity.b}, positionalMatchFraction says ${worstByPositionalMatch.a}/${worstByPositionalMatch.b}`
  );
  assert.equal(worstBySimilarity.score, worstByPositionalMatch.score);
});
