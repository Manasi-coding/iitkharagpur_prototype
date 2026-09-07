// Phase 6 — Person 2. Calls the exact same advanceGuidedSequence from
// guidedSequence.js, triggered by setInterval instead of manual clicks/calls.
// No stepping logic is reimplemented here.
//
// KNOWN, UNRESOLVED GAP (not fixed here, not worked around): only 9 presets
// exist, so advanceGuidedSequence cannot reach or complete N=20. The real
// "ends on N=20 failure state" requirement is UNSATISFIABLE until the team
// closes the preset-count-vs-MAX_PATTERNS gap (already broadcast to
// Person 3/Person 1, unresolved as of this phase). What this file can
// actually demonstrate today: N=3 -> N=8 -> a defined blocked state at the
// N=14 gate. That blocked state is NOT the real ending and must not be
// presented as one.
import { advanceGuidedSequence } from './guidedSequence.js';

// 60-second Prove-It budget (split doc), distributed across the 3 ticks
// actually reachable today (N=3, N=8, then blocked at the N=14 gate) — not
// the full 4-checkpoint design, since N=20 is unreachable (see above).
// 60s / 3 = 20s/tick. Confirmed with Person 2. Not part of CONFIG (per-file
// timing, not shared state), same treatment as GUIDED_STEPS in Phase 5.
// Exported so verification code can derive real wait times from this exact
// value instead of duplicating it as a second, driftable literal.
export const PROVE_IT_INTERVAL_MS = 20000;

// Mirrors the first two entries of guidedSequence.js's GUIDED_STEPS (not
// exported there, and this file must not modify that file to export it) —
// restated here only for caption lookup, not a new design decision. Risk:
// if GUIDED_STEPS ever changes, these must be updated in lockstep — nothing
// enforces that automatically.
const CLEAN_RECALL_N = 3;
const NEAR_LIMIT_N = 8;

// UI copy — approved by Person 2.
const CAPTIONS = {
  [CLEAN_RECALL_N]: '3 patterns stored. 10% noise in, exact pattern out.',
  [NEAR_LIMIT_N]: '8 patterns stored. Noise no longer fully corrected.',
};
const BLOCKED_CAPTION = 'Halted before N=14: insufficient stored presets, not a capacity failure.';

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
