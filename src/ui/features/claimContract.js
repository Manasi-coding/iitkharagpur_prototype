// Person 1 — UI feature: pinned claim header with a live pass/fail
// indicator.
//
// Phase 4 implementation. Two independent unknowns here, both flagged
// rather than silently resolved:
//
// 1. CLAIM WORDING: the one-sentence falsifiable claim this header
//    displays was never assigned an owner after the 4-person split doc's
//    four roles folded into three (originally Person D's deliverable).
//    Same open blocker as Person 2's item 5 (BDH-module/citations
//    ownership) — unresolved as of Phase 3, not mine to invent and
//    present as settled. PLACEHOLDER_CLAIM below is a clearly-labeled
//    stand-in, exported from this one place so swapping in the real
//    sentence later is a one-line edit here, not a hunt through the file
//    (tests/claimContract.test.js checks the text appears nowhere else in
//    this file).
//
// 2. STATE SHAPE: no stub-state.js exists anywhere in this repo as of
//    Phase 4 (checked directly — no state.js, real or stub, in src/ or
//    scratch/). Person B's "Hour-1 independence kit" mentioned in the
//    build-order convention either wasn't committed here or lives
//    somewhere this repo doesn't have. evaluateClaim() below takes a
//    plain similarityScore number, not a whole state object, specifically
//    to avoid guessing at a shape I can't see — but the field name itself,
//    `state.similarityScore` (a 0-100 number, same scale as
//    similarity()/CONFIG.PASS_THRESHOLD), is still an assumption, taken
//    from this phase's task description, not verified against any real or
//    stub file. Flag this the same way the claim wording is flagged:
//    unconfirmed until Person B's actual state.js (or a real stub of it)
//    exists to check against.
import { CONFIG } from '../../config.js';

// See note 1 above. Loudly provisional — do not treat this as the real
// claim, and do not let it silently become "the" claim by attrition.
export const PLACEHOLDER_CLAIM = '<claim text not yet finalized by team — see README_PHASE0.md>';

/**
 * Pure pass/fail verdict for the claim header. No DOM, no state.js
 * coupling — takes only the one number it actually needs, so it's
 * unit-testable exactly like write()/similarity()/injectNoise().
 *
 * @param {number} similarityScore - state.similarityScore, 0-100 (see note 2 above: this field name is an assumption, not a confirmed contract)
 * @param {Object} [options]
 * @param {number} [options.thresholdPct] - pass/fail cutoff (default CONFIG.PASS_THRESHOLD)
 * @returns {{ passed: boolean, similarityScore: number, thresholdPct: number }}
 */
export function evaluateClaim(similarityScore, options) {
  const { thresholdPct = CONFIG.PASS_THRESHOLD } = options ?? {};
  return {
    passed: similarityScore >= thresholdPct,
    similarityScore,
    thresholdPct,
  };
}

/**
 * Thin rendering-data layer: wires the placeholder claim text and the pure
 * verdict together into whatever a pinned header needs to display. Still
 * no DOM access — same "zero DOM dependencies anywhere in this project"
 * pattern as every other UI feature file here (guidedSequence.js,
 * proveItMode.js). Returns plain data; actually writing it to the page is
 * whoever wires the real page together, not built yet, same as those
 * files' output.
 *
 * `state` is taken as a plain argument, not imported from any state.js
 * path — no stub-state.js exists in this repo to import (see note 2
 * above), and guidedSequence.js already set the precedent for exactly
 * this situation: inject a dependency with a real stub-vs-real duality as
 * a plain argument rather than importing a specific path, so whoever
 * calls this decides which state (real, stub, or test fixture) to pass.
 * How/when this gets called as state actually changes (subscribe
 * callback, polling, a manual call per render) is state.js's concern, not
 * decided here.
 *
 * @param {{ similarityScore: number }} state
 * @returns {{ claimText: string, passed: boolean, indicator: string }}
 */
export function renderClaimHeader(state) {
  const verdict = evaluateClaim(state.similarityScore);
  return {
    claimText: PLACEHOLDER_CLAIM,
    passed: verdict.passed,
    indicator: verdict.passed ? '✓' : '✗',
  };
}
