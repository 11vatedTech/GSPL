/**
 * @gspl/claim-classifier
 *
 * Deterministic claim classifier for the GSPL canon.
 * Classifies GSPL claims into one of 8 status values. Validates that any
 * claim above THEORETICAL cites at least one evidence reference, and that
 * PROTOTYPED+ claims include falsification criteria.
 */
export * from './types.js';
export * from './status.js';
export { classify } from './classifier.js';
export type { ClassifyOptions } from './classifier.js';
export { main } from './cli.js';
//# sourceMappingURL=index.d.ts.map