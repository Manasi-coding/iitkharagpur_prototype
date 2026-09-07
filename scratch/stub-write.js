// STUB — throwaway placeholder for Person 1's real write().
// Delete at Sync Point 1/2 once src/core's real write() lands.
// Shared Phase 0 scratch file, not one of Person 2's four owned files —
// extended during Phase 2 (by Person 2) to optionally accept patterns and
// build a real Hebbian matrix for retrieval testing. See the comment below
// for why. Zero-arg behavior is unchanged (verified against the Phase 0
// smoke test).
import { CONFIG } from '../src/config.js';

// Phase 2 addition: optional patterns build a minimal Hebbian outer-product
// matrix (classic rule, zeroed diagonal) so retrieveIterative() has something
// structurally meaningful to converge against — a pure-random matrix "converges"
// to a degenerate fixed point unrelated to any stored pattern. No bias, decay,
// or sparsity handling here — those stay Person 1's real write() concerns.
// Falls back to the original random matrix when called with no patterns, so
// any existing zero-arg callers are unaffected.
export function write(patterns = []) {
  if (patterns.length === 0) {
    return Array.from({ length: CONFIG.PATTERN_DIM }, () =>
      Array.from({ length: CONFIG.PATTERN_DIM }, () => Math.random())
    );
  }

  return Array.from({ length: CONFIG.PATTERN_DIM }, (_, i) =>
    Array.from({ length: CONFIG.PATTERN_DIM }, (_, j) =>
      i === j ? 0 : patterns.map(pattern => pattern[i] * pattern[j]).reduce((sum, term) => sum + term)
    )
  );
}
