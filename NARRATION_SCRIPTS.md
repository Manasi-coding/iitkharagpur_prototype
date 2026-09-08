# Person 2 — Narration Scripts

Spoken-style scripts for live defense, one per owned file. Each targets
under 2 minutes read aloud. Word counts are a proxy for spoken duration,
not a substitute for an actual timed read-aloud — `proveItMode.js`'s script
was originally 265 words and measured at ~2:00 in a real read at this
speaker's pace, so it was trimmed to 206 words for margin. Treat word count
as a first check, not the final one, especially for `state.js` below,
which has the least margin of the three new scripts.

## createPresetPatterns.js (249 words)

createPresetPatterns.js is a pure function — no arguments, no side effects — that returns nine hand-drawn, deterministic pattern arrays: shapes like an L, a T, an X, a square outline, and so on, each flattened into a 64-length bipolar vector using plus-one and minus-one, matching the Hopfield encoding the whole project uses. The contract is createPresetPatterns returns an array of id-and-pattern objects, and calling it twice gives you deep-equal results every time — verified by a test, not just claimed.

The one non-obvious decision was the correlation threshold. The spec gave me a range — 65 to 70 percent maximum overlap between any two patterns — but not an exact number. I actually computed the real pairwise correlation matrix for my nine shapes, found the worst pair sits at 68.8 percent, and picked 0.70 specifically because it's the tightest bound in that range my actual shapes still pass — 0.65 would have failed and forced another redesign pass. That threshold is enforced at module load time: if anyone edits a shape later and breaks it, the file throws immediately rather than silently shipping over-correlated patterns.

The honest limitation: there are only nine presets, but CONFIG says capacity should sweep up to twenty. That's a real, already-flagged gap — Person 3's capacity sweep and my own guided sequence both hit a wall past N equals nine, and it's not something I can fix inside this file. It needs the team to either add more presets or revisit that config ceiling.

## retrieveIterative.js (251 words)

retrieveIterative.js implements the actual Hopfield retrieval loop: starting from a query vector, it repeatedly computes the sign of W times the current state, until the output stops changing — that's convergence — or it hits a maximum iteration count. The contract is retrieveIterative of query, W, and an optional max-iterations, returning an object with four fields: the full sequence of intermediate states, the final output, whether it converged, and how many iterations it actually took. Critically, it takes W as a plain argument — it has zero knowledge of how that matrix was built, so it works identically whether W comes from a stub or Person 1's real write function.

The one non-obvious decision was what to do when the weighted sum at some position is exactly zero — the standard sign function is undefined there. I chose to keep that position's previous value unchanged rather than defaulting it to plus-one, which is the standard convention from Hopfield network theory, not something I made up — and it avoids introducing an artificial bias toward one value every time an exact cancellation happens.

The honest limitation is really about what I tested, not the function itself: my verification only exercises the plain classical write path, no decay, no sparsity. Person 1's real write function will support both, and I don't yet know whether retrieval still converges sensibly against a sparse or decayed matrix — that's a documented, open re-test item for when the real module lands, not something I've verified either way.

## guidedSequence.js (246 words)

guidedSequence.js drives the fixed walkthrough at four checkpoints — 3, 8, 14, and 20 stored patterns — reusing createPresetPatterns and retrieveIterative directly, no duplicated logic. The contract is advanceGuidedSequence of a step index and a write function, returning a partial state update: which checkpoint just ran, the patterns stored, the query used, the retrieval result, and whether the sequence is still active. It's a pure function on purpose — no subscribe, no setState — because the real state module doesn't exist yet, and I didn't want to guess at its behavior and bake a wrong assumption into my logic.

The one decision I actually reversed during development: I originally queried each checkpoint with a clean, un-noised pattern, reasoning that Hopfield capacity failure shows up from internal interference alone. But when I actually ran the numbers, a clean query looked identical — perfect recall — at both checkpoints I can currently reach, three and eight. So there was nothing visible to demonstrate. Adding a small, fixed ten-percent noise flip made the degradation actually show up: full correction at three, partial correction at eight. I only changed it because the data told me the clean version didn't work, not because I guessed it wouldn't.

The honest limitation: with only nine presets available, checkpoint fourteen can never run today. Rather than crash, it returns a defined blocked state — but that's a data problem the team still needs to solve, not something this function can fix on its own.

## proveItMode.js (206 words)

proveItMode.js is the automated version of the same walkthrough — instead of a person clicking Next, a setInterval fires the exact same advanceGuidedSequence function on a timer. There's no reimplemented stepping logic here at all; I import and call the real function, full stop. The contract is startProveIt of a write function and an onStep callback, returning a handle with a stop method. Each tick calls onStep with the result plus a caption, and the interval clears itself automatically once the sequence is no longer active.

The one non-obvious piece: setInterval needs something to remember the current step index between ticks, scoped to a single closure per call — not module-level state, not a stand-in for the real state module. I confirmed this by running the real interval against manual calls — deep-equal throughout.

The honest limitation, and I want to be upfront about this one: the real ending — reaching capacity failure at twenty patterns — is not something this file can show today. It hits the same nine-preset wall as the guided sequence and returns an honest "halted" message instead. What Prove It actually demonstrates right now is degradation through checkpoint eight, not the full capacity-failure story the feature is ultimately supposed to tell.

## state.js (256 words)

state.js is the single source of truth for the stopgap UI — a plain object with subscribe, setState, and getState, holding everything from stored patterns to the current retrieval result. I built it because Person B's real frontend files hadn't landed and my own features had nothing to mount against — it's explicitly a stopgap, labeled as such in its own header, meant to be replaced.

The one real decision worth explaining: setState behaves in two different ways depending on what you give it. If you set a control field — pattern count, noise, decay, sparse mode — it recomputes everything downstream through the real write, retrieveIterative, and similarity functions, exactly like a slider being dragged should. But if the partial you pass already includes its own retrievalResult — which is exactly what guidedSequence.js and proveItMode.js do, since they compute retrieval themselves — that result is trusted as-is and never recomputed. I added this specifically because the naive version would have silently discarded a correct, already-computed result and replaced it with a different one derived from whatever the sliders happened to say at the time. I verified this distinction actually works with a reference-equality check, not just by eyeballing that nothing crashed.

The honest limitation: this file only exists because Person B's real state.js doesn't yet. It implements the exact contract shape from the spec, but it's deliberately minimal — no persistence, no undo, no validation beyond what setState needs to do its job — and it's meant to disappear the moment the real frontend lands.

## layout.js (163 words)

layout.js is the smallest file in my stopgap — one function, buildLayout, that creates three empty panel containers, left, middle, and right, and appends them to the page root. That's the entire file.

There isn't a non-obvious design decision here the way there is in the other files, and I want to be honest about that rather than manufacture one: the spec asked for structure only, no styling polish, and this is about as literally structural as code gets. The only thing worth noting is what it deliberately doesn't do — it doesn't know anything about sliders, patterns, or state; render.js owns all of that. Keeping this file this dumb was deliberate, so the layout shape and the actual wiring logic stay cleanly separated, even in a stopgap that's going to be thrown away.

The honest limitation is the same as the rest of this stopgap: no styling, no responsiveness, and it's built to be replaced the moment Person B's real layout.js lands.

## render.js (221 words)

render.js is the biggest file in the stopgap — it builds the actual controls, wires them to state, and subscribes to render every panel whenever state changes. It also mounts my own two features, guidedSequence and proveItMode, through their Next and Watch-it-fail buttons — deliberately not Person 1 or Person 3's features, since I haven't confirmed that's my call to make.

Two real bugs were caught here through actual browser testing, not by reading the code. First: guidedSequence and proveItMode results carry no similarityScore field of their own, so passing them straight into setState left the score frozen at whatever the sliders last computed, next to a freshly updated retrieval grid — I fixed that by computing the score at the call site, against that same result's own ground truth. Second, and more subtle: starting Prove-It doesn't actually update state until its first timer tick fires, twenty seconds later — so locking the sliders only when a result arrives would have left them unlocked for the entire first interval. I fixed that by locking synchronously, in the click handler itself, the instant the button is pressed.

The honest limitation: no styling, and slider locking only covers my own two features — if Person 1 or Person 3's controls ever get mounted here, they'd need the same treatment, which isn't built yet.
