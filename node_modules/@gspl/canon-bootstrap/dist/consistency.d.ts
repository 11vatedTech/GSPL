/**
 * Consistency check: confirms JSON-id <-> MD-id alignment and that
 * the determinism invariant (byte-equality) holds between in-memory regen
 * and committed files.
 */
export interface ConsistencyReport {
    ok: boolean;
    mismatches: readonly string[];
    determinism: {
        inventionsChecksum: number;
        sourcesChecksum: number;
        claimsChecksum: number;
    };
}
export declare function checkLedgersVsJson(paths: {
    inventionsJson: string;
    sourcesJson: string;
    claimsJson: string;
    inventionLedger: string;
    provenanceRegistry: string;
    claimsRegister: string;
}): ConsistencyReport;
//# sourceMappingURL=consistency.d.ts.map