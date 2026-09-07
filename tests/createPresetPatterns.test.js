import test from 'node:test';
import assert from 'node:assert/strict';
import { createPresetPatterns, CORRELATION_THRESHOLD } from '../src/core/createPresetPatterns.js';
import { CONFIG } from '../src/config.js';

function positionalMatchFraction(patternA, patternB) {
  const matchCount = patternA.filter((value, index) => value === patternB[index]).length;
  return matchCount / CONFIG.PATTERN_DIM;
}

test('no pair of presets exceeds CORRELATION_THRESHOLD', () => {
  const presets = createPresetPatterns();
  for (const presetA of presets) {
    for (const presetB of presets) {
      if (presetA === presetB) continue;
      const fraction = positionalMatchFraction(presetA.pattern, presetB.pattern);
      assert.ok(
        fraction <= CORRELATION_THRESHOLD,
        `"${presetA.id}" and "${presetB.id}" share ${(fraction * 100).toFixed(1)}% of positions, exceeding threshold`
      );
    }
  }
});

test('createPresetPatterns() returns the same deterministic set on every call', () => {
  const first = createPresetPatterns();
  const second = createPresetPatterns();
  assert.deepStrictEqual(first, second);
});
