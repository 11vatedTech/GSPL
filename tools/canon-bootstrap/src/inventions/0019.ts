import type { InventionEntry } from '../types.js';

export const GSPL_INV_0019: InventionEntry = {
  id: 'GSPL-INV-0019',
  canonicalName: 'GSPL CLI surface',
  aliases: ['cli', 'gspl CLI'],
  founderIntent: 'A canonical GSPL CLI with subcommands: gspl validate, gspl hash, gspl seed, gspl expand, gspl sign, gspl verify. The surface is adapted from paradigm-gspl-os and governed by ADR-0009.',
  definition: 'Canonical CLI surface (validate, hash, seed, expand, sign, verify) for sovereign GSPL operations.',
  problemSolved: 'A canonical CLI surface prevents tooling drift and undocumented command behavior.',
  evidence: [{ repo: 'paradigm-gspl-os', file: 'src/runtime/cli.ts' }],
  implementationStatus: 'partial',
  claimStatus: null,
  dependencies: ['GSPL-INV-0001', 'GSPL-INV-0004', 'GSPL-INV-0017'],
  conflicts: [],
  risks: ['Adding CLI subcommands without an ADR would lock users into unstable command shapes.'],
  disposition: 'ADOPT',
  targetSubsystem: 'package-system',
  createdAtPolicy: 'ADR-0009',
  schemaVersion: '1.0'
};
