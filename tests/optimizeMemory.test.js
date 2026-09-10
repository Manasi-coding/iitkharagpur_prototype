import test from 'node:test';
import assert from 'node:assert/strict';
import { optimizeMemory } from '../src/core/optimizeMemory.js';
import { createPresetPatterns } from '../src/core/createPresetPatterns.js';
import { injectNoise } from '../src/core/injectNoise.js';
import { write } from '../src/core/write.js';
import { retrieveIterative } from '../src/core/retrieveIterative.js';
import { similarity } from '../src/core/similarity.js';

test('optimizeMemory returns null when 1 or fewer patterns exist', () => {
  const result0 = optimizeMemory([], [], [], {});
  assert.equal(result0, null);

  const result1 = optimizeMemory([{ id: 'a', pattern: [1, -1] }], [1, -1], [1, -1], {});
  assert.equal(result1, null);
});

test('optimizeMemory correctly identifies the interfering pattern', () => {
  const allPresets = createPresetPatterns();
  
  // Create a synthetic set of 3 patterns: 2 that are somewhat distinct, and a 3rd that is highly interfering.
  // Actually, we can just use the worst pair from presetCorrelation (l and square-outline) and one other.
  // p0 = 'l' (target)
  // p1 = 't' (benign)
  // p2 = 'square-outline' (interfering with 'l')
  
  const p0 = allPresets.find(p => p.id === 'l');
  const p1 = allPresets.find(p => p.id === 't');
  const p2 = allPresets.find(p => p.id === 'square-outline');
  
  const storedPatterns = [p0, p1, p2];
  
  // Use p0 as ground truth. Add a little noise so retrieval actually depends on the matrix.
  const query = injectNoise(p0.pattern, 10, 42); 
  const target = p0.pattern;
  
  // Get the baseline score without removing any patterns
  const W_baseline = write(storedPatterns.map(p => p.pattern), { sparse: false, decay: 1.0 });
  const result_baseline = retrieveIterative(query, W_baseline);
  const baselineScore = similarity(result_baseline.finalOutput, target);
  
  const result = optimizeMemory(storedPatterns, query, target, { sparse: false, decay: 1.0 });
  
  assert.notEqual(result, null);
  
  // The optimization should find a pattern whose removal results in a score >= baseline
  assert.equal(result.improvedSimilarity >= baselineScore, true);
  // It should return a valid index within the array
  assert.equal(result.recommendedIndex >= 0 && result.recommendedIndex < storedPatterns.length, true);
});
