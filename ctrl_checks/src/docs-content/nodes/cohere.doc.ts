import type { FieldDoc, NodeDoc } from '../types';

const help = (field: string, why: string, when: string, enter: string, source: string, later: string, format: string, example: string, wrong: string, mistake: string) => `What this field is: ${field}
Why it matters: ${why}
When to fill it: ${when}
What to enter: ${enter}
Where the value comes from: ${source}
How to use it later: ${later}
Accepted format: ${format}
Real workplace example: ${example}
If it is empty or wrong: ${wrong}
Common mistake: ${mistake}`;

const fields: FieldDoc[] = [
  { name: 'API Key', internalKey: 'apiKey', type: 'string', required: true, description: 'Cohere API key read directly by the current runtime.', helpText: help('The Cohere key used as the Bearer token for the /v1/chat request.', 'The executor does not currently retrieve a Cohere vault credential; it checks this apiKey field directly.', 'Fill it for every Cohere run unless the workflow config maps it from a secure credential expression.', 'Enter a Cohere API key or map {{$credentials.cohere.apiKey}} when your credential system injects that expression.', 'From Cohere Dashboard API Keys or a secure CtrlChecks credential value.', 'This value is not used downstream; downstream nodes use {{$json.response}}, {{$json.model}}, and token counts.', 'Secret text. Keep it out of prompts and ordinary input data.', 'A content workflow maps a saved Cohere key and sends product text for rewriting.', 'If empty, output is success false with error: Cohere apiKey is required.', 'Do not paste the key into Prompt or Preamble; use the API Key field or a secure credential mapping.'), example: '{{$credentials.cohere.apiKey}}' },
  { name: 'Model', internalKey: 'model', type: 'select', required: true, description: 'Cohere Command model used for the chat request.', options: ['command-r7b-12-2024', 'command-r-08-2024', 'command-r-plus-08-2024', 'command-nightly'], defaultValue: 'command-r-08-2024', helpText: help('The Cohere model identifier: command-r7b-12-2024, command-r-08-2024, command-r-plus-08-2024, or command-nightly.', 'It controls cost, speed, and reasoning quality for the generated response.', 'Choose it for each workflow based on task complexity.', 'Select a dropdown value exactly. R7B is fast, Command R is balanced, R+ is stronger, Nightly is experimental.', 'Chosen by the workflow designer from the models enabled on the Cohere account.', 'The selected or returned model appears in {{$json.model}}.', 'One of the four Cohere model strings listed in the dropdown.', 'A product-copy workflow uses command-r-08-2024 for balanced cost and quality.', 'Unsupported or unavailable models can return a Cohere API error.', 'Do not use old aliases like command or command-light in this UI unless the worker schema is updated.'), example: 'command-r-08-2024' },
  { name: 'Prompt', internalKey: 'prompt', type: 'textarea', required: true, description: 'User message sent to Cohere, or system context when upstream text becomes the effective message.', helpText: help('The message or task for Cohere to answer.', 'The runtime requires a non-empty effective message before it calls Cohere.', 'Fill it for every Cohere workflow. If it has no template expression and upstream text exists, upstream text becomes the message and Prompt becomes the preamble/context.', 'Enter a prompt or expression such as {{$json.text}}.', 'Usually from a document, support ticket, form answer, or generated draft.', 'The generated text is returned as {{$json.response}}.', 'Plain text with optional template expressions.', 'A marketing workflow prompts: Rewrite {{$json.productDescription}} in a friendly tone.', 'If empty and no upstream message exists, output is success false with error: prompt is required.', 'Do not put the API key or unrelated full payloads in Prompt.'), example: 'Summarize {{$json.text}}' },
  { name: 'Preamble', internalKey: 'preamble', type: 'textarea', required: false, description: 'Optional Cohere system-level instruction. Not visible in the current panel but supported by backend/runtime configs.', helpText: help('A system-style instruction sent as Cohere preamble.', 'It sets persona, tone, and rules separate from the user message.', 'Use it in generated/API-created configs or after adding the field to the panel; current visual panel may not expose it.', 'Enter short behavior rules such as You are a concise support analyst.', 'Usually from the workflow design or an upstream policy/config step.', 'It shapes {{$json.response}} but is not returned separately.', 'Plain text.', 'A classification workflow uses a preamble requiring JSON with label and confidence.', 'If blank, Cohere still answers using only the message.', 'Do not confuse Preamble with Prompt; Preamble is instruction, Prompt is the task/input.'), example: 'You are a concise assistant. Return JSON only.' },
  { name: 'Temperature', internalKey: 'temperature', type: 'number', required: false, description: 'Sampling temperature sent to Cohere.', defaultValue: '0.7', helpText: help('A number controlling response variation.', 'Cohere receives it in the request body, so it affects the generated response.', 'Use low values for classification and JSON, higher values for creative rewriting.', 'Enter a number from 0 to 2, such as 0.2 or 0.7.', 'Chosen by the workflow designer based on the task.', 'It changes the text in {{$json.response}}.', 'Number between 0 and 2.', 'A sentiment classifier uses 0.2 so labels remain stable.', 'Bad values can make Cohere reject the request or produce unstable output.', 'Do not use high temperature when the next node expects strict JSON.'), example: '0.7' },
  { name: 'Max Tokens', internalKey: 'maxTokens', type: 'number', required: false, description: 'Maximum generated tokens sent to Cohere as max_tokens. Supported by backend/runtime configs even if not exposed in the current visual panel.', defaultValue: '1024', helpText: help('The maximum response length requested from Cohere.', 'It limits generation size, cost, and downstream payload length.', 'Increase for long summaries or reports; lower for labels, titles, or short replies.', 'Enter a positive integer such as 256, 1024, or 2000.', 'Chosen by the workflow designer from expected output size.', 'If the limit is hit, {{$json.finishReason}} may indicate token completion behavior and {{$json.response}} may be shorter than requested.', 'Positive integer.', 'A title generator uses 64; a document-summary workflow uses 1024.', 'If below 1, backend validation says maxTokens must be at least 1; Cohere may also reject bad values.', 'Do not set huge limits for short tasks; it increases cost and latency.'), example: '1024' },
];

export const cohereDoc: NodeDoc = {
  slug: 'cohere',
  displayName: 'Cohere',
  category: 'AI',
  logoUrl: '/icons/nodes/cohere.svg',
  description: 'Send a prompt to Cohere Command chat models and return generated text plus finish reason and token counts.',
  credentialType: 'Cohere API Key',
  credentialSetupSteps: [
    'Create a Cohere API Key in CtrlChecks Connections or map a secure credential value into apiKey; the current runtime reads the apiKey field directly.',
    'Store Cohere secrets in the credential vault or a secure credential expression, not in Prompt, Preamble, or normal workflow input data.',
    'Connect this node output to downstream parser, CRM, email, document, or approval steps; any service node account connection belongs on that downstream service node.',
    'Test with a short prompt first to confirm the key, model, token limit, and response shape.',
  ],
  credentialDocsUrl: 'https://docs.cohere.com/reference/about',
  resources: [{ name: 'Configuration', description: 'Cohere has one operation: call the Cohere Chat API with model, message, optional preamble, temperature, and max_tokens.', operations: [{
    name: 'Chat',
    value: 'default',
    description: 'Builds an effective Cohere message from Prompt or upstream text, optionally sends Preamble, calls https://api.cohere.com/v1/chat, and returns success, response text, model, finishReason, token counts, and error.',
    fields,
    outputExample: { success: true, response: 'The customer is asking for a refund because delivery was late.', model: 'command-r-08-2024', finishReason: 'COMPLETE', inputTokens: 87, outputTokens: 19, error: null },
    outputDescription: 'success is true on a successful API response and false on validation/API/catch failures. response contains generated text. model echoes the configured model. finishReason contains Cohere finish reason. inputTokens and outputTokens contain token counts when Cohere returns them. error is null on success or a plain error string on failure; this node does not use _error.',
    usageExample: { scenario: 'Summarize a support ticket with Cohere before adding a CRM note', inputValues: { apiKey: '{{$credentials.cohere.apiKey}}', model: 'command-r-08-2024', prompt: 'Summarize this ticket: {{$json.ticketBody}}', preamble: 'Be concise and factual.', temperature: '0.2', maxTokens: '512' }, expectedOutput: 'Use {{$json.response}} as the CRM note and {{$json.error}} to branch when success is false.' },
    externalDocsUrl: 'https://docs.cohere.com/reference/chat',
  }] }],
  commonErrors: [
    { error: 'Cohere apiKey is required', cause: 'The apiKey field is empty.', fix: 'Map a saved Cohere credential into apiKey or provide the key through secure node configuration.' },
    { error: 'prompt is required', cause: 'Prompt is blank and no upstream text became the effective message.', fix: 'Fill Prompt or map {{$json.text}} from the previous node.' },
    { error: 'Cohere API error <status>: <message>', cause: 'Cohere rejected the key, model, request body, quota, or account access.', fix: 'Check API key, model, account status, temperature, maxTokens, and the returned error text.' },
    { error: 'model must be one of: command-r7b-12-2024, command-r-08-2024, command-r-plus-08-2024, command-nightly', cause: 'Registry validation saw a model outside the current allowed set.', fix: 'Choose one of the dropdown model values.' },
    { error: 'maxTokens must be at least 1', cause: 'The maxTokens value is zero, negative, or not numeric in generated configs.', fix: 'Use a positive integer such as 512 or 1024.' },
  ],
  relatedNodes: ['ai_chat_model', 'ai_agent', 'anthropic_claude', 'openai_gpt', 'google_gemini'],
};
