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

Full suite: 66/66 passing on this branch (was 64 from the merge, +2 new
sparse/decay tests).

## Live ask to the team (not a code blocker)

**Option 3 (add more presets) was sent to the team as a parallel, still-open
ask** — distinct from the items below, since there is nothing further for
Person 2 to do on this unilaterally. Option 2 above is the interim
resolution already shipped in code regardless of how this ask resolves; if
the team adds more presets later, `GUIDED_STEPS` can be restored to its
original `[3, 8, 14, 20]` shape at that time, but nothing here is waiting
on that answer to be considered done today.

## Still open

1. **Slider lock/unlock UI.** Still blocked on Person B's real
   `state.js`/`layout.js`/`render.js`. These were confirmed **NOT FOUND** on
   this branch in an earlier discovery pass, before this session's
   fast-forward to `origin/ml-integration` — **not re-checked this
   session**, so that "not found" status is not being re-asserted as
   current, just not yet updated.
2. **BDH-module.md / citations.md.** Still correctly undone — requires
   primary-source research and paper-mapping that hasn't happened,
   independent of anyone's code landing. Ownership is unclear since the
   original 4-person split's dedicated docs role was folded into this
   3-person split. Not fabricated here or elsewhere.
