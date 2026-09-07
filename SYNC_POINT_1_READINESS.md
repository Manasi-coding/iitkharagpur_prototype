# Sync Point 1 Readiness — Person 2

Status: ready. Swap is a single import-path change in one test file. Zero
changes needed to owned module logic (`createPresetPatterns.js`,
`retrieveIterative.js`), provided Person 1/Person B match the split-doc
contracts. One coverage gap is documented below and must be closed at the
actual re-gate, not before.

## Files owned by Person 2

- `src/core/createPresetPatterns.js` — DONE, gate-passed (Phase 1)
- `src/core/retrieveIterative.js` — DONE, gate-passed (Phase 2)
- `src/ui/features/guidedSequence.js` — DONE (Phase 5): exports `advanceGuidedSequence(guidedStepIndex, write)`, pure function
- `src/ui/features/proveItMode.js` — not yet built (empty)

## Stub imports and their swap points

### Shipped modules (`src/core/*.js`)

| File | Stub imports | Swap needed? |
|---|---|---|
| `createPresetPatterns.js` | none (write/similarity/injectNoise, real or stub) | No — no dependency exists |
| `retrieveIterative.js` | none | No — `W` is a plain argument, agnostic to how it was produced |

Neither shipped module imports `write.js`, `similarity.js`, or `injectNoise.js`
in any form. There is nothing to swap in `src/core/` at Sync Point 1.

### Tests (`tests/*.js`)

| File | Stub imports | Swap needed? |
|---|---|---|
| `tests/createPresetPatterns.test.js` | none | No |
| `tests/retrieveIterative.test.js` | `scratch/stub-write.js` | **Yes — see below** |

`tests/retrieveIterative.test.js` is the only place in Person 2's scope that
imports a stub. Marked with `TEMPORARY` comments at the exact lines:

- Line 5-7 (import): `import { write } from '../scratch/stub-write.js';`
  → change to `import { write } from '../src/core/write.js';` once Person 1's
  `write.js` lands and gate-passes.
- Line 21 and line 35 (usage): `const W = write([presets[0].pattern, presets[1].pattern]);`
  → no change needed to these lines themselves (same call shape for the
  classical/no-options case); marked only for findability.

### `similarity.js` (stub or real)

Not imported anywhere across any of Person 2's four files or their tests.
`createPresetPatterns.js`'s correlation check (`positionalMatchFraction`) was
built independently per the Phase 1 requirement and has no coupling to
Person 1's `similarity()`, real or stub. No swap point exists because no
dependency exists. `guidedSequence.js` is built and confirmed to have zero
`similarity()` coupling. If `proveItMode.js` ends up needing `similarity()`
when built, that will be a new dependency added at that time, not a stub
swap.

### `state.js` (Person B)

Not imported anywhere in Person 2's scope currently — `guidedSequence.js` is
built and confirmed to have zero `state.js` coupling by design (pure
function, Phase 5), and `proveItMode.js` is still empty (Phase 6 in
progress). Per the split doc, Person B owns the actual import-path swap on
their own side. Nothing pending here yet; if `proveItMode.js` ends up
needing `state.js` when built, that's a new dependency to add at that time,
not a swap of an existing reference.

## Zero-logic-change confirmation

- `createPresetPatterns.js`: pure function, no dependency on `write`/
  `similarity`/`injectNoise` in any form. Nothing changes regardless of what
  Person 1 ships.
- `retrieveIterative.js`: pure function, `W` passed as a plain argument.
  Nothing changes regardless of what Person 1's `write()` returns, **provided
  it returns a matrix in the same shape/contract** (`PATTERN_DIM x
  PATTERN_DIM`, numeric) that `stub-write.js` currently does. See the risk
  below for the one caveat this depends on.

## Known risk: stub vs. real `write()` behavioral divergence (documented, not fixed here)

**Concrete, already-known gap** — `scratch/stub-write.js` (extended in Phase 2)
implements only the classical Hebbian path when given patterns:

```
W = Σ outer(pattern, pattern), zero diagonal
```

It has **no decay** and **no sparsity** support.

Person 1's real `write()` contract (per the split doc):

```
write(patterns: number[][], options?: { decay?: number, sparse?: boolean, sparsityPct?: number }): number[][]
```

- **Classical path** (no options): matches what the stub already does.
- **Sparse path** (`sparse: true`): zeros out negative values, keeps only the
  top `sparsityPct%` by magnitude per pattern before accumulating — stub has
  no equivalent.
- **Decay path** (`decay` given): `W = decay·W_prev + outer(pattern, pattern)`,
  applied incrementally per pattern, default `CONFIG.DECAY_DEFAULT` — stub
  has no equivalent.

`tests/retrieveIterative.test.js` currently calls
`write([presets[0].pattern, presets[1].pattern])` with **no options argument
at all** — so today's test suite only ever exercises the classical,
no-decay, no-sparse path. `retrieveIterative()` itself has no knowledge of
decay or sparsity (it only consumes whatever matrix `W` it's given), so this
is not a bug in Person 2's code — but it is untested surface area.

**Required action at the actual Sync Point 1 re-gate (not now):** add at
least one additional test case calling the real `write()` with `sparse:
true` and/or a `decay` value below `1.0`, confirming `retrieveIterative()`
still converges sensibly against a sparse or decayed matrix — not just the
plain classical case currently covered. This is a coverage gap to close
during re-gate, not something to speculatively build against a module that
doesn't exist yet.

### Determinism risk (verified empirically, not assumed)

`advanceGuidedSequence`'s determinism — two independent calls with identical
inputs produce deep-equal output sequences, confirmed empirically — currently
holds **only** because the injected `write` implementation is itself
deterministic. Confirmed: the Hebbian/non-empty-patterns branch of
`stub-write.js` has zero randomness; only its zero-argument fallback uses
`Math.random()`, and `advanceGuidedSequence` never reaches that branch. This
is not something `advanceGuidedSequence` enforces on its own — it depends
entirely on whichever `write` is injected.

**Required action at the actual Sync Point 1 re-gate:** once Person 1's real
`write.js` lands — especially if `sparse` or `decay` options introduce any
internal randomness — this determinism guarantee needs to be re-verified,
not assumed to carry over automatically. This matters because Phase 6's
`proveItMode.js` gate requires Prove-It output to exactly match manual
guided-sequence output; if a future real `write()` breaks determinism, that
gate breaks too, silently.

## Next steps at actual Sync Point 1

1. Change the import on line 5-7 of `tests/retrieveIterative.test.js` from
   `../scratch/stub-write.js` to the real `write.js` path.
2. Run `node --test` — confirm the same pass/fail results with the real
   `write()` in place of the stub.
3. Add the sparse/decay convergence check described above using the real
   `write()`'s `options` argument.
4. If Person B's `state.js` lands and `guidedSequence.js`/`proveItMode.js`
   get built with a dependency on it, document that swap at that time — not
   applicable yet.
