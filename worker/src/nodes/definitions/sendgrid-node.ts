import { NodeDefinition } from '../../core/types/node-definition';

export const sendgridNodeDefinition: NodeDefinition = {
  type: 'sendgrid',
  label: 'SendGrid',
  category: 'output',
  description: 'Send transactional emails using the SendGrid API.',
  icon: 'Mail',
  version: 1,

  inputSchema: {
    from: {
      type: 'string',
      required: true,
      description: 'Sender email address (must be verified in SendGrid)',
      default: '',
    },
    to: {
      type: 'string',
      required: true,
      description: 'Recipient email address(es)',
      default: '',
    },
    subject: {
      type: 'string',
      required: false,
      description: 'Email subject line',
      default: '',
    },
    text: {
      type: 'string',
      required: false,
      description: 'Plain text body of the email',
      default: '',
    },
    html: {
      type: 'string',
      required: false,
      description: 'HTML body of the email',
      default: '',
    },
  },

  outputSchema: {
    default: {
      type: 'object',
      description: 'SendGrid send response',
    },
  },

  requiredInputs: ['from', 'to'],
  outgoingPorts: ['default'],
  incomingPorts: ['default'],
  isBranching: false,
  credentialSchema: {
    providers: ['sendgrid'],
    requirements: [{
      provider: 'sendgrid',
      category: 'api_key',
      required: true,
      description: 'SendGrid API Key with Mail Send permission',
      credentialTypeId: 'sendgrid_api_key',
      credentialTypeIds: ['sendgrid_api_key'],
      authType: 'bearer_token',
      label: 'SendGrid API Key',
      testable: true,
    }],
    credentialFields: [],
  },

  validateInputs: (inputs) => {
    const errors: string[] = [];
    if (!inputs.from || typeof inputs.from !== 'string' || inputs.from.trim() === '') {
      errors.push('from email is required');
    }
    if (!inputs.to || typeof inputs.to !== 'string' || inputs.to.trim() === '') {
      errors.push('to email is required');
    }
    return { valid: errors.length === 0, errors };
  },

  defaultInputs: () => ({
    from: '',
    to: '',
    subject: '',
    text: '',
    html: '',
  }),
};
