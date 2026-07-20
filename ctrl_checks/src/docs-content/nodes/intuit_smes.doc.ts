import type { NodeDoc, OperationDoc, FieldDoc } from '../types';

const operationField: FieldDoc = {
  name: 'Operation',
  internalKey: 'operation',
  type: 'select',
  required: true,
  description: 'The Intuit SME action to run. Important: this node is a mock/demo integration - see Notes.',
  options: ['getCustomers', 'createCustomer', 'updateCustomer', 'getInvoices', 'createInvoice'],
  notes: "This entire node is a mock/demo integration, confirmed directly in its own execution code (worker/src/services/database/intuitSmesNode.ts), which is full of comments like \"Mock implementation - replace with actual Intuit API call.\" No operation ever contacts the real Intuit/QuickBooks API. Get Customers and Get Invoices always return the exact same two hardcoded fake records every time, regardless of your real QuickBooks account. Create Customer, Update Customer, and Create Invoice all return a fabricated confirmation object built only from the values you typed into this node - nothing is actually saved anywhere in Intuit/QuickBooks.",
  helpText: "What this field is: The dropdown that selects which simulated Intuit SME action this node performs.\nWhy it matters: Even though this field behaves like a normal operation selector, none of its five options call the real Intuit/QuickBooks API - each one returns fixed, fabricated demo data or an echo of the values you typed in.\nWhen to fill it: Every time you add this node - it has no usable default without an explicit choice, though the panel defaults to Get Customers.\nWhat to enter: Choose Get Customers or Get Invoices to see two rows of fake demo data (always the same two rows). Choose Create Customer, Update Customer, or Create Invoice to see a fabricated confirmation object built from your own typed-in values, echoed back as if it were saved - it is not actually saved in Intuit/QuickBooks.\nWhere the value comes from: Chosen directly in the Properties Panel.\nHow to use it later: Downstream nodes read {{$json.data}} for the simulated result and {{$json.message}} for a human-readable status line - do not build real business logic around this data since it is not real.\nAccepted format: One of getCustomers, createCustomer, updateCustomer, getInvoices, createInvoice (case-sensitive, matched exactly).\nReal workplace example: None recommended for production use - this node exists for prototyping a workflow's shape before a real Intuit/QuickBooks integration is built.\nIf it is empty or wrong: An empty value defaults to getCustomers; an unrecognized value returns {{$json._error}} = \"Unknown operation: ...\".\nCommon mistake: Assuming this node reads or writes real QuickBooks data because the dropdown and field names look like a real Intuit integration - it currently does not call Intuit's API at all.",
  placeholder: 'getCustomers',
  example: 'getCustomers',
  defaultValue: 'getCustomers',
};

const apiKeyField: FieldDoc = {
  name: 'Api Key',
  internalKey: 'apiKey',
  type: 'password',
  required: true,
  description: 'A value this node checks is non-empty, but never actually sends to Intuit or validates in any way.',
  helpText: "What this field is: A field labeled API Key / Access Token, required by the Properties Panel before this node will run.\nWhy it matters: The node only checks that this field (or Access Token) is not empty - it does not verify the value is a real Intuit API key, does not send it to Intuit's servers, and does not check it against your actual QuickBooks account in any way.\nWhen to fill it: Required to satisfy the Properties Panel's validation on every run, since the field is marked required - but because this node is a mock/demo integration, any non-empty text works.\nWhat to enter: Any non-empty placeholder text works today (for example test-key); providing your real Intuit API key has no additional effect since it is never used.\nWhere the value comes from: If you do have a real Intuit/QuickBooks credential, it can still be saved in CtrlChecks Connections for when this node's mock implementation is replaced with a real one - but it will not do anything until then.\nHow to use it later: Never included in the output.\nAccepted format: Any non-empty string.\nReal workplace example: Not applicable - no real Intuit data is retrieved or written regardless of what is entered here.\nIf it is empty or wrong: An empty Api Key and empty Access Token together return {{$json._error}} = \"API Key or Access Token is required for Intuit SME operations\"; any non-empty value, real or fake, is accepted.\nCommon mistake: Spending time generating a real Intuit Developer API key or OAuth token for this node - until the mock implementation is replaced with a real Intuit API integration, any non-empty placeholder text behaves identically to a real credential.",
  placeholder: 'your-intuit-api-key',
  notes: 'Stored and displayed as a masked credential value once saved through Connections, even though its content is currently never used.',
};

const accessTokenField: FieldDoc = {
  name: 'Access Token',
  internalKey: 'accessToken',
  type: 'text',
  required: false,
  description: 'An alternate credential field, used only as a fallback if Api Key is empty - equally unused by the mock implementation.',
  helpText: "What this field is: A second, alternate place to provide a credential value; the node uses whichever of Api Key or Access Token is filled first.\nWhy it matters: Like Api Key, this value is only checked for non-empty presence - it is never sent to Intuit and never validated.\nWhen to fill it: Only if you prefer to fill this instead of Api Key; filling both is unnecessary since Api Key is checked first.\nWhat to enter: Any non-empty placeholder text works today for the same reason as Api Key.\nWhere the value comes from: A real Intuit OAuth2 access token can be typed here for future-readiness, but it currently has no functional effect.\nHow to use it later: Never included in the output.\nAccepted format: Any non-empty string.\nReal workplace example: Not applicable - see Api Key.\nIf it is empty or wrong: If both Api Key and Access Token are empty, the node returns {{$json._error}} = \"API Key or Access Token is required for Intuit SME operations\".\nCommon mistake: Filling this thinking it enables real OAuth2 authentication against Intuit - it does not, for the same reason described on the Api Key field.",
  placeholder: 'your-oauth-access-token',
};

const credentialIdField: FieldDoc = {
  name: 'Credential Id',
  internalKey: 'credentialId',
  type: 'string',
  required: false,
  description: 'Reserved field for a stored credential reference; not currently read by the mock execution engine.',
  helpText: "What this field is: A field intended to reference a specific stored Intuit credential by its internal ID.\nWhy it matters: The mock execution code (worker/src/services/database/intuitSmesNode.ts) never reads this value - it only checks inputs.apiKey and inputs.accessToken directly.\nWhen to fill it: There is currently no working scenario where filling this field changes the node's behavior; leave it blank.\nWhat to enter: Nothing is required - any value typed here has no effect.\nWhere the value comes from: Not applicable today.\nHow to use it later: Not applicable - this value never appears in the output.\nAccepted format: Freeform text, but format has no effect since the value is unused.\nReal workplace example: None.\nIf it is empty or wrong: Nothing changes either way.\nCommon mistake: Assuming this lets you select between multiple saved Intuit connections - it is not wired to any credential-lookup logic today.",
  placeholder: '(unused)',
};

const customerIdField: FieldDoc = {
  name: 'Customer Id',
  internalKey: 'customerId',
  type: 'text',
  required: false,
  description: 'A simulated customer identifier for Create Invoice and Update Customer - echoed back, not validated against any real record.',
  helpText: "What this field is: An identifier that stands in for a real Intuit/QuickBooks customer record.\nWhy it matters: Create Invoice and Update Customer both echo this value back in their fabricated response, but the node never checks whether a customer with this ID actually exists anywhere - there is no real backing data.\nWhen to fill it: Used by Create Invoice and Update Customer; ignored by Get Customers, Get Invoices, and Create Customer. Not currently marked required even for the operations that use it - leaving it blank does not produce an error, it simply comes back as an empty/undefined value in the fabricated response.\nWhat to enter: Any text - since there is no real backing data, any value you type is accepted and echoed back unchanged.\nWhere the value comes from: Type it directly, or map it from {{$json.data.customerId}} on an earlier Create Customer step in the same workflow (still simulated data, not a real Intuit customer ID).\nHow to use it later: Echoed back as {{$json.data.customerId}} on Create Invoice and Update Customer.\nAccepted format: Freeform text - there is no real ID format enforced.\nReal workplace example: Not applicable for production use - this field only demonstrates how a real customerId would flow through the node.\nIf it is empty or wrong: Nothing errors - Create Invoice/Update Customer still \"succeed\" with an undefined or empty customerId in the fabricated response, since this mock implementation performs no field validation beyond the credential check.\nCommon mistake: Assuming an error would be raised for a missing or invalid Customer Id, the way most other nodes in this product validate required IDs - this node does not validate it at all.",
  placeholder: 'CUST-123',
  example: 'CUST-123',
};

const nameField: FieldDoc = {
  name: 'Customer Name',
  internalKey: 'name',
  type: 'text',
  required: false,
  description: 'A simulated customer name for Create Customer - echoed back, never validated or saved anywhere real.',
  helpText: "What this field is: The name to include in Create Customer's fabricated \"new customer\" response.\nWhy it matters: This node builds a fake response object using whatever you type here - no real Intuit/QuickBooks customer record is created.\nWhen to fill it: Used only by Create Customer; ignored by every other operation.\nWhat to enter: Any text - it is echoed back unchanged.\nWhere the value comes from: Type it directly, or map it from an earlier node's output such as {{$json.formName}}.\nHow to use it later: Echoed back as {{$json.data.name}} on Create Customer.\nAccepted format: Freeform text.\nReal workplace example: Not applicable for production use.\nIf it is empty or wrong: Nothing errors - Create Customer still \"succeeds\" with an undefined name in the fabricated response.\nCommon mistake: Assuming a real QuickBooks customer record now exists with this name - it does not; nothing is sent to Intuit.",
  placeholder: 'Acme Corp',
  example: 'Acme Corp',
};

const emailField: FieldDoc = {
  name: 'Customer Email',
  internalKey: 'email',
  type: 'email',
  required: false,
  description: 'A simulated customer email for Create Customer - echoed back, never validated or saved anywhere real.',
  helpText: "What this field is: The email address to include in Create Customer's fabricated \"new customer\" response.\nWhy it matters: Like Customer Name, this is only echoed back into the fake response object - no real Intuit/QuickBooks record is created or updated.\nWhen to fill it: Used only by Create Customer; ignored by every other operation.\nWhat to enter: Any text, including an invalid email format - the mock implementation does not validate this as a real email address.\nWhere the value comes from: Type it directly, or map it from an earlier node's output such as {{$json.formEmail}}.\nHow to use it later: Echoed back as {{$json.data.email}} on Create Customer.\nAccepted format: Freeform text - no real email validation is applied.\nReal workplace example: Not applicable for production use.\nIf it is empty or wrong: Nothing errors - Create Customer still \"succeeds\" with an undefined email in the fabricated response.\nCommon mistake: Assuming an invoice or notification will actually be emailed to this address - this node never sends anything to Intuit or to this email address.",
  placeholder: 'contact@acme.com',
  example: 'contact@acme.com',
};

const amountField: FieldDoc = {
  name: 'Invoice Amount',
  internalKey: 'amount',
  type: 'number',
  required: false,
  description: 'A simulated invoice amount for Create Invoice - echoed back, never validated or billed anywhere real.',
  helpText: "What this field is: The amount to include in Create Invoice's fabricated \"new invoice\" response.\nWhy it matters: This value is only echoed back into the fake invoice object this node builds - no real Intuit/QuickBooks invoice is created and no customer is actually billed.\nWhen to fill it: Used only by Create Invoice; ignored by every other operation.\nWhat to enter: Any number - the mock implementation does not enforce currency, decimal places, or minimum/maximum values.\nWhere the value comes from: Type it directly, or map it from an earlier node's output such as {{$json.orderTotal}}.\nHow to use it later: Echoed back as {{$json.data.amount}} on Create Invoice.\nAccepted format: A number - defaults to 0 if left empty.\nReal workplace example: Not applicable for production use.\nIf it is empty or wrong: Left empty, it defaults to 0 in the fabricated response rather than raising an error.\nCommon mistake: Assuming a real invoice for this amount now exists in QuickBooks and could be sent to a customer - nothing is created in Intuit; the invoiceId returned is a locally-generated placeholder, not a real Intuit invoice number.",
  placeholder: '1000',
  example: '1000',
};

const dataField: FieldDoc = {
  name: 'Data',
  internalKey: 'data',
  type: 'json',
  required: false,
  description: 'A field shown in the node editor that the mock execution engine never reads.',
  helpText: "What this field is: A Data (JSON) box in the node editor, intended for additional create/update payload data.\nWhy it matters: The mock execution code never reads this value for any operation - filling it currently has zero effect, unlike Customer Id/Name/Email/Amount, which are at least echoed back.\nWhen to fill it: There is currently no working scenario where filling this field changes the node's behavior; leave it blank.\nWhat to enter: Nothing is required - whatever JSON you type here is not used.\nWhere the value comes from: Not applicable today.\nHow to use it later: Not applicable - this value never appears in {{$json.data}} or any other output key.\nAccepted format: Valid JSON, though format has no effect since the value is unused.\nReal workplace example: None - use the Customer Id/Customer Name/Customer Email/Invoice Amount fields instead, since those are the only fields this mock node actually reads.\nIf it is empty or wrong: Nothing changes either way.\nCommon mistake: Assuming this is where extra customer or invoice fields belong (as the label suggests) - it is currently a dead field; only the five other named fields have any effect.",
  placeholder: '{"name":"Acme Corp","email":"contact@acme.com"}',
};

const sharedFields: FieldDoc[] = [operationField, apiKeyField, accessTokenField, credentialIdField];

const getCustomersOperation: OperationDoc = {
  name: 'Get Customers',
  value: 'getCustomers',
  description: 'Returns two fixed, hardcoded demo customer records. This does not query your real Intuit/QuickBooks account - the same two rows come back every time, regardless of credentials or any other input.',
  fields: [...sharedFields],
  outputExample: {
    success: true,
    data: [
      { id: '1', name: 'SME Customer 1', email: 'customer1@example.com' },
      { id: '2', name: 'SME Customer 2', email: 'customer2@example.com' },
    ],
    message: 'Successfully retrieved customers',
    error: null,
  },
  outputDescription: 'success: true whenever the credential check passes (this is a mock operation, so it always succeeds once Api Key/Access Token is non-empty). data: a fixed array of two demo customer records - always the same two rows. message: a fixed human-readable status string. error: always null on success. _error: present only when the credential check fails, for example "API Key or Access Token is required for Intuit SME operations".',
  usageExample: {
    scenario: 'Prototype a workflow shape that will eventually list real Intuit/QuickBooks customers, using fixed demo data as a placeholder during development.',
    inputValues: { operation: 'getCustomers', apiKey: 'test-key' },
    expectedOutput: 'Returns the same two demo customers every time as {{$json.data}} - this does not reflect your real Intuit account.',
  },
  externalDocsUrl: 'https://developer.intuit.com/app/developer/qbo/docs/get-started',
};

const createCustomerOperation: OperationDoc = {
  name: 'Create Customer',
  value: 'createCustomer',
  description: 'Builds a fabricated "new customer" confirmation object from the Customer Name and Customer Email fields you typed in. No real Intuit/QuickBooks customer is created - nothing is saved anywhere outside this workflow run.',
  fields: [...sharedFields, nameField, emailField, dataField],
  outputExample: {
    success: true,
    data: { customerId: 'CUST-1752940800000', name: 'Acme Corp', email: 'contact@acme.com', createdAt: '2026-07-19T00:00:00.000Z' },
    message: 'Successfully created customer',
    error: null,
  },
  outputDescription: 'success: true whenever the credential check passes. data: a fabricated customer object - customerId is a locally-generated placeholder (CUST-<timestamp>), not a real Intuit customer ID; name/email echo back exactly what you typed, unvalidated. message: a fixed human-readable status string. error: always null on success.',
  usageExample: {
    scenario: 'Prototype the "create a customer" step of a workflow before a real Intuit/QuickBooks integration exists, using fabricated confirmation data as a placeholder.',
    inputValues: { operation: 'createCustomer', apiKey: 'test-key', name: 'Acme Corp', email: 'contact@acme.com' },
    expectedOutput: 'Returns a fabricated {{$json.data.customerId}} - no real customer exists in Intuit/QuickBooks with this ID.',
  },
  externalDocsUrl: 'https://developer.intuit.com/app/developer/qbo/docs/get-started',
};

const updateCustomerOperation: OperationDoc = {
  name: 'Update Customer',
  value: 'updateCustomer',
  description: 'Builds a fabricated "customer updated" confirmation object from the Customer Id field you typed in. No real Intuit/QuickBooks customer is changed - the node does not even check whether a customer with this ID exists.',
  fields: [...sharedFields, customerIdField, dataField],
  outputExample: {
    success: true,
    data: { customerId: 'CUST-123', updated: true, updatedAt: '2026-07-19T00:00:00.000Z' },
    message: 'Successfully updated customer',
    error: null,
  },
  outputDescription: 'success: true whenever the credential check passes. data: a fabricated confirmation object - customerId simply echoes back whatever you typed (real or fake), updated is always true, and updatedAt is just the current timestamp. message: a fixed human-readable status string. error: always null on success.',
  usageExample: {
    scenario: 'Prototype the "update a customer" step of a workflow before a real Intuit/QuickBooks integration exists.',
    inputValues: { operation: 'updateCustomer', apiKey: 'test-key', customerId: 'CUST-123' },
    expectedOutput: '{{$json.data.updated}} is always true - this confirms nothing about a real record, since no existence check happens.',
  },
  externalDocsUrl: 'https://developer.intuit.com/app/developer/qbo/docs/get-started',
};

const getInvoicesOperation: OperationDoc = {
  name: 'Get Invoices',
  value: 'getInvoices',
  description: 'Returns two fixed, hardcoded demo invoice records. This does not query your real Intuit/QuickBooks account - the same two rows come back every time, regardless of credentials or any other input.',
  fields: [...sharedFields],
  outputExample: {
    success: true,
    data: [
      { invoiceId: 'INV-001', customerId: '1', amount: 1000, status: 'paid' },
      { invoiceId: 'INV-002', customerId: '2', amount: 2500, status: 'pending' },
    ],
    message: 'Successfully retrieved invoices',
    error: null,
  },
  outputDescription: 'success: true whenever the credential check passes. data: a fixed array of two demo invoice records - always the same two rows. message: a fixed human-readable status string. error: always null on success.',
  usageExample: {
    scenario: 'Prototype a workflow shape that will eventually list real Intuit/QuickBooks invoices, using fixed demo data as a placeholder during development.',
    inputValues: { operation: 'getInvoices', apiKey: 'test-key' },
    expectedOutput: 'Returns the same two demo invoices every time as {{$json.data}} - this does not reflect your real Intuit account.',
  },
  externalDocsUrl: 'https://developer.intuit.com/app/developer/qbo/docs/get-started',
};

const createInvoiceOperation: OperationDoc = {
  name: 'Create Invoice',
  value: 'createInvoice',
  description: 'Builds a fabricated "new invoice" confirmation object from the Customer Id and Invoice Amount fields you typed in. No real Intuit/QuickBooks invoice is created and no customer is actually billed.',
  fields: [...sharedFields, customerIdField, amountField, dataField],
  outputExample: {
    success: true,
    data: { invoiceId: 'INV-1752940800000', customerId: 'CUST-123', amount: 1000, status: 'created', createdAt: '2026-07-19T00:00:00.000Z' },
    message: 'Successfully created invoice',
    error: null,
  },
  outputDescription: 'success: true whenever the credential check passes. data: a fabricated invoice object - invoiceId is a locally-generated placeholder (INV-<timestamp>), not a real Intuit invoice number; customerId/amount echo back exactly what you typed, unvalidated. message: a fixed human-readable status string. error: always null on success.',
  usageExample: {
    scenario: 'Prototype the "create an invoice" step of a workflow before a real Intuit/QuickBooks integration exists.',
    inputValues: { operation: 'createInvoice', apiKey: 'test-key', customerId: 'CUST-123', amount: '1000' },
    expectedOutput: 'Returns a fabricated {{$json.data.invoiceId}} - no real invoice exists in Intuit/QuickBooks, and no customer is billed.',
  },
  externalDocsUrl: 'https://developer.intuit.com/app/developer/qbo/docs/get-started',
};

export const intuitSmesDoc: NodeDoc = {
  slug: 'intuit_smes',
  displayName: "Intuit - SME'S",
  category: 'CRM',
  logoUrl: '/icons/nodes/intuit_smes.svg',
  description: 'Mock/demo Intuit SME node for prototyping customer and invoice workflow shapes. Does not currently call the real Intuit/QuickBooks API - every operation returns fixed or fabricated demo data.',
  credentialType: 'Intuit / QuickBooks (mock/demo)',
  credentialSetupSteps: [
    'Important: This node is a mock/demo integration. It does not call the real Intuit/QuickBooks API today - Get Customers and Get Invoices always return the same two fixed demo rows, and Create Customer/Update Customer/Create Invoice only echo back the values you typed into the node as a fabricated confirmation, without saving anything in Intuit/QuickBooks.',
    'What this is: A placeholder Intuit/QuickBooks connection in Connections, kept ready for when this node is upgraded to call the real Intuit API.',
    'Where to start: developer.intuit.com if you want to prepare a real API Key or OAuth2 Access Token now for future use - this is optional today since neither value is currently checked beyond being non-empty.',
    'How to connect: In CtrlChecks, open Connections -> Add Connection -> Intuit / QuickBooks, then paste any value into API Key or Access Token (a real credential is not required for this node to run today, since neither is validated or sent anywhere).',
    'Important: Even though this credential is not functionally used yet, still treat any real Intuit API key or OAuth2 token like a bank password and store it in Connections, not in a plain workflow field, in case this node is later connected to the real Intuit API.',
    'Test it: Save the connection, add an Intuit SME node with Operation set to Get Customers, run it, and confirm CtrlChecks returns the two fixed demo customer records - this confirms the node runs, not that it is connected to a real Intuit account.',
    'Connect the Intuit SME output to a logging, If/Else, or follow-up node when later steps should inspect {{$json.data}} or {{$json.message}}. Downstream service node account connection setup is still required for nodes after Intuit SME; this connection does not yet authorize any real Intuit/QuickBooks operation.',
  ],
  credentialDocsUrl: 'https://developer.intuit.com/app/developer/qbo/docs/develop/authentication-and-authorization',
  resources: [
    {
      name: 'Operations',
      description: 'All five operations are simulated. Get Customers and Get Invoices always return the same two fixed demo rows; Create Customer, Update Customer, and Create Invoice echo back your typed-in values as a fabricated confirmation. None of the five contact the real Intuit/QuickBooks API.',
      operations: [getCustomersOperation, createCustomerOperation, updateCustomerOperation, getInvoicesOperation, createInvoiceOperation],
    },
  ],
  commonErrors: [
    {
      error: 'API Key or Access Token is required for Intuit SME operations',
      cause: 'Both the Api Key and Access Token fields were left empty when the node ran.',
      fix: 'Type any non-empty value into Api Key or Access Token - since this is a mock/demo node, any placeholder text satisfies this check today.',
    },
    {
      error: 'Unknown operation: <operation>',
      cause: 'The Operation field held a value outside the five recognized values.',
      fix: 'Choose one of Get Customers, Create Customer, Update Customer, Get Invoices, or Create Invoice from the Operation dropdown.',
    },
    {
      error: 'Intuit SME operation failed',
      cause: 'An unexpected internal error occurred while building the mock response (rare, since this node performs almost no validation).',
      fix: 'Re-run the node; if the error persists, check the CtrlChecks worker logs for the underlying JavaScript error.',
    },
    {
      error: 'A fabricated response is mistaken for a real Intuit/QuickBooks record',
      cause: 'This node is a mock/demo integration - Get Customers/Get Invoices always return the same two fixed rows, and Create/Update operations only echo back what you typed without saving anything to Intuit.',
      fix: 'Do not use this node for production Intuit/QuickBooks workflows until it is upgraded to call the real API; use it only to prototype a workflow\'s shape.',
    },
  ],
  relatedNodes: [],
};
