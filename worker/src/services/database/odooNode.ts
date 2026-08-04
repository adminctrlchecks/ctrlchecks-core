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
 * Uses Odoo's documented external API (JSON-RPC over /jsonrpc, service 'common' for auth and
 * 'object' for model calls — see https://www.odoo.com/documentation/16.0/developer/reference/external_api.html).
 *
 * This previously called /web/session/authenticate + /web/dataset/call_kw instead — those are
 * Odoo's *browser session* endpoints, built for interactive UI logins via cookies, not the
 * external API. Application/API-key credentials are only documented and guaranteed to work
 * against the /jsonrpc external API below; on at least some Odoo Online instances the session
 * endpoint rejects an API key outright with a generic "Access Denied", even though the exact same
 * key authenticates successfully through /jsonrpc. Verified live against a real Odoo Online trial:
 * /web/session/authenticate rejected the API key every time, while /jsonrpc's
 * service:'common'/method:'authenticate' and service:'object'/method:'execute_kw' both succeeded
 * immediately with the identical db/username/API key.
 */

import { NodeExecutionContext } from '../../core/types/node-definition';

interface OdooCredentials {
  url: string;
  db: string;
  username: string;
  password: string;
}

let rpcId = 0;

async function jsonRpc(url: string, service: string, method: string, args: any[]): Promise<any> {
  const response = await fetch(`${url}/jsonrpc`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      method: 'call',
      params: { service, method, args },
      id: ++rpcId,
    }),
  });

  if (!response.ok) {
    throw new Error(`Odoo API HTTP error: ${response.status}`);
  }

  const json: any = await response.json();

  if (json.error) {
    throw new Error(json.error.data?.message ?? json.error.message ?? 'Odoo API error');
  }

  return json.result;
}

/**
 * Authenticate with Odoo's external API and return the user ID (uid).
 */
async function authenticate(credentials: OdooCredentials): Promise<{ uid: number }> {
  const { url, db, username, password } = credentials;

  let uid: any;
  try {
    uid = await jsonRpc(url, 'common', 'authenticate', [db, username, password, {}]);
  } catch (err: any) {
    throw new Error(`Odoo authentication failed: ${err.message}`);
  }

  if (!uid || typeof uid !== 'number') {
    throw new Error('Odoo authentication failed: invalid credentials or database');
  }

  return { uid };
}

/**
 * Call an Odoo model method via the external API.
 */
async function callOdoo(
  credentials: OdooCredentials,
  session: { uid: number },
  model: string,
  method: string,
  args: any[],
  kwargs: Record<string, any> = {}
): Promise<any> {
  const { url, db, password } = credentials;

  try {
    return await jsonRpc(url, 'object', 'execute_kw', [
      db,
      session.uid,
      password,
      model,
      method,
      args,
      { context: {}, ...kwargs },
    ]);
  } catch (err: any) {
    throw new Error(`Odoo API error: ${err.message}`);
  }
}

/**
 * Run Odoo node
 */
export async function runOdooNode(context: NodeExecutionContext): Promise<any> {
  const { inputs } = context;

  const credentials: OdooCredentials = {
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

    let data: any;

    switch (operation) {
      case 'getRecords': {
        const domain: any[] = inputs.domain ?? [];
        const fields: string[] = inputs.fields ?? [];
        const limit: number = inputs.limit ?? 100;
        const offset: number = inputs.offset ?? 0;

        data = await callOdoo(credentials, session, model, 'search_read', [domain], {
          fields,
          limit,
          offset,
        });
        break;
      }

      case 'createRecord': {
        const values: Record<string, any> = inputs.values ?? {};
        data = await callOdoo(credentials, session, model, 'create', [values]);
        break;
      }

      case 'updateRecord': {
        const recordId: number = inputs.recordId;
        const values: Record<string, any> = inputs.values ?? {};

        if (!recordId) {
          return { success: false, error: { message: 'recordId is required for updateRecord' } };
        }

        data = await callOdoo(credentials, session, model, 'write', [[recordId], values]);
        break;
      }

      case 'deleteRecord': {
        const recordId: number = inputs.recordId;

        if (!recordId) {
          return { success: false, error: { message: 'recordId is required for deleteRecord' } };
        }

        data = await callOdoo(credentials, session, model, 'unlink', [[recordId]]);
        break;
      }

      case 'executeMethod': {
        const method: string = inputs.method;
        const methodArgs: any[] = inputs.methodArgs ?? [];
        const methodKwargs: Record<string, any> = inputs.methodKwargs ?? {};

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
  } catch (err: any) {
    return {
      success: false,
      operation,
      model,
      data: null,
      error: { message: err.message ?? 'Odoo operation failed' },
    };
  }
}
