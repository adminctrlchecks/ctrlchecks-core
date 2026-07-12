import { NodeDefinition } from '../../core/types/node-definition';

export const httpRequestNodeDefinition: NodeDefinition = {
  type: 'http_request',
  label: 'HTTP Request',
  category: 'http_api',
  description: 'Make HTTP requests to external APIs. Fetch data, call webhooks, or interact with any REST API.',
  icon: 'Globe',
  version: 1,

  inputSchema: {
    url: {
      type: 'string',
      description: 'Request URL (e.g. https://api.example.com/data)',
      required: true,
      default: '',
      validation: (value) => {
        if (typeof value !== 'string' || value.trim() === '') return 'URL is required';
        try { new URL(value); } catch { return 'URL must be a valid URL format'; }
        return true;
      },
    },
    method: {
      type: 'string',
      description: 'HTTP method',
      required: true,
      default: 'GET',
      validation: (value) => {
        if (!['GET', 'POST', 'PUT', 'DELETE', 'PATCH'].includes(value)) {
          return 'Method must be one of: GET, POST, PUT, DELETE, PATCH';
        }
        return true;
      },
    },
    headers: {
      type: 'object',
      description: 'HTTP headers (JSON object)',
      required: false,
      default: {},
    },
    body: {
      type: 'json',
      description: 'Request body (for POST/PUT/PATCH)',
      required: false,
      default: null,
    },
    qs: {
      type: 'object',
      description: 'URL query string parameters (JSON object)',
      required: false,
      default: {},
    },
    timeout: {
      type: 'number',
      description: 'Request timeout in milliseconds',
      required: false,
      default: 10000,
    },
  },

  outputSchema: {
    default: {
      type: 'object',
      description: 'HTTP response (status, data, headers)',
    },
  },

  requiredInputs: ['url', 'method'],
  outgoingPorts: ['default'],
  incomingPorts: ['default'],
  isBranching: false,

  validateInputs: (inputs) => {
    const errors: string[] = [];
    if (!inputs.url || typeof inputs.url !== 'string' || inputs.url.trim() === '') {
      errors.push('url field is required');
    } else {
      try { new URL(inputs.url); } catch { errors.push('url must be a valid URL format'); }
    }
    if (!inputs.method || !['GET', 'POST', 'PUT', 'DELETE', 'PATCH'].includes(inputs.method)) {
      errors.push('method must be one of: GET, POST, PUT, DELETE, PATCH');
    }
    return { valid: errors.length === 0, errors };
  },

  defaultInputs: () => ({
    url: '',
    method: 'GET',
    headers: {},
    body: null,
    qs: {},
    timeout: 10000,
  }),
};
