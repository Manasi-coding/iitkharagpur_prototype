import { write } from './write.js';
import { retrieveIterative } from './retrieveIterative.js';
import { similarity } from './similarity.js';

/**
 * Evaluates removing each currently stored pattern one at a time to find the removal
 * that produces the highest retrieval similarity for a given query.
 *
 * @param {Array<{id: string, pattern: number[]}>} storedPatterns - Current preset objects in memory
 * @param {number[]} currentQuery - The noisy query pattern
 * @param {number[]} groundTruthPattern - The target pattern to measure similarity against
 * @param {Object} options - Write options { sparse, decay }
 * @returns {Object|null} The recommended removal, or null if optimization cannot be performed
 */
export function optimizeMemory(storedPatterns, currentQuery, groundTruthPattern, options = {}) {
  if (!storedPatterns || storedPatterns.length <= 1) {
    return null; // Cannot optimize if 1 or 0 patterns remain
  }

  let bestSimilarity = -1;
  let recommendedIndex = -1;

  for (let i = 0; i < storedPatterns.length; i++) {
    // 1. Temporarily remove the pattern at index i
    const candidatePatterns = storedPatterns.filter((_, index) => index !== i);

    // 2. Rebuild the weight matrix using existing write() logic
    const W = write(candidatePatterns.map(p => p.pattern), options);

    // 3 & 4. Run the existing retrieval with the SAME query
    const result = retrieveIterative(currentQuery, W);

    // 5. Calculate similarity using existing similarity()
    const score = similarity(result.finalOutput, groundTruthPattern);

    // Track the highest measured similarity
    if (score > bestSimilarity) {
      bestSimilarity = score;
      recommendedIndex = i;
    }
  }

  // If we found a recommendation
  if (recommendedIndex !== -1) {
    return {
      recommendedPattern: storedPatterns[recommendedIndex],
      recommendedIndex: recommendedIndex,
      improvedSimilarity: bestSimilarity
    };
  }

  return null;
}
