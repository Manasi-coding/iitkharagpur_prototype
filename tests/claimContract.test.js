import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { CONFIG } from '../src/config.js';
import { evaluateClaim, PLACEHOLDER_CLAIM, renderClaimHeader } from '../src/ui/features/claimContract.js';

// Phase 4. evaluateClaim(similarityScore, options?) is implemented — see
// src/ui/features/claimContract.js. No contract was ever given for this
// file (unlike write/similarity/injectNoise) — this signature reflects
// Person B's real state shape (state.similarityScore) per this phase's
// task, replacing Phase 0's guessed two-pattern signature. See
// README_PHASE0.md, "Open assumptions" for what's still unconfirmed: the
// claim wording itself (PLACEHOLDER_CLAIM below) and the
// state.similarityScore field name/shape (no stub-state.js exists in this
// repo to verify against).

test('evaluateClaim is exported as a function with the contracted arity (similarityScore, options)', () => {
  assert.equal(typeof evaluateClaim, 'function');
  assert.equal(evaluateClaim.length, 2);
});

test('evaluateClaim at exactly CONFIG.PASS_THRESHOLD passes (boundary is inclusive, >=)', () => {
  assert.equal(evaluateClaim(CONFIG.PASS_THRESHOLD).passed, true);
});

test('evaluateClaim just below CONFIG.PASS_THRESHOLD fails', () => {
  assert.equal(evaluateClaim(CONFIG.PASS_THRESHOLD - 1).passed, false);
});

test('evaluateClaim at 100 passes', () => {
  assert.equal(evaluateClaim(100).passed, true);
});

test('evaluateClaim at 0 fails', () => {
  assert.equal(evaluateClaim(0).passed, false);
});

test('evaluateClaim is deterministic: same input, same output, twice', () => {
  assert.deepStrictEqual(evaluateClaim(75), evaluateClaim(75));
});

test('the placeholder claim string exists in exactly one place in claimContract.js (no second hardcoded copy)', () => {
  const filePath = fileURLToPath(new URL('../src/ui/features/claimContract.js', import.meta.url));
  const source = readFileSync(filePath, 'utf8');
  const occurrences = source.split(PLACEHOLDER_CLAIM).length - 1;
  assert.equal(occurrences, 1, `expected PLACEHOLDER_CLAIM's text to appear exactly once in claimContract.js, found ${occurrences}`);
});

test('renderClaimHeader wires the placeholder claim text and evaluateClaim together with no new logic', () => {
  const passing = renderClaimHeader({ similarityScore: CONFIG.PASS_THRESHOLD });
  assert.equal(passing.claimText, PLACEHOLDER_CLAIM);
  assert.equal(passing.passed, true);
  assert.equal(passing.indicator, '✓');

  const failing = renderClaimHeader({ similarityScore: CONFIG.PASS_THRESHOLD - 1 });
  assert.equal(failing.passed, false);
  assert.equal(failing.indicator, '✗');
});
