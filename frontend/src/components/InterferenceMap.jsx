import React, { useMemo, useState } from 'react';
import { calculatePairwiseSimilarities } from '../../../src/core/pairwiseSimilarity.js';
import { similarity } from '../../../src/core/similarity.js';
import { CONFIG } from '../../../src/config.js';

export default function InterferenceMap({ patterns, currentRetrievalStepPattern, isReplaying }) {
  const [hoveredNode, setHoveredNode] = useState(null);

  // 1. Calculate pairwise similarities
  const edges = useMemo(() => calculatePairwiseSimilarities(patterns), [patterns]);

  // 2. Calculate similarities to the current retrieval step (if replaying)
  const activeSimilarities = useMemo(() => {
    if (!isReplaying || !currentRetrievalStepPattern) return {};
    const sims = {};
    patterns.forEach(p => {
      sims[p.id] = similarity(currentRetrievalStepPattern, p.pattern);
    });
    return sims;
  }, [patterns, currentRetrievalStepPattern, isReplaying]);

  // Layout parameters
  const width = 450;
  const height = 450;
  const center = { x: width / 2, y: height / 2 };
  const radius = 150;

  // Calculate node positions in a circle
  const nodes = useMemo(() => {
    return patterns.map((p, index) => {
      const angle = (index / patterns.length) * 2 * Math.PI - Math.PI / 2;
      return {
        ...p,
        x: center.x + radius * Math.cos(angle),
        y: center.y + radius * Math.sin(angle),
      };
    });
  }, [patterns, center.x, center.y, radius]);

  // Map nodes for quick lookup
  const nodeMap = useMemo(() => {
    const map = {};
    nodes.forEach(n => map[n.id] = n);
    return map;
  }, [nodes]);

  return (
    <div className="interference-map-container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        {/* Draw edges */}
        {edges.map(edge => {
          const source = nodeMap[edge.sourceId];
          const target = nodeMap[edge.targetId];
          if (!source || !target) return null;

          const isHovered = hoveredNode === edge.sourceId || hoveredNode === edge.targetId;
          const showHover = hoveredNode !== null;
          
          // Only show strong edges by default, or all if hovered
          const strokeWidth = (edge.similarity / 100) * 10;
          const opacity = showHover ? (isHovered ? 0.8 : 0.05) : (edge.similarity > 50 ? 0.5 : 0.1);

          return (
            <line
              key={`${edge.sourceId}-${edge.targetId}`}
              x1={source.x}
              y1={source.y}
              x2={target.x}
              y2={target.y}
              stroke="var(--teal-primary)"
              strokeWidth={strokeWidth}
              opacity={opacity}
              style={{ transition: 'opacity 0.2s ease-in-out' }}
            />
          );
        })}

        {/* Draw nodes */}
        {nodes.map(node => {
          const simToActive = activeSimilarities[node.id] || 0;
          const activeOpacity = isReplaying ? Math.max(0.2, simToActive / 100) : 1;
          const highlightRing = isReplaying && simToActive >= 85; // High similarity to current step

          const cellSize = 4;
          const gridWidth = CONFIG.GRID_SIZE * cellSize;
          const gridHeight = CONFIG.GRID_SIZE * cellSize;
          
          const startX = node.x - gridWidth / 2;
          const startY = node.y - gridHeight / 2;

          return (
            <g
              key={node.id}
              transform={`translate(${startX}, ${startY})`}
              onMouseEnter={() => setHoveredNode(node.id)}
              onMouseLeave={() => setHoveredNode(null)}
              style={{ cursor: 'pointer', transition: 'opacity 0.3s ease-in-out' }}
              opacity={activeOpacity}
            >
              {highlightRing && (
                 <circle 
                   cx={gridWidth / 2} 
                   cy={gridHeight / 2} 
                   r={gridWidth / 2 + 12} 
                   fill="none" 
                   stroke="#f59e0b" /* amber */
                   strokeWidth={4} 
                   opacity={0.8}
                 />
              )}
              
              {/* Background rect for the grid */}
              <rect x={0} y={0} width={gridWidth} height={gridHeight} fill="var(--light-card-bg)" stroke="var(--light-border)" strokeWidth={1} rx={2} ry={2} />
              
              {/* The cells */}
              {node.pattern.map((val, idx) => {
                 const r = Math.floor(idx / CONFIG.GRID_SIZE);
                 const c = idx % CONFIG.GRID_SIZE;
                 return (
                   <rect
                     key={idx}
                     x={c * cellSize}
                     y={r * cellSize}
                     width={cellSize}
                     height={cellSize}
                     fill={val > 0 ? 'var(--teal-primary)' : 'transparent'}
                   />
                 );
              })}
              
              <text 
                x={gridWidth / 2} 
                y={gridHeight + 18} 
                textAnchor="middle" 
                fill="var(--light-text-primary)" 
                fontSize="12"
                fontWeight={hoveredNode === node.id ? 'bold' : 'normal'}
              >
                 {node.id}
              </text>
            </g>
          );
        })}
      </svg>
      
      {/* Legend */}
      <div className="interference-legend" style={{ textAlign: 'center', marginTop: '10px', fontSize: '0.85rem', color: 'var(--light-text-muted)' }}>
         <span><b>Legend:</b></span>
         <span style={{ marginLeft: '15px' }}>Line Thickness = Pairwise Similarity</span>
         <span style={{ marginLeft: '15px' }}>Hover = Highlight Connections</span>
         {isReplaying && <span style={{ marginLeft: '15px', color: '#f59e0b' }}>Amber Ring = Retrieval Match</span>}
      </div>
    </div>
  );
}
