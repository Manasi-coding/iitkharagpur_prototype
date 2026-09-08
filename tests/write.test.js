import test from 'node:test';
import assert from 'node:assert/strict';
import { CONFIG } from '../src/config.js';
import { createPresetPatterns } from '../src/core/createPresetPatterns.js';
import { write } from '../src/core/write.js';
import { similarity } from '../src/core/similarity.js';
import { injectNoise } from '../src/core/injectNoise.js';
import { retrieveIterative } from '../src/core/retrieveIterative.js';

// Phase 3. write(patterns, options?) is implemented — see src/core/write.js.
// Every pattern count below is read from CONFIG and/or
// createPresetPatterns().length at run time — never a hardcoded N — same
// decoupling from the preset-count blocker as every previous phase (see
// README_PHASE0.md, "The preset-count blocker").
//
// One test below (the "min(8, available)" gate) found that the split doc's
// 60-70% similarity expectation does NOT hold against the real preset
// shapes — see that test's comment and README_PHASE0.md, "Open
// assumptions" for the full writeup. That test asserts what the code
// actually, verifiably does, not the unverified split-doc number.

function assertSymmetricZeroDiagonal(W) {
  for (let i = 0; i < W.length; i++) {
    assert.equal(W[i][i], 0, `W[${i}][${i}] should be 0 (zero diagonal)`);
    for (let j = 0; j < W.length; j++) {
      assert.equal(W[i][j], W[j][i], `W[${i}][${j}] should equal W[${j}][${i}] (symmetric)`);
    }
  }
}

test('write is exported as a function with the contracted arity (patterns, options)', () => {
  assert.equal(typeof write, 'function');
  assert.equal(write.length, 2);
});

test('write([]) with no patterns returns a CONFIG.PATTERN_DIM x CONFIG.PATTERN_DIM matrix of zeros', () => {
  // With zero patterns there is nothing to derive a size from (unlike
  // similarity()/injectNoise(), which always have a real input vector) —
  // CONFIG.PATTERN_DIM is the only available source here.
  const W = write([]);
  assert.equal(W.length, CONFIG.PATTERN_DIM);
  assert.ok(W.every(row => row.length === CONFIG.PATTERN_DIM));
  assert.ok(W.every(row => row.every(value => value === 0)));
});

test('write(patterns) with no options returns a symmetric, zero-diagonal matrix', () => {
  const presets = createPresetPatterns();
  const patterns = presets.slice(0, Math.min(3, presets.length)).map(p => p.pattern);
  assertSymmetricZeroDiagonal(write(patterns));
});

test('a hand-computed 2-pattern example returns the exact expected matrix', () => {
  // 8-element fixture (not the full 64), so W is hand-verifiable. Classical
  // rule: W[i][j] = a[i]*a[j] + b[i]*b[j] for i != j, else 0.
  //   a: [ 1, -1,  1,  1, -1, -1,  1, -1]
  //   b: [ 1, -1, -1,  1, -1,  1,  1,  1]
  // Spot checks:
  //   W[0][1] = a[0]*a[1] + b[0]*b[1] = (1)(-1) + (1)(-1) = -2
  //   W[0][3] = a[0]*a[3] + b[0]*b[3] = (1)(1)  + (1)(1)  =  2
  //   W[2][5] = a[2]*a[5] + b[2]*b[5] = (1)(-1) + (-1)(1) = -2
  //   W[0][0] would be 2 (a[0]^2 + b[0]^2 = 1+1), but the diagonal is
  //   zeroed, so it reads 0 instead.
  const a = [1, -1, 1, 1, -1, -1, 1, -1];
  const b = [1, -1, -1, 1, -1, 1, 1, 1];
  const expected = [
    [0, -2, 0, 2, -2, 0, 2, 0],
    [-2, 0, 0, -2, 2, 0, -2, 0],
    [0, 0, 0, 0, 0, -2, 0, -2],
    [2, -2, 0, 0, -2, 0, 2, 0],
    [-2, 2, 0, -2, 0, 0, -2, 0],
    [0, 0, -2, 0, 0, 0, 0, 2],
    [2, -2, 0, 2, -2, 0, 0, 0],
    [0, 0, -2, 0, 0, 2, 0, 0],
  ];
  assert.deepStrictEqual(write([a, b]), expected);
});

test('retrieval against write(patterns) actually recovers a stored pattern above chance-level similarity, not merely converged=true', () => {
  // Regression test for the degenerate-matrix bug (README_PHASE0.md): the
  // simplest possible non-trivial case, one stored pattern, one noisy
  // query — must recover something close to the real pattern, not just
  // reach a stable (possibly meaningless) fixed point.
  const presets = createPresetPatterns();
  const stored = [presets[0].pattern];
  const W = write(stored);
  const query = injectNoise(stored[0], 10, 1);
  const result = retrieveIterative(query, W);

  assert.equal(result.converged, true);
  const sim = similarity(result.finalOutput, stored[0]);
  assert.ok(sim > 70, `expected well above chance level (~56%, the degenerate stub-write.js result), got ${sim}%`);
});

test('gate: 2 patterns / 10% noise recovers at >= 95% similarity', () => {
  const presets = createPresetPatterns();
  const stored = presets.slice(0, Math.min(2, presets.length)).map(p => p.pattern);
  const W = write(stored);
  const query = injectNoise(stored[0], 10, 1);
  const result = retrieveIterative(query, W);
  const sim = similarity(result.finalOutput, stored[0]);
  assert.ok(sim >= 95, `expected >= 95%, got ${sim}%`);
});

test('gate: min(8, available) patterns / 10% noise — verified against real presets, not the unverified split-doc range', () => {
  const presets = createPresetPatterns();
  const n = Math.min(8, presets.length); // not a literal 8 — see header comment
  const stored = presets.slice(0, n).map(p => p.pattern);
  const W = write(stored);
  const query = injectNoise(stored[0], 10, 1);
  const result = retrieveIterative(query, W);
  const sim = similarity(result.finalOutput, stored[0]);

  // FINDING, not a fudge: the split doc's gate number for this exact case
  // is "60-70% similarity." Measured against the real createPresetPatterns()
  // shapes, swept across 200 seeds at this exact N and noise level,
  // similarity landed in [96.875, 100] every single time — nowhere near
  // 60-70%. Not a write()/retrieveIterative() bug: classical Hopfield
  // capacity theory (~0.138 * PATTERN_DIM, ~8-9 patterns before serious
  // degradation) assumes RANDOM, i.i.d. patterns. These hand-drawn shapes
  // are far more structured (large contiguous ON/OFF blocks, not
  // independent per-cell coin flips), so their outer-product interference
  // is much lower than the random-pattern worst case the split doc's
  // number likely assumes. Asserting the literal 60-70% here would assert
  // something false about this code, so this asserts the real, verified
  // floor instead — CONFIG.PASS_THRESHOLD, chosen because it's the app's
  // own "this counts as a good retrieval" bar (90%), comfortably cleared
  // here with room to spare, rather than a new invented number. See
  // README_PHASE0.md, "Open assumptions" for the full writeup and the team
  // flag this raises.
  assert.ok(
    sim >= CONFIG.PASS_THRESHOLD,
    `expected >= CONFIG.PASS_THRESHOLD (${CONFIG.PASS_THRESHOLD})%, got ${sim}% (split doc predicted 60-70%; see README_PHASE0.md)`
  );
});

test('decay < 1.0 differs from the no-decay (CONFIG.DECAY_DEFAULT) result on the same patterns', () => {
  const presets = createPresetPatterns();
  const patterns = presets.slice(0, Math.min(3, presets.length)).map(p => p.pattern);
  const withoutDecay = write(patterns);
  const withDecay = write(patterns, { decay: 0.5 });
  assert.notDeepStrictEqual(withDecay, withoutDecay);
  assertSymmetricZeroDiagonal(withDecay);
});

test('decay path: reversed pattern order produces a different matrix (pattern order matters under decay)', () => {
  const presets = createPresetPatterns();
  const patterns = presets.slice(0, Math.min(3, presets.length)).map(p => p.pattern);
  const forward = write(patterns, { decay: 0.5 });
  const reversed = write([...patterns].reverse(), { decay: 0.5 });
  assert.notDeepStrictEqual(forward, reversed);
});

test('classical path (no decay) is order-independent: reversed pattern order produces the SAME matrix', () => {
  // Direct proof of the contrast documented in write.js: addition commutes
  // when decay === CONFIG.DECAY_DEFAULT (1.0), so unlike the decay case
  // just above, order doesn't matter here.
  const presets = createPresetPatterns();
  const patterns = presets.slice(0, Math.min(3, presets.length)).map(p => p.pattern);
  const forward = write(patterns);
  const reversed = write([...patterns].reverse());
  assert.deepStrictEqual(forward, reversed);
});

test('sparse: true keeps only the top sparsityPct% magnitude positions per pattern, and is still symmetric/zero-diagonal', () => {
  const presets = createPresetPatterns();
  const pattern = presets[0].pattern; // 'l': 28 ON cells / 64 (see similarity.test.js's identical hand count)
  const W = write([pattern], { sparse: true }); // single pattern, so W directly reveals its sparsified contribution

  assertSymmetricZeroDiagonal(W);

  // A row is entirely zero iff that position was zeroed out of the
  // sparsified contribution (W[i][j] = contribution[i] * contribution[j],
  // so contribution[i] === 0 forces the whole row to 0). Counting
  // non-all-zero rows therefore counts exactly how many positions survived
  // sparsification, without exporting the internal sparsifyPattern() just
  // to test it. Requires keepCount >= 2 to be valid (a lone surviving
  // position's only nonzero cell would be on the diagonal, which gets
  // zeroed, hiding it) — checked explicitly below rather than assumed.
  const expectedKeepCount = Math.round((pattern.length * CONFIG.SPARSITY_PCT) / 100);
  assert.ok(expectedKeepCount >= 2, 'test assumption: keepCount must be >= 2 for the row-counting check below to be valid');

  const survivingCount = W.filter(row => row.some(value => value !== 0)).length;
  assert.equal(survivingCount, expectedKeepCount);
});

test('write() is exercised across pattern counts from CONFIG.MIN_PATTERNS up to whatever createPresetPatterns() currently returns, staying symmetric/zero-diagonal throughout', () => {
  const presets = createPresetPatterns();
  for (let n = CONFIG.MIN_PATTERNS; n <= presets.length; n++) {
    assertSymmetricZeroDiagonal(write(presets.slice(0, n).map(p => p.pattern)));
  }
});
