import { similarity } from './similarity.js';

/**
 * Calculates the pairwise similarity between all patterns in a given array.
 * 
 * @param {Array<{id: string, pattern: number[]}>} patterns - Array of pattern objects
 * @returns {Array<{sourceId: string, targetId: string, similarity: number}>} - Array of similarity edges
 */
export function calculatePairwiseSimilarities(patterns) {
  const similarities = [];
  for (let i = 0; i < patterns.length; i++) {
    for (let j = i + 1; j < patterns.length; j++) {
      const p1 = patterns[i];
      const p2 = patterns[j];
      const sim = similarity(p1.pattern, p2.pattern);
      similarities.push({
        sourceId: p1.id,
        targetId: p2.id,
        similarity: sim
      });
    }
  }
  return similarities;
}
