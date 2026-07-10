"use strict";
/**
 * Canonical "structural" prompt: Goal + numbered architecture + terminal.
 * Used when the raw user prompt lacks an explicit execution layout.
 *
 * ENHANCED: Now uses AI-driven summary generation instead of hardcoded templates.
 * The AI understands user intent, selected nodes, and use cases to generate
 * contextual, accurate workflow summaries.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatArchitecturalWorkflowPromptAsync = formatArchitecturalWorkflowPromptAsync;
exports.formatArchitecturalWorkflowPrompt = formatArchitecturalWorkflowPrompt;
exports.structuredPromptAlreadyHasArchitecture = structuredPromptAlreadyHasArchitecture;
exports.formatSummaryForFrontend = formatSummaryForFrontend;
const plan_chain_prune_1 = require("./plan-chain-prune");
const registry_structural_fill_contract_1 = require("./registry-structural-fill-contract");
const ai_driven_workflow_summary_generator_1 = require("./ai-driven-workflow-summary-generator");
/**
 * Async version: Uses AI-driven summary generation
 */
async function formatArchitecturalWorkflowPromptAsync(params) {
    const chain = (0, plan_chain_prune_1.pruneProposedPlanChain)(params.proposedNodeChain);
    const goalLine = (params.narrativeContext && String(params.narrativeContext).trim()) ||
        String(params.goal || '').trim() ||
        'Automate the described task end-to-end.';
    // Use AI-driven summary if requested
    if (params.useAIDrivenSummary) {
        try {
            const aiInput = {
                userPrompt: goalLine,
                nodeChain: chain,
                useCases: params.useCases,
                requirements: params.requirements,
                branchingLogic: params.branchingLogic,
            };
            const aiResult = await ai_driven_workflow_summary_generator_1.aiDrivenWorkflowSummaryGenerator.generateSummary(aiInput);
            if (params.includeRegistryFillContract) {
                return aiResult.summary + '\n\n' + (0, registry_structural_fill_contract_1.buildRegistryStructuralFillContractSection)(chain);
            }
            return aiResult.summary;
        }
        catch (error) {
            console.error('[StructuredWorkflowPrompt] AI-driven summary generation failed, falling back to template:', error);
            // Fall back to template-based summary
        }
    }
    // Fall back to synchronous version
    return formatArchitecturalWorkflowPrompt(params);
}
/**
 * Synchronous version (for backward compatibility)
 * Falls back to template-based summary
 */
function formatArchitecturalWorkflowPrompt(params) {
    const chain = (0, plan_chain_prune_1.pruneProposedPlanChain)(params.proposedNodeChain);
    const goalLine = (params.narrativeContext && String(params.narrativeContext).trim()) ||
        String(params.goal || '').trim() ||
        'Automate the described task end-to-end.';
    // Original minimal format (backward compatible)
    const executionLines = chain.map((t, i) => `${i + 1}. ${t} (${t})`);
    const logCount = chain.filter((t) => t === 'log_output').length;
    const terminalLine = logCount > 1
        ? `Terminals: ${logCount} × log_output (one per branch path; do not merge).`
        : `Terminal: ${chain.length > 0 ? chain[chain.length - 1] : 'log_output'}.`;
    const parts = [
        'Goal:',
        goalLine,
        '',
        'Architecture (execution order):',
        ...executionLines,
        '',
        terminalLine,
        ...(logCount > 1
            ? ['Rule: keep branch terminals separate — never merge multiple branch outputs into one log_output.']
            : []),
    ];
    if (params.includeRegistryFillContract) {
        parts.push('', (0, registry_structural_fill_contract_1.buildRegistryStructuralFillContractSection)(chain));
    }
    return parts.join('\n');
}
/** True when the prompt already encodes a structured layout (do not replace). */
function structuredPromptAlreadyHasArchitecture(text) {
    const s = String(text || '');
    return /\b(execution|architecture|terminal)\s*:/i.test(s) || /\d+\.\s+\w+\s*\(/i.test(s);
}
/**
 * Format AI-generated summary for frontend display
 * Converts comprehensive summary to frontend-expected format:
 * WORKFLOW: [objective]
 * TRIGGER: [trigger description]
 * FLOW: [flow description]
 * CONNECTIONS: [connections description]
 */
function formatSummaryForFrontend(aiSummary) {
    // Extract sections from AI-generated summary with improved regex patterns
    // Extract OBJECTIVE (after 📋 OBJECTIVE: until next section)
    const objectiveMatch = aiSummary.match(/📋 OBJECTIVE:\s*([\s\S]*?)(?=\n\n�|$)/);
    const objective = objectiveMatch?.[1]?.trim() || 'Automate workflow';
    // Extract EXECUTION STEPS section (the comprehensive node-by-node breakdown)
    const executionStepsMatch = aiSummary.match(/🔄 EXECUTION STEPS[\s\S]*?(?=⚡ BRANCHING|🎯 TERMINAL|📤 COMPLETE|✅ VALIDATION|═══|$)/);
    let executionStepsText = '';
    if (executionStepsMatch) {
        // Parse execution steps into a readable flow format
        const stepsContent = executionStepsMatch[0];
        const stepMatches = stepsContent.matchAll(/STEP (\d+):\s*(\w+[\w_]*)\s*\n([\s\S]*?)(?=STEP \d+:|⚡|🎯|📤|✅|═══|$)/g);
        const flowLines = [];
        for (const match of stepMatches) {
            const stepNum = match[1];
            const nodeType = match[2];
            const stepContent = match[3];
            // Extract purpose from step content
            const purposeMatch = stepContent.match(/Purpose:\s*(.+?)(?=\n|$)/);
            const purpose = purposeMatch?.[1]?.trim() || nodeType;
            flowLines.push(`${stepNum}. ${nodeType} - ${purpose}`);
        }
        executionStepsText = flowLines.length > 0
            ? flowLines.join('\n')
            : 'Nodes will execute in sequence as configured';
    }
    // Extract BRANCHING LOGIC if present
    const branchingMatch = aiSummary.match(/⚡ BRANCHING LOGIC[\s\S]*?(?=🎯|📤|✅|═══|$)/);
    const branchingText = branchingMatch?.[0]?.trim() || '';
    // Extract TERMINAL NODES
    const terminalMatch = aiSummary.match(/🎯 TERMINAL NODES[\s\S]*?(?=📤|✅|═══|$)/);
    const terminalText = terminalMatch?.[0]?.trim() || '';
    // Extract DATA FLOW PATH
    const dataFlowMatch = aiSummary.match(/📤 COMPLETE DATA FLOW PATH:\s*([\s\S]*?)(?=✅|═══|$)/);
    const dataFlowText = dataFlowMatch?.[1]?.trim() || '';
    // Build comprehensive FLOW section combining execution steps, branching, and data flow
    const flowSection = [
        executionStepsText,
        branchingText ? `\n${branchingText}` : '',
        terminalText ? `\n${terminalText}` : '',
        dataFlowText ? `\n\nData Flow: ${dataFlowText}` : '',
    ].filter(Boolean).join('\n');
    // Build frontend-expected format
    const formatted = `WORKFLOW: ${objective}

TRIGGER
Workflow starts with the first node and processes data through all configured steps.

FLOW
${flowSection || 'Nodes will execute in sequence as configured'}

CONNECTIONS
All nodes are connected in execution order. Data flows from each node to the next.`;
    return formatted;
}
