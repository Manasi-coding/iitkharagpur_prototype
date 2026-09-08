import test from 'node:test';
import assert from 'node:assert/strict';
import { findCrossover } from '../src/core/findCrossover.js';

// All thresholds below use the project's 0-100 similarity scale
// (matching CONFIG.PASS_THRESHOLD). No theoretical formula is referenced.

test('returns the first n where avgSimilarity falls below threshold', () => {
  const curve = [
    { n: 1, avgSimilarity: 98 },
    { n: 2, avgSimilarity: 91 },
    { n: 3, avgSimilarity: 87 }, // first crossing
    { n: 4, avgSimilarity: 72 },
  ];
  // n=3 is the first point below 90, not n=4 — even though n=4 is also below.
  assert.equal(findCrossover(curve, 90), 3);
});

test('returns the maximum n when no point falls below threshold', () => {
  const curve = [
    { n: 1, avgSimilarity: 98 },
    { n: 2, avgSimilarity: 95 },
    { n: 3, avgSimilarity: 92 },
  ];
  // All above 90 — entire sweep stayed above threshold, return max n.
  assert.equal(findCrossover(curve, 90), 3);
});

test('handles a crossing at n=1', () => {
  const curve = [
    { n: 1, avgSimilarity: 70 }, // immediately below threshold
    { n: 2, avgSimilarity: 60 },
    { n: 3, avgSimilarity: 50 },
  ];
  assert.equal(findCrossover(curve, 90), 1);
});

test('returns 0 for an empty curve (documented sentinel — not a meaningful crossover N)', () => {
  // Callers should guard `if (result === 0)` before treating the return
  // value as a real crossover N.
  assert.equal(findCrossover([], 90), 0);
});
