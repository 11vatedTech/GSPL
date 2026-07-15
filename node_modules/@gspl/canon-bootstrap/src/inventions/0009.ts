import type { InventionEntry } from '../types.js';

export const GSPL_INV_0009: InventionEntry = {
  id: 'GSPL-INV-0009',
  canonicalName: 'Recursive-descent GSPL parser',
  aliases: ['GSPL parser'],
  founderIntent: 'A recursive-descent parser over a 25+ node typed AST, layered atop the 26-keyword grammar. The parser is partial in canon-foundation; full coverage requires the canonical IR (deferred to Prompt 2).',
  definition: 'Recursive-descent parser producing the typed AST as defined in spec/04.',
  problemSolved: 'A canonical parser makes source code reproducible across implementations.',
  evidence: [{ repo: 'paradigm-reference', file: 'spec/04-gspl-language.md' }],
  implementationStatus: 'partial',
  claimStatus: null,
  dependencies: ['GSPL-INV-0008'],
  conflicts: [],
  risks: ['Edge cases (operator precedence, generics) are not fully exercised in canon-foundation tests.'],
  disposition: 'ADOPT',
  targetSubsystem: 'language',
  createdAtPolicy: 'ADR-0005',
  schemaVersion: '1.0'
};
