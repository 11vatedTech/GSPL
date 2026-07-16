// packages/compiler-core/test/audit-loader.mjs — ESM loader hook for runtime
// consumer-isolation audit (Prompt 2 §2).
//
// Loaded by the consumer process via `node --experimental-loader`. Every
// `file://` URL the consumer process loads is appended to the file at
// `process.env.AUDIT_LOG_PATH`. The test then reads that log and asserts
// that no loaded module path contains a prohibited substring.
//
// data: and node: URLs are skipped because fixtures are file-based.
// This loader's own URL is also skipped (see SELF_URL) to avoid noise.
import { appendFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// This loader's own filesystem path — skip when logging to avoid noise.
const SELF_PATH = fileURLToPath(import.meta.url);

export async function load(url, context, nextLoad) {
  // Only log file:// URLs that aren't this loader itself. data: and node: URLs are
  // skipped because fixtures are file-based. Compare as filesystem paths so URL
  // encoding differences (percent-encoded vs decoded) do not cause false misses.
  if (url.startsWith('file://') && process.env.AUDIT_LOG_PATH) {
    try {
      if (fileURLToPath(url) !== SELF_PATH) {
        appendFileSync(process.env.AUDIT_LOG_PATH, url + '\n', 'utf8');
      }
    } catch {
      // Audit failure must not break the consumer.
    }
  }
  return nextLoad(url, context);
}
