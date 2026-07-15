/**
 * Built-in gene type descriptors with lowerToIr / liftFromIr
 */
import type { GeneTypeDescriptor, GeneTypeRegistry } from './types.js';
export declare const SCALAR_DESCRIPTOR: GeneTypeDescriptor<number>;
export declare const CATEGORICAL_DESCRIPTOR: GeneTypeDescriptor<unknown>;
export declare const SYMBOLIC_DESCRIPTOR: GeneTypeDescriptor<unknown>;
export declare const VECTOR_DESCRIPTOR: GeneTypeDescriptor<unknown>;
export declare const TEMPORAL_DESCRIPTOR: GeneTypeDescriptor<unknown>;
export declare const DIMENSIONAL_DESCRIPTOR: GeneTypeDescriptor<unknown>;
export declare const EXPRESSION_DESCRIPTOR: GeneTypeDescriptor<unknown>;
export declare const REGULATORY_DESCRIPTOR: GeneTypeDescriptor<unknown>;
export declare const TOPOLOGY_DESCRIPTOR: GeneTypeDescriptor<unknown>;
export declare const STRUCT_DESCRIPTOR: GeneTypeDescriptor<Record<string, unknown>>;
export declare const ARRAY_DESCRIPTOR: GeneTypeDescriptor<unknown[]>;
export declare const GRAPH_DESCRIPTOR: GeneTypeDescriptor<{
    nodes?: string[];
    edges?: [string, string, string][];
}>;
export declare const FIELD_DESCRIPTOR: GeneTypeDescriptor<unknown>;
export declare const QUANTUM_DESCRIPTOR: GeneTypeDescriptor<unknown>;
export declare const GEMATRIA_DESCRIPTOR: GeneTypeDescriptor<unknown>;
export declare const RESONANCE_DESCRIPTOR: GeneTypeDescriptor<unknown>;
export declare const SOVEREIGNTY_DESCRIPTOR: GeneTypeDescriptor;
export declare const CORE_GENE_DESCRIPTORS: GeneTypeDescriptor[];
export declare const ALL_GENE_DESCRIPTORS: GeneTypeDescriptor[];
export declare function createStandardGeneRegistry(): GeneTypeRegistry;
//# sourceMappingURL=defaults.d.ts.map