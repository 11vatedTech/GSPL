import { RECOVERED_GENE_DISPOSITIONS } from './dispositions.js';
export { RECOVERED_GENE_DISPOSITIONS };
export const GENE_TYPE_CLASSIFICATIONS = [
    'FUNDAMENTAL_VALUE_KIND',
    'COMPOSITE_STRUCTURE',
    'GRAPH_STRUCTURE',
    'DOMAIN_SPECIFIC_LIBRARY_TYPE',
    'OPERATOR_OR_RULE',
    'SECURITY_PRIMITIVE',
    'ANNOTATION',
    'METAPHOR_WITHOUT_DISTINCT_SEMANTICS',
    'RESEARCH_ONLY',
];
export function classifyGeneType(geneType) {
    const record = RECOVERED_GENE_DISPOSITIONS.find(d => d.geneType === geneType);
    return record?.classification ?? 'RESEARCH_ONLY';
}
export function isFundamentalValueKind(geneType) {
    return classifyGeneType(geneType) === 'FUNDAMENTAL_VALUE_KIND';
}
export function isCompositeStructure(geneType) {
    return classifyGeneType(geneType) === 'COMPOSITE_STRUCTURE';
}
export function isGraphStructure(geneType) {
    return classifyGeneType(geneType) === 'GRAPH_STRUCTURE';
}
export function isDomainSpecificLibrary(geneType) {
    return classifyGeneType(geneType) === 'DOMAIN_SPECIFIC_LIBRARY_TYPE';
}
export function isSecurityPrimitive(geneType) {
    return classifyGeneType(geneType) === 'SECURITY_PRIMITIVE';
}
export function isOperatorOrRule(geneType) {
    return classifyGeneType(geneType) === 'OPERATOR_OR_RULE';
}
// ── Immutable Gene Type Registry ──
class ImmutableGeneRegistry {
    version;
    types;
    constructor(config) {
        this.version = config.schemaVersion;
        const map = new Map();
        for (const t of config.types) {
            if (map.has(t.typeId)) {
                throw new Error('Duplicate gene type: ' + t.typeId);
            }
            map.set(t.typeId, t);
        }
        this.types = map;
    }
    get(typeId) {
        return this.types.get(typeId);
    }
    has(typeId) {
        return this.types.has(typeId);
    }
    list() {
        return [...this.types.values()];
    }
    listByClassification(c) {
        return this.list().filter(t => t.classification === c);
    }
}
export function createImmutableRegistry(config) {
    return new ImmutableGeneRegistry(config);
}
export function validateGeneAgainstRegistry(geneType, value, registry) {
    const descriptor = registry.get(geneType);
    if (!descriptor) {
        return { ok: false, errors: ['Unknown gene type: ' + geneType] };
    }
    const result = descriptor.validate(value);
    if (result.ok)
        return { ok: true, errors: [] };
    return { ok: false, errors: (result.errors ?? []).map(e => e.code + ': ' + e.message) };
}
//# sourceMappingURL=registry.js.map