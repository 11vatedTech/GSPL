import { makePrimordialSeed, canonicalizeSeed } from "@gspl/seed-format";
function findMetaNode(nodes, section) {
    var vals = Array.from(nodes.values());
    for (var i = 0; i < vals.length; i++) {
        var n = vals[i];
        if (n.attributes && n.attributes.section === section)
            return n;
    }
    return undefined;
}
function extractGeneName(nodeId, attrs) {
    var p = nodeId.split(":");
    return p.length >= 3 && p[0] === "n" ? p[2] : (attrs && attrs.geneName) || "unknown";
}
export function reconstructSeedFromIr(graph, ctx) {
    var errors = [];
    var reg = ctx.geneRegistry;
    var schemaNode = findMetaNode(graph.nodes, "schema");
    var seedSchema = (schemaNode && schemaNode.value && schemaNode.value.schema) || "gspl.canonical-seed";
    var seedSchemaVersion = (schemaNode && schemaNode.value && schemaNode.value.schemaVersion) || "1.0";
    var identityNode = findMetaNode(graph.nodes, "identity");
    var identityOverrides = {};
    if (identityNode && identityNode.value) {
        var idv = identityNode.value;
        if (idv.authoredId !== undefined)
            identityOverrides.authoredId = idv.authoredId;
        if (idv.revisionId !== undefined)
            identityOverrides.revisionId = idv.revisionId;
        if (idv.lineageId !== undefined)
            identityOverrides.lineageId = idv.lineageId;
        if (idv.packageId !== undefined)
            identityOverrides.packageId = idv.packageId;
    }
    var nsNode = findMetaNode(graph.nodes, "namespace");
    var namespace = nsNode && nsNode.value || undefined;
    var dpNode = findMetaNode(graph.nodes, "domainProfile");
    var domainProfile = dpNode && dpNode.value || { domainId: "seed", requiredCapabilities: [], optionalCapabilities: [] };
    var intentNode = findMetaNode(graph.nodes, "intent");
    var intent = intentNode && intentNode.value || { purpose: "Reconstructed from IR" };
    var geneGroups = new Map();
    graph.nodes.forEach(function (node) {
        var gn = extractGeneName(node.id, node.attributes);
        if (gn === "unknown" || gn === "seed-root" || (node.attributes && node.attributes.section))
            return;
        var frag = { id: node.id, kind: node.kind, type: node.type, value: node.value, attributes: node.attributes, provenance: { source: node.provenance.source, originId: node.provenance.originId } };
        var existing = geneGroups.get(gn);
        if (existing) {
            existing.fragments.push(frag);
        }
        else {
            geneGroups.set(gn, { fragments: [frag], type: node.type, confidence: (node.attributes && node.attributes.confidence) || undefined });
        }
    });
    var genes = {};
    geneGroups.forEach(function (group, geneName) {
        var geneNode = group.fragments.find(function (f) { return f.kind === "gene" || (f.type && reg.has(f.type)); });
        var typeId = (geneNode && geneNode.type) || group.type || "unknown";
        var desc = reg.get(typeId);
        if (desc && desc.liftFromIr) {
            try {
                var lifted = desc.liftFromIr(group.fragments, { seedId: "reconstructed", geneName: geneName, resolveGeneValue: function () { return null; } });
                genes[geneName] = { type: typeId, value: lifted, confidence: group.confidence };
            }
            catch (e) {
                errors.push("Lift error " + geneName + ": " + String(e));
                genes[geneName] = { type: typeId, value: (geneNode && geneNode.value) || null };
            }
        }
        else {
            genes[geneName] = { type: typeId, value: (geneNode && geneNode.value) || null, confidence: group.confidence };
        }
    });
    function readMeta(s) { var n = findMetaNode(graph.nodes, s); return (n && n.value) || undefined; }
    var constraints = readMeta("constraints") || { valueRanges: [], structuralConditions: [], targetRestrictions: [], performanceBudgets: [], compatibilityConditions: [] };
    var dependencies = readMeta("dependencies") || { contextRefs: [], knowledgeRefs: [], ruleSetRefs: [], targetContracts: [] };
    var entropy = readMeta("entropy") || { algorithm: "gspl-splitmix64", algorithmVersion: "1.0", rootSeed: "", channels: [] };
    var lineage = readMeta("lineage") || { operation: "primordial", parents: [], generation: 0 };
    var provenance = readMeta("provenance") || { canonVersion: ctx.canonVersion };
    var resourceBudget = readMeta("resourceBudget") || {};
    var effectPermissions = readMeta("effectPermissions") || { filesystem: "none", processExecution: false, networkAccess: false, environmentAccess: false, timeAccess: false, foreignCodeExecution: false, nativeExtensions: false, modelInference: false };
    var validationReqs = readMeta("validationRequirements");
    var compatReqs = readMeta("compatibilityRequirements");
    var seed = makePrimordialSeed({
        schema: seedSchema, schemaVersion: seedSchemaVersion,
        namespace: namespace, domainProfile: domainProfile, intent: intent,
        payload: { schemaVersion: "1.0", genes: genes },
        constraints: constraints, dependencies: dependencies,
        entropy: entropy, lineage: lineage, provenance: provenance,
        resourceBudget: resourceBudget, effectPermissions: effectPermissions,
        validationRequirements: validationReqs, compatibilityRequirements: compatReqs,
    });
    if (identityOverrides.authoredId !== undefined)
        (seed).identity.authoredId = identityOverrides.authoredId;
    if (identityOverrides.revisionId !== undefined)
        (seed).identity.revisionId = identityOverrides.revisionId;
    if (identityOverrides.lineageId !== undefined)
        (seed).identity.lineageId = identityOverrides.lineageId;
    if (identityOverrides.packageId !== undefined)
        (seed).identity.packageId = identityOverrides.packageId;
    return { ok: errors.length === 0, seed: seed, errors: errors, warnings: [] };
}
export function verifyIndependentReconstruction(originalBytes, graph, ctx) {
    var result = reconstructSeedFromIr(graph, ctx);
    var rb = canonicalizeSeed(result.seed);
    var ob = originalBytes;
    var match = ob.length === rb.length;
    if (match) {
        for (var i = 0; i < ob.length; i++) {
            if (ob[i] !== rb[i]) {
                match = false;
                break;
            }
        }
    }
    var fe = [];
    if (!match) {
        fe.push("Bytes diff: " + ob.length + " vs " + rb.length);
        if (JSON.stringify(originalSeed.payload) !== JSON.stringify(result.seed.payload))
            fe.push("payload");
        if (JSON.stringify(originalSeed.constraints) !== JSON.stringify(result.seed.constraints))
            fe.push("constraints");
        if (JSON.stringify(originalSeed.dependencies) !== JSON.stringify(result.seed.dependencies))
            fe.push("dependencies");
    }
    return { ok: match && result.ok, originalBytes: ob, reconstructedBytes: rb, bytesMatch: match, errors: result.errors.concat(fe), fieldErrors: fe };
}
//# sourceMappingURL=ir-reconstructor.js.map