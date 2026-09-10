import test from 'node:test';
import assert from 'node:assert/strict';
import { sweepCapacity } from '../src/core/sweepCapacity.js';
import { findCrossover } from '../src/core/findCrossover.js';
import { createPresetPatterns } from '../src/core/createPresetPatterns.js';
import { CONFIG } from '../src/config.js';

// ---------------------------------------------------------------------------
// Shared test doubles used across multiple tests.
//
// dummyWrite: returns a zero matrix. Used when the test cares only about
//   sweep structure, not retrieval quality.
// passthroughRetrieve: returns the query unchanged. "No recall" — simulates
//   the network having no signal. Deterministic.
// ---------------------------------------------------------------------------
function dummyWrite(patternVectors, { sparse } = {}) {
  const dim = patternVectors.length > 0 ? patternVectors[0].length : 0;
  return Array.from({ length: dim }, () => Array.from({ length: dim }, () => 0));
}

function passthroughRetrieve(query, W) {
  // Returns a copy of query as finalOutput. W is intentionally ignored.
  return { finalOutput: [...query], converged: true, steps: [query], iterationCount: 0 };
}

// ---------------------------------------------------------------------------
// Test 1: sweep output shape — one entry per n from 1 to maxN
// ---------------------------------------------------------------------------
test('returns exactly one { n, avgSimilarity } entry per n from 1 to maxN', () => {
  const patterns = createPresetPatterns().slice(0, 4);

  const results = sweepCapacity(
    patterns,
    { sparse: false, noisePct: 0, maxN: 3 },
    { write: dummyWrite, retrieveIterative: passthroughRetrieve }
  );

  assert.equal(results.length, 3);
  assert.deepStrictEqual(results.map(r => r.n), [1, 2, 3]);
  for (const { avgSimilarity } of results) {
    assert.equal(typeof avgSimilarity, 'number');
    assert.ok(isFinite(avgSimilarity), 'avgSimilarity must be a finite number');
  }
});

// ---------------------------------------------------------------------------
// Test 2: maxN is capped at patterns.length
// ---------------------------------------------------------------------------
test('caps maxN at patterns.length when maxN exceeds the number of available patterns', () => {
  const patterns = createPresetPatterns().slice(0, 3);

  const results = sweepCapacity(
    patterns,
    { sparse: false, noisePct: 0, maxN: 999 },
    { write: dummyWrite, retrieveIterative: passthroughRetrieve }
  );

  // Only 3 patterns available; sweep must not attempt to go beyond 3.
  assert.equal(results.length, 3);
  assert.equal(Math.max(...results.map(r => r.n)), 3);
});

// ---------------------------------------------------------------------------
// Test 3: input patterns are not mutated by the sweep
// ---------------------------------------------------------------------------
test('does not mutate input patterns', () => {
  const patterns = createPresetPatterns().slice(0, 3);
  const deepCopy = patterns.map(({ id, pattern }) => ({ id, pattern: [...pattern] }));

  sweepCapacity(
    patterns,
    { sparse: false, noisePct: 20, maxN: 3 },
    { write: dummyWrite, retrieveIterative: passthroughRetrieve }
  );

  assert.deepStrictEqual(
    patterns,
    deepCopy,
    'input patterns must not be mutated by the sweep'
  );
});

// ---------------------------------------------------------------------------
// Test 4: avgSimilarity is the mean across ALL n stored patterns at each step
//
// Strategy: inject a stateful retrieve whose behavior alternates on each call.
//   n=1 step:  1 retrieve call  (call #1 — odd  → returns query unchanged)
//   n=2 step:  2 retrieve calls (call #2 — even → returns inverted query;
//                                call #3 — odd  → returns query unchanged)
//
// For n=2 the expected average is (simB + simA) / 2.
//   simA (query unchanged): (PATTERN_DIM - flipCount) / PATTERN_DIM * 100
//   simB (inverted query):   flipCount / PATTERN_DIM * 100
//   simA + simB = 100, so expectedAvgForN2 = 50 (exactly, at these values).
//
// If the loop only iterated once instead of n=2 times, the result would be
// simA alone (79.6875), which would fail the assertion.
// ---------------------------------------------------------------------------
test('avgSimilarity is the mean across all n stored patterns at each step', () => {
  const patterns = createPresetPatterns().slice(0, 2);
  const noisePct = 20;
  const flipCount = Math.round((noisePct / 100) * CONFIG.PATTERN_DIM);
  const simA = ((CONFIG.PATTERN_DIM - flipCount) / CONFIG.PATTERN_DIM) * 100;
  const simB = (flipCount / CONFIG.PATTERN_DIM) * 100;
  // simA + simB == 100 for any valid flipCount, so:
  const expectedAvgForN2 = (simA + simB) / 2; // == 50.0

  let callCount = 0;
  function alternatingRetrieve(query, W) {
    callCount++;
    if (callCount % 2 === 1) {
      // Odd calls: query unchanged — similarity to original == simA
      return { finalOutput: [...query], converged: true, steps: [], iterationCount: 0 };
    } else {
      // Even calls: inverted query — similarity to original == simB
      return { finalOutput: query.map(v => -v), converged: true, steps: [], iterationCount: 0 };
    }
  }

  const results = sweepCapacity(
    patterns,
    { sparse: false, noisePct, maxN: 2 },
    { write: dummyWrite, retrieveIterative: alternatingRetrieve }
  );

  const n2Entry = results.find(r => r.n === 2);
  assert.ok(n2Entry !== undefined, 'expected an entry for n=2');
  assert.ok(
    Math.abs(n2Entry.avgSimilarity - expectedAvgForN2) < 0.001,
    `expected avgSimilarity for n=2 ~= ${expectedAvgForN2}, got ${n2Entry.avgSimilarity}`
  );
});

// ---------------------------------------------------------------------------
// Test 5: noisePct flows through to the noise helper
//
// Uses passthroughRetrieve so finalOutput == noisyQuery (not the original).
//   noisePct=0:   flipCount=0 → noisyQuery==original → similarity==100
//   noisePct=100: flipCount=PATTERN_DIM → noisyQuery==-original → similarity==0
// ---------------------------------------------------------------------------
test('noisePct=0 yields 100% and noisePct=100 yields 0% similarity (pass-through retrieve)', () => {
  const patterns = createPresetPatterns().slice(0, 2);

  const zeroNoise = sweepCapacity(
    patterns,
    { sparse: false, noisePct: 0, maxN: 2 },
    { write: dummyWrite, retrieveIterative: passthroughRetrieve }
  );
  for (const { n, avgSimilarity } of zeroNoise) {
    assert.equal(avgSimilarity, 100,
      `n=${n}: expected 100 with noisePct=0, got ${avgSimilarity}`);
  }

  const fullNoise = sweepCapacity(
    patterns,
    { sparse: false, noisePct: 100, maxN: 2 },
    { write: dummyWrite, retrieveIterative: passthroughRetrieve }
  );
  for (const { n, avgSimilarity } of fullNoise) {
    assert.equal(avgSimilarity, 0,
      `n=${n}: expected 0 with noisePct=100, got ${avgSimilarity}`);
  }
});

// ---------------------------------------------------------------------------
// Test 6: PIPELINE VERIFICATION GATE
//   sparse crossover N > classical crossover N on deterministic injected deps.
//
// THIS IS A PIPELINE TEST ONLY.
// It does NOT make any empirical claim about real Hopfield network capacity.
// It does NOT use or imply any theoretical capacity bound (e.g. ~0.138N).
//
// Purpose:
//   1. Verify that sweepCapacity correctly forwards the sparse flag to write().
//   2. Verify that findCrossover correctly identifies the first failing n.
//   3. Verify that if write() produces better quality matrices for sparse=true,
//      the resulting crossover N is higher than for sparse=false.
//
// Mechanism:
//   A factory (makeSyntheticDeps) creates a matched write/retrieve pair sharing
//   state via a closure. write() records whether the current n is within the
//   "good recall" range (n <= degradeAtN) and which patterns were stored.
//   retrieve() reads that record to return either the correct stored pattern
//   (perfect recall) or the noisy query unchanged (no recall).
//
//   The sparse flag chooses which degradeAtN applies. If sweepCapacity drops
//   the sparse flag, both curves would use the same degradeAtN, produce the
//   same crossover N, and the assertion would fail.
//
// Expected crossover values (deterministic):
//   flipCount = round(20% * 64) = 13
//   similarity when perfect recall:  100%
//   similarity when no recall:       (64-13)/64*100 = 79.6875%  (< threshold 90)
//   classical: isPerfect for n<=3, so crossover at n=4
//   sparse:    isPerfect for n<=6, so crossover at n=7
//   assertion: 7 > 4  (sparse crossover > classical crossover)
// ---------------------------------------------------------------------------
test('PIPELINE GATE: sparse crossover N is strictly greater than classical crossover N', () => {
  const patterns = createPresetPatterns(); // all 9 presets
  const noisePct = 20;
  const threshold = CONFIG.PASS_THRESHOLD; // 90

  // degradeAtN values for the two modes — the difference is what the test
  // exercises. classical degrades sooner; sparse degrades later.
  const CLASSICAL_DEGRADE_AT_N = 3;
  const SPARSE_DEGRADE_AT_N = 6;

  // makeSyntheticDeps creates one write/retrieve pair per sweep run.
  // State is scoped to each call — classical and sparse sweeps do not
  // share any state between them.
  function makeSyntheticDeps(classicalDegradeAtN, sparseDegradeAtN) {
    let lastWriteState = null;

    function write(patternVectors, { sparse } = {}) {
      const degradeAtN = sparse ? sparseDegradeAtN : classicalDegradeAtN;
      lastWriteState = {
        isPerfect: patternVectors.length <= degradeAtN,
        // Copy pattern vectors so the stored reference is stable.
        storedPatterns: patternVectors.map(p => [...p]),
      };
      // Return a dummy matrix — controlledRetrieve does not use W values.
      return [];
    }

    function retrieve(query, W) {
      if (lastWriteState !== null && lastWriteState.isPerfect) {
        // Perfect recall: return the stored pattern with the highest dot
        // product with query (nearest-neighbour in bipolar space).
        // Mathematically guaranteed to identify the correct pattern for these
        // presets (max 70% pairwise correlation, 20% noise) — see analysis in
        // SYNC_POINT_1_READINESS.md and the Phase 1 correlation threshold.
        const { storedPatterns } = lastWriteState;
        const scores = storedPatterns.map(p =>
          p.reduce((sum, v, i) => sum + v * query[i], 0)
        );
        const bestIdx = scores.indexOf(Math.max(...scores));
        return {
          finalOutput: [...storedPatterns[bestIdx]],
          converged: true,
          steps: [],
          iterationCount: 1,
        };
      }
      // No recall: return query unchanged (noisyQuery becomes finalOutput).
      return { finalOutput: [...query], converged: true, steps: [], iterationCount: 0 };
    }

    return { write, retrieve };
  }

  const classicalDeps = makeSyntheticDeps(CLASSICAL_DEGRADE_AT_N, SPARSE_DEGRADE_AT_N);
  const classicalCurve = sweepCapacity(
    patterns,
    { sparse: false, noisePct, maxN: patterns.length },
    { write: classicalDeps.write, retrieveIterative: classicalDeps.retrieve }
  );

  const sparseDeps = makeSyntheticDeps(CLASSICAL_DEGRADE_AT_N, SPARSE_DEGRADE_AT_N);
  const sparseCurve = sweepCapacity(
    patterns,
    { sparse: true, noisePct, maxN: patterns.length },
    { write: sparseDeps.write, retrieveIterative: sparseDeps.retrieve }
  );

  const classicalCrossover = findCrossover(classicalCurve, threshold);
  const sparseCrossover = findCrossover(sparseCurve, threshold);

  assert.ok(
    sparseCrossover > classicalCrossover,
    [
      'PIPELINE GATE FAILED:',
      `  sparse crossover N   = ${sparseCrossover}`,
      `  classical crossover N = ${classicalCrossover}`,
      '  Expected sparse > classical.',
      '  (This is a pipeline test only — not an empirical real-world capacity claim.)',
    ].join('\n')
  );
});

// ---------------------------------------------------------------------------
// Test 7: decay flows through to write()
// ---------------------------------------------------------------------------
test('decay parameter flows through to write()', () => {
  const patterns = createPresetPatterns().slice(0, 2);
  let capturedOptions = null;

  function capturingWrite(patternVectors, options) {
    capturedOptions = options;
    return dummyWrite(patternVectors, options);
  }

  sweepCapacity(
    patterns,
    { sparse: false, decay: 0.5, noisePct: 0, maxN: 2 },
    { write: capturingWrite, retrieveIterative: passthroughRetrieve }
  );

  assert.ok(capturedOptions, 'write() was not called');
  assert.equal(capturedOptions.decay, 0.5, 'decay parameter was not forwarded correctly');
});
