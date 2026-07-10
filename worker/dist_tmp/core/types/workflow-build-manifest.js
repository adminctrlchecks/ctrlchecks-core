"use strict";
/**
 * Workflow Build Manifest V1 — single source of truth for staged AI workflow generation.
 * Persisted on workflow.metadata.buildManifest; used for attach-inputs alignment and audits.
 *
 * Intent shape mirrors StructuredIntent from intent-stage (no runtime import — avoids core↔services cycles).
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.WORKFLOW_BUILD_MANIFEST_VERSION = void 0;
/** Manifest schema version; bump when breaking persisted shape. */
exports.WORKFLOW_BUILD_MANIFEST_VERSION = 1;
