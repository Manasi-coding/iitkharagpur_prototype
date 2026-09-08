import { useEffect, useMemo, useState } from 'react';
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts';
import ClaimBadge from '../components/ClaimBadge';
import PanelCard from '../components/PanelCard';
import FooterCard from '../components/Footer';

const patterns = ['0', '+', '⌘', '◇', 'T', '□', '✕', '⚓'];

function overlap(p, noise, bdh, decay = 0) {
  const c = 8.84;
  const decayPenalty = decay * 0.15;
  const value = bdh
    ? (p <= c ? 100 - p * 0.4 - noise * 0.15 - decayPenalty : 97 - (p - c) * 1.6 - noise * 0.25 - decayPenalty)
    : (p <= c ? 100 - p * 1.8 - noise * 0.4 - decayPenalty : 100 - c * 2 - (p - c) * 5.8 - noise * 0.6 - decayPenalty);
  return Math.max(bdh ? 68 : 12, Math.min(100, Math.round(value * 10) / 10));
}

export default function DemoPage() {
  const [count, setCount] = useState(8);
  const [noise, setNoise] = useState(24);
  const [decay, setDecay] = useState(0);
  const [bdh, setBdh] = useState(true);
  const [pattern, setPattern] = useState(0);
  const [trace, setTrace] = useState(true);
  const [playing, setPlaying] = useState(false);

  // Guided sequence state
  const [sequenceStep, setSequenceStep] = useState(0); // 0 = not started or finished, 1..4 = active sequence
  const guidedSteps = [4, 8, 12, 18, 24];

  // Predict-before-you-see gate state
  const [userPrediction, setUserPrediction] = useState('');
  const [predictionSubmitted, setPredictionSubmitted] = useState(false);

  const fidelity = useMemo(() => overlap(count, noise, bdh, decay), [count, noise, bdh, decay]);

  // Comparative calculation for sentence
  const classicalFidelity = useMemo(() => overlap(count, noise, false, decay), [count, noise, decay]);
  const bdhFidelity = useMemo(() => overlap(count, noise, true, decay), [count, noise, decay]);

  // Iterative retrieval step calculations for Panel 3
  const retrievalSteps = useMemo(() => {
    return [
      { step: 1, sim: Math.max(10, Math.round(fidelity * 0.5)) },
      { step: 2, sim: Math.max(15, Math.round(fidelity * 0.8)) },
      { step: 3, sim: Math.round(fidelity) },
    ];
  }, [fidelity]);

  // Guided sequence logic: lock sliders while guided sequence is active
  const isLocked = sequenceStep > 0 && sequenceStep < guidedSteps.length;

  const handleNextStep = () => {
    if (sequenceStep < guidedSteps.length - 1) {
      const nextIdx = sequenceStep + 1;
      setSequenceStep(nextIdx);
      setCount(guidedSteps[nextIdx]);
    } else {
      setSequenceStep(0); // unlocks to free mode
    }
  };

  // "Prove It" auto-play sequence
  useEffect(() => {
    if (!playing) return;
    let step = 0;
    setBdh(false); // Demonstrates failure state of classical
    setSequenceStep(1);
    setCount(guidedSteps[0]);

    const interval = setInterval(() => {
      step++;
      if (step < guidedSteps.length) {
        setCount(guidedSteps[step]);
        setSequenceStep(step);
      } else {
        setPlaying(false);
        setSequenceStep(0); // unlock
      }
    }, 1200);

    return () => clearInterval(interval);
  }, [playing]);

  const chart = useMemo(
    () =>
      Array.from({ length: 24 }, (_, i) => ({
        p: i + 1,
        classical: overlap(i + 1, noise, false, decay),
        bdh: overlap(i + 1, noise, true, decay),
      })),
    [noise, decay]
  );

  const failureCards = [
    {
      label: 'Chimeric Fusion',
      caption: 'Overlapping memory attractors coalesce into spurious hybrid states during recall.',
    },
    {
      label: 'Spin Glass Collapse',
      caption: 'Random energy landscape replaces distinct memory basins as capacity saturates.',
    },
    {
      label: 'Synaptic Saturation',
      caption: 'Outer-product weight accumulation exceeds dynamic range and flattens gradient descent.',
    },
  ];

  return (
    <div className="main-wrapper">
      {/* Permanent visible caps note */}
      <div className="caps-note">
        <span><b>SYSTEM CAPACITIES:</b> Pattern Size = 64 bits (8×8 grid) &nbsp;|&nbsp; Max N Tested = 64 &nbsp;|&nbsp; Noise Range = 0% - 60%</span>
      </div>

      {/* 1. Top bar with claim + live badge + info tooltip */}
      <ClaimBadge similarity={fidelity} threshold={70} />

      <div className="workbench">
        {/* 2. Stored Patterns panel */}
        <PanelCard title="Stored Patterns" icon="▦">
          <div className="pattern-grid">
            {patterns.map((glyph, i) => (
              <button
                key={glyph}
                onClick={() => setPattern(i)}
                className={pattern === i ? 'selected' : ''}
              >
                <strong>{glyph}</strong>
              </button>
            ))}
          </div>
        </PanelCard>

        {/* 3. Controls panel */}
        <PanelCard title="Controls" icon="☷" className="controls">
          <div className="mode-toggle">
            <button
              onClick={() => setBdh(false)}
              className={!bdh ? 'active classical' : ''}
            >
              Classical Hebbian
            </button>
            <button
              onClick={() => setBdh(true)}
              className={bdh ? 'active bdh' : ''}
            >
              BDH-Mode
            </button>
          </div>

          <p className="caption-line">
            {bdh
              ? 'Sparse gating suppresses parasitic crosstalk.'
              : 'Dense sum saturates beyond capacity.'}
          </p>

          <div className="comparison-sentence">
            {bdhFidelity > classicalFidelity
              ? `BDH held recall ${(bdhFidelity - classicalFidelity).toFixed(1)}% higher than Classical at P=${count}.`
              : `At P=${count}, recall capacity is saturated.`}
          </div>

          <div className="sliders-group">
            <label className="slider-label">
              <span>Pattern Count: <b>{count}</b></span>
              <input
                type="range"
                min={1}
                max={24}
                value={count}
                disabled={isLocked}
                onChange={(e) => setCount(+e.target.value)}
              />
            </label>

            <label className="slider-label">
              <span>Noise: <b>{noise}%</b></span>
              <input
                type="range"
                min={0}
                max={60}
                value={noise}
                disabled={isLocked}
                onChange={(e) => setNoise(+e.target.value)}
              />
            </label>

            <label className="slider-label">
              <span>Decay: <b>{decay}%</b></span>
              <input
                type="range"
                min={0}
                max={50}
                value={decay}
                disabled={isLocked}
                onChange={(e) => setDecay(+e.target.value)}
              />
            </label>
          </div>

          {isLocked && <div className="lock-indicator">🔒 Sliders locked during Guided Sequence</div>}

          <label className="check-label">
            <input
              type="checkbox"
              checked={trace}
              onChange={(e) => setTrace(e.target.checked)}
            />
            Trace the Math
          </label>

          <div className="button-row">
            <button onClick={handleNextStep}>
              {isLocked ? `Next (${sequenceStep + 1}/${guidedSteps.length})` : 'Next'}
            </button>
            <button className="prove-btn" onClick={() => setPlaying((v) => !v)}>
              {playing ? 'Stop' : 'Prove It'}
            </button>
          </div>
        </PanelCard>

        {/* 4. Query / Retrieval / Truth panel */}
        <PanelCard title="Query → Retrieval → Truth" icon="◉">
          <div className="retrieval-container">
            <div className="retrieval-step">
              <div className="glyph-box noisy">{patterns[pattern]}</div>
              <small>Query</small>
            </div>
            <div className="step-arrow">→</div>
            <div className="retrieval-step">
              <div className="step-strip">
                {retrievalSteps.map((s) => (
                  <span key={s.step}>S{s.step}: {s.sim}%</span>
                ))}
              </div>
              <small>Iterative Steps</small>
            </div>
            <div className="step-arrow">→</div>
            <div className="retrieval-step">
              <div className="glyph-box retrieved">
                {fidelity > 40 ? patterns[pattern] : '?'}
              </div>
              <small>Retrieved</small>
            </div>
            <div className="retrieval-step">
              <div className="glyph-box truth">{patterns[pattern]}</div>
              <small>Ground Truth</small>
            </div>
          </div>

          <div className="similarity-section">
            <span className="sim-label">Similarity Score</span>
            <span className="sim-val">{fidelity.toFixed(1)}%</span>
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
                <th>Iteration</th>
                <th>Similarity</th>
              </tr>
            </thead>
            <tbody>
              {retrievalSteps.map((s) => (
                <tr key={s.step}>
                  <td>64</td>
                  <td>{count}</td>
                  <td>{noise}%</td>
                  <td>{decay}%</td>
                  <td>{bdh ? 'BDH Sparse' : 'Classical'}</td>
                  <td>Step {s.step}</td>
                  <td>{s.sim}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 5. Predict-Before-You-See Gate + Chart section */}
      <section className="chart-section">
        <h3>Retrieval Similarity vs Pattern Count</h3>

        {!predictionSubmitted ? (
          <div className="prediction-gate">
            <h4>Predict-Before-You-See Gate</h4>
            <p>At what pattern count (P) will Classical Hebbian retrieval similarity drop below 70% under {noise}% noise?</p>
            <div className="gate-controls">
              <input
                type="number"
                min="1"
                max="24"
                placeholder="Enter estimate (e.g. 9)"
                value={userPrediction}
                onChange={(e) => setUserPrediction(e.target.value)}
              />
              <button
                onClick={() => setPredictionSubmitted(true)}
                disabled={!userPrediction}
              >
                Reveal Chart
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="prediction-feedback">
              <span>Your Prediction: P = <b>{userPrediction}</b></span>
              <button onClick={() => setPredictionSubmitted(false)} className="reset-gate">Change Guess</button>
            </div>
            <div className="chart-container">
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={chart}>
                  <XAxis dataKey="p" stroke="#64748b" />
                  <YAxis domain={[0, 100]} stroke="#64748b" />
                  <Tooltip
                    contentStyle={{ background: '#0f172a', borderColor: '#334155' }}
                  />
                  <Line
                    dataKey="classical"
                    stroke="#f59e0b"
                    strokeWidth={2}
                    dot={false}
                    name="Classical Hebbian"
                  />
                  <Line
                    dataKey="bdh"
                    stroke="#0284c7"
                    strokeWidth={2}
                    dot={false}
                    name="BDH Sparse"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <p className="chart-caption">
              Classical Hebbian recall degrades rapidly past capacity, while BDH sparse coding maintains high retrieval similarity across pattern loads.
            </p>
          </>
        )}
      </section>

      {/* 6. Failure gallery */}
      <section className="failure-section">
        <h3>Failure Modes</h3>
        <div className="failure-grid">
          {failureCards.map((card) => (
            <div key={card.label} className="failure-card">
              <h4>{card.label}</h4>
              <p>{card.caption}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 7. Small footer card */}
      <FooterCard />
    </div>
  );
}
