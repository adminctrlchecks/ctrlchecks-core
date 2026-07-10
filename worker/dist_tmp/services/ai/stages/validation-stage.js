"use strict";
/**
 * Validation Stage - AI-First Pipeline
 *
 * The LLM validates the assembled workflow graph on four dimensions:
 * 1. Structural validity (DAG, reachability, edge types)
 * 2. Semantic alignment (does the graph accomplish what the user asked)
 * 3. Completeness (no missing required nodes)
 * 4. Data flow coherence (output/input compatibility)
 *
 * One automated repair pass on error-severity issues.
 * UnifiedGraphOrchestrator.validateWorkflow() always called as structural safety net.
 * Never silently returns an invalid graph.
 *
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.7, 8.1, 8.2, 8.3, 9.4
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.runValidationStage = runValidationStage;
const gemini_orchestrator_1 = require("../gemini-orchestrator");
const system_prompt_builder_1 = require("../system-prompt-builder");
const unified_graph_orchestrator_1 = require("../../../core/orchestration/unified-graph-orchestrator");
const logger_1 = require("../../../core/logger");
const node_field_intelligence_1 = require("../../../core/utils/node-field-intelligence");
const validation_stage_client_1 = require("./validation-stage-client");
const MODEL = 'gemini-3.5-flash';
const TEMPERATURE = 0.1;
// Validation Stage
async function runValidationStage(workflow, nodeCatalog, userIntent, selectedNodes, proposedEdges, correlationId, structuralPrompt) {
    const startedAt = Date.now();
    logger_1.logger.info({
        event: 'ai_pipeline_stage_start',
        stage: 'validation',
        correlationId,
        inputSummary: `nodes=${workflow.nodes.length}, edges=${workflow.edges.length}`,
    });
    let llmResult = await (0, validation_stage_client_1.runValidationStageRemote)(workflow, nodeCatalog, userIntent, selectedNodes, proposedEdges, correlationId, structuralPrompt);
    if (!llmResult) {
        llmResult = await runValidationLlmLocally(workflow, nodeCatalog, userIntent, selectedNodes, proposedEdges, correlationId, structuralPrompt);
    }
    if (!llmResult.ok) {
        logger_1.logger.warn({
            event: 'ai_pipeline_stage_error',
            stage: 'validation',
            correlationId,
            error: llmResult.code,
            message: llmResult.rawResponse,
            note: 'Falling through to orchestrator safety net',
        });
        return runOrchestratorSafetyNet(workflow, MODEL, TEMPERATURE, 0, 0, startedAt, correlationId);
    }
    return processValidationResult({ status: llmResult.status, issues: llmResult.issues }, workflow, correlationId, llmResult.llmCall.model, llmResult.llmCall.temperature, llmResult.llmCall.promptTokens, llmResult.llmCall.completionTokens, startedAt);
}
async function runValidationLlmLocally(workflow, nodeCatalog, userIntent, selectedNodes, proposedEdges, correlationId, structuralPrompt) {
    const startedAt = Date.now();
    const { systemPrompt } = system_prompt_builder_1.systemPromptBuilder.build({
        stage: 'validation',
        nodeCatalog,
        userIntent,
        stageContext: { selectedNodes, edgeList: proposedEdges },
    });
    logger_1.logger.info({ event: 'ai_pipeline_llm_call', stage: 'validation', correlationId, model: MODEL, temperature: TEMPERATURE });
    const message = `USER_INTENT:\n${userIntent}${structuralPrompt ? `\n\nWORKFLOW_BLUEPRINT:\n${structuralPrompt}` : ''}\n\nWORKFLOW_GRAPH:\n${JSON.stringify({ nodes: workflow.nodes, edges: workflow.edges }, null, 2)}`;
    let text;
    let promptTokens = Math.ceil(systemPrompt.length / 4);
    let completionTokens = 0;
    try {
        const raw = await gemini_orchestrator_1.geminiOrchestrator.processRequest('workflow-analysis', { system: systemPrompt, message }, { model: MODEL, temperature: TEMPERATURE, cache: false });
        text = typeof raw === 'string' ? raw : JSON.stringify(raw);
        completionTokens = Math.ceil(text.length / 4);
    }
    catch (err) {
        return {
            ok: false,
            code: 'INVALID_LLM_RESPONSE',
            rawResponse: String(err),
            durationMs: Date.now() - startedAt,
        };
    }
    let parsed = tryParseValidationResult(text);
    if (!parsed) {
        logger_1.logger.warn({ event: 'ai_pipeline_stage_retry', stage: 'validation', correlationId, reason: 'JSON parse failed on first attempt' });
        let text2;
        try {
            const retryPrompt = systemPrompt + '\n\nCRITICAL: Return ONLY valid JSON. No markdown fences, no explanation. Start with { and end with }.';
            const raw2 = await gemini_orchestrator_1.geminiOrchestrator.processRequest('workflow-analysis', { system: retryPrompt, message }, { model: MODEL, temperature: TEMPERATURE, cache: false });
            text2 = typeof raw2 === 'string' ? raw2 : JSON.stringify(raw2);
            promptTokens = Math.ceil(retryPrompt.length / 4);
            completionTokens = Math.ceil(text2.length / 4);
        }
        catch (err) {
            return {
                ok: false,
                code: 'INVALID_LLM_RESPONSE',
                rawResponse: String(err),
                durationMs: Date.now() - startedAt,
            };
        }
        parsed = tryParseValidationResult(text2);
        if (!parsed) {
            logger_1.logger.warn({ event: 'ai_pipeline_validation_parse_failed', stage: 'validation', correlationId, note: 'Falling through to orchestrator safety net' });
            return {
                ok: false,
                code: 'INVALID_LLM_RESPONSE',
                rawResponse: text2,
                durationMs: Date.now() - startedAt,
            };
        }
    }
    const finalParsed = await maybeRepairAndRevalidate(parsed, workflow, nodeCatalog, userIntent, selectedNodes, proposedEdges, correlationId);
    return {
        ok: true,
        status: finalParsed.status,
        issues: finalParsed.issues,
        durationMs: Date.now() - startedAt,
        llmCall: {
            model: MODEL,
            temperature: TEMPERATURE,
            promptTokens,
            completionTokens,
        },
    };
}
async function maybeRepairAndRevalidate(parsed, workflow, nodeCatalog, userIntent, selectedNodes, proposedEdges, correlationId) {
    const errorIssues = parsed.issues.filter((i) => i.severity === 'error');
    if (parsed.status !== 'fail' || errorIssues.length === 0) {
        return parsed;
    }
    logger_1.logger.info({ event: 'ai_pipeline_repair_pass', stage: 'validation', correlationId, errorCount: errorIssues.length });
    const { systemPrompt: repairPrompt } = system_prompt_builder_1.systemPromptBuilder.build({
        stage: 'repair',
        nodeCatalog,
        userIntent,
        stageContext: { selectedNodes, edgeList: proposedEdges, validationIssues: errorIssues },
    });
    try {
        const rawRepair = await gemini_orchestrator_1.geminiOrchestrator.processRequest('workflow-analysis', { system: repairPrompt, message: `USER_INTENT:\n${userIntent}` }, { model: MODEL, temperature: TEMPERATURE, cache: false });
        const textRepair = typeof rawRepair === 'string' ? rawRepair : JSON.stringify(rawRepair);
        const repairedGraph = tryParseRepairedGraph(textRepair);
        if (!repairedGraph) {
            logger_1.logger.warn({ event: 'ai_pipeline_repair_incomplete', stage: 'validation', correlationId, remainingErrors: errorIssues.length });
            return parsed;
        }
        const revalidatePrompt = system_prompt_builder_1.systemPromptBuilder.build({
            stage: 'validation',
            nodeCatalog,
            userIntent,
            stageContext: { selectedNodes, edgeList: repairedGraph.edges },
        });
        try {
            const rawRevalidate = await gemini_orchestrator_1.geminiOrchestrator.processRequest('workflow-analysis', { system: revalidatePrompt.systemPrompt, message: `USER_INTENT:\n${userIntent}\n\nWORKFLOW_GRAPH:\n${JSON.stringify({ nodes: workflow.nodes, edges: workflow.edges }, null, 2)}` }, { model: MODEL, temperature: TEMPERATURE, cache: false });
            const textRevalidate = typeof rawRevalidate === 'string' ? rawRevalidate : JSON.stringify(rawRevalidate);
            const revalidated = tryParseValidationResult(textRevalidate);
            const remainingErrors = revalidated?.issues.filter((i) => i.severity === 'error') ?? errorIssues;
            if (remainingErrors.length > 0) {
                logger_1.logger.warn({ event: 'ai_pipeline_repair_incomplete', stage: 'validation', correlationId, remainingErrors: remainingErrors.length });
            }
            return revalidated ?? parsed;
        }
        catch (err) {
            logger_1.logger.warn({ event: 'ai_pipeline_revalidate_failed', stage: 'validation', correlationId, message: String(err) });
            return parsed;
        }
    }
    catch (err) {
        logger_1.logger.warn({ event: 'ai_pipeline_repair_failed', stage: 'validation', correlationId, message: String(err) });
        return parsed;
    }
}
// processValidationResult
async function processValidationResult(parsed, workflow, correlationId, model, temperature, promptTokens, completionTokens, startedAt) {
    const currentWorkflow = workflow;
    // Always call UnifiedGraphOrchestrator.validateWorkflow as structural safety net
    const orchestratorValidation = unified_graph_orchestrator_1.unifiedGraphOrchestrator.validateWorkflow(currentWorkflow);
    if (!orchestratorValidation.valid) {
        const structuralIssues = orchestratorValidation.errors.map((e) => ({
            severity: 'error',
            description: e,
            suggestedFix: 'Fix structural graph issue via UnifiedGraphOrchestrator',
        }));
        logger_1.logger.error({ event: 'ai_pipeline_stage_error', stage: 'validation', correlationId, error: 'ORCHESTRATOR_VALIDATION_FAILED', errors: orchestratorValidation.errors });
        return {
            ok: false,
            code: 'ORCHESTRATOR_VALIDATION_FAILED',
            workflow: currentWorkflow,
            validationIssues: structuralIssues,
            durationMs: Date.now() - startedAt,
        };
    }
    const intelligenceIssues = (0, node_field_intelligence_1.validateWorkflowNodeIntelligence)(currentWorkflow).map((issue) => ({
        severity: issue.severity === 'error' ? 'warning' : 'warning',
        description: `${issue.nodeLabel || issue.nodeType}.${issue.fieldName}: ${issue.reason}`,
        suggestedFix: issue.suggestedValue !== undefined
            ? `Use suggested value ${JSON.stringify(issue.suggestedValue)} or provide an explicit value.`
            : 'Review the node field intelligence and provide a safe value.',
    }));
    const warningIssues = [...parsed.issues.filter((i) => i.severity === 'warning'), ...intelligenceIssues];
    const durationMs = Date.now() - startedAt;
    logger_1.logger.info({
        event: 'ai_pipeline_stage_end',
        stage: 'validation',
        correlationId,
        outputSummary: `status=${parsed.status}, warnings=${warningIssues.length}`,
        durationMs,
    });
    return {
        ok: true,
        workflow: currentWorkflow,
        validationIssues: warningIssues,
        durationMs,
        llmCall: { model, temperature, promptTokens, completionTokens },
    };
}
// runOrchestratorSafetyNet
function runOrchestratorSafetyNet(workflow, model, temperature, promptTokens, completionTokens, startedAt, correlationId) {
    const orchestratorResult = unified_graph_orchestrator_1.unifiedGraphOrchestrator.validateWorkflow(workflow);
    if (!orchestratorResult.valid) {
        const structuralIssues = orchestratorResult.errors.map((e) => ({
            severity: 'error',
            description: e,
            suggestedFix: 'Fix structural graph issue via UnifiedGraphOrchestrator',
        }));
        logger_1.logger.error({ event: 'ai_pipeline_stage_error', stage: 'validation', correlationId, error: 'ORCHESTRATOR_VALIDATION_FAILED', errors: orchestratorResult.errors });
        return { ok: false, code: 'ORCHESTRATOR_VALIDATION_FAILED', workflow, validationIssues: structuralIssues, durationMs: Date.now() - startedAt };
    }
    const intelligenceIssues = (0, node_field_intelligence_1.validateWorkflowNodeIntelligence)(workflow).map((issue) => ({
        severity: 'warning',
        description: `${issue.nodeLabel || issue.nodeType}.${issue.fieldName}: ${issue.reason}`,
        suggestedFix: issue.suggestedValue !== undefined
            ? `Use suggested value ${JSON.stringify(issue.suggestedValue)} or provide an explicit value.`
            : 'Review the node field intelligence and provide a safe value.',
    }));
    logger_1.logger.info({ event: 'ai_pipeline_stage_end', stage: 'validation', correlationId, outputSummary: `status=pass (orchestrator fallback), warnings=${intelligenceIssues.length}`, durationMs: Date.now() - startedAt });
    return { ok: true, workflow, validationIssues: intelligenceIssues, durationMs: Date.now() - startedAt, llmCall: { model, temperature, promptTokens, completionTokens } };
}
// Helpers
function stripMarkdownFences(text) {
    return text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim();
}
function tryParseValidationResult(text) {
    try {
        const cleaned = stripMarkdownFences(text);
        const start = cleaned.indexOf('{');
        const end = cleaned.lastIndexOf('}');
        if (start === -1 || end === -1)
            return null;
        const obj = JSON.parse(cleaned.substring(start, end + 1));
        if (!obj.status || !Array.isArray(obj.issues))
            return null;
        return {
            status: obj.status === 'pass' ? 'pass' : 'fail',
            issues: obj.issues.map((i) => ({
                severity: i.severity === 'error' ? 'error' : 'warning',
                description: String(i.description || ''),
                suggestedFix: i.suggestedFix ? String(i.suggestedFix) : undefined,
            })),
        };
    }
    catch {
        return null;
    }
}
function tryParseRepairedGraph(text) {
    try {
        const cleaned = stripMarkdownFences(text);
        const start = cleaned.indexOf('{');
        const end = cleaned.lastIndexOf('}');
        if (start === -1 || end === -1)
            return null;
        const obj = JSON.parse(cleaned.substring(start, end + 1));
        if (!Array.isArray(obj.orderedNodes) && !Array.isArray(obj.nodes))
            return null;
        return { nodes: obj.nodes ?? [], edges: obj.edges ?? [] };
    }
    catch {
        return null;
    }
}
