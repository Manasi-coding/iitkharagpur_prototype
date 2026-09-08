// Phase person3/sweep-crossover-bdh — Person 3.
// Pure function. No imports, no state, no side effects.
// Reports only what the measured curve shows; does NOT reference or implement
// any theoretical capacity formula (e.g. ~0.138N or any variant thereof).

/**
 * findCrossover(curve, threshold): number
 *
 * Returns the smallest n in curve where avgSimilarity falls strictly below
 * threshold. Assumes curve is in ascending-n order (first-match semantics apply
 * regardless of actual ordering, but ascending order gives the intended result).
 *
 * If no point falls below the threshold, returns the maximum n present in
 * the curve — the sweep ran its full range without a recall failure at this
 * threshold.
 *
 * Empty curve: returns 0 as a documented sentinel. Zero is not a valid n in
 * any real sweep (n starts at 1), so callers can guard with `if (result === 0)`
 * before treating the return value as a meaningful crossover N.
 *
 * @param {{ n: number, avgSimilarity: number }[]} curve
 *   Ordered sweep results as returned by sweepCapacity().
 * @param {number} threshold
 *   Similarity value (0-100 scale, matching CONFIG.PASS_THRESHOLD) below which
 *   recall is considered failed.
 * @returns {number}
 */
export function findCrossover(curve, threshold) {
  if (curve.length === 0) {
    // No data: return 0 as a documented sentinel. Callers should not interpret
    // this as a meaningful crossover N without checking curve.length first.
    return 0;
  }

  for (const { n, avgSimilarity } of curve) {
    if (avgSimilarity < threshold) {
      return n;
    }
  }

  // No point fell below threshold — return the largest n in the curve.
  return Math.max(...curve.map(point => point.n));
}
