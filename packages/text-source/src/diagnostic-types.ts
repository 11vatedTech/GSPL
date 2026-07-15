/**
 * Diagnostic types — shared across text-source, lexer, parser, and downstream phases.
 * Prompt 3 §10, §18.
 */
import type { SourceSpan, DiagnosticSeverity } from './types.js';

export interface Diagnostic {
  readonly code: string;
  readonly message: string;
  readonly severity: DiagnosticSeverity;
  readonly span: SourceSpan;
  readonly category: string;
  readonly ruleId?: string;
  readonly phase: string;
  readonly related?: readonly DiagnosticRelated[];
  readonly suggestion?: string;
  readonly canonical: boolean;
}

export interface DiagnosticRelated {
  readonly message: string;
  readonly span: SourceSpan;
}

export function makeDiagnostic(args: {
  code: string;
  message: string;
  severity: DiagnosticSeverity;
  span: SourceSpan;
  category: string;
  phase: string;
  ruleId?: string;
  related?: readonly DiagnosticRelated[];
  suggestion?: string;
  canonical?: boolean;
}): Diagnostic {
  return {
    code: args.code,
    message: args.message,
    severity: args.severity,
    span: args.span,
    category: args.category,
    phase: args.phase,
    ruleId: args.ruleId,
    related: args.related,
    suggestion: args.suggestion,
    canonical: args.canonical ?? true,
  };
}
