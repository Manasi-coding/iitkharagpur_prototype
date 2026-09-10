import { useCallback, useMemo, useRef, useState } from 'react';
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend } from 'recharts';
import ClaimBadge from '../components/ClaimBadge';
import PanelCard from '../components/PanelCard';
import FooterCard from '../components/Footer';
import PatternGrid from '../components/PatternGrid';

import { CONFIG } from '../../../src/config.js';
import { createPresetPatterns } from '../../../src/core/createPresetPatterns.js';
import { write } from '../../../src/core/write.js';
import { retrieveIterative } from '../../../src/core/retrieveIterative.js';
import { similarity } from '../../../src/core/similarity.js';
import { injectNoise } from '../../../src/core/injectNoise.js';
import { sweepCapacity } from '../../../src/core/sweepCapacity.js';
import { advanceGuidedSequence } from '../../../src/ui/features/guidedSequence.js';
import { startProveIt } from '../../../src/ui/features/proveItMode.js';
import { getFailureGallery } from '../../../src/ui/features/failureGallery.js';
import { buildRetrievalTrace } from '../../../src/ui/features/traceDebugPanel.js';
import { buildBdhCallout } from '../../../src/ui/features/bdhCallout.js';
import { submitPrediction } from '../../../src/ui/features/predictGate.js';
import { renderClaimHeader } from '../../../src/ui/features/claimContract.js';

// createPresetPatterns.js only ships 9 shapes even though CONFIG.MAX_PATTERNS
// is 20 — cap every pattern-count control at whichever is smaller, mirroring
// the Math.min(maxN, patterns.length) guard used throughout src/core/.
const MAX_PATTERN_COUNT = Math.min(CONFIG.MAX_PATTERNS, createPresetPatterns().length);

// On-load defaults — mirrors the N=3 / 10%-noise convention already
// established in guidedSequence.js and the reference stopgap state.js.
const DEFAULT_PATTERN_COUNT = 3;
const DEFAULT_NOISE_PCT = 10;

const DECAY_MIN = 0;
const DECAY_MAX = 1;
const DECAY_STEP = 0.1;

const CONTROL_FIELDS = ['patternCount', 'noisePct', 'decayValue', 'sparseMode'];

// Same derivation the reference src/ui/state.js performs: recompute the
// stored patterns / query / retrieval / score from the current control
// values by calling the real core pipeline end to end.
function deriveFromControls(current) {
  const allPresets = createPresetPatterns();
  const storedPatterns = allPresets.filter((_, index) => index < current.patternCount);
  const [basePreset] = storedPatterns.length > 0 ? storedPatterns : allPresets;

  const currentQuery = injectNoise(basePreset.pattern, current.noisePct);
  const W = write(
    storedPatterns.map((preset) => preset.pattern),
    { sparse: current.sparseMode, decay: current.decayValue }
  );
  const retrievalResult = retrieveIterative(currentQuery, W);
  const similarityScore = similarity(retrievalResult.finalOutput, basePreset.pattern);

  return { storedPatterns, currentQuery, retrievalResult, similarityScore };
}

// guidedSequence.js / proveItMode.js results don't include a similarityScore
// field — fill it in at the call site against that same result's own ground
// truth, same as the reference render.js's withScore().
function withScore(result) {
  if (!result.retrievalResult || !result.storedPatterns) return result;
  const [groundTruth] = result.storedPatterns;
  return { ...result, similarityScore: similarity(result.retrievalResult.finalOutput, groundTruth.pattern) };
}

function buildInitialSession() {
  const controls = {
    patternCount: DEFAULT_PATTERN_COUNT,
    noisePct: DEFAULT_NOISE_PCT,
    decayValue: CONFIG.DECAY_DEFAULT,
    sparseMode: false,
    guidedSequenceActive: false,
    guidedStepIndex: null,
  };
  return { ...controls, ...deriveFromControls(controls) };
}

export default function DemoPage() {
  const [session, setSession] = useState(buildInitialSession);
  const [trace, setTrace] = useState(true);
  const [proveItRunning, setProveItRunning] = useState(false);
  const proveItRef = useRef(null);

  const [guessInput, setGuessInput] = useState('');
  const [predictGate, setPredictGate] = useState({ revealed: false, guess: null, measuredCrossover: null, delta: null });

  // Same merge semantics as the reference state.js setState(): control-field
  // changes trigger a fresh real-pipeline recompute; a caller-supplied
  // retrievalResult (guided sequence / Prove It) is trusted as-is instead.
  const updateSession = useCallback((partial) => {
    setSession((prev) => {
      const next = { ...prev, ...partial };
      const touchesControls = CONTROL_FIELDS.some((field) => field in partial);
      const callerSuppliedResult = 'retrievalResult' in partial;
      if (touchesControls && !callerSuppliedResult) {
        Object.assign(next, deriveFromControls(next));
      }
      return next;
    });
  }, []);

  const handleNext = useCallback(() => {
    const result = advanceGuidedSequence(session.guidedStepIndex, write);
    updateSession(withScore(result));
  }, [session.guidedStepIndex, updateSession]);

  const handleProveIt = useCallback(() => {
    // Must lock synchronously at click time — startProveIt's first tick
    // doesn't fire until PROVE_IT_INTERVAL_MS later, so waiting for the
    // first onStep result would leave sliders unlocked for the whole
    // first interval.
    updateSession({ guidedSequenceActive: true });
    setProveItRunning(true);
    proveItRef.current = startProveIt(write, (result) => {
      updateSession(withScore(result));
      if (result.guidedSequenceActive === false) {
        setProveItRunning(false);
      }
    });
  }, [updateSession]);

  // Real empirical capacity curves (classical vs sparse/BDH), computed live
  // against the current noise level via src/core/sweepCapacity.js — replaces
  // the old fabricated overlap() formula. sweepCapacity() only forwards
  // `sparse` to write(), not decay, so this curve doesn't reflect the decay
  // slider (a limitation of that read-only contract, not hidden here).
  const capacityCurves = useMemo(() => {
    const allPresets = createPresetPatterns();
    const options = { noisePct: session.noisePct, maxN: MAX_PATTERN_COUNT };
    return {
      classical: sweepCapacity(allPresets, { ...options, sparse: false }, { write }),
      sparse: sweepCapacity(allPresets, { ...options, sparse: true }, { write }),
    };
  }, [session.noisePct]);

  const chartData = useMemo(
    () =>
      capacityCurves.classical.map((point, index) => ({
        n: point.n,
        classical: Math.round(point.avgSimilarity * 100) / 100,
        sparse: Math.round((capacityCurves.sparse[index]?.avgSimilarity ?? 0) * 100) / 100,
      })),
    [capacityCurves]
  );

  const bdhCallout = useMemo(() => buildBdhCallout(capacityCurves, CONFIG.PASS_THRESHOLD), [capacityCurves]);

  // claimContract.js's claim text (PLACEHOLDER_CLAIM) is still an
  // unresolved, unowned team decision (see README_PHASE0.md) — read it from
  // the real export as-is rather than substituting a nicer sentence, so the
  // placeholder stays visibly a placeholder for whoever finishes that file.
  const claimHeader = useMemo(
    () => renderClaimHeader({ similarityScore: session.similarityScore }),
    [session.similarityScore]
  );

  const failureGallery = useMemo(() => getFailureGallery(), []);

  const [groundTruth] = session.storedPatterns;
  const debugTrace = useMemo(
    () => (groundTruth ? buildRetrievalTrace(session.retrievalResult, groundTruth.pattern) : []),
    [session.retrievalResult, groundTruth]
  );

  const handleRevealChart = () => {
    setPredictGate(submitPrediction(guessInput, capacityCurves.classical, CONFIG.PASS_THRESHOLD));
  };
  const handleChangeGuess = () => {
    setPredictGate({ revealed: false, guess: null, measuredCrossover: null, delta: null });
    setGuessInput('');
  };

  const locked = session.guidedSequenceActive === true;
  const nextDisabled = proveItRunning;
  const proveItDisabled = proveItRunning || session.guidedSequenceActive;

  return (
    <div className="main-wrapper">
      {/* Permanent visible caps note — real CONFIG values, not hardcoded */}
      <div className="caps-note">
        <span>
          <b>SYSTEM CAPACITIES:</b> Pattern Size = {CONFIG.PATTERN_DIM} bits ({CONFIG.GRID_SIZE}×{CONFIG.GRID_SIZE} grid)
          &nbsp;|&nbsp; Presets Available = {MAX_PATTERN_COUNT} &nbsp;|&nbsp; Noise Range = {CONFIG.NOISE_MIN}% - {CONFIG.NOISE_MAX}%
        </span>
      </div>

      {/* 1. Top bar with claim + live badge + info tooltip */}
      <ClaimBadge similarity={session.similarityScore} threshold={CONFIG.PASS_THRESHOLD} claimText={claimHeader.claimText} />

      <div className="workbench">
        {/* 2. Stored Patterns panel — the actual presets currently written into memory */}
        <PanelCard title="Stored Patterns" icon="▦">
          <div className="preset-thumb-grid">
            {session.storedPatterns.map((preset, index) => (
              <div key={preset.id} className={`preset-thumb ${index === 0 ? 'probe-source' : ''}`}>
                <PatternGrid pattern={preset.pattern} cellSize={5} />
                <small>{preset.id}{index === 0 ? ' (probe)' : ''}</small>
              </div>
            ))}
          </div>
        </PanelCard>

        {/* 3. Controls panel */}
        <PanelCard title="Controls" icon="☷" className="controls">
          <div className="mode-toggle">
            <button
              onClick={() => updateSession({ sparseMode: false })}
              className={!session.sparseMode ? 'active classical' : ''}
              disabled={locked}
            >
              Classical Hebbian
            </button>
            <button
              onClick={() => updateSession({ sparseMode: true })}
              className={session.sparseMode ? 'active bdh' : ''}
              disabled={locked}
            >
              Sparse (BDH)
            </button>
          </div>

          <p className="caption-line">
            {session.sparseMode
              ? 'write() keeps only the top-magnitude positive contributions per pattern before accumulating.'
              : 'write() accumulates the full dense outer product of every stored pattern.'}
          </p>

          <div className="comparison-sentence">{bdhCallout.text}</div>

          <div className="sliders-group">
            <label className="slider-label">
              <span>Pattern Count: <b>{session.patternCount}</b></span>
              <input
                type="range"
                min={CONFIG.MIN_PATTERNS}
                max={MAX_PATTERN_COUNT}
                value={session.patternCount}
                disabled={locked}
                onChange={(e) => updateSession({ patternCount: Number(e.target.value) })}
              />
            </label>

            <label className="slider-label">
              <span>Noise: <b>{session.noisePct}%</b></span>
              <input
                type="range"
                min={CONFIG.NOISE_MIN}
                max={CONFIG.NOISE_MAX}
                value={session.noisePct}
                disabled={locked}
                onChange={(e) => updateSession({ noisePct: Number(e.target.value) })}
              />
            </label>

            <label className="slider-label">
              <span>Decay: <b>{session.decayValue.toFixed(1)}</b></span>
              <input
                type="range"
                min={DECAY_MIN}
                max={DECAY_MAX}
                step={DECAY_STEP}
                value={session.decayValue}
                disabled={locked}
                onChange={(e) => updateSession({ decayValue: Number(e.target.value) })}
              />
              {session.decayValue === 0 && (
                <small className="decay-note">
                  At decay=0, only the most-recently written pattern survives — this is a hard cutoff, not gradual fading.
                </small>
              )}
            </label>
          </div>

          {locked && <div className="lock-indicator">🔒 Sliders locked during Guided Sequence</div>}

          <label className="check-label">
            <input type="checkbox" checked={trace} onChange={(e) => setTrace(e.target.checked)} />
            Trace the Math
          </label>

          <div className="button-row">
            <button onClick={handleNext} disabled={nextDisabled}>Next</button>
            <button className="prove-btn" onClick={handleProveIt} disabled={proveItDisabled}>
              {proveItRunning ? 'Running…' : 'Prove It'}
            </button>
          </div>
        </PanelCard>

        {/* 4. Query / Retrieval / Truth panel */}
        <PanelCard title="Query → Retrieval → Truth" icon="◉">
          <div className="retrieval-container">
            <div className="retrieval-step">
              <PatternGrid pattern={session.currentQuery} />
              <small>Query</small>
            </div>
            <div className="step-arrow">→</div>
            <div className="retrieval-step">
              <div className="step-strip">
                {(session.retrievalResult.steps || []).map((step, index) => (
                  <span key={index}>
                    S{index}: {similarity(step, groundTruth ? groundTruth.pattern : step).toFixed(0)}%
                  </span>
                ))}
              </div>
              <small>Iterative Steps ({session.retrievalResult.iterationCount} iters, {session.retrievalResult.converged ? 'converged' : 'max iter'})</small>
            </div>
            <div className="step-arrow">→</div>
            <div className="retrieval-step">
              <PatternGrid pattern={session.retrievalResult.finalOutput} />
              <small>Retrieved</small>
            </div>
            <div className="retrieval-step">
              <PatternGrid pattern={groundTruth ? groundTruth.pattern : []} />
              <small>Ground Truth</small>
            </div>
          </div>

          {session.blocked && (
            <div className="lock-indicator">
              Guided sequence blocked: {session.reason} (requested N={session.requestedN}, available N={session.availableN})
            </div>
          )}
          {session.caption && <div className="comparison-sentence">{session.caption}</div>}

          <div className="similarity-section">
            <span className="sim-label">Similarity Score</span>
            <span className="sim-val">{session.similarityScore.toFixed(1)}%</span>
          </div>
        </PanelCard>
      </div>

      {/* Live Numeric Debug Panel (Trace-the-Math) */}
      {trace && (
        <div className="debug-panel">
          <h4>Trace-the-Math Debug Panel</h4>
          <table className="debug-table">
            <thead>
              <tr>
                <th>N (Size)</th>
                <th>Patterns (P)</th>
                <th>Noise</th>
                <th>Decay</th>
                <th>Mode</th>
                <th>Step</th>
                <th>Similarity to Target</th>
              </tr>
            </thead>
            <tbody>
              {debugTrace.map((row) => (
                <tr key={row.step}>
                  <td>{CONFIG.PATTERN_DIM}</td>
                  <td>{session.patternCount}</td>
                  <td>{session.noisePct}%</td>
                  <td>{session.decayValue.toFixed(1)}</td>
                  <td>{session.sparseMode ? 'Sparse (BDH)' : 'Classical'}</td>
                  <td>Step {row.step}</td>
                  <td>{row.similarityToTarget.toFixed(1)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 5. Predict-Before-You-See Gate + real empirical capacity chart */}
      <section className="chart-section">
        <h3>Retrieval Similarity vs Pattern Count</h3>

        {!predictGate.revealed ? (
          <div className="prediction-gate">
            <h4>Predict-Before-You-See Gate</h4>
            <p>
              At what pattern count (P) will Classical Hebbian retrieval similarity drop below{' '}
              {CONFIG.PASS_THRESHOLD}% under {session.noisePct}% noise?
            </p>
            <div className="gate-controls">
              <input
                type="number"
                min={CONFIG.MIN_PATTERNS}
                max={MAX_PATTERN_COUNT}
                placeholder={`Enter estimate (1-${MAX_PATTERN_COUNT})`}
                value={guessInput}
                onChange={(e) => setGuessInput(e.target.value)}
              />
              <button onClick={handleRevealChart} disabled={!guessInput}>Reveal Chart</button>
            </div>
          </div>
        ) : (
          <>
            <div className="prediction-feedback">
              <span>
                Your Prediction: P = <b>{predictGate.guess}</b> — Measured Crossover: P = <b>{predictGate.measuredCrossover}</b>
                {predictGate.delta !== null && ` (off by ${Math.abs(predictGate.delta)})`}
              </span>
              <button onClick={handleChangeGuess} className="reset-gate">Change Guess</button>
            </div>
            <div className="chart-container">
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={chartData}>
                  <XAxis dataKey="n" stroke="var(--light-text-muted)" />
                  <YAxis domain={[0, 100]} stroke="var(--light-text-muted)" />
                  <Tooltip
                    contentStyle={{
                      background: 'var(--light-card-bg)',
                      borderColor: 'var(--light-border)',
                      color: 'var(--light-text-primary)',
                    }}
                  />
                  <Legend />
                  {/* Classical keeps the soft-amber accent per the theme's "amber only for the
                      Classical comparison value" rule; Sparse (BDH) uses the shared teal token. */}
                  <Line dataKey="classical" stroke="#f59e0b" strokeWidth={2} dot name="Classical Hebbian" />
                  <Line dataKey="sparse" stroke="var(--teal-primary)" strokeWidth={2} dot name="BDH Sparse" />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <p className="chart-caption">
              Live empirical sweep (src/core/sweepCapacity.js) over the {MAX_PATTERN_COUNT} available presets at {session.noisePct}% noise — not a smooth theoretical curve, so it can plateau or move non-monotonically exactly as measured.
            </p>
          </>
        )}
      </section>

      {/* 6. Failure gallery — real precomputed data from failureGallery.js */}
      <section className="failure-section">
        <h3>Failure Modes</h3>
        <div className="failure-grid">
          {failureGallery.map((failure) => (
            <div key={failure.id} className="failure-card">
              <span className="failure-label">{failure.label}</span>
              <h4>{failure.title}</h4>
              <p>{failure.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 7. Small footer card */}
      <FooterCard
        classicalCrossover={bdhCallout.classicalCrossover}
        sparseCrossover={bdhCallout.sparseCrossover}
        threshold={CONFIG.PASS_THRESHOLD}
        noisePct={session.noisePct}
      />
    </div>
  );
}
