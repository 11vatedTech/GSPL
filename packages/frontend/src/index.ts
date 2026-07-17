/**
 * @gspl/frontend — typed AST, CST→AST lowering, module resolver,
 * binding, analysis, canonical lowering.
 * Prompt 3 §11–§17.
 */
export * from './ast-types.js';
export * from './ast-lowering.js';
export * from './module-resolver.js';
export * from './binding.js';
export * from './type-analysis.js';

export * from "./authoring.js";
export * from "./canonical-lowering.js";
export * from "./ir-lowering.js";
export * from "./diagnostic-registry.js";
export * from "./provenance.js";
export * from "./formatter.js";
