"use strict";
/**
 * Supabase Node Executor
 *
 * This node lets workflow users connect to THEIR OWN Supabase projects.
 * It is NOT used for CtrlChecks' own infrastructure (which runs on AWS RDS).
 *
 * The @supabase/supabase-js SDK is loaded dynamically so the worker can
 * compile and run without the package installed.
 *
 * Supported operations: select, insert, update, delete, rpc
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
exports.runSupabaseNode = runSupabaseNode;
function validateCredentials(credentials) {
    if (!credentials.url?.trim())
        return { valid: false, error: 'url is required' };
    if (!credentials.anonKey && !credentials.serviceRoleKey)
        return { valid: false, error: 'Either anonKey or serviceRoleKey is required' };
    return { valid: true };
}
async function loadSupabaseClient(url, key) {
    try {
        const mod = await Promise.resolve().then(() => __importStar(require('@supabase/supabase-js')));
        return mod.createClient(url, key);
    }
    catch {
        throw new Error('The @supabase/supabase-js package is not installed. ' +
            'Run: cd worker && npm install @supabase/supabase-js');
    }
}
async function executeOperation(client, operation, schema) {
    switch (operation.name) {
        case 'select': {
            if (!operation.table)
                throw new Error('table is required for select operation');
            let query = client.schema(schema).from(operation.table).select(operation.columns || '*');
            if (operation.filter) {
                for (const [key, value] of Object.entries(operation.filter)) {
                    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
                        for (const [op, opValue] of Object.entries(value)) {
                            switch (op) {
                                case 'eq':
                                    query = query.eq(key, opValue);
                                    break;
                                case 'neq':
                                    query = query.neq(key, opValue);
                                    break;
                                case 'gt':
                                    query = query.gt(key, opValue);
                                    break;
                                case 'gte':
                                    query = query.gte(key, opValue);
                                    break;
                                case 'lt':
                                    query = query.lt(key, opValue);
                                    break;
                                case 'lte':
                                    query = query.lte(key, opValue);
                                    break;
                                case 'like':
                                    query = query.like(key, String(opValue));
                                    break;
                                case 'ilike':
                                    query = query.ilike(key, String(opValue));
                                    break;
                                case 'in':
                                    query = query.in(key, Array.isArray(opValue) ? opValue : [opValue]);
                                    break;
                                case 'is':
                                    query = query.is(key, opValue);
                                    break;
                                default: query = query.eq(key, opValue);
                            }
                        }
                    }
                    else {
                        query = query.eq(key, value);
                    }
                }
            }
            if (operation.order)
                query = query.order(operation.order.column, { ascending: operation.order.ascending !== false });
            if (operation.limit)
                query = query.limit(operation.limit);
            const { data, error } = await query;
            if (error)
                throw error;
            return { rows: data || [], count: data?.length || 0 };
        }
        case 'insert': {
            if (!operation.table)
                throw new Error('table is required for insert operation');
            if (!operation.data)
                throw new Error('data is required for insert operation');
            const dataArray = Array.isArray(operation.data) ? operation.data : [operation.data];
            const { data, error } = await client.schema(schema).from(operation.table).insert(dataArray).select();
            if (error)
                throw error;
            return { inserted: data || [], count: data?.length || 0 };
        }
        case 'update': {
            if (!operation.table)
                throw new Error('table is required for update operation');
            if (!operation.data)
                throw new Error('data is required for update operation');
            if (!operation.filter)
                throw new Error('filter is required for update operation');
            let query = client.schema(schema).from(operation.table).update(operation.data);
            for (const [key, value] of Object.entries(operation.filter))
                query = query.eq(key, value);
            const { data, error } = await query.select();
            if (error)
                throw error;
            return { rows: data || [], count: data?.length || 0 };
        }
        case 'delete': {
            if (!operation.table)
                throw new Error('table is required for delete operation');
            if (!operation.filter)
                throw new Error('filter is required for delete operation');
            let query = client.schema(schema).from(operation.table).delete();
            for (const [key, value] of Object.entries(operation.filter))
                query = query.eq(key, value);
            const { data, error } = await query.select();
            if (error)
                throw error;
            return { rows: data || [], count: data?.length || 0 };
        }
        case 'rpc': {
            if (!operation.functionName)
                throw new Error('functionName is required for rpc operation');
            const { data, error } = await client.schema(schema).rpc(operation.functionName, operation.params || {});
            if (error)
                throw error;
            return { result: data };
        }
        default:
            throw new Error(`Unsupported operation: ${operation.name}`);
    }
}
async function runSupabaseNode(context) {
    const { inputs } = context;
    const credentials = {
        url: inputs.url,
        anonKey: inputs.anonKey,
        serviceRoleKey: inputs.serviceRoleKey,
        schema: inputs.schema || 'public',
    };
    const operation = {
        name: inputs.operation,
        table: inputs.table,
        columns: inputs.columns,
        filter: inputs.filter,
        limit: inputs.limit,
        order: inputs.order,
        data: inputs.data,
        functionName: inputs.functionName,
        params: inputs.params,
    };
    const validation = validateCredentials(credentials);
    if (!validation.valid)
        return { success: false, error: validation.error };
    if (!operation.name)
        return { success: false, error: 'operation is required' };
    const validOperations = ['select', 'insert', 'update', 'delete', 'rpc'];
    if (!validOperations.includes(operation.name))
        return { success: false, error: `operation must be one of: ${validOperations.join(', ')}` };
    try {
        const key = credentials.serviceRoleKey || credentials.anonKey;
        const client = await loadSupabaseClient(credentials.url, key);
        const result = await executeOperation(client, operation, credentials.schema || 'public');
        return { success: true, data: result };
    }
    catch (error) {
        return { success: false, error: error.message || 'Supabase operation failed' };
    }
}
