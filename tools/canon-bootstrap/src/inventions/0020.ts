import type { InventionEntry } from '../types.js';

export const GSPL_INV_0020: InventionEntry = {
  id: 'GSPL-INV-0020',
  canonicalName: 'Vitest-based canon test framework',
  aliases: ['canon tests', 'vitest suite'],
  founderIntent: 'All canon-related tests use Vitest and live in test/ directories inside each package. The framework hosts per-package property tests and the cross-package consistency tests.',
  definition: 'Vitest configuration and conventions for canonical testing.',
  problemSolved: 'A consistent test framework is required to host per-package test suites and the cross-package consistency tests.',
  evidence: [
    { repo: 'paradigm-gspl-os', file: 'vitest.config.ts' },
    { repo: 'canon-foundation', file: 'vitest.config.ts' }
  ],
  implementationStatus: 'complete',
  claimStatus: null,
  dependencies: ['GSPL-INV-0001'],
  conflicts: [],
  risks: ['Test framework drift would invalidate the consistency tests that tie registry to ledgers.'],
  disposition: 'ADOPT',
  targetSubsystem: 'canon-governance',
  createdAtPolicy: 'ADR-0009',
  schemaVersion: '1.0'
};
