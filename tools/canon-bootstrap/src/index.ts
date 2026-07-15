/**
 * @gspl/canon-bootstrap
 *
 * Deterministic generator of canon/provenance JSON files and human-readable
 * ledgers. The single source of truth for the 20 inventions, the source
 * registry, the 12 claims, and the markdown ledgers. Running it twice
 * WITHOUT changing inputs produces byte-identical files (asserted by test).
 */

export * from './types.js';
export * from './serialize.js';
export * from './inventions/index.js';
export * from './sources/index.js';
export * from './claims/index.js';
export * from './registry.js';
export * from './ledgers.js';
export * from './consistency.js';
export { main } from './cli.js';
