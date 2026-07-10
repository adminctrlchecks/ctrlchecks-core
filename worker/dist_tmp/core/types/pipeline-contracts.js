"use strict";
/**
 * Pipeline Contracts — Single Source of Truth for Stage Input/Output Types
 *
 * All four stages of WorkflowGenerationPipeline communicate exclusively
 * through these typed contracts. No stage reads state from a non-adjacent stage.
 *
 * Stage flow:
 *   UserPrompt → Stage1Output → Stage2Output → Stage3Output → UI
 */
Object.defineProperty(exports, "__esModule", { value: true });
