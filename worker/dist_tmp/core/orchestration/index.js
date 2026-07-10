"use strict";
/**
 * ✅ UNIFIED GRAPH ORCHESTRATION - Central Export
 *
 * This module provides the unified orchestration layer for all graph operations.
 *
 * Components:
 * 1. ExecutionOrderManager - Maintains dynamic execution order
 * 2. EdgeReconciliationEngine - Automatically reconciles edges
 * 3. NodeInjectionCoordinator - Unified API for node injections
 * 4. UnifiedGraphOrchestrator - Main coordinator
 *
 * All graph operations MUST go through this orchestrator to ensure:
 * - Execution order and edges are always in sync
 * - No broken connections possible
 * - Linear structure enforced by default
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.unifiedGraphOrchestrator = exports.nodeInjectionCoordinator = exports.edgeReconciliationEngine = exports.executionOrderManager = void 0;
var execution_order_manager_1 = require("./execution-order-manager");
Object.defineProperty(exports, "executionOrderManager", { enumerable: true, get: function () { return execution_order_manager_1.executionOrderManager; } });
var edge_reconciliation_engine_1 = require("./edge-reconciliation-engine");
Object.defineProperty(exports, "edgeReconciliationEngine", { enumerable: true, get: function () { return edge_reconciliation_engine_1.edgeReconciliationEngine; } });
var node_injection_coordinator_1 = require("./node-injection-coordinator");
Object.defineProperty(exports, "nodeInjectionCoordinator", { enumerable: true, get: function () { return node_injection_coordinator_1.nodeInjectionCoordinator; } });
var unified_graph_orchestrator_1 = require("./unified-graph-orchestrator");
Object.defineProperty(exports, "unifiedGraphOrchestrator", { enumerable: true, get: function () { return unified_graph_orchestrator_1.unifiedGraphOrchestrator; } });
