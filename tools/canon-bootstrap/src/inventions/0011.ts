import type { InventionEntry } from '../types.js';

export const GSPL_INV_0011: InventionEntry = {
  id: 'GSPL-INV-0011',
  canonicalName: 'AST interpreter',
  aliases: ['GSPL interpreter'],
  founderIntent: 'An AST interpreter executes a GSPL program by walking the AST and applying environment-scoped substitutions.',
  definition: 'Tree-walking interpreter over the typed AST.',
  problemSolved: 'Reference execution semantics without committing to a particular compilation target.',
  evidence: [{ repo: 'paradigm-reference', file: 'spec/04-gspl-language.md' }],
  implementationStatus: 'partial',
  claimStatus: null,
  dependencies: ['GSPL-INV-0010'],
  conflicts: [],
  risks: ['Interpreter and codegen may disagree on edge cases until a canonical semantics document exists.'],
  disposition: 'ADAPT',
  targetSubsystem: 'runtime',
  createdAtPolicy: 'ADR-0006',
  schemaVersion: '1.0'
};
