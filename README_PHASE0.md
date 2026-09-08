# Phase 0 — Person 1 Scaffolding

Status: Phase 0 (this doc's original scope) was setup only — every function
in `src/core/write.js`, `src/core/similarity.js`, `src/core/injectNoise.js`,
`src/ui/features/claimContract.js`, and `src/ui/features/traceDebugPanel.js`
was a stub that threw `not implemented`. This document recorded the
assumptions those stubs were built against, so each real implementation
phase could start clean instead of re-deriving them.

**Phase 1 update**: `src/core/similarity.js` is now implemented for real
(see [tests/similarity.test.js](tests/similarity.test.js)).

**Phase 2 update**: `src/core/injectNoise.js` is now implemented for real
too (see [tests/injectNoise.test.js](tests/injectNoise.test.js)). Phase 2
also found that Person 2's `guidedSequence.js` has its own separate,
pre-existing noise logic that is not the same algorithm as this file — see
"Closing summary" below, item 2.

**Phase 3 update — Person 1's core scope is now complete.**
`src/core/write.js` is implemented for real (see
[tests/write.test.js](tests/write.test.js)), which was the last of the
three fixed-contract core files (`write`, `similarity`, `injectNoise`).
Every `test.todo()` written back in Phase 0 has now been turned into a
real, passing assertion — none remain anywhere in Person 1's scope. Phase
3 also found that the split doc's "8 patterns / 10% noise -> 60-70%
similarity" gate number does not hold against the real preset shapes
(measured: 96.875-100%) — see "Closing summary" below, item 3.

**Phase 4 update**: `src/ui/features/claimContract.js` is now implemented
— but only as far as it can go without a team decision. The pure evaluator
(`evaluateClaim`) and a thin rendering-data layer (`renderClaimHeader`) are
both real and tested (see [tests/claimContract.test.js](tests/claimContract.test.js)),
and Phase 4 corrected Phase 0's guessed signature
(`evaluateClaim(recovered, target, options)`) to match Person B's actual
state shape as described in this phase's task
(`evaluateClaim(similarityScore, options)`) — though that state shape
itself is still unverified, since no `stub-state.js` exists anywhere in
this repo (checked directly). The claim text the header displays is a
loudly-labeled `PLACEHOLDER_CLAIM`, not real wording — that's still blocked
on the same open, unowned team item as Person 2's item 5 (see "Closing
summary" below, item 4). Built-but-blocked, not stubbed.

**Phase 5 update — Person 1's entire scope is now complete.**
`src/ui/features/traceDebugPanel.js` is implemented (see
[tests/traceDebugPanel.test.js](tests/traceDebugPanel.test.js)): a pure
`buildRetrievalTrace(retrievalResult, target)` for the one real computation
this file does (per-step `similarity()` against a target), plus a thin
`renderDebugPanel(state, target)` reading `state.patternCount`,
`state.noisePct`, and `state.retrievalResult.{iterationCount,steps}` —
mirroring the same pure-computation/thin-state-reader split
`claimContract.js` established in Phase 4. `target` stayed an explicit
parameter on both rather than a guessed `state.*` field, since the task's
field list never named one and no `stub-state.js` exists anywhere in this
repo to check a guess against — see "Open assumptions" below and the
consolidated closing summary at the bottom of this document for why that
absence is now called out as its own standalone blocker.

All five files in Person 1's scope (`write.js`, `similarity.js`,
`injectNoise.js`, `claimContract.js`, `traceDebugPanel.js`) now have real
implementations. Sections below are updated in place where a later phase
changed something; anything not called out as resolved still reflects
Phase 0. See "Closing summary" at the end of this document for the full
account of what's done vs. what still needs a team decision.

**Phase 6 update — verification + handoff, no new implementation.**
Closed Person 2's outstanding item 3 ("presets never checked against the
real similarity()") — see
[tests/presetCorrelation.test.js](tests/presetCorrelation.test.js), a new
file, and "Resolved in Phase 6" below for the agree/disagree finding.
Also drafted (not sent — no send mechanism exists in this scope, same as
Phase 2's `guidedSequence.js` flag) a broadcast message for the team
channel: `write.js` is real, gate-passed, and stable since Phase 3
(reconfirmed here with a final, unmodified test run), with its signature,
return shape, and the Phase 3 gate-number finding flagged explicitly so it
reads as an expected result, not a bug report, once Person 3 wires
`sweepCapacity()` against it. See the drafted message in the Phase 6 chat
output. That finding (item 3 in "Closing summary" below) is now *drafted
for communication*, not resolved — it stays in the still-open list until
the message is actually sent and Person 3 acts on it.

## Files owned by Person 1

| File | Contract source | Status |
|---|---|---|
| `src/core/write.js` | fixed (task spec) | **implemented (Phase 3)** |
| `src/core/similarity.js` | fixed (task spec) | **implemented (Phase 1)** |
| `src/core/injectNoise.js` | fixed (task spec) | **implemented (Phase 2)** |
| `src/ui/features/claimContract.js` | **inferred, unconfirmed** | **implemented against a placeholder (Phase 4)** — logic done, real claim wording still blocked |
| `src/ui/features/traceDebugPanel.js` | **inferred, unconfirmed** | **implemented (Phase 5)** — logic done; `target` param sidesteps the missing-state.js issue, doesn't resolve it |
| `tests/write.test.js` | — | **implemented (Phase 3)** — 12 real tests, 0 todos |
| `tests/similarity.test.js` | — | **implemented (Phase 1)** — 9 real tests, 0 todos |
| `tests/injectNoise.test.js` | — | **implemented (Phase 2)** — 9 real tests, 0 todos |
| `tests/claimContract.test.js` | — | **implemented (Phase 4)** — 8 real tests, 0 todos |
| `tests/traceDebugPanel.test.js` | — | **implemented (Phase 5)** — 5 real tests, 0 todos |
| `tests/presetCorrelation.test.js` | — | **implemented (Phase 6)** — 2 real tests, 0 todos; new file, verification only |

All 49 tests across every file in this repo (Person 2's + Person 1's)
pass, 0 failures, 0 todos, as of Phase 6. Person 1's scope — all 5
implementation files plus this verification file — is complete.

## Contracts (fixed, verbatim)

```
write(patterns: number[][], options?: { decay?: number, sparse?: boolean, sparsityPct?: number }): number[][]
similarity(a: number[], b: number[]): number
injectNoise(pattern: number[], pct: number, seed?: number): number[]
```

These three are given, not inferred. `claimContract.js` and
`traceDebugPanel.js` have no equivalent — see "Open assumptions" below.

## CONFIG import rule

`src/config.js` is the single source of truth for every tunable number in
this project:

```js
export const CONFIG = {
  PATTERN_DIM: 64, GRID_SIZE: 8,
  MAX_PATTERNS: 20, MIN_PATTERNS: 1,
  NOISE_MIN: 0, NOISE_MAX: 100,
  MAX_ITERATIONS: 10, CONVERGENCE_EPSILON: 0,
  PASS_THRESHOLD: 90, SPARSITY_PCT: 30,
  DECAY_DEFAULT: 1.0,
};
```

Rule: no literal numbers in code that represent a simulation/domain
parameter — import and use `CONFIG.*` instead. This doesn't ban every
integer literal that appears anywhere: Person 2's `guidedSequence.js` still
hardcodes `[3, 8, 14, 20]` as `GUIDED_STEPS`, and `createPresetPatterns.js`
hardcodes `CORRELATION_THRESHOLD = 0.70` — both named local constants with a
comment explaining why they're deliberately *not* CONFIG values. The bar:
if a number is a simulation parameter another file might need to agree on,
it goes in CONFIG; if it's a fixed, file-local design constant, it's a named
constant with a one-line justification, never a bare literal. Test-file
arity assertions (e.g. `write.length === 2`) are neither of those — they
check the JS function's declared parameter count, not a simulation
parameter — so they stay as plain literals.

Zero stub files remain in Person 1's scope as of Phase 5. The five
implemented files land on different sides of the import question, for
principled reasons rather than inconsistency:

- `src/core/similarity.js` (Phase 1) does **not** import `CONFIG` — the
  only validation its contract needs is `a.length === b.length`, and the
  percentage must be computed against `a.length`, not the constant
  `CONFIG.PATTERN_DIM` (see "Open assumptions" below for why that
  distinction turned out to matter).
- `src/core/injectNoise.js` (Phase 2) **does** import `CONFIG` — its
  contract requires validating `pct` against `CONFIG.NOISE_MIN`/
  `CONFIG.NOISE_MAX`, genuine simulation-config bounds with no
  `a.length`-derived equivalent.
- `src/core/write.js` (Phase 3) **does** import `CONFIG`, for a third,
  distinct reason: two real defaults (`CONFIG.DECAY_DEFAULT`,
  `CONFIG.SPARSITY_PCT`) with no input-derived equivalent, plus the one
  genuine dimension exception in Person 1's scope — with `patterns = []`
  there is no input to derive a size from at all, so `CONFIG.PATTERN_DIM`
  is load-bearing there specifically. Everywhere else in `write.js` (any
  non-empty `patterns`), the working dimension is `patterns[0].length`,
  same "derive from input" convention as `similarity.js`/`injectNoise.js`
  — this is what let `tests/write.test.js` use a hand-verifiable
  8-element fixture against the real function instead of a `CONFIG.PATTERN_DIM`-sized
  one full of `NaN` from reading past a short pattern's end.
- `src/ui/features/claimContract.js` (Phase 4) **does** import `CONFIG` —
  `evaluateClaim`'s threshold defaults to `CONFIG.PASS_THRESHOLD`, the
  exact same field `similarity.js`'s tests already reference, no new
  config value needed.
- `src/ui/features/traceDebugPanel.js` (Phase 5) does **not** import
  `CONFIG` — same reasoning category as `similarity.js`: nothing in its
  logic is a simulation/domain parameter (it reads state fields and calls
  `similarity()`, it doesn't define a threshold or a dimension of its
  own). It does import `similarity()` directly from `../../core/similarity.js`
  — the one real computation this file does is explicitly "wire Phase 1's
  work in," not reimplement it.

All five test files import `CONFIG`, to read live values into test
names/descriptions and bounds checks instead of duplicating them as
literals — none has any `test.todo()` left.

## The preset-count blocker — and how these tests stay decoupled from it

`createPresetPatterns()` ([src/core/createPresetPatterns.js](src/core/createPresetPatterns.js))
currently returns 9 patterns (`SHAPES.length`), but `CONFIG.MAX_PATTERNS` is
20. This is a known, open team decision (more presets vs. lower
`MAX_PATTERNS` vs. shrink the guided-sequence checkpoints) — not mine to
fix, and not something to silently work around by, say, padding the preset
set myself or quietly capping a test loop at 9.

What I'm doing instead: every test I write reads its upper bound from
`CONFIG.MAX_PATTERNS` and/or `createPresetPatterns().length` **at run
time**, never from a hardcoded N. Concretely:

- No test asserts a literal pattern count like `20` or `9`.
- Where a test needs "as many patterns as currently exist," it uses
  `createPresetPatterns().length` directly.
- Where a test needs "the configured ceiling," it uses `CONFIG.MAX_PATTERNS`.
- If the two are meant to eventually match, the test computes that
  relationship rather than encoding either side's current value.

This means the blocker's eventual resolution — more presets, a lowered
`MAX_PATTERNS`, or shrunk checkpoints — requires zero changes to any test in
this scope. `tests/write.test.js` demonstrates this directly: its last
`test.todo()` name is built from `createPresetPatterns().length` and
`CONFIG.MAX_PATTERNS`/`CONFIG.MIN_PATTERNS` read live at module-load time,
not typed in as literals.

## The degenerate-matrix bug — and the invariant these tests will check

Person 2's original `scratch/stub-write.js` built its weight matrix from
**unsigned** `Math.random()` (values in `[0, 1)`, never negative). Against a
bipolar (`+1`/`-1`) pattern encoding, that matrix had no relationship to any
stored pattern at all — it converged (in the `retrieveIterative()` sense of
"stopped changing between iterations") to a degenerate all-`-1` fixed
point, and that fixed point still scored ~56% similarity against a real
pattern — chance level for a bipolar vector, but close enough to look like
a plausible result if nobody checked what "converged" actually converged
*to*. Person 2 caught this and worked around it locally (their stub now
builds a real Hebbian outer-product matrix when given patterns — see
[scratch/stub-write.js](scratch/stub-write.js)). The real fix, in Person
1's own scope, is the real `write()` implemented in Phase 3 below — not
just a local workaround.

Takeaway: **`converged: true` is not evidence of a correct `write()`.** A
matrix can be well-formed enough to reach a stable fixed point while that
fixed point is meaningless. So `tests/write.test.js` checks, beyond "it
runs and returns a matrix of the right shape":

1. **Symmetry** — `W[i][j] === W[j][i]` for every `i, j`. The classical and
   decayed Hebbian rules are both sums of outer products, which are
   symmetric by construction; an asymmetric result means the accumulation
   logic is wrong, whether or not retrieval happens to still terminate.
2. **Zero diagonal** — `W[i][i] === 0` for every `i`. Required by the
   Hebbian rule (a unit doesn't feed back on itself) and directly
   responsible for `retrieveIterative()` not trivially self-reinforcing
   every cell to its current value on iteration 1.
3. **Above-chance recovery** — retrieval against `write()`'s output must
   recover a pattern that is actually similar (via `similarity()`, once it
   exists) to a *stored* pattern, not just that `retrieveIterative()`
   reports `converged: true` after some number of iterations. This is the
   direct regression test for the failure mode above: a matrix that
   "converges" to ~chance-level similarity must fail this check even though
   it would pass a naive "did it converge" check.

All three are real, passing assertions as of Phase 3 (`tests/write.test.js`)
— nailing the invariants down in Phase 0 meant Phase 3 didn't have to
re-derive what "correct" means while also writing the matrix math for the
first time. Phase 3 also cross-checked the classical (no-options) path
directly against Person 2's patched `scratch/stub-write.js`: **exact
numeric agreement**, 0 max difference, on both a 2-preset and a full
9-preset input (see the Phase 3 chat output for the verification). The two
implementations were written independently from the same Hebbian rule and
landed on identical numbers — good evidence neither has a subtle
transcription bug in the classical path specifically (this doesn't cover
the sparse or decay paths, which `stub-write.js` never implemented).

## Test-runner convention

Same as Person 2's scope: Node's built-in `node --test` and
`node:assert/strict`, zero dependencies, no `package.json` / `node_modules`.
Run the whole suite with:

```bash
node --test
```

`test.todo(name)` (no function body) marks a planned-but-unimplemented
case; it's reported by the runner but never fails the suite. Every
`test.todo()` in this phase's test files exists to document a required
invariant, not to be forgotten — Phase 1+ should turn each one into a real
`test(...)` with assertions, not delete and re-derive it from scratch. Zero
`test.todo()` remain anywhere in Person 1's scope as of Phase 3, and that's
held through Phase 4, Phase 5, and Phase 6: all 49 tests across every file
in the repo pass.

## Open assumptions (unconfirmed — flag before relying on these)

### Resolved in Phase 1

- **`similarity()` scale and name**: no longer an assumption. The Phase 1
  task spec directly confirmed both: 0-100 scale (percentage of positions
  where `a[i] === b[i]`) and the name `similarity` (not `computeSimilarity`
  or any alias of Person 2's scratch file). `src/core/similarity.js`
  implements exactly that, independently of `scratch/stub-similarity.js`.

  What Phase 1 actually found, run numerically rather than assumed: the two
  functions agree **exactly** on real, `CONFIG.PATTERN_DIM`-length data
  (verified: 0 max difference across all 81 `createPresetPatterns()`
  pattern pairs). That agreement is real but narrower than it looks —
  `computeSimilarity()` divides by the constant `CONFIG.PATTERN_DIM`, while
  `similarity()` divides by `a.length`, so the two formulas are only
  identical when `a.length === CONFIG.PATTERN_DIM`. Verified they diverge
  on a shorter input: on the same 8-element fixture used in
  `tests/similarity.test.js`, `similarity()` correctly returns `62.5`
  (`5 / 8 * 100`) while `computeSimilarity()` returns a wrong `7.8125`
  (`5 / 64 * 100`) on identical input. The two files remain fully
  independent — neither imports the other, in either direction — this was
  a one-off numerical check (see the Phase 1 chat output), not a coupling.

### Resolved in Phase 2

- **`injectNoise()` out-of-range behavior**: the Phase 0 test.todo left this
  as "throw vs. clamp, to be nailed down" (its own text said "in Phase 1,"
  but the file wasn't actually implemented until Phase 2 — a minor mislabel
  in the original todo, not a schedule slip). Resolved: throw, not clamp. A
  caller passing e.g. `pct=150` almost certainly has a bug (a
  percentage/fraction mix-up being the likely cause), and silently clamping
  to 100 would hide that bug the same way the degenerate unsigned-
  `Math.random()` `write()` bug stayed hidden — nothing complained loudly
  when its output was structurally wrong. `tests/injectNoise.test.js`
  asserts both directions throw (`pct` above `CONFIG.NOISE_MAX` and below
  `CONFIG.NOISE_MIN`).

### Resolved in Phase 3

- **`write()` vs. `scratch/stub-write.js` numeric agreement**: confirmed,
  not just assumed — exact agreement (0 max difference) on the classical
  (no-options) path, checked against both a 2-preset and a full 9-preset
  input. See "The degenerate-matrix bug" above for the full result.
- **Dimension source design**: confirmed working, not just theorized. Using
  `patterns[0].length` (not `CONFIG.PATTERN_DIM`) as the working dimension
  whenever `patterns` is non-empty — falling back to `CONFIG.PATTERN_DIM`
  only when `patterns = []` — is what let
  `tests/write.test.js` run a hand-verifiable 8-element fixture straight
  through the real `write()` (not a synthetic stand-in) while every
  real-preset-based test still correctly produces a 64x64 matrix. Verified
  via both, not assumed compatible.
- **`decay`/`sparse` composability**: the task described these as two
  named paths ("classical," "sparse/BDH-style," "decay") without spelling
  out their interaction. Resolved as orthogonal and composable: `sparse`
  controls what gets accumulated per pattern (sparsified vs. raw), `decay`
  controls how accumulation happens across patterns (incremental-with-decay
  vs. plain summation) — implemented as one incremental loop where decay
  defaults to `CONFIG.DECAY_DEFAULT` (1.0), which is mathematically the
  classical summation as a special case (multiplying by the exact float
  1.0 changes nothing), not a second, separately-implemented formula.

### Resolved in Phase 4

- **`claimContract.js` signature**: Phase 0's guessed
  `evaluateClaim(recovered, target, options)` (two raw patterns) is
  replaced by `evaluateClaim(similarityScore, options)` (one pre-computed
  0-100 number), per this phase's task description of Person B's real
  state shape. This is a genuine correction, not just a rename — the old
  guess would have made `evaluateClaim` recompute a similarity score
  itself; the corrected version trusts whatever already computed
  `state.similarityScore` and does one threshold comparison, matching the
  "boolean-derived from a threshold comparison, no new math" spec exactly.
- **What "confirmed" actually means here — read carefully**: the
  *signature* is corrected against this phase's task description, but that
  description is not the same thing as a real `state.js` or `stub-state.js`
  to check it against — neither exists anywhere in this repo (checked
  directly at Phase 4 time, same way the Phase 0 blocker check was done by
  reading files, not assuming). So `state.similarityScore` being the right
  field name is still exactly one level less certain than, say,
  `similarity()`'s 0-100 scale was after Phase 1 (which got checked against
  two independently-written implementations). This is exactly "Closing
  summary" item 5 below, generalized in Phase 5 to cover
  `traceDebugPanel.js`'s state fields too — reopens the moment a real or
  stub `state.js` appears with a different shape.

### Resolved in Phase 5

- **`traceDebugPanel.js` signature**: Phase 0's inferred
  `buildRetrievalTrace(retrievalResult, target)` needed no correction the
  way `claimContract.js`'s did — it was already anchored to
  `retrieveIterative()`'s real, gate-passed return shape, not a guess about
  an unseen `state.js`. Confirmed by building it and wiring it through a
  real `write()` + `injectNoise()` + `retrieveIterative()` pipeline
  (`tests/traceDebugPanel.test.js`), not just theorized. What Phase 5 added
  on top: a thin `renderDebugPanel(state, target)` layer for the four
  `state.*` fields the spec actually names, with `target` deliberately kept
  a separate, explicit parameter on both functions rather than a fifth,
  unnamed `state.*` field guessed on top of the four real ones — see the
  closing summary below, item 5, for why that separation matters.
- **Zero-drift requirement**: confirmed, not just designed-for. The split
  doc's "debug panel numbers must match what's rendered elsewhere, zero
  drift" requirement is satisfied by construction here (`buildRetrievalTrace`
  calls Phase 1's real `similarity()` directly, so there is no second
  implementation to drift out of sync with) — and
  `tests/traceDebugPanel.test.js` checks this pairwise, across every step,
  not just spot-checked.

### Resolved in Phase 6

- **Person 2's item 3 — presets never checked against the real
  `similarity()`**: closed. Person 2's own correlation check
  (`positionalMatchFraction`, both inside `createPresetPatterns.js` and
  duplicated in `tests/createPresetPatterns.test.js`) was deliberately
  built independent of any `similarity.js`, per that file's own Phase 1
  comment — correct at the time, since `similarity.js` didn't exist yet,
  but it meant the presets were never actually run through the real
  function everyone else uses. `tests/presetCorrelation.test.js` (new
  file) closes this: every pair of real presets scored by the real
  `similarity()` stays within `CORRELATION_THRESHOLD` (converted from its
  native 0-1 scale to `similarity()`'s 0-100 scale — `CORRELATION_THRESHOLD_PCT
  = CORRELATION_THRESHOLD * 100 = 70`), and the real `similarity()` agrees
  with the independent `positionalMatchFraction` check on **every** pair,
  not just the worst one (0 disagreements found, checked across all 72
  ordered non-self pairs). Both checks also independently identify the
  same worst pair — `l`/`square-outline` at `68.75%` on both — matching the
  value already noted in `createPresetPatterns.js`'s own historical comment
  ("~68.8%"). Person 2's independent build-time check was not silently
  wrong; this confirms it, rather than merely adding a new assertion that
  happens to pass.

## Closing summary — Person 1's scope is complete

All five files in Person 1's scope — `write.js`, `similarity.js`,
`injectNoise.js`, `claimContract.js`, `traceDebugPanel.js` — have real
implementations, backed by 49 passing tests (0 failures, 0 todos) across
every file in the repo, Person 2's included (Phase 6 added 2 more,
verification-only, in a new `tests/presetCorrelation.test.js`).
`claimContract.js` is real but displays a placeholder claim; everything
else is complete on its own terms within what this scope can verify alone.
Phase 6 also drafted (not sent) a broadcast message announcing `write.js`
as ready for Person 3's `sweepCapacity()` (see the Phase 6 chat output) and
closed Person 2's outstanding item 3 (see "Resolved in Phase 6" above) —
both verification/handoff work, not new implementation.

Five items need a decision from someone other than Person 1 before Sync
Point 1/2 can fully close. None are resolved unilaterally in this scope —
each is flagged here, in the file(s) that hit it, and (where applicable) in
a drafted-but-unsent team-channel message (items 2 and, as of Phase 6, 3):

1. **Preset-count gap** (Phase 0; Person 2's item 1) — `createPresetPatterns()`
   returns 9 patterns, but `CONFIG.MAX_PATTERNS` is 20. Blocks Person 2/3's
   N=14/N=20 work (guided-sequence checkpoints, capacity sweeps). Needs:
   more presets, a lowered `MAX_PATTERNS`, or shrunk checkpoints — a team
   call, not a unilateral fix.
2. **`guidedSequence.js` noise duplication** (Phase 2) — Person 2's
   `withNoise()` (fixed-prefix flip, zero randomness) and the real
   `injectNoise()` (pseudo-random subset, seeded or not) are different
   algorithms that happen to agree on flip *count* but not on *which*
   positions flip. Team-channel flag drafted in Phase 2, proposing
   `guidedSequence.js` switch to `injectNoise(pattern, 10, <fixed seed>)` —
   not sent, not acted on unilaterally.
3. **Gate-number mismatch** (Phase 3; drafted for communication in Phase
   6, not yet sent or acted on) — the split doc's "8 patterns / 10% noise
   -> 60-70% similarity" gate measures at 96.875-100% against the real
   `createPresetPatterns()` shapes (200-seed sweep), because those
   hand-drawn shapes are far more structured than the random-pattern
   assumption behind classical Hopfield capacity theory.
   `tests/write.test.js` asserts the real, verified number, not the split
   doc's — the split doc itself is untouched, pending a team decision on
   whether to update the number or harden the demo case. Phase 6 also
   confirmed `write.js` itself is unaffected and still gate-passing (12/12,
   re-run unmodified) and drafted a broadcast message telling Person 3
   what to expect from this before they wire `sweepCapacity()` against it
   — drafted, not sent; this item stays open until Person 3 actually
   receives and acts on it.
4. **Claim-wording ownership** (Phase 0, sharpened in Phase 4) — the
   one-sentence falsifiable claim `claimContract.js`'s header is supposed
   to display was Person D's deliverable in the original 4-person split;
   nobody inherited it when the split folded to 3 people. Same unowned gap
   as Person 2's item 5 (BDH-module/citations). `claimContract.js` ships
   fully wired against `PLACEHOLDER_CLAIM` so the real sentence is a
   one-line swap the moment someone owns this — but until then, the header
   displays a placeholder, not a real claim.
5. **No `stub-state.js` exists anywhere in this repo** (Phase 4/5 finding,
   named as its own standalone blocker for the first time here) — checked
   directly, twice, in two different phases: no `state.js`, real or stub,
   in `src/` or `scratch/`. The build-order convention assumed a Person-B
   "Hour-1 independence kit" to build `claimContract.js`/`traceDebugPanel.js`
   against before swapping to the real `state.js` at Sync Point 2; that kit
   was never committed here (or lives somewhere this repo doesn't reach).
   Both files worked around this the only defensible way available — taking
   `state` (and, for `traceDebugPanel.js`, `target`) as **plain injected
   arguments** rather than importing a specific path, the same precedent
   Person 2's `guidedSequence.js` already set for its own `write` parameter
   (that file's own header comment labels it "Phase 5 — Person 2," a
   separate numbering from this document's Person-1-scoped phases — this
   document's Phase 5 is `traceDebugPanel.js`, below) — but a workaround at
   the call-site isn't the same as a confirmed contract.
   `state.similarityScore` (`claimContract.js`) and
   `state.{patternCount,noisePct,retrievalResult}` (`traceDebugPanel.js`)
   are both still unverified field-name guesses, taken from task
   descriptions, not from any file that exists to check them against. This
   blocks Sync Point 2 for both files the exact same way item 1 blocks
   Person 2/3's N=20 work: not a bug, not something to invent a fix for,
   just a real dependency that doesn't exist yet.

## Non-goals

- Phase 0 (historical): no real math in `write.js`, `similarity.js`,
  `injectNoise.js`, or the one legitimate computation in
  `traceDebugPanel.js`; no real assertions beyond signature/arity checks in
  the test files. All five files graduated out of this over Phases 1-5 —
  Person 1's entire scope is now fully done (see "Closing summary" above).
- Ongoing: no attempt to close the preset-count gap (padding presets,
  lowering `MAX_PATTERNS`, or editing `createPresetPatterns.js` — not my
  file, not my call). See "Closing summary," item 1.
- Ongoing: no invention of the real claim wording for `claimContract.js` —
  `PLACEHOLDER_CLAIM` stays as-is until the team assigns an owner. See
  "Closing summary," item 4 — same discipline Person 2 applied to the
  BDH-citations item.
- Ongoing: no edit to `guidedSequence.js` to consolidate its `withNoise()`
  onto the real `injectNoise()` — that duplication is flagged for the team,
  not resolved unilaterally here. `guidedSequence.js` is Person 2's file
  and already gate-passed. See "Closing summary," item 2.
- Ongoing: no edit to the split doc's "8 patterns / 10% noise -> 60-70%"
  gate number, despite `tests/write.test.js` showing it doesn't hold
  against real preset data — flagged for the team, not silently corrected
  or hidden. See "Closing summary," item 3.
- Ongoing: no invention of a `state.js` contract (real or stub) to resolve
  the `state.similarityScore` / `state.{patternCount,noisePct,retrievalResult}`
  field-name guesses in `claimContract.js`/`traceDebugPanel.js` — that's a
  dependency to receive, not a gap to paper over unilaterally. See "Closing
  summary," item 5.
- Phase 6: no edit to `sweepCapacity.js` — that's Person 3's file, not
  mine to write, stub-swap, or pre-adapt for them. Phase 6's job was
  confirming `write.js` is ready and telling Person 3 what to expect, not
  touching their code.
- Phase 6: no editing `tests/createPresetPatterns.test.js` or
  `createPresetPatterns.js` to close Person 2's item 3 — both are Person
  2's files, already gate-passed, and their independence from
  `similarity.js` was a deliberate Phase-1 design choice worth preserving.
  The re-gate lives in a new, separate file instead (see "Resolved in
  Phase 6" above).
