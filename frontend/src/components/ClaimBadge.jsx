import { useState } from 'react';

export default function ClaimBadge({ similarity = 85, threshold = 70 }) {
  const [showTooltip, setShowTooltip] = useState(false);
  const isPassing = similarity >= threshold;

  return (
    <header className="top-bar">
      <div className="claim-left">
        <span className={`badge-icon ${isPassing ? 'pass' : 'fail'}`}>
          {isPassing ? '✓ PASS' : '✗ FAIL'}
        </span>
        <span className="claim-text">
          Hebbian memory retrieval degrades as stored patterns grow, collapsing recall capacity beyond <code>~0.138N</code>.
        </span>
        <div className="tooltip-container">
          <button 
            type="button" 
            className="info-btn" 
            onClick={() => setShowTooltip(!showTooltip)}
            onMouseEnter={() => setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
            aria-label="More Information"
          >
            ⓘ
          </button>
          {showTooltip && (
            <div className="tooltip-popup">
              <b>Pass Condition:</b> Retrieval Similarity ≥ {threshold}%. Currently {similarity.toFixed(1)}%. Hopfield memory limit N=64, P_crit ≈ 8.84.
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
