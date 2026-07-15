/**
 * The 8-phase tick cycle per spec/03.
 *
 * The tick cycle is the deterministic run-time of GSPL's kernel. Every
 * canonical seed expansion, mutation, breeding, and projection operation is
 * modelled as a tick that traverses these 8 ordered phases:
 *
 *   1. intake    — receive the operation request and bound the seed
 *   2. validate  — apply the 8 invariants; halt on failure
 *   3. plan      — decide operator(s) and target contract(s)
 *   4. mutate    — apply typed gene operators
 *   5. execute   — run side-effecting components inside the effect budget
 *   6. reduce    — coalesce stochastic and parallel effects
 *   7. emit      — write the projection target bytes
 *   8. persist   — record lineage, hashes, sovereignty updates
 *
 * Tests pin TICK_PHASES to this exact ordering.
 */
export declare const TICK_PHASES: readonly ["intake", "validate", "plan", "mutate", "execute", "reduce", "emit", "persist"];
export type TickPhase = (typeof TICK_PHASES)[number];
export type TickOperationKind = 'grow' | 'mutate' | 'breed' | 'compose' | 'evolve' | 'export' | 'import' | 'validate';
export interface TickOperation {
    kind: TickOperationKind;
    engine?: string;
    [k: string]: unknown;
}
export interface TickError {
    phase: TickPhase;
    code: string;
    message: string;
}
export interface Tick {
    operation: TickOperation;
    phase_index: number;
    status: 'pending' | 'completed' | 'failed';
    error?: TickError;
    startedAt?: string;
    completedAt?: string;
}
/**
 * Open a new pending tick.
 */
export declare function startTick(operation: TickOperation): Tick;
/**
 * Mark a tick as completed (terminal).
 */
export declare function completeTick(tick: Tick): Tick;
/**
 * Mark a tick as failed at a specific phase, with a typed error.
 */
export declare function failTick(tick: Tick, phase: TickPhase, code: string, message: string): Tick;
//# sourceMappingURL=cycle.d.ts.map