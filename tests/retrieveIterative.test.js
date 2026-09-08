import test from 'node:test';
import assert from 'node:assert/strict';
import { retrieveIterative } from '../src/core/retrieveIterative.js';
import { createPresetPatterns } from '../src/core/createPresetPatterns.js';
import { write } from '../src/core/write.js';
import { similarity } from '../src/core/similarity.js';
import { CONFIG } from '../src/config.js';

// Mirrors the split-doc's literal test case ("2 patterns / 10% noise") — a
// fixture parameter for this test, not a CONFIG value.
const NOISE_FRACTION = 0.10;
const MAX_EXPECTED_ITERATIONS = 3;
// Fixture parameter for the sparse+decay tests below, same treatment as
// NOISE_FRACTION/MAX_EXPECTED_ITERATIONS above — not a CONFIG value.
const TEST_DECAY = 0.5;

function addNoise(pattern, fraction) {
  const flipCount = Math.round(fraction * pattern.length);
  return pattern.map((value, index) => (index < flipCount ? -value : value));
}

test('2 patterns / 10% noise converges within the expected iteration budget', () => {
  const presets = createPresetPatterns();
  const W = write([presets[0].pattern, presets[1].pattern]);
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
  const W = write([presets[0].pattern, presets[1].pattern]);
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

test('real sparse+decay write() converges to a meaningfully accurate (not necessarily exact) recovery', () => {
  const presets = createPresetPatterns();
  const query = addNoise(presets[0].pattern, NOISE_FRACTION);
  const W = write([presets[0].pattern, presets[1].pattern], { sparse: true, decay: TEST_DECAY });
  const result = retrieveIterative(query, W);

  assert.equal(result.converged, true);
  const matchPct = similarity(result.finalOutput, presets[0].pattern);
  assert.ok(
    matchPct >= CONFIG.PASS_THRESHOLD,
    `expected >= ${CONFIG.PASS_THRESHOLD}% similarity to the original pattern, got ${matchPct}%`
  );
});

const BASELINE_SPARSE_DECAY_SIMILARITY = 93.75; // measured against real write(), clean query, decay 0.5 + sparse
const BASELINE_SPARSE_DECAY_ITERATIONS = 2;

test('sparse+decay regression baseline: locks in measured real-write() behavior (clean query)', () => {
  const presets = createPresetPatterns();
  const W = write([presets[0].pattern, presets[1].pattern], { sparse: true, decay: TEST_DECAY });
  const result = retrieveIterative(presets[0].pattern, W);

  assert.equal(result.converged, true);
  assert.equal(result.iterationCount, BASELINE_SPARSE_DECAY_ITERATIONS);
  assert.equal(similarity(result.finalOutput, presets[0].pattern), BASELINE_SPARSE_DECAY_SIMILARITY);
});