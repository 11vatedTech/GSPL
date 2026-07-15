import type { Disposition, ImplementationStatus, TargetSubsystem } from './disposition.js';
import type { ProvenanceSource } from './evidence.js';

export type ClaimStatus =
  | 'PROVEN'
  | 'IMPLEMENTED'
  | 'PARTIALLY_IMPLEMENTED'
  | 'PROTOTYPED'
  | 'THEORETICAL'
  | 'RESEARCH_REQUIRED'
  | 'UNSUPPORTED'
  | 'REFUTED';

export interface InventionEntry {
  id: string;
  canonicalName: string;
  aliases: readonly string[];
  founderIntent: string;
  definition: string;
  problemSolved: string;
  evidence: readonly ProvenanceSource[];
  implementationStatus: ImplementationStatus;
  claimStatus: ClaimStatus | null;
  dependencies: readonly string[];
  conflicts: readonly string[];
  risks: readonly string[];
  disposition: Disposition;
  targetSubsystem: TargetSubsystem;
  createdAtPolicy: string;
  schemaVersion: '1.0';
}

export interface InventionRegistry {
  schema: 'gspl.invention-ledger';
  schemaVersion: '1.0';
  generatedAt: string;
  inventions: readonly InventionEntry[];
}
