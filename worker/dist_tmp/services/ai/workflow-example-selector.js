"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.workflowExampleSelector = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const unified_node_registry_1 = require("../../core/registry/unified-node-registry");
const EXAMPLES_DIR = path.resolve(__dirname, '../../data/workflow_examples');
let cachedExamples = null;
function loadExamples() {
    if (cachedExamples)
        return cachedExamples;
    const results = [];
    function walk(dir) {
        if (!fs.existsSync(dir))
            return;
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
            const full = path.join(dir, entry.name);
            if (entry.isDirectory()) {
                walk(full);
            }
            else if (entry.isFile() && entry.name.endsWith('.json')) {
                try {
                    const raw = fs.readFileSync(full, 'utf-8');
                    const ex = JSON.parse(raw);
                    if (ex && ex.id && Array.isArray(ex.nodes)) {
                        results.push(ex);
                    }
                }
                catch {
                    // Structural issues are validated elsewhere
                }
            }
        }
    }
    walk(EXAMPLES_DIR);
    cachedExamples = results;
    return results;
}
function getTriggerType(example) {
    const triggerNode = example.nodes.find((n) => {
        const def = unified_node_registry_1.unifiedNodeRegistry.get(n.type);
        return def?.category === 'trigger' || n.type.includes('trigger');
    });
    return triggerNode ? triggerNode.type : null;
}
function buildExampleKeywords(example) {
    const keywords = new Set();
    const add = (value) => {
        if (!value)
            return;
        value
            .toLowerCase()
            .split(/[^a-z0-9]+/g)
            .filter((t) => t.length > 2)
            .forEach((t) => keywords.add(t));
    };
    add(example.id);
    add(example.category);
    add(example.useCase);
    add(example.title);
    add(example.description);
    for (const node of example.nodes) {
        add(node.type);
        // Registry-driven keyword enrichment (single source of truth)
        const def = unified_node_registry_1.unifiedNodeRegistry.get(node.type);
        if (def) {
            (def.tags || []).forEach((t) => add(t));
            const crit = def.aiSelectionCriteria;
            crit?.keywords?.forEach((k) => add(k));
            crit?.useCases?.forEach((u) => add(u));
            crit?.whenToUse?.forEach((w) => add(w));
        }
    }
    return keywords;
}
function scoreExample(example, ctx) {
    const prompt = (ctx.normalizedPrompt || ctx.prompt || '').toLowerCase();
    const tokens = prompt
        .split(/[^a-z0-9]+/g)
        .filter((t) => t.length > 2);
    const exampleKeywords = buildExampleKeywords(example);
    let overlapCount = 0;
    for (const token of tokens) {
        if (exampleKeywords.has(token)) {
            overlapCount += 1;
        }
    }
    const keywordScore = Math.min(overlapCount / 5, 1); // cap contribution
    // Trigger match
    const exampleTrigger = getTriggerType(example);
    const triggerMatch = !!ctx.triggerType && !!exampleTrigger && ctx.triggerType === exampleTrigger;
    const triggerScore = triggerMatch ? 0.3 : 0;
    // Use-case / intent match
    let useCaseMatch = false;
    let useCaseScore = 0;
    if (ctx.intent && example.useCase) {
        // Map new WorkflowIntent types to use case patterns
        const mapping = {
            'write_workflow': ['webhook_pipeline', 'email_automation', 'lead_capture'],
            'sync_workflow': ['spreadsheet_logging', 'backup', 'etl'],
            'ai_workflow': ['ai_chatbot', 'ai_processing', 'rag'],
            'automation_workflow': ['spreadsheet_logging', 'backup', 'webhook_pipeline', 'lead_capture'],
            'read_workflow': ['spreadsheet_logging', 'backup'],
            'conditional_workflow': ['lead_capture', 'webhook_pipeline'],
        };
        const candidates = mapping[ctx.intent.intent] || [];
        if (candidates.includes(example.useCase)) {
            useCaseMatch = true;
            useCaseScore = 0.3;
        }
    }
    // Integration keyword boost (Slack, Sheets, HubSpot)
    let integrationScore = 0;
    const hasSlack = tokens.includes('slack');
    const hasSheets = tokens.includes('sheets') || tokens.includes('sheet');
    const hasHubspot = tokens.includes('hubspot') || tokens.includes('crm');
    const hasGmail = tokens.includes('gmail');
    const hasStripe = tokens.includes('stripe');
    const hasBigQuery = tokens.includes('bigquery') || tokens.includes('warehouse');
    const hasDocs = tokens.includes('doc') || tokens.includes('document') || tokens.includes('proposal');
    const nodeTypes = new Set(example.nodes.map((n) => n.type));
    if (hasSlack && nodeTypes.has('slack_message'))
        integrationScore += 0.15;
    if (hasSheets && nodeTypes.has('google_sheets'))
        integrationScore += 0.15;
    if (hasHubspot && nodeTypes.has('hubspot'))
        integrationScore += 0.15;
    if (hasGmail && nodeTypes.has('google_gmail'))
        integrationScore += 0.15;
    if (hasStripe && nodeTypes.has('stripe'))
        integrationScore += 0.15;
    if (hasBigQuery && nodeTypes.has('google_bigquery'))
        integrationScore += 0.15;
    if (hasDocs && nodeTypes.has('google_doc'))
        integrationScore += 0.15;
    integrationScore = Math.min(integrationScore, 0.35);
    const totalScore = Math.min(keywordScore * 0.5 + triggerScore + useCaseScore + integrationScore, 1);
    return {
        example,
        score: totalScore,
        triggerMatch,
        useCaseMatch,
        keywordScore,
    };
}
class WorkflowExampleSelector {
    constructor() {
        this.examples = loadExamples();
        console.log(`📚 [Planner] Loaded ${this.examples.length} canonical workflow examples for planning.`);
    }
    getAllExamples() {
        return this.examples;
    }
    selectBestExample(ctx) {
        if (!this.examples.length)
            return null;
        let best = null;
        for (const ex of this.examples) {
            const scored = scoreExample(ex, ctx);
            if (!best || scored.score > best.score) {
                best = scored;
            }
        }
        // Require a minimum threshold to avoid bad matches
        const THRESHOLD = 0.55;
        if (!best || best.score < THRESHOLD) {
            return null;
        }
        return best;
    }
}
exports.workflowExampleSelector = new WorkflowExampleSelector();
