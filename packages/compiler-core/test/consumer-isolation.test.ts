// Consumer isolation test (Prompt 2 §2).
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

describe('consumer isolation (Prompt 2 §2)', () => {
  it('consumer source imports from subpath only (not the full barrel)', () => {
    const src = readFileSync('scripts/restart-consumer.mts', 'utf8');
    // Must NOT import the full @gspl/compiler-core barrel
    expect(src).not.toMatch(/from\s+['"]@gspl\/compiler-core['"]/);
    // Must NOT import fixtures directly
    expect(src).not.toMatch(/from\s+['"](?:\.\.\/|\.\/)packages\/compiler-core\/src\/fixtures/);
    // Must NOT import the producer
    expect(src).not.toMatch(/restart-producer/);
    // MUST import from the reconstruction subpath
    expect(src).toMatch(/from\s+['"]@gspl\/compiler-core\/reconstruction['"]/);
  });
  it('reconstruction subpath barrel does not re-export fixtures', () => {
    const barrel = readFileSync('packages/compiler-core/src/reconstruction/index.ts', 'utf8');
    expect(barrel).not.toMatch(/fixtures/);
  });
  it('createReconstructionContext uses gene-protocol (not compiler-core pipeline)', () => {
    const ctx = readFileSync('packages/compiler-core/src/reconstruction/context.ts', 'utf8');
    expect(ctx).toMatch(/from\s+['"]@gspl\/gene-protocol['"]/);
    expect(ctx).not.toMatch(/from\s+['"]\.\/pipeline\.js['"]/);
    expect(ctx).not.toMatch(/fixtures/);
  });
});
