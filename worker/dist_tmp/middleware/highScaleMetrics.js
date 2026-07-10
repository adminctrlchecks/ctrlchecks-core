"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.kafkaQueueDepth = void 0;
exports.setExecutionQueueDepth = setExecutionQueueDepth;
exports.incExecutionJob = incExecutionJob;
exports.setWsRedisBridgeActive = setWsRedisBridgeActive;
exports.incCredentialDelegation = incCredentialDelegation;
exports.incNotificationDelegation = incNotificationDelegation;
exports.incExecutionEngineDelegation = incExecutionEngineDelegation;
exports.incTriggerServiceDelegation = incTriggerServiceDelegation;
exports.incWorkflowCrudDelegation = incWorkflowCrudDelegation;
exports.routeLabel = routeLabel;
exports.requestMetricsMiddleware = requestMetricsMiddleware;
exports.metricsHandler = metricsHandler;
exports.setKafkaQueueDepth = setKafkaQueueDepth;
const prom_client_1 = __importDefault(require("prom-client"));
const db_pool_1 = require("../core/database/db-pool");
const register = new prom_client_1.default.Registry();
prom_client_1.default.collectDefaultMetrics({ register, prefix: 'ctrlchecks_' });
const httpRequests = new prom_client_1.default.Counter({
    name: 'ctrlchecks_http_requests_total',
    help: 'Total HTTP requests handled by the worker.',
    labelNames: ['method', 'route', 'status'],
    registers: [register],
});
const httpDuration = new prom_client_1.default.Histogram({
    name: 'ctrlchecks_http_request_duration_seconds',
    help: 'HTTP request duration in seconds.',
    labelNames: ['method', 'route', 'status'],
    buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10, 30],
    registers: [register],
});
const dbPoolUtilization = new prom_client_1.default.Gauge({
    name: 'ctrlchecks_db_pool_utilization_percent',
    help: 'PostgreSQL pool utilization percentage.',
    registers: [register],
});
const dbPoolWaiting = new prom_client_1.default.Gauge({
    name: 'ctrlchecks_db_pool_waiting_connections',
    help: 'PostgreSQL pool waiting connection count.',
    registers: [register],
});
exports.kafkaQueueDepth = new prom_client_1.default.Gauge({
    name: 'ctrlchecks_kafka_request_queue_depth',
    help: 'Estimated request-queue depth reported by workers.',
    registers: [register],
});
const executionQueueDepth = new prom_client_1.default.Gauge({
    name: 'ctrlchecks_execution_queue_depth',
    help: 'Current depth of the shared execution queue (Redis sorted set).',
    registers: [register],
});
const executionJobs = new prom_client_1.default.Counter({
    name: 'ctrlchecks_execution_jobs_total',
    help: 'Total execution jobs processed by the worker, by status.',
    labelNames: ['status'],
    registers: [register],
});
const wsRedisBridgeActive = new prom_client_1.default.Gauge({
    name: 'ctrlchecks_ws_redis_bridge_active',
    help: 'Number of active WebSocket connections tracked by the Redis bridge.',
    registers: [register],
});
const credentialServiceDelegation = new prom_client_1.default.Counter({
    name: 'ctrlchecks_credential_service_delegation_total',
    help: 'Canary delegation results to credential-service.',
    labelNames: ['result'],
    registers: [register],
});
const notificationServiceDelegation = new prom_client_1.default.Counter({
    name: 'ctrlchecks_notification_service_delegation_total',
    help: 'Canary delegation results to notification-service.',
    labelNames: ['result'],
    registers: [register],
});
const executionEngineDelegation = new prom_client_1.default.Counter({
    name: 'ctrlchecks_execution_engine_delegation_total',
    help: 'Canary delegation results to execution-engine.',
    labelNames: ['result'],
    registers: [register],
});
const triggerServiceDelegation = new prom_client_1.default.Counter({
    name: 'ctrlchecks_trigger_service_delegation_total',
    help: 'Canary delegation results to trigger-service.',
    labelNames: ['result'],
    registers: [register],
});
const workflowCrudDelegation = new prom_client_1.default.Counter({
    name: 'ctrlchecks_workflow_crud_delegation_total',
    help: 'Canary delegation results to workflow-crud-service.',
    labelNames: ['result'],
    registers: [register],
});
// ── Exported increment helpers (call from service clients) ───────────────────
function setExecutionQueueDepth(depth) {
    executionQueueDepth.set(Math.max(0, depth));
}
function incExecutionJob(status) {
    executionJobs.inc({ status });
}
function setWsRedisBridgeActive(count) {
    wsRedisBridgeActive.set(Math.max(0, count));
}
function incCredentialDelegation(result) {
    credentialServiceDelegation.inc({ result });
}
function incNotificationDelegation(result) {
    notificationServiceDelegation.inc({ result });
}
function incExecutionEngineDelegation(result) {
    executionEngineDelegation.inc({ result });
}
function incTriggerServiceDelegation(result) {
    triggerServiceDelegation.inc({ result });
}
function incWorkflowCrudDelegation(result) {
    workflowCrudDelegation.inc({ result });
}
/**
 * Normalizes high-cardinality URLs into a bounded route label for Prometheus.
 */
function routeLabel(req) {
    return req.route?.path ? String(req.baseUrl || '') + String(req.route.path) : req.path;
}
/**
 * Records request count and duration metrics after the response is sent.
 */
function requestMetricsMiddleware(req, res, next) {
    const end = httpDuration.startTimer();
    res.on('finish', () => {
        const labels = {
            method: req.method,
            route: routeLabel(req),
            status: String(res.statusCode),
        };
        httpRequests.inc(labels);
        end(labels);
    });
    next();
}
/**
 * Renders all collected metrics in Prometheus exposition format.
 */
async function metricsHandler(_req, res) {
    const pool = (0, db_pool_1.getPoolStats)();
    dbPoolUtilization.set(pool.utilization);
    dbPoolWaiting.set(pool.waitingCount);
    res.setHeader('Content-Type', register.contentType);
    res.send(await register.metrics());
}
/**
 * Updates the exported queue-depth gauge from Kafka workers or queue probes.
 */
function setKafkaQueueDepth(depth) {
    exports.kafkaQueueDepth.set(Math.max(0, depth));
}
