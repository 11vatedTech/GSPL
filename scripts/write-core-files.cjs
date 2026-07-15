
// Script to write all core pipeline implementation files
var fs = require("fs");
var path = require("path");

function writeFile(relPath, content) {
  var full = path.join(__dirname, "..", relPath);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, content);
  console.log("Wrote:", relPath);
}

console.log("Writing core pipeline files...");

// 1. Update gene-protocol index.ts to export defaults
var gpIdx = fs.readFileSync("packages/gene-protocol/src/index.ts", "utf-8");
if (!gpIdx.includes("defaults")) {
  gpIdx += "
export { createStandardGeneRegistry, ALL_GENE_DESCRIPTORS, CORE_GENE_DESCRIPTORS } from './defaults.js';
";
  writeFile("packages/gene-protocol/src/index.ts", gpIdx);
}

// 2. Update seed-format index.ts to export new operations
var sfIdx = fs.readFileSync("packages/seed-format/src/index.ts", "utf-8");
if (!sfIdx.includes("extractCanonicalHashMaterial")) {
  sfIdx = sfIdx.replace(
    "export {
  makePrimordialSeed,
  normalizeSeed,
  hashMaterialFromSeed,
} from './seed-ops.js';",
    "export {
  makePrimordialSeed,
  normalizeSeed,
  hashMaterialFromSeed,
  canonicalizeSeed,
  extractCanonicalHashMaterial,
  computeSeedHash,
  verifySeedHash,
  HASHED_FIELDS,  NON_HASHED_FIELDS,  isHashedField,} from './seed-ops.js';"
  );
  writeFile("packages/seed-format/src/index.ts", sfIdx);
}

// 3. Update compiler-core index.ts
var ccIdx = fs.readFileSync("packages/compiler-core/src/index.ts", "utf-8");
if (!ccIdx.includes("reconstructSeedFromIr")) {
  ccIdx += "
export { reconstructSeedFromIr } from './ir-reconstructor.js';
";
  ccIdx += "export { verifyPipelineOutputs, checkConstraintSatisfaction } from './semantic-verifier.js';
";
  writeFile("packages/compiler-core/src/index.ts", ccIdx);
}

console.log("All index files updated.");
