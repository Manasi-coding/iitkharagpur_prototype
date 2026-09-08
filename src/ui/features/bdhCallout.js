// Phase person3 — BDH empirical capacity callout.

import { findCrossover } from '../../core/findCrossover.js';

export function buildBdhCallout(capacityCurves, threshold) {
  const { classical, sparse } = capacityCurves;

  const classicalCrossover = findCrossover(classical, threshold);
  const sparseCrossover = findCrossover(sparse, threshold);

  return {
    text: `Classical degrades at N=${classicalCrossover}; BDH-mode holds until N=${sparseCrossover}.`,
    classicalCrossover,
    sparseCrossover,
  };
}