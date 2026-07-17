# GSPL Module System

**Version**: gspl-text/1.0 | **Status**: Implemented | **Prompt 3 §12**

## Resolution

Module resolution is deterministic. Logical paths are normalized. Import cycles are detected via strongly connected components. Package-root containment is enforced.

## Commands

```gspl
import "path/to/module"
import "path" as alias
export name1, name2
```

## Graph

ModuleGraph provides deterministic module ordering, dependency tracking, and snapshot identity for incremental compilation readiness.
