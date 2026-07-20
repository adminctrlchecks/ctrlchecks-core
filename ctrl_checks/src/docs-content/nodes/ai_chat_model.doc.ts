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
  {
    name: 'Prompt',
    internalKey: 'prompt',
    type: 'textarea',
    required: true,
    description: 'User prompt sent to Gemini, or system context when upstream text becomes the user message.',
    helpText: help('The main instruction or message for the chat model.', 'The runtime requires a non-empty effective user message before it calls Gemini.', 'Fill it for every workflow. If the prompt has no template expressions and upstream data exists, this prompt becomes extra system context while the upstream text becomes the user message.', 'Enter a question, instruction, or expression such as {{$json.text}}.', 'Usually from a ticket body, form answer, document text, or prior transform node.', 'The answer is returned as {{$json.response}} and the model name as {{$json.model}}.', 'Plain text with optional template expressions.', 'A sales workflow prompts: Summarize {{$json.callTranscript}} in three bullets.', 'If the effective message is empty, the node returns {{$json._error}} with AI Chat Model node: prompt is required.', 'Do not leave a static prompt expecting upstream data to be ignored; static prompts can be treated as system context when upstream text is available.'),
    example: 'Summarize {{$json.text}}',
  },
  {
    name: 'System Prompt',
    internalKey: 'systemPrompt',
    type: 'textarea',
    required: false,
    description: 'Optional system instruction sent before the user message.',
    helpText: help('A behavior instruction for Gemini.', 'It controls tone, structure, and constraints separately from the user prompt.', 'Fill it when the response must follow a role, policy, or format. Leave blank for a simple one-off prompt.', 'Write clear instructions such as Always return valid JSON with keys summary and urgency.', 'Usually from a team policy, SOP, content style guide, or workflow requirement.', 'Better system prompts make {{$json.response}} easier for downstream nodes to parse.', 'Plain text with optional template expressions.', 'A support workflow sets: You are a concise support analyst; do not invent facts.', 'If blank, the model still runs but has less guidance.', 'Do not put customer-specific prompt data here when it belongs in Prompt or upstream input.'),
    example: 'You are a concise analyst. Return valid JSON only.',
  },
  {
    name: 'Model',
    internalKey: 'model',
    type: 'select',
    required: false,
    description: 'UI model selector. Current runtime forces Gemini 3.5 Flash regardless of this field.',
    options: ['gemini-3.5-flash', 'gemini-3.1-pro-preview', 'gemini-3.1-flash-lite'],
    defaultValue: 'gemini-3.5-flash',
    helpText: help('The visible model dropdown for this node.', 'It looks like a model selector, but the current legacy executor hardcodes provider gemini and model gemini-3.5-flash.', 'Leave it at gemini-3.5-flash unless a future worker change starts honoring it.', 'Choose gemini-3.5-flash, gemini-3.1-pro-preview, or gemini-3.1-flash-lite in the UI, knowing the executor still sends gemini-3.5-flash today.', 'Chosen in the workflow editor; not read from a provider account.', 'The runtime output {{$json.model}} reports the actual model returned by the adapter, not necessarily the UI value.', 'One of gemini-3.5-flash, gemini-3.1-pro-preview, gemini-3.1-flash-lite.', 'A summarizer leaves this at gemini-3.5-flash and tunes Prompt/Temperature instead.', 'Changing it should not change the current runtime model; this is a documented mismatch.', 'Do not rely on this field for model-routing decisions until the worker executor is changed.'),
    example: 'gemini-3.5-flash',
  },
  {
    name: 'Response Format',
    internalKey: 'responseFormat',
    type: 'select',
    required: false,
    description: 'Whether the runtime tries to parse the model answer as JSON or returns text.',
    options: ['text', 'json'],
    defaultValue: 'text',
    helpText: help('The expected response packaging mode: text or json.', 'It decides whether the executor makes a best-effort JSON.parse on the model content.', 'Use text for normal language. Use json only when the next node needs structured values.', 'Select text or json, and tell the model the same requirement in Prompt/System Prompt.', 'Chosen by the workflow designer based on the next node mapping.', 'For json, downstream nodes may read nested data under {{$json.response.field}}; for text they read {{$json.response}} as a string.', 'One of text or json. The backend schema also mentions markdown, but the current UI/runtime branch only treats json specially.', 'A lead triage workflow chooses json and asks for {"score":0.8,"reason":"..."}.', 'If JSON parsing fails, the node returns the raw text in {{$json.response}} rather than raising a parse error.', 'Do not choose json without strict JSON instructions; the runtime does not repair malformed JSON.'),
    example: 'json',
  },
  {
    name: 'Temperature',
    internalKey: 'temperature',
    type: 'number',
    required: false,
    description: 'Creativity setting passed to the Gemini call.',
    defaultValue: '0.7',
    helpText: help('A number controlling how varied the response can be.', 'Lower values make the same prompt more consistent; higher values make wording more varied.', 'Use low values for extraction/classification/JSON and higher values for drafting or brainstorming.', 'Enter a decimal such as 0.2, 0.7, or 1.0.', 'Chosen by the workflow designer from the task type.', 'It affects the content in {{$json.response}}.', 'Number. Invalid values fall back to 0.7.', 'A compliance classifier uses 0.2 so categories stay stable.', 'Blank or invalid values use 0.7; too high can make JSON less reliable.', 'Do not use temperature to compensate for missing source data; map the source data into Prompt.'),
    example: '0.2',
  },
];

export const aiChatModelDoc: NodeDoc = {
  slug: 'ai_chat_model',
  displayName: 'AI Chat Model',
  category: 'AI',
  logoUrl: '/icons/nodes/ai_chat_model.svg',
  description: 'Call the platform Gemini chat path directly and return response plus model while preserving incoming fields.',
  credentialType: 'Gemini credential or key pool',
  credentialSetupSteps: [
    'Use the configured Gemini connection, wallet, or worker key pool for model access. The current executor always routes this node to Gemini 3.5 Flash.',
    'Store Gemini keys in Connections, credential vault, wallet, or worker environment configuration. Do not put API keys in Prompt, System Prompt, or input data.',
    'Connect this node output to downstream parser, message, approval, or storage steps; any service node account connection belongs on that downstream service node.',
    'Test with a short prompt before processing long documents so you can confirm cost, latency, and JSON behavior.',
  ],
  credentialDocsUrl: 'https://docs.ctrlchecks.com',
  resources: [{ name: 'Configuration', description: 'AI Chat Model has one operation: call Gemini with prompt/system context and return the model answer.', operations: [{
    name: 'Chat',
    value: 'default',
    description: 'Builds a Gemini chat request from Prompt, optional System Prompt, and possibly upstream text; validates that an effective prompt exists; then returns the answer as text or best-effort parsed JSON.',
    fields,
    outputExample: { customerId: '1048', response: { summary: 'Customer asked about billing.', urgency: 'medium' }, model: 'gemini-3.5-flash' },
    outputDescription: 'response contains either raw text or parsed JSON when Response Format is json and parsing succeeds. model contains the actual model returned by the adapter. Incoming fields are spread into the output. _error appears when prompt or Gemini credential resolution fails; code may appear for Gemini wallet failures.',
    usageExample: { scenario: 'Summarize a customer email and keep the original customerId for a later CRM update', inputValues: { prompt: 'Summarize this email as JSON: {{$json.emailBody}}', systemPrompt: 'Return only JSON with summary and urgency.', model: 'gemini-3.5-flash', responseFormat: 'json', temperature: '0.2' }, expectedOutput: 'Use {{$json.response.summary}} for the CRM note and {{$json.customerId}} from the preserved input.' },
    externalDocsUrl: 'https://docs.ctrlchecks.com',
  }] }],
  commonErrors: [
    { error: 'AI Chat Model node: prompt is required', cause: 'Prompt is blank and no upstream text became the effective user message.', fix: 'Fill Prompt or map the previous node text with {{$json.fieldName}}.' },
    { error: 'Gemini credential error in _error', cause: 'No usable Gemini credential, wallet, or key-pool key was available.', fix: 'Connect/configure Gemini access and rerun the node.' },
    { error: 'JSON response falls back to text', cause: 'Response Format is json but Gemini returned invalid JSON.', fix: 'Add stricter JSON-only instructions and lower Temperature.' },
    { error: 'Model dropdown value has no effect', cause: 'The current executor hardcodes Gemini 3.5 Flash.', fix: 'Use a provider-specific node when you need a different model today, or update the worker executor.' },
  ],
  relatedNodes: ['ai_agent', 'chat_model', 'google_gemini', 'openai_gpt', 'anthropic_claude'],
};
