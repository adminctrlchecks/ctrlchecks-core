"use strict";
/**
 * AI-Driven Workflow Summary Generator - 100% AI GENERATION
 *
 * NO HARDCODING - PURE AI UNDERSTANDING AND GENERATION
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.aiDrivenWorkflowSummaryGenerator = exports.AIDrivenWorkflowSummaryGenerator = void 0;
const ai_adapter_1 = require("./ai-adapter");
const unified_node_registry_1 = require("../../core/registry/unified-node-registry");
const summary_v2_compiler_1 = require("./summary-v2-compiler");
/**
 * AI-Driven Workflow Summary Generator - PURE AI IMPLEMENTATION
 */
class AIDrivenWorkflowSummaryGenerator {
    generateSummaryV2FromWorkflow(workflow, userPrompt) {
        return (0, summary_v2_compiler_1.compileSummaryV2FromWorkflow)(workflow, userPrompt);
    }
    /**
     * Generate 100% AI-driven workflow summary
     */
    async generateSummary(input) {
        try {
            // 1. Analyze workflow structure for branching
            const branchingAnalysis = this.analyzeBranchingStructure(input.workflow, input.edges);
            // 2. Build enhanced node context with branching metadata
            const nodeContext = this.buildNodeContextWithBranching(input.nodeChain, branchingAnalysis);
            // 3. Create AI prompt with branch-aware instructions
            const aiPrompt = this.createBranchAwareAIPrompt(input, nodeContext, branchingAnalysis);
            // 4. Call AI for generation
            const aiResponse = await this.callAI(aiPrompt);
            // 5. Format response with branch explanations
            const summary = this.formatAIResponseWithBranches(aiResponse, branchingAnalysis);
            return {
                summary,
                confidence: 0.95,
            };
        }
        catch (error) {
            console.error('[AI Summary Generator] Error:', error);
            // Minimal fallback - let AI handle everything
            return {
                summary: await this.generateMinimalAIFallback(input),
                confidence: 0.3,
            };
        }
    }
    /**
     * Analyze workflow structure to identify branches, edges, and merge points
     */
    analyzeBranchingStructure(workflow, edges) {
        if (!workflow || !edges) {
            return { hasBranching: false, branches: [], mergePoints: [] };
        }
        const branches = [];
        const mergePoints = [];
        // Identify branching nodes (if_else, switch)
        for (const node of workflow.nodes) {
            const nodeType = node.data?.type || node.type;
            const nodeDef = unified_node_registry_1.unifiedNodeRegistry.get(nodeType);
            if (nodeDef?.isBranching) {
                const outgoingEdges = edges.filter(e => e.source === node.id);
                branches.push({
                    nodeId: node.id,
                    nodeType,
                    branchType: nodeType === 'if_else' ? 'binary' : 'multi-case',
                    cases: outgoingEdges.map(e => ({
                        caseKey: e.branchName || e.sourceHandle || e.type || 'default',
                        targetNodeId: e.target,
                        edgeType: e.type
                    }))
                });
            }
        }
        // Identify merge points (nodes with multiple incoming edges)
        const incomingCount = new Map();
        for (const edge of edges) {
            incomingCount.set(edge.target, (incomingCount.get(edge.target) || 0) + 1);
        }
        for (const [nodeId, count] of incomingCount.entries()) {
            if (count > 1) {
                mergePoints.push(nodeId);
            }
        }
        return {
            hasBranching: branches.length > 0,
            branches,
            mergePoints
        };
    }
    /**
     * Build node context from registry - NO HARDCODING
     */
    buildNodeContextForAI(nodeChain) {
        return nodeChain.map((nodeType, idx) => {
            try {
                const nodeDef = unified_node_registry_1.unifiedNodeRegistry.get(nodeType);
                const description = nodeDef?.description || `Node: ${nodeType}`;
                const category = nodeDef?.category || 'processing';
                return `${idx + 1}. ${nodeType} (${category}): ${description}`;
            }
            catch {
                return `${idx + 1}. ${nodeType}: Workflow node`;
            }
        }).join('\n');
    }
    /**
     * Build node context with branching metadata
     */
    buildNodeContextWithBranching(nodeChain, branchingAnalysis) {
        const baseContext = this.buildNodeContextForAI(nodeChain);
        if (!branchingAnalysis.hasBranching) {
            return baseContext;
        }
        // Add branching metadata
        const branchingInfo = branchingAnalysis.branches.map(branch => {
            const casesInfo = branch.cases.map(c => `    • ${c.caseKey} → ${c.targetNodeId}`).join('\n');
            return `  - ${branch.nodeType} (${branch.nodeId}): ${branch.branchType} branching\n${casesInfo}`;
        }).join('\n');
        const mergeInfo = branchingAnalysis.mergePoints.length > 0
            ? `\n  Merge Points: ${branchingAnalysis.mergePoints.join(', ')}`
            : '';
        return `${baseContext}\n\nBRANCHING STRUCTURE:\n${branchingInfo}${mergeInfo}`;
    }
    /**
     * Create branch-aware AI prompt with explicit branching instructions
     */
    createBranchAwareAIPrompt(input, nodeContext, branchingAnalysis) {
        const additionalContext = [
            input.useCases?.length ? `Use Cases:\n${input.useCases.join('\n')}` : '',
            input.requirements?.length ? `Requirements:\n${input.requirements.join('\n')}` : '',
            input.branchingLogic ? `Branching Logic:\n${input.branchingLogic}` : '',
        ].filter(Boolean).join('\n\n');
        // Build branching-specific instructions
        const branchingInstructions = branchingAnalysis.hasBranching
            ? this.buildBranchingInstructions(branchingAnalysis)
            : '';
        return `You are an expert workflow architect. Produce a concise, theoretically precise workflow blueprint.

USER INTENT:
${input.userPrompt}

SELECTED NODES (execution order):
${nodeContext}

${additionalContext ? `ADDITIONAL CONTEXT:\n${additionalContext}\n` : ''}

OUTPUT these EXACT four sections. Each section header must appear on its own line exactly as shown.

OBJECTIVE:
One sentence — the business outcome this workflow automates. Focus on WHY it exists, not HOW it works.

TRIGGER_DESCRIPTION:
One to two sentences — what event starts execution, what data the trigger captures and passes downstream.

DETAILED_FLOW:
Numbered steps, one per node. For each step write: "N. [Node label] — [what it receives] → [what it does] → [what it outputs]".
If the workflow branches (if_else or switch node), show each branch on its own indented line starting with "→ [Condition]: [downstream path]".
Be specific: name the data fields being passed (e.g., "passes email subject and sender to next step").

CONNECTIONS:
Two to four sentences describing how data travels end-to-end: which field triggers each step, how branch routing is decided, and what the final output is.
${branchingAnalysis.hasBranching ? 'Explicitly state which node reads the routing field, what values map to which branch, and what each branch produces.' : ''}

RULES:
- OBJECTIVE must be one sentence and focus on business value (WHY), not steps (HOW).
- DETAILED_FLOW must describe each node in the selected list — do not add nodes that are not selected.
- Use plain English — avoid jargon. A non-technical user should understand the flow.
- For branching: each branch path must be described separately with its condition and outcome.
${branchingAnalysis.hasBranching ? '- EXPLAIN EACH BRANCH PATH SEPARATELY AND COMPLETELY' : ''}

Generate precise, minimal analysis grounded in the selected nodes and user intent.`;
    }
    /**
     * Build branching-specific instructions for AI prompt
     */
    buildBranchingInstructions(branchingAnalysis) {
        const instructions = [];
        for (const branch of branchingAnalysis.branches) {
            if (branch.branchType === 'binary') {
                instructions.push(`
   - For IF_ELSE node (${branch.nodeId}):
     * Explain the TRUE branch path: what happens when condition is true
     * Explain the FALSE branch path: what happens when condition is false
     * Describe the condition being evaluated
     * Show how data flows through each branch`);
            }
            else if (branch.branchType === 'multi-case') {
                const caseList = branch.cases.map(c => c.caseKey).join(', ');
                instructions.push(`
   - For SWITCH node (${branch.nodeId}):
     * Explain ALL ${branch.cases.length} case branches: ${caseList}
     * Describe what each case represents
     * Show what happens in each case path
     * Explain how the switch value is determined`);
            }
        }
        if (branchingAnalysis.mergePoints.length > 0) {
            instructions.push(`
   - For MERGE points (${branchingAnalysis.mergePoints.join(', ')}):
     * Explain where branches reconverge
     * Describe how data from different branches is combined
     * Show the unified execution path after merge`);
        }
        return instructions.join('\n');
    }
    /**
     * Create AI prompt - LET AI UNDERSTAND EVERYTHING (Legacy method for backward compatibility)
     */
    createAIPrompt(input, nodeContext) {
        const additionalContext = [
            input.useCases?.length ? `Use Cases:\n${input.useCases.join('\n')}` : '',
            input.requirements?.length ? `Requirements:\n${input.requirements.join('\n')}` : '',
            input.branchingLogic ? `Branching Logic:\n${input.branchingLogic}` : '',
        ].filter(Boolean).join('\n\n');
        return `You are an expert workflow architect. Analyze this workflow and generate a comprehensive summary.

USER INTENT:
${input.userPrompt}

SELECTED NODES (execution order):
${nodeContext}

${additionalContext ? `ADDITIONAL CONTEXT:\n${additionalContext}\n` : ''}

TASK: Generate a detailed workflow analysis with these EXACT sections:

1. OBJECTIVE: High-level business goal and purpose of this workflow

2. TRIGGER_DESCRIPTION: How the workflow starts and what initiates it

3. DETAILED_FLOW: Complete step-by-step execution including:
   - Each node's purpose and role in the workflow
   - Input data and processing for each step
   - Decision points and branching logic (if any)
   - All possible execution paths
   - Data flow between nodes
   - Final outcomes and results

4. CONNECTIONS: How nodes connect, route data, and work together

CRITICAL REQUIREMENTS:
- Analyze the user's specific intent and selected nodes
- Make OBJECTIVE and DETAILED_FLOW completely different content
- OBJECTIVE = high-level business purpose
- DETAILED_FLOW = technical step-by-step execution
- Be specific about the actual nodes selected and their roles
- Explain branching logic based on the node sequence
- Focus on the user's specific scenario and requirements
- Generate contextual content that matches the workflow purpose

Generate comprehensive, intelligent analysis based on the user intent and selected nodes.`;
    }
    /**
     * Call AI - PURE AI GENERATION
     */
    async callAI(prompt) {
        const response = await ai_adapter_1.aiAdapter.chat([
            {
                role: 'user',
                content: prompt,
            },
        ], {
            temperature: 0.8, // Higher creativity for better contextual understanding
        });
        return response || '';
    }
    /**
     * Format AI response with branch explanations
     */
    formatAIResponseWithBranches(aiResponse, branchingAnalysis) {
        // Extract sections using flexible patterns
        const objective = this.extractAISection(aiResponse, 'OBJECTIVE') ||
            this.extractAISection(aiResponse, '1.') ||
            'AI-generated workflow objective';
        const triggerDescription = this.extractAISection(aiResponse, 'TRIGGER_DESCRIPTION') ||
            this.extractAISection(aiResponse, '2.') ||
            'AI-generated trigger description';
        const detailedFlow = this.extractAISection(aiResponse, 'DETAILED_FLOW') ||
            this.extractAISection(aiResponse, '3.') ||
            'AI-generated detailed execution flow';
        const connections = this.extractAISection(aiResponse, 'CONNECTIONS') ||
            this.extractAISection(aiResponse, '4.') ||
            'AI-generated connection description';
        // Validate that OBJECTIVE and DETAILED_FLOW are distinct
        if (objective === detailedFlow || this.areSectionsSimilar(objective, detailedFlow)) {
            console.warn('[AI Summary Generator] OBJECTIVE and DETAILED_FLOW are too similar, AI may not have followed instructions');
        }
        // Validate that CONNECTIONS section includes edge information if branching exists
        if (branchingAnalysis.hasBranching && !this.containsEdgeInformation(connections)) {
            console.warn('[AI Summary Generator] CONNECTIONS section missing edge routing information for branching workflow');
        }
        // Return frontend format — section headers must include colons so CapabilityReviewStep parser detects structured mode
        return `WORKFLOW: ${objective}

TRIGGER: ${triggerDescription}

FLOW: ${detailedFlow}

CONNECTIONS: ${connections}`;
    }
    /**
     * Check if two sections are too similar (potential AI instruction failure)
     */
    areSectionsSimilar(section1, section2) {
        const normalize = (text) => text.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();
        const normalized1 = normalize(section1);
        const normalized2 = normalize(section2);
        // Check if one section is a substring of the other (too similar)
        if (normalized1.includes(normalized2) || normalized2.includes(normalized1)) {
            return true;
        }
        // Check word overlap (if >70% words are the same, sections are too similar)
        const words1 = new Set(normalized1.split(/\s+/));
        const words2 = new Set(normalized2.split(/\s+/));
        const intersection = new Set([...words1].filter(w => words2.has(w)));
        const overlapRatio = intersection.size / Math.min(words1.size, words2.size);
        return overlapRatio > 0.7;
    }
    /**
     * Check if connections section contains edge routing information
     */
    containsEdgeInformation(connections) {
        const edgeKeywords = [
            'true branch', 'false branch', 'case', 'branch', 'edge', 'route', 'path',
            'condition', 'merge', 'reconverge', 'true path', 'false path'
        ];
        const normalized = connections.toLowerCase();
        return edgeKeywords.some(keyword => normalized.includes(keyword));
    }
    /**
     * Format AI response - EXTRACT AI SECTIONS (Legacy method for backward compatibility)
     */
    formatAIResponse(aiResponse) {
        // Extract sections using flexible patterns
        const objective = this.extractAISection(aiResponse, 'OBJECTIVE') ||
            this.extractAISection(aiResponse, '1.') ||
            'AI-generated workflow objective';
        const triggerDescription = this.extractAISection(aiResponse, 'TRIGGER_DESCRIPTION') ||
            this.extractAISection(aiResponse, '2.') ||
            'AI-generated trigger description';
        const detailedFlow = this.extractAISection(aiResponse, 'DETAILED_FLOW') ||
            this.extractAISection(aiResponse, '3.') ||
            'AI-generated detailed execution flow';
        const connections = this.extractAISection(aiResponse, 'CONNECTIONS') ||
            this.extractAISection(aiResponse, '4.') ||
            'AI-generated connection description';
        // Return frontend format — section headers must include colons so CapabilityReviewStep parser detects structured mode
        return `WORKFLOW: ${objective}

TRIGGER: ${triggerDescription}

FLOW: ${detailedFlow}

CONNECTIONS: ${connections}`;
    }
    /**
     * Extract section from AI response - FLEXIBLE PARSING
     */
    extractAISection(response, sectionName) {
        const patterns = [
            // Pattern 1: "SECTION_NAME:" followed by content
            new RegExp(`${sectionName}:\\s*([\\s\\S]*?)(?=\\n\\n[A-Z_]+:|\\n\\n\\d+\\.|$)`, 'i'),
            // Pattern 2: "SECTION_NAME" on its own line
            new RegExp(`${sectionName}\\s*\\n([\\s\\S]*?)(?=\\n\\n[A-Z_]+:|\\n\\n\\d+\\.|$)`, 'i'),
            // Pattern 3: Numbered sections "1. SECTION_NAME"
            new RegExp(`\\d+\\.\\s*${sectionName}:?\\s*([\\s\\S]*?)(?=\\n\\n\\d+\\.|$)`, 'i'),
            // Pattern 4: Just the section name followed by content
            new RegExp(`${sectionName}\\s*([\\s\\S]*?)(?=\\n\\n|$)`, 'i'),
        ];
        for (const pattern of patterns) {
            const match = response.match(pattern);
            if (match && match[1] && match[1].trim().length > 10) {
                return match[1].trim();
            }
        }
        return null;
    }
    /**
     * Minimal AI fallback if main AI fails
     */
    async generateMinimalAIFallback(input) {
        try {
            const simplePrompt = `Analyze this workflow: "${input.userPrompt}" with nodes: ${input.nodeChain.join(', ')}. 
      
      Generate a brief summary with:
      - OBJECTIVE: What this workflow does
      - TRIGGER: How it starts  
      - FLOW: Step-by-step execution
      - CONNECTIONS: How nodes connect
      
      Make each section different and specific to the workflow.`;
            const response = await ai_adapter_1.aiAdapter.chat([
                { role: 'user', content: simplePrompt }
            ], { temperature: 0.7 });
            return this.formatAIResponse(response || 'AI-generated workflow summary');
        }
        catch {
            // Absolute minimal fallback
            return `WORKFLOW: ${input.userPrompt}

TRIGGER
Workflow execution begins with the first selected node.

FLOW
Executes ${input.nodeChain.length} nodes in sequence: ${input.nodeChain.join(' → ')}.

CONNECTIONS
Sequential execution with data flow between connected nodes.`;
        }
    }
}
exports.AIDrivenWorkflowSummaryGenerator = AIDrivenWorkflowSummaryGenerator;
// Export singleton instance
exports.aiDrivenWorkflowSummaryGenerator = new AIDrivenWorkflowSummaryGenerator();
