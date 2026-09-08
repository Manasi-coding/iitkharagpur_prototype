import { useState } from 'react';
import PanelCard from '../components/PanelCard';

const refs = [
  'Hebb, D. O. (1949). The Organization of Behavior.',
  'Hopfield, J. J. (1982). Neural networks and physical systems with emergent collective computational abilities.',
  'Amit, D. J., Gutfreund, H., & Sompolinsky, H. (1985). Storing infinite numbers of patterns.',
  'Olshausen, B. A., & Field, D. J. (1996). Emergence of simple-cell receptive fields.',
  'Bi, G. Q., & Poo, M. M. (1998). Synaptic modifications in cultured hippocampal neurons.',
];

const code = `import numpy as np

def hebbian_write(W, s, eta=0.05, decay=0.98):
    return decay * W + eta * np.outer(s, s)

def retrieve(W, cue):
    return np.sign(W @ cue)`;

export default function AboutPage() {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    await navigator.clipboard?.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="page about">
      <div className="hero">
        <div className="eyebrow">
          ✦ ABOUT THIS INTERACTIVE RESEARCH ARTIFACT
        </div>

        <h1>
          Hebbian Synaptic Memory
          <br />
          <em>Explainer & Laboratory</em>
        </h1>

        <p className="lead">
          An instrument-panel educational environment for understanding
          associative memory, sparse coding, and the boundary between
          classical Hopfield networks and BDH-style architectures.
        </p>
      </div>

      <section className="two-col">
        <PanelCard title="Target Audience">
          <p>
            Researchers, students, and engineers who want a precise visual
            intuition for recurrent neural memory.
          </p>

          <ul>
            <li>Computational neuroscience</li>
            <li>Machine-learning systems</li>
            <li>Scientific visualization</li>
          </ul>
        </PanelCard>

        <PanelCard title="Theoretical Prerequisites">
          <p>
            Basic linear algebra, probability, and familiarity with
            neural-network representations are helpful.
          </p>

          <code>Δwᵢⱼ = η · xᵢ · xⱼ</code>
        </PanelCard>
      </section>

      <PanelCard title="Demonstrated Learning Objectives">
        <div className="objectives">
          {[
            'See capacity collapse above 0.138N',
            'Compare dense and sparse coding',
            'Trace local synaptic updates',
            'Connect energy descent to attractors',
          ].map((x) => (
            <div key={x}>
              ✓ <span>{x}</span>
            </div>
          ))}
        </div>
      </PanelCard>

      <h2>Telemetry & Engine Architecture</h2>

      <section className="three-col">
        {[
          [
            'Live Interactive Simulation',
            'State-controlled sliders recompute overlap, readout, and chart data in real time.',
          ],
          [
            'Precomputed Attractor Basins',
            'Patterns are compact symbolic representations of stored neural states.',
          ],
          [
            'Illustrative Schematics',
            'All diagrams prioritize clarity and maintain the laboratory visual grammar.',
          ],
        ].map(([t, p]) => (
          <PanelCard key={t} title={t}>
            <p>{p}</p>
          </PanelCard>
        ))}
      </section>

      <PanelCard title="Scientific Reproducibility Protocol">
        <p>
          Minimal reference implementation for the outer-product write and
          retrieval operations.
        </p>

        <pre>
          <code>{code}</code>
        </pre>

        <button className="copy" onClick={copy}>
          {copied ? '✓ Copied' : '⧉ Copy reference code'}
        </button>
      </PanelCard>

      <h2 id="references">Bibliography & Source Citations</h2>

      <section className="citation-grid">
        {refs.map((r, i) => (
          <article className="citation" key={r}>
            <small>
              {
                [
                  'FOUNDATION',
                  'ASSOCIATIVE MEMORY',
                  'STATISTICAL PHYSICS',
                  'SPARSE CODING',
                  'CELLULAR PLASTICITY',
                ][i]
              }
            </small>

            <h3>{r}</h3>

            <p>
              Peer-reviewed source material grounding this educational
              demonstration.
            </p>

            <a href="#references">DOI / Archive ↗</a>
          </article>
        ))}
      </section>

      <div className="signoff">
        <b>
          Computational Neurobiology & Sparse Cognitive Matrix Laboratory
        </b>

        <button
          onClick={() =>
            window.scrollTo({
              top: 0,
              behavior: 'smooth',
            })
          }
        >
          ↑ Back to Top
        </button>
      </div>
    </div>
  );
}