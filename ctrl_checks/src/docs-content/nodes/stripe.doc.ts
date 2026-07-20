import type { FieldDoc, NodeDoc, OperationDoc } from '../types';

const docsUrl = 'https://docs.stripe.com/api';

function rich(label: string, meaning: string, enter: string, wrong: string, source = 'Type the value directly or map it from an earlier step such as {{$json.customerId}}.'): string {
  return (
    `What this field is: ${label} - ${meaning}\n` +
    `Why it matters: Stripe uses this value to choose the API action, authenticate the request, identify the customer/payment, or set the money amount.\n` +
    `When to fill it: Fill it when the selected Stripe operation needs it; leave optional fields blank only when Stripe can complete the request without them.\n` +
    `What to enter: ${enter}\n` +
    `Where the value comes from: ${source}\n` +
    `How to use it later: Downstream nodes can read Stripe results from paths such as {{$json.paymentIntent.id}}, {{$json.customer.id}}, {{$json.refund.id}}, {{$json.items}}, {{$json.subscription.id}}, {{$json.invoice.id}}, or {{$json._error}}.\n` +
    `Accepted format: Use Stripe IDs exactly as returned by Stripe, lowercase three-letter currency codes, numeric amounts in the smallest currency unit, and valid JSON only for JSON-style fields.\n` +
    `Real workplace example: A checkout workflow maps {{$json.amountCents}} into Amount, {{$json.customerId}} into Customer ID, and stores {{$json.paymentIntent.id}} after the node runs.\n` +
    `If it is empty or wrong: ${wrong}\n` +
    `Common mistake: Typing display amounts like 10.00 when Stripe expects cents, or selecting a visual operation alias that the runtime does not currently support.`
  );
}

const fields: FieldDoc[] = [
  {
    name: 'Operation',
    internalKey: 'operation',
    type: 'select',
    required: true,
    description: 'Runtime-supported values include charge, payment, paymentintent, refund, create_customer, get_payment_intent, list_payment_intents, create_subscription, and create_invoice. The visual panel also exposes create_payment, create_payment_intent, get_payment, list_payments, and create_refund; those aliases are not currently recognized.',
    options: ['charge', 'payment', 'paymentintent', 'refund', 'create_customer', 'get_payment_intent', 'list_payment_intents', 'create_subscription', 'create_invoice', 'create_payment', 'create_payment_intent', 'get_payment', 'list_payments', 'create_refund'],
    defaultValue: 'paymentintent',
    helpText: rich('Operation', 'the Stripe action to run.', 'Use paymentintent/charge/payment to create a PaymentIntent or legacy charge, refund for refunds, create_customer, get_payment_intent, list_payment_intents, create_subscription, or create_invoice. create_payment, create_payment_intent, get_payment, list_payments, and create_refund are visible today but fail as unsupported aliases.', 'If blank, the node returns Stripe: operation is required. Unsupported aliases return Stripe: Unsupported operation "...".'),
  },
  { name: 'API Key', internalKey: 'apiKey', type: 'string', required: false, description: 'Optional Stripe secret key fallback; prefer a saved Stripe connection.', placeholder: 'sk_test_...', helpText: rich('API Key', 'a Stripe secret key used only when no saved Stripe credential supplies one.', 'Usually leave blank and use Connections. For a test fallback, enter a key beginning sk_test_ or sk_live_.', 'If no saved credential and no apiKey exist, the node returns Stripe: API key not found.', 'Stripe Dashboard -> Developers -> API keys, but production keys should be stored in Connections/credential vault rather than regular workflow fields.') },
  { name: 'Amount', internalKey: 'amount', type: 'number', required: false, description: 'Amount in the smallest currency unit.', placeholder: '1000', helpText: rich('Amount', 'the amount to charge or optionally refund, in cents/paise/minor units.', 'Enter 1000 for USD 10.00, 5000 for USD 50.00, or map {{$json.amountCents}}.', 'For charge/paymentintent, missing or non-positive Amount returns Stripe charge: amount (in cents) is required. For refund, missing Amount creates a full refund request.') },
  { name: 'Currency', internalKey: 'currency', type: 'string', required: false, description: 'Lowercase three-letter Stripe currency code.', placeholder: 'usd', defaultValue: 'usd', helpText: rich('Currency', 'the currency for created PaymentIntents or legacy charges.', 'Enter usd, eur, gbp, inr, or another Stripe-supported lowercase currency code.', 'Unsupported or account-disabled currencies are rejected by Stripe and returned through _errorDetails.') },
  { name: 'Description', internalKey: 'description', type: 'textarea', required: false, description: 'Optional description sent to Stripe.', placeholder: 'Order #12345', helpText: rich('Description', 'a note stored on the payment, customer, or invoice when that operation sends it.', 'Enter a short business reference such as Order {{$json.orderId}} or Renewal invoice for {{$json.company}}.', 'Blank descriptions are allowed, but incorrect references make reconciliation harder in Stripe reports.') },
  { name: 'Source Token', internalKey: 'source', type: 'string', required: false, description: 'Legacy Charges API source token.', placeholder: 'tok_visa', helpText: rich('Source Token', 'a legacy Stripe source token used only when creating a legacy charge.', 'Use tok_visa in test mode or map a token from a secure checkout step. Payment Method ID is preferred for modern flows.', 'If blank during a charge/payment operation, the runtime creates a PaymentIntent instead of a legacy charge.') },
  { name: 'Payment Method ID', internalKey: 'paymentMethodId', type: 'string', required: false, description: 'Stripe PaymentMethod ID for PaymentIntent creation.', placeholder: 'pm_...', helpText: rich('Payment Method ID', 'the saved or collected payment method to attach to a new PaymentIntent.', 'Enter a pm_... value from Stripe Checkout, Elements, or a previous Stripe step.', 'If wrong, Stripe returns a payment_intents failure in _errorDetails. If blank, the PaymentIntent is created without a payment method and usually requires a later confirmation step.') },
  { name: 'Customer ID', internalKey: 'customerId', type: 'string', required: false, description: 'Stripe customer ID.', placeholder: 'cus_...', helpText: rich('Customer ID', 'the Stripe customer to associate with payments, lists, subscriptions, or invoices.', 'Enter cus_... or map {{$json.customer.id}} from a previous Create Customer step.', 'Create Subscription and Create Invoice require customerId and return specific missing-field errors when it is blank.') },
  { name: 'Customer Email', internalKey: 'email', type: 'email', required: false, description: 'Email used when creating a Stripe customer.', placeholder: 'buyer@example.com', helpText: rich('Customer Email', 'the email address saved on a new Stripe customer.', 'Enter buyer@example.com or map {{$json.email}} from a form, order, or CRM step.', 'If blank, Stripe may still create a customer with no email; if malformed, Stripe can reject the request.') },
  { name: 'Customer Name', internalKey: 'name', type: 'string', required: false, description: 'Name used when creating a Stripe customer.', placeholder: 'Ada Lovelace', helpText: rich('Customer Name', 'the customer display name saved in Stripe.', 'Enter a full name or map {{$json.customerName}}.', 'If blank, Stripe creates the customer without a name; downstream support workflows may have less context.') },
  { name: 'Charge ID', internalKey: 'chargeId', type: 'string', required: false, description: 'Legacy charge ID used for refunds.', placeholder: 'ch_...', helpText: rich('Charge ID', 'the ch_... charge to refund when not using a PaymentIntent ID.', 'Enter ch_... from a Stripe charge result or dashboard.', 'Refund needs either chargeId or paymentIntentId. If both are blank, Stripe rejects the refund request.') },
  { name: 'Payment Intent ID', internalKey: 'paymentIntentId', type: 'string', required: false, description: 'PaymentIntent ID used for get/refund operations.', placeholder: 'pi_...', helpText: rich('Payment Intent ID', 'the pi_... payment object to retrieve or refund.', 'Enter pi_... from a previous Stripe result or webhook.', 'Get Payment Intent returns Stripe get_payment: paymentIntentId is required when this is blank.') },
  { name: 'Limit', internalKey: 'limit', type: 'number', required: false, description: 'Maximum number of PaymentIntents to list.', placeholder: '10', helpText: rich('Limit', 'how many PaymentIntent records the list operation asks Stripe to return.', 'Enter a number from 1 to 100, or map {{$json.pageSize}}.', 'Invalid values are silently clamped or defaulted by the runtime to a safe range between 1 and 100.') },
  { name: 'Price ID', internalKey: 'priceId', type: 'string', required: false, description: 'Stripe Price ID for subscription creation.', placeholder: 'price_...', helpText: rich('Price ID', 'the recurring price to put into a new subscription.', 'Enter price_... from Stripe Product Catalog or map {{$json.priceId}}.', 'Create Subscription returns Stripe create_subscription: priceId is required if both priceId and metadata are blank.') },
  { name: 'Metadata (JSON)', internalKey: 'metadata', type: 'json', required: false, description: 'Panel field that the runtime only uses as a fallback text value for priceId in create_subscription.', placeholder: '{"order_id":"12345"}', helpText: rich('Metadata (JSON)', 'a visible JSON field whose current runtime behavior is not real Stripe metadata; for create_subscription it is read only as a fallback Price ID string.', 'Prefer Price ID. If used as the fallback, it must resolve to a plain price_... string, not a JSON object.', 'A JSON object here is not sent as Stripe metadata by this node today; it can make create_subscription fail because no usable priceId is found.') },
];

function op(name: string, value: string, description: string, outputExample: Record<string, unknown>, outputDescription: string, inputValues: Record<string, string>): OperationDoc {
  return {
    name,
    value,
    description,
    fields,
    outputExample,
    outputDescription,
    usageExample: {
      scenario: `${name} as part of a billing workflow that receives customer or order data from an earlier step`,
      inputValues,
      expectedOutput: `The next step can use {{$json.success}} plus operation-specific Stripe data such as {{$json.paymentIntent.id}}, {{$json.customer.id}}, {{$json.refund.id}}, {{$json.subscription.id}}, or {{$json.invoice.id}}.`,
    },
    externalDocsUrl: docsUrl,
  };
}

export const stripeDoc: NodeDoc = {
  slug: 'stripe',
  displayName: 'Stripe',
  category: 'Ecommerce',
  logoUrl: '/icons/nodes/stripe.svg',
  description: 'Create Stripe PaymentIntents or legacy charges, create customers, refund payments, list/retrieve PaymentIntents, and create subscriptions or invoices. Several visible operation aliases are currently not accepted by the runtime and are documented plainly.',
  credentialType: 'Stripe API Key',
  credentialSetupSteps: [
    'Create a Stripe Secret Key connection in CtrlChecks Connections so the credential system/credential vault can inject the key without exposing it in workflow fields.',
    'Use sk_test_ keys while building and switch to sk_live_ only when the workflow is ready for real money.',
    'The API key is used for charges, refunds, customers, subscriptions, invoices, and PaymentIntent reads. Downstream nodes still need their own saved connections.',
    'After this node runs, connect its output to the next billing, fulfillment, notification, or audit step. Each downstream service node account connection is configured separately.',
    'Never paste Stripe live secret keys into normal workflow text fields unless you are doing a short controlled test with a restricted key.',
  ],
  credentialDocsUrl: 'https://docs.stripe.com/keys',
  resources: [
    {
      name: 'Payments and Billing',
      description: 'Stripe runtime actions are selected by Operation. The executor returns raw Stripe objects under operation-specific keys and preserves incoming item fields on both success and failure.',
      operations: [
        op('Create PaymentIntent or Charge', 'paymentintent', 'Creates a modern PaymentIntent when Payment Method ID is present or Source Token is blank; otherwise it falls back to Stripe legacy Charges API. The runtime accepts charge, payment, and paymentintent, but not the panel alias create_payment_intent.', { success: true, paymentIntent: { id: 'pi_123', amount: 1000, currency: 'usd', status: 'requires_payment_method' } }, 'success: true when Stripe accepted the create request. paymentIntent: raw Stripe PaymentIntent for modern flows. charge: raw Stripe charge only when the legacy Charges API path is used. _error and _errorDetails appear when Stripe rejects the request.', { operation: 'paymentintent', amount: '{{$json.amountCents}}', currency: 'usd', paymentMethodId: '{{$json.paymentMethodId}}' }),
        op('Create Customer', 'create_customer', 'Creates a Stripe customer using optional email, name, and description fields. This is one of the visual panel values that already matches the runtime exactly.', { success: true, customer: { id: 'cus_123', email: 'buyer@example.com', name: 'Ada Lovelace' } }, 'success: true when Stripe created the customer. customer: raw Stripe customer object including id, email, name, metadata, and created fields when Stripe returns them. _error and _errorDetails appear on failure.', { operation: 'create_customer', email: '{{$json.email}}', name: '{{$json.name}}' }),
        op('Refund', 'refund', 'Creates a Stripe refund against either a Charge ID or PaymentIntent ID. A numeric Amount creates a partial refund; a blank Amount asks Stripe to refund the full eligible amount.', { success: true, refund: { id: 're_123', status: 'succeeded', payment_intent: 'pi_123' } }, 'success: true when Stripe created the refund. refund: raw Stripe refund object including refund.id, status, amount, charge, and payment_intent. _error and _errorDetails appear on failed refund requests.', { operation: 'refund', paymentIntentId: '{{$json.paymentIntentId}}', amount: '{{$json.refundAmount}}' }),
        op('Get PaymentIntent', 'get_payment_intent', 'Retrieves one PaymentIntent by ID with a GET request. The panel alias get_payment is visible today but not accepted by the executor; use get_payment_intent in generated or hand-edited configs.', { success: true, paymentIntent: { id: 'pi_123', status: 'succeeded', amount: 2500 } }, 'success: true when Stripe returned the record. paymentIntent: raw Stripe PaymentIntent object. _error and _errorDetails appear when the ID is missing, invalid, or not accessible.', { operation: 'get_payment_intent', paymentIntentId: '{{$json.paymentIntentId}}' }),
        op('List PaymentIntents', 'list_payment_intents', 'Lists PaymentIntents with an optional customer filter and a runtime-clamped limit between 1 and 100. The panel alias list_payments is visible today but not accepted by the executor.', { success: true, items: [{ id: 'pi_123', status: 'succeeded' }], stripe: { has_more: false } }, 'success: true when Stripe returned the list. items: the Stripe data array, normalized to an empty array if Stripe omits data. stripe: the full raw list response including has_more and url. _error and _errorDetails appear on API failure.', { operation: 'list_payment_intents', customerId: '{{$json.customerId}}', limit: '10' }),
        op('Create Subscription', 'create_subscription', 'Creates a subscription for one customer and one price. The executor reads priceId, or incorrectly falls back to metadata as a plain price string; it does not send actual Stripe metadata today.', { success: true, subscription: { id: 'sub_123', customer: 'cus_123', status: 'incomplete' } }, 'success: true when Stripe created the subscription. subscription: raw Stripe subscription object including subscription.id, status, customer, and items. _error and _errorDetails appear on missing customerId/priceId or Stripe API failure.', { operation: 'create_subscription', customerId: '{{$json.customerId}}', priceId: '{{$json.priceId}}' }),
        op('Create Invoice', 'create_invoice', 'Creates a draft invoice for a Stripe customer. The node sends customer and optional description; it does not finalize, send, or pay the invoice automatically.', { success: true, invoice: { id: 'in_123', customer: 'cus_123', status: 'draft' } }, 'success: true when Stripe created the invoice. invoice: raw Stripe invoice object including invoice.id, customer, status, hosted_invoice_url, and totals when Stripe returns them. _error and _errorDetails appear on failure.', { operation: 'create_invoice', customerId: '{{$json.customerId}}', description: 'Invoice for {{$json.orderId}}' }),
      ],
    },
  ],
  commonErrors: [
    { error: 'Stripe: API key not found. Provide apiKey or attach vault credential "stripe".', cause: 'No Stripe credential was found in Connections/credential vault and apiKey was blank.', fix: 'Connect Stripe in Connections or provide a temporary restricted test key in apiKey.' },
    { error: 'Stripe: operation is required (paymentintent, refund, create_customer, get_payment_intent, list_payment_intents, create_subscription, create_invoice)', cause: 'Operation was empty.', fix: 'Choose or generate one of the runtime-supported operation values.' },
    { error: 'Stripe charge: amount (in cents) is required', cause: 'A payment operation had no positive numeric Amount.', fix: 'Map a positive integer amount in cents/minor units, such as {{$json.amountCents}}.' },
    { error: 'Stripe get_payment: paymentIntentId is required', cause: 'Get PaymentIntent was run without a PaymentIntent ID.', fix: 'Map a pi_... value from a previous Stripe step or webhook.' },
    { error: 'Stripe create_subscription: customerId is required / Stripe create_subscription: priceId is required / Stripe create_invoice: customerId is required', cause: 'A billing operation was missing its required customer or price field.', fix: 'Create or retrieve the customer/price first, then map the returned IDs into this node.' },
    { error: 'Stripe: Unsupported operation "<value>"', cause: 'A visual alias such as create_payment, create_payment_intent, get_payment, list_payments, or create_refund was used, but the executor does not translate those names.', fix: 'Use paymentintent, get_payment_intent, list_payment_intents, or refund until the panel aliases are fixed.' },
  ],
  relatedNodes: ['paypal', 'shopify', 'woocommerce', 'chargebee'],
};
