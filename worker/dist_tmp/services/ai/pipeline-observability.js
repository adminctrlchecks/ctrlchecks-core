"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.incrementPipelineCounter = incrementPipelineCounter;
exports.getPipelineCounters = getPipelineCounters;
exports.resetPipelineCounters = resetPipelineCounters;
const COUNTER_KEYS = [
    'node_selection_structured_decode_fail',
    'node_selection_deterministic_recovery_used',
    'normalizer_startup_unknown_aggregated',
    'normalizer_runtime_unknown_total',
];
const counters = {
    node_selection_structured_decode_fail: 0,
    node_selection_deterministic_recovery_used: 0,
    normalizer_startup_unknown_aggregated: 0,
    normalizer_runtime_unknown_total: 0,
};
function incrementPipelineCounter(key, by = 1) {
    const delta = Number.isFinite(by) ? by : 1;
    counters[key] = Math.max(0, counters[key] + delta);
    return counters[key];
}
function getPipelineCounters() {
    return { ...counters };
}
function resetPipelineCounters() {
    for (const key of COUNTER_KEYS) {
        counters[key] = 0;
    }
}
