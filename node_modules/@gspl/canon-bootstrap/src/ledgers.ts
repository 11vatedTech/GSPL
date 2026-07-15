import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

import { INVENTIONS } from './inventions/index.js';
import { CLAIMS } from './claims/index.js';
import { SOURCES } from './sources/index.js';
import { BOOTSTRAP_TIMESTAMP } from './serialize.js';

function mdHeader(title: string): string {
  return [
    '# ' + title,
    '',
    'Derived from canon JSON registries. DO NOT EDIT INDEPENDENTLY.',
    'Canonical sources: canon/provenance/{inventions,sources,claims}.json.',
    '',
    'Generated at: ' + BOOTSTRAP_TIMESTAMP,
    '',
    '---',
    ''
  ].join('\n');
}

export function writeInventionLedger(path: string): void {
  const lines: string[] = [];
  lines.push(mdHeader('Invention Ledger'));
  lines.push('Inventions (GSPL-INV-NNNN) currently registered in the canon.');
  lines.push('');
  lines.push('| ID | Canonical Name | Target | Disposition | Implementation Status |');
  lines.push('|----|----------------|--------|-------------|----------------------|');
  for (const inv of [...INVENTIONS].sort((a, b) => (a.id < b.id ? -1 : 1))) {
    lines.push('| ' + [inv.id, inv.canonicalName, inv.targetSubsystem, inv.disposition, inv.implementationStatus].join(' | ') + ' |');
  }
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, lines.join('\n'), 'utf-8');
}

export function writeProvenanceRegistry(path: string): void {
  const lines: string[] = [];
  lines.push(mdHeader('Provenance Registry'));
  lines.push('Source records (S-NNNN) referenced by canonical inventions.');
  lines.push('');
  lines.push('| sourceId | repositoryId | relativePath | sourceType | availability | verificationStatus |');
  lines.push('|----------|--------------|--------------|------------|--------------|---------------------|');
  for (const s of [...SOURCES].sort((a, b) => (a.sourceId < b.sourceId ? -1 : 1))) {
    lines.push('| ' + [s.sourceId, s.repositoryId, s.relativePath, s.sourceType, s.availability, s.verificationStatus].join(' | ') + ' |');
  }
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, lines.join('\n'), 'utf-8');
}

export function writeClaimsRegister(path: string): void {
  const lines: string[] = [];
  lines.push(mdHeader('Claims Register'));
  lines.push('Canonical claims (GSPL-CLAIM-NNNN). Eight-status taxonomy:');
  lines.push('');
  lines.push('PROVEN > IMPLEMENTED > PARTIALLY_IMPLEMENTED > PROTOTYPED > THEORETICAL > RESEARCH_REQUIRED > UNSUPPORTED > REFUTED.');
  lines.push('');
  lines.push('| claimId | status | statement (short) | relatedInventions |');
  lines.push('|---------|--------|-------------------|-------------------|');
  for (const c of [...CLAIMS].sort((a, b) => (a.claimId < b.claimId ? -1 : 1))) {
    const short = c.statement.length > 120 ? c.statement.slice(0, 117) + '...' : c.statement;
    const safe = short.replace(/\|/g, '\|');
    lines.push('| ' + [c.claimId, c.status, safe, c.relatedInventions.join(',')].join(' | ') + ' |');
  }
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, lines.join('\n'), 'utf-8');
}
