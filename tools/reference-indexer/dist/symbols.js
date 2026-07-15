/**
 * Lexical symbol indexer.
 * Section 5 - extracts exports, functions, classes, interfaces, types, enums.
 */
const SYMBOL_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs']);
export function canExtractSymbols(ext) {
    return SYMBOL_EXTENSIONS.has(ext.toLowerCase());
}
export function extractSymbols(content, language) {
    if (language !== 'TypeScript' && language !== 'JavaScript')
        return { symbols: [], status: 'not-indexed' };
    const stripped = stripComments(content);
    const lines = stripped.split('\n');
    const symbols = [];
    const seen = new Set();
    const patterns = [
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
        let match;
        while ((match = regex.exec(stripped)) !== null) {
            if (kind === 'export-reexport') {
                const names = match[1].split(',').map((n) => n.trim()).filter(Boolean);
                for (const name of names) {
                    const key = kind + ':' + name;
                    if (seen.has(key))
                        continue;
                    seen.add(key);
                    symbols.push({ name, kind, line: lineNumber(lines, match.index), exported: true });
                }
            }
            else {
                const name = match[1];
                const key = kind + ':' + name;
                if (seen.has(key))
                    continue;
                seen.add(key);
                symbols.push({ name, kind, line: lineNumber(lines, match.index), exported: match[0].startsWith('export') });
            }
        }
    }
    symbols.sort((a, b) => a.line - b.line || a.name.localeCompare(b.name));
    return { symbols, status: 'lexical-fallback' };
}
function lineNumber(lines, charIndex) {
    let pos = 0;
    for (let i = 0; i < lines.length; i++) {
        pos += lines[i].length + 1;
        if (pos > charIndex)
            return i + 1;
    }
    return lines.length;
}
function stripComments(content) {
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
//# sourceMappingURL=symbols.js.map