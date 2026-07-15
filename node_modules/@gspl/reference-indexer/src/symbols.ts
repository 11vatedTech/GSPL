/**
 * Lexical symbol indexer.
 * Section 5 - extracts exports, functions, classes, interfaces, types, enums.
 */

export interface SymbolRecord {
  name: string;
  kind: 'function' | 'class' | 'interface' | 'type' | 'enum' | 'const' | 'let' | 'var' | 'export-reexport';
  line: number;
  exported: boolean;
}

export interface SymbolExtractionResult {
  symbols: SymbolRecord[];
  status: 'indexed' | 'lexical-fallback' | 'not-indexed';
}

const SYMBOL_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs']);

export function canExtractSymbols(ext: string): boolean {
  return SYMBOL_EXTENSIONS.has(ext.toLowerCase());
}

export function extractSymbols(content: string, language: string): SymbolExtractionResult {
  if (language !== 'TypeScript' && language !== 'JavaScript') return { symbols: [], status: 'not-indexed' };
  const stripped = stripComments(content);
  const lines = stripped.split('\n');
  const symbols: SymbolRecord[] = [];
  const seen = new Set<string>();
  const patterns: { regex: RegExp; kind: SymbolRecord['kind'] }[] = [
    { regex: /(?:export\s+(?:default\s+)?)?function\s+(\w+)/g, kind: 'function' },
    { regex: /(?:export\s+(?:default\s+)?)?class\s+(\w+)/g, kind: 'class' },
    { regex: /(?:export\s+)?interface\s+(\w+)/g, kind: 'interface' },
    { regex: /(?:export\s+)?type\s+(\w+)\s*=/g, kind: 'type' },
    { regex: /(?:export\s+)?enum\s+(\w+)/g, kind: 'enum' },
    { regex: /(?:export\s+)?const\s+(\w+)\s*[:=]/g, kind: 'const' },
    { regex: /(?:export\s+)?let\s+(\w+)\s*[:=]/g, kind: 'let' },
    { regex: /export\s*\{\s*([^}]+)\}\s*from/g, kind: 'export-reexport' },
  ];
  for (const { regex, kind } of patterns) {
    regex.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = regex.exec(stripped)) !== null) {
      if (kind === 'export-reexport') {
        const names = match[1].split(',').map((n) => n.trim()).filter(Boolean);
        for (const name of names) {
          const key = kind + ':' + name;
          if (seen.has(key)) continue;
          seen.add(key);
          symbols.push({ name, kind, line: lineNumber(lines, match.index), exported: true });
        }
      } else {
        const name = match[1];
        const key = kind + ':' + name;
        if (seen.has(key)) continue;
        seen.add(key);
        symbols.push({ name, kind, line: lineNumber(lines, match.index), exported: match[0].startsWith('export') });
      }
    }
  }
  symbols.sort((a, b) => a.line - b.line || a.name.localeCompare(b.name));
  return { symbols, status: 'lexical-fallback' };
}

function lineNumber(lines: string[], charIndex: number): number {
  let pos = 0;
  for (let i = 0; i < lines.length; i++) { pos += lines[i].length + 1; if (pos > charIndex) return i + 1; }
  return lines.length;
}

function stripComments(content: string): string {
  // Block comments
  let r = content.replace(/\/\*[\s\S]*?\*\//g, ' ');
  // Line comments
  r = r.replace(/\/\/.*$/gm, '');
  // Template literals
  r = r.replace(/`(?:[^`\\]|\\.)*`/g, '``');
  // Single-quoted strings
  r = r.replace(/'(?:[^'\\]|\\.)*'/g, "''");
  // Double-quoted strings
  r = r.replace(/"(?:[^"\\]|\\.)*"/g, '""');
  return r;
}
