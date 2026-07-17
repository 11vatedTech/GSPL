/**
 * Module resolver — logical path normalization, import resolution,
 * module graph construction, and cycle detection via Tarjan's SCC.
 * Prompt 3 §12.
 */
import * as path from 'node:path';
import { SourceDocument, makeDiagnostic, type Diagnostic } from '@gspl/text-source';
import type { ImportDeclNode } from './ast-types.js';
import { parseSource, DEFAULT_PARSE_OPTIONS, type ParseResult } from '@gspl/parser';
import { lowerToAst } from './ast-lowering.js';
import { type AstLoweringResult } from './ast-types.js';

// ============================================================
// SourceProvider
// ============================================================

export interface SourceProvider {
  loadSource(logicalPath: string): SourceLoadResult;
  isContained(logicalPath: string): boolean;
  normalizePath(rawPath: string, fromModule?: string): string;
}

export interface SourceLoadResult {
  readonly ok: boolean;
  readonly source?: SourceDocument;
  readonly diagnostics: readonly Diagnostic[];
}

// ============================================================
// MemorySourceProvider
// ============================================================

export interface MemorySourceEntry {
  readonly logicalPath: string;
  readonly text: string;
}

export class MemorySourceProvider implements SourceProvider {
  private readonly sources: ReadonlyMap<string, string>;
  private readonly root: string;

  constructor(entries: readonly MemorySourceEntry[], root = '/src/') {
    const map = new Map<string, string>();
    for (const e of entries) {
      map.set(this.normalizeKey(e.logicalPath), e.text);
    }
    this.sources = map;
    this.root = root;
  }

  private normalizeKey(p: string): string {
    let n = p.replace(/\\/g, '/');
    if (!n.startsWith('/')) n = '/' + n;
    if (n.endsWith('/') && n.length > 1) n = n.slice(0, -1);
    return n.toLowerCase();
  }

  normalizePath(rawPath: string, fromModule?: string): string {
    let p = rawPath.replace(/\\/g, '/');
    // Resolve relative paths from the importing module's directory
    if (p.startsWith('./') || p.startsWith('../')) {
      const fromDir = fromModule
        ? (fromModule.lastIndexOf('/') > 0 ? fromModule.slice(0, fromModule.lastIndexOf('/')) : '/')
        : '/';
      // Append relative to fromDir
      p = (fromDir.endsWith('/') ? fromDir : fromDir + '/') + p;
    }
    if (!p.startsWith('/')) p = '/' + p;
    const parts: string[] = [];
    for (const seg of p.split('/')) {
      if (seg === '..') { parts.pop(); }
      else if (seg !== '.' && seg !== '') { parts.push(seg); }
    }
    return '/' + parts.join('/');
  }

  loadSource(logicalPath: string): SourceLoadResult {
    const key = this.normalizeKey(logicalPath);
    const text = this.sources.get(key);
    if (text === undefined) {
      return {
        ok: false,
        diagnostics: [makeDiagnostic({
          code: 'GSPL-MODULE-NOT-FOUND',
          message: 'module not found: "' + logicalPath + '"',
          severity: 'error',
          span: { sourceId: 'src:resolver' as any, start: 0, end: 0 },
          category: 'module', phase: 'module', canonical: true,
        })],
      };
    }
    const source = SourceDocument.create(logicalPath, text);
    return { ok: true, source, diagnostics: [] };
  }

  isContained(logicalPath: string): boolean {
    const p = this.normalizePath(logicalPath);
    return p.startsWith(this.root) || p === '/';
  }
}

// ============================================================
// FileSystemSourceProvider
// ============================================================

export interface FileSystemSourceProviderOptions {
  readonly sourceRoot: string;
  readonly logicalRoot?: string;
  readonly allowedExtensions?: readonly string[];
}

export class FileSystemSourceProvider implements SourceProvider {
  private readonly sourceRoot: string;
  private readonly logicalRoot: string;
  private readonly allowedExtensions: readonly string[];
  private readonly realRoot: string;

  constructor(options: FileSystemSourceProviderOptions) {
    this.sourceRoot = path.resolve(options.sourceRoot);
    this.logicalRoot = options.logicalRoot ?? '/';
    this.allowedExtensions = options.allowedExtensions ?? ['.gspl'];
    try {
      const fs = require('node:fs');
      this.realRoot = fs.realpathSync(this.sourceRoot);
    } catch {
      this.realRoot = this.sourceRoot;
    }
  }

  normalizePath(rawPath: string, fromModule?: string): string {
    let p = rawPath.replace(/\\/g, '/');
    if (p.startsWith('./') || p.startsWith('../')) {
      const fromDir = fromModule ? path.posix.dirname(fromModule) : '/';
      p = path.posix.resolve(fromDir, p);
    }
    if (!p.startsWith('/')) p = '/' + p;
    return p;
  }

  private toFilesystemPath(logicalPath: string): string {
    const relative = logicalPath.startsWith('/') ? '.' + logicalPath : logicalPath;
    return path.resolve(this.sourceRoot, relative);
  }

  loadSource(logicalPath: string): SourceLoadResult {
    const diagnostics: Diagnostic[] = [];
    const absPath = this.toFilesystemPath(logicalPath);
    const fs = require('node:fs') as typeof import('node:fs');
    try {
      const real = fs.realpathSync(absPath);
      if (!real.startsWith(this.realRoot + path.sep) && real !== this.realRoot) {
        diagnostics.push(makeDiagnostic({
          code: 'GSPL-SOURCE-SYMLINK-ESCAPE',
          message: 'path escapes source root: "' + logicalPath + '"',
          severity: 'error',
          span: { sourceId: 'src:resolver' as any, start: 0, end: 0 },
          category: 'source', phase: 'source', canonical: true,
        }));
        return { ok: false, diagnostics };
      }
    } catch {
      diagnostics.push(makeDiagnostic({
        code: 'GSPL-MODULE-NOT-FOUND',
        message: 'module not found: "' + logicalPath + '"',
        severity: 'error',
        span: { sourceId: 'src:resolver' as any, start: 0, end: 0 },
        category: 'module', phase: 'module', canonical: true,
      }));
      return { ok: false, diagnostics };
    }
    const ext = path.extname(absPath);
    if (!this.allowedExtensions.includes(ext) && !this.allowedExtensions.includes('*')) {
      diagnostics.push(makeDiagnostic({
        code: 'GSPL-MODULE-INVALID-EXTENSION',
        message: 'invalid extension "' + ext + '" for module "' + logicalPath + '"',
        severity: 'error',
        span: { sourceId: 'src:resolver' as any, start: 0, end: 0 },
        category: 'module', phase: 'module', canonical: true,
      }));
      return { ok: false, diagnostics };
    }
    try {
      const rawBytes = fs.readFileSync(absPath);
      const text = rawBytes.toString('utf-8');
      const source = SourceDocument.fromParts({
        logicalPath,
        rawBytes: new Uint8Array(rawBytes.buffer, rawBytes.byteOffset, rawBytes.byteLength),
        text,
        hadBom: false,
      });
      return { ok: true, source, diagnostics: [] };
    } catch {
      diagnostics.push(makeDiagnostic({
        code: 'GSPL-MODULE-NOT-FOUND',
        message: 'module not found: "' + logicalPath + '"',
        severity: 'error',
        span: { sourceId: 'src:resolver' as any, start: 0, end: 0 },
        category: 'module', phase: 'module', canonical: true,
      }));
      return { ok: false, diagnostics };
    }
  }

  isContained(logicalPath: string): boolean {
    const absPath = this.toFilesystemPath(logicalPath);
    try {
      const fs = require('node:fs');
      const real = fs.realpathSync(absPath);
      return real.startsWith(this.realRoot + path.sep) || real === this.realRoot;
    } catch { return false; }
  }
}

// ============================================================
// Module types
// ============================================================

export interface ModuleIdentity {
  readonly logicalPath: string;
  readonly sourceId: string;
}

export interface ResolvedImport {
  readonly importNode: ImportDeclNode;
  readonly importPath: string;
  readonly resolvedPath: string;
  readonly alias: string | undefined;
}

export interface ModuleNode {
  readonly identity: ModuleIdentity;
  readonly source: SourceDocument;
  readonly parseResult: ParseResult;
  readonly astResult: AstLoweringResult;
  readonly imports: readonly ResolvedImport[];
  readonly exports: readonly string[];
}

export interface ModuleGraph {
  readonly modules: readonly ModuleNode[];
  readonly adjacency: ReadonlyMap<string, readonly string[]>;
  readonly reverseAdjacency: ReadonlyMap<string, readonly string[]>;
  readonly cycles: readonly ModuleCycle[];
  readonly topologicalOrder: readonly string[];
  readonly isDag: boolean;
}

export interface ModuleCycle {
  readonly members: readonly string[];
  readonly edges: readonly { from: string; to: string }[];
}

export interface ModuleResolutionResult {
  readonly graph: ModuleGraph;
  readonly diagnostics: readonly Diagnostic[];
}

export interface ModuleResolverOptions {
  readonly languageVersion: string;
  readonly maxModules: number;
  readonly maxImportDepth: number;
}

// ============================================================
// ModuleResolver
// ============================================================

const DEFAULT_RESOLVER_OPTIONS: ModuleResolverOptions = {
  languageVersion: 'gspl-text/1.0',
  maxModules: 500,
  maxImportDepth: 64,
};

export class ModuleResolver {
  readonly options: ModuleResolverOptions;

  constructor(options?: Partial<ModuleResolverOptions>) {
    this.options = { ...DEFAULT_RESOLVER_OPTIONS, ...options };
  }

  resolveImport(
    importDecl: ImportDeclNode,
    fromModulePath: string,
    provider: SourceProvider,
  ): { resolved: ResolvedImport; diagnostics: Diagnostic[] } {
    const resolvedPath = provider.normalizePath(importDecl.path, fromModulePath);
    const resolved: ResolvedImport = {
      importNode: importDecl,
      importPath: importDecl.path,
      resolvedPath,
      alias: importDecl.alias,
    };
    return { resolved, diagnostics: [] };
  }

  resolveAll(
    entryModules: readonly { source: SourceDocument; logicalPath: string }[],
    provider: SourceProvider,
  ): ModuleResolutionResult {
    const diagnostics: Diagnostic[] = [];
    const moduleMap = new Map<string, ModuleNode>();
    const queue: { source: SourceDocument; logicalPath: string }[] = [...entryModules];
    const visited = new Set<string>();

    while (queue.length > 0 && moduleMap.size < this.options.maxModules) {
      const entry = queue.shift()!;
      const normPath = provider.normalizePath(entry.logicalPath);

      if (visited.has(normPath)) continue;
      visited.add(normPath);

      const parseResult = parseSource(entry.source, { ...DEFAULT_PARSE_OPTIONS, languageVersion: this.options.languageVersion });
      const astResult = lowerToAst(parseResult.root, this.options.languageVersion, parseResult.diagnostics);

      const resolvedImports: ResolvedImport[] = [];

      for (const imp of astResult.program.imports) {
        const { resolved } = this.resolveImport(imp, normPath, provider);
        resolvedImports.push(resolved);

        if (!visited.has(resolved.resolvedPath)) {
          const loadResult = provider.loadSource(resolved.resolvedPath);
          if (loadResult.ok && loadResult.source) {
            queue.push({ source: loadResult.source, logicalPath: resolved.resolvedPath });
          } else {
            diagnostics.push(...loadResult.diagnostics);
          }
        }
      }

      const exportNames: string[] = [];
      for (const exp of astResult.program.exports) {
        exportNames.push(...exp.names);
      }

      moduleMap.set(normPath, {
        identity: { logicalPath: normPath, sourceId: entry.source.id as string },
        source: entry.source,
        parseResult,
        astResult,
        imports: resolvedImports,
        exports: exportNames,
      });
    }

    if (moduleMap.size >= this.options.maxModules && queue.length > 0) {
      diagnostics.push(makeDiagnostic({
        code: 'GSPL-MODULE-TOO-MANY',
        message: 'module limit exceeded (' + this.options.maxModules + ')',
        severity: 'error',
        span: { sourceId: 'src:resolver' as any, start: 0, end: 0 },
        category: 'module', phase: 'module', canonical: true,
      }));
    }

    const adjacency = new Map<string, string[]>();
    const reverseAdjacency = new Map<string, string[]>();

    for (const [lp, mod] of moduleMap) {
      adjacency.set(lp, mod.imports.map(i => i.resolvedPath));
    }
    for (const mod of moduleMap.values()) {
      for (const imp of mod.imports) {
        if (!adjacency.has(imp.resolvedPath)) {
          adjacency.set(imp.resolvedPath, []);
        }
      }
    }

    for (const [from, tos] of adjacency) {
      if (!reverseAdjacency.has(from)) reverseAdjacency.set(from, []);
      for (const to of tos) {
        const rev = reverseAdjacency.get(to) ?? [];
        if (!rev.includes(from)) rev.push(from);
        reverseAdjacency.set(to, rev);
      }
    }

    const cycles = detectCyclesTarjan(adjacency);
    const allDiags = [...diagnostics];

    for (const cycle of cycles) {
      allDiags.push(makeDiagnostic({
        code: 'GSPL-MODULE-CYCLE',
        message: 'circular import: ' + cycle.members.join(' -> '),
        severity: 'error',
        span: { sourceId: 'src:resolver' as any, start: 0, end: 0 },
        category: 'module', phase: 'module', canonical: true,
      }));
    }

    // Reverse: Kahn's outputs dependents-before-imports; module order needs dependencies-first
    const topo = cycles.length === 0
      ? computeTopologicalOrder(adjacency, [...moduleMap.keys()]).reverse()
      : [];

    allDiags.sort((a, b) => a.code.localeCompare(b.code));

    return {
      graph: {
        modules: [...moduleMap.values()],
        adjacency,
        reverseAdjacency,
        cycles,
        topologicalOrder: topo,
        isDag: cycles.length === 0,
      },
      diagnostics: allDiags,
    };
  }
}

// ============================================================
// Tarjan's SCC
// ============================================================

function detectCyclesTarjan(
  adjacency: ReadonlyMap<string, readonly string[]>,
): ModuleCycle[] {
  const cycles: ModuleCycle[] = [];
  const index = new Map<string, number>();
  const lowlink = new Map<string, number>();
  const onStack = new Set<string>();
  const stack: string[] = [];
  let idx = 0;

  function strongconnect(v: string): void {
    index.set(v, idx);
    lowlink.set(v, idx);
    idx++;
    stack.push(v);
    onStack.add(v);

    const neighbors = adjacency.get(v) ?? [];
    for (const w of neighbors) {
      if (!index.has(w)) {
        strongconnect(w);
        lowlink.set(v, Math.min(lowlink.get(v)!, lowlink.get(w) ?? Infinity));
      } else if (onStack.has(w)) {
        lowlink.set(v, Math.min(lowlink.get(v)!, index.get(w) ?? Infinity));
      }
    }

    if (lowlink.get(v) === index.get(v)) {
      const component: string[] = [];
      let w: string;
      do {
        w = stack.pop()!;
        onStack.delete(w);
        component.push(w);
      } while (w !== v);

      if (component.length > 1) {
        const edges: { from: string; to: string }[] = [];
        const memberSet = new Set(component);
        for (const m of component) {
          const neighbors = adjacency.get(m) ?? [];
          for (const n of neighbors) {
            if (memberSet.has(n)) {
              edges.push({ from: m, to: n });
            }
          }
        }
        cycles.push({ members: component, edges });
      } else {
        const neighbors = adjacency.get(component[0]) ?? [];
        if (neighbors.includes(component[0])) {
          cycles.push({
            members: component,
            edges: [{ from: component[0], to: component[0] }],
          });
        }
      }
    }
  }

  const vertices = [...adjacency.keys()].sort();
  for (const v of vertices) {
    if (!index.has(v)) strongconnect(v);
  }

  return cycles;
}

// ============================================================
// Topological order (Kahn)
// ============================================================

function computeTopologicalOrder(
  adjacency: ReadonlyMap<string, readonly string[]>,
  vertices: readonly string[],
): string[] {
  const inDegree = new Map<string, number>();
  for (const v of vertices) inDegree.set(v, 0);
  for (const [, tos] of adjacency) {
    for (const to of tos) {
      inDegree.set(to, (inDegree.get(to) ?? 0) + 1);
    }
  }

  const queue: string[] = [];
  for (const [v, deg] of inDegree) {
    if (deg === 0 && vertices.includes(v)) queue.push(v);
  }
  queue.sort();

  const result: string[] = [];
  while (queue.length > 0) {
    const v = queue.shift()!;
    result.push(v);
    const neighbors = adjacency.get(v) ?? [];
    for (const n of [...neighbors].sort()) {
      const newDeg = (inDegree.get(n) ?? 0) - 1;
      inDegree.set(n, newDeg);
      if (newDeg === 0) queue.push(n);
    }
  }
  return result;
}
