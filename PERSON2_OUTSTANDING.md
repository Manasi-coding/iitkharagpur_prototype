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

Full suite: 66/66 passing on this branch (was 64 from the merge, +2 new
sparse/decay tests).

## Still open

1. **`GUIDED_STEPS = [3, 8, 14, 20]` vs. the 9-preset ceiling.**
   `sweepCapacity.js` handles this dynamically for its own purposes, but
   `guidedSequence.js`/`proveItMode.js` still hardcode the fixed checkpoint
   array — it has not been reconciled the same way. This session's
   determinism check (3 ticks: N=3, N=8, then a stop) is consistent with
   the previously-established behavior of hitting the blocked state at the
   N=14 gate, but the exact `{blocked: true, reason, requestedN, availableN}`
   object was not re-printed in this session's run — **needs
   re-verification** at the field level, not assumed from tick count alone.
   Next actionable step: decide whether `guidedSequence.js`/`proveItMode.js`
   should adopt `sweepCapacity.js`'s dynamic-cap approach, or the team
   resolves this another way.
2. **Slider lock/unlock UI.** Still blocked on Person B's real
   `state.js`/`layout.js`/`render.js`. These were confirmed **NOT FOUND** on
   this branch in an earlier discovery pass, before this session's
   fast-forward to `origin/ml-integration` — **not re-checked this
   session**, so that "not found" status is not being re-asserted as
   current, just not yet updated.
3. **BDH-module.md / citations.md.** Still correctly undone — requires
   primary-source research and paper-mapping that hasn't happened,
   independent of anyone's code landing. Ownership is unclear since the
   original 4-person split's dedicated docs role was folded into this
   3-person split. Not fabricated here or elsewhere.
