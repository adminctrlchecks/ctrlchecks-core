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
exports.isSetupPending = isSetupPending;
exports.setupPendingResponse = setupPendingResponse;
exports.assertVisibleWorkflow = assertVisibleWorkflow;
exports.setupDraftWorkflowHandler = setupDraftWorkflowHandler;
exports.commitSetupWorkflowHandler = commitSetupWorkflowHandler;
const aws_db_client_1 = require("../core/database/aws-db-client");
const workflow_save_validator_1 = require("../core/validation/workflow-save-validator");
const workflow_graph_state_1 = require("./workflow-graph-state");
const workflow_lifecycle_manager_1 = require("../services/workflow-lifecycle-manager");
const subscription_service_1 = require("../services/subscription-service");
const gemini_wallet_service_1 = require("../services/ai/gemini-wallet-service");
const redisGetCache_1 = require("../middleware/redisGetCache");
function isSetupPending(workflow) {
    if (!workflow)
        return false;
    if (workflow.setup_completed === false)
        return true;
    const metadata = workflow.metadata && typeof workflow.metadata === 'object' ? workflow.metadata : {};
    return Boolean(metadata?.aiSetup?.pending === true);
}
function setupPendingResponse(workflowId) {
    return {
        code: 'WORKFLOW_SETUP_PENDING',
        error: 'Workflow setup is not complete',
        message: 'Finish the workflow setup before opening or running this workflow.',
        workflowId,
    };
}
function assertVisibleWorkflow(workflow) {
    if (isSetupPending(workflow)) {
        const err = new Error('Workflow setup is not complete');
        err.statusCode = 409;
        err.body = setupPendingResponse(workflow?.id);
        throw err;
    }
}
async function requireUserId(req) {
    const { requireAuthenticatedUser } = await Promise.resolve().then(() => __importStar(require('../core/utils/check-google-auth')));
    return requireAuthenticatedUser(req);
}
function metadataWithPendingMarker(metadata, pending) {
    const base = metadata && typeof metadata === 'object' && !Array.isArray(metadata)
        ? { ...metadata }
        : {};
    const aiSetup = base.aiSetup && typeof base.aiSetup === 'object' && !Array.isArray(base.aiSetup)
        ? { ...base.aiSetup }
        : {};
    base.aiSetup = {
        ...aiSetup,
        pending,
        stage: pending ? 'ai_setup_pending' : 'complete',
        updatedAt: new Date().toISOString(),
    };
    return base;
}
async function setupDraftWorkflowHandler(req, res) {
    const db = (0, aws_db_client_1.getDbClient)();
    let userId;
    try {
        userId = await requireUserId(req);
    }
    catch (authError) {
        return res.status(401).json(authError);
    }
    const { workflowId, name, nodes, edges, metadata } = req.body || {};
    if (!Array.isArray(nodes) || !Array.isArray(edges)) {
        return res.status(400).json({
            code: 'INVALID_WORKFLOW_SETUP_DRAFT',
            error: 'Invalid workflow structure',
            message: 'nodes and edges must be arrays',
        });
    }
    const normalized = (0, workflow_save_validator_1.normalizeWorkflowForSave)(nodes, edges);
    const validation = (0, workflow_save_validator_1.validateWorkflowForSave)(normalized.nodes, normalized.edges, {
        freezeBoundary: { frozen: false },
    });
    if (!validation.canSave) {
        return res.status(400).json({
            code: 'WORKFLOW_SETUP_DRAFT_INVALID',
            error: 'Workflow validation failed',
            message: `Cannot create setup draft: ${validation.errors.join('; ')}`,
            details: { errors: validation.errors, warnings: validation.warnings },
        });
    }
    const mergedMetadata = metadataWithPendingMarker(metadata, true);
    const workflowData = {
        name: typeof name === 'string' && name.trim() ? name.trim() : 'AI Generated Workflow',
        nodes: normalized.nodes,
        edges: normalized.edges,
        graph: (0, workflow_graph_state_1.buildSyncedGraphPayload)(normalized.nodes, normalized.edges, mergedMetadata),
        metadata: mergedMetadata,
        user_id: userId,
        status: 'draft',
        phase: 'draft',
        confirmed: false,
        setup_completed: false,
        setup_stage: 'ai_setup_pending',
        setup_completed_at: null,
        updated_at: new Date().toISOString(),
        schema_version: 2,
    };
    if (workflowId) {
        const { data: existing, error: existingError } = await db
            .from('workflows')
            .select('*')
            .eq('id', workflowId)
            .single();
        if (existingError || !existing) {
            const { data, error } = await db
                .from('workflows')
                .insert({ id: workflowId, ...workflowData })
                .select()
                .single();
            if (error) {
                return res.status(500).json({ error: 'Failed to create setup draft', message: error.message });
            }
            return res.json({ success: true, workflowId: data.id, workflow: data, validation });
        }
        if (existing.user_id !== userId) {
            return res.status(403).json({ error: 'Forbidden', workflowId });
        }
        if (!isSetupPending(existing)) {
            return res.status(409).json({
                code: 'WORKFLOW_ALREADY_COMMITTED',
                error: 'Workflow setup is already complete',
                workflowId,
            });
        }
        const { data, error } = await db
            .from('workflows')
            .update(workflowData)
            .eq('id', workflowId)
            .select()
            .single();
        if (error) {
            return res.status(500).json({ error: 'Failed to update setup draft', message: error.message });
        }
        return res.json({ success: true, workflowId: data.id, workflow: data, validation });
    }
    const { data, error } = await db
        .from('workflows')
        .insert(workflowData)
        .select()
        .single();
    if (error) {
        return res.status(500).json({ error: 'Failed to create setup draft', message: error.message });
    }
    return res.json({ success: true, workflowId: data.id, workflow: data, validation });
}
// Deduplicate concurrent commit-setup calls for the same workflow.
// Each workflowId maps to the promise of the in-progress handler so that later
// concurrent callers wait for the first one and return the same result instead of
// all racing to write conflicting DB snapshots.
const commitSetupInFlight = new Map();
async function runCommitSetupWorkflow(req) {
    const db = (0, aws_db_client_1.getDbClient)();
    let userId;
    try {
        userId = await requireUserId(req);
    }
    catch (authError) {
        return { statusCode: 401, body: authError };
    }
    const { workflowId } = req.params;
    const { data: workflow, error } = await db
        .from('workflows')
        .select('*')
        .eq('id', workflowId)
        .single();
    if (error || !workflow) {
        return { statusCode: 404, body: { error: 'Workflow not found', workflowId } };
    }
    if (workflow.user_id !== userId) {
        return { statusCode: 403, body: { error: 'Forbidden', workflowId } };
    }
    const graph = (0, workflow_graph_state_1.resolveWorkflowGraphState)(workflow);
    const candidate = {
        nodes: Array.isArray(graph.nodes) ? graph.nodes : [],
        edges: Array.isArray(graph.edges) ? graph.edges : [],
        metadata: workflow.metadata || {},
    };
    const readiness = await workflow_lifecycle_manager_1.workflowLifecycleManager.validateExecutionReady(candidate, userId);
    if (!readiness.ready) {
        const credentialOnlyFailure = readiness.structurallyValid === true &&
            (readiness.missingCredentials?.length ?? 0) > 0;
        if (!credentialOnlyFailure) {
            const errorSummary = readiness.errors?.length
                ? readiness.errors.join(' | ')
                : 'Workflow setup is incomplete';
            return { statusCode: 409, body: {
                    code: 'WORKFLOW_SETUP_INCOMPLETE',
                    error: 'Workflow setup is incomplete',
                    message: errorSummary,
                    workflowId,
                    details: readiness,
                } };
        }
        const wasSetupPendingSoft = isSetupPending(workflow);
        const walletActiveSoft = await gemini_wallet_service_1.geminiWalletService.isActive(userId).catch(() => false);
        if (wasSetupPendingSoft) {
            await subscription_service_1.subscriptionService.ensureFreeSubscription(userId);
            const canCreateWorkflow = walletActiveSoft || await subscription_service_1.subscriptionService.canCreateWorkflow(userId);
            if (!canCreateWorkflow) {
                const usage = await subscription_service_1.subscriptionService.getSubscriptionUsage(userId);
                return { statusCode: 403, body: {
                        code: 'WORKFLOW_LIMIT_EXCEEDED',
                        error: 'Workflow Limit Exceeded',
                        message: `You've reached your workflow limit (${usage.workflowLimit}). Upgrade your plan to create more workflows.`,
                        details: usage,
                    } };
            }
        }
        const softMetadata = metadataWithPendingMarker(workflow.metadata, false);
        const { error: softUpdateError } = await db
            .from('workflows')
            .update({
            status: 'active',
            phase: 'ready_for_ownership',
            confirmed: true,
            setup_completed: true,
            setup_stage: 'credentials_pending',
            setup_completed_at: new Date().toISOString(),
            metadata: softMetadata,
            quota_source: walletActiveSoft ? 'gemini_wallet' : 'subscription',
            updated_at: new Date().toISOString(),
        })
            .eq('id', workflowId);
        if (softUpdateError) {
            return { statusCode: 500, body: { error: 'Failed to commit workflow setup', message: softUpdateError.message } };
        }
        const cacheClientSoft = await (0, redisGetCache_1.getCacheRedisClient)(process.env.REDIS_URL || 'redis://redis:6379');
        if (cacheClientSoft) {
            await (0, redisGetCache_1.invalidateWorkflowDbCache)(cacheClientSoft).catch(() => { });
        }
        if (wasSetupPendingSoft && !walletActiveSoft) {
            await subscription_service_1.subscriptionService.incrementWorkflowCount(userId);
        }
        return { statusCode: 200, body: {
                success: true,
                workflowId,
                credentialsPending: true,
                missingCredentials: readiness.missingCredentials,
                phase: 'ready_for_ownership',
            } };
    }
    const wasSetupPending = isSetupPending(workflow);
    const walletActive = await gemini_wallet_service_1.geminiWalletService.isActive(userId).catch(() => false);
    if (wasSetupPending) {
        await subscription_service_1.subscriptionService.ensureFreeSubscription(userId);
        const canCreateWorkflow = walletActive || await subscription_service_1.subscriptionService.canCreateWorkflow(userId);
        if (!canCreateWorkflow) {
            const usage = await subscription_service_1.subscriptionService.getSubscriptionUsage(userId);
            return { statusCode: 403, body: {
                    code: 'WORKFLOW_LIMIT_EXCEEDED',
                    error: 'Workflow Limit Exceeded',
                    message: `You've reached your workflow limit (${usage.workflowLimit}). Upgrade your plan to create more workflows.`,
                    details: usage,
                } };
        }
    }
    const existingMigrationsForCommit = workflow?.metadata?.appliedMigrations ?? [];
    const normalizedForCommit = (0, workflow_save_validator_1.normalizeWorkflowForSave)(candidate.nodes, candidate.edges, {
        structuralMode: 'configOnly',
        alreadyApplied: existingMigrationsForCommit,
    });
    const allMigrationsAfterCommit = Array.from(new Set([
        ...existingMigrationsForCommit,
        ...normalizedForCommit.migrationsApplied,
    ]));
    const metadata = {
        ...metadataWithPendingMarker(workflow.metadata, false),
        appliedMigrations: allMigrationsAfterCommit,
    };
    const { data: updated, error: updateError } = await db
        .from('workflows')
        .update({
        status: 'active',
        phase: 'ready_for_execution',
        confirmed: true,
        setup_completed: true,
        setup_stage: 'complete',
        setup_completed_at: new Date().toISOString(),
        metadata,
        quota_source: walletActive ? 'gemini_wallet' : 'subscription',
        graph: (0, workflow_graph_state_1.buildSyncedGraphPayload)(normalizedForCommit.nodes, normalizedForCommit.edges, metadata),
        nodes: normalizedForCommit.nodes,
        edges: normalizedForCommit.edges,
        updated_at: new Date().toISOString(),
    })
        .eq('id', workflowId)
        .select()
        .single();
    if (updateError) {
        return { statusCode: 500, body: { error: 'Failed to commit workflow setup', message: updateError.message } };
    }
    const cacheClient = await (0, redisGetCache_1.getCacheRedisClient)(process.env.REDIS_URL || 'redis://redis:6379');
    if (cacheClient) {
        await (0, redisGetCache_1.invalidateWorkflowDbCache)(cacheClient).catch(() => { });
    }
    if (wasSetupPending && !walletActive) {
        await subscription_service_1.subscriptionService.incrementWorkflowCount(userId);
    }
    return { statusCode: 200, body: {
            success: true,
            workflowId,
            workflow: updated,
            status: updated.status,
            phase: updated.phase,
            ready: true,
        } };
}
async function commitSetupWorkflowHandler(req, res) {
    const { workflowId } = req.params;
    if (!workflowId) {
        return res.status(400).json({ error: 'Missing workflowId' });
    }
    if (commitSetupInFlight.has(workflowId)) {
        const result = await commitSetupInFlight.get(workflowId);
        return res.status(result.statusCode).json(result.body);
    }
    let resolveDedup;
    const dedupPromise = new Promise((r) => (resolveDedup = r));
    commitSetupInFlight.set(workflowId, dedupPromise);
    try {
        const result = await runCommitSetupWorkflow(req);
        resolveDedup(result);
        return res.status(result.statusCode).json(result.body);
    }
    catch (err) {
        const errResult = { statusCode: 500, body: { error: 'commit-setup failed', message: err?.message } };
        resolveDedup(errResult);
        return res.status(500).json(errResult.body);
    }
    finally {
        commitSetupInFlight.delete(workflowId);
    }
}
