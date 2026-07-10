"use strict";
/**
 * Snowflake Node Executor
 *
 * Supports operations:
 * - executeQuery: Execute SQL queries
 * - insert: Insert records into a table
 * - update: Update records in a table
 * - delete: Delete records from a table
 * - copyInto: Bulk load data (optional)
 *
 * Uses snowflake-sdk driver.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.runSnowflakeNode = runSnowflakeNode;
const snowflake_sdk_1 = __importDefault(require("snowflake-sdk"));
/**
 * Validate Snowflake credentials
 */
function validateCredentials(credentials) {
    if (!credentials.account || typeof credentials.account !== 'string' || credentials.account.trim() === '') {
        return { valid: false, error: 'account is required' };
    }
    if (!credentials.username || typeof credentials.username !== 'string' || credentials.username.trim() === '') {
        return { valid: false, error: 'username is required' };
    }
    if (!credentials.password || typeof credentials.password !== 'string') {
        return { valid: false, error: 'password is required' };
    }
    if (!credentials.database || typeof credentials.database !== 'string' || credentials.database.trim() === '') {
        return { valid: false, error: 'database is required' };
    }
    if (!credentials.schema || typeof credentials.schema !== 'string' || credentials.schema.trim() === '') {
        return { valid: false, error: 'schema is required' };
    }
    if (!credentials.warehouse || typeof credentials.warehouse !== 'string' || credentials.warehouse.trim() === '') {
        return { valid: false, error: 'warehouse is required' };
    }
    return { valid: true };
}
/**
 * Build WHERE clause from object
 */
function buildWhereClause(where) {
    const conditions = [];
    for (const [key, value] of Object.entries(where)) {
        const escapedValue = typeof value === 'string' ? `'${value.replace(/'/g, "''")}'` : value;
        conditions.push(`"${key}" = ${escapedValue}`);
    }
    return conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
}
/**
 * Execute Snowflake operation
 */
async function executeOperation(connection, operation) {
    return new Promise((resolve, reject) => {
        switch (operation.name) {
            case 'executeQuery': {
                if (!operation.query) {
                    reject(new Error('query is required for executeQuery operation'));
                    return;
                }
                connection.execute({
                    sqlText: operation.query,
                    complete: (err, stmt, rows) => {
                        if (err) {
                            reject(err);
                        }
                        else {
                            resolve({
                                rows: rows || [],
                                rowsAffected: rows?.length || 0,
                            });
                        }
                    },
                });
                break;
            }
            case 'insert': {
                if (!operation.table) {
                    reject(new Error('table is required for insert operation'));
                    return;
                }
                if (!operation.data) {
                    reject(new Error('data is required for insert operation'));
                    return;
                }
                const dataArray = Array.isArray(operation.data) ? operation.data : [operation.data];
                const queries = [];
                for (const record of dataArray) {
                    const columns = Object.keys(record);
                    const values = columns.map(col => {
                        const value = record[col];
                        return typeof value === 'string' ? `'${value.replace(/'/g, "''")}'` : value;
                    });
                    const columnsStr = columns.map(col => `"${col}"`).join(', ');
                    const valuesStr = values.join(', ');
                    queries.push(`INSERT INTO "${operation.table}" (${columnsStr}) VALUES (${valuesStr})`);
                }
                const query = queries.join('; ');
                connection.execute({
                    sqlText: query,
                    complete: (err, stmt, rows) => {
                        if (err) {
                            reject(err);
                        }
                        else {
                            resolve({
                                inserted: dataArray,
                                count: dataArray.length,
                            });
                        }
                    },
                });
                break;
            }
            case 'update': {
                if (!operation.table) {
                    reject(new Error('table is required for update operation'));
                    return;
                }
                if (!operation.data) {
                    reject(new Error('data is required for update operation'));
                    return;
                }
                if (!operation.where) {
                    reject(new Error('where clause is required for update operation'));
                    return;
                }
                const setClauses = [];
                for (const [key, value] of Object.entries(operation.data)) {
                    const escapedValue = typeof value === 'string' ? `'${value.replace(/'/g, "''")}'` : value;
                    setClauses.push(`"${key}" = ${escapedValue}`);
                }
                const whereClause = buildWhereClause(operation.where);
                const query = `UPDATE "${operation.table}" SET ${setClauses.join(', ')} ${whereClause}`;
                connection.execute({
                    sqlText: query,
                    complete: (err, stmt, rows) => {
                        if (err) {
                            reject(err);
                        }
                        else {
                            resolve({
                                rowsAffected: rows?.length || 0,
                            });
                        }
                    },
                });
                break;
            }
            case 'delete': {
                if (!operation.table) {
                    reject(new Error('table is required for delete operation'));
                    return;
                }
                if (!operation.where) {
                    reject(new Error('where clause is required for delete operation'));
                    return;
                }
                const whereClause = buildWhereClause(operation.where);
                const query = `DELETE FROM "${operation.table}" ${whereClause}`;
                connection.execute({
                    sqlText: query,
                    complete: (err, stmt, rows) => {
                        if (err) {
                            reject(err);
                        }
                        else {
                            resolve({
                                rowsAffected: rows?.length || 0,
                            });
                        }
                    },
                });
                break;
            }
            case 'copyInto': {
                if (!operation.table) {
                    reject(new Error('table is required for copyInto operation'));
                    return;
                }
                if (!operation.stage) {
                    reject(new Error('stage is required for copyInto operation'));
                    return;
                }
                if (!operation.file) {
                    reject(new Error('file is required for copyInto operation'));
                    return;
                }
                const format = operation.format || 'CSV';
                const query = `COPY INTO "${operation.table}" FROM @${operation.stage}/${operation.file} FILE_FORMAT = (FORMAT_NAME = '${format}')`;
                connection.execute({
                    sqlText: query,
                    complete: (err, stmt, rows) => {
                        if (err) {
                            reject(err);
                        }
                        else {
                            resolve({
                                success: true,
                                message: 'Copy operation completed',
                            });
                        }
                    },
                });
                break;
            }
            default:
                reject(new Error(`Unsupported operation: ${operation.name}`));
        }
    });
}
/**
 * Run Snowflake node
 */
async function runSnowflakeNode(context) {
    const { inputs } = context;
    // Extract credentials
    const credentials = {
        account: inputs.account,
        username: inputs.username,
        password: inputs.password,
        database: inputs.database,
        schema: inputs.schema,
        warehouse: inputs.warehouse,
        role: inputs.role,
    };
    // Extract operation
    const operation = {
        name: inputs.operation,
        query: inputs.query,
        table: inputs.table,
        data: inputs.data,
        where: inputs.where,
        stage: inputs.stage,
        file: inputs.file,
        format: inputs.format,
    };
    // Validate credentials
    const validation = validateCredentials(credentials);
    if (!validation.valid) {
        return {
            success: false,
            error: validation.error,
        };
    }
    // Validate operation
    if (!operation.name) {
        return {
            success: false,
            error: 'operation is required',
        };
    }
    const validOperations = ['executeQuery', 'insert', 'update', 'delete', 'copyInto'];
    if (!validOperations.includes(operation.name)) {
        return {
            success: false,
            error: `operation must be one of: ${validOperations.join(', ')}`,
        };
    }
    // Create connection
    const connection = snowflake_sdk_1.default.createConnection({
        account: credentials.account,
        username: credentials.username,
        password: credentials.password,
        database: credentials.database,
        schema: credentials.schema,
        warehouse: credentials.warehouse,
        role: credentials.role,
    });
    return new Promise((resolve) => {
        connection.connect((err, conn) => {
            if (err) {
                resolve({
                    success: false,
                    error: err.message || 'Failed to connect to Snowflake',
                });
                return;
            }
            // Execute operation
            executeOperation(conn, operation)
                .then((result) => {
                connection.destroy((destroyErr) => {
                    if (destroyErr) {
                        console.error('[Snowflake] Error destroying connection:', destroyErr);
                    }
                    resolve({
                        success: true,
                        data: result,
                    });
                });
            })
                .catch((error) => {
                connection.destroy((destroyErr) => {
                    if (destroyErr) {
                        console.error('[Snowflake] Error destroying connection:', destroyErr);
                    }
                    resolve({
                        success: false,
                        error: error.message || 'Snowflake operation failed',
                    });
                });
            });
        });
    });
}
