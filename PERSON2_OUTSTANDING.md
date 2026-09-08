# Person 2 — Outstanding Items

## Resolved since last update

1. **`write.js`/`similarity.js`/`injectNoise.js` real, confirmed matching
   contract.** `write(patterns, options)` matches the split-doc signature
   exactly; zero internal randomness anywhere, including the
   `patterns = []` edge case. `similarity(a, b)` confirmed 0-100 scale.
2. **Import swap in `tests/retrieveIterative.test.js` done.** Points at the
   real `../src/core/write.js` and `../src/core/similarity.js`; the stale
   `TEMPORARY: swap` comments have been removed.
3. **Sparse/decay coverage closed.** The old test was a false positive (the
   stub silently ignored the options object, arity 0). Replaced with two
   real tests against the real `write()`: a tolerant check
   (`converged === true`, `similarity(...) >= CONFIG.PASS_THRESHOLD`) and an
   exact regression baseline (`TEST_DECAY = 0.5`, measured `converged: true`,
   `iterationCount: 2`, `similarity: 93.75` — confirmed fresh on this
   branch, matches the earlier worktree numbers exactly).
4. **Preset-count resolution mechanism identified.** `sweepCapacity.js`
   resolves the 9-vs-20 gap for its own purposes via
   `Math.min(maxN, patterns.length)`, confirmed by reading the real file —
   not inferred. `createPresetPatterns()` still returns 9;
   `CONFIG.MAX_PATTERNS` is still 20; both confirmed unchanged.
5. **Determinism reconfirmed against the real `write()`.** Two independent
   manual `advanceGuidedSequence` sequences (deep-equal), plus a full real
   ~60-second `startProveIt` run compared to manual (deep-equal at every
   step). No longer conditional — the real `write()` has zero randomness in
   any path.
6. **`GUIDED_STEPS = [3, 8, 14, 20]` vs. the 9-preset ceiling — resolved via
   Option 2 (reframe, not reshape).** The exact
   `{blocked: true, reason: 'insufficient-presets', requestedN: 14,
   availableN: 9}` object was re-verified field-by-field against the real
   `write()` (previously only tick-count-consistent; now fully confirmed) —
   this is now the intended ending, not a placeholder. `proveItMode.js`'s
   `BLOCKED_CAPTION` was rewritten to own the constraint ("preset budget
   reached, not a capacity failure — see the BDH comparison for the real
   crossover") instead of apologizing for it. Zero changes to
   `GUIDED_STEPS`, `CLEAN_RECALL_N`, `NEAR_LIMIT_N`, or any core file —
   confirmed via diff (one string + one explanatory comment) and a 66/66
   test re-run (caption text isn't asserted anywhere, confirmed by grep
   before making the change). Checked against real evidence before
   deciding, not assumed: measured similarity at N=3/6/8/9
   (100% / 92.19% / 96.875% / 96.875%) showed that shrinking the checkpoint
   list to fit 9 presets (Option 1) wouldn't have produced a stronger
   ending anyway — N=9 doesn't recall worse than N=8. Option 2 sidesteps
   that trap entirely.

7. **Stopgap `state.js`/`layout.js`/`render.js` shipped** (commit
   `77f20c2`) — built because Person B's real frontend files hadn't
   landed and `guidedSequence.js`/`proveItMode.js` had nothing to mount
   against. Explicitly labeled non-final/throwaway in its own file
   headers. Mounts `guidedSequence.js` and `proveItMode.js` only. Verified
   end-to-end in a real browser: on-load default never blank, slider-driven
   recompute through the real core pipeline, a full real ~60-second
   `startProveIt` cycle (N=3 → N=8 → blocked) with zero console errors. One
   real bug found and fixed during that verification: `similarityScore`
   wasn't updating after guided-sequence-driven state updates (those
   results carry no `similarityScore` field of their own) — fixed at the
   `render.js` call site, not inside `state.js`.

8. **Slider lock/unlock during the guided sequence — implemented and
   verified** (commit `969a089`). Sliders and the sparse toggle disable the
   instant a guided-sequence or Prove-It run starts and re-enable once it
   ends (blocked or natural finish) — both set `guidedSequenceActive:
   false`, so no separate case was needed for either ending. One real
   timing bug caught during verification: `startProveIt`'s first tick
   doesn't fire until `PROVE_IT_INTERVAL_MS` after the click, so locking
   had to be set synchronously in the click handler itself, not left to
   wait for the first tick's result — otherwise sliders would've stayed
   unlocked for the whole first interval. Verified in a real browser via
   the DOM `disabled` property (not just visually) for both the manual
   "Next" flow and the automated "Watch it fail" flow, across a full real
   ~60-second cycle.

Full suite: 66/66 passing on this branch (was 64 from the merge, +2 new
sparse/decay tests).

## Explicitly NOT covered by the Phase E stopgap

- **Person 1's and Person 3's features are not mounted** — `claimContract.js`,
  `traceDebugPanel.js`, `bdhCallout.js`, `predictGate.js`,
  `failureGallery.js`. Not confirmed as Person 2's call to make, and their
  interfaces haven't been verified against this stopgap.
- **`capacityCurves` is left as empty arrays** (`{classical: [], sparse: []}`)
  — populating it would mean mounting `sweepCapacity.js` (Person 3's
  feature), out of scope here.
- **No styling pass** — structure and wiring only, per spec.

## Flagged, not mine to fix: `write()` decay=0 edge case

Read `write.js` in full and checked the stopgap decay slider's range
bounds (0 and 1) for degenerate behavior. No NaN, no divide-by-zero (the
function contains no division at all), no empty-matrix crash, at either
bound — confirmed empirically, not just by reading. But at `decay: 0`,
every pattern except the most recently processed one is completely
discarded, not just down-weighted — confirmed empirically:
`write([p0, p1, p2], {decay: 0})` produces a matrix identical to
`write([p2])` alone. Mathematically correct given the documented formula
(`decay·W_prev` term vanishes entirely each step at decay=0), not a bug,
and not something the existing decay tests specifically pin down at this
exact boundary. Not modifying `write.js` — not Person 2's file. Noting it
here because the stopgap's decay slider can reach 0 and a user dragging it
there would see the network "forget" everything but the last pattern,
which could look broken without this context.

## Live ask to the team (not a code blocker)

**Option 3 (add more presets) was sent to the team as a parallel, still-open
ask** — distinct from the items below, since there is nothing further for
Person 2 to do on this unilaterally. Option 2 above is the interim
resolution already shipped in code regardless of how this ask resolves; if
the team adds more presets later, `GUIDED_STEPS` can be restored to its
original `[3, 8, 14, 20]` shape at that time, but nothing here is waiting
on that answer to be considered done today.

## Still open

1. **`origin/frontend` — a possible superseding effort, status unknown.**
   A real, separate React/Vite frontend exists on that branch (last known
   tip: "Updated ui"), architecturally different from the
   `state.js`/`layout.js`/`render.js` module contract this stopgap and the
   split doc are built against. Not merged into `ml-integration`. Team has
   been messaged; no resolution yet. Not investigated further or touched,
   per explicit instruction — this stopgap does not assume it supersedes
   or is superseded by that effort.
2. **BDH-module.md / citations.md.** Still correctly undone — requires
   primary-source research and paper-mapping that hasn't happened,
   independent of anyone's code landing. Ownership is unclear since the
   original 4-person split's dedicated docs role was folded into this
   3-person split. Not fabricated here or elsewhere.
