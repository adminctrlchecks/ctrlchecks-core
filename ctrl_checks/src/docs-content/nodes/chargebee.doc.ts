import type { FieldDoc, NodeDoc, OperationDoc } from '../types';

const docsUrl = 'https://apidocs.chargebee.com/docs/api';

function rich(label: string, meaning: string, enter: string, wrong: string, source = 'Type a fixed value or map it from an earlier step such as {{$json.customerId}}.'): string {
  return (
    `What this field is: ${label} - ${meaning}\n` +
    `Why it matters: Chargebee uses it to authenticate, choose the billing site, select the operation, or identify the customer/subscription/plan involved.\n` +
    `When to fill it: Fill it when the selected Chargebee operation needs this value. API Key and Site are required for every real API call.\n` +
    `What to enter: ${enter}\n` +
    `Where the value comes from: ${source}\n` +
    `How to use it later: Downstream nodes can read results with {{$json.customer}}, {{$json.customerId}}, {{$json.subscription}}, {{$json.subscriptionId}}, {{$json.success}}, or {{$json.error}}.\n` +
    `Accepted format: Operation is one of the documented dropdown values, API key is plain text, Site is only the subdomain, email is a normal email address, and IDs must be copied exactly from Chargebee.\n` +
    `Real workplace example: A signup workflow maps {{$json.email}} into Email, creates a customer, then maps {{$json.customerId}} and a fixed Plan ID into Create Subscription.\n` +
    `If it is empty or wrong: ${wrong}\n` +
    `Common mistake: Entering the full Chargebee URL in Site instead of only the subdomain, or expecting _error when this node returns a plain error field on failure.`
  );
}

const fields: FieldDoc[] = [
  { name: 'Operation', internalKey: 'operation', type: 'select', required: true, description: 'Choose the Chargebee billing action: create_customer, create_subscription, get_customer, or cancel_subscription.', options: ['create_customer', 'create_subscription', 'get_customer', 'cancel_subscription'], defaultValue: 'create_customer', helpText: rich('Operation', 'the Chargebee API action to run.', 'Choose create_customer to add a customer, create_subscription to subscribe an existing customer to a plan/item price, get_customer to retrieve a customer, or cancel_subscription to cancel a subscription.', 'Unsupported values return success:false with error Chargebee node: unsupported operation "<value>".') },
  { name: 'API Key', internalKey: 'apiKey', type: 'string', required: true, description: 'Chargebee API key used as the Basic Auth username.', placeholder: 'live_xxxxxxxxxxxxxxxxxxxxxxxx', helpText: rich('API Key', 'the Chargebee API key used to authenticate the request.', 'Enter a Chargebee full-access or restricted API key, preferably from Connections/credential vault rather than this normal field.', 'If blank, the request is sent with an empty Basic Auth username and Chargebee normally returns an authentication error.', 'Chargebee Dashboard -> Settings -> Configure Chargebee -> API Keys, or a saved Chargebee credential if your workflow injects one.') },
  { name: 'Site Name', internalKey: 'site', type: 'string', required: true, description: 'Chargebee site subdomain used to build https://{site}.chargebee.com/api/v2.', placeholder: 'acme', helpText: rich('Site Name', 'the Chargebee site name/subdomain.', 'Enter acme if your Chargebee URL is https://acme.chargebee.com.', 'A blank or full URL-style value builds a bad API URL and the node returns a network or Chargebee API error.') },
  { name: 'Customer ID', internalKey: 'customerId', type: 'string', required: false, description: 'Chargebee customer ID for create_subscription and get_customer. The panel currently shows it only for create_subscription, but get_customer also needs it at runtime.', placeholder: 'cust_abc123', helpText: rich('Customer ID', 'the Chargebee customer to subscribe or retrieve.', 'Enter the ID returned by Create Customer, such as {{$json.customerId}}.', 'For get_customer or create_subscription, a blank value causes a bad Chargebee API request and Chargebee returns an API error or resource not found.') },
  { name: 'Email', internalKey: 'email', type: 'email', required: false, description: 'Customer email sent when creating a customer.', placeholder: 'buyer@example.com', helpText: rich('Email', 'the email address used to create a Chargebee customer.', 'Enter buyer@example.com or map {{$json.email}} from a form, checkout, or CRM record.', 'The runtime does not prevalidate this field; Chargebee rejects invalid or missing email according to site rules.') },
  { name: 'Plan ID', internalKey: 'planId', type: 'string', required: false, description: 'Chargebee plan or item price ID sent as plan_id when creating a subscription.', placeholder: 'basic-monthly', helpText: rich('Plan ID', 'the billing plan or item price to subscribe the customer to.', 'Enter a Chargebee plan/item price ID such as basic-monthly or map {{$json.planId}}.', 'The runtime sends plan_id exactly as entered. Missing or wrong values are rejected by Chargebee.') },
  { name: 'Subscription ID', internalKey: 'subscriptionId', type: 'string', required: false, description: 'Chargebee subscription ID to cancel.', placeholder: 'sub_abc123', helpText: rich('Subscription ID', 'the active subscription that should be cancelled.', 'Enter sub_... from a previous Chargebee result or map {{$json.subscriptionId}}.', 'Cancel Subscription with a blank or wrong ID returns resource not found or another Chargebee API error.') },
];

function op(name: string, value: string, description: string, outputExample: Record<string, unknown>, outputDescription: string, inputValues: Record<string, string>): OperationDoc {
  return { name, value, description, fields, outputExample, outputDescription, usageExample: { scenario: `${name} in a subscription billing workflow that receives customer or plan details from an earlier step`, inputValues, expectedOutput: 'The next node can use {{$json.customerId}}, {{$json.subscriptionId}}, {{$json.customer}}, {{$json.subscription}}, {{$json.success}}, or {{$json.error}}.' }, externalDocsUrl: docsUrl };
}

export const chargebeeDoc: NodeDoc = {
  slug: 'chargebee',
  displayName: 'Chargebee',
  category: 'Payment',
  logoUrl: '/icons/nodes/chargebee.svg',
  description: 'Create Chargebee customers, create subscriptions, retrieve customers, and cancel subscriptions through the Chargebee Billing API. Unlike many nodes in this audit, failures return success:false and a plain error field rather than _error.',
  credentialType: 'Chargebee API Key',
  credentialSetupSteps: [
    'Create a Chargebee API key in Chargebee and store it in CtrlChecks Connections/credential vault where possible instead of normal workflow fields.',
    'Use a key with permissions for customers and subscriptions. Use a test site first when creating or cancelling billing records.',
    'Enter only the Chargebee site subdomain in Site, such as acme for acme.chargebee.com.',
    'Downstream service nodes still need their own connections; the Chargebee API key only authorizes Chargebee billing calls.',
    'After this node runs, connect its output to the next billing, customer-success, accounting, or notification step. Each downstream service node account connection is configured separately.',
  ],
  credentialDocsUrl: docsUrl,
  resources: [{ name: 'Customers and Subscriptions', description: 'Chargebee operations use form-encoded POST requests for create/cancel operations and GET for customer lookup. The node returns Chargebee objects directly without preserving unrelated incoming fields.', operations: [
    op('Create Customer', 'create_customer', 'Creates a Chargebee customer by posting the Email field to /customers. The runtime does not prevalidate Email; it sends the value and relies on Chargebee to accept or reject it.', { success: true, operation: 'create_customer', customer: { id: 'cust_abc123', email: 'buyer@example.com' }, customerId: 'cust_abc123' }, 'success: true when Chargebee creates the customer. operation: create_customer. customer: raw Chargebee customer object. customerId: customer.id copied to the top level. error: plain error message on failure; this node does not use _error.', { operation: 'create_customer', apiKey: '{{$credentials.chargebee.apiKey}}', site: 'acme', email: '{{$json.email}}' }),
    op('Create Subscription', 'create_subscription', 'Creates a subscription under one customer by posting plan_id to /customers/{customerId}/subscriptions. The implementation sends planId as plan_id and returns the created subscription object.', { success: true, operation: 'create_subscription', subscription: { id: 'sub_abc123', status: 'active' }, subscriptionId: 'sub_abc123', customerId: 'cust_abc123' }, 'success: true when Chargebee creates the subscription. operation: create_subscription. subscription: raw Chargebee subscription object. subscriptionId: copied subscription ID. customerId: ID used in the request. error: plain error message on failure.', { operation: 'create_subscription', apiKey: '{{$credentials.chargebee.apiKey}}', site: 'acme', customerId: '{{$json.customerId}}', planId: 'basic-monthly' }),
    op('Get Customer', 'get_customer', 'Retrieves one Chargebee customer by Customer ID. The current panel only shows Customer ID for create_subscription, but get_customer also needs it at runtime.', { success: true, operation: 'get_customer', customer: { id: 'cust_abc123', email: 'buyer@example.com' }, customerId: 'cust_abc123' }, 'success: true when Chargebee returns the customer. operation: get_customer. customer: raw Chargebee customer object. customerId: customer.id copied to the top level. error: plain error message on failure.', { operation: 'get_customer', apiKey: '{{$credentials.chargebee.apiKey}}', site: 'acme', customerId: '{{$json.customerId}}' }),
    op('Cancel Subscription', 'cancel_subscription', 'Cancels one active subscription by POSTing to /subscriptions/{subscriptionId}/cancel. The request body is empty and form-encoded, matching the current implementation.', { success: true, operation: 'cancel_subscription', subscription: { id: 'sub_abc123', status: 'cancelled' }, subscriptionId: 'sub_abc123' }, 'success: true when Chargebee cancels the subscription. operation: cancel_subscription. subscription: raw Chargebee subscription object. subscriptionId: copied subscription ID. error: plain error message on failure.', { operation: 'cancel_subscription', apiKey: '{{$credentials.chargebee.apiKey}}', site: 'acme', subscriptionId: '{{$json.subscriptionId}}' }),
  ] }],
  commonErrors: [
    { error: 'Chargebee node: unsupported operation "<operation>"', cause: 'Operation was not one of create_customer, create_subscription, get_customer, or cancel_subscription.', fix: 'Choose one of the supported dropdown values.' },
    { error: 'Chargebee authentication failed - verify your API key and site name', cause: 'Chargebee returned 401 or 403, usually because API Key or Site was wrong or the key lacks permission.', fix: 'Check the Chargebee site subdomain and API key, then rotate or reconnect the key in Connections if needed.' },
    { error: 'Chargebee resource not found - verify the ID is correct', cause: 'Chargebee returned 404 for the customer or subscription endpoint.', fix: 'Confirm customerId or subscriptionId from a previous Chargebee result or the Chargebee dashboard.' },
    { error: 'Chargebee rate limit exceeded - retry after a delay', cause: 'Chargebee returned 429 because too many requests were sent.', fix: 'Add a Wait/Retry step or reduce workflow concurrency before retrying.' },
    { error: 'Chargebee API error <status>: <message> / success:false error:<message>', cause: 'Chargebee rejected the request or a network/JavaScript error occurred. The node returns a plain error field, not _error.', fix: 'Read {{$json.error}}, check required fields for the selected operation, and verify the Chargebee dashboard record state.' },
  ],
  relatedNodes: ['stripe', 'paypal', 'shopify', 'woocommerce'],
};
