import type { NodeDoc } from '../types';

const urlHelpText = `What this field means: URL is the full web address the HTTP Request node should call.

Why it matters: The URL tells the workflow exactly which API endpoint, webhook, or public web service should receive the request. A small mistake in the host, path, or ID usually means the request fails or updates the wrong record.

When to fill it: Fill it every time you use HTTP Request. The backend requires url and returns _error: "HTTP Request node: URL is required" when it is blank.

What to enter: Enter the full URL, including https:// for external services. Include the resource path and any fixed path IDs the API documentation requires.

Where the value comes from: Copy it from the service API documentation, developer dashboard, webhook setup page, or from a previous workflow step that already produced an endpoint or record ID.

How to use it later: The final called URL is returned as {{$json.url}}. Use it in a Log Output, Slack, Email, or troubleshooting step to confirm which endpoint the workflow actually called.

Accepted format: A valid http:// or https:// URL, or a workflow expression that resolves to one. You can combine fixed text and previous data, such as https://api.example.com/customers/{{$json.customerId}}.

Real workplace example: After a CRM lookup returns customerId, call https://api.billing.example.com/v1/customers/{{$json.customerId}}/invoices to fetch that customer's latest invoice status.

If it is empty or wrong: Empty returns _error. A wrong domain can cause DNS errors, a wrong path can return 404, and a missing dynamic ID can call the wrong endpoint or fail validation.

Common mistake: Putting query filters only in the URL while also filling Query String Params with the same keys. Keep fixed path values in URL and put filters such as status, page, and limit in Query String Params when possible.`;

const methodHelpText = `What this field means: Method tells the API what kind of action you want to perform.

Why it matters: APIs use the method to decide whether the workflow is reading data, creating a new item, replacing an item, partially updating an item, or deleting an item.

When to fill it: Fill it when the API documentation asks for anything other than GET. Leave GET for ordinary read requests.

What to enter: Choose GET to read data without a request body. Choose POST to create or submit data. Choose PUT to replace an entire resource. Choose PATCH to update only selected fields. Choose DELETE to remove or cancel a resource.

Where the value comes from: Use the exact method shown in the API documentation for the endpoint. The same URL path can behave very differently with different methods.

How to use it later: The method used by the failed or completed request is included in error details when runtime returns _error, which helps a troubleshooting node or support message explain what was attempted.

Accepted format: One of GET, POST, PUT, PATCH, or DELETE. Runtime uppercases the configured method before sending the request.

Real workplace example: Use GET to fetch a customer's subscription, POST to create a support ticket, PUT to replace a customer profile, PATCH to update only the plan field, and DELETE to cancel a test record.

If it is empty or wrong: Empty behaves like GET. The wrong method can return 405 Method Not Allowed, create duplicate records, fail to send Body, or delete something you only meant to read.

Common mistake: Adding a Body while Method is GET or DELETE. Runtime sends Body only for POST, PUT, and PATCH.`;

const headersHelpText = `What this field means: Headers are extra key-value instructions sent with the request, such as content type, accepted response type, request IDs, or authorization details.

Why it matters: Protected APIs often reject requests unless required headers are present. JSON APIs also commonly need Content-Type and Accept headers so the service knows what you are sending and what response format you expect.

When to fill it: Fill it when the API documentation lists required headers, when sending a JSON body, when calling an authenticated API, or when a service asks for a custom header such as X-API-Key.

What to enter: Enter a JSON object such as {"Content-Type":"application/json","Accept":"application/json"}. For protected APIs, reference an approved secret or credential expression rather than hardcoding the token.

Where the value comes from: Copy header names from the API documentation. Authorization values come from the service's developer settings, OAuth flow, connection system, or environment/secret store your deployment provides.

How to use it later: Response headers are returned as {{$json.headers}}. Use them to inspect rate-limit information, request IDs, pagination links, content type, or troubleshooting details.

Accepted format: JSON object with header names as keys and text values as values. Use double quotes, no trailing commas, and exact spelling such as Authorization, Content-Type, Accept, or X-API-Key.

Real workplace example: A support workflow creates a ticket through an internal API with {"Content-Type":"application/json","Accept":"application/json","X-Request-Source":"ctrlchecks-workflow"}.

If it is empty or wrong: Public APIs may still work. Protected APIs may return 401 Unauthorized, 403 Forbidden, 415 Unsupported Media Type, or an HTML error body instead of JSON.

Common mistake: Pasting long-lived API keys, bearer tokens, passwords, or private credentials directly into Headers. HTTP Request has no saved credential type; use a secure connection, environment value, or approved secret reference when authentication is required.`;

const bodyHelpText = `What this field means: Body is the data sent to the API when the request creates or updates something.

Why it matters: POST, PUT, and PATCH endpoints usually need Body to know which customer, ticket, order, message, or record to create or change.

When to fill it: Fill it for POST, PUT, and PATCH when the API documentation says the endpoint expects a request body. Leave it empty for GET and DELETE unless the API explicitly says otherwise, because runtime only sends Body for POST, PUT, and PATCH.

What to enter: Enter a JSON object for most modern APIs, such as {"email":"{{$json.customerEmail}}","subject":"{{$json.ticketSubject}}","priority":"high"}. Plain text is possible only when the API expects text.

Where the value comes from: Map values from a trigger, form, webhook, CRM lookup, database row, or previous transformation node. Use exact field paths from the previous node output.

How to use it later: Body itself is not returned unless the remote API echoes it back. The API response is available as {{$json.body}} and mirrored as {{$json.data}}.

Accepted format: JSON object, JSON text, or plain string when the API expects raw text. Use valid JSON for application/json requests and include Content-Type: application/json in Headers.

Real workplace example: After a website form, create an external support ticket with {"requesterEmail":"{{$json.email}}","subject":"New billing question","message":"{{$json.message}}","source":"Website form"}.

If it is empty or wrong: The API may return 400 Bad Request, validation errors inside {{$json.body}}, 415 Unsupported Media Type, or create a record with missing fields.

Common mistake: Sending the entire previous {{$json}} object when the API expects only a few fields. Build a small body that matches the API schema so private or unrelated workflow data is not sent accidentally.`;

const qsHelpText = `What this field means: Query String Params are filters and options added to the URL after the question mark.

Why it matters: APIs use query parameters for searches, pagination, date ranges, sorting, limits, and optional flags without changing the main endpoint path.

When to fill it: Fill it when the API documentation shows parameters such as page, limit, status, since, email, search, sort, or include. Leave it empty when all required values are already in the URL path or Body.

What to enter: Enter a JSON object where each key is a query parameter name and each value is the value to append, such as {"status":"open","limit":50,"email":"{{$json.customerEmail}}"}.

Where the value comes from: Copy allowed parameter names from the API documentation. Values can be fixed filters, dates from a Schedule trigger, IDs from a CRM node, or user input from a form.

How to use it later: The final URL with applied parameters is returned as {{$json.url}}, which helps confirm the request searched for the expected records.

Accepted format: JSON object only. Do not include the leading question mark. Runtime appends each key and value to the URL and skips null or empty values.

Real workplace example: A daily helpdesk report calls https://api.support.example.com/tickets with Query String Params {"status":"open","created_after":"{{$json.reportStartDate}}","limit":100}.

If it is empty or wrong: Empty sends no extra filters. Wrong parameter names may be ignored by the API, return too many results, or return an empty list.

Common mistake: Placing the same parameter in both URL and Query String Params. Runtime sets the parameter value from Query String Params, so duplicates can make troubleshooting confusing.`;

const timeoutHelpText = `What this field means: Timeout is how long the workflow waits for the remote server to respond before stopping the request.

Why it matters: It prevents one slow or unreachable API from blocking the whole workflow for too long.

When to fill it: Use the default for normal APIs. Increase it for slow reports, large exports, file downloads, or services known to respond slowly. Decrease it when the workflow should fail fast and notify someone.

What to enter: Enter milliseconds. 10000 means ten seconds, 30000 means thirty seconds, and 60000 means one minute if your deployment allows it.

Where the value comes from: Choose it from the API service-level agreement, response size, and how long the business process can wait before taking another path.

How to use it later: On timeout, runtime returns _error and errorDetails.timeout with the attempted url and method. A downstream alert can include {{$json._error}}, {{$json.url}}, and {{$json.method}}.

Accepted format: Positive whole number in milliseconds. The runtime defaults to 30000 when the value is blank or invalid.

Real workplace example: Set Timeout to 60000 for a monthly accounting export API, but keep 10000 for a customer lookup that should quickly route to a fallback if the API is unavailable.

If it is empty or wrong: Empty or invalid values use 30000. Too low can fail healthy but slow APIs. Too high can make users wait longer for known failures.

Common mistake: Treating Timeout as a retry setting. This node currently waits for the configured time once; retries should be handled by a separate retry pattern or upstream reliability configuration.`;

export const httpRequestDoc: NodeDoc = {
  slug: 'http_request',
  displayName: 'HTTP Request',
  category: 'HTTP & API',
  logoUrl: '/icons/nodes/http_request.svg',
  description: 'Call an external HTTP API or webhook, send optional headers, query parameters, and body data, then pass the response to the next workflow step.',
  credentialType: 'None - HTTP Request does not use credentials or a saved third-party account connection by itself.',
  credentialSetupSteps: [
    'No saved account connection is required for public endpoints or internal URLs that do not need authentication.',
    'Connect the incoming output from a trigger, form, webhook, database, CRM, or transformation node when the URL, query parameters, headers, or body should use previous workflow data.',
    'Connect the HTTP Request output to the next node that should use {{$json.status}}, {{$json.body}}, {{$json.data}}, {{$json.headers}}, {{$json.url}}, or {{$json._error}}.',
    'Protected APIs may still require authorization headers. Use a secure connection, environment value, or approved secret reference instead of pasting API keys, tokens, or passwords into workflow input fields.',
    'Downstream service node account connection setup is still required for Gmail, Slack, CRM, database, storage, and messaging nodes; HTTP Request does not replace those provider credentials.',
  ],
  credentialDocsUrl: 'https://docs.ctrlchecks.com',
  resources: [
    {
      name: 'Request',
      description: 'Use this resource to choose the endpoint, method, request headers, query parameters, optional body, and timeout for a single HTTP call.',
      operations: [
        {
          name: 'Send Request',
          value: 'default',
          description: 'Sends one HTTP request using GET, POST, PUT, PATCH, or DELETE. Choose this operation to fetch data from an API, submit a webhook payload, create a record in an external system, update a remote resource, or call an internal service from a workflow.',
          fields: [
            {
              name: 'URL',
              internalKey: 'url',
              type: 'url',
              required: true,
              description: 'Full endpoint URL to call, including protocol and path.',
              helpText: urlHelpText,
              placeholder: 'https://api.example.com/customers/{{$json.customerId}}',
              example: 'https://api.billing.example.com/v1/customers/{{$json.customerId}}/invoices',
              notes: 'URL is the only required backend field. Use Query String Params for filters and pagination when the API supports them.',
            },
            {
              name: 'Method',
              internalKey: 'method',
              type: 'select',
              required: false,
              description: 'HTTP action to perform against the URL.',
              helpText: methodHelpText,
              options: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
              defaultValue: 'GET',
              example: 'POST',
              notes: 'GET reads data. POST creates or submits data. PUT replaces a whole record. PATCH updates selected fields. DELETE removes or cancels a resource.',
            },
            {
              name: 'Headers (JSON)',
              internalKey: 'headers',
              type: 'json',
              required: false,
              description: 'Optional request headers such as Content-Type, Accept, Authorization, or service-specific headers.',
              helpText: headersHelpText,
              placeholder: '{"Content-Type":"application/json","Accept":"application/json"}',
              example: '{"Content-Type":"application/json","Accept":"application/json","X-Request-Source":"ctrlchecks-workflow"}',
              notes: 'Use secure secret references for authentication values. Do not paste private tokens into the workflow configuration.',
            },
            {
              name: 'Body (JSON)',
              internalKey: 'body',
              type: 'json',
              required: false,
              description: 'Request payload sent for POST, PUT, and PATCH methods.',
              helpText: bodyHelpText,
              placeholder: '{"email":"{{$json.customerEmail}}","status":"new"}',
              example: '{"requesterEmail":"{{$json.email}}","subject":"New billing question","message":"{{$json.message}}","source":"Website form"}',
              notes: 'Conditional field: Body matters for POST, PUT, and PATCH. Runtime does not send Body for GET or DELETE.',
            },
            {
              name: 'Query String Params (JSON)',
              internalKey: 'qs',
              type: 'json',
              required: false,
              description: 'Optional query parameters merged onto the URL.',
              helpText: qsHelpText,
              placeholder: '{"status":"open","limit":100}',
              example: '{"status":"open","created_after":"{{$json.reportStartDate}}","limit":100}',
              notes: 'Runtime appends these values to the final URL and returns that final URL as {{$json.url}}.',
            },
            {
              name: 'Timeout (ms)',
              internalKey: 'timeout',
              type: 'number',
              required: false,
              description: 'Maximum time to wait for the remote API response, in milliseconds.',
              helpText: timeoutHelpText,
              placeholder: '30000',
              defaultValue: '30000',
              example: '30000',
              notes: 'Timeout controls wait time for one request. It is not a retry count.',
            },
          ],
          outputExample: {
            status: 200,
            statusText: 'OK',
            headers: {
              'content-type': 'application/json; charset=utf-8',
              'x-request-id': 'req_789',
            },
            body: {
              customerId: 'cus_1042',
              customerEmail: 'asha.rao@example.com',
              invoiceStatus: 'paid',
              balanceDue: 0,
            },
            data: {
              customerId: 'cus_1042',
              customerEmail: 'asha.rao@example.com',
              invoiceStatus: 'paid',
              balanceDue: 0,
            },
            url: 'https://api.billing.example.com/v1/customers/cus_1042/invoices?limit=1',
            acknowledgementStatus: 'acknowledged',
          },
          outputDescription: 'status: HTTP response code. statusText: HTTP reason text from the server. headers: Response headers such as content-type, rate-limit, or request ID values. body: Parsed response body when JSON is returned, otherwise response text. data: Same parsed response body for downstream mapping convenience. url: Final URL after Query String Params were applied. acknowledgementStatus: Runtime acknowledgement metadata from response reading. If the request cannot be sent or times out, the node returns _error plus url, method, and errorDetails.',
          usageExample: {
            scenario: 'Fetch the latest billing status for a customer after a CRM trigger provides the customer ID',
            inputValues: {
              url: 'https://api.billing.example.com/v1/customers/{{$json.customerId}}/invoices',
              method: 'GET',
              headers: '{"Accept":"application/json","X-Request-Source":"ctrlchecks-workflow"}',
              body: '',
              qs: '{"limit":1,"status":"latest"}',
              timeout: '30000',
            },
            expectedOutput: 'The next If/Else, Email, Slack, or CRM node can use {{$json.status}}, {{$json.body.invoiceStatus}}, {{$json.data.customerEmail}}, {{$json.headers}}, and {{$json.url}} from the HTTP response.',
          },
          externalDocsUrl: 'https://docs.ctrlchecks.com',
        },
      ],
    },
  ],
  commonErrors: [
    {
      error: 'HTTP Request node: URL is required',
      cause: 'The URL field is blank, or a mapped expression resolved to an empty value.',
      fix: 'Enter a full https:// URL or run the previous node and map a field that actually contains the endpoint.',
    },
    {
      error: 'URL must be valid or an expression',
      cause: 'The backend validation rejected a URL that does not start with http or resolve from a workflow expression.',
      fix: 'Use a complete URL such as https://api.example.com/v1/customers or an expression that resolves to one.',
    },
    {
      error: 'fetch failed - Network error',
      cause: 'The worker could not reach the server because the domain is wrong, the service is down, SSL failed, or the network blocked the request.',
      fix: 'Check the final {{$json.url}}, test it in an API client, confirm the service is reachable, and verify SSL/certificate settings.',
    },
    {
      error: 'Request timeout',
      cause: 'The remote API took longer than the configured Timeout value to respond.',
      fix: 'Increase Timeout for genuinely slow endpoints, reduce response size with Query String Params, or route to a fallback/alert path.',
    },
    {
      error: '401 or 403 authorization error',
      cause: 'The endpoint requires authentication, a permission scope is missing, or the authorization header value is expired or wrong.',
      fix: 'Use a secure credential, connection, environment value, or approved secret reference for the header and confirm the account has the required API access.',
    },
    {
      error: '400 or validation error from API',
      cause: 'The Body or Query String Params do not match the API schema, required fields are missing, or values have the wrong type.',
      fix: 'Compare the request with the API documentation and inspect {{$json.body}} for the service-specific validation message.',
    },
    {
      error: 'Next node cannot find response field',
      cause: 'The downstream node is reading an old key or assuming the response body is at the top level instead of under body or data.',
      fix: 'Use {{$json.body.fieldName}} or {{$json.data.fieldName}} for response content, and {{$json.status}} for the HTTP status code.',
    },
    {
      error: 'Permission denied after HTTP Request',
      cause: 'HTTP Request has no saved credentials, but the service node after it may still be missing its own connected account or permission to send, create, update, upload, or write data.',
      fix: 'Connect the required account on the downstream service node and confirm that provider permission separately from the HTTP Request configuration.',
    },
  ],
  relatedNodes: ['webhook', 'respond_to_webhook', 'webhook_response', 'graphql', 'http_post'],
};
