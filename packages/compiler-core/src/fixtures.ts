/** Reference fixtures — Prompt 2 §15 */

import type { CanonicalSeed } from '@gspl/seed-format';
import { makePrimordialSeed } from '@gspl/seed-format';

/**
 * Fixture A — Software Architecture Seed
 *
 * Represents a small but nontrivial service:
 * modules, public API, domain model, storage abstraction,
 * validation, tests, constraints, dependency boundaries, target contract.
 */
export const fixtureSoftwareArchitecture: CanonicalSeed = makePrimordialSeed({
  namespace: {
    domain: 'com.11vatedtech.fixtures',
    name: 'software-architecture',
    title: 'Small Service Architecture Reference Fixture',
  },
  domainProfile: {
    domainId: 'architecture',
    requiredCapabilities: ['source-code-generation', 'module-system'],
    optionalCapabilities: ['dependency-injection', 'orm'],
  },
  intent: {
    purpose: 'Demonstrate GSPL canonical representation of a small nontrivial service architecture with modules, API, domain model, storage, validation, tests, constraints, and dependency boundaries.',
    architecturePatterns: ['layered', 'repository-pattern', 'dependency-injection'],
    nonGoals: ['Full production application', 'Distributed systems', 'Authentication'],
  },
  payload: {
    schemaVersion: '1.0',
    genes: {
      'module-structure': { type: 'struct', value: { modules: ['api', 'domain', 'infrastructure', 'validation', 'tests'] }, confidence: 0.95 },
      'api-contract': { type: 'struct', value: { endpoints: ['GET /health', 'POST /entities', 'GET /entities/:id'] }, confidence: 0.9 },
      'domain-model': { type: 'graph', value: { entities: ['Entity', 'Repository'], relationships: [['Entity', 'belongs-to', 'Repository']] }, confidence: 0.85 },
      'storage-abstraction': { type: 'expression', value: 'interface Storage { save(e: Entity): void; find(id: string): Entity | null; }', confidence: 0.8 },
      'validation-rules': { type: 'regulatory', value: { rules: ['Entity.name non-empty', 'Entity.id non-null'] }, confidence: 0.9 },
    },
  },
  dependencies: {
    contextRefs: [],
    knowledgeRefs: [],
    ruleSetRefs: [],
    targetContracts: [{
      targetId: 'typescript-modules',
      targetType: 'source',
      requiredCapabilities: ['emit-typescript'],
      outputEquivalence: 'STRUCTURALLY_IDENTICAL',
    }],
  },
});

/**
 * Fixture B — Interactive Generated Scene
 *
 * Represents: scene graph, entities, timing, interactions,
 * audio-visual references, state transitions, constraints,
 * reusable components.
 */
export const fixtureInteractiveScene: CanonicalSeed = makePrimordialSeed({
  namespace: {
    domain: 'com.11vatedtech.fixtures',
    name: 'interactive-scene',
    title: 'Interactive Scene Reference Fixture',
  },
  domainProfile: {
    domainId: 'sprite',
    requiredCapabilities: ['scene-graph', 'rendering'],
    optionalCapabilities: ['audio', 'physics', 'input'],
  },
  intent: {
    purpose: 'Demonstrate GSPL canonical representation of an interactive generated scene with entities, timing, interactions, audio-visual references, state transitions, and reusable components.',
    nonGoals: ['Full game engine', 'Networked multiplayer', 'VR/AR'],
  },
  payload: {
    schemaVersion: '1.0',
    genes: {
      'scene-graph': { type: 'graph', value: { nodes: ['stage', 'actor-1', 'light-1', 'camera-1'], edges: [['stage', 'contains', 'actor-1'], ['stage', 'contains', 'light-1'], ['stage', 'contains', 'camera-1']] }, confidence: 0.9 },
      'entity-specs': { type: 'struct', value: { entities: [{ id: 'actor-1', type: 'sprite', position: [0, 0, 0], scale: [1, 1, 1] }] }, confidence: 0.85 },
      'timeline': { type: 'temporal', value: { duration: 30, fps: 60, keyframes: [{ t: 0, action: 'spawn' }, { t: 5, action: 'move-right' }, { t: 10, action: 'fade-out' }] }, confidence: 0.8 },
      'interactions': { type: 'regulatory', value: { on: [{ event: 'click', target: 'actor-1', action: 'highlight' }] }, confidence: 0.75 },
      'av-references': { type: 'symbolic', value: ['texture-atlas.png', 'bgm-loop.mp3', 'click-sfx.wav'] },
    },
  },
  dependencies: {
    contextRefs: [],
    knowledgeRefs: [],
    ruleSetRefs: [],
    targetContracts: [{
      targetId: 'scene-output',
      targetType: 'scene',
      requiredCapabilities: ['emit-scene', 'emit-media'],
      outputEquivalence: 'BEHAVIORALLY_EQUIVALENT',
    }],
  },
});

/**
 * Fixture C — Mixed Video/Game Artifact
 *
 * Combines: deterministic media timeline, interactive branches,
 * input events, gameplay state, audiovisual outputs,
 * synchronization constraints, target capabilities.
 */
export const fixtureMixedVideoGame: CanonicalSeed = makePrimordialSeed({
  namespace: {
    domain: 'com.11vatedtech.fixtures',
    name: 'mixed-video-game',
    title: 'Mixed Video/Game Artifact Reference Fixture',
  },
  domainProfile: {
    domainId: 'fullgame',
    requiredCapabilities: ['media-playback', 'interactive-input', 'state-machine'],
    optionalCapabilities: ['network', 'leaderboard'],
  },
  intent: {
    purpose: 'Prove that GSPL canonical representation can model a mixed artifact combining deterministic media timeline, interactive branches, input events, gameplay state, audiovisual outputs, and synchronization constraints.',
    nonGoals: ['Full commercial game', '3D rendering', 'Online multiplayer'],
  },
  payload: {
    schemaVersion: '1.0',
    genes: {
      'media-timeline': { type: 'temporal', value: { segments: [{ t: 0, kind: 'video', src: 'intro.mp4', duration: 15 }, { t: 15, kind: 'interactive', prompt: 'Choose path', options: ['A', 'B'], duration: 5 }, { t: 20, kind: 'gameplay', scene: 'level-1', duration: 60 }] }, confidence: 0.9 },
      'interactive-branches': { type: 'graph', value: { nodes: ['intro', 'choice', 'path-a', 'path-b', 'gameplay'], edges: [['intro', 'leads-to', 'choice'], ['choice', 'branch-a', 'path-a'], ['choice', 'branch-b', 'path-b'], ['path-a', 'leads-to', 'gameplay'], ['path-b', 'leads-to', 'gameplay']] }, confidence: 0.85 },
      'input-events': { type: 'regulatory', value: { keyboard: { 'space': 'pause', 'escape': 'menu' }, mouse: { 'click': 'select' }, touch: { 'tap': 'select' } }, confidence: 0.8 },
      'gameplay-state': { type: 'struct', value: { score: 0, lives: 3, level: 1, inventory: [] }, confidence: 0.75 },
      'av-outputs': { type: 'struct', value: { video: { width: 1920, height: 1080, fps: 60 }, audio: { channels: 2, sampleRate: 48000 } }, confidence: 0.9 },
      'sync-constraints': { type: 'regulatory', value: { 'video-audio-sync': 'lip-sync', 'input-latency-max': 16 }, confidence: 0.85 },
    },
  },
  dependencies: {
    contextRefs: [],
    knowledgeRefs: [],
    ruleSetRefs: [],
    targetContracts: [{
      targetId: 'mixed-artifact-output',
      targetType: 'composite',
      requiredCapabilities: ['emit-video', 'emit-audio', 'emit-interactive'],
      outputEquivalence: 'BEHAVIORALLY_EQUIVALENT',
    }],
  },
});
