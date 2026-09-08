import { CONFIG } from '../../../src/config.js';

// Renders a bipolar (+1/-1) pattern as a GRID_SIZE x GRID_SIZE bitmap.
// Falls back to an all-OFF grid when no pattern is available yet, so panels
// never render blank/undefined during the first paint.
export default function PatternGrid({ pattern, cellSize = 7 }) {
  const cells = pattern && pattern.length > 0 ? pattern : Array.from({ length: CONFIG.PATTERN_DIM }, () => -1);

  return (
    <div
      className="bit-grid"
      style={{ gridTemplateColumns: `repeat(${CONFIG.GRID_SIZE}, ${cellSize}px)` }}
    >
      {cells.map((value, index) => (
        <div
          key={index}
          className={`bit-cell ${value > 0 ? 'on' : 'off'}`}
          style={{ width: cellSize, height: cellSize }}
        />
      ))}
    </div>
  );
}
