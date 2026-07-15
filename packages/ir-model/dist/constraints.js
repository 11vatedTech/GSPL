// ── Defaults ──
/** Canonical expansion defaults to NO effects */
export const DEFAULT_EFFECT_PERMISSIONS = {
    'filesystem-read': false,
    'filesystem-write': false,
    'process-execution': false,
    'network-outbound': false,
    'network-inbound': false,
    'nondeterministic-input': false,
    'time-access': false,
    'environment-access': false,
    'foreign-code-execution': false,
    'native-extensions': false,
    'model-inference': false,
};
/** Standard effect declarations */
export const STANDARD_EFFECTS = [
    { kind: 'filesystem-read', description: 'Read files from the filesystem', defaultPermitted: false },
    { kind: 'filesystem-write', description: 'Write files to the filesystem', defaultPermitted: false },
    { kind: 'process-execution', description: 'Execute child processes', defaultPermitted: false },
    { kind: 'network-outbound', description: 'Make outbound network requests', defaultPermitted: false },
    { kind: 'network-inbound', description: 'Accept inbound network connections', defaultPermitted: false },
    { kind: 'nondeterministic-input', description: 'Read nondeterministic input', defaultPermitted: false },
    { kind: 'time-access', description: 'Access wall-clock time', defaultPermitted: false },
    { kind: 'environment-access', description: 'Access environment variables', defaultPermitted: false },
    { kind: 'foreign-code-execution', description: 'Execute code from external sources', defaultPermitted: false },
    { kind: 'native-extensions', description: 'Load native binary extensions', defaultPermitted: false },
    { kind: 'model-inference', description: 'Run AI model inference', defaultPermitted: false },
];
//# sourceMappingURL=constraints.js.map