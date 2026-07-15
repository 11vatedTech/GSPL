export interface CleanOptions {
    repoRoot: string;
    dryRun: boolean;
    maxDepth?: number;
}
export declare function clean(opts: CleanOptions): {
    deleted: string[];
    errors: string[];
};
export declare function main(argv: readonly string[]): Promise<number>;
//# sourceMappingURL=clean.d.ts.map