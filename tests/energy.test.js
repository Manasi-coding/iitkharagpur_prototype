import test from 'node:test';
import assert from 'node:assert/strict';
import { computeEnergy } from '../src/core/energy.js';

// ---------------------------------------------------------------------------
// Test 1: zero weight matrix → zero energy
// ---------------------------------------------------------------------------
test('zero weight matrix gives zero energy for any state', () => {
  const dim = 4;
  const s = [1, -1, 1, -1];
  const W = Array.from({ length: dim }, () => new Array(dim).fill(0));
  const energy = computeEnergy(s, W);
  // -0.5 * 0 === -0 in IEEE754; treat -0 and +0 as equal here.
  assert.ok(energy === 0 || Object.is(energy, -0), `expected 0 or -0, got ${energy}`);
});

// ---------------------------------------------------------------------------
// Test 2: known hand-computed 2x2 case
//
// s = [1, -1]
// W = [[0, 2], [2, 0]]   (symmetric, zero-diagonal — matches write() output)
//
// E = -0.5 * (W[0][0]*s[0]*s[0] + W[0][1]*s[0]*s[1]
//           + W[1][0]*s[1]*s[0] + W[1][1]*s[1]*s[1])
//   = -0.5 * (0*1*1 + 2*1*(-1) + 2*(-1)*1 + 0*(-1)*(-1))
//   = -0.5 * (0 - 2 - 2 + 0)
//   = -0.5 * (-4)
//   = 2
// ---------------------------------------------------------------------------
test('hand-computed 2x2 case returns exact expected value', () => {
  const s = [1, -1];
  const W = [[0, 2], [2, 0]];
  const energy = computeEnergy(s, W);
  assert.ok(
    Math.abs(energy - 2) < 1e-10,
    `expected 2, got ${energy}`
  );
});

// ---------------------------------------------------------------------------
// Test 3: stored pattern produces lower energy than a noisy query
//
// For a real Hopfield W and a stored pattern s, s should produce lower
// (more negative) energy than a version with some elements flipped.
// This is the core property that drives retrieval.
// ---------------------------------------------------------------------------
test('stored pattern has lower energy than a noisy version of the same pattern', () => {
  // 4-bit pattern
  const stored = [1, 1, -1, -1];
  const dim = stored.length;

  // Build a minimal Hopfield matrix for one stored pattern
  // (outer product, zero diagonal) — same rule as write.js
  const W = Array.from({ length: dim }, (_, i) =>
    Array.from({ length: dim }, (_, j) =>
      i === j ? 0 : stored[i] * stored[j]
    )
  );

  const cleanEnergy = computeEnergy(stored, W);

  // Flip first element — one bit of noise
  const noisy = [...stored];
  noisy[0] = -noisy[0];
  const noisyEnergy = computeEnergy(noisy, W);

  assert.ok(
    cleanEnergy < noisyEnergy,
    `expected stored energy (${cleanEnergy}) < noisy energy (${noisyEnergy})`
  );
});

// ---------------------------------------------------------------------------
// Test 4: deterministic — same inputs produce same output twice
// ---------------------------------------------------------------------------
test('computeEnergy is deterministic: same inputs give same output on repeated calls', () => {
  const s = [1, -1, 1, 1, -1, -1, 1, -1];
  const dim = s.length;
  const W = Array.from({ length: dim }, (_, i) =>
    Array.from({ length: dim }, (_, j) =>
      i === j ? 0 : s[i] * s[j]
    )
  );

  const first = computeEnergy(s, W);
  const second = computeEnergy(s, W);
  assert.equal(first, second, 'expected identical results on repeated calls');
});

// ---------------------------------------------------------------------------
// Test 5: symmetric W — E(s, W) === E(s, W^T)
// (Since write() always produces symmetric W, this verifies the formula
//  is well-behaved for the actual W this codebase produces.)
// ---------------------------------------------------------------------------
test('symmetric W: energy is the same with W and W^T', () => {
  const s = [1, -1, 1, -1];
  const W = [
    [0, 3, -1, 2],
    [3, 0, 4, -2],
    [-1, 4, 0, 1],
    [2, -2, 1, 0],
  ];
  // Transpose W
  const WT = W.map((row, i) => row.map((_, j) => W[j][i]));

  const energyW = computeEnergy(s, W);
  const energyWT = computeEnergy(s, WT);

  // W is already symmetric here, so energyW === energyWT exactly.
  assert.ok(
    Math.abs(energyW - energyWT) < 1e-10,
    `expected energies to match: E(W)=${energyW}, E(W^T)=${energyWT}`
  );
});

// ---------------------------------------------------------------------------
// Test 6: all-ones state, identity-like W
//
// s = [1, 1]
// W = [[0, 1], [1, 0]]
// E = -0.5 * (0*1*1 + 1*1*1 + 1*1*1 + 0*1*1)
//   = -0.5 * 2 = -1
// ---------------------------------------------------------------------------
test('all-ones state with symmetric off-diagonal W gives correct energy', () => {
  const s = [1, 1];
  const W = [[0, 1], [1, 0]];
  const energy = computeEnergy(s, W);
  assert.ok(
    Math.abs(energy - (-1)) < 1e-10,
    `expected -1, got ${energy}`
  );
});

// ---------------------------------------------------------------------------
// Test 7: s and W are not mutated by computeEnergy
// ---------------------------------------------------------------------------
test('does not mutate s or W', () => {
  const s = [1, -1, 1, -1];
  const W = [[0, 2], [2, 0], [1, -1], [-1, 1]].slice(0, 2); // 2x2 for s length 2
  const s2 = [1, -1];
  const W2 = [[0, 2], [2, 0]];
  const sCopy = [...s2];
  const WCopy = W2.map(row => [...row]);

  computeEnergy(s2, W2);

  assert.deepStrictEqual(s2, sCopy, 's must not be mutated');
  assert.deepStrictEqual(W2, WCopy, 'W must not be mutated');
});
