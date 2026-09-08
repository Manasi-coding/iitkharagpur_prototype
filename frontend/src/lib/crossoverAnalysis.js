// Local reimplementation of src/core/findCrossover.js's pure contract, plus
// the two src/ui/features/ helpers that depend on it (bdhCallout.js,
// predictGate.js).
//
// Why this file exists instead of importing those three directly: the repo
// copy of src/core/findCrossover.js is saved in a non-UTF-8 encoding (a
// pre-existing issue, unrelated to this integration). Vite/rolldown refuses
// to load non-UTF-8 source and fails the whole build. findCrossover.js is a
// read-only file under src/core/ per the integration brief, so its encoding
// cannot be fixed here — this reimplements its exact documented contract
// (and the two callers that import it) so the frontend build isn't blocked,
// without touching the original files.

// Mirrors src/core/findCrossover.js exactly: smallest n where avgSimilarity
// falls below threshold, or the max n present if none do; empty curve -> 0.
export function findCrossover(curve, threshold) {
  if (curve.length === 0) return 0;

  for (const { n, avgSimilarity } of curve) {
    if (avgSimilarity < threshold) return n;
  }

  return Math.max(...curve.map((point) => point.n));
}

// Mirrors src/ui/features/bdhCallout.js's buildBdhCallout exactly.
export function buildBdhCallout(capacityCurves, threshold) {
  const { classical, sparse } = capacityCurves;
  const classicalCrossover = findCrossover(classical, threshold);
  const sparseCrossover = findCrossover(sparse, threshold);

  return {
    text: `Classical degrades at N=${classicalCrossover}; BDH-mode holds until N=${sparseCrossover}.`,
    classicalCrossover,
    sparseCrossover,
  };
}

// Mirrors src/ui/features/predictGate.js's submitPrediction exactly.
export function submitPrediction(guess, curve, threshold) {
  const numericGuess = Number(guess);

  if (!Number.isFinite(numericGuess)) {
    throw new Error('submitPrediction: guess must be a finite number');
  }

  const measuredCrossover = findCrossover(curve, threshold);

  return {
    revealed: true,
    guess: numericGuess,
    measuredCrossover,
    delta: numericGuess - measuredCrossover,
  };
}
