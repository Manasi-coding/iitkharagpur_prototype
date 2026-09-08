// Phase person3 — Predict Gate.
//
// The user must make a prediction before the empirical result is revealed.

import { findCrossover } from '../../core/findCrossover.js';

export function createPredictGate() {
  return {
    revealed: false,
    guess: null,
    measuredCrossover: null,
  };
}

export function submitPrediction(guess, curve, threshold) {
  const numericGuess = Number(guess);

  if (!Number.isFinite(numericGuess)) {
    throw new Error('predictGate: guess must be a finite number');
  }

  const measuredCrossover = findCrossover(curve, threshold);

  return {
    revealed: true,
    guess: numericGuess,
    measuredCrossover,
    delta: numericGuess - measuredCrossover,
  };
}