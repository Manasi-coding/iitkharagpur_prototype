// REAL implementation (not faked) — cheap percentage-match, allowed per team split.
// Compares two length-CONFIG.PATTERN_DIM vectors by exact element match and
// returns a score on the same 0-100 scale as CONFIG.PASS_THRESHOLD.
import { CONFIG } from '../src/config.js';

export function computeSimilarity(vectorA, vectorB) {
  const matchCount = vectorA.filter((value, index) => value === vectorB[index]).length;
  // Plain 100 here, not derived from CONFIG: this is a throwaway stub, and a
  // dedicated percent-scale constant (if needed) is a team config.js call at
  // Sync Point 1, not something to invent in a personal stub file.
  return (matchCount / CONFIG.PATTERN_DIM) * 100;
}
