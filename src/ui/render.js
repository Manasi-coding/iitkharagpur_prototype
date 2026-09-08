// STOPGAP — see state.js header. Structure and wiring only, no styling
// polish, per spec. Mounts guidedSequence.js and proveItMode.js ONLY —
// deliberately does not mount claimContract.js/traceDebugPanel.js/
// bdhCallout.js/predictGate.js/failureGallery.js (Person 1/3's features;
// not confirmed as Person 2's call, interfaces not verified against this
// stopgap).
import { CONFIG } from '../config.js';
import { getState, setState, subscribe } from './state.js';
import { buildLayout } from './layout.js';
import { write } from '../core/write.js';
import { similarity } from '../core/similarity.js';
import { advanceGuidedSequence } from './features/guidedSequence.js';
import { startProveIt } from './features/proveItMode.js';

// Built ONCE, reused at all four call sites (thumbnails, query panel,
// output panel, ground-truth panel) — per spec, not duplicated anywhere.
export function renderPatternGrid(pattern, container) {
  container.innerHTML = '';
  const grid = document.createElement('div');
  grid.style.display = 'grid';
  grid.style.gridTemplateColumns = `repeat(${CONFIG.GRID_SIZE}, 8px)`;
  grid.className = 'pattern-grid';

  const cells = pattern && pattern.length > 0 ? pattern : Array.from({ length: CONFIG.PATTERN_DIM }, () => -1);
  for (const value of cells) {
    const cell = document.createElement('div');
    cell.style.width = '8px';
    cell.style.height = '8px';
    cell.style.background = value > 0 ? '#000' : '#eee';
    grid.appendChild(cell);
  }
  container.appendChild(grid);
}

function makeSlider(labelText, min, max, step, value) {
  const wrapper = document.createElement('label');
  const span = document.createElement('span');
  span.textContent = labelText;
  const input = document.createElement('input');
  input.type = 'range';
  input.min = String(min);
  input.max = String(max);
  input.step = String(step);
  input.value = String(value);
  wrapper.append(span, input);
  return { wrapper, input };
}

export function mount(root) {
  const { left, middle, right } = buildLayout(root);

  // --- Left: stored pattern thumbnails ---
  const thumbsContainer = document.createElement('div');
  thumbsContainer.id = 'thumbnails';
  left.appendChild(thumbsContainer);

  // --- Middle: controls ---
  const patternCount = makeSlider('Pattern count', CONFIG.MIN_PATTERNS, CONFIG.MAX_PATTERNS, 1, 3);
  const noise = makeSlider('Noise %', CONFIG.NOISE_MIN, CONFIG.NOISE_MAX, 1, 10);
  // Decay has no CONFIG-defined range (only CONFIG.DECAY_DEFAULT exists) —
  // [0, 1] is a reasonable stopgap bound, not derived from CONFIG.
  const decay = makeSlider('Decay', 0, 1, 0.1, CONFIG.DECAY_DEFAULT);

  const sparseLabel = document.createElement('label');
  const sparseToggle = document.createElement('input');
  sparseToggle.type = 'checkbox';
  sparseLabel.append('Sparse (BDH) ', sparseToggle);

  const nextButton = document.createElement('button');
  nextButton.textContent = 'Next';
  const watchButton = document.createElement('button');
  watchButton.textContent = 'Watch it fail';

  middle.append(patternCount.wrapper, noise.wrapper, decay.wrapper, sparseLabel, nextButton, watchButton);

  patternCount.input.addEventListener('input', () => setState({ patternCount: Number(patternCount.input.value) }));
  noise.input.addEventListener('input', () => setState({ noisePct: Number(noise.input.value) }));
  decay.input.addEventListener('input', () => setState({ decayValue: Number(decay.input.value) }));
  sparseToggle.addEventListener('change', () => setState({ sparseMode: sparseToggle.checked }));

  // Found via real browser testing, not inferred: guidedSequence/proveItMode
  // results have no similarityScore field, so passing them straight to
  // setState left the panels showing a fresh retrievalResult next to a
  // STALE score from whatever the sliders last computed. similarityScore is
  // filled in here, at the call site, against that same result's own
  // ground truth (its first stored pattern) — state.js's "trust a
  // caller-supplied retrievalResult as-is" rule stays simple and doesn't
  // need to special-case this per field.
  function withScore(result) {
    if (!result.retrievalResult || !result.storedPatterns) return result;
    const [groundTruth] = result.storedPatterns;
    return { ...result, similarityScore: similarity(result.retrievalResult.finalOutput, groundTruth.pattern) };
  }

  nextButton.addEventListener('click', () => {
    const result = advanceGuidedSequence(getState().guidedStepIndex, write);
    setState(withScore(result));
  });
  watchButton.addEventListener('click', () => {
    startProveIt(write, result => setState(withScore(result)));
  });

  // --- Right: query -> step-through -> final output beside ground truth, + score ---
  const queryContainer = document.createElement('div');
  const stepsContainer = document.createElement('div');
  stepsContainer.id = 'steps';
  const outputContainer = document.createElement('div');
  const groundTruthContainer = document.createElement('div');
  const scoreEl = document.createElement('div');
  scoreEl.id = 'similarity-score';

  right.append(
    labeled('Query', queryContainer),
    labeled('Steps', stepsContainer),
    labeled('Final output', outputContainer),
    labeled('Ground truth', groundTruthContainer),
    scoreEl
  );

  function labeled(text, el) {
    const wrap = document.createElement('div');
    const title = document.createElement('div');
    title.textContent = text;
    wrap.append(title, el);
    return wrap;
  }

  function renderAll(state) {
    thumbsContainer.innerHTML = '';
    for (const preset of state.storedPatterns) {
      const cell = document.createElement('div');
      renderPatternGrid(preset.pattern, cell);
      thumbsContainer.appendChild(cell);
    }

    renderPatternGrid(state.currentQuery, queryContainer);
    renderPatternGrid(state.retrievalResult.finalOutput, outputContainer);

    const [groundTruth] = state.storedPatterns;
    renderPatternGrid(groundTruth ? groundTruth.pattern : [], groundTruthContainer);

    stepsContainer.innerHTML = '';
    for (const step of state.retrievalResult.steps || []) {
      const stepCell = document.createElement('div');
      renderPatternGrid(step, stepCell);
      stepsContainer.appendChild(stepCell);
    }

    scoreEl.textContent = `Similarity: ${state.similarityScore}`;
  }

  subscribe(renderAll);
  renderAll(getState());
}
