import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildBdhCallout,
} from '../src/ui/features/bdhCallout.js';

import {
  createPredictGate,
  submitPrediction,
} from '../src/ui/features/predictGate.js';

import {
  getFailureGallery,
} from '../src/ui/features/failureGallery.js';


test('BDH callout uses measured crossover values', () => {
  const curves = {
    classical: [
      { n: 1, avgSimilarity: 100 },
      { n: 2, avgSimilarity: 95 },
      { n: 3, avgSimilarity: 80 },
    ],
    sparse: [
      { n: 1, avgSimilarity: 100 },
      { n: 2, avgSimilarity: 100 },
      { n: 3, avgSimilarity: 95 },
      { n: 4, avgSimilarity: 80 },
    ],
  };

  const result = buildBdhCallout(curves, 90);

  assert.equal(result.classicalCrossover, 3);
  assert.equal(result.sparseCrossover, 4);
  assert.equal(
    result.text,
    'Classical degrades at N=3; BDH-mode holds until N=4.',
  );
});


test('predict gate stays hidden until prediction is submitted', () => {
  const initial = createPredictGate();

  assert.equal(initial.revealed, false);
  assert.equal(initial.guess, null);
  assert.equal(initial.measuredCrossover, null);
});


test('predict gate reveals measured crossover after prediction', () => {
  const curve = [
    { n: 1, avgSimilarity: 100 },
    { n: 2, avgSimilarity: 95 },
    { n: 3, avgSimilarity: 80 },
  ];

  const result = submitPrediction(5, curve, 90);

  assert.equal(result.revealed, true);
  assert.equal(result.guess, 5);
  assert.equal(result.measuredCrossover, 3);
  assert.equal(result.delta, 2);
});


test('failure gallery contains three precomputed failure cases', () => {
  const gallery = getFailureGallery();

  assert.equal(gallery.length, 3);

  assert.deepEqual(
    gallery.map((item) => item.id),
    ['overload', 'correlated-patterns', 'spurious-output'],
  );

  for (const item of gallery) {
    assert.equal(item.label, '[PRECOMPUTED]');
  }
});