/**
 * Microsoft SQL Server Node Executor
 * 
 * Supports operations:
 * - executeQuery: Execute raw SQL queries with parameters
 * - insert: Insert records into a table
 * - update: Update records in a table
 * - delete: Delete records from a table
 * - storedProcedure: Execute stored procedures with parameters
 * 
 * Uses mssql driver with connection pooling.
 */

import sql from 'mssql';
import { NodeExecutionContext } from '../../core/types/node-definition';

interface SQLServerCredentials {
  host: string;
  port: number | string;
  username: string;
  password: string;
  database: string;
  encrypt?: boolean;
  trustServerCertificate?: boolean;
}

interface SQLServerOperation {
  name: 'executeQuery' | 'insert' | 'update' | 'delete' | 'storedProcedure';
  query?: string;
  table?: string;
  data?: Record<string, any> | Record<string, any>[];
  where?: Record<string, any>;
  procedureName?: string;
  params?: Record<string, any>;
}

type SQLServerOperationName = SQLServerOperation['name'];

/**
 * Validate SQL Server credentials
 */
function validateCredentials(credentials: SQLServerCredentials): { valid: boolean; error?: string } {
  if (!credentials.host || typeof credentials.host !== 'string' || credentials.host.trim() === '') {
    return { valid: false, error: 'host is required' };
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
  
  const port = parseInt(String(credentials.port || 1433));
  if (isNaN(port) || port < 1 || port > 65535) {
    return { valid: false, error: 'port must be a valid number between 1 and 65535' };
  }

  return { valid: true };
}

/**
 * Parse JSON-like config values from the frontend/properties panel.
 */
function parseConfigObject(value: unknown): Record<string, any> | undefined {
  if (!value) {
    return undefined;
  }
  if (typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, any>;
  }
  if (typeof value === 'string' && value.trim()) {
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : undefined;
    } catch {
      return undefined;
    }
  }
  return undefined;
}

function parseConfigData(value: unknown): Record<string, any> | Record<string, any>[] | undefined {
  if (!value) {
    return undefined;
  }
  if (typeof value === 'object') {
    return value as Record<string, any> | Record<string, any>[];
  }
  if (typeof value === 'string' && value.trim()) {
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === 'object'
        ? (parsed as Record<string, any> | Record<string, any>[])
        : undefined;
    } catch {
      return undefined;
    }
  }
  return undefined;
}

function normalizeOperationName(operation: unknown): SQLServerOperationName | undefined {
  if (typeof operation !== 'string') {
    return undefined;
  }

  const normalized = operation.trim();
  if (normalized === 'query' || normalized === 'rawSql' || normalized === 'raw_sql' || normalized === 'select') {
    return 'executeQuery';
  }

  const validOperations: SQLServerOperationName[] = ['executeQuery', 'insert', 'update', 'delete', 'storedProcedure'];
  return validOperations.includes(normalized as SQLServerOperationName)
    ? (normalized as SQLServerOperationName)
    : undefined;
}

function quoteIdentifierPart(identifier: string): string {
  const trimmed = identifier.trim();
  if (!trimmed || trimmed.includes(']')) {
    throw new Error(`Invalid SQL Server identifier: ${identifier}`);
  }
  return `[${trimmed}]`;
}

function quoteIdentifierPath(identifier: string): string {
  return identifier.split('.').map(quoteIdentifierPart).join('.');
}

/**
 * Build WHERE clause from object
 */
function buildWhereClause(where: Record<string, any>): { clause: string; params: Record<string, any> } {
  const conditions: string[] = [];
  const params: Record<string, any> = {};
  let paramIndex = 0;

  for (const [key, value] of Object.entries(where)) {
    const paramName = `param${paramIndex++}`;
    conditions.push(`${quoteIdentifierPath(key)} = @${paramName}`);
    params[paramName] = value;
  }

  return {
    clause: conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '',
    params,
  };
}

function buildSelectQuery(table: string, where?: Record<string, any>, limit?: unknown): { query: string; params: Record<string, any> } {
  const limitNumber = Number(limit || 100);
  const safeLimit = Number.isInteger(limitNumber) && limitNumber > 0 && limitNumber <= 10000 ? limitNumber : 100;
  const tableName = quoteIdentifierPath(table);
  const { clause, params } = where ? buildWhereClause(where) : { clause: '', params: {} };

  return {
    query: `SELECT TOP (${safeLimit}) * FROM ${tableName} ${clause}`.trim(),
    params,
  };
}

/**
 * Execute SQL Server operation
 */
async function executeOperation(
  pool: sql.ConnectionPool,
  operation: SQLServerOperation
): Promise<any> {
  const request = pool.request();

  switch (operation.name) {
    case 'executeQuery': {
      if (!operation.query) {
        throw new Error('query is required for executeQuery operation');
      }

      // Add parameters if provided
      if (operation.params) {
        for (const [key, value] of Object.entries(operation.params)) {
          request.input(key, value);
        }
      }

      const result = await request.query(operation.query);
      return {
        rows: result.recordset,
        rowsAffected: result.rowsAffected[0] || 0,
      };
    }

    case 'insert': {
      if (!operation.table) {
        throw new Error('table is required for insert operation');
      }
      if (!operation.data) {
        throw new Error('data is required for insert operation');
      }

      const dataArray = Array.isArray(operation.data) ? operation.data : [operation.data];
      const insertedIds: any[] = [];

      for (const record of dataArray) {
        const columns = Object.keys(record);
        const values = columns.map((col, idx) => `@val${idx}`);
        const columnsStr = columns.map(quoteIdentifierPath).join(', ');
        const valuesStr = values.join(', ');

        const query = `INSERT INTO ${quoteIdentifierPath(operation.table)} (${columnsStr}) OUTPUT INSERTED.* VALUES (${valuesStr})`;

        const insertRequest = pool.request();
        columns.forEach((col, idx) => {
          insertRequest.input(`val${idx}`, record[col]);
        });

        const result = await insertRequest.query(query);
        insertedIds.push(...result.recordset);
      }

      return {
        inserted: insertedIds,
        count: insertedIds.length,
      };
    }

    case 'update': {
      if (!operation.table) {
        throw new Error('table is required for update operation');
      }
      if (!operation.data) {
        throw new Error('data is required for update operation');
      }
      if (!operation.where) {
        throw new Error('where clause is required for update operation');
      }

      const { clause: whereClause, params: whereParams } = buildWhereClause(operation.where);
      const setClauses: string[] = [];
      const setParams: Record<string, any> = {};
      let paramIndex = 0;

      for (const [key, value] of Object.entries(operation.data)) {
        const paramName = `set${paramIndex++}`;
        setClauses.push(`${quoteIdentifierPath(key)} = @${paramName}`);
        setParams[paramName] = value;
      }

      const query = `UPDATE ${quoteIdentifierPath(operation.table)} SET ${setClauses.join(', ')} ${whereClause}`;

      const updateRequest = pool.request();
      Object.entries({ ...setParams, ...whereParams }).forEach(([key, value]) => {
        updateRequest.input(key, value);
      });

      const result = await updateRequest.query(query);
      return {
        rowsAffected: result.rowsAffected[0] || 0,
      };
    }

    case 'delete': {
      if (!operation.table) {
        throw new Error('table is required for delete operation');
      }
      if (!operation.where) {
        throw new Error('where clause is required for delete operation');
      }

      const { clause: whereClause, params: whereParams } = buildWhereClause(operation.where);
      const query = `DELETE FROM ${quoteIdentifierPath(operation.table)} ${whereClause}`;

      const deleteRequest = pool.request();
      Object.entries(whereParams).forEach(([key, value]) => {
        deleteRequest.input(key, value);
      });

      const result = await deleteRequest.query(query);
      return {
        rowsAffected: result.rowsAffected[0] || 0,
      };
    }

    case 'storedProcedure': {
      if (!operation.procedureName) {
        throw new Error('procedureName is required for storedProcedure operation');
      }

      const procRequest = pool.request();

      if (operation.params) {
        for (const [key, value] of Object.entries(operation.params)) {
          procRequest.input(key, value);
        }
      }

      const result = await procRequest.execute(operation.procedureName);
      return {
        records: result.recordset,
        returnValue: result.returnValue,
      };
    }

    default:
      throw new Error(`Unsupported operation: ${operation.name}`);
  }
}

/**
 * Run SQL Server node
 */
export async function runSQLServerNode(
  context: NodeExecutionContext,
  sqlClient: Pick<typeof sql, 'connect'> = sql
): Promise<any> {
  const { inputs } = context;

  const host = inputs.host || inputs.server;
  const operationName = normalizeOperationName(inputs.operation);
  const where = parseConfigObject(inputs.where ?? inputs.filters);
  const params = parseConfigObject(inputs.params ?? inputs.parameters);
  const data = parseConfigData(inputs.data);
  let generatedSelect: { query: string; params: Record<string, any> } | undefined;

  try {
    generatedSelect = operationName === 'executeQuery' && !inputs.query && inputs.table
      ? buildSelectQuery(String(inputs.table), where, inputs.limit)
      : undefined;
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Invalid SQL Server table or filter configuration',
    };
  }

  const query = inputs.query || generatedSelect?.query;
  const selectParams = generatedSelect?.params;

  // Extract credentials
  const credentials: SQLServerCredentials = {
    host,
    port: inputs.port || 1433,
    username: inputs.username,
    password: inputs.password,
    database: inputs.database,
    encrypt: inputs.encrypt !== false, // Default true
    trustServerCertificate: inputs.trustServerCertificate === true,
  };

  // Extract operation
  const operation: SQLServerOperation = {
    name: operationName as SQLServerOperationName,
    query,
    table: inputs.table,
    data,
    where,
    procedureName: inputs.procedureName,
    params: selectParams || params,
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

  const validOperations: SQLServerOperationName[] = ['executeQuery', 'insert', 'update', 'delete', 'storedProcedure'];
  if (!operation.name || !validOperations.includes(operation.name)) {
    return {
      success: false,
      error: `operation must be one of: ${validOperations.join(', ')}`,
    };
  }

  // Create connection pool
  const config: sql.config = {
    server: credentials.host,
    port: parseInt(String(credentials.port)),
    user: credentials.username,
    password: credentials.password,
    database: credentials.database,
    options: {
      encrypt: credentials.encrypt,
      trustServerCertificate: credentials.trustServerCertificate,
    },
    pool: {
      max: 10,
      min: 0,
      idleTimeoutMillis: 30000,
    },
  };

  let pool: sql.ConnectionPool | null = null;

  try {
    pool = await sqlClient.connect(config) as sql.ConnectionPool;

    // Execute operation
    const result = await executeOperation(pool, operation);

    return {
      success: true,
      data: result,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'SQL Server operation failed',
    };
  } finally {
    if (pool) {
      try {
        await pool.close();
      } catch (closeError) {
        console.error('[SQLServer] Error closing pool:', closeError);
      }
    }
  }
}
