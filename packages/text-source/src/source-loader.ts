/**
 * SourceLoader — explicit source loading interface.
 * Prompt 3 §15 (module and source model): no parser may read files directly;
 * all source loading goes through this interface.
 */
import { readFileSync, existsSync } from 'node:fs';
import { resolve, isAbsolute, sep } from 'node:path';
import { SourceDocument } from './source-document.js';

export interface ISourceLoader {
  /** Load a source by its logical path. */
  load(logicalPath: string): Promise<SourceDocument>;
  /** Synchronous variant. Throws if the loader is async-only. */
  loadSync(logicalPath: string): SourceDocument;
}

/** In-memory source loader for tests and tooling. Deterministic. */
export class InMemorySourceLoader implements ISourceLoader {
  private readonly files = new Map<string, SourceDocument>();

  /** Provide a source by logical path and text. Last write wins. */
  provide(logicalPath: string, text: string): SourceDocument {
    const doc = SourceDocument.create(logicalPath, text);
    this.files.set(logicalPath, doc);
    return doc;
  }

  has(logicalPath: string): boolean {
    return this.files.has(logicalPath);
  }

  async load(logicalPath: string): Promise<SourceDocument> {
    return this.loadSync(logicalPath);
  }

  loadSync(logicalPath: string): SourceDocument {
    const doc = this.files.get(logicalPath);
    if (!doc) throw new Error(`Source not found: ${logicalPath}`);
    return doc;
  }
}

/**
 * Filesystem source loader with path security.
 * Prompt 3 §7, §15: reject path traversal, absolute paths, UNC paths, symlink escapes.
 */
export class FilesystemSourceLoader implements ISourceLoader {
  constructor(private readonly rootDir: string) {
    if (!isAbsolute(rootDir)) throw new Error('FilesystemSourceLoader root must be absolute');
  }

  private resolveSafe(logicalPath: string): string {
    // Reject absolute, UNC, drive-letter paths.
    // Check UNC BEFORE absolute: //server/share starts with /, but is more
    // specifically a UNC path and should be reported as such.
    if (logicalPath.startsWith('//') || logicalPath.startsWith('\\\\')) {
      throw new Error(`UNC import path forbidden: ${logicalPath}`);
    }
    if (logicalPath.startsWith('/') || logicalPath.startsWith('\\')) {
      throw new Error(`Absolute import path forbidden: ${logicalPath}`);
    }
    if (/^[A-Za-z]:[\\/]/.test(logicalPath)) {
      throw new Error(`Drive-letter import path forbidden: ${logicalPath}`);
    }
    // Reject traversal segments.
    const segments = logicalPath.split(/[\\/]/);
    for (const seg of segments) {
      if (seg === '..' || seg === '.') {
        throw new Error(`Path traversal forbidden: ${logicalPath}`);
      }
    }
    const abs = resolve(this.rootDir, logicalPath);
    // Reject escape outside rootDir.
    const root = resolve(this.rootDir);
    if (abs !== root && !abs.startsWith(root + sep)) {
      throw new Error(`Path escapes root: ${logicalPath}`);
    }
    return abs;
  }

  async load(logicalPath: string): Promise<SourceDocument> {
    return this.loadSync(logicalPath);
  }

  loadSync(logicalPath: string): SourceDocument {
    const abs = this.resolveSafe(logicalPath);
    if (!existsSync(abs)) throw new Error(`Source file not found: ${abs}`);
    const text = readFileSync(abs, 'utf8');
    return SourceDocument.create(logicalPath, text);
  }
}
