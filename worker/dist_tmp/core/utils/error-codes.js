"use strict";
/**
 * Structured Error Codes
 *
 * ✅ CRITICAL: Standardized error codes for frontend mapping
 *
 * Instead of raw messages, use structured codes that frontend can map to UX.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ErrorCode = void 0;
exports.createError = createError;
exports.isRecoverableError = isRecoverableError;
var ErrorCode;
(function (ErrorCode) {
    // Graph errors
    ErrorCode["GRAPH_PARSE_ERROR"] = "GRAPH_PARSE_ERROR";
    ErrorCode["GRAPH_INVALID_STRUCTURE"] = "GRAPH_INVALID_STRUCTURE";
    /** Post-generation attach-inputs must not change node/edge structure */
    ErrorCode["TOPOLOGY_MUTATION_BLOCKED_CONFIGURING_INPUTS"] = "TOPOLOGY_MUTATION_BLOCKED_CONFIGURING_INPUTS";
    /** attach-credentials must not change node/edge structure */
    ErrorCode["TOPOLOGY_MUTATION_BLOCKED_ATTACH_CREDENTIALS"] = "TOPOLOGY_MUTATION_BLOCKED_ATTACH_CREDENTIALS";
    ErrorCode["GRAPH_MISSING_NODES"] = "GRAPH_MISSING_NODES";
    ErrorCode["GRAPH_MISSING_EDGES"] = "GRAPH_MISSING_EDGES";
    ErrorCode["GRAPH_DUPLICATE_NODE_ID"] = "GRAPH_DUPLICATE_NODE_ID";
    ErrorCode["GRAPH_INVALID_EDGE_REFERENCE"] = "GRAPH_INVALID_EDGE_REFERENCE";
    // Node errors
    ErrorCode["NODE_SCHEMA_INVALID"] = "NODE_SCHEMA_INVALID";
    ErrorCode["NODE_TYPE_UNKNOWN"] = "NODE_TYPE_UNKNOWN";
    ErrorCode["NODE_MISSING_REQUIRED_FIELD"] = "NODE_MISSING_REQUIRED_FIELD";
    ErrorCode["NODE_INVALID_FIELD_TYPE"] = "NODE_INVALID_FIELD_TYPE";
    // Input errors
    ErrorCode["MISSING_INPUT"] = "MISSING_INPUT";
    ErrorCode["INVALID_INPUT"] = "INVALID_INPUT";
    ErrorCode["INVALID_INPUT_FORMAT"] = "INVALID_INPUT_FORMAT";
    ErrorCode["INPUT_FIELD_NOT_IN_SCHEMA"] = "INPUT_FIELD_NOT_IN_SCHEMA";
    ErrorCode["INPUT_CREDENTIAL_FIELD_REJECTED"] = "INPUT_CREDENTIAL_FIELD_REJECTED";
    // Credential errors
    ErrorCode["MISSING_CREDENTIAL"] = "MISSING_CREDENTIAL";
    ErrorCode["INVALID_CREDENTIAL_FORMAT"] = "INVALID_CREDENTIAL_FORMAT";
    ErrorCode["CREDENTIAL_INJECTION_FAILED"] = "CREDENTIAL_INJECTION_FAILED";
    ErrorCode["OAUTH_NOT_CONNECTED"] = "OAUTH_NOT_CONNECTED";
    ErrorCode["GOOGLE_AUTH_REQUIRED"] = "GOOGLE_AUTH_REQUIRED";
    // Workflow errors
    ErrorCode["WORKFLOW_NOT_FOUND"] = "WORKFLOW_NOT_FOUND";
    ErrorCode["WORKFLOW_INVALID_PHASE"] = "WORKFLOW_INVALID_PHASE";
    ErrorCode["WORKFLOW_ALREADY_EXECUTING"] = "WORKFLOW_ALREADY_EXECUTING";
    ErrorCode["WORKFLOW_NOT_READY"] = "WORKFLOW_NOT_READY";
    ErrorCode["WORKFLOW_VALIDATION_FAILED"] = "WORKFLOW_VALIDATION_FAILED";
    // Phase errors
    ErrorCode["PHASE_LOCKED"] = "PHASE_LOCKED";
    ErrorCode["PHASE_MISMATCH"] = "PHASE_MISMATCH";
    ErrorCode["INVALID_PHASE"] = "INVALID_PHASE";
    ErrorCode["DUPLICATE_ATTACH_CALL"] = "DUPLICATE_ATTACH_CALL";
    // Execution errors
    ErrorCode["EXECUTION_NOT_READY"] = "EXECUTION_NOT_READY";
    ErrorCode["EXECUTION_MISSING_INPUTS"] = "EXECUTION_MISSING_INPUTS";
    ErrorCode["EXECUTION_MISSING_CREDENTIALS"] = "EXECUTION_MISSING_CREDENTIALS";
    ErrorCode["EXECUTION_FAILED"] = "EXECUTION_FAILED";
    ErrorCode["RUN_ALREADY_ACTIVE"] = "RUN_ALREADY_ACTIVE";
    ErrorCode["EXECUTION_TIMEOUT"] = "EXECUTION_TIMEOUT";
    // Generic errors
    ErrorCode["INTERNAL_ERROR"] = "INTERNAL_ERROR";
    ErrorCode["UNAUTHORIZED"] = "UNAUTHORIZED";
    ErrorCode["BAD_REQUEST"] = "BAD_REQUEST";
})(ErrorCode || (exports.ErrorCode = ErrorCode = {}));
function createError(code, message, details, recoverable = false) {
    return {
        code,
        message,
        details,
        recoverable,
    };
}
function isRecoverableError(error) {
    return error.recoverable === true;
}
