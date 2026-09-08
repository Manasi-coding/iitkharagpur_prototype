// Phase 5 — Person 2. UI feature, but the core stepping logic is a pure
// function: no subscribe/setState coupling, no dependency on any specific
// state.js implementation (none exists yet, real or stub). Takes current
// progress and a write() implementation as plain arguments, returns a
// partial state update matching the split doc's state contract shape.
// Reusable as-is by a manual "Next" click handler (this phase) and by
// proveItMode.js's setInterval (next phase) — same function, either caller.
import { CONFIG } from '../../config.js';
import { createPresetPatterns } from '../../core/createPresetPatterns.js';
import { retrieveIterative } from '../../core/retrieveIterative.js';

// Fixed pedagogical checkpoints — not tunable config, so not part of
// CONFIG, same treatment as CORRELATION_THRESHOLD in Phase 1.
//
// Lowered from the split doc's original [3, 8, 14, 20] to fit the actual
// 9 available presets (createPresetPatterns.js stays untouched — this is
// the checkpoint list adapting to the data, not the other way around).
// Chosen from real measurements across every N from 1 to 9 (real write(),
// real similarity(), this file's own probe/noise convention), not
// guessed: N=1-3 all recover exactly (100%); degradation appears at N=4
// and stays flat through N=7 (92.19%, tied — not a smooth capacity
// curve, a real feature of these correlation-controlled shapes, not
// random patterns); N=8-9 partially recover (96.875%). [3, 5, 7, 9] was
// picked over ending at the literal worst point (N=7, 92.19%) so the
// sequence still reaches the actual maximum available preset count —
// the honest tradeoff is that the final checkpoint is real degradation
// (96.875%, not exact) but not the single worst measured point.
// Confirmed with Person 2.
const GUIDED_STEPS = [3, 5, 7, 9];

if (Math.max(...GUIDED_STEPS) > CONFIG.MAX_PATTERNS) {
  throw new Error(
    `guidedSequence: GUIDED_STEPS contains a checkpoint exceeding CONFIG.MAX_PATTERNS (${CONFIG.MAX_PATTERNS})`
  );
}

function nextCheckpoint(lastN) {
  if (lastN == null) {
    // == (not ===) intentionally matches both null and undefined.
    const [first] = GUIDED_STEPS;
    return first;
  }
  // Skip past lastN itself (elision), take whatever comes after it —
  // undefined once lastN was already the final checkpoint.
  const [, next] = GUIDED_STEPS.slice(GUIDED_STEPS.indexOf(lastN));
  return next;
}

// Revisited at Phase 5 close-out: the whole point of the guided sequence is
// to VISIBLY demonstrate degradation across checkpoints. Empirically, a
// clean (zero-noise) query showed identical perfect recovery across the
// then-reachable checkpoints — no visible difference at all. A 10% noised
// query showed a real transition instead. Chosen for that reason, not just
// theory; this decision doesn't depend on the exact checkpoint values
// above and wasn't re-litigated when GUIDED_STEPS was later lowered to fit
// the actual preset count.
//
// Deliberately NOT a stub-injectNoise.js: this is a tiny, fixed-fraction
// bit flip, not an attempt to replicate whatever richer contract Person 1's
// real injectNoise() may have (options, variable rates, etc.) — same
// technique already used locally in tests/retrieveIterative.test.js's
// addNoise, not a claim of contract-equivalence with the real module.
const NOISE_FRACTION = 0.10;

function withNoise(pattern) {
  const flipCount = Math.round(NOISE_FRACTION * pattern.length);
  return pattern.map((value, index) => (index < flipCount ? -value : value));
}

// Confirmed: always probes with the first stored preset (same fixed probe
// pattern at every checkpoint, only the stored-set size N changes) — the
// standard fixed-probe/vary-N capacity-curve design.
//
// `write` is injected (not imported) because it's the one dependency with a
// real stub-vs-real duality today — same reasoning as retrieveIterative()
// taking W as a plain argument. Whoever calls this decides which write() to
// pass; this file never imports scratch/stub-write.js.
export function advanceGuidedSequence(guidedStepIndex, write) {
  const lastN = guidedStepIndex == null ? null : GUIDED_STEPS[guidedStepIndex];
  const nextN = nextCheckpoint(lastN);

  if (nextN === undefined) {
    // Sequence already completed — a normal terminal state, not an error,
    // so a "Next" click or setInterval tick that fires once too often is a
    // harmless no-op rather than a throw.
    return { guidedSequenceActive: false };
  }

  const allPresets = createPresetPatterns();
  if (nextN > allPresets.length) {
    // Not expected to trigger in normal operation anymore: GUIDED_STEPS'
    // max (9) now matches the actual preset count exactly, so this branch
    // is a safety net against future drift (e.g. presets ever dropping
    // below 9), not an active, expected path the way it was when
    // GUIDED_STEPS still went up to 20. Left in place rather than removed
    // — the graceful-return behavior (non-throwing, idempotent on repeat
    // calls) is still correct defensive design regardless of whether it
    // currently fires. guidedStepIndex is deliberately omitted (not reset)
    // so a repeated call with the same input stays idempotent rather than
    // erroring or drifting, if this branch is ever actually reached.
    return {
      guidedSequenceActive: false,
      blocked: true,
      reason: 'insufficient-presets',
      requestedN: nextN,
      availableN: allPresets.length,
    };
  }

  const storedPatterns = allPresets.filter((_, index) => index < nextN);
  const [probePreset] = storedPatterns;
  const currentQuery = withNoise(probePreset.pattern);

  const W = write(storedPatterns.map(preset => preset.pattern));
  const retrievalResult = retrieveIterative(currentQuery, W);

  return {
    guidedStepIndex: GUIDED_STEPS.indexOf(nextN),
    patternCount: nextN,
    storedPatterns,
    currentQuery,
    retrievalResult,
    guidedSequenceActive: nextCheckpoint(nextN) !== undefined,
  };
}
