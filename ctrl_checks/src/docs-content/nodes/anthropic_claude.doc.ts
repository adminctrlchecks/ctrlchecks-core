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
  { name: 'API Key', internalKey: 'apiKey', type: 'string', required: false, description: 'Direct Anthropic API key fallback. Runtime can also retrieve a saved anthropic vault credential.', helpText: help('The Anthropic secret used when no saved credential is selected or available.', 'Claude API calls need authentication before the model can answer.', 'Prefer a saved Anthropic connection/vault credential. Use this direct field only as a legacy fallback when your deployment expects node-level keys.', 'Enter an Anthropic key such as sk-ant-... or map a controlled credential expression.', 'From Anthropic Console API Keys or the CtrlChecks credential vault.', 'This value should not be used downstream; downstream nodes use {{$json.response}}, {{$json.model}}, {{$json.usage}}, and {{$json.finishReason}}.', 'Secret text beginning with sk-ant- for most Anthropic keys.', 'A private internal workflow uses a vault-mapped key for a one-off Claude summarization job.', 'If no key is available, the model call fails before a normal response is returned.', 'Do not paste API keys into Prompt, Messages, or customer data fields.'), example: '{{$credentials.anthropic.apiKey}}' },
  { name: 'Model', internalKey: 'model', type: 'select', required: true, description: 'Claude model name sent to the LLM adapter.', options: ['claude-3-5-sonnet', 'claude-3-opus', 'claude-3-haiku'], helpText: help('The Claude model identifier for the request: claude-3-5-sonnet, claude-3-opus, or claude-3-haiku in the current UI.', 'It decides which Claude model Anthropic uses for the generated answer.', 'Choose it for every Claude workflow based on quality, speed, and cost needs.', 'Select one dropdown value exactly, or keep the default used by the workflow.', 'Chosen by the workflow designer from the Anthropic model available to the account.', 'The actual model returned by the adapter appears in {{$json.model}}.', 'Claude model string such as claude-3-5-sonnet.', 'A policy-analysis workflow selects claude-3-5-sonnet for nuanced long-form review.', 'If the model is unavailable to the key, Anthropic can reject the request.', 'Do not assume the display label alone is enough; the saved value is what the runtime sends.'), example: 'claude-3-5-sonnet' },
  { name: 'Prompt', internalKey: 'prompt', type: 'textarea', required: true, description: 'Primary prompt text. If blank, runtime builds a prompt from messages when provided.', helpText: help('The instruction or user content sent to Claude.', 'The runtime needs either Prompt or Messages to build the chat request.', 'Fill it for normal UI workflows. Use Messages only for generated/API-created configs that already have chat-message arrays.', 'Enter the task and map source text with expressions such as {{$json.text}}.', 'Usually from a ticket, form answer, document body, or previous transform node.', 'The answer is returned as {{$json.response}} for downstream mapping.', 'Plain text with optional template expressions.', 'A legal intake workflow prompts: Summarize {{$json.contractText}} and list risky clauses.', 'If Prompt and Messages are both empty, the provider call may fail or produce an empty/poor answer.', 'Do not put long unrelated JSON into Prompt when a prior node can extract the exact text first.'), example: 'Summarize {{$json.text}}' },
  { name: 'Messages', internalKey: 'messages', type: 'json', required: false, description: 'Backend-supported fallback array used only when Prompt is blank.', helpText: help('An array of chat messages used by generated configs.', 'The legacy executor joins message content into a prompt only when Prompt itself is empty.', 'Use it for API-generated workflows that already prepare messages. Most visual workflows should use Prompt instead.', 'Enter a JSON array of strings or message objects with content fields.', 'Comes from an upstream AI orchestration step or generated workflow config.', 'Claude still returns the answer as {{$json.response}}, not as a message array.', 'JSON array, for example [{"role":"user","content":"{{$json.question}}"}].', 'An advanced workflow maps {{$json.messages}} from a conversation-prep step.', 'Malformed or empty messages can produce an empty prompt; no local rich validation repairs it.', 'Do not fill both Prompt and Messages expecting both to be sent; Prompt wins.'), example: '[{"role":"user","content":"{{$json.question}}"}]' },
  { name: 'Temperature', internalKey: 'temperature', type: 'number', required: false, description: 'UI field that is not currently passed to the Claude adapter call.', defaultValue: '0.7', helpText: help('A visible creativity control in the Claude panel.', 'In the current anthropic_claude legacy executor, this value is not passed into llmAdapter.chat, so it is effectively ignored.', 'Leave it at the default unless the worker executor is updated to honor it.', 'Enter 0.7 or another decimal only for compatibility with saved configs.', 'Chosen in the UI; not read from Anthropic.', 'No downstream output confirms this setting was used because the current runtime does not send it.', 'Number such as 0.7.', 'A summarization workflow leaves Temperature unchanged and controls format through Prompt.', 'Changing it should not affect the current Claude output.', 'Do not rely on Temperature for deterministic Claude results in this node today.'), example: '0.7' },
  { name: 'Memory', internalKey: 'memory', type: 'number', required: false, description: 'Legacy UI field that the anthropic_claude runtime does not read.', defaultValue: '10', helpText: help('A visible conversation-memory count from older AI node patterns.', 'The current anthropic_claude executor does not read this field and does not maintain conversation memory.', 'Leave it alone unless preserving old configs.', 'Enter a number only for legacy compatibility.', 'Chosen in the UI, not retrieved from Anthropic.', 'It produces no downstream field and does not affect {{$json.response}} today.', 'Number such as 10.', 'A one-shot Claude analysis node leaves Memory at 10 but sends all needed context in Prompt.', 'Changing it has no current runtime effect.', 'Do not assume this node remembers previous runs; include the needed context in Prompt or Messages.'), example: '10' },
];

export const anthropicClaudeDoc: NodeDoc = {
  slug: 'anthropic_claude',
  displayName: 'Anthropic Claude',
  category: 'AI',
  logoUrl: '/icons/nodes/anthropic_claude.svg',
  description: 'Call Anthropic Claude through the legacy LLM adapter and return response, model, usage, and finish reason.',
  credentialType: 'Anthropic API Key',
  credentialSetupSteps: [
    'Create or select an Anthropic API Key connection in CtrlChecks Connections so the key is stored in the credential vault.',
    'The runtime can also use a direct apiKey/accessToken/token field as a legacy fallback, but normal workflow input data should never contain Anthropic secrets.',
    'Connect this node output to downstream document, email, CRM, or approval steps; any service node account connection belongs on that downstream service node.',
    'Test with a short prompt and confirm the key has access to the selected Claude model before sending long documents.',
  ],
  credentialDocsUrl: 'https://docs.anthropic.com/en/api/getting-started',
  resources: [{ name: 'Configuration', description: 'Anthropic Claude has one operation: create a prompt from Prompt or Messages, authenticate, call Claude, and return the generated response.', operations: [{
    name: 'Complete',
    value: 'default',
    description: 'Sends Prompt, or joined Messages when Prompt is blank, to the selected Claude model using an Anthropic API key from config or vault, then returns the model response and usage metadata without spreading incoming fields.',
    fields,
    outputExample: { response: 'The contract risk is mainly the 30-day termination clause.', model: 'claude-3-5-sonnet', usage: { inputTokens: 920, outputTokens: 64 }, finishReason: 'end_turn' },
    outputDescription: 'response contains Claude text. model contains the adapter model. usage contains provider usage metadata when available. finishReason contains the provider finish reason. This node does not spread incoming fields into the success output. Failures may return success false with error or throw provider errors.',
    usageExample: { scenario: 'Analyze a contract paragraph before a human legal approval step', inputValues: { apiKey: '{{$credentials.anthropic.apiKey}}', model: 'claude-3-5-sonnet', prompt: 'List the top risks in {{$json.contractText}}', messages: '[{"role":"user","content":"{{$json.contractText}}"}]', temperature: '0.7', memory: '10' }, expectedOutput: 'Use {{$json.response}} as the review summary and {{$json.usage}} for audit logging.' },
    externalDocsUrl: 'https://docs.anthropic.com/en/api/overview',
  }] }],
  commonErrors: [
    { error: 'Missing or invalid Anthropic API key', cause: 'No usable apiKey/accessToken/token field or saved anthropic vault credential is available.', fix: 'Create an Anthropic connection or provide the expected key through secure credential configuration.' },
    { error: 'Prompt and Messages are both empty', cause: 'The node has no content to send to Claude.', fix: 'Fill Prompt or provide a Messages array with message content.' },
    { error: 'Temperature and Memory have no effect', cause: 'The current legacy executor does not pass these UI fields to the Claude adapter.', fix: 'Control behavior through Prompt/Model or update the worker executor if those controls are needed.' },
    { error: 'Next node cannot find upstream fields', cause: 'Successful Claude output does not spread inputObj, so earlier fields are not preserved past this node.', fix: 'Use Set/Edit Fields before Claude or merge needed identifiers back after the Claude step.' },
  ],
  relatedNodes: ['ai_agent', 'ai_chat_model', 'openai_gpt', 'google_gemini', 'cohere'],
};
