"use strict";
/**
 * Shared stage-to-progress mapping for the AiFirstPipeline.
 * This is the single source of truth for stage progress percentages and log labels,
 * used by both the backend emitter and (optionally) the frontend parser.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.PIPELINE_STAGE_ORDER = exports.STAGE_LOG_LABELS = exports.STAGE_PROGRESS_MAP = void 0;
exports.getStageProgress = getStageProgress;
exports.STAGE_PROGRESS_MAP = {
    intent: 10,
    capability_selection: 18,
    structural_prompt: 28,
    node_selection: 40,
    edge_reasoning: 50,
    validation: 62,
    property_population: 74,
    credential_discovery: 85,
    field_ownership: 93,
};
exports.STAGE_LOG_LABELS = {
    intent: 'Extracting intent...',
    capability_selection: 'Preparing capability options...',
    structural_prompt: 'Building structural blueprint...',
    node_selection: 'Selecting workflow nodes...',
    edge_reasoning: 'Reasoning about edges...',
    validation: 'Validating graph structure...',
    property_population: 'Populating node properties...',
    credential_discovery: 'Discovering credentials...',
    field_ownership: 'Assigning field ownership...',
};
/**
 * Pipeline execution order — the 8 stage names in the order they run.
 * Exported for use in property-based tests.
 */
exports.PIPELINE_STAGE_ORDER = [
    'intent',
    'capability_selection',
    'structural_prompt',
    'node_selection',
    'edge_reasoning',
    'validation',
    'property_population',
    'credential_discovery',
    'field_ownership',
];
/**
 * Returns the progress percentage for a known stage name.
 * Falls back to 5 (non-zero) for unknown stage names.
 */
function getStageProgress(stageName) {
    return exports.STAGE_PROGRESS_MAP[stageName] ?? 5;
}
