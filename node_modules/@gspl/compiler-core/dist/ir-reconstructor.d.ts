/** IR to Seed Reconstruction - independent, no original seed */
import type { CanonicalSeed } from "@gspl/seed-format";
import type { GeneTypeRegistry } from "@gspl/gene-protocol";
export interface ReconstructionContext {
    readonly geneRegistry: GeneTypeRegistry;
    readonly compilerVersion: string;
    readonly canonVersion: string;
    readonly limits: {
        readonly maxGenes: number;
        readonly maxConstraints: number;
        readonly maxDependencies: number;
    };
}
export interface IrReconstructionResult {
    ok: boolean;
    seed: CanonicalSeed;
    errors: string[];
    warnings: string[];
}
export declare function reconstructSeedFromIr(graph: any, ctx: any): {
    ok: boolean;
    seed: CanonicalSeed;
    errors: any[];
    warnings: never[];
};
export declare function verifyIndependentReconstruction(originalBytes: Uint8Array, graph: any, ctx: any): {
    ok: boolean;
    originalBytes: Uint8Array<ArrayBufferLike>;
    reconstructedBytes: Uint8Array<ArrayBufferLike>;
    bytesMatch: boolean;
    errors: any[];
    fieldErrors: string[];
};
//# sourceMappingURL=ir-reconstructor.d.ts.map