# GSPL Source Model

**Version**: gspl-text/1.0 | **Status**: Implemented | **Prompt 3 § source model**

## Source Identity

Every `.gspl` source file produces a deterministic `SourceId` derived from its content. The `SourceSnapshotId` identifies a specific immutable snapshot. Same content → same IDs across processes.

## Strict UTF-8

Source files must be valid UTF-8. Malformed byte sequences produce `GSPL-SOURCE-MALFORMED-UTF8` diagnostics. BOM handling: UTF-8 BOM (EF BB BF) is skipped at file start; UTF-16 BOMs are rejected.

## Newline Forms

Supported line terminators: LF (U+000A), CR (U+000D), CRLF (U+000D U+000A), U+2028, U+2029. All are normalized during lexing.

## Coordinate System

UTF-16 code unit offsets. Line/column conversion is deterministic. Source spans are `(sourceId, start, end)` with start ≤ end.

## Filesystem Containment

Source roots enforce filesystem containment. Symlink escape attempts produce `GSPL-SOURCE-SYMLINK-ESCAPE`. No absolute host paths in user-facing diagnostics.

## Source Limits

| Limit | Default | Description |
|-------|---------|-------------|
| maxSourceBytes | 10MB | Maximum source file byte size |
| maxDecodedCodeUnits | 10M | Maximum UTF-16 code units after decoding |
| maxLines | 1M | Maximum line count |
| maxLineLength | 10K | Maximum code units per line |

## Diagnostics

All source-load failures produce structured `GSPL-SOURCE-*` diagnostics with:
- stable code
- severity (error/warning)
- primary source span
- human-readable message
- canonical flag
