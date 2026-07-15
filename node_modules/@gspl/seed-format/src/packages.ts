/** Package contracts — Prompt 2 §10 */

import type { ProvenanceSource } from '@gspl/types';

export interface PackageIdentity {
  id: string;
  name: string;
  version: string;
  contentHash: string;
  namespace?: string;
}

export interface PackageDependency {
  packageId: string;
  version: string;
  contentHash: string;
  optional: boolean;
}

export interface PackageProvenance {
  author?: string;
  license: string;
  repository?: string;
  sources?: ProvenanceSource[];
}

/** Base package contract */
export interface PackageContract {
  schema: 'gspl.package';
  schemaVersion: string;
  identity: PackageIdentity;
  protocolCompatibility: string;
  dependencies: PackageDependency[];
  provenance: PackageProvenance;
  declaredEffects: string[];
  resourceBounds: { maxTimeMs?: number; maxMemoryBytes?: number };
  securityClassification: 'public' | 'internal' | 'restricted' | 'confidential';
}

/** Context package: environmental assumptions */
export interface ContextPackage extends PackageContract {
  packageType: 'context';
  environmentAssumptions: Record<string, string>;
  targetIndependentConfig: Record<string, unknown>;
}

/** Knowledge package: reusable facts, patterns, schemas */
export interface KnowledgePackage extends PackageContract {
  packageType: 'knowledge';
  domainComponents: KnowledgeComponent[];
  conventions: Record<string, string>;
}

export interface KnowledgeComponent {
  id: string;
  type: 'pattern' | 'schema' | 'algorithm' | 'library' | 'convention' | 'architecture';
  description: string;
  version: string;
}

/** Rule package: deterministic transformations */
export interface RulePackage extends PackageContract {
  packageType: 'rule';
  rules: RuleDeclaration[];
  transformationContract: string;
}

export interface RuleDeclaration {
  id: string;
  description: string;
  inputs: string[];
  outputs: string[];
  deterministic: boolean;
  effectRequirements: string[];
}
