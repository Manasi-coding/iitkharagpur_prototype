// Phase person3 — Failure Gallery.
//
// Static/precomputed evidence. Every entry is explicitly labeled
// [PRECOMPUTED] so it is not mistaken for live simulation output.

const FAILURE_CASES = [
  {
    id: 'overload',
    title: 'Overload / Capacity Failure',
    label: '[PRECOMPUTED]',
    description: 'Retrieval quality degrades as stored patterns exceed capacity.',
  },
  {
    id: 'correlated-patterns',
    title: 'Correlated Patterns',
    label: '[PRECOMPUTED]',
    description: 'Highly correlated stored patterns make retrieval less distinct.',
  },
  {
    id: 'spurious-output',
    title: 'Spurious Output',
    label: '[PRECOMPUTED]',
    description: 'Overloaded retrieval can settle into an unintended output.',
  },
];

export function getFailureGallery() {
  return FAILURE_CASES.map((failure) => ({ ...failure }));
}