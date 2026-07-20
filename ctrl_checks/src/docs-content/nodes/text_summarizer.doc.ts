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

export const textSummarizerDoc: NodeDoc = {
  slug: 'text_summarizer',
  displayName: 'Text Summarizer',
  category: 'AI',
  logoUrl: '/icons/nodes/text_summarizer.svg',
  description: 'Builds a summarization prompt from Text and Max Length, then delegates to the Gemini-backed AI Chat Model.',
  credentialType: 'Gemini credential',
  credentialSetupSteps: [
    'Text Summarizer delegates to AI Chat Model and uses Gemini 3.5 Flash at runtime.',
    'Use a Gemini service node account connection, Connections entry, credential system mapping, credential vault value, wallet, or key pool when available.',
    'A direct Gemini API key can be used as apiKey fallback when the environment supports it, but secure credential storage is preferred.',
    'Connect the output to the next service node with an outgoing line, then map fields such as {{$json.response}} in that next node.',
    'Successful output keeps incoming fields and adds response/model. The summary is in response, not in a top-level summary field.',
  ],
  credentialDocsUrl: 'https://ai.google.dev/gemini-api/docs/api-key',
  resources: [
    {
      name: 'Configuration',
      description: 'Configure the text source and optional word-limit hint. Runtime creates a prompt that starts with "Summarize the following text" and delegates to ai_chat_model with provider gemini and model gemini-3.5-flash.',
      operations: [
        {
          name: 'Execute',
          value: 'default',
          description: 'Summarizes text through Gemini by delegating to AI Chat Model. It does not produce summary, wordCount, or originalLength fields; the model answer is stored in response, and incoming fields are preserved.',
          fields: [
            {
              name: 'Text',
              internalKey: 'text',
              type: 'textarea',
              required: true,
              description: 'Text inserted into the generated summarization prompt.',
              helpText: fieldHelp({
                what: 'The source text that runtime places after the generated Summarize the following text prompt.',
                why: 'This is the content Gemini summarizes and the main determinant of {{$json.response}}.',
                when: 'Fill it for every real summarization run, usually with an upstream text expression.',
                enter: 'Use {{$json.articleText}}, {{$json.emailBody}}, {{$json.transcript}}, or paste text directly for testing.',
                source: 'Earlier document, email, webhook, CRM, or form nodes that produce long text.',
                later: 'The summary appears in {{$json.response}} and the original incoming fields are still available downstream.',
                format: 'Plain text with optional CtrlChecks expressions. It is not JSON unless your upstream field itself is JSON text.',
                example: 'A sales workflow maps {{$json.callTranscript}} to produce a short CRM note.',
                empty: 'Runtime does not locally reject blank text; it still sends an empty-source summarization prompt to Gemini.',
                mistake: 'Looking for {{$json.summary}} or {{$json.wordCount}} after this node. Those fields are not produced.',
              }),
              placeholder: '{{$json.articleText}}',
              example: '{{$json.articleText}}',
            },
            {
              name: 'Max Length',
              internalKey: 'maxLength',
              type: 'number',
              required: false,
              description: 'Optional word-limit hint inserted into the prompt.',
              helpText: fieldHelp({
                what: 'A number appended to the generated prompt as an instruction like in <= 100 words.',
                why: 'It guides Gemini toward a shorter response, but it is not a hard truncation or validator.',
                when: 'Fill it when downstream systems need a compact note, Slack message, or CRM summary.',
                enter: 'A practical word count such as 50, 100, or 200.',
                source: 'Manual workflow design, a user preference field, or an upstream expression like {{$json.maxSummaryWords}}.',
                later: 'The result still appears in {{$json.response}}; there is no wordCount output from runtime.',
                format: 'Number only. Do not include words, commas, or units.',
                example: 'A weekly report workflow uses 120 so every generated summary fits in a CRM note preview.',
                empty: 'Runtime omits the word-limit phrase and asks Gemini to summarize without a length hint.',
                mistake: 'Assuming the worker cuts output exactly at this number; only the prompt changes.',
              }),
              placeholder: '100',
              example: '100',
            },
            {
              name: 'Gemini API Key',
              internalKey: 'apiKey',
              type: 'password',
              required: false,
              description: 'Optional direct Gemini key fallback for the delegated AI Chat Model credential resolver.',
              helpText: fieldHelp({
                what: 'A direct Gemini API key fallback used only if your credential setup does not provide a saved Gemini connection.',
                why: 'Text Summarizer calls Gemini through AI Chat Model, so the delegated step still needs a valid Gemini credential.',
                when: 'Use only for legacy or testing workflows; prefer Connections, credential vault, wallet, or key pool.',
                enter: 'A Gemini API key or secure credential expression such as {{$credentials.gemini.apiKey}}.',
                source: 'Google AI Studio, CtrlChecks Connections, or the credential system.',
                later: 'The key is consumed for the model call and is not returned in {{$json.response}}.',
                format: 'Secret string, commonly starting with AIza. Do not add labels or quotes.',
                example: 'A private workspace maps apiKey from the saved Gemini credential while summarizing call notes.',
                empty: 'The Gemini resolver tries other configured credential sources; if none work, output includes _error.',
                mistake: 'Using an OpenAI sk- key here; this alias runs Gemini 3.5 Flash.',
              }),
              placeholder: '{{$credentials.gemini.apiKey}}',
              example: '{{$credentials.gemini.apiKey}}',
            },
            {
              name: 'Temperature',
              internalKey: 'temperature',
              type: 'number',
              required: false,
              description: 'Optional temperature passed to the delegated AI Chat Model executor.',
              helpText: fieldHelp({
                what: 'A numeric creativity setting passed through to Gemini via AI Chat Model.',
                why: 'Lower values produce steadier summaries; higher values may vary wording more.',
                when: 'Set it when summary consistency matters for support notes, compliance, or reporting.',
                enter: 'Use 0.2 for factual summaries, 0.7 for looser narrative summaries, or map {{$json.temperature}}.',
                source: 'Workflow default, manual setting, or upstream preference field.',
                later: 'It is not returned as a field; inspect {{$json.response}} for the generated summary.',
                format: 'Number. The UI default is 0.2.',
                example: 'A customer-feedback workflow uses 0.2 so similar complaints get similarly worded summaries.',
                empty: 'The delegated AI Chat Model uses its default temperature handling.',
                mistake: 'Expecting Temperature to create bullets or word counts; write those requirements in Text/Prompt context or Max Length.',
              }),
              defaultValue: '0.2',
              placeholder: '0.2',
              example: '0.2',
            },
          ],
          outputExample: {
            ticketId: 'TCK-1048',
            response: 'The customer reports duplicate billing and requests a refund after checking invoice INV-1048.',
            model: 'gemini-3.5-flash',
          },
          outputDescription: 'response contains the summary text. model contains Gemini 3.5 Flash / gemini-3.5-flash from the delegated AI Chat Model. _error appears for Gemini credential error, prompt failure, or wallet failure, sometimes with code. Incoming fields are preserved. There is no summary, wordCount, or originalLength output key.',
          usageExample: {
            scenario: 'Summarize a support ticket before writing the result into a CRM note.',
            inputValues: {
              text: '{{$json.ticketBody}}',
              maxLength: '100',
              apiKey: '{{$credentials.gemini.apiKey}}',
              temperature: '0.2',
            },
            expectedOutput: 'Use {{$json.response}} as the summary and {{$json.ticketId}} from the preserved input when updating the CRM record.',
          },
          externalDocsUrl: 'https://ai.google.dev/gemini-api/docs',
        },
      ],
    },
  ],
  commonErrors: [
    {
      error: 'Text is blank but no local validation error is raised',
      cause: 'The executor still builds a non-empty summarization prompt around blank text.',
      fix: 'Validate upstream text before this node if an empty article, transcript, or ticket should stop the workflow.',
    },
    {
      error: 'Gemini credential error in _error',
      cause: 'The delegated AI Chat Model could not resolve a Gemini credential from Connections, credential vault, wallet, key pool, or apiKey fallback.',
      fix: 'Reconnect Gemini, verify the service node account connection, or map a valid Gemini API key securely.',
    },
    {
      error: 'Summary is in response, not summary',
      cause: 'Runtime returns the delegated AI Chat Model shape, not a custom summarizer object.',
      fix: 'Map {{$json.response}} downstream instead of {{$json.summary}}, {{$json.wordCount}}, or {{$json.originalLength}}.',
    },
    {
      error: 'Max Length only changes the generated prompt',
      cause: 'The worker inserts a word-limit hint but does not hard-truncate or count words after the model responds.',
      fix: 'For strict limits, add a downstream validation/truncation step or ask Gemini for a shorter response.',
    },
    {
      error: 'Output keeps incoming fields',
      cause: 'The delegated AI Chat Model spreads the incoming object on success and handled failures.',
      fix: 'Use preserved fields such as {{$json.ticketId}} normally, and use {{$json.response}} for the summary.',
    },
  ],
  relatedNodes: ['ai_chat_model', 'google_gemini', 'text_formatter'],
};
