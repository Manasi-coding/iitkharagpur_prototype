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

// Fixed pedagogical checkpoints from the split doc — not tunable config, so
// not part of CONFIG, same treatment as CORRELATION_THRESHOLD in Phase 1.
// Confirmed with Person 2 (the "3/8/14/20 vs. zero-literal-rule" tension).
const GUIDED_STEPS = [3, 8, 14, 20];

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
// clean (zero-noise) query showed identical perfect recovery at N=3 and
// N=8 — no visible difference across the currently-reachable range. A 10%
// noised query showed a real transition (full correction at N=3, partial
// at N=8) over the same range. Chosen for that reason, not just theory.
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
    // Revisited at Phase 5 close-out: changed from throw to a graceful
    // blocked state. This does NOT fix the underlying preset shortage —
    // checkpoints 14/20 still cannot run, and Phase 6 still cannot reach
    // the N=20 ending until the team resolves that data gap — but a
    // defined, non-throwing return lets a setInterval-driven caller
    // (proveItMode.js) render an honest "blocked" state instead of
    // crashing on an uncaught exception. guidedStepIndex is deliberately
    // omitted (not reset) so a repeated call with the same input is
    // idempotent: it keeps returning this same blocked state rather than
    // erroring or drifting.
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
