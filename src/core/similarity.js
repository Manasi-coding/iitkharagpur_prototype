/**
 * Person 1 — pattern similarity scorer.
 *
 * Phase 1 implementation. Percentage of positions where a[i] === b[i], on a
 * 0-100 scale — the same scale as CONFIG.PASS_THRESHOLD, so a caller can
 * compare directly (e.g. `similarity(recovered, target) >=
 * CONFIG.PASS_THRESHOLD`).
 *
 * Note on scratch/stub-similarity.js: Person 2's throwaway
 * `computeSimilarity()` happens to use the same 0-100 scale and the same
 * exact-match technique. That's a coincidence worth recording (see
 * README_PHASE0.md, "Open assumptions"), not a shared contract — this file
 * implements the `similarity(a, b)` contract exactly as specified (name,
 * signature, scale) independently, and is not aliased to or coupled with
 * that file.
 *
 * Deliberately does not import CONFIG: the only validation this contract
 * requires is a.length === b.length, which needs no CONFIG value, and the
 * percentage must be computed against a.length, not against
 * CONFIG.PATTERN_DIM — this function has to work correctly on vectors of
 * any shared length, not only CONFIG.PATTERN_DIM, as exercised by
 * tests/similarity.test.js's short 8-element fixture.
 *
 * @param {number[]} a - a pattern vector
 * @param {number[]} b - a pattern vector, same length as a
 * @returns {number} percentage (0-100) of positions where a[i] === b[i]
 */
export function similarity(a, b) {
  if (a.length !== b.length) {
    throw new Error(`similarity: a.length (${a.length}) must equal b.length (${b.length})`);
  }

  const matchCount = a.filter((value, index) => value === b[index]).length;
  return (matchCount / a.length) * 100;
}
