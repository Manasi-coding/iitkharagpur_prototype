// STUB — swap-compatible test double for src/core/retrieveIterative.js.
//
// Currently a thin re-export of the real implementation:
//   - retrieveIterative is already a pure, deterministic function.
//   - No behavioral difference exists between this stub and the real module.
//
// This file exists as an explicit, named swap point: any caller (test or UI
// feature) that imports from here can switch to the real path by changing only
// the import string — no logic changes required.
//
// Follows the same TEMPORARY-comment convention established in
// tests/retrieveIterative.test.js for the write() stub swap.
//
// TEMPORARY: swap callers to src/core/retrieveIterative.js directly at
// Sync Point 1, once Person 1's full suite (write/similarity/injectNoise)
// lands and this level of indirection is no longer needed.
//
// Delete this file (or replace with a test double with controlled behavior)
// if a future phase requires a truly fake retrieval for isolation testing.
export { retrieveIterative } from '../src/core/retrieveIterative.js';
