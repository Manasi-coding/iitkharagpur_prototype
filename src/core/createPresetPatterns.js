// Phase 1 — Person 2. Pure function, no state, no imports from Person 1's
// write()/similarity()/injectNoise() (real or stub).
import { CONFIG } from '../config.js';

if (CONFIG.GRID_SIZE * CONFIG.GRID_SIZE !== CONFIG.PATTERN_DIM) {
  throw new Error(
    `createPresetPatterns: GRID_SIZE^2 (${CONFIG.GRID_SIZE * CONFIG.GRID_SIZE}) must equal PATTERN_DIM (${CONFIG.PATTERN_DIM})`
  );
}

// Bipolar cell values (standard for Hopfield-style Hebbian learning — a 0/1
// encoding would break the usual outer-product write() rule). Not part of
// CONFIG (per-cell shape data isn't a shared-config concern), so named here
// instead of left as bare literals in the shape grids below.
// Confirmed deliberately, not an unstated default — Person 1's write()/
// injectNoise() will consume this exact encoding.
const ON = 1;
const OFF = -1;

// Why 0.70, not 0.65 (both valid per the split doc's 65-70% range): this
// set's actual worst pair (l / square-outline) sits at 68.8% — 0.70 is the
// tightest bound in range that still passes without another redesign pass;
// 0.65 would reject that pair and force a re-draw.
// Not part of CONFIG (per-file threshold, not shared state), so named here
// rather than left inline.
// Beyond the literal contract, confirmed as-is: also exported (not just
// createPresetPatterns) so tests/createPresetPatterns.test.js checks against
// this exact value instead of duplicating it as a second, driftable literal.
export const CORRELATION_THRESHOLD = 0.70;

// Hand-drawn as ASCII art ('X' = ON, '.' = OFF) for readability — string
// literals, not numeric ones — then converted to ON/OFF below. Each shape
// must be GRID_SIZE rows of GRID_SIZE characters.
const SHAPES = [
  {
    id: 'l',
    rows: [
      'XX......',
      'XX......',
      'XX......',
      'XX......',
      'XX......',
      'XX......',
      'XXXXXXXX',
      'XXXXXXXX',
    ],
  },
  {
    id: 't',
    rows: [
      'XXXXXXXX',
      'XXXXXXXX',
      '.....XX.',
      '.....XX.',
      '.....XX.',
      '.....XX.',
      '.....XX.',
      '.....XX.',
    ],
  },
  {
    id: 'x',
    rows: [
      'XX....XX',
      'XXX..XXX',
      '.XXXXXX.',
      '..XXXX..',
      '..XXXX..',
      '.XXXXXX.',
      'XXX..XXX',
      'XX....XX',
    ],
  },
  {
    id: 'square-outline',
    rows: [
      'XXXXXXXX',
      'XX....XX',
      'XX....XX',
      'XX....XX',
      'XX....XX',
      'XX....XX',
      'XX....XX',
      'XXXXXXXX',
    ],
  },
  {
    id: 'plus',
    rows: [
      '...XX...',
      '...XX...',
      '...XX...',
      'XXXXXXXX',
      'XXXXXXXX',
      '...XX...',
      '...XX...',
      '...XX...',
    ],
  },
  {
    id: 'diagonal',
    rows: [
      '.....XXX',
      '.....XX.',
      '...XXX..',
      '...XX...',
      '.XXX....',
      '.XX.....',
      'XX......',
      'X.......',
    ],
  },
  {
    id: 'checkerboard-corner',
    rows: [
      'X.X.....',
      '.X.X....',
      'X.X.....',
      '.X.X....',
      '........',
      '........',
      '........',
      '........',
    ],
  },
  {
    id: 'dot-cluster',
    rows: [
      'XX.XX...',
      'XX.XX...',
      '........',
      '..XX....',
      '..XX....',
      '........',
      '...XXXX.',
      '...XXXX.',
    ],
  },
  {
    id: 'ring-core',
    rows: [
      '........',
      '.XXXXXX.',
      '.X....X.',
      '.X.XX.X.',
      '.X.XX.X.',
      '.X....X.',
      '.XXXXXX.',
      '........',
    ],
  },
];

function rowsToPattern(rows) {
  if (rows.length !== CONFIG.GRID_SIZE) {
    throw new Error(`preset shape has ${rows.length} rows, expected GRID_SIZE (${CONFIG.GRID_SIZE})`);
  }
  const pattern = [];
  for (const row of rows) {
    if (row.length !== CONFIG.GRID_SIZE) {
      throw new Error(`preset shape row "${row}" has length ${row.length}, expected GRID_SIZE (${CONFIG.GRID_SIZE})`);
    }
    for (const char of row) {
      pattern.push(char === 'X' ? ON : OFF);
    }
  }
  return pattern;
}

function positionalMatchFraction(patternA, patternB) {
  // Independent from Person 1's similarity() — a plain positional-match
  // fraction used only as a build-time correctness check on this file's
  // own data, not a runtime feature.
  const matchCount = patternA.filter((value, index) => value === patternB[index]).length;
  return matchCount / CONFIG.PATTERN_DIM;
}

const PRESET_PATTERNS = SHAPES.map(({ id, rows }) => ({ id, pattern: rowsToPattern(rows) }));

// Validated once at module-definition time, not on every createPresetPatterns()
// call — the exported function just returns the already-checked set.
for (const presetA of PRESET_PATTERNS) {
  for (const presetB of PRESET_PATTERNS) {
    if (presetA === presetB) continue;
    const fraction = positionalMatchFraction(presetA.pattern, presetB.pattern);
    if (fraction > CORRELATION_THRESHOLD) {
      throw new Error(
        `createPresetPatterns: "${presetA.id}" and "${presetB.id}" share a ${fraction} fraction of positions, exceeding CORRELATION_THRESHOLD (${CORRELATION_THRESHOLD})`
      );
    }
  }
}

// NOTE: only SHAPES.length presets exist. Person 3's crossover-N sweep (first
// N of these, for N up to CONFIG.MAX_PATTERNS) cannot go past this count —
// flagged to the team, not solved here (see Phase 1 discussion).
export function createPresetPatterns() {
  // Beyond the literal {id, pattern}[] contract, confirmed as-is: returns a
  // fresh copy each call (not shared array references), so a caller mutating
  // a returned pattern in place can't corrupt these presets for later callers.
  return PRESET_PATTERNS.map(({ id, pattern }) => ({ id, pattern: [...pattern] }));
}
