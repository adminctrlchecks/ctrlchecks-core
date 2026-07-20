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
    name: 'API Key',
    internalKey: 'apiKey',
    type: 'string',
    required: false,
    description: 'Optional direct Gemini API key; runtime can also use Gemini connection, wallet/key pool, or worker key configuration.',
    helpText: help(
      'A Google Gemini API secret used only when the node cannot use a saved Gemini connection, wallet, key pool, or worker-level key.',
      'Gemini must be authenticated before the model can answer; the resolver checks saved/pooled credentials before the adapter call.',
      'Prefer leaving this blank when your workspace has Gemini Connections or key-pool access. Fill it only for a legacy workflow that must carry a direct Gemini key.',
      'Enter a Gemini API key such as AIza... or map a secure credential expression such as {{$credentials.gemini.apiKey}}.',
      'From Google AI Studio API keys, CtrlChecks Connections, credential vault, Gemini wallet, key pool, or worker configuration.',
      'Do not use this value downstream. Downstream nodes use {{$json.response}}, {{$json.model}}, {{$json.usage}}, and {{$json.finishReason}}.',
      'Secret text, usually beginning with AIza. Keep it out of prompts and normal input data.',
      'A secure internal workflow maps {{$credentials.gemini.apiKey}} while processing support email summaries.',
      'If no Gemini credential resolves, the node returns success false with error; wallet failures may also include code.',
      'Do not paste the key into Prompt or a previous Set node; use Connections, vault, wallet, or this dedicated field only.',
    ),
    example: '{{$credentials.gemini.apiKey}}',
  },
  {
    name: 'Model',
    internalKey: 'model',
    type: 'select',
    required: true,
    description: 'Gemini model identifier sent to the LLM adapter.',
    options: ['gemini-3.5-flash', 'gemini-3.1-pro-preview', 'gemini-3.1-flash-lite'],
    defaultValue: 'gemini-3.5-flash',
    helpText: help(
      'The Gemini model used for the request: gemini-3.5-flash, gemini-3.1-pro-preview, or gemini-3.1-flash-lite.',
      'It controls the model family, speed, capability, and credential access used by the adapter.',
      'Choose it for every Gemini workflow. Use Flash for fast everyday work, Pro Preview for harder reasoning, and Flash-Lite for lighter high-volume jobs.',
      'Select one dropdown value exactly, or map a model string only when an upstream step already validated it.',
      'Chosen by the workflow builder from the Gemini models available to the account/key pool.',
      'The actual adapter model is returned as {{$json.model}} for logging or downstream branching.',
      'One Gemini model string: gemini-3.5-flash, gemini-3.1-pro-preview, or gemini-3.1-flash-lite.',
      'A support summary workflow uses gemini-3.5-flash for quick ticket triage.',
      'If the selected model is unavailable or unsupported by the key, the provider can reject the request.',
      'Do not choose a model name from another provider; this node always calls the Gemini adapter path.',
    ),
    example: 'gemini-3.5-flash',
  },
  {
    name: 'Prompt',
    internalKey: 'prompt',
    type: 'textarea',
    required: true,
    description: 'Prompt text sent to Gemini, or system context when upstream text becomes the user message.',
    helpText: help(
      'The instruction or message Gemini should answer.',
      'The executor builds one Gemini chat request from this prompt and, when appropriate, upstream text.',
      'Fill it for every normal workflow. If the prompt is static and upstream text exists, the runtime can treat this as system context and send upstream text as the user message.',
      'Enter a clear instruction or map source text with expressions such as {{$json.emailBody}} or {{$json.prompt}}.',
      'Usually from a form, email, chat message, document parser, or previous transform node.',
      'The answer is returned as {{$json.response}}, with usage metadata in {{$json.usage}} when the adapter provides it.',
      'Plain text with optional template expressions. Use valid expressions that resolve to text.',
      'A sales workflow prompts: Summarize {{$json.callTranscript}} and list follow-up actions.',
      'A blank prompt is not locally validated here and may produce a poor or empty model call.',
      'Do not put API keys, passwords, or unrelated full webhook payloads in Prompt; map the exact business text needed.',
    ),
    example: 'Summarize {{$json.emailBody}} and extract follow-up actions.',
  },
  {
    name: 'Temperature',
    internalKey: 'temperature',
    type: 'number',
    required: false,
    description: 'Visible legacy creativity field that the current google_gemini executor does not pass to the adapter.',
    defaultValue: '0.7',
    helpText: help(
      'A visible creativity control from older AI node patterns.',
      'It looks like a sampling setting, but the current google_gemini runtime does not read or pass temperature into llmAdapter.chat.',
      'Leave it at the default unless a future worker change starts honoring it.',
      'Enter 0.7 for compatibility; changing it today is not expected to affect generated text.',
      'Chosen in the workflow panel, not retrieved from Google.',
      'No downstream output confirms this value was applied because the current Gemini call does not receive it.',
      'Number such as 0.2, 0.7, or 1.0.',
      'A document-summary workflow leaves Temperature at 0.7 and controls output through Prompt wording.',
      'Changing it should not change current runtime behavior; prompt and model are the effective controls.',
      'Do not tune Temperature expecting it to fix JSON quality in this node today.',
    ),
    example: '0.7',
  },
  {
    name: 'Memory',
    internalKey: 'memory',
    type: 'number',
    required: false,
    description: 'Visible legacy memory field that the current google_gemini executor does not read.',
    defaultValue: '10',
    helpText: help(
      'A legacy conversation-turn count field shown in the panel.',
      'The current Gemini executor does not maintain conversation memory or read this value.',
      'Leave it unchanged unless preserving old configs. Include all needed context in Prompt or upstream input.',
      'Enter 10 for compatibility; it will not make the node remember previous runs.',
      'Chosen in the workflow editor, not loaded from a memory service.',
      'The success output does not include a memory field; downstream nodes receive response/model/usage/finishReason only.',
      'Number such as 10.',
      'A one-shot email summarizer leaves Memory at 10 and maps the complete email body into Prompt.',
      'Changing it has no current runtime effect.',
      'Do not assume this node remembers prior chat messages; pass the needed history explicitly.',
    ),
    example: '10',
  },
];

export const googleGeminiDoc: NodeDoc = {
  slug: 'google_gemini',
  displayName: 'Google Gemini',
  category: 'AI',
  logoUrl: '/icons/nodes/google_gemini.svg',
  description: 'Call Google Gemini through the LLM adapter and return response, model, usage, and finish reason.',
  credentialType: 'Gemini API Key',
  credentialSetupSteps: [
    'Create or select a Gemini connection in CtrlChecks Connections, or use the configured Gemini wallet/key pool or worker key. Direct apiKey is only a fallback.',
    'Store Gemini secrets in Connections, credential vault, wallet, key pool, or worker configuration. Do not put API keys in Prompt or normal input data.',
    'Connect this node output to downstream parser, CRM, email, approval, or storage steps; any service node account connection belongs on that downstream service node.',
    'Test with a short gemini-3.5-flash prompt before sending long customer or document data so you can confirm credential, model, latency, and response shape.',
  ],
  credentialDocsUrl: 'https://ai.google.dev/gemini-api/docs/api-key',
  resources: [{
    name: 'Configuration',
    description: 'Google Gemini has one operation: resolve Gemini credentials, build a chat message from Prompt/upstream text, call Gemini, and return the adapter response.',
    operations: [{
      name: 'Generate',
      value: 'default',
      description: 'Sends Prompt, or upstream text with Prompt as context when the prompt is static, to the selected Gemini model. The current executor does not pass Temperature or Memory into the Gemini adapter call.',
      fields,
      outputExample: { response: 'The customer wants a refund because the package arrived late.', model: 'gemini-3.5-flash', usage: { inputTokens: 128, outputTokens: 17 }, finishReason: 'STOP' },
      outputDescription: 'response contains Gemini text. model contains the adapter model. usage contains provider token metadata when available. finishReason contains the provider finish reason. Credential resolver failures return success false with error, and wallet failures may include code. Successful output does not spread incoming fields.',
      usageExample: {
        scenario: 'Summarize a customer email before creating a CRM note',
        inputValues: { apiKey: '{{$credentials.gemini.apiKey}}', model: 'gemini-3.5-flash', prompt: 'Summarize this email and list the requested action: {{$json.emailBody}}', temperature: '0.7', memory: '10' },
        expectedOutput: 'Use {{$json.response}} as the note text and {{$json.usage}} for audit logging.',
      },
      externalDocsUrl: 'https://ai.google.dev/gemini-api/docs',
    }],
  }],
  commonErrors: [
    { error: 'Gemini credential error returns success false with error', cause: 'No usable Gemini connection, wallet, key pool, direct apiKey, or worker key was available.', fix: 'Connect Gemini or configure key-pool/worker access, then rerun the node.' },
    { error: 'Gemini wallet failure can include code', cause: 'The wallet/key-pool resolver had a provider or quota problem.', fix: 'Review the returned error and code, then rotate or replenish the Gemini key pool if needed.' },
    { error: 'Prompt is blank or upstream text is missing', cause: 'Prompt resolved to an empty string and the runtime has no useful upstream text to send.', fix: 'Fill Prompt or map a text field such as {{$json.message}}.' },
    { error: 'Temperature and Memory have no effect', cause: 'The current google_gemini executor does not pass Temperature or Memory to the adapter.', fix: 'Control behavior through Prompt and Model until worker support is added.' },
    { error: 'Next node cannot find upstream fields', cause: 'Successful Gemini output does not spread inputObj, so earlier fields are not preserved.', fix: 'Keep needed IDs before Gemini or merge them back after this node.' },
  ],
  relatedNodes: ['ai_agent', 'ai_chat_model', 'openai_gpt', 'anthropic_claude', 'mistral'],
};
