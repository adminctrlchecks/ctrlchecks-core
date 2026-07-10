"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runWithBuildUsageTracking = runWithBuildUsageTracking;
exports.getBuildUsageStore = getBuildUsageStore;
exports.recordLlmUsage = recordLlmUsage;
exports.snapshotBuildAiUsage = snapshotBuildAiUsage;
exports.mergePersistedBuildAiUsage = mergePersistedBuildAiUsage;
const async_hooks_1 = require("async_hooks");
const als = new async_hooks_1.AsyncLocalStorage();
function emptyTotals() {
    return { promptTokens: 0, completionTokens: 0, totalTokens: 0, callCount: 0 };
}
function addToTotals(t, prompt, completion, total) {
    t.promptTokens += prompt;
    t.completionTokens += completion;
    t.totalTokens += total;
    t.callCount += 1;
}
function runWithBuildUsageTracking(fn) {
    return als.run({ calls: [] }, fn);
}
function getBuildUsageStore() {
    return als.getStore();
}
function recordLlmUsage(params) {
    const store = als.getStore();
    if (!store || !params.usage) {
        return;
    }
    const { promptTokens, completionTokens, totalTokens } = params.usage;
    const call = {
        at: new Date().toISOString(),
        provider: params.provider,
        model: params.model,
        stage: params.stage?.trim() || 'llm',
        source: params.source,
        promptTokens,
        completionTokens,
        totalTokens,
    };
    store.calls.push(call);
}
/** Snapshot current request accumulation (empty if no active tracking context). */
function snapshotBuildAiUsage() {
    const store = als.getStore();
    if (!store || store.calls.length === 0) {
        return { calls: [], totals: emptyTotals(), byStage: {} };
    }
    const totals = emptyTotals();
    const byStage = {};
    for (const c of store.calls) {
        addToTotals(totals, c.promptTokens, c.completionTokens, c.totalTokens);
        if (!byStage[c.stage]) {
            byStage[c.stage] = { promptTokens: 0, completionTokens: 0, totalTokens: 0, callCount: 0 };
        }
        addToTotals(byStage[c.stage], c.promptTokens, c.completionTokens, c.totalTokens);
    }
    return { calls: [...store.calls], totals, byStage };
}
/** Merge a new snapshot into existing metadata.buildAiUsage (cumulative across generate + attach-inputs). */
function mergePersistedBuildAiUsage(existing, delta) {
    const prev = existing && typeof existing === 'object' && 'totals' in existing
        ? existing
        : null;
    const baseTotals = prev?.totals ?? emptyTotals();
    const nextTotals = {
        promptTokens: baseTotals.promptTokens + delta.totals.promptTokens,
        completionTokens: baseTotals.completionTokens + delta.totals.completionTokens,
        totalTokens: baseTotals.totalTokens + delta.totals.totalTokens,
        callCount: baseTotals.callCount + delta.totals.callCount,
    };
    const prevByStage = prev?.byStage ?? {};
    const nextByStage = { ...prevByStage };
    for (const [stage, st] of Object.entries(delta.byStage)) {
        const p = nextByStage[stage] ?? emptyTotals();
        nextByStage[stage] = {
            promptTokens: p.promptTokens + st.promptTokens,
            completionTokens: p.completionTokens + st.completionTokens,
            totalTokens: p.totalTokens + st.totalTokens,
            callCount: p.callCount + st.callCount,
        };
    }
    const prevCalls = Array.isArray(prev?.calls) ? prev.calls : [];
    const calls = [...prevCalls, ...delta.calls];
    return {
        calls,
        totals: nextTotals,
        byStage: nextByStage,
        lastUpdatedAt: new Date().toISOString(),
    };
}
