"use strict";
/**
 * AWS RDS database client — backed by pg.Pool → AWS RDS PostgreSQL.
 *
 * Exports getDbClient() and createDbClient().
 * Internally uses pg.Pool → AWS RDS — no external DB SDK required at runtime.
 *
 * Supported patterns:
 *   .from(table).select(cols).eq(col, val).single()
 *   .from(table).select(cols).eq(col, val).or('col1.op.val1,col2.op.val2')
 *   .from(table).select(cols).not('col', 'is', null)
 *   .from(table).select(cols).is('col', null)
 *   .from(table).insert(data)
 *   .from(table).update(data).eq(col, val)
 *   .from(table).delete().eq(col, val)
 *   .from(table).upsert(data, {onConflict})
 *   .rpc('function_name', { param: value })
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDbClient = getDbClient;
exports.createDbClient = createDbClient;
const db_pool_1 = require("./db-pool");
const aws_jwt_verify_1 = require("aws-jwt-verify");
const jwt = __importStar(require("jsonwebtoken"));
const config_1 = require("../config");
const column_types_1 = require("./column-types");
// ─── Query Builder ────────────────────────────────────────────────────────────
class QueryBuilder {
    constructor(table, pool, userId) {
        this._op = 'select';
        this._cols = '*';
        this._conditions = [];
        this._isConditions = [];
        this._notConditions = [];
        this._orGroups = [];
        this._data = null;
        this._single = false;
        this._orderAsc = true;
        this._table = table;
        this._pool = pool;
        this._userId = userId;
    }
    select(cols = '*') { this._cols = cols; return this; }
    insert(data) { this._data = data; this._op = 'insert'; return this; }
    update(data) { this._data = data; this._op = 'update'; return this; }
    delete() { this._op = 'delete'; return this; }
    upsert(data, opts) {
        this._data = data;
        this._op = 'upsert';
        this._upsertConflict = opts?.onConflict;
        return this;
    }
    eq(col, val) { this._conditions.push({ col, op: '=', val }); return this; }
    neq(col, val) { this._conditions.push({ col, op: '!=', val }); return this; }
    gt(col, val) { this._conditions.push({ col, op: '>', val }); return this; }
    gte(col, val) { this._conditions.push({ col, op: '>=', val }); return this; }
    lt(col, val) { this._conditions.push({ col, op: '<', val }); return this; }
    lte(col, val) { this._conditions.push({ col, op: '<=', val }); return this; }
    ilike(col, val) { this._conditions.push({ col, op: 'ILIKE', val }); return this; }
    in(col, vals) { this._conditions.push({ col, op: 'IN', val: vals }); return this; }
    /** IS NULL / IS NOT NULL */
    is(col, val) { this._isConditions.push({ col, val }); return this; }
    /** NOT operator: .not('col', 'is', null) → col IS NOT NULL */
    not(col, op, val) { this._notConditions.push({ col, op, val }); return this; }
    /** PostgREST-style OR: .or('col1.lt.val1,col2.is.null') */
    or(raw) {
        const group = [];
        for (const part of raw.split(',')) {
            const firstDot = part.indexOf('.');
            const secondDot = part.indexOf('.', firstDot + 1);
            if (firstDot === -1 || secondDot === -1)
                continue;
            group.push({
                col: part.substring(0, firstDot),
                op: part.substring(firstDot + 1, secondDot),
                val: part.substring(secondDot + 1),
            });
        }
        if (group.length)
            this._orGroups.push(group);
        return this;
    }
    single() { this._single = true; this._limitVal = 1; return this; }
    maybeSingle() { this._single = true; this._limitVal = 1; return this; }
    limit(n) { this._limitVal = n; return this; }
    range(from, to) {
        const start = Number.isFinite(from) ? Math.max(0, Math.floor(from)) : 0;
        const end = Number.isFinite(to) ? Math.max(start, Math.floor(to)) : start;
        this._offsetVal = start;
        this._limitVal = end - start + 1;
        return this;
    }
    order(col, opts) {
        this._orderCol = col;
        this._orderAsc = opts?.ascending !== false;
        return this;
    }
    // ─── SQL building ────────────────────────────────────────────────────────
    sanitizeCols(raw) {
        if (raw === '*')
            return '*';
        return raw
            .split(',')
            .map((c) => c.trim())
            .filter((c) => !c.includes('(') && !c.includes('!'))
            .map((c) => c.split(' ')[0].split(':')[0].trim())
            .filter(Boolean)
            .map((c) => (c === '*' ? '*' : `"${c}"`))
            .join(', ') || '*';
    }
    buildWhere(startIdx) {
        const values = [];
        const parts = [];
        // AND conditions
        for (const { col, op, val } of this._conditions) {
            if (op === 'IN') {
                const ph = val.map((v) => { values.push(v); return `$${startIdx + values.length - 1}`; });
                parts.push(`"${col}" IN (${ph.join(', ')})`);
            }
            else {
                values.push(val);
                parts.push(`"${col}" ${op} $${startIdx + values.length - 1}`);
            }
        }
        // IS NULL / IS NOT NULL
        for (const { col, val } of this._isConditions) {
            parts.push(val === null ? `"${col}" IS NULL` : `"${col}" IS NOT NULL`);
        }
        // NOT conditions: .not('col', 'is', null) → col IS NOT NULL
        for (const { col, op, val } of this._notConditions) {
            if (op === 'is' && val === null) {
                parts.push(`"${col}" IS NOT NULL`);
            }
            else if (op === 'eq') {
                values.push(val);
                parts.push(`"${col}" != $${startIdx + values.length - 1}`);
            }
            else {
                values.push(val);
                parts.push(`NOT ("${col}" ${op.toUpperCase()} $${startIdx + values.length - 1})`);
            }
        }
        // OR groups (PostgREST syntax)
        for (const group of this._orGroups) {
            const orParts = group.map(({ col, op, val }) => {
                if (op === 'is') {
                    return val === 'null' ? `"${col}" IS NULL` : `"${col}" IS NOT NULL`;
                }
                const pgOp = { eq: '=', neq: '!=', lt: '<', lte: '<=', gt: '>', gte: '>=', like: 'LIKE', ilike: 'ILIKE' };
                values.push(val);
                return `"${col}" ${pgOp[op] || '='} $${startIdx + values.length - 1}`;
            });
            parts.push(`(${orParts.join(' OR ')})`);
        }
        if (!parts.length)
            return { sql: '', values: [] };
        return { sql: ` WHERE ${parts.join(' AND ')}`, values };
    }
    async run() {
        const client = await this._pool.connect();
        try {
            if (this._userId) {
                await client.query(`SET LOCAL app.current_user_id = $1`, [this._userId]);
                await client.query(`SET LOCAL app.current_role = 'authenticated'`);
            }
            let rows;
            if (this._op === 'select') {
                const cols = this.sanitizeCols(this._cols);
                const { sql: where, values } = this.buildWhere(1);
                let sql = `SELECT ${cols} FROM "${this._table}"${where}`;
                if (this._orderCol)
                    sql += ` ORDER BY "${this._orderCol}" ${this._orderAsc ? 'ASC' : 'DESC'}`;
                if (this._limitVal)
                    sql += ` LIMIT ${this._limitVal}`;
                if (this._offsetVal !== undefined)
                    sql += ` OFFSET ${this._offsetVal}`;
                rows = (await client.query(sql, values)).rows;
            }
            else if (this._op === 'insert') {
                const arr = Array.isArray(this._data) ? this._data : [this._data];
                if (!arr.length)
                    return { data: [], error: null };
                const keys = Object.keys(arr[0]);
                const allVals = [];
                const rowPH = arr.map((row) => `(${keys.map((k) => { allVals.push((0, column_types_1.prepareDbValue)(this._table, k, row[k])); return `$${allVals.length}`; }).join(', ')})`);
                const returning = this.sanitizeCols(this._cols);
                const sql = `INSERT INTO "${this._table}" (${keys.map((k) => `"${k}"`).join(', ')}) VALUES ${rowPH.join(', ')} RETURNING ${returning}`;
                rows = (await client.query(sql, allVals)).rows;
            }
            else if (this._op === 'update') {
                const keys = Object.keys(this._data);
                const vals = [];
                const sets = keys.map((k) => { vals.push((0, column_types_1.prepareDbValue)(this._table, k, this._data[k])); return `"${k}" = $${vals.length}`; });
                const { sql: where, values: whereVals } = this.buildWhere(vals.length + 1);
                const returning = this.sanitizeCols(this._cols);
                const sql = `UPDATE "${this._table}" SET ${sets.join(', ')}${where} RETURNING ${returning}`;
                rows = (await client.query(sql, [...vals, ...whereVals])).rows;
            }
            else if (this._op === 'delete') {
                const { sql: where, values } = this.buildWhere(1);
                const returning = this.sanitizeCols(this._cols);
                rows = (await client.query(`DELETE FROM "${this._table}"${where} RETURNING ${returning}`, values)).rows;
            }
            else { // upsert
                const arr = Array.isArray(this._data) ? this._data : [this._data];
                if (!arr.length)
                    return { data: [], error: null };
                const keys = Object.keys(arr[0]);
                const allVals = [];
                const rowPH = arr.map((row) => `(${keys.map((k) => { allVals.push((0, column_types_1.prepareDbValue)(this._table, k, row[k])); return `$${allVals.length}`; }).join(', ')})`);
                const conflictCols = this._upsertConflict
                    ? this._upsertConflict
                        .split(',')
                        .map((c) => c.trim())
                        .filter(Boolean)
                    : [];
                const conflict = conflictCols.length
                    ? `(${conflictCols.map((c) => `"${c}"`).join(', ')})`
                    : '';
                const updateSet = keys.map((k) => `"${k}" = EXCLUDED."${k}"`).join(', ');
                const returning = this.sanitizeCols(this._cols);
                const sql = `INSERT INTO "${this._table}" (${keys.map((k) => `"${k}"`).join(', ')}) VALUES ${rowPH.join(', ')} ON CONFLICT ${conflict} DO UPDATE SET ${updateSet} RETURNING ${returning}`;
                rows = (await client.query(sql, allVals)).rows;
            }
            return { data: this._single ? (rows[0] ?? null) : rows, error: null };
        }
        catch (err) {
            return { data: null, error: { message: err.message, code: err.code, details: err.detail } };
        }
        finally {
            client.release();
        }
    }
    then(resolve, reject) {
        return this.run().then(resolve, reject);
    }
    catch(reject) { return this.run().catch(reject); }
}
// ─── RPC Builder ──────────────────────────────────────────────────────────────
class RPCBuilder {
    constructor(pool, fn, params) {
        this._pool = pool;
        this._fn = fn;
        this._params = params;
    }
    async run() {
        const client = await this._pool.connect();
        try {
            const keys = Object.keys(this._params);
            const values = Object.values(this._params);
            const namedArgs = keys.map((k, i) => `${k} => $${i + 1}`).join(', ');
            const sql = `SELECT * FROM "${this._fn}"(${namedArgs})`;
            const rows = (await client.query(sql, values)).rows;
            return { data: rows.length === 1 ? rows[0] : rows, error: null };
        }
        catch (err) {
            return { data: null, error: { message: err.message, code: err.code } };
        }
        finally {
            client.release();
        }
    }
    then(resolve, reject) {
        return this.run().then(resolve, reject);
    }
    catch(reject) { return this.run().catch(reject); }
}
// ─── Auth stub ────────────────────────────────────────────────────────────────
class AdminStub {
    constructor(pool) {
        this._pool = pool;
    }
    async listUsers() {
        const client = await this._pool.connect();
        try {
            let rows = [];
            try {
                rows = (await client.query(`SELECT
             id,
             email,
             created_at,
             updated_at,
             NULL::timestamptz AS last_sign_in_at,
             banned_until
           FROM "users"
           ORDER BY created_at DESC`)).rows;
            }
            catch (columnErr) {
                if (!String(columnErr?.message || '').includes('banned_until')) {
                    throw columnErr;
                }
                // Some DBs don't have users.banned_until yet; keep auth payload shape stable.
                rows = (await client.query(`SELECT
             id,
             email,
             created_at,
             updated_at,
             NULL::timestamptz AS last_sign_in_at,
             NULL::timestamptz AS banned_until
           FROM "users"
           ORDER BY created_at DESC`)).rows;
            }
            return { data: { users: rows }, error: null };
        }
        catch (err) {
            return { data: { users: [] }, error: { message: err.message } };
        }
        finally {
            client.release();
        }
    }
    async getUserById(userId) {
        const client = await this._pool.connect();
        try {
            const rows = (await client.query(`SELECT * FROM "users" WHERE id = $1 LIMIT 1`, [userId])).rows;
            return { data: { user: rows[0] ?? null }, error: null };
        }
        catch (err) {
            return { data: { user: null }, error: { message: err.message } };
        }
        finally {
            client.release();
        }
    }
    async updateUserById(userId, attributes) {
        const client = await this._pool.connect();
        try {
            const keys = Object.keys(attributes);
            const vals = [];
            const sets = keys.map((k) => { vals.push(attributes[k]); return `"${k}" = $${vals.length}`; });
            vals.push(userId);
            const rows = (await client.query(`UPDATE "users" SET ${sets.join(', ')} WHERE id = $${vals.length} RETURNING *`, vals)).rows;
            return { data: { user: rows[0] ?? null }, error: null };
        }
        catch (err) {
            return { data: { user: null }, error: { message: err.message } };
        }
        finally {
            client.release();
        }
    }
    async deleteUser(userId) {
        const client = await this._pool.connect();
        try {
            await client.query(`DELETE FROM "users" WHERE id = $1`, [userId]);
            return { data: {}, error: null };
        }
        catch (err) {
            return { data: null, error: { message: err.message } };
        }
        finally {
            client.release();
        }
    }
}
class AuthStub {
    constructor(pool) {
        this.verifier = config_1.config.cognitoUserPoolId
            ? aws_jwt_verify_1.CognitoJwtVerifier.create({
                userPoolId: config_1.config.cognitoUserPoolId,
                tokenUse: 'access',
                clientId: null,
            })
            : null;
        this.admin = new AdminStub(pool);
    }
    async getUser(token) {
        try {
            if (this.verifier) {
                const payload = await this.verifier.verify(token, { clientId: null });
                // Access tokens may lack the email claim for federated (Google/Facebook) users.
                // Fall back: use the username if it looks like an email (email/password + GitHub flow).
                const sub = payload.sub;
                const direct = payload.email || '';
                const username = payload.username || payload['cognito:username'] || '';
                const email = direct || (username.includes('@') ? username : '');
                return {
                    data: {
                        user: {
                            id: sub,
                            email,
                            user_metadata: {
                                role: (payload['cognito:groups']?.[0] === 'admin' ? 'admin' : 'user'),
                            },
                        },
                    },
                    error: null,
                };
            }
        }
        catch {
            // fall through to legacy JWT
        }
        try {
            if (config_1.config.jwtSecret) {
                const legacy = jwt.verify(token, config_1.config.jwtSecret);
                return {
                    data: {
                        user: {
                            id: legacy.userId,
                            email: legacy.email || '',
                            user_metadata: { role: legacy.role || 'user' },
                        },
                    },
                    error: null,
                };
            }
        }
        catch {
            // invalid token
        }
        return { data: { user: null }, error: { message: 'Invalid or expired token' } };
    }
    async getSession() {
        return { data: { session: null }, error: null };
    }
}
// ─── Client facade ────────────────────────────────────────────────────────────
class RDSClient {
    constructor(userId) {
        this._userId = userId;
        this.auth = new AuthStub((0, db_pool_1.getDbPool)());
    }
    from(table) {
        return new QueryBuilder(table, (0, db_pool_1.getDbPool)(), this._userId);
    }
    rpc(fn, params = {}) {
        return new RPCBuilder((0, db_pool_1.getDbPool)(), fn, params);
    }
    withUser(userId) {
        return new RDSClient(userId);
    }
}
// ─── Singleton ────────────────────────────────────────────────────────────────
let _client = null;
/**
 * Returns the singleton AWS RDS database client.
 * Backed by pg.Pool → AWS RDS PostgreSQL.
 */
function getDbClient() {
    if (!_client) {
        _client = new RDSClient();
    }
    return _client;
}
function createDbClient(_url, _key) {
    return new RDSClient();
}
