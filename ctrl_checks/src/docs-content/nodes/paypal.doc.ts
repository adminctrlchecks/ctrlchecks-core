import type { FieldDoc, NodeDoc, OperationDoc } from '../types';

const docsUrl = 'https://developer.paypal.com/api/rest/';

function help(label: string, purpose: string, example: string, wrong: string, source = 'Type a fixed value or map it from an earlier step such as {{$json.orderTotal}}.'): string {
  return (
    `What this field is: ${label} - ${purpose}\n` +
    `Why it matters: PayPal uses this value to decide which API endpoint, amount, account mode, or record the node should use.\n` +
    `When to fill it: Fill it when the selected PayPal operation needs this value; leave it blank only when the field is documented as optional for that operation.\n` +
    `What to enter: ${example}\n` +
    `Where the value comes from: ${source}\n` +
    `How to use it later: Downstream nodes can read the PayPal result with paths such as {{$json.order.id}}, {{$json.refund.id}}, {{$json.success}}, or {{$json._error}} depending on the operation result.\n` +
    `Accepted format: Use plain text unless the field says boolean or number. Amount is a normal decimal value such as 49.99, currency is a three-letter ISO code, and IDs must be copied exactly from PayPal.\n` +
    `Real workplace example: A checkout workflow maps {{$json.total}} into Amount, {{$json.currency}} into Currency, and {{$json.invoiceNumber}} into Description before emailing the customer an approval link.\n` +
    `If it is empty or wrong: ${wrong}\n` +
    `Common mistake: Using PayPal client ID/client secret or an order ID where the runtime expects a saved PayPal connection, an access token, or a capture ID.`
  );
}

const operationField: FieldDoc = {
  name: 'Operation',
  internalKey: 'operation',
  type: 'select',
  required: true,
  description: 'Choose the PayPal action. Runtime-supported values are charge, createorder, order, and refund. The current visual panel still shows create_order, get_order, capture_order, create_refund, and get_access_token; those visible values are not understood by the executor today.',
  options: ['charge', 'createorder', 'order', 'refund', 'create_order', 'get_order', 'capture_order', 'create_refund', 'get_access_token'],
  defaultValue: 'charge',
  helpText: help(
    'Operation',
    'the action the PayPal node attempts to run. Use charge/createorder/order to create a PayPal Checkout order, or refund to refund a capture.',
    'Use charge for a new checkout order, refund for a capture refund. The panel values create_order, get_order, capture_order, create_refund, and get_access_token are documented because they are visible today, but they currently fail as unsupported operation values.',
    'If the value is create_order, get_order, capture_order, create_refund, get_access_token, or anything other than charge/createorder/order/refund, the node returns PayPal: Unsupported operation "...".'
  ),
};

const accessTokenField: FieldDoc = {
  name: 'Access Token',
  internalKey: 'accessToken',
  type: 'string',
  required: false,
  description: 'Optional direct PayPal OAuth access token fallback. Prefer a saved PayPal connection.',
  placeholder: 'A21AA...',
  helpText: help(
    'Access Token',
    'a short-lived OAuth bearer token used only when no saved PayPal connection supplies one.',
    'Usually leave this blank and connect PayPal in Connections. Paste an access token only for an advanced temporary test.',
    'If no saved connection and no access token are available, the node returns PayPal: access token not found. Connect PayPal or provide accessToken.',
    'The safest source is CtrlChecks Connections/credential vault. PayPal access tokens are generated from a PayPal app and expire; they should not be stored in ordinary workflow text fields.'
  ),
};

const clientIdField: FieldDoc = {
  name: 'Client ID',
  internalKey: 'clientId',
  type: 'string',
  required: false,
  description: 'Visible in the current PayPal panel, but not read by the PayPal executor.',
  placeholder: 'AeA1...',
  helpText: help(
    'Client ID',
    'a PayPal app identifier that the current visual panel asks for, even though the runtime never reads clientId.',
    'Do not rely on this field to authenticate the node. Configure the PayPal connection instead.',
    'Changing this field has no runtime effect. Without a saved connection or accessToken, the node still fails with PayPal: access token not found.',
    'PayPal Developer Dashboard shows the Client ID, but CtrlChecks runtime authentication for this node comes from the saved PayPal connection or accessToken field.'
  ),
};

const clientSecretField: FieldDoc = {
  name: 'Client Secret',
  internalKey: 'clientSecret',
  type: 'string',
  required: false,
  description: 'Visible in the current PayPal panel, but not read by the PayPal executor.',
  placeholder: 'EL...',
  helpText: help(
    'Client Secret',
    'a PayPal app secret that should live in Connections, not a normal workflow field; the current executor does not read clientSecret.',
    'Do not paste production client secrets here for real workflows. Use the PayPal connection flow.',
    'Changing this field has no runtime effect. The node still needs a saved PayPal token or accessToken.',
    'PayPal Developer Dashboard shows the Client Secret once you reveal the app credentials, but CtrlChecks should store it in the credential system rather than this field.'
  ),
};

const environmentField: FieldDoc = {
  name: 'Environment',
  internalKey: 'environment',
  type: 'select',
  required: false,
  description: 'Selects the PayPal API host. The runtime treats only sandbox as sandbox; every other value, including production, uses live PayPal.',
  options: ['sandbox', 'live', 'production'],
  defaultValue: 'live',
  helpText: help(
    'Environment',
    'the PayPal account mode and API base URL used by this request.',
    'Enter sandbox for test payments or live for real PayPal payments. The panel value production is accepted as text but runtime treats it like live.',
    'If you choose live/production while using sandbox credentials, PayPal rejects the request. If you choose sandbox with live credentials, PayPal rejects it too.'
  ),
};

const amountField: FieldDoc = {
  name: 'Amount',
  internalKey: 'amount',
  type: 'number',
  required: false,
  description: 'Decimal payment or refund amount.',
  placeholder: '49.99',
  example: '49.99',
  helpText: help(
    'Amount',
    'the order total for charge/createorder/order, or an optional partial-refund amount for refund.',
    'Enter a normal decimal amount such as 49.99, or map {{$json.refundAmount}} from a support approval step.',
    'For charge/createorder/order, missing or non-positive Amount returns PayPal charge: amount is required. For refund, a missing Amount means PayPal attempts a full capture refund.'
  ),
};

const currencyField: FieldDoc = {
  name: 'Currency',
  internalKey: 'currency',
  type: 'string',
  required: false,
  description: 'Three-letter PayPal currency code.',
  placeholder: 'USD',
  defaultValue: 'USD',
  helpText: help(
    'Currency',
    'the currency code sent inside the PayPal order or refund amount.',
    'Enter USD, EUR, GBP, INR, or another PayPal-supported three-letter currency code.',
    'If the code is unsupported for your PayPal account or the customer country, PayPal rejects the API request and the response is returned in _errorDetails.'
  ),
};

const descriptionField: FieldDoc = {
  name: 'Description',
  internalKey: 'description',
  type: 'textarea',
  required: false,
  description: 'Optional text stored on the PayPal purchase unit for created orders.',
  placeholder: 'Invoice INV-1042 monthly subscription',
  helpText: help(
    'Description',
    'a human-readable note attached to the PayPal order purchase unit.',
    'Enter a short order or invoice note such as Invoice INV-1042 - March subscription.',
    'If blank, the order is still created with no description. If it contains the wrong order reference, finance teams may have trouble reconciling the payment later.'
  ),
};

const paymentIdField: FieldDoc = {
  name: 'Payment ID',
  internalKey: 'paymentId',
  type: 'string',
  required: false,
  description: 'PayPal capture ID used for refunds.',
  placeholder: '3C12345678901234A',
  helpText: help(
    'Payment ID',
    'the PayPal capture ID to refund. Despite the label, this is not a PayPal order ID.',
    'For refund, enter a capture ID such as 3C12345678901234A, usually from a previous PayPal capture result or PayPal dashboard.',
    'For refund, missing this value returns PayPal refund: paymentId (captureId) is required. Supplying an order ID instead of a capture ID causes PayPal to reject the refund.'
  ),
};

const orderIdField: FieldDoc = {
  name: 'Order ID',
  internalKey: 'orderId',
  type: 'string',
  required: false,
  description: 'Visible in the panel for get/capture operations, but not read by the current PayPal executor.',
  placeholder: '5O190127TN364715T',
  helpText: help(
    'Order ID',
    'a PayPal Checkout order ID shown in the panel, currently unused by the runtime because get/capture operations are not implemented in this node.',
    'Do not expect this field to fetch or capture an order today. The working create-order operation returns the order under {{$json.order}}.',
    'Changing this field has no effect. If the visible operation is get_order or capture_order, the node fails because those operation values are unsupported.'
  ),
};

const autoCaptureField: FieldDoc = {
  name: 'Auto Capture',
  internalKey: 'autoCapture',
  type: 'boolean',
  required: false,
  description: 'Controls the intent on created PayPal orders: CAPTURE when true, AUTHORIZE when false.',
  defaultValue: 'true',
  helpText: help(
    'Auto Capture',
    'a boolean that changes the PayPal order intent sent during create order.',
    'Use true for a normal checkout order intended for capture after buyer approval; use false only when your PayPal flow needs authorization first.',
    'This field does not actually capture payment immediately. The runtime only creates the order and returns approval links; capture after buyer approval is not implemented in this node.'
  ),
};

const allFields = [operationField, accessTokenField, clientIdField, clientSecretField, environmentField, amountField, currencyField, descriptionField, paymentIdField, orderIdField, autoCaptureField];

const createOrderOperation: OperationDoc = {
  name: 'Create Checkout Order',
  value: 'charge',
  description: 'Creates a PayPal Checkout order through /v2/checkout/orders and returns PayPal order data, including approval links. Despite the runtime comment, it does not capture money immediately; the buyer must still approve the order and a separate capture path is not implemented in this node today.',
  fields: allFields,
  outputExample: {
    success: true,
    order: {
      id: '5O190127TN364715T',
      status: 'CREATED',
      links: [{ href: 'https://www.paypal.com/checkoutnow?token=5O190127TN364715T', rel: 'approve' }],
    },
  },
  outputDescription: 'success: true when PayPal created the order. order: the raw PayPal order response from /v2/checkout/orders, including order.id, status, purchase_units, and links. Use {{$json.order.id}} for the order ID and the approve link in {{$json.order.links}} to send the buyer to PayPal. On failure, the node preserves incoming fields and adds _error and sometimes _errorDetails.',
  usageExample: {
    scenario: 'Create a PayPal approval link after a customer submits a checkout form',
    inputValues: { operation: 'charge', amount: '{{$json.total}}', currency: '{{$json.currency}}', description: 'Order {{$json.orderNumber}}' },
    expectedOutput: 'Send the customer the approval link from {{$json.order.links}} and store {{$json.order.id}} on the order record.',
  },
  externalDocsUrl: docsUrl,
};

const refundOperation: OperationDoc = {
  name: 'Refund Capture',
  value: 'refund',
  description: 'Refunds a PayPal capture through /v2/payments/captures/{captureId}/refund. A positive Amount creates a partial refund; leaving Amount blank sends an empty body so PayPal attempts a full refund for that capture.',
  fields: allFields,
  outputExample: {
    success: true,
    refund: {
      id: '1JU08902781691411',
      status: 'COMPLETED',
      amount: { currency_code: 'USD', value: '20.00' },
    },
  },
  outputDescription: 'success: true when PayPal accepts the refund. refund: the raw PayPal refund response, including refund.id, status, amount, seller_payable_breakdown, and links when PayPal returns them. Use {{$json.refund.id}} for audit records. On failure, the node preserves incoming fields and adds _error plus _errorDetails when PayPal sends a response body.',
  usageExample: {
    scenario: 'Refund an approved support case using a capture ID saved on the original payment record',
    inputValues: { operation: 'refund', paymentId: '{{$json.captureId}}', amount: '{{$json.refundAmount}}', currency: '{{$json.currency}}' },
    expectedOutput: 'Record {{$json.refund.id}}, {{$json.refund.status}}, and {{$json.success}} in the refund tracking sheet.',
  },
  externalDocsUrl: docsUrl,
};

export const paypalDoc: NodeDoc = {
  slug: 'paypal',
  displayName: 'PayPal',
  category: 'Ecommerce',
  logoUrl: '/icons/nodes/paypal.svg',
  description: 'Create PayPal Checkout orders and refund PayPal captures. Current visual-panel operation values are misaligned with the runtime, so working workflows should use charge or refund until the panel is corrected.',
  credentialType: 'PayPal OAuth2',
  credentialSetupSteps: [
    'Connect PayPal in CtrlChecks Connections so the credential system/credential vault can provide a PayPal OAuth access token to this node.',
    'Use Sandbox mode first with a PayPal Business sandbox account; switch to Live only after the checkout and refund workflow has been tested end to end.',
    'Do not paste PayPal client secrets into normal workflow fields. The visible Client ID and Client Secret fields are currently not read by the runtime; account secrets belong in Connections.',
    'The PayPal connection is used to create orders and issue refunds. Downstream service nodes, such as Email, Slack, or your CRM, still need their own connections.',
    'After this node runs, connect its output to the next approval-link, refund-log, notification, or order-update step. Each downstream service node account connection is configured separately.',
  ],
  credentialDocsUrl: docsUrl,
  resources: [
    {
      name: 'Checkout and Refunds',
      description: 'Runtime-supported PayPal actions are create order (charge/createorder/order aliases) and refund. The panel currently exposes several unsupported operation values, documented here so users know why those selections fail.',
      operations: [createOrderOperation, refundOperation],
    },
  ],
  commonErrors: [
    {
      error: 'PayPal: access token not found. Connect PayPal or provide accessToken.',
      cause: 'No saved PayPal connection could be found for this node, and the advanced accessToken field was empty.',
      fix: 'Create or reconnect PayPal in Connections, select the connection for the node if the UI offers a selector, or provide a temporary accessToken for testing only.',
    },
    {
      error: 'PayPal charge: amount is required',
      cause: 'The Amount field was empty, not numeric, zero, or negative for a create-order run.',
      fix: 'Map a positive decimal value such as {{$json.total}} or type a fixed value such as 49.99.',
    },
    {
      error: 'PayPal refund: paymentId (captureId) is required',
      cause: 'Refund was selected but Payment ID did not contain the PayPal capture ID.',
      fix: 'Use the capture ID from the original successful PayPal capture, not the PayPal order ID.',
    },
    {
      error: 'PayPal: Unsupported operation "<value>". Supported: charge, refund',
      cause: 'The operation value was not one of the runtime-supported values. This includes the current panel values create_order, get_order, capture_order, create_refund, and get_access_token.',
      fix: 'Use charge/createorder/order to create an order or refund to refund a capture until the visual panel is aligned with the executor.',
    },
    {
      error: 'PayPal create order failed (<status>) / PayPal refund failed (<status>) / PayPal error: <message>',
      cause: 'PayPal rejected the API request, the environment did not match the token, the account lacks permission, or the network request failed.',
      fix: 'Check _errorDetails for PayPal response details, verify sandbox vs live mode, confirm the token has payment permissions, and retry after fixing the account or ID.',
    },
  ],
  relatedNodes: ['stripe', 'shopify', 'woocommerce', 'chargebee'],
};
