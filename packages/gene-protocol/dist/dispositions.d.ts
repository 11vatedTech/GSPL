/** Dispositions of the 17 recovered gene types per Prompt 2 §6.2 */
import type { GeneTypeClassification } from './types.js';
export interface GeneDispositionRecord {
    geneType: string;
    classification: GeneTypeClassification;
    disposition: 'CORE' | 'LIBRARY' | 'RESEARCH' | 'SECURITY' | 'REDUNDANT' | 'ARCHIVED';
    rationale: string;
}
/**
 * Authoritative classification of the 17 recovered gene types.
 *
 * These were empirically derived in Prompt 1 from implementing 26 domain
 * engines. Prompt 2 classifies them per §6.2 criteria. None are removed
 * — founder inventions are preserved, formalized, relocated, or archived.
 */
export declare const RECOVERED_GENE_DISPOSITIONS: readonly GeneDispositionRecord[];
/** Look up the disposition of a recovered gene type */
export declare function getDisposition(geneType: string): GeneDispositionRecord | undefined;
export type GeneDisposition = GeneDispositionRecord['disposition'];
//# sourceMappingURL=dispositions.d.ts.map