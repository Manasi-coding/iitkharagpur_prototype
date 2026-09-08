import PanelCard from '../components/PanelCard';

const rows = [
  [
    'Sparsity & Gating',
    'Dense bipolar activations',
    'Ultra-sparse non-negative gating',
    'Suppresses cross-talk noise variance by O(k/N)',
  ],
  [
    'Sign & Non-negativity',
    'Unconstrained bipolar outer products',
    'Dale’s Principle separation',
    'Eliminates spin-glass attractor traps',
  ],
  [
    'Synaptic Dynamics',
    'Static symmetric tensor',
    'Continuous streaming decay (λ < 1)',
    'Causal temporal sequence indexing',
  ],
  [
    'Scaling & Capacity Limit',
    'Breakdown at P > 0.138 N',
    'P ≈ Ω(N / log N) density',
    'Near-linear token storage density',
  ],
  [
    'Inference Cost & KV Cache',
    'Iterative matrix relaxation',
    'Constant state footprint O(D²)',
    'Infinite context at O(1) step latency',
  ],
];

const citations = [
  'Dragon Hatchling (BDH): Biologically Plausible Deep Hebbian Architecture',
  'Hopfield Networks is All You Need (Modern Continuous Hopfield)',
  'Emergence of Simple-Cell Receptive Fields by Sparse Coding',
  'Synaptic Modifications in Cultured Hippocampal Neurons',
];

export default function BDHDeepDivePage() {
  return (
    <div className="page">
      <div className="eyebrow">
        ● THEORETICAL FOUNDATIONS & ARCHITECTURE　::　
        <span>SECT-04 / FORMULATION</span>
      </div>

      <h1>
        BDH Synaptic Memory: <em>Beyond Hopfield Limits</em>
      </h1>

      <p className="lead">
        Dragon Hatchling translates classical Hebbian outer-product
        plasticity into modern transformer-scale recurrent associative
        networks, resolving catastrophic memory interference with sparse
        gated state.
      </p>

      <section className="stages">
        {[
          [
            '01',
            'Token Input [xₜ]',
            'Streaming feature encoding into a recurrent latent vector.',
            'xₜ ∈ ℝᵈ',
          ],
          [
            '02',
            'Co-Activation [k-WTA]',
            'Top-k dendritic gating selects a sparse active ensemble.',
            'sₜ = TopK(ReLU(xₜ))',
          ],
          [
            '03',
            'Synaptic Write [ΔWₜ]',
            'Rank-1 imprint with decay prevents saturation.',
            'Wₜ = λWₜ₋₁ + η(sₜsₜᵀ)',
          ],
          [
            '04',
            'Persistent State Attractor',
            'Fixed-size state reconstructs memory in constant time.',
            'yₜ = Softmax(Wₜqₜ / √d)',
          ],
        ].map(([n, t, p, f]) => (
          <PanelCard key={n} title={`STAGE ${n}`}>
            <h3>{t}</h3>
            <p>{p}</p>
            <code>{f}</code>
          </PanelCard>
        ))}
      </section>

      <PanelCard title="Comparison Matrix: Classical Hebbian vs BDH's Actual Synaptic Mechanism">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Dimension</th>
                <th>Classical Hebbian</th>
                <th>BDH Synaptic Mechanism</th>
                <th>Theoretical Advantage</th>
              </tr>
            </thead>

            <tbody>
              {rows.map((r) => (
                <tr key={r[0]}>
                  {r.map((c, i) => (
                    <td key={c} className={i === 2 ? 'blue' : ''}>
                      {i === 3 ? '✓ ' : ''}
                      {c}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </PanelCard>

      <aside className="notice">
        <b>Educational Toy Model Simplification Notice</b>

        <p>
          The interactive demo is an idealized 64-neuron Hopfield-style
          simulation. BDH’s production implementation operates in
          high-dimensional latent spaces with continuous streaming
          plasticity.
        </p>
      </aside>

      <h2>Primary Literature & Foundational Citations</h2>

      <section className="citation-grid">
        {citations.map((c, i) => (
          <article className="citation" key={c}>
            <small>
              {
                [
                  'ARCHITECTURE BASELINE',
                  'THEORY & EQUIVALENCE',
                  'BIOLOGICAL CODING',
                  'SYNAPTIC PLASTICITY',
                ][i]
              }
            </small>

            <h3>{c}</h3>

            <p>
              Foundational mathematical and empirical work supporting the
              architecture, sparse coding, and synaptic-plasticity
              mechanisms presented here.
            </p>

            <a href="#references">Read Paper ↗</a>
          </article>
        ))}
      </section>
    </div>
  );
}