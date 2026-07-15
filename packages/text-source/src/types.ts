/**
 * text-source types — foundational source identity, positions, spans, diagnostics.
 * Prompt 3 §6 (source positions), §15 (source loader), §18 (diagnostic protocol).
 */
export type SourceId = string & { readonly __brand: 'SourceId' };

export interface SourcePosition {
  /** 0-indexed offset into the source text, measured in UTF-16 code units (matches JS string indexing). */
  readonly offset: number;
  /** 1-indexed line number. */
  readonly line: number;
  /** 1-indexed column number, measured in UTF-16 code units. */
  readonly column: number;
}

export interface SourceSpan {
  readonly sourceId: SourceId;
  /** Inclusive start offset in UTF-16 code units. */
  readonly start: number;
  /** Exclusive end offset in UTF-16 code units. */
  readonly end: number;
}

export type TriviaKind =
  | 'whitespace'
  | 'line-comment'
  | 'block-comment'
  | 'documentation-comment'
  | 'newline'
  | 'byte-order-mark';

export interface Trivia {
  readonly kind: TriviaKind;
  readonly text: string;
  readonly span: SourceSpan;
}

export type DiagnosticSeverity = 'error' | 'warning' | 'info';

export interface Diagnostic {
  readonly code: string;
  readonly message: string;
  readonly severity: DiagnosticSeverity;
  readonly span: SourceSpan;
  readonly category: string;
  readonly ruleId?: string;
  readonly phase: string;
  readonly related?: readonly DiagnosticRelated[];
}

export interface DiagnosticRelated {
  readonly message: string;
  readonly span: SourceSpan;
}

/** Diagnostic factory: build a typed diagnostic with required fields. */
export function makeDiagnostic(args: {
  code: string;
  message: string;
  severity: DiagnosticSeverity;
  span: SourceSpan;
  category: string;
  phase: string;
  ruleId?: string;
  related?: readonly DiagnosticRelated[];
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
  };
}
