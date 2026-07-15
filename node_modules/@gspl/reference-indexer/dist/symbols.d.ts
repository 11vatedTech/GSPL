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
export declare function canExtractSymbols(ext: string): boolean;
export declare function extractSymbols(content: string, language: string): SymbolExtractionResult;
//# sourceMappingURL=symbols.d.ts.map