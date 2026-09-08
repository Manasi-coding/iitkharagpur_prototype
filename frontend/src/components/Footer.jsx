export default function FooterCard({ classicalCrossover, sparseCrossover, threshold, noisePct }) {
  const hasMeasurement = classicalCrossover != null && sparseCrossover != null;

  return (
    <footer className="footer-card">
      <div className="footer-card-inner">
        <h3>BDH Synaptic Memory Gating</h3>
        <p>
          BDH (Biological Dynamics & Hebbian) sparse coding keeps only the top-magnitude positive
          contributions of each pattern before accumulating it into the weight matrix, instead of
          summing the full dense outer product the way classical Hebbian storage does.
        </p>
        {hasMeasurement && (
          <p>
            Measured live on this app&apos;s own {noisePct}% noise sweep: classical Hebbian retrieval
            similarity crosses below the {threshold}% pass threshold at N={classicalCrossover}; sparse
            (BDH-style) coding crosses at N={sparseCrossover}. Whichever mode crosses later at your
            current settings is the one actually holding up better here — this isn&apos;t a fixed
            theoretical guarantee in either direction, only what this run measured.
          </p>
        )}
        <div className="citation-line">
          Citation: <em>Biological Dynamics & Hebbian Sparse Coding in Associative Networks (2024).</em>
        </div>
      </div>
    </footer>
  );
}
