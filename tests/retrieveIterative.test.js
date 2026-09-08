import test from 'node:test';
import assert from 'node:assert/strict';
import { retrieveIterative } from '../src/core/retrieveIterative.js';
import { createPresetPatterns } from '../src/core/createPresetPatterns.js';
// TEMPORARY: swap to real src/core/write.js at Sync Point 1, once Person 1's
// write.js lands and gate-passes.
import { write } from '../scratch/stub-write.js';

// Mirrors the split-doc's literal test case ("2 patterns / 10% noise") — a
// fixture parameter for this test, not a CONFIG value.
const NOISE_FRACTION = 0.10;
const MAX_EXPECTED_ITERATIONS = 3;

function addNoise(pattern, fraction) {
  const flipCount = Math.round(fraction * pattern.length);
  return pattern.map((value, index) => (index < flipCount ? -value : value));
}

test('2 patterns / 10% noise converges within the expected iteration budget', () => {
  const presets = createPresetPatterns();
  const W = write([presets[0].pattern, presets[1].pattern]); // TEMPORARY: swap to real write.js at Sync Point 1
  const query = addNoise(presets[0].pattern, NOISE_FRACTION);

  const result = retrieveIterative(query, W);

  assert.equal(result.converged, true);
  assert.ok(
    result.iterationCount <= MAX_EXPECTED_ITERATIONS,
    `expected <= ${MAX_EXPECTED_ITERATIONS} iterations, got ${result.iterationCount}`
  );
});

test('steps[] is correctly ordered: first is the initial query, last is finalOutput', () => {
  const presets = createPresetPatterns();
  const W = write([presets[0].pattern, presets[1].pattern]); // TEMPORARY: swap to real write.js at Sync Point 1
  const query = addNoise(presets[0].pattern, NOISE_FRACTION);

  const result = retrieveIterative(query, W);

  assert.ok(result.steps.length > 0);
  assert.deepStrictEqual(result.steps[0], query);
  assert.deepStrictEqual(result.steps[result.steps.length - 1], result.finalOutput);
});

test('real sparse write() produces a matrix that retrieveIterative() can use', () => {
  const presets = createPresetPatterns();

  const W = write(
    [presets[0].pattern, presets[1].pattern],
    { sparse: true }
  );

  const result = retrieveIterative(
    presets[0].pattern,
    W
  );

  assert.equal(W.length, presets[0].pattern.length);
  assert.ok(result);
  assert.ok(Array.isArray(result.finalOutput));
  assert.equal(result.finalOutput.length, presets[0].pattern.length);
  assert.ok(Number.isFinite(result.iterationCount));
});