// Person 1 — UI feature: checkbox-gated debug panel showing patternCount,
// noisePct, iterationCount, and a per-step similarity-to-target trace.
//
// Phase 5 implementation, the last file in Person 1's scope. Two design
// notes, both flagged rather than silently assumed:
//
// 1. THE ONE REAL COMPUTATION: per the original spec this feature is "pure
//    read from state — computes nothing new," EXCEPT the per-step
//    similarity numbers, which genuinely require calling similarity()
//    (Phase 1) against each step. buildRetrievalTrace() below is that one
//    exception, isolated on its own so it's obvious it's not just
//    formatting. Imports similarity() directly rather than
//    reimplementing the comparison — same "wire earlier work together"
//    pattern write.js's gate tests already used for
//    write/injectNoise/retrieveIterative/similarity.
//
// 2. STATE SHAPE: no stub-state.js exists anywhere in this repo (same
//    finding as Phase 4, re-confirmed here). The task names four fields
//    this panel reads — state.patternCount, state.noisePct,
//    state.retrievalResult.iterationCount, state.retrievalResult.steps —
//    which renderDebugPanel() below does read. It does NOT name what each
//    step's similarity should be measured *against* (there's no
//    state.target / state.targetPattern in that list). Rather than
//    guessing a fifth field name on top of four I was actually given,
//    `target` stays an explicit, separate parameter on both functions
//    here — same reasoning claimContract.js used for evaluateClaim()
//    taking a plain similarityScore instead of a whole state object.
//    Wherever the real state.js keeps the target pattern is a decision for
//    whoever wires the real page together, not guessed here.
import { similarity } from '../../core/similarity.js';

/**
 * The one real computation in this file: maps every entry in
 * retrievalResult.steps through similarity(step, target). Also surfaces
 * iterationCount alongside it, since a caller building a trace naturally
 * wants both — that part is a plain passthrough, no computation.
 *
 * Zero-drift by construction: this calls the exact same similarity()
 * Phase 1 exports, so a caller comparing this panel's numbers against a
 * direct similarity(step, target) call for the same step will always find
 * them identical — there's no second, differently-written comparison to
 * drift out of sync with. See tests/traceDebugPanel.test.js for the
 * pairwise check.
 *
 * @param {{ steps: number[][], iterationCount: number }} retrievalResult - output of retrieveIterative() (or any object shaped like it)
 * @param {number[]} target - the pattern each step's similarity is measured against
 * @returns {Array<{ step: number, similarityToTarget: number }>} per-step trace, same length and order as retrievalResult.steps
 */
export function buildRetrievalTrace(retrievalResult, target) {
  return retrievalResult.steps.map((step, index) => ({
    step: index,
    similarityToTarget: similarity(step, target),
  }));
}

/**
 * Thin state-reading layer: pulls exactly the fields the spec names
 * (state.patternCount, state.noisePct, state.retrievalResult.iterationCount,
 * state.retrievalResult.steps) and relabels/combines them into whatever
 * the panel needs to display. No DOM access — same "zero DOM dependencies
 * anywhere in this project" pattern as every other UI feature file here
 * (guidedSequence.js, proveItMode.js, claimContract.js). Whether/when the
 * panel is actually shown is the checkbox-gating UI's concern, not
 * modeled here — this only computes what it WOULD show.
 *
 * Beyond delegating to buildRetrievalTrace() for the per-step numbers,
 * every field below is a direct, unmodified read — if this function ever
 * needs to transform a value beyond renaming it, that's a sign the logic
 * belongs in a pure helper instead, not inline here.
 *
 * `state` is taken as a plain argument, not imported from any state.js
 * path — no stub-state.js exists in this repo to import (see note 2
 * above), same precedent guidedSequence.js and claimContract.js already
 * set for a dependency with a real stub-vs-real duality.
 *
 * @param {{ patternCount: number, noisePct: number, retrievalResult: { steps: number[][], iterationCount: number } }} state
 * @param {number[]} target - the pattern each step's similarity is measured against (see note 2 above: not assumed to live inside state)
 * @returns {{ patternCount: number, noisePct: number, iterationCount: number, trace: Array<{ step: number, similarityToTarget: number }> }}
 */
export function renderDebugPanel(state, target) {
  return {
    patternCount: state.patternCount,
    noisePct: state.noisePct,
    iterationCount: state.retrievalResult.iterationCount,
    trace: buildRetrievalTrace(state.retrievalResult, target),
  };
}
