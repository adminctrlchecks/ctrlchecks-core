import type { NodeDoc } from '../types';

const fieldHelp = (parts: {
  what: string;
  why: string;
  when: string;
  enter: string;
  source: string;
  later: string;
  format: string;
  example: string;
  empty: string;
  mistake: string;
}) => [
  `What this field is: ${parts.what}`,
  `Why it matters: ${parts.why}`,
  `When to fill it: ${parts.when}`,
  `What to enter: ${parts.enter}`,
  `Where the value comes from: ${parts.source}`,
  `How to use it later: ${parts.later}`,
  `Accepted format: ${parts.format}`,
  `Real workplace example: ${parts.example}`,
  `If it is empty or wrong: ${parts.empty}`,
  `Common mistake: ${parts.mistake}`,
].join('\n');

export const ollamaDoc: NodeDoc = {
  slug: 'ollama',
  displayName: 'AI Chat (Gemini)',
  category: 'AI',
  logoUrl: '/icons/nodes/ollama.svg',
  description: 'Legacy Ollama slug that delegates to the Gemini-backed AI Chat Model. It does not call a local Ollama server.',
  credentialType: 'Gemini credential',
  credentialSetupSteps: [
    'This node is not local Ollama at runtime. The executor rewrites it to ai_chat_model and calls Gemini 3.5 Flash.',
    'Use a Gemini service node account connection, Connections entry, credential system mapping, credential vault value, wallet, or key pool when available.',
    'If your environment supports a direct Gemini API key fallback, store it securely rather than typing it into normal workflow text.',
    'Connect the output to the next service node with an outgoing line, then map fields such as {{$json.response}} in that next node.',
    'Run a short prompt and inspect response/model. Successful output keeps incoming fields because the delegated AI Chat Model spreads input fields.',
  ],
  credentialDocsUrl: 'https://ai.google.dev/gemini-api/docs/api-key',
  resources: [
    {
      name: 'Configuration',
      description: 'Configure the legacy Ollama alias. Runtime copies Prompt and Temperature into ai_chat_model, forces provider gemini and model gemini-3.5-flash, and returns the delegated AI Chat Model result.',
      operations: [
        {
          name: 'Execute',
          value: 'default',
          description: 'Runs a Gemini-backed chat completion through the delegated AI Chat Model executor. A blank effective prompt returns _error. Credential problems return _error, and wallet failures can include code. This operation preserves incoming fields on success.',
          fields: [
            {
              name: 'Prompt',
              internalKey: 'prompt',
              type: 'textarea',
              required: true,
              description: 'Prompt passed to AI Chat Model using Gemini 3.5 Flash.',
              helpText: fieldHelp({
                what: 'The instruction or user message passed into the delegated AI Chat Model executor.',
                why: 'It becomes the effective Gemini prompt and determines the response text in {{$json.response}}.',
                when: 'Fill it whenever this node should generate or transform text.',
                enter: 'Type fixed instructions or include expressions such as {{$json.question}}, {{$json.emailBody}}, or {{$json.prompt}}.',
                source: 'Usually comes from an upstream trigger, form, email, webhook, or document text field.',
                later: 'Successful output keeps incoming fields and adds {{$json.response}} and {{$json.model}}.',
                format: 'Plain text with optional CtrlChecks expressions. This is not an Ollama model name or server URL.',
                example: 'A customer-support workflow sends Answer this customer question concisely: {{$json.question}}.',
                empty: 'The delegated AI Chat Model can return _error: AI Chat Model node: prompt is required.',
                mistake: 'Expecting this slug to use a local Ollama installation; it always delegates to Gemini 3.5 Flash today.',
              }),
              placeholder: 'Answer this customer question: {{$json.question}}',
              example: 'Answer this customer question: {{$json.question}}',
            },
            {
              name: 'Temperature',
              internalKey: 'temperature',
              type: 'number',
              required: false,
              description: 'Temperature passed through to AI Chat Model.',
              helpText: fieldHelp({
                what: 'A numeric creativity setting passed into the delegated Gemini-backed AI Chat Model call.',
                why: 'Lower values make output steadier; higher values can make wording more varied.',
                when: 'Set it when the workflow needs a repeatable answer or a more creative draft.',
                enter: 'Use 0.2 for factual summaries, 0.7 for balanced chat, or a higher value only for creative text.',
                source: 'Manual UI entry, workflow default, or an upstream expression such as {{$json.temperature}}.',
                later: 'The value is not returned as a dedicated field; inspect {{$json.response}} and {{$json.model}}.',
                format: 'Number. The UI default is 0.7.',
                example: 'A policy-answer workflow uses 0.2 so responses stay consistent across support tickets.',
                empty: 'Runtime defaults through the delegated AI Chat Model temperature handling.',
                mistake: 'Using Temperature to select a model; this alias forces gemini-3.5-flash regardless of local Ollama expectations.',
              }),
              defaultValue: '0.7',
              placeholder: '0.7',
              example: '0.7',
            },
          ],
          outputExample: {
            customerId: 'C-1048',
            response: 'To reset your password, open Settings, choose Security, and select Change Password.',
            model: 'gemini-3.5-flash',
          },
          outputDescription: 'response contains Gemini text from the delegated AI Chat Model. model contains the adapter model, typically Gemini 3.5 Flash / gemini-3.5-flash. _error is returned on blank prompt, Gemini credential error, or wallet failure; wallet failures can also include code. Incoming fields are preserved on success and on handled credential failures.',
          usageExample: {
            scenario: 'Answer a customer question while keeping the customer id for a later CRM update.',
            inputValues: {
              prompt: 'Answer this customer question in two sentences: {{$json.question}}',
              temperature: '0.2',
            },
            expectedOutput: 'Use {{$json.response}} as the answer and {{$json.customerId}} from the preserved input when updating the customer record.',
          },
          externalDocsUrl: 'https://ai.google.dev/gemini-api/docs',
        },
      ],
    },
  ],
  commonErrors: [
    {
      error: 'This is not local Ollama',
      cause: 'The runtime rewrites ollama to ai_chat_model and forces Gemini 3.5 Flash instead of calling a local Ollama daemon.',
      fix: 'Use this as a Gemini chat alias, or add a worker implementation before relying on local Ollama behavior.',
    },
    {
      error: 'AI Chat Model node: prompt is required',
      cause: 'Prompt resolved to empty and no upstream user message replaced it.',
      fix: 'Fill Prompt with text or map an upstream field such as {{$json.question}}.',
    },
    {
      error: 'Gemini credential error in _error',
      cause: 'The Gemini credential resolver could not find a valid Connections entry, credential vault value, wallet, key pool, or direct key.',
      fix: 'Reconnect Gemini credentials and verify the service node account connection before rerunning.',
    },
    {
      error: 'Gemini wallet failure can include code',
      cause: 'The wallet-backed Gemini request failed during the delegated AI Chat Model call.',
      fix: 'Check the returned _error and code, then confirm wallet quota, model access, and provider availability.',
    },
    {
      error: 'Output keeps incoming fields',
      cause: 'This is important when troubleshooting because incoming values remain beside response/model rather than being replaced.',
      fix: 'Reference preserved fields normally, for example {{$json.customerId}}, and use {{$json.response}} for the generated answer.',
    },
  ],
  relatedNodes: ['ai_chat_model', 'google_gemini'],
};
