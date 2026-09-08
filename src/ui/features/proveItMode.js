// Phase 6 — Person 2. Calls the exact same advanceGuidedSequence from
// guidedSequence.js, triggered by setInterval instead of manual clicks/calls.
// No stepping logic is reimplemented here.
//
// RESOLVED (previously an unresolved gap): guidedSequence.js's
// GUIDED_STEPS was lowered from [3, 8, 14, 20] to [3, 5, 7, 9] to fit the
// actual 9 available presets (createPresetPatterns.js itself untouched —
// the checkpoint list adapted to the data). All 4 checkpoints now reach a
// real result; the insufficient-presets blocked state is no longer
// expected to occur in normal operation (guidedSequence.js keeps it as a
// safety net, not an active path). What this file actually demonstrates
// now: N=3 (exact recovery) -> N=5 (degradation appears) -> N=7 (same
// degradation, holds steady) -> N=9 (the real ceiling — still imperfect,
// not a dramatic collapse; see the caption below for the honest framing
// of what this data actually shows).
import { advanceGuidedSequence } from './guidedSequence.js';

// 60-second Prove-It budget (split doc), distributed across the ticks
// actually reachable — now 4 real ticks (was 3, before GUIDED_STEPS
// included a blocked ending). Recomputed with the same formula as before
// (60s / reachable-tick-count), not a new arbitrary choice: 60s / 4 =
// 15s/tick. Leaving this at the old 20s/tick would have made a full run
// take 80 real seconds, silently breaking the "60-second Prove-It"
// framing — checked before changing, not assumed. Not part of CONFIG
// (per-file timing, not shared state), same treatment as GUIDED_STEPS.
// Exported so verification code can derive real wait times from this exact
// value instead of duplicating it as a second, driftable literal.
export const PROVE_IT_INTERVAL_MS = 15000;

// Mirrors guidedSequence.js's GUIDED_STEPS (not exported there, and this
// file must not modify that file to export it) — restated here only for
// caption lookup, not a new design decision. Risk: if GUIDED_STEPS ever
// changes again, these must be updated in lockstep — nothing enforces
// that automatically.
const CLEAN_RECALL_N = 3;
const MID_RANGE_N = 5;
const NEAR_LIMIT_N = 7;
const FINAL_N = 9;

// UI copy — rewritten to match real measured behavior at each new
// checkpoint (real write(), real similarity()), not old captions with
// numbers swapped in. N=3 stayed at 100% under the new checkpoints too,
// so that one line is unchanged; the rest are new because the values are.
const CAPTIONS = {
  [CLEAN_RECALL_N]: '3 patterns stored. 10% noise in, exact pattern out.',
  [MID_RANGE_N]: '5 patterns stored. Noise no longer fully corrected.',
  [NEAR_LIMIT_N]: '7 patterns stored. Recall holds at the same imperfect level as N=5 — not getting worse yet.',
  [FINAL_N]: '9 patterns stored — the real limit of what this preset set can hold. Recall never fully returns to the original, even here.',
};
// No longer expected to fire in normal operation — GUIDED_STEPS' max now
// matches the actual preset count exactly (see guidedSequence.js). Kept as
// a defensive fallback, matching that file's own "safety net, not an
// active path" treatment of the same branch, rather than deleted.
const BLOCKED_CAPTION = '9 patterns stored — preset budget reached, not a capacity failure. See the BDH comparison for the real crossover.';

function captionFor(result) {
  if (result.blocked) return BLOCKED_CAPTION;
  return CAPTIONS[result.patternCount];
}

// setInterval structurally requires something to persist across ticks — the
// running guidedStepIndex, since each advanceGuidedSequence call needs the
// previous call's result as input. Scoped to this closure alone (per
// startProveIt call), not module-level, not a stand-in for state.js —
// discarded the moment the interval stops. Two concurrent startProveIt
// calls would not share or clobber each other's progress.
export function startProveIt(write, onStep) {
  let guidedStepIndex = null;

  const intervalId = setInterval(() => {
    const result = advanceGuidedSequence(guidedStepIndex, write);
    guidedStepIndex = result.guidedStepIndex ?? guidedStepIndex;
    onStep({ ...result, caption: captionFor(result) });
    if (!result.guidedSequenceActive) {
      clearInterval(intervalId);
    }
  }, PROVE_IT_INTERVAL_MS);

  return { stop: () => clearInterval(intervalId) };
}
