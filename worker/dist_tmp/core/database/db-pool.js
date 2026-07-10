"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DbUnavailableError = void 0;
exports.getDbPool = getDbPool;
exports.queryAsUser = queryAsUser;
exports.queryAsService = queryAsService;
exports.getPoolStats = getPoolStats;
exports.isDatabaseReachable = isDatabaseReachable;
const pg_1 = require("pg");
// ─── Pool Configuration ───────────────────────────────────────────────────────
const SLOW_QUERY_MS = 500;
const POOL_WARN_THRESHOLD = 0.8;
let pool = null;
function getDbPool() {
    if (!pool) {
        // Route through PgBouncer when PGBOUNCER_URL is set; direct RDS otherwise.
        // PgBouncer MUST be in session mode (not transaction mode) because:
        //   - queryAsUser() issues SET LOCAL commands (not valid in transaction mode)
        //   - statement_timeout is a session-level setting
        // If switching to transaction mode later, remove statement_timeout and
        // convert queryAsUser() to pass userId as a query parameter instead.
        const rawUrl = process.env.PGBOUNCER_URL || process.env.DATABASE_URL || '';
        const connStr = rawUrl.includes('connect_timeout')
            ? rawUrl
            : `${rawUrl}${rawUrl.includes('?') ? '&' : '?'}connect_timeout=4`;
        if (process.env.PGBOUNCER_URL) {
            console.log('[DB] Routing connections through PgBouncer (session mode)');
        }
        pool = new pg_1.Pool({
            connectionString: connStr,
            ssl: { rejectUnauthorized: false },
            min: 0, // don't maintain idle connections — avoids endless retries when DB is unreachable
            max: 10,
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: 5000, // fail fast if pool is exhausted
            statement_timeout: 30000,
            keepAlive: true, // prevent NAT/firewall silently dropping idle connections
            keepAliveInitialDelayMillis: 10000,
        });
        pool.on('error', (err) => {
            console.error('[DB] Unexpected pool error:', err.message);
        });
        setInterval(() => {
            if (!pool)
                return;
            const { totalCount, idleCount, waitingCount } = pool;
            const utilization = totalCount > 0 ? ((totalCount - idleCount) / totalCount) : 0;
            const level = waitingCount > 0 || utilization >= POOL_WARN_THRESHOLD ? 'warn' : 'info';
            console[level](`[DB] pool — total:${totalCount} idle:${idleCount} waiting:${waitingCount} util:${(utilization * 100).toFixed(0)}%`);
            if (waitingCount > 0) {
                console.error('[DB] ALERT — queries are waiting for a free connection.');
            }
        }, 60000).unref();
        // Background health probe: when the circuit is open, proactively heal it
        // every 60 s instead of waiting for a user request to trigger the retry.
        // Also runs a heartbeat every 5 min during normal operation to catch stale
        // connections early (e.g. after an RDS maintenance window).
        let _lastHeartbeat = 0;
        setInterval(async () => {
            const now = Date.now();
            const circuitIsOpen = now < _circuitOpenUntil;
            const heartbeatIsDue = now - _lastHeartbeat > 5 * 60000;
            if (circuitIsOpen || heartbeatIsDue) {
                const ok = await isDatabaseReachable().catch(() => false);
                if (ok) {
                    _lastHeartbeat = now;
                    if (circuitIsOpen)
                        console.info('[DB] Health probe: circuit healed — DB is reachable again');
                }
                else if (circuitIsOpen) {
                    console.warn('[DB] Health probe: DB still unreachable, circuit remains open');
                }
            }
        }, 60000).unref();
    }
    return pool;
}
// ─── Circuit breaker ──────────────────────────────────────────────────────────
// When the DB is unreachable every call would wait ~4s before timing out.
// After the first failure we open the circuit for 30s so all callers get an
// instant rejection instead of a per-request timeout storm.
let _circuitOpenUntil = 0;
const CIRCUIT_RESET_MS = 30000;
function isConnectionError(err) {
    const msg = (err?.message || '').toLowerCase();
    return (msg.includes('connection terminated') ||
        msg.includes('connect timeout') ||
        msg.includes('econnrefused') ||
        msg.includes('enotfound') ||
        msg.includes('etimedout') ||
        err?.code === 'ECONNREFUSED' ||
        err?.code === 'ETIMEDOUT' ||
        err?.code === 'ENOTFOUND');
}
class DbUnavailableError extends Error {
    constructor() {
        super('Service temporarily unavailable — please try again in a moment.');
        this.code = 'DB_UNAVAILABLE';
        this.statusCode = 503;
    }
}
exports.DbUnavailableError = DbUnavailableError;
async function withCircuit(fn) {
    if (Date.now() < _circuitOpenUntil)
        throw new DbUnavailableError();
    try {
        return await fn();
    }
    catch (err) {
        if (isConnectionError(err)) {
            _circuitOpenUntil = Date.now() + CIRCUIT_RESET_MS;
            console.warn('[DB] Circuit opened — DB unreachable, fast-failing for 30s:', err.message);
            throw new DbUnavailableError();
        }
        throw err;
    }
}
// ─── Instrumented query helpers ───────────────────────────────────────────────
async function runQuery(client, sql, params = []) {
    const start = Date.now();
    const result = await client.query(sql, params);
    const ms = Date.now() - start;
    if (ms > SLOW_QUERY_MS) {
        const preview = sql.replace(/\s+/g, ' ').slice(0, 120);
        console.warn(`[DB] slow query ${ms}ms — ${preview}`);
    }
    return result.rows;
}
/**
 * Run a query with user context set for RLS.
 */
async function queryAsUser(userId, sql, params = []) {
    return withCircuit(async () => {
        const client = await getDbPool().connect();
        try {
            await client.query(`SET LOCAL app.current_user_id = $1`, [userId]);
            await client.query(`SET LOCAL app.current_role = 'authenticated'`);
            return await runQuery(client, sql, params);
        }
        finally {
            client.release();
        }
    });
}
/**
 * Run a query as service role (bypasses RLS user context).
 */
async function queryAsService(sql, params = []) {
    return withCircuit(() => runQuery(getDbPool(), sql, params));
}
// ─── Pool stats / reachability ────────────────────────────────────────────────
function getPoolStats() {
    if (!pool)
        return { totalCount: 0, idleCount: 0, waitingCount: 0, utilization: 0 };
    const { totalCount, idleCount, waitingCount } = pool;
    const utilization = totalCount > 0 ? (totalCount - idleCount) / totalCount : 0;
    return { totalCount, idleCount, waitingCount, utilization: parseFloat((utilization * 100).toFixed(1)) };
}
async function isDatabaseReachable() {
    if (!process.env.DATABASE_URL)
        return false;
    // Bypass the circuit for the explicit reachability probe
    try {
        const rows = await runQuery(getDbPool(), 'SELECT 1 AS ok');
        _circuitOpenUntil = 0; // DB is back — close circuit
        return rows.length > 0;
    }
    catch {
        return false;
    }
}
