import test from 'node:test';
import assert from 'node:assert';
import { calculatePairwiseSimilarities } from '../src/core/pairwiseSimilarity.js';

test('calculatePairwiseSimilarities computes similarities for all pairs', () => {
  const patterns = [
    { id: 'p1', pattern: [1, 1, 1, 1] },
    { id: 'p2', pattern: [1, 1, -1, -1] },
    { id: 'p3', pattern: [-1, -1, -1, -1] }
  ];

  const results = calculatePairwiseSimilarities(patterns);

  assert.strictEqual(results.length, 3, 'Should generate 3 edges for 3 nodes');
  
  // p1 vs p2 (2 matches out of 4 = 50%)
  const sim12 = results.find(r => r.sourceId === 'p1' && r.targetId === 'p2');
  assert.strictEqual(sim12.similarity, 50);

  // p1 vs p3 (0 matches out of 4 = 0%)
  const sim13 = results.find(r => r.sourceId === 'p1' && r.targetId === 'p3');
  assert.strictEqual(sim13.similarity, 0);

  // p2 vs p3 (2 matches out of 4 = 50%)
  const sim23 = results.find(r => r.sourceId === 'p2' && r.targetId === 'p3');
  assert.strictEqual(sim23.similarity, 50);
});

test('calculatePairwiseSimilarities handles empty and single pattern lists', () => {
  assert.strictEqual(calculatePairwiseSimilarities([]).length, 0);
  assert.strictEqual(calculatePairwiseSimilarities([{ id: 'p1', pattern: [1, -1] }]).length, 0);
});
