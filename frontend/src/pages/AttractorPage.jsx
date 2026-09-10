import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import NavTabs from '../components/NavTabs';
import PatternGrid from '../components/PatternGrid';
import { computeEnergy } from '../../../src/core/energy.js';
import { similarity } from '../../../src/core/similarity.js';
import { write } from '../../../src/core/write.js';
import { CONFIG } from '../../../src/config.js';

// ---------------------------------------------------------------------------
// AttractorPage — read-only view of the current experiment's retrieval
// trajectory, visualized as an animated energy-descending path toward
// a stable Hopfield attractor.
//
// This page does NOT:
//   - run a second retrieval simulation
//   - modify session state
//   - fabricate intermediate states or continuous energy landscapes
//   - invent capacity values or theoretical bounds
//
// All states shown are the ACTUAL steps from retrievalResult.steps.
// All energies are computed from the REAL weight matrix W using energy.js.
//
// Label convention:
//   "Attractor Dynamics"
//   "Energy descent during retrieval"
//   "Each point represents an actual retrieval state. Energy is computed
//    from the learned weight matrix."
// ---------------------------------------------------------------------------

const STEP_INTERVAL_MS = 700;
const HOLD_AFTER_MS = 2000;

export default function AttractorPage({ session }) {
  // -------------------------------------------------------------------------
  // Derive all needed values from session — no new simulation.
  // -------------------------------------------------------------------------
  const W = useMemo(() => {
    if (!session.storedPatterns || session.storedPatterns.length === 0) return null;
    return write(
      session.storedPatterns.map((p) => p.pattern),
      { sparse: session.sparseMode, decay: session.decayValue }
    );
  }, [session.storedPatterns, session.sparseMode, session.decayValue]);

  const [groundTruth] = session.storedPatterns ?? [];

  // Build the trajectory: steps already includes the noisy query at index 0
  // (retrieveIterative's return: steps = [query, ...iterationResults])
  const trajectory = useMemo(() => {
    if (!W || !groundTruth) return [];
    return (session.retrievalResult.steps ?? []).map((state, i) => ({
      state,
      energy: computeEnergy(state, W),
      similarity: similarity(state, groundTruth.pattern),
      label: i === 0 ? 'Noisy Query' : `Step ${i}`,
      isQuery: i === 0,
      isFinal: i === (session.retrievalResult.steps.length - 1),
    }));
  }, [session.retrievalResult.steps, W, groundTruth]);

  // Attractor label: based on actual similarity (same threshold used by ClaimBadge)
  const attractorLabel = useMemo(() => {
    if (!groundTruth) return null;
    const finalSim = similarity(session.retrievalResult.finalOutput, groundTruth.pattern);
    return finalSim >= CONFIG.PASS_THRESHOLD
      ? { text: '✓ CORRECT ATTRACTOR', color: '#10b981' }
      : { text: '⚠ WRONG ATTRACTOR', color: '#f59e0b' };
  }, [session.retrievalResult.finalOutput, groundTruth]);

  // -------------------------------------------------------------------------
  // Animation state
  // -------------------------------------------------------------------------
  const [activeStep, setActiveStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const intervalRef = useRef(null);

  const clearTimer = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const handlePlay = useCallback(() => {
    if (trajectory.length === 0) return;
    setIsPlaying(true);
    setActiveStep(0);
    let step = 0;
    intervalRef.current = setInterval(() => {
      step++;
      if (step >= trajectory.length) {
        clearTimer();
        setTimeout(() => setIsPlaying(false), HOLD_AFTER_MS);
      } else {
        setActiveStep(step);
      }
    }, STEP_INTERVAL_MS);
  }, [trajectory]);

  const handlePause = useCallback(() => {
    clearTimer();
    setIsPlaying(false);
  }, []);

  const handleReplay = useCallback(() => {
    clearTimer();
    setActiveStep(0);
    handlePlay();
  }, [handlePlay]);

  // Stop animation when session changes (new experiment)
  useEffect(() => {
    clearTimer();
    setActiveStep(0);
    setIsPlaying(false);
  }, [session.retrievalResult]);

  // Cleanup on unmount
  useEffect(() => () => clearTimer(), []);

  // -------------------------------------------------------------------------
  // Energy range — kept for potential future use; nodes are evenly spaced
  // vertically rather than energy-mapped, to guarantee no overlap.
  // -------------------------------------------------------------------------
  const energyRange = useMemo(() => {
    if (trajectory.length === 0) return { min: 0, max: 1 };
    const values = trajectory.map((t) => t.energy);
    return { min: Math.min(...values), max: Math.max(...values) };
  }, [trajectory]);

  if (!groundTruth || trajectory.length === 0) {
    return (
      <div className="main-wrapper">
        <NavTabs />
        <div className="attractor-empty">
          <p>No retrieval trajectory available. Configure an experiment in Memory Lab first.</p>
        </div>
      </div>
    );
  }

  // -----------------------------------------------------------------------
  // SVG layout constants — carefully sized to prevent label overlap.
  //
  // Label placement strategy:
  //   LEFT column  (textAnchor=end):   state name ("Noisy Query", "Step N")
  //   RIGHT column (textAnchor=start): energy value, then similarity below it
  //   ABOVE final node:                attractor verdict badge (rect + text)
  //   LEFT MARGIN (x≈60):              axis labels ("↑ High Energy", "↓ Attractor")
  //
  // All numbers are derived from CANVAS_W, CANVAS_H, NODE_R, and the two
  // padding constants — nothing is hard-coded in the JSX below.
  // -----------------------------------------------------------------------
  const CANVAS_W = 900;
  const CANVAS_H = 640;
  const LANE_X = CANVAS_W / 2;
  const NODE_R = 22;
  const PAD_TOP = 100;  // extra room above first node for axis label + badge gap
  const PAD_BOT = 80;   // extra room below last node for axis label
  const usableH = CANVAS_H - PAD_TOP - PAD_BOT;

  // Evenly distribute trajectory nodes across the usable vertical height.
  // Energy-mapped positioning was removed because it caused overlap when
  // consecutive energies are nearly equal.
  const nodePositions = trajectory.map((t, i) => {
    const y = PAD_TOP + (i / Math.max(trajectory.length - 1, 1)) * usableH;
    return { ...t, x: LANE_X, y };
  });

  const activeNode = nodePositions[activeStep] ?? nodePositions[nodePositions.length - 1];

  // Label column x positions
  const LABEL_LEFT  = LANE_X - NODE_R - 20;  // state name, anchor=end
  const INFO_RIGHT  = LANE_X + NODE_R + 20;   // energy + similarity, anchor=start

  // Attractor badge dimensions — rendered as a rect+text ABOVE the final node.
  // The badge bottom edge sits BADGE_BOTTOM_GAP pixels above the node centre,
  // which is always clear of the node circle (radius NODE_R+4) and its glow ring.
  const BADGE_H          = 26;
  const BADGE_W          = 210;
  const BADGE_BOTTOM_GAP = NODE_R + 16; // gap from node centre to badge bottom edge

  return (
    <div className="attractor-page main-wrapper">
      <NavTabs />

      {/* ------------------------------------------------------------------ */}
      {/* Header                                                              */}
      {/* ------------------------------------------------------------------ */}
      <div className="attractor-header">
        <div>
          <h1 className="attractor-title">Attractor Dynamics</h1>
          <p className="attractor-subtitle">Energy descent during retrieval</p>
          <p className="attractor-meta">
            {session.sparseMode ? 'BDH Sparse' : 'Classical Hebbian'} ·{' '}
            {session.patternCount} pattern{session.patternCount !== 1 ? 's' : ''} ·{' '}
            {session.noisePct}% noise · decay {session.decayValue.toFixed(1)}
          </p>
        </div>
        {attractorLabel && (
          <div className="attractor-verdict" style={{ color: attractorLabel.color }}>
            {attractorLabel.text}
          </div>
        )}
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Main visualization + side panels                                    */}
      {/* ------------------------------------------------------------------ */}
      <div className="attractor-body">

        {/* ── Left panel: stored patterns ── */}
        <div className="attractor-side-panel">
          <h3 className="side-panel-title">Stored Patterns</h3>
          <div className="attractor-stored-list">
            {session.storedPatterns.map((p, i) => (
              <div key={p.id} className={`attractor-stored-item ${i === 0 ? 'probe-source' : ''}`}>
                <PatternGrid pattern={p.pattern} cellSize={4} />
                <span className="attractor-stored-label">{p.id}{i === 0 ? ' (target)' : ''}</span>
              </div>
            ))}
          </div>

          {/* Active step metrics */}
          <div className="attractor-step-info">
            <div className="step-info-row">
              <span className="step-info-label">State</span>
              <span className="step-info-val">{activeNode.label}</span>
            </div>
            <div className="step-info-row">
              <span className="step-info-label">Energy</span>
              <span className="step-info-val mono">{activeNode.energy.toFixed(1)}</span>
            </div>
            <div className="step-info-row">
              <span className="step-info-label">Similarity</span>
              <span className="step-info-val mono">{activeNode.similarity.toFixed(1)}%</span>
            </div>
            <div className="step-info-row">
              <span className="step-info-label">Iteration</span>
              <span className="step-info-val">{activeStep} / {trajectory.length - 1}</span>
            </div>
          </div>
        </div>

        {/* ── Centre: SVG trajectory canvas ── */}
        <div className="attractor-canvas-wrap">
          <svg
            viewBox={`0 0 ${CANVAS_W} ${CANVAS_H}`}
            className="attractor-svg"
            aria-label="Hopfield retrieval trajectory visualisation"
          >
            <defs>
              <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="8" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
              <filter id="edge-glow" x="-30%" y="-30%" width="160%" height="160%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
              <linearGradient id="bgGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#0f172a" />
                <stop offset="100%" stopColor="#1e293b" />
              </linearGradient>
              <linearGradient id="edgeGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#6366f1" stopOpacity="0.3" />
                <stop offset="100%" stopColor="#0d9488" stopOpacity="0.9" />
              </linearGradient>
            </defs>

            {/* Background */}
            <rect width={CANVAS_W} height={CANVAS_H} fill="url(#bgGrad)" rx="16" />

            {/* ── Axis labels: LEFT MARGIN (x≈60), clear of all node columns ── */}
            <text x={60} y={PAD_TOP - 12} fill="#475569" fontSize="12" textAnchor="middle">↑</text>
            <text x={60} y={PAD_TOP + 4}  fill="#475569" fontSize="11" textAnchor="middle">High</text>
            <text x={60} y={PAD_TOP + 17} fill="#475569" fontSize="11" textAnchor="middle">Energy</text>

            <text x={60} y={CANVAS_H - PAD_BOT - 18} fill="#0d9488" fontSize="11" textAnchor="middle">Attractor</text>
            <text x={60} y={CANVAS_H - PAD_BOT - 5}  fill="#0d9488" fontSize="11" textAnchor="middle">(Low E)</text>
            <text x={60} y={CANVAS_H - PAD_BOT + 10}  fill="#0d9488" fontSize="12" textAnchor="middle">↓</text>

            {/* Vertical descent axis */}
            <line
              x1={LANE_X} y1={PAD_TOP}
              x2={LANE_X} y2={CANVAS_H - PAD_BOT}
              stroke="#334155" strokeWidth="2" strokeDasharray="4 4"
            />

            {/* Edges between consecutive nodes */}
            {nodePositions.slice(0, -1).map((from, i) => {
              const to = nodePositions[i + 1];
              const isActive = i < activeStep;
              return (
                <line
                  key={`edge-${i}`}
                  x1={from.x} y1={from.y}
                  x2={to.x}   y2={to.y}
                  stroke={isActive ? 'url(#edgeGrad)' : '#1e293b'}
                  strokeWidth={isActive ? 3 : 1.5}
                  filter={isActive ? 'url(#edge-glow)' : undefined}
                  style={{ transition: 'stroke 0.4s ease, stroke-width 0.4s ease' }}
                />
              );
            })}

            {/* Nodes — rendered last so they sit on top of edges */}
            {nodePositions.map((node, i) => {
              const isActive = i === activeStep;
              const isPast   = i < activeStep;
              const isFinal  = i === nodePositions.length - 1;

              let fill, stroke, r;
              if (isFinal) {
                fill   = attractorLabel?.color === '#10b981' ? '#10b981' : '#f59e0b';
                stroke = fill;
                r      = NODE_R + 4;
              } else if (isActive) {
                fill   = '#6366f1';
                stroke = '#818cf8';
                r      = NODE_R + 2;
              } else if (isPast) {
                fill   = '#1e3a5f';
                stroke = '#0d9488';
                r      = NODE_R;
              } else {
                fill   = '#0f172a';
                stroke = '#334155';
                r      = NODE_R;
              }

              const labelVisible = isPast || isActive || isFinal;

              return (
                <g key={`node-${i}`} style={{ transition: 'all 0.4s ease' }}>

                  {/* ── Attractor verdict badge ──
                      Rendered as a rect+text block ABOVE the final node circle.
                      The badge bottom edge is BADGE_BOTTOM_GAP above the node
                      centre, which is comfortably above the glow ring (r+14). */}
                  {isFinal && attractorLabel && (
                    <g>
                      <rect
                        x={LANE_X - BADGE_W / 2}
                        y={node.y - BADGE_BOTTOM_GAP - BADGE_H}
                        width={BADGE_W}
                        height={BADGE_H}
                        rx={6}
                        fill={attractorLabel.color}
                        fillOpacity="0.15"
                        stroke={attractorLabel.color}
                        strokeWidth="1.5"
                        strokeOpacity="0.7"
                      />
                      <text
                        x={LANE_X}
                        y={node.y - BADGE_BOTTOM_GAP - BADGE_H / 2 + 5}
                        textAnchor="middle"
                        fill={attractorLabel.color}
                        fontSize="12"
                        fontWeight="700"
                        fontFamily="Inter, sans-serif"
                        letterSpacing="0.05em"
                      >
                        {attractorLabel.text}
                      </text>
                    </g>
                  )}

                  {/* Outer glow ring — active node */}
                  {isActive && (
                    <circle
                      cx={node.x} cy={node.y} r={r + 10}
                      fill="none"
                      stroke="#6366f1" strokeWidth="1" strokeOpacity="0.4"
                      filter="url(#glow)"
                    />
                  )}

                  {/* Outer glow ring — final attractor (subtle, behind the badge) */}
                  {isFinal && (
                    <circle
                      cx={node.x} cy={node.y} r={r + 14}
                      fill="none"
                      stroke={fill} strokeWidth="1.5" strokeOpacity="0.25"
                      filter="url(#glow)"
                    />
                  )}

                  {/* Main node circle */}
                  <circle
                    cx={node.x} cy={node.y} r={r}
                    fill={fill} stroke={stroke} strokeWidth="2"
                    filter={isActive || isFinal ? 'url(#glow)' : undefined}
                    style={{ transition: 'all 0.4s ease' }}
                  />

                  {/* ── State name: LEFT column, vertically centred with node ── */}
                  <text
                    x={LABEL_LEFT}
                    y={node.y + 5}
                    textAnchor="end"
                    fill={labelVisible ? '#cbd5e1' : '#475569'}
                    fontSize="12"
                    fontWeight={isFinal || isActive ? '700' : '400'}
                    fontFamily="'JetBrains Mono', monospace"
                    style={{ transition: 'fill 0.4s ease' }}
                  >
                    {node.label}
                  </text>

                  {/* ── Energy value: RIGHT column, upper row ── */}
                  <text
                    x={INFO_RIGHT}
                    y={node.y - 2}
                    textAnchor="start"
                    fill={labelVisible ? '#94a3b8' : '#475569'}
                    fontSize="11"
                    fontFamily="'JetBrains Mono', monospace"
                  >
                    E={node.energy.toFixed(0)}
                  </text>

                  {/* ── Similarity: RIGHT column, lower row ── */}
                  <text
                    x={INFO_RIGHT}
                    y={node.y + 13}
                    textAnchor="start"
                    fill={labelVisible ? '#94a3b8' : '#475569'}
                    fontSize="11"
                    fontFamily="'JetBrains Mono', monospace"
                  >
                    {node.similarity.toFixed(0)}%
                  </text>
                </g>
              );
            })}
          </svg>

          {/* Play / Pause / Replay controls */}
          <div className="attractor-controls">
            {!isPlaying ? (
              <>
                <button className="attractor-btn attractor-btn--primary" onClick={handlePlay}>
                  ▶ Play
                </button>
                {activeStep > 0 && (
                  <button className="attractor-btn" onClick={handleReplay}>
                    ↺ Replay
                  </button>
                )}
              </>
            ) : (
              <button className="attractor-btn" onClick={handlePause}>
                ⏸ Pause
              </button>
            )}
          </div>

          {/* Progress bar */}
          <div className="attractor-progress-track">
            <div
              className="attractor-progress-fill"
              style={{ width: `${(activeStep / Math.max(trajectory.length - 1, 1)) * 100}%` }}
            />
          </div>
        </div>

        {/* ── Right panel: active state pattern grid + explanation ── */}
        <div className="attractor-side-panel">
          <h3 className="side-panel-title">Active State</h3>
          <div className="attractor-active-pattern">
            <PatternGrid pattern={activeNode.state} cellSize={5} />
            <span className="attractor-stored-label">{activeNode.label}</span>
          </div>

          <div className="attractor-explainer">
            <h4 className="explainer-title">What is happening?</h4>
            <p className="explainer-text">
              The noisy query is iteratively updated by the Hopfield network.
              Each update moves the system through its state space.
              The energy of each visited state is computed from the learned weight matrix.
              Retrieval converges when the state reaches a stable attractor.
            </p>
            <p className="explainer-note">
              Each point is an actual retrieval state. Energy uses E(s) = −½ sᵀWs.
            </p>
            <div className="explainer-legend">
              <div className="legend-row"><span className="legend-dot" style={{ background: '#6366f1' }} /> Active state</div>
              <div className="legend-row"><span className="legend-dot" style={{ background: '#0d9488' }} /> Past states</div>
              <div className="legend-row"><span className="legend-dot" style={{ background: '#10b981' }} /> Correct attractor</div>
              <div className="legend-row"><span className="legend-dot" style={{ background: '#f59e0b' }} /> Wrong attractor</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
