export interface CleanSourceResult {
    ok: boolean;
    issues: string[];
}
export declare function checkCleanSource(repoRoot: string): CleanSourceResult;
export declare function main(argv: readonly string[]): Promise<number>;
//# sourceMappingURL=check-clean-source.d.ts.map