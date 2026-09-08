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
   that trap entirely. **Superseded by item 11 below** — Option 2 was the
   right call given the constraint at the time; the constraint itself is
   now actually removed, not just reframed.

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

9. **Phase F audit item 1 (config/literal drift) — closed** (commit
   `ae149e8`). `state.js`'s bare on-load defaults (`patternCount: 3`,
   `noisePct: 10`) are now named constants (`DEFAULT_PATTERN_COUNT`,
   `DEFAULT_NOISE_PCT`) — not CONFIG fields, since `CONFIG.MIN_PATTERNS`/
   `NOISE_MIN` are validation bounds, not sensible demo defaults.
   `render.js` no longer carries its own independent copy of those same
   two numbers — its sliders now read initial values from `getState()`
   directly, closing a real drift risk (the two copies could previously
   go out of sync). Slider step and decay-range literals moved to named
   constants (`SLIDER_STEP`, `DECAY_MIN`, `DECAY_MAX`, `DECAY_STEP`) — the
   only literals left in either file are those constants themselves, plus
   the untouched `8px` grid-cell sizes (styling, explicitly out of scope).
   Re-verified in a real browser after the change: same default state
   (patternCount=3, noisePct=10, similarityScore=100), sliders still
   functional (identical result to the original slider test), zero
   console errors. 66/66 tests still passing.
10. **Phase F audit item 6 (narration coverage) — closed** (commit
    `9949127`). `NARRATION_SCRIPTS.md` created — the first persistent home
    for any of these scripts; the original `guidedSequence.js`/
    `proveItMode.js` scripts had only ever been delivered as chat text,
    never saved anywhere. Added scripts for `state.js` (256 words),
    `layout.js` (163 words), and `render.js` (221 words), all under the
    ~300-word safety margin for a 130-150 wpm pace. Same caveat as
    `proveItMode.js`'s script carries: word count is a proxy, not an
    actual timed read — `state.js`'s script has the least margin of the
    three and is the one to actually time first if that matters.

11. **Preset-count gap — genuinely resolved, not just stable** (this
    commit). `GUIDED_STEPS` lowered from `[3, 8, 14, 20]` to `[3, 5, 7, 9]`
    to fit the actual 9 presets — `createPresetPatterns.js`/`SHAPES`
    untouched, checkpoints adapted to the data. Chosen from real
    measurements across every N=1-9 (real `write()`, real `similarity()`):
    exact recovery at N=1-3, degradation appears at N=4 and holds flat
    through N=7 (92.19%, tied — non-monotonic, a real feature of these
    correlation-controlled shapes), partial recovery at N=8-9 (96.875%).
    `[3, 5, 7, 9]` reaches the true maximum preset count as the final
    checkpoint, honestly not the single worst measured point (that's
    N=4-7). **Not glossed over:** even the worst point is a modest ~5-bit
    error, not a dramatic collapse — this closes the gap with a real
    ending, not a dramatic one. All 4 checkpoints now reach a real result;
    the blocked state is no longer expected in normal operation (kept as a
    safety net in `guidedSequence.js`, not deleted). `PROVE_IT_INTERVAL_MS`
    recomputed `20000` → `15000` (60s / 4 ticks, was 60s / 3) — left
    unchanged, a run would have silently taken 80 real seconds instead of
    60. `proveItMode.js`'s `CLEAN_RECALL_N`/`NEAR_LIMIT_N` pair extended to
    four constants (`CLEAN_RECALL_N`, `MID_RANGE_N`, `NEAR_LIMIT_N`,
    `FINAL_N`); the duplicated-constants fragility itself (not derived from
    `GUIDED_STEPS`) remains, flagged again, not fixed — out of scope here.
    Captions rewritten to match real measured values, not old text with
    numbers swapped in. Verified end-to-end: full real ~60s `startProveIt`
    run vs. manual, deep-equal at every step, zero blocked state anywhere
    in the run. No stale tests existed to update — confirmed by search,
    no permanent test ever referenced `GUIDED_STEPS` or these checkpoint
    values.

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
Person 2 to do on this unilaterally. `GUIDED_STEPS` is now `[3, 5, 7, 9]`
(item 11) regardless of how this ask resolves — that's a real, working
resolution on its own, not a placeholder waiting on the team's answer. If
the team adds more presets later, `GUIDED_STEPS` could be revisited again
to reach further/more dramatic checkpoints, but nothing here is blocked on
that happening.

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
