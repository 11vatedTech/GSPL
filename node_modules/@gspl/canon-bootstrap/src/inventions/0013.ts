import type { InventionEntry } from '../types.js';

export const GSPL_INV_0013: InventionEntry = {
  id: 'GSPL-INV-0013',
  canonicalName: 'Canonical GSPL IR (research)',
  aliases: ['GSPL-IR'],
  founderIntent: 'A canonical GSPL IR is researched but not adopted. The referenced allocations across paradigms vary. ADR-0008 records this as research-only until Prompt 2 finalizes a canonical IR shape.',
  definition: 'A canonical GSPL IR is RESEARCH-REQUIRED; the references propose different IRs and no canonical choice is locked yet.',
  problemSolved: 'Codegen, optimizer, and debugger would benefit from a unified IR.',
  evidence: [
    { repo: 'paradigm-gspl-os', file: 'src/runtime/cli.ts' },
    { repo: 'paradigm-reference', file: 'spec/04-gspl-language.md' }
  ],
  implementationStatus: 'spec-only',
  claimStatus: null,
  dependencies: ['GSPL-INV-0010'],
  conflicts: ['GSPL-INV-0012'],
  risks: ['Without a canonical IR, codegen and interpreter drift; paradigms diverge.'],
  disposition: 'RESEARCH',
  targetSubsystem: 'compiler',
  createdAtPolicy: 'ADR-0008',
  schemaVersion: '1.0'
};
