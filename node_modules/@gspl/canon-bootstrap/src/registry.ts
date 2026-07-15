import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

import { INVENTIONS } from './inventions/index.js';
import { SOURCES } from './sources/index.js';
import { CLAIMS } from './claims/index.js';
import type { ClaimRegistry, InventionRegistry, SourceRegistry } from './types.js';
import { BOOTSTRAP_TIMESTAMP, stableStringify } from './serialize.js';

export interface BootstrapPaths {
  inventionsPath: string;
  sourcesPath: string;
  claimsPath: string;
}

export function writeInventionRegistry(path: string): void {
  const reg: InventionRegistry = {
    schema: 'gspl.invention-ledger',
    schemaVersion: '1.0',
    generatedAt: BOOTSTRAP_TIMESTAMP,
    inventions: [...INVENTIONS].sort((a, b) => (a.id < b.id ? -1 : 1))
  };
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, stableStringify(reg), 'utf-8');
}

export function writeSourceRegistry(path: string): void {
  const reg: SourceRegistry = {
    schema: 'gspl.sources',
    schemaVersion: '1.0',
    generatedAt: BOOTSTRAP_TIMESTAMP,
    sources: [...SOURCES].sort((a, b) => (a.sourceId < b.sourceId ? -1 : 1))
  };
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, stableStringify(reg), 'utf-8');
}

export function writeClaimRegistry(path: string): void {
  const reg: ClaimRegistry = {
    schema: 'gspl.claims',
    schemaVersion: '1.0',
    generatedAt: BOOTSTRAP_TIMESTAMP,
    claims: [...CLAIMS].sort((a, b) => (a.claimId < b.claimId ? -1 : 1))
  };
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, stableStringify(reg), 'utf-8');
}

export function writeAllRegistries(paths: BootstrapPaths): void {
  writeInventionRegistry(paths.inventionsPath);
  writeSourceRegistry(paths.sourcesPath);
  writeClaimRegistry(paths.claimsPath);
}
