# Sync Point 1 Readiness — Person 2

Status: the `write()`/`similarity()` swap is **DONE** — real modules confirmed
matching contract, zero changes needed to owned module logic
(`createPresetPatterns.js`, `retrieveIterative.js`). Determinism is now
**unconditional** (real `write()` has zero randomness in any code path).
The sparse/decay coverage gap is **CLOSED** with real baseline numbers. One
item remains genuinely open, not yet reconciled — see "Preset-count
ceiling" below.

## Files owned by Person 2

- `src/core/createPresetPatterns.js` — DONE, gate-passed (Phase 1)
- `src/core/retrieveIterative.js` — DONE, gate-passed (Phase 2)
- `src/ui/features/guidedSequence.js` — DONE (Phase 5): exports `advanceGuidedSequence(guidedStepIndex, write)`, pure function
- `src/ui/features/proveItMode.js` — DONE (Phase 6): exports `startProveIt(write, onStep)`, reuses `advanceGuidedSequence` via `setInterval`

## Stub imports and their swap points

### Shipped modules (`src/core/*.js`, `src/ui/features/*.js`)

| File | Stub imports | Swap needed? |
|---|---|---|
| `createPresetPatterns.js` | none (write/similarity/injectNoise, real or stub) | No — no dependency exists |
| `retrieveIterative.js` | none | No — `W` is a plain argument, agnostic to how it was produced |
| `guidedSequence.js` | none — `write` is injected, not imported | No — same agnostic-to-producer design |
| `proveItMode.js` | none — `write` is injected, not imported | No — same design |

None of the four shipped modules import `write.js`, `similarity.js`, or
`injectNoise.js` directly, real or stub. There is nothing to swap in
`src/core/` or `src/ui/features/` at Sync Point 1 — there never was.

### Tests (`tests/*.js`)

| File | Real imports | Swap status |
|---|---|---|
| `tests/createPresetPatterns.test.js` | none | N/A |
| `tests/retrieveIterative.test.js` | `../src/core/write.js`, `../src/core/similarity.js` | **DONE** |

`tests/retrieveIterative.test.js` now imports the real `write()` and
`similarity()`. The stale `TEMPORARY: swap to real write.js at Sync Point 1`
comments have been removed — they no longer apply. Two new tests were added
alongside the swap (see "Sparse/decay coverage" below). Full suite: 66/66
passing on this branch.

### `similarity.js`

Now real and imported in two places: `tests/retrieveIterative.test.js` (for
the sparse/decay tests below) and `tests/presetCorrelation.test.js`, which
closes the item flagged after Phase 1 — `createPresetPatterns.js`'s
independent `positionalMatchFraction` check had never been verified against
Person 1's actual `similarity()`. That file confirms the real `similarity()`
and the independent check agree on every preset pair, including which pair
is worst (`l`/`square-outline`, 68.75%).

### `state.js` (Person B) — unchanged, no new evidence this session

Not imported anywhere in Person 2's scope currently — `guidedSequence.js`
and `proveItMode.js` are both built and confirmed to have zero `state.js`
coupling by design (pure functions). Per the split doc, Person B owns the
actual import-path swap on their own side. Nothing pending here yet; if
either UI file ends up needing `state.js`, that's a new dependency to add
at that time, not a swap of an existing reference.

## Zero-logic-change confirmation

- `createPresetPatterns.js`: pure function, no dependency on `write`/
  `similarity`/`injectNoise` in any form. Confirmed unchanged regardless of
  what Person 1 shipped.
- `retrieveIterative.js`: pure function, `W` passed as a plain argument.
  The one caveat this used to depend on — whether the real `write()` returns
  a matrix in the same shape/contract — is now confirmed satisfied: real
  `write(patterns, options)` matches the contract exactly, and calling it
  with no options is structurally identical to the classical path this
  document originally tracked (symmetric, zero-diagonal, outer-product sum).

## RESOLVED: sparse/decay coverage (previously an untested gap)

Previously: `scratch/stub-write.js`'s Hebbian branch only implemented the
classical path (no `decay`, no `sparse`), and the one test that claimed to
cover `{sparse: true}` was a false positive — the stub declared zero real
parameters, so the options object was silently ignored. The test passed
while verifying nothing about sparse behavior.

Now closed, with two new tests in `tests/retrieveIterative.test.js` against
the **real** `write()`:

- `'real sparse+decay write() converges to a meaningfully accurate (not
  necessarily exact) recovery'` — tolerant check: `converged === true` and
  `similarity(...) >= CONFIG.PASS_THRESHOLD` (90).
- `'sparse+decay regression baseline: locks in measured real-write()
  behavior (clean query)'` — exact pin: with `TEST_DECAY = 0.5` and
  `sparse: true`, measured `converged: true`, `iterationCount: 2`,
  `similarity: 93.75`. Measured fresh on this branch (not carried over from
  an earlier worktree check) and confirmed to match exactly.

## RESOLVED: determinism (previously conditional, now unconditional)

Previously: `advanceGuidedSequence`/`startProveIt`'s determinism held only
because the *injected* `write` happened to be deterministic — a property of
whichever implementation was plugged in, not something enforced by this
project's own code.

Now confirmed unconditional: the real `write()` has zero randomness in any
code path, including the `patterns = []` edge case (`patterns.length === 0
? CONFIG.PATTERN_DIM : patterns[0].length`, still deterministic). Reconfirmed
against the real `write()` two ways this session: two independent manual
`advanceGuidedSequence` sequences (deep-equal), and a full real ~60-second
`startProveIt` run compared to a manual sequence (deep-equal at every step).

## RESOLVED: preset-count ceiling — genuinely resolved, not just stable

`createPresetPatterns()` still returns 9 patterns; `CONFIG.MAX_PATTERNS` is
still 20 — both confirmed unchanged, and neither was touched. Person 3's
`sweepCapacity.js` still handles this for its own purposes with
`Math.min(maxN, patterns.length)`.

**`guidedSequence.js`'s `GUIDED_STEPS` was lowered from `[3, 8, 14, 20]` to
`[3, 5, 7, 9]`** to fit the actual 9 available presets —
`createPresetPatterns.js`/its `SHAPES` array were not touched; the
checkpoint list adapted to the data, not the other way around. Chosen from
real measurements across every N from 1 to 9 (real `write()`, real
`similarity()`): N=1-3 recover exactly (100%); degradation appears at N=4
and holds flat through N=7 (92.19%, tied — a real, non-monotonic feature of
these correlation-controlled shapes, not a smooth capacity curve); N=8-9
partially recover (96.875%). `[3, 5, 7, 9]` reaches the actual maximum
available preset count as the final checkpoint, at the cost of that final
point being real degradation rather than the single worst measured point
(N=4-7). **Honest caveat, not glossed over:** even the worst measured point
is a modest ~5-bit error out of 64, not a dramatic spurious-output collapse
— lowering the checkpoints produces a real ending, not a dramatic one.

All 4 checkpoints now reach a real result. The `{blocked: true,
reason: 'insufficient-presets', ...}` state is no longer expected to occur
in normal operation — kept in `guidedSequence.js` as a safety net against
future drift (e.g. presets ever dropping below 9), not deleted.
`PROVE_IT_INTERVAL_MS` was recomputed from `20000` to `15000` (60s / 4
reachable ticks, was 60s / 3) — left unchanged, a full Prove-It run would
have silently taken 80 real seconds instead of 60. Verified end-to-end: a
full real ~60-second `startProveIt` run against manual calls, deep-equal at
every step, zero blocked state anywhere in the run. Captions rewritten to
match real measured values at each new checkpoint, not old text with
numbers swapped in.

## Still open: Person B frontend

`src/ui/state.js`, `src/ui/layout.js`, `src/ui/render.js` were confirmed
**NOT FOUND** on this branch in an earlier discovery pass, before this
session's fast-forward to `origin/ml-integration`. **Not re-checked this
session** — say "not re-checked," not a current status claim, until someone
actually looks again post-fast-forward.

## Still open: BDH-module.md / citations.md

Correctly undone. Requires primary-source research and paper-mapping that
hasn't happened, independent of anyone's code landing. Ownership is
unclear since the original 4-person split's dedicated docs role was folded
into this 3-person split. Not fabricated here or elsewhere.
