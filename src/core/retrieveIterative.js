// Phase 2 — Person 2. Pure function, no state, no UI. Agnostic to how W was
// produced — takes it as a plain matrix, no import of any write() implementation.
import { CONFIG } from '../config.js';

// Same confirmed bipolar encoding as createPresetPatterns.js (ON=1, OFF=-1),
// carried forward from Phase 1 — not a new/separate decision here.
const ON = 1;
const OFF = -1;

function dotProduct(row, x) {
  // No initial value: summing a products array via reduce without a seed
  // still gives the correct total (associative), and avoids a bare 0 literal.
  return row.map((weight, index) => weight * x[index]).reduce((sum, term) => sum + term);
}

function matrixVectorProduct(W, x) {
  return W.map(row => dotProduct(row, x));
}

// sign(0): confirmed design choice, not an unstated default — when the
// weighted sum is exactly 0, keep the previous value rather than forcing +1
// or -1 (Hopfield convention, e.g. Hertz/Krogh/Palmer). Math.sign(weightedSum)
// is exactly one of {-1, 0, 1}; comparing it against the named ON/OFF
// constants (not bare 1/-1) handles the +1/-1 cases, and the zero case falls
// through to previousValue without ever comparing against a literal 0.
function nextElementValue(weightedSum, previousValue) {
  const signValue = Math.sign(weightedSum);
  if (signValue === ON) return ON;
  if (signValue === OFF) return OFF;
  return previousValue;
}

// "No change" is exact elementwise equality — CONFIG.CONVERGENCE_EPSILON is
// 0, so this is mathematically exact equality, NOT a real tolerance band.
// Written as an epsilon comparison (rather than a bare ===) so the CONFIG
// field is actually used, not just conceptually true at its current value —
// don't read the Math.abs/<= below as implying fuzzy matching is in play.
function elementwiseEqual(a, b) {
  return a.every((value, index) => Math.abs(value - b[index]) <= CONFIG.CONVERGENCE_EPSILON);
}

export function retrieveIterative(query, W, maxIter = CONFIG.MAX_ITERATIONS) {
  const iterationResults = [];
  let current = query;
  let converged = false;

  for (const _ of Array.from({ length: maxIter })) {
    const previous = current;
    current = matrixVectorProduct(W, previous).map((weightedSum, index) =>
      nextElementValue(weightedSum, previous[index])
    );
    iterationResults.push(current);
    if (elementwiseEqual(current, previous)) {
      converged = true;
      break;
    }
  }

  return {
    steps: [query, ...iterationResults],
    finalOutput: current,
    converged,
    iterationCount: iterationResults.length,
  };
}
