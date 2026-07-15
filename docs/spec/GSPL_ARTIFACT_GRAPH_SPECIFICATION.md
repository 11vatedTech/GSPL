# GSPL Artifact Graph Specification

**Version:** 1.0 | **Schema:** gspl.artifact-graph v1.0

## 1. Normative Rules

**GSPL-ART-001:** Every artifact MUST have a stable ID and canonical path.
**GSPL-ART-002:** Every artifact MUST include a content hash.
**GSPL-ART-003:** Origin provenance (originating IR nodes, operations) MUST be recorded.
**GSPL-ART-004:** Artifact graph metadata MUST report actual counts and byte sizes.
**GSPL-ART-005:** An empty artifact graph for a nonempty seed MUST produce a warning diagnostic (GSPL-PIPE-EMPTY-ARTIFACT-GRAPH).
**GSPL-ART-006:** No untrusted input path may escape the logical artifact root (path traversal protection).

## 2. Artifact Kinds

source-file, module, package, asset, media-stream, scene, configuration, test, documentation, metadata, binary-blob, interactive-artifact, test-fixture

## 3. Implementation

- Package: @gspl/compiler-core
- Schema: src/artifact-graph.ts
- Generator: src/pipeline.ts (stagePlanToArtifact)
