"use strict";
/**
 * Core branching metadata types used at planning/summarization time.
 *
 * These types are intentionally planner-level only:
 * - They describe how many branches exist and what each branch means.
 * - They do NOT encode runtime edge wiring or node-specific logic.
 * - Runtime behavior remains driven by unified-node-registry + orchestrators.
 */
Object.defineProperty(exports, "__esModule", { value: true });
