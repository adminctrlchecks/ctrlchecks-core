"use strict";
/**
 * Centralized logging — backed by pino for structured JSON output in production.
 *
 * Exports:
 *   logger          — application logger (debug/info/warn/error/workflow/validation)
 *   httpLogger      — pino-http middleware (attach before routes for per-request logs)
 *   createChildLogger — bind static fields to a child logger (e.g. requestId, workflowId)
 *
 * Production:  JSON lines to stdout (aggregated by CloudWatch / Datadog).
 * Development: pretty-printed if pino-pretty is installed, else JSON.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.httpLogger = exports.logger = void 0;
exports.createChildLogger = createChildLogger;
const pino_1 = __importDefault(require("pino"));
const pino_http_1 = __importDefault(require("pino-http"));
const crypto_1 = require("crypto");
const isDev = process.env.NODE_ENV !== 'production';
const logLevel = (process.env.LOG_LEVEL || (isDev ? 'debug' : 'info')).toLowerCase();
// ── Transport (dev pretty-print, prod JSON) ─────────────────────────────────
let transport;
if (isDev) {
    try {
        require.resolve('pino-pretty');
        transport = {
            target: 'pino-pretty',
            options: {
                colorize: true,
                translateTime: 'SYS:standard',
                ignore: 'pid,hostname,service',
            },
        };
    }
    catch {
        // pino-pretty absent — JSON output used instead
    }
}
// ── Core pino instance ───────────────────────────────────────────────────────
const pinoInstance = (0, pino_1.default)({
    level: logLevel,
    base: { service: 'ctrlchecks-worker' },
    timestamp: pino_1.default.stdTimeFunctions.isoTime,
    ...(transport ? { transport } : {}),
});
// ── Public logger — preserves the existing API used across 31 files ─────────
exports.logger = {
    debug: (...args) => pinoInstance.debug(args.length === 1 ? args[0] : args.join(' ')),
    info: (...args) => pinoInstance.info(args.length === 1 ? args[0] : args.join(' ')),
    warn: (...args) => pinoInstance.warn(args.length === 1 ? args[0] : args.join(' ')),
    error: (...args) => pinoInstance.error(args.length === 1 ? args[0] : args.join(' ')),
    // Structured variants: pass an object as first arg to merge into log record
    debugObj: (obj, msg) => pinoInstance.debug(obj, msg),
    infoObj: (obj, msg) => pinoInstance.info(obj, msg),
    warnObj: (obj, msg) => pinoInstance.warn(obj, msg),
    errorObj: (obj, msg) => pinoInstance.error(obj, msg),
    // Specialised channels — kept for backward-compat callers
    workflow: (...args) => pinoInstance.debug({ channel: 'workflow' }, args.join(' ')),
    validation: (...args) => pinoInstance.debug({ channel: 'validation' }, args.join(' ')),
};
// ── Child logger factory — binds static fields (e.g. requestId, workflowId) ─
function createChildLogger(bindings) {
    const child = pinoInstance.child(bindings);
    return {
        debug: (...args) => child.debug(args.length === 1 ? args[0] : args.join(' ')),
        info: (...args) => child.info(args.length === 1 ? args[0] : args.join(' ')),
        warn: (...args) => child.warn(args.length === 1 ? args[0] : args.join(' ')),
        error: (...args) => child.error(args.length === 1 ? args[0] : args.join(' ')),
        infoObj: (obj, msg) => child.info(obj, msg),
        errorObj: (obj, msg) => child.error(obj, msg),
    };
}
// ── pino-http middleware — logs every HTTP request/response with requestId ───
exports.httpLogger = (0, pino_http_1.default)({
    logger: pinoInstance,
    // Reuse the requestId already stamped by requestIdMiddleware
    genReqId: (req) => req.requestId || (0, crypto_1.randomUUID)(),
    customProps: (req) => ({
        requestId: req.requestId,
    }),
    // Skip health and metrics endpoints to avoid log noise
    autoLogging: {
        ignore: (req) => req.url === '/health' ||
            req.url === '/health/live' ||
            req.url === '/health/ready' ||
            req.url === '/metrics',
    },
    serializers: {
        req: pino_1.default.stdSerializers.req,
        res: pino_1.default.stdSerializers.res,
    },
});
