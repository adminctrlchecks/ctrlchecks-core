"use strict";
/**
 * Error Prevention Validators - Central Export
 *
 * ✅ CRITICAL: All error prevention validators exported from here
 *
 * This module provides universal validators that prevent all 5 critical errors:
 * - Error #1: Invalid source handle for branching nodes
 * - Error #2: Workflow execution order incorrect
 * - Error #3: Multiple outgoing edges from non-branching nodes
 * - Error #4: Orphan nodes not reconnected
 * - Error #5: Parallel branches from multiple sources
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExecutionOrderBuilder = exports.executionOrderBuilder = exports.EdgeCreationValidator = exports.edgeCreationValidator = exports.UniversalCategoryResolver = exports.universalCategoryResolver = exports.UniversalBranchingValidator = exports.universalBranchingValidator = exports.UniversalHandleResolver = exports.universalHandleResolver = void 0;
var universal_handle_resolver_1 = require("../utils/universal-handle-resolver");
Object.defineProperty(exports, "universalHandleResolver", { enumerable: true, get: function () { return universal_handle_resolver_1.universalHandleResolver; } });
Object.defineProperty(exports, "UniversalHandleResolver", { enumerable: true, get: function () { return universal_handle_resolver_1.UniversalHandleResolver; } });
var universal_branching_validator_1 = require("../validation/universal-branching-validator");
Object.defineProperty(exports, "universalBranchingValidator", { enumerable: true, get: function () { return universal_branching_validator_1.universalBranchingValidator; } });
Object.defineProperty(exports, "UniversalBranchingValidator", { enumerable: true, get: function () { return universal_branching_validator_1.UniversalBranchingValidator; } });
var universal_category_resolver_1 = require("../utils/universal-category-resolver");
Object.defineProperty(exports, "universalCategoryResolver", { enumerable: true, get: function () { return universal_category_resolver_1.universalCategoryResolver; } });
Object.defineProperty(exports, "UniversalCategoryResolver", { enumerable: true, get: function () { return universal_category_resolver_1.UniversalCategoryResolver; } });
var edge_creation_validator_1 = require("../validation/edge-creation-validator");
Object.defineProperty(exports, "edgeCreationValidator", { enumerable: true, get: function () { return edge_creation_validator_1.edgeCreationValidator; } });
Object.defineProperty(exports, "EdgeCreationValidator", { enumerable: true, get: function () { return edge_creation_validator_1.EdgeCreationValidator; } });
var execution_order_builder_1 = require("../execution/execution-order-builder");
Object.defineProperty(exports, "executionOrderBuilder", { enumerable: true, get: function () { return execution_order_builder_1.executionOrderBuilder; } });
Object.defineProperty(exports, "ExecutionOrderBuilder", { enumerable: true, get: function () { return execution_order_builder_1.ExecutionOrderBuilder; } });
