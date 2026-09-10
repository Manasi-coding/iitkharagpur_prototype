import { useCallback, useMemo, useRef, useState } from 'react';
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend, ReferenceLine } from 'recharts';
import ClaimBadge from '../components/ClaimBadge';
import PanelCard from '../components/PanelCard';
import FooterCard from '../components/Footer';
import PatternGrid from '../components/PatternGrid';
import InterferenceMap from '../components/InterferenceMap';
import NavTabs from '../components/NavTabs';

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
import { optimizeMemory } from '../../../src/core/optimizeMemory.js';
import { findCrossover } from '../../../src/core/findCrossover.js';

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

// Exported for App.jsx to use in the lifted-state updateSession closure.
export const CONTROL_FIELDS = ['patternCount', 'noisePct', 'decayValue', 'sparseMode', 'customStoredPatterns'];

// Same derivation the reference src/ui/state.js performs: recompute the
// stored patterns / query / retrieval / score from the current control
// values by calling the real core pipeline end to end.
export function deriveFromControls(current) {
  const allPresets = createPresetPatterns();
  let storedPatterns;
  if (current.customStoredPatterns) {
    storedPatterns = current.customStoredPatterns;
  } else {
    storedPatterns = allPresets.filter((_, index) => index < current.patternCount);
  }
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
export function withScore(result) {
  if (!result.retrievalResult || !result.storedPatterns) return result;
  const [groundTruth] = result.storedPatterns;
  return { ...result, similarityScore: similarity(result.retrievalResult.finalOutput, groundTruth.pattern) };
}

export function buildInitialSession() {
  const controls = {
    patternCount: DEFAULT_PATTERN_COUNT,
    noisePct: DEFAULT_NOISE_PCT,
    decayValue: CONFIG.DECAY_DEFAULT,
    sparseMode: false,
    guidedSequenceActive: false,
    guidedStepIndex: null,
    customStoredPatterns: null,
  };
  return { ...controls, ...deriveFromControls(controls) };
}

// ---------------------------------------------------------------------------
// DemoPage — now accepts session and session-mutation callbacks as props.
// All existing logic, handlers, and JSX are behaviorally identical.
// The only structural change is: session lives in App.jsx; DemoPage reads
// it via props and fires callbacks instead of calling setSession directly
// for the handlers that were already stateless relative to session
// (optimizer, replay, guessInput, trace, predictGate).
// ---------------------------------------------------------------------------
export default function DemoPage({
  session,
  updateSession,
  proveItRunning,
  setProveItRunning,
}) {
  const [trace, setTrace] = useState(true);
  const proveItRef = useRef(null);

  const [guessInput, setGuessInput] = useState('');
  const [predictGate, setPredictGate] = useState({ revealed: false, guess: null, measuredCrossover: null, delta: null });

  const [optimizerState, setOptimizerState] = useState({ optimizing: false, recommendation: null });
  const [replayState, setReplayState] = useState({ isReplaying: false, stepIndex: -1 });

  const handleReplay = useCallback(() => {
    if (replayState.isReplaying) return;
    setReplayState({ isReplaying: true, stepIndex: -1 }); // Start with query
    
    const maxSteps = session.retrievalResult.steps.length;
    let currentStep = -1;
    
    const interval = setInterval(() => {
      currentStep++;
      if (currentStep >= maxSteps) {
        clearInterval(interval);
        setTimeout(() => setReplayState({ isReplaying: false, stepIndex: -1 }), 1500); // Hold final state briefly
      } else {
        setReplayState({ isReplaying: true, stepIndex: currentStep });
      }
    }, 600);
  }, [session.retrievalResult.steps, replayState.isReplaying]);

  const currentRetrievalStepPattern = useMemo(() => {
    if (!replayState.isReplaying) return null;
    if (replayState.stepIndex === -1) return session.currentQuery;
    if (replayState.stepIndex < session.retrievalResult.steps.length) {
      return session.retrievalResult.steps[replayState.stepIndex];
    }
    return session.retrievalResult.finalOutput;
  }, [replayState, session.currentQuery, session.retrievalResult]);

  // Same handlers as original — operate on session via updateSession prop.
  const handleNext = useCallback(() => {
    const result = advanceGuidedSequence(session.guidedStepIndex, write);
    updateSession(withScore(result));
  }, [session.guidedStepIndex, updateSession]);

  const handleProveIt = useCallback(() => {
    updateSession({ guidedSequenceActive: true });
    setProveItRunning(true);
    proveItRef.current = startProveIt(write, (result) => {
      updateSession(withScore(result));
      if (result.guidedSequenceActive === false) {
        setProveItRunning(false);
      }
    });
  }, [updateSession, setProveItRunning]);

  const handleOptimizeMemory = useCallback(() => {
    setOptimizerState({ optimizing: true, recommendation: null });
    setTimeout(() => {
      const [groundTruth] = session.storedPatterns;
      if (!groundTruth) {
        setOptimizerState({ optimizing: false, recommendation: null });
        return;
      }
      const rec = optimizeMemory(
        session.storedPatterns,
        session.currentQuery,
        groundTruth.pattern,
        { sparse: session.sparseMode, decay: session.decayValue }
      );
      setOptimizerState({ optimizing: false, recommendation: rec });
    }, 10);
  }, [session.storedPatterns, session.currentQuery, session.sparseMode, session.decayValue]);

  const handleApplyRecommendation = useCallback(() => {
    if (!optimizerState.recommendation) return;
    const newPatterns = session.storedPatterns.filter((_, i) => i !== optimizerState.recommendation.recommendedIndex);
    updateSession({ customStoredPatterns: newPatterns });
    setOptimizerState({ optimizing: false, recommendation: null });
  }, [optimizerState.recommendation, session.storedPatterns, updateSession]);

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

  const predictiveForecast = useMemo(() => {
    const allPresets = createPresetPatterns();
    const options = { 
      sparse: session.sparseMode, 
      decay: session.decayValue, 
      noisePct: session.noisePct, 
      maxN: MAX_PATTERN_COUNT 
    };
    const sweepData = sweepCapacity(allPresets, options, { write });
    
    // findCrossover returns the FIRST pattern count where avgSimilarity < CONFIG.PASS_THRESHOLD
    const crossover = findCrossover(sweepData, CONFIG.PASS_THRESHOLD);
    
    let status = '';
    let safeCapacity = 0;
    
    if (crossover === 0) { // NO FAILURE OBSERVED inside the tested range
       status = 'SAFE / NO FAILURE OBSERVED';
       safeCapacity = MAX_PATTERN_COUNT;
    } else {
       safeCapacity = crossover - 1;
       if (session.patternCount < safeCapacity) {
          status = 'SAFE';
       } else if (session.patternCount === safeCapacity) {
          status = 'NEAR CAPACITY';
       } else {
          status = 'OVER CAPACITY';
       }
    }
    
    const remainingMargin = Math.max(0, safeCapacity - session.patternCount);

    const chartData = sweepData.map(point => ({
      n: point.n,
      similarity: Math.round(point.avgSimilarity * 100) / 100,
    }));

    return {
      sweepData,
      chartData,
      crossover,
      safeCapacity,
      status,
      remainingMargin
    };
  }, [session.sparseMode, session.decayValue, session.noisePct, session.patternCount]);

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
      <NavTabs />

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

        {/* Adaptive Memory Management Panel */}
        <PanelCard title="Adaptive Memory Management" icon="⛭">
          <p className="caption-line">Identify interference. Optimize retention. Verify recovery.</p>
          <div className="optimizer-content">
             <div className="similarity-section">
                <span className="sim-label">Current Similarity</span>
                <span className="sim-val">{session.similarityScore.toFixed(1)}%</span>
             </div>
             {optimizerState.recommendation ? (
               <div className="recommendation-results" style={{ marginTop: '1rem' }}>
                 <p>Recommended pattern to remove: <b>{optimizerState.recommendation.recommendedPattern.id}</b></p>
                 <p>Before → After similarity: {session.similarityScore.toFixed(1)}% → {optimizerState.recommendation.improvedSimilarity.toFixed(1)}%</p>
                 <p>Improvement: {(optimizerState.recommendation.improvedSimilarity - session.similarityScore).toFixed(1)}%</p>
                 <p className="caption-line">Removing {optimizerState.recommendation.recommendedPattern.id} produced the highest measured retrieval similarity.</p>
                 <div className="button-row" style={{ marginTop: '1rem' }}>
                   <button onClick={handleApplyRecommendation}>APPLY RECOMMENDATION</button>
                 </div>
               </div>
             ) : (
               <div className="button-row" style={{ marginTop: '1rem' }}>
                  <button onClick={handleOptimizeMemory} disabled={locked || session.storedPatterns.length <= 1}>
                    {optimizerState.optimizing ? 'Calculating...' : 'OPTIMIZE MEMORY'}
                  </button>
               </div>
             )}
          </div>
        </PanelCard>

        {/* Live Memory Interference Map */}
        <PanelCard title="Live Memory Interference Map" icon="⬡">
          <p className="caption-line">Visualize pairwise pattern similarity. Replay retrieval to see network activation.</p>
          <InterferenceMap 
            patterns={session.storedPatterns} 
            currentRetrievalStepPattern={currentRetrievalStepPattern}
            isReplaying={replayState.isReplaying}
          />
          <div className="button-row" style={{ marginTop: '1rem', justifyContent: 'center' }}>
            <button onClick={handleReplay} disabled={replayState.isReplaying || locked}>
              {replayState.isReplaying ? 'Replaying...' : 'Replay Retrieval'}
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

      {/* Predictive Capacity Forecast Panel (Full Width) */}
      <div style={{ marginBottom: '24px' }}>
        <PanelCard title="Predictive Capacity Forecast">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', padding: '0.5rem 0' }}>
            {/* Header/Status Area */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--light-border)', paddingBottom: '1.5rem' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.25rem', color: 'var(--light-text-primary)' }}>
                  {session.patternCount} / {MAX_PATTERN_COUNT} patterns loaded · {MAX_PATTERN_COUNT - session.patternCount} remaining
                </h3>
                <p className="caption-line" style={{ margin: '0.5rem 0 0 0' }}>
                  Empirical sweep under current noise ({session.noisePct}%), decay ({session.decayValue.toFixed(1)}), and {session.sparseMode ? 'BDH Sparse' : 'Classical'} learning mode.
                </p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--light-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>System Status</span>
                <div style={{
                  fontSize: '1.5rem', 
                  fontWeight: '800',
                  color: predictiveForecast.status.includes('SAFE') ? 'var(--teal-primary)' : 
                         predictiveForecast.status === 'NEAR CAPACITY' ? '#f59e0b' : '#ef4444'
                }}>
                  {predictiveForecast.status}
                </div>
              </div>
            </div>

            {/* Metrics & Chart row */}
            <div style={{ display: 'flex', gap: '2rem', alignItems: 'center' }}>
              {/* Metrics column */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', minWidth: '220px' }}>
                <div style={{ background: 'var(--light-bg)', padding: '1.25rem', borderRadius: '8px', border: '1px solid var(--light-border)' }}>
                  <span style={{ display: 'block', fontSize: '0.85rem', color: 'var(--light-text-muted)', marginBottom: '0.25rem' }}>Current Load</span>
                  <span style={{ display: 'block', fontSize: '1.75rem', fontWeight: 'bold', color: 'var(--light-text-primary)' }}>{session.patternCount}</span>
                </div>
                <div style={{ background: 'var(--light-bg)', padding: '1.25rem', borderRadius: '8px', border: '1px solid var(--light-border)' }}>
                  <span style={{ display: 'block', fontSize: '0.85rem', color: 'var(--light-text-muted)', marginBottom: '0.25rem' }}>Measured Safe Capacity</span>
                  <span style={{ display: 'block', fontSize: '1.75rem', fontWeight: 'bold', color: 'var(--light-text-primary)' }}>{predictiveForecast.crossover === 0 ? `≥${MAX_PATTERN_COUNT}` : predictiveForecast.safeCapacity}</span>
                </div>
                <div style={{ background: 'var(--light-bg)', padding: '1.25rem', borderRadius: '8px', border: '1px solid var(--light-border)' }}>
                  <span style={{ display: 'block', fontSize: '0.85rem', color: 'var(--light-text-muted)', marginBottom: '0.25rem' }}>Remaining Margin</span>
                  <span style={{ display: 'block', fontSize: '1.75rem', fontWeight: 'bold', color: 'var(--light-text-primary)' }}>{predictiveForecast.remainingMargin}</span>
                </div>
              </div>

              {/* Chart column */}
              <div style={{ flex: 1, minWidth: 0, paddingLeft: '1rem' }}>
                <ResponsiveContainer width="100%" height={360}>
                  <LineChart data={predictiveForecast.chartData} margin={{ top: 20, right: 30, left: 0, bottom: 20 }}>
                    <XAxis dataKey="n" stroke="var(--light-text-muted)" tickMargin={10} />
                    <YAxis domain={[0, 100]} stroke="var(--light-text-muted)" tickMargin={10} />
                    <Tooltip
                      contentStyle={{
                        background: 'var(--light-card-bg)',
                        borderColor: 'var(--light-border)',
                        color: 'var(--light-text-primary)',
                        borderRadius: '8px',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                      }}
                    />
                    
                    <ReferenceLine y={CONFIG.PASS_THRESHOLD} stroke="#ef4444" strokeDasharray="4 4" strokeWidth={2} label={{ position: 'insideTopLeft', value: 'Failure Boundary', fill: '#ef4444', fontSize: 13, fontWeight: 600, dy: -10 }} />
                    <ReferenceLine x={session.patternCount} stroke="var(--teal-primary)" strokeWidth={2} strokeDasharray="3 3" label={{ position: 'insideBottomRight', value: 'Current Load', fill: 'var(--teal-hover)', fontSize: 13, fontWeight: 600, dx: -10, dy: 10 }} />
                    
                    <Line type="monotone" dataKey="similarity" stroke="var(--teal-primary)" strokeWidth={4} dot={{ r: 5, fill: '#fff', strokeWidth: 2 }} activeDot={{ r: 8 }} name="Measured Similarity" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
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
