import type { GeneTypeClassification, GeneTypeRegistry, ImmutableGeneRegistryConfig } from './types.js';
import { RECOVERED_GENE_DISPOSITIONS } from './dispositions.js';
export { RECOVERED_GENE_DISPOSITIONS };
export declare const GENE_TYPE_CLASSIFICATIONS: readonly GeneTypeClassification[];
export declare function classifyGeneType(geneType: string): GeneTypeClassification;
export declare function isFundamentalValueKind(geneType: string): boolean;
export declare function isCompositeStructure(geneType: string): boolean;
export declare function isGraphStructure(geneType: string): boolean;
export declare function isDomainSpecificLibrary(geneType: string): boolean;
export declare function isSecurityPrimitive(geneType: string): boolean;
export declare function isOperatorOrRule(geneType: string): boolean;
export declare function createImmutableRegistry(config: ImmutableGeneRegistryConfig): GeneTypeRegistry;
export interface GeneRegistryValidationResult {
    ok: boolean;
    errors: string[];
}
export declare function validateGeneAgainstRegistry(geneType: string, value: unknown, registry: GeneTypeRegistry): GeneRegistryValidationResult;
//# sourceMappingURL=registry.d.ts.map