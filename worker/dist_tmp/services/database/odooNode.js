"use strict";
/**
 * Odoo Node Executor
 *
 * Supports operations:
 * - getRecords: Fetch records from an Odoo model
 * - createRecord: Create a new record in an Odoo model
 * - updateRecord: Update an existing record
 * - deleteRecord: Delete a record
 * - executeMethod: Call a custom method on a model
 *
 * Uses Odoo's JSON-RPC API (xmlrpc-compatible endpoint).
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.runOdooNode = runOdooNode;
/**
 * Authenticate with Odoo and return the user ID (uid).
 */
async function authenticate(credentials) {
    const { url, db, username, password } = credentials;
    const response = await fetch(`${url}/web/session/authenticate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            jsonrpc: '2.0',
            params: {
                db,
                login: username,
                password,
            },
        }),
    });
    if (!response.ok) {
        throw new Error(`Odoo authentication HTTP error: ${response.status}`);
    }
    const json = await response.json();
    if (json.error) {
        throw new Error(`Odoo authentication failed: ${json.error.data?.message ?? json.error.message}`);
    }
    const uid = json.result?.uid;
    if (!uid || typeof uid !== 'number') {
        throw new Error('Odoo authentication failed: invalid credentials or database');
    }
    const cookie = response.headers.get('set-cookie') || '';
    return { uid, cookie };
}
/**
 * Call an Odoo model method via JSON-RPC.
 */
async function callOdoo(credentials, session, model, method, args, kwargs = {}) {
    const { url, db, password } = credentials;
    const response = await fetch(`${url}/web/dataset/call_kw`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...(session.cookie ? { Cookie: session.cookie } : {}),
        },
        body: JSON.stringify({
            jsonrpc: '2.0',
            method: 'call',
            params: {
                model,
                method,
                args,
                kwargs: {
                    context: {},
                    ...kwargs,
                },
            },
        }),
    });
    if (!response.ok) {
        throw new Error(`Odoo API HTTP error: ${response.status}`);
    }
    const json = await response.json();
    if (json.error) {
        throw new Error(`Odoo API error: ${json.error.data?.message ?? json.error.message}`);
    }
    return json.result;
}
/**
 * Run Odoo node
 */
async function runOdooNode(context) {
    const { inputs } = context;
    const credentials = {
        url: (inputs.url ?? '').replace(/\/$/, ''),
        db: inputs.db,
        username: inputs.username,
        password: inputs.password,
    };
    if (!credentials.url) {
        return { success: false, error: { message: 'Odoo URL is required' } };
    }
    if (!credentials.db) {
        return { success: false, error: { message: 'Odoo database name is required' } };
    }
    if (!credentials.username) {
        return { success: false, error: { message: 'Odoo username is required' } };
    }
    if (!credentials.password) {
        return { success: false, error: { message: 'Odoo password is required' } };
    }
    const operation = inputs.operation ?? 'getRecords';
    const model = inputs.model;
    if (!model) {
        return { success: false, error: { message: 'Odoo model is required (e.g. res.partner)' } };
    }
    try {
        const session = await authenticate(credentials);
        let data;
        switch (operation) {
            case 'getRecords': {
                const domain = inputs.domain ?? [];
                const fields = inputs.fields ?? [];
                const limit = inputs.limit ?? 100;
                const offset = inputs.offset ?? 0;
                data = await callOdoo(credentials, session, model, 'search_read', [domain], {
                    fields,
                    limit,
                    offset,
                });
                break;
            }
            case 'createRecord': {
                const values = inputs.values ?? {};
                data = await callOdoo(credentials, session, model, 'create', [values]);
                break;
            }
            case 'updateRecord': {
                const recordId = inputs.recordId;
                const values = inputs.values ?? {};
                if (!recordId) {
                    return { success: false, error: { message: 'recordId is required for updateRecord' } };
                }
                data = await callOdoo(credentials, session, model, 'write', [[recordId], values]);
                break;
            }
            case 'deleteRecord': {
                const recordId = inputs.recordId;
                if (!recordId) {
                    return { success: false, error: { message: 'recordId is required for deleteRecord' } };
                }
                data = await callOdoo(credentials, session, model, 'unlink', [[recordId]]);
                break;
            }
            case 'executeMethod': {
                const method = inputs.method;
                const methodArgs = inputs.methodArgs ?? [];
                const methodKwargs = inputs.methodKwargs ?? {};
                if (!method) {
                    return { success: false, error: { message: 'method is required for executeMethod' } };
                }
                data = await callOdoo(credentials, session, model, method, methodArgs, methodKwargs);
                break;
            }
            default:
                return { success: false, error: { message: `Unknown operation: ${operation}` } };
        }
        return {
            success: true,
            operation,
            model,
            data,
            error: null,
        };
    }
    catch (err) {
        return {
            success: false,
            operation,
            model,
            data: null,
            error: { message: err.message ?? 'Odoo operation failed' },
        };
    }
}
