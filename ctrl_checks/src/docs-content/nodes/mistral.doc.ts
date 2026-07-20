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
  { name: 'API Key', internalKey: 'apiKey', type: 'password', required: true, description: 'Mistral API key read directly by the current runtime.', helpText: help('The Mistral secret used as the Bearer token for api.mistral.ai.', 'The executor cannot call Mistral without this key.', 'Fill it for every run, preferably by mapping a secure Connections or credential vault value.', 'Enter a Mistral key or map {{$credentials.mistral.apiKey}}.', 'From Mistral La Plateforme/console API keys or CtrlChecks Connections/credential vault.', 'This secret is not used downstream. Downstream nodes use {{$json.response}}, {{$json.inputTokens}}, {{$json.outputTokens}}, and {{$json.success}}.', 'Secret text from Mistral. Keep it out of prompts and normal workflow data.', 'A finance workflow maps {{$credentials.mistral.apiKey}} before summarizing invoice disputes.', 'If empty, runtime returns success false with error: Mistral API key is required.', 'Do not paste the key into Prompt or System Prompt.'), example: '{{$credentials.mistral.apiKey}}' },
  { name: 'Model', internalKey: 'model', type: 'select', required: true, description: 'Mistral chat model sent to /v1/chat/completions.', options: ['mistral-small-latest', 'mistral-medium-latest', 'mistral-large-latest', 'codestral-latest'], defaultValue: 'mistral-small-latest', helpText: help('The Mistral model identifier for the chat completion request.', 'It controls response quality, latency, cost, and code capability.', 'Choose it for each Mistral workflow.', 'Select Small for fast everyday work, Medium for balanced tasks, Large for complex reasoning, or Codestral for code-focused work.', 'Chosen from models available to your Mistral account.', 'The configured model is returned as {{$json.model}}.', 'One of mistral-small-latest, mistral-medium-latest, mistral-large-latest, or codestral-latest.', 'A support-summary workflow uses mistral-small-latest for fast ticket triage.', 'Unavailable or misspelled model names return a Mistral API error.', 'Do not use OpenAI, Gemini, or Anthropic model names here.'), example: 'mistral-small-latest' },
  { name: 'System Prompt', internalKey: 'systemPrompt', type: 'textarea', required: false, description: 'Optional system message prepended before the user prompt.', helpText: help('A standing instruction that defines role, tone, or output rules.', 'Runtime adds it as a system message before the user Prompt when it is not blank.', 'Use it when every answer should follow stable behavior such as JSON-only, concise, or policy-aware.', 'Write a short rule such as You are a concise support analyst. Return JSON only.', 'Usually from workflow design, policy text, or a configuration step.', 'It shapes {{$json.response}} but is not returned separately.', 'Plain text with optional mapped values if needed.', 'An escalation workflow sets System Prompt to Return JSON with urgency and reason.', 'If blank, Mistral receives only the user Prompt.', 'Do not put API keys or unnecessary private data in System Prompt.'), example: 'You are a concise support analyst. Return JSON only.' },
  { name: 'Prompt', internalKey: 'prompt', type: 'textarea', required: true, description: 'User message sent to Mistral.', helpText: help('The task or text Mistral should answer.', 'Runtime sends it as the user message in the chat completion request.', 'Fill it for every Mistral run.', 'Type an instruction or map data such as {{$json.ticketBody}}, {{$json.contractText}}, or {{$json.customerQuestion}}.', 'Usually from a trigger, form, document parser, CRM lookup, or previous transform node.', 'The answer is returned as {{$json.response}}.', 'Plain text with optional template expressions that resolve to text.', 'A support workflow prompts: Summarize {{$json.ticketBody}} and identify the refund reason.', 'If blank, runtime returns success false with error: prompt is required.', 'Do not send a full webhook payload when only one text field is needed.'), example: 'Summarize {{$json.ticketBody}} and identify the refund reason.' },
  { name: 'Temperature', internalKey: 'temperature', type: 'number', required: false, description: 'Sampling temperature sent to Mistral.', defaultValue: '0.7', helpText: help('A number controlling how varied the answer can be.', 'Runtime sends it as temperature in the Mistral request body.', 'Use low values for structured extraction and higher values for creative writing.', 'Enter a number such as 0.2, 0.7, or 1.0.', 'Chosen by the workflow designer based on the task.', 'It can change text in {{$json.response}}.', 'Number accepted by Mistral chat completions.', 'A JSON extraction workflow uses 0.2 for stable output.', 'Bad values can make Mistral reject the request or produce unstable text.', 'Do not use high temperature when downstream nodes expect strict JSON.'), example: '0.7' },
  { name: 'Max Tokens', internalKey: 'maxTokens', type: 'number', required: false, description: 'Maximum completion tokens sent as max_tokens.', defaultValue: '1024', helpText: help('The requested maximum response length.', 'It limits response size, latency, and cost.', 'Increase for long summaries or reports; reduce for labels, short replies, or routing decisions.', 'Enter a positive integer such as 256, 1024, or 2000.', 'Chosen by the workflow designer based on expected output length.', 'If the limit is hit, {{$json.response}} may be shorter than desired and outputTokens may approach the limit.', 'Positive integer.', 'A ticket classifier uses 128; a meeting-summary workflow uses 1024.', 'Too-small values truncate useful answers; invalid values may return a Mistral API error.', 'Do not set a very large limit for short classification tasks.'), example: '1024' },
];

export const mistralDoc: NodeDoc = {
  slug: 'mistral',
  displayName: 'Mistral AI',
  category: 'AI',
  logoUrl: '/icons/nodes/mistral.svg',
  description: 'Call Mistral chat completions and return preserved input fields plus success, model, response, inputTokens, outputTokens, and error.',
  credentialType: 'Mistral API Key',
  credentialSetupSteps: [
    'Create a Mistral API Key in CtrlChecks Connections or credential vault, then map it into apiKey for this node.',
    'You can create keys in Mistral La Plateforme/console. Make sure the account has access to the selected model.',
    'The current executor reads apiKey directly. Store the Mistral secret in Connections or the credential vault, not in Prompt, System Prompt, or upstream business data.',
    'Connect this node output to parser, CRM, email, approval, file, or logging steps. Any downstream service node account connection belongs on that downstream service node.',
  ],
  credentialDocsUrl: 'https://docs.mistral.ai',
  resources: [{
    name: 'Configuration',
    description: 'Mistral has one runtime behavior: send optional systemPrompt and required prompt to the selected Mistral chat model.',
    operations: [{
      name: 'Chat Completion',
      value: 'default',
      description: 'Calls https://api.mistral.ai/v1/chat/completions with model, messages, temperature, and max_tokens. Successful output preserves incoming fields and adds Mistral response metadata.',
      fields,
      outputExample: { ticketId: 'TCK-1048', success: true, model: 'mistral-small-latest', response: 'The customer is requesting a refund because invoice INV-1048 appears to be charged twice.', inputTokens: 96, outputTokens: 23 },
      outputDescription: 'Successful output spreads incoming fields and adds success true, model, response, inputTokens, and outputTokens. Failures preserve incoming fields and add success false plus error. No _error field is produced by this executor.',
      usageExample: { scenario: 'Summarize support tickets with Mistral before routing urgent issues', inputValues: { apiKey: '{{$credentials.mistral.apiKey}}', model: 'mistral-small-latest', systemPrompt: 'Return one concise sentence.', prompt: 'Summarize this ticket: {{$json.ticketBody}}', temperature: '0.2', maxTokens: '256' }, expectedOutput: 'Use {{$json.response}} as the summary and {{$json.outputTokens}} for token logging.' },
      externalDocsUrl: 'https://docs.mistral.ai/api/',
    }],
  }],
  commonErrors: [
    { error: 'Mistral API key is required', cause: 'apiKey/token is empty.', fix: 'Map a Mistral credential from Connections or credential vault into apiKey.' },
    { error: 'prompt is required', cause: 'Prompt resolved to an empty string.', fix: 'Fill Prompt or map a previous text field such as {{$json.ticketBody}}.' },
    { error: 'Mistral API error <status>: <message>', cause: 'Mistral rejected the key, selected model, request body, quota, account access, temperature, or max token value.', fix: 'Check the key, model access, prompt length, token limit, and returned provider message.' },
    { error: 'No response text returned', cause: 'The provider response did not include choices[0].message.content.', fix: 'Inspect the raw provider response in logs and retry with a simpler prompt/model.' },
    { error: 'Next node sees preserved input fields', cause: 'Unlike Gemini/LangChain, this node spreads inputObj on success and failure.', fix: 'Map {{$json.response}} for AI text and keep using upstream IDs such as {{$json.ticketId}} when present.' },
  ],
  relatedNodes: ['openai_gpt', 'anthropic_claude', 'google_gemini', 'cohere', 'huggingface'],
};
