import { useState } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import FooterCard from '../components/Footer';

export default function LandingPage({ user, onLogout }) {
  const [showLearnMore, setShowLearnMore] = useState(false);

  return (
    <div className="landing-page-wrapper">
      <Navbar user={user} onLogout={onLogout} />

      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-content">
          <span className="hero-tag">Computational Neurobiology Interactive Lab</span>
          <h1 className="hero-title">Hebbian Synapse Lab</h1>
          <p className="hero-tagline">
            Explore how Hebbian memory retrieval degrades as pattern loads grow, and discover how sparse dynamic gating circumvents saturation capacity.
          </p>
          <p className="hero-description">
            Hebbian Synapse Lab provides an interactive simulation workbench for studying associative memory recall, Hopfield phase boundaries, and biological dynamic sparse manifolds under varying noise conditions.
          </p>
          <div className="hero-ctas">
            <Link to="/demo" className="cta-primary">Launch Demo →</Link>
            {!user && <Link to="/signup" className="cta-secondary">Create Free Account</Link>}
          </div>
        </div>

        <div className="hero-preview-card">
          <div className="preview-header">
            <span className="dot red"></span>
            <span className="dot yellow"></span>
            <span className="dot green"></span>
            <small>Interactive Workbench Preview (N=64)</small>
          </div>
          <div className="preview-body">
            <div className="preview-metric">
              <span>Retrieval Similarity</span>
              <strong>93.8%</strong>
            </div>
            <div className="preview-grid">
              <span>0</span><span>+</span><span>⌘</span><span>◇</span>
              <span>T</span><span>□</span><span>✕</span><span>⚓</span>
            </div>
            <div className="preview-chart-sim">
              <div className="bar bdh" style={{ width: '85%' }}>BDH Sparse: 85%</div>
              <div className="bar classical" style={{ width: '30%' }}>Classical: 30%</div>
            </div>
          </div>
        </div>
      </section>

      {/* How it Works Section */}
      <section className="how-it-works-section">
        <h2>How It Works</h2>
        <div className="steps-grid">
          <div className="step-card">
            <div className="step-number">1</div>
            <h3>Store Patterns</h3>
            <p>Select from orthogonal binary memory pattern templates stored directly inside the synapse matrix.</p>
          </div>
          <div className="step-card">
            <div className="step-number">2</div>
            <h3>Inject Noise</h3>
            <p>Adjust input bit-flip noise and pattern density sliders to challenge the attractor recall boundaries.</p>
          </div>
          <div className="step-card">
            <div className="step-number">3</div>
            <h3>Watch Retrieval</h3>
            <p>Observe real-time iterative energy descent and compare Classical Hopfield saturation against BDH sparse manifolds.</p>
          </div>
        </div>
      </section>

      {/* Why BDH Section */}
      <section className="why-bdh-section">
        <div className="why-bdh-card">
          <h2>Why BDH Sparse Coding?</h2>
          <p>
            BDH (Biological Dynamics & Hebbian) memory introduces dynamic soft-thresholding and sparse gating mechanisms to suppress crosstalk. 
            By avoiding catastrophic outer-product interference, BDH extends associative recall well past the classical 0.138N Hopfield capacity limit.
          </p>
          
          <button 
            className="learn-more-btn" 
            onClick={() => setShowLearnMore(!showLearnMore)}
          >
            {showLearnMore ? 'Show Less ▲' : 'Learn More about Dragon Hatchling Connection ▼'}
          </button>

          {showLearnMore && (
            <div className="learn-more-content">
              <p>
                This research connects directly to the Dragon Hatchling architecture, where biologically plausible sparse manifolds prevent parasitic memory states. 
                By utilizing local learning rules without backpropagation, sparse biological networks maintain robust attractor basins even when scaling pattern counts exponentially.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Shared Footer */}
      <FooterCard />
    </div>
  );
}
