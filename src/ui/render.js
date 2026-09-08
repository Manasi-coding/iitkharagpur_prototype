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

// UI-only constants (Phase F audit item 1): no CONFIG field governs slider
// step granularity or decay's display range, so these are named here
// rather than left as bare literals at each call site, and rather than
// silently reusing an unrelated CONFIG field the way NOISE_MAX/MIN were
// once misused for an unrelated purpose earlier in this project.
const SLIDER_STEP = 1;
const DECAY_MIN = 0;
const DECAY_MAX = 1;
const DECAY_STEP = 0.1;

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
  // Initial slider values read from state.js's actual current state, not a
  // second, independently-hardcoded copy of the same defaults (Phase F
  // audit item 1: the old (..., 1, 3) / (..., 1, 10) here duplicated
  // state.js's DEFAULT_PATTERN_COUNT/DEFAULT_NOISE_PCT — a drift risk if
  // either changed without the other).
  const initial = getState();
  const patternCount = makeSlider('Pattern count', CONFIG.MIN_PATTERNS, CONFIG.MAX_PATTERNS, SLIDER_STEP, initial.patternCount);
  const noise = makeSlider('Noise %', CONFIG.NOISE_MIN, CONFIG.NOISE_MAX, SLIDER_STEP, initial.noisePct);
  const decay = makeSlider('Decay', DECAY_MIN, DECAY_MAX, DECAY_STEP, initial.decayValue);

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
    // Found via the same real-browser check as the lock itself: startProveIt's
    // first tick doesn't fire until PROVE_IT_INTERVAL_MS after this call, so
    // without this line sliders would stay unlocked for the whole first
    // interval — locking must happen synchronously at click time, not wait
    // for the first result to arrive.
    setState({ guidedSequenceActive: true });
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

  // Spec 3.4/4.2: sliders stay disabled until the sequence completes. Locks
  // on guidedSequenceActive === true and re-enables on false, whether that
  // false comes from a natural finish or the blocked-state ending — both
  // set guidedSequenceActive: false, so no separate case is needed here.
  function setControlsDisabled(disabled) {
    patternCount.input.disabled = disabled;
    noise.input.disabled = disabled;
    decay.input.disabled = disabled;
    sparseToggle.disabled = disabled;
  }

  function renderAll(state) {
    setControlsDisabled(state.guidedSequenceActive === true);

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
