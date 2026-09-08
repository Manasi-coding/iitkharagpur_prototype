// STOPGAP — Person 2, built because Person B's real state.js/layout.js/
// render.js haven't landed and our features (guidedSequence.js,
// proveItMode.js) were blocked without something to mount against.
// Bare-bones, spec-exact (Section 3.2), NOT a final design — supersede
// this file cleanly once Person B's real frontend work lands.
import { CONFIG } from '../config.js';
import { createPresetPatterns } from '../core/createPresetPatterns.js';
import { write } from '../core/write.js';
import { retrieveIterative } from '../core/retrieveIterative.js';
import { similarity } from '../core/similarity.js';
import { injectNoise } from '../core/injectNoise.js';

const subscribers = new Set();
let state = null;

export function getState() {
  return state;
}

export function subscribe(callback) {
  subscribers.add(callback);
  return () => subscribers.delete(callback);
}

// Design decision, flagged (not silently baked in): these four fields
// drive an automatic recompute of storedPatterns/currentQuery/
// retrievalResult/similarityScore through the REAL core pipeline, per the
// spec's "setState must call the real core functions." But
// guidedSequence.js/proveItMode.js already compute their OWN
// retrievalResult (using their own fixed-prefix noise convention, not
// injectNoise) — if setState recomputed unconditionally, it would silently
// discard that already-correct result and overwrite it with a DIFFERENT
// one derived from the current slider values instead. So: if a partial
// already includes its own `retrievalResult`, it's trusted as-is and NOT
// recomputed. Sliders never include `retrievalResult` in what they set, so
// this doesn't affect slider-driven updates at all.
const CONTROL_FIELDS = ['patternCount', 'noisePct', 'decayValue', 'sparseMode'];

function deriveFromControls(current) {
  const allPresets = createPresetPatterns();
  const storedPatterns = allPresets.filter((_, index) => index < current.patternCount);
  const [basePreset] = storedPatterns.length > 0 ? storedPatterns : allPresets;

  const currentQuery = injectNoise(basePreset.pattern, current.noisePct);
  const W = write(
    storedPatterns.map(preset => preset.pattern),
    { sparse: current.sparseMode, decay: current.decayValue }
  );
  const retrievalResult = retrieveIterative(currentQuery, W);
  const similarityScore = similarity(retrievalResult.finalOutput, basePreset.pattern);

  return { storedPatterns, currentQuery, retrievalResult, similarityScore };
}

export function setState(partial) {
  const next = { ...state, ...partial };

  const touchesControls = CONTROL_FIELDS.some(field => field in partial);
  const callerSuppliedResult = 'retrievalResult' in partial;

  if (touchesControls && !callerSuppliedResult) {
    Object.assign(next, deriveFromControls(next));
  }

  state = next;
  subscribers.forEach(callback => callback(state));
}

// On-load default: small pattern count, low noise, guaranteed-sane
// recovery — mirrors conventions already established elsewhere in this
// project (N=3, 10% noise) rather than inventing new arbitrary defaults.
// storedPatterns/currentQuery/retrievalResult/similarityScore are derived
// automatically by the control-field recompute above, not hand-set here —
// the page never renders blank because this call runs at import time.
setState({
  patternCount: 3,
  noisePct: 10,
  decayValue: CONFIG.DECAY_DEFAULT,
  sparseMode: false,
  capacityCurves: { classical: [], sparse: [] },
  guidedSequenceActive: false,
  guidedStepIndex: null,
});
