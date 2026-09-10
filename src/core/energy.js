// Phase attractor — Person 3.
// Pure deterministic function (no side effects, no module-level mutable state).
//
// Computes the standard Hopfield network energy for a given state vector s
// and weight matrix W:
//
//   E(s) = -0.5 * s^T * W * s
//        = -0.5 * Σ_i Σ_j W[i][j] * s[i] * s[j]
//
// References:
//   Hopfield (1982) "Neural networks and physical systems with emergent
//   collective computational abilities", PNAS.
//
// Constraints:
// - Does not import write(), retrieve(), or any other core module.
// - Does not assume W is symmetric (though real write() produces symmetric W).
// - Does not modify s or W.
// - Returns a scalar (negative when pattern is stored; increases toward 0 on noise).

/**
 * computeEnergy(s, W): number
 *
 * Computes the Hopfield energy E(s) = -0.5 * s^T * W * s for state s
 * under weight matrix W.
 *
 * Energy is always a finite scalar. For a well-learned stored pattern,
 * energy is a local minimum (most negative). Noisy or spurious states
 * have higher (less negative) energy. Retrieval proceeds by descending
 * the energy landscape toward a minimum.
 *
 * This function visualizes ACTUAL retrieval states — it does NOT
 * interpolate or fabricate intermediate states.
 *
 * @param {number[]} s
 *   Bipolar state vector (+1 / -1). Length must match W dimension.
 *   Not mutated.
 *
 * @param {number[][]} W
 *   Square weight matrix (dim × dim). Produced by write().
 *   Not mutated.
 *
 * @returns {number}
 *   Hopfield energy scalar. More negative = deeper attractor basin.
 *   Zero W gives zero energy.
 */
export function computeEnergy(s, W) {
  const dim = s.length;
  let total = 0;

  // E = -0.5 * Σ_i Σ_j W[i][j] * s[i] * s[j]
  // Iterate over all (i, j) pairs, accumulate the double sum.
  // Using explicit loops rather than flatMap/reduce to keep the
  // O(dim²) inner loop allocation-free — critical for 64×64 matrices
  // called per retrieval step in the animation loop.
  for (let i = 0; i < dim; i++) {
    const si = s[i];
    const row = W[i];
    for (let j = 0; j < dim; j++) {
      total += row[j] * si * s[j];
    }
  }

  return -0.5 * total;
}
