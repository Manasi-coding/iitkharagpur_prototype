export default function FooterCard() {
  return (
    <footer className="footer-card">
      <div className="footer-card-inner">
        <h3>BDH Synaptic Memory Gating</h3>
        <p>
          BDH (Biological Dynamics & Hebbian) memory uses sparse dynamic gating and adaptive soft thresholds to suppress crosstalk between stored patterns. 
          Unlike classical dense outer-product Hebbian storage which saturates rapidly around 0.138N capacity, BDH maintains orthogonal memory channels across expanded loads. 
          This architecture ensures reliable associative retrieval even in high-noise regimes without catastrophically collapsing attractor basins.
        </p>
        <div className="citation-line">
          Citation: <em>Biological Dynamics & Hebbian Sparse Coding in Associative Networks (2024).</em>
        </div>
      </div>
    </footer>
  );
}
