"use strict";
/**
 * Operation Semantics Constants
 *
 * ✅ ROOT-LEVEL: Defines semantic meaning of operations (domain knowledge)
 *
 * These constants define what operations mean semantically:
 * - Read operations → dataSource
 * - Write operations → output
 * - Transform operations → transformation
 *
 * This is NOT node-specific logic - it's domain knowledge about operation semantics.
 * All nodes use these same definitions for consistent categorization.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.OUTPUT_KEYWORDS = exports.DATA_SOURCE_KEYWORDS = exports.TRANSFORM_OPERATIONS = exports.WRITE_OPERATIONS = exports.READ_OPERATIONS = void 0;
exports.isReadOperation = isReadOperation;
exports.isWriteOperation = isWriteOperation;
exports.isTransformOperation = isTransformOperation;
/**
 * Read operations - fetch/retrieve data from sources
 * These operations indicate the node is a data source
 */
exports.READ_OPERATIONS = [
    'read',
    'fetch',
    'get',
    'query',
    'retrieve',
    'pull',
    'list',
    'load',
    'download',
    'search',
];
/**
 * Write operations - create/update/send data to destinations
 * These operations indicate the node is an output
 */
exports.WRITE_OPERATIONS = [
    'write',
    'create',
    'update',
    'append',
    'send',
    'notify',
    'delete',
    'remove',
    'post',
    'put',
    'patch',
    'publish',
    'share',
    'upload',
    'submit',
    'execute',
];
/**
 * Transform operations - process/analyze/convert data
 * These operations indicate the node is a transformation
 */
exports.TRANSFORM_OPERATIONS = [
    'transform',
    'process',
    'analyze',
    'summarize',
    'extract',
    'parse',
    'convert',
    'format',
    'classify',
    'translate',
    'generate',
];
/**
 * Data source keywords - used for intent matching
 */
exports.DATA_SOURCE_KEYWORDS = [
    'read',
    'fetch',
    'get',
    'query',
    'retrieve',
    'pull',
    'list',
    'load',
];
/**
 * Output keywords - used for intent matching
 */
exports.OUTPUT_KEYWORDS = [
    'send',
    'write',
    'create',
    'update',
    'notify',
    'post',
    'put',
    'patch',
    'delete',
    'remove',
];
/**
 * Check if an operation is a read operation
 */
function isReadOperation(operation) {
    return exports.READ_OPERATIONS.includes(operation.toLowerCase());
}
/**
 * Check if an operation is a write operation
 */
function isWriteOperation(operation) {
    return exports.WRITE_OPERATIONS.includes(operation.toLowerCase());
}
/**
 * Check if an operation is a transform operation
 */
function isTransformOperation(operation) {
    return exports.TRANSFORM_OPERATIONS.includes(operation.toLowerCase());
}
