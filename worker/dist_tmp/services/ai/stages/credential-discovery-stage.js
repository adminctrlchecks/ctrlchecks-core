"use strict";
/**
 * Credential Discovery Stage — AI-First Pipeline (Stage 8)
 *
 * Thin wrapper around credentialDiscoveryPhase.discoverCredentials().
 * Runs after validation to discover all credentials required by the workflow.
 * Non-blocking: pipeline returns the workflow even if this stage fails.
 *
 * Requirements: 2.6, 3.7
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.runCredentialDiscoveryStage = runCredentialDiscoveryStage;
const credential_discovery_phase_1 = require("../credential-discovery-phase");
const logger_1 = require("../../../core/logger");
// ─── Credential Discovery Stage ──────────────────────────────────────────────
async function runCredentialDiscoveryStage(workflow, userId, correlationId) {
    const startedAt = Date.now();
    logger_1.logger.info({
        event: 'ai_pipeline_stage_start',
        stage: 'credential_discovery',
        correlationId,
        inputSummary: `nodes=${workflow.nodes.length}`,
    });
    try {
        const result = await credential_discovery_phase_1.credentialDiscoveryPhase.discoverCredentials(workflow, userId);
        const durationMs = Date.now() - startedAt;
        logger_1.logger.info({
            event: 'ai_pipeline_stage_end',
            stage: 'credential_discovery',
            correlationId,
            outputSummary: `required=${result.requiredCredentials.length}, missing=${(result.missingCredentials ?? []).length}`,
            durationMs,
        });
        return {
            ok: true,
            requiredCredentials: result.requiredCredentials,
            missingCredentials: result.missingCredentials ?? [],
            satisfiedCredentials: result.satisfiedCredentials ?? [],
            durationMs,
        };
    }
    catch (error) {
        const durationMs = Date.now() - startedAt;
        const message = error instanceof Error ? error.message : String(error);
        logger_1.logger.error({
            event: 'ai_pipeline_stage_error',
            stage: 'credential_discovery',
            correlationId,
            error: 'CREDENTIAL_DISCOVERY_FAILED',
            message,
        });
        return {
            ok: false,
            code: 'CREDENTIAL_DISCOVERY_FAILED',
            errors: [message],
            durationMs,
        };
    }
}
