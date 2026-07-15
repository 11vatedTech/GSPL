/**
 * ID validation for canonical inventions, decisions, sources, and 8 status taxonomy.
 *
 * Locked canonical id formats:
 *   - Inventions:       GSPL-INV-NNNN
 *   - Architecture:     GSPL-ARCH-NNNN
 *   - Claims:           GSPL-CLAIM-NNNN
 *   - Sources:          S-NNNN
 *   - Provenance:       gspl.provenance-report@<sha256-prefix>
 */
export declare function isInventionId(id: string): boolean;
export declare function inventionNumber(id: string): number | null;
export declare function isArchitectureId(id: string): boolean;
export declare function archNumber(id: string): number | null;
export declare function isClaimId(id: string): boolean;
export declare function isSourceId(id: string): boolean;
export declare function isValidDisposition(s: string): boolean;
export declare function isValidConfidence(s: string): boolean;
export declare function isValidTarget(s: string): boolean;
export declare function isValidClaimStatus(s: string): boolean;
export declare function isValidSourceType(s: string): boolean;
//# sourceMappingURL=ids.d.ts.map