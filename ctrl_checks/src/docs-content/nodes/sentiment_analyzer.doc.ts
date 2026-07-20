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

export const sentimentAnalyzerDoc: NodeDoc = {
  slug: 'sentiment_analyzer',
  displayName: 'Sentiment Analyzer',
  category: 'AI',
  logoUrl: '/icons/nodes/sentiment_analyzer.svg',
  description: 'Builds a sentiment-analysis JSON prompt and delegates to the Gemini-backed AI Chat Model.',
  credentialType: 'Gemini credential',
  credentialSetupSteps: [
    'Sentiment Analyzer delegates to AI Chat Model and uses Gemini 3.5 Flash at runtime.',
    'Use a Gemini service node account connection, Connections entry, credential system mapping, credential vault value, wallet, or key pool when available.',
    'A direct Gemini API key can be used as apiKey fallback when the environment supports it, but secure credential storage is preferred.',
    'Connect the output to the next service node with an outgoing line, then map fields such as {{$json.response.sentiment}} in that next node.',
    'Successful output keeps incoming fields and adds response/model. Sentiment, score, and summary live inside response when Gemini returns valid JSON.',
  ],
  credentialDocsUrl: 'https://ai.google.dev/gemini-api/docs/api-key',
  resources: [
    {
      name: 'Configuration',
      description: 'Configure the text to classify. Runtime builds a Gemini prompt asking for JSON with sentiment, score, and summary, sets responseFormat to json, and delegates to ai_chat_model.',
      operations: [
        {
          name: 'Execute',
          value: 'default',
          description: 'Analyzes sentiment through Gemini via AI Chat Model. Valid JSON model output is parsed into response; invalid JSON falls back to raw response text. The node does not produce top-level sentiment, score, label, or confidence fields.',
          fields: [
            {
              name: 'Text',
              internalKey: 'text',
              type: 'textarea',
              required: true,
              description: 'Text inserted into the generated sentiment-analysis prompt.',
              helpText: fieldHelp({
                what: 'The customer message, review, comment, ticket, or other text that Gemini analyzes.',
                why: 'It is the only business data placed inside the generated sentiment prompt.',
                when: 'Fill it for every sentiment run, usually from an upstream form, webhook, email, or social node.',
                enter: 'Use expressions like {{$json.reviewText}}, {{$json.comment}}, {{$json.ticketBody}}, or paste text for testing.',
                source: 'Earlier workflow nodes that capture human-written text.',
                later: 'Read parsed values from {{$json.response.sentiment}}, {{$json.response.score}}, and {{$json.response.summary}} when Gemini returns valid JSON.',
                format: 'Plain text with optional CtrlChecks expressions. Do not enter a whole object unless you want that object string analyzed.',
                example: 'A support workflow maps {{$json.feedback}} and routes negative response.sentiment values to a priority queue.',
                empty: 'Runtime does not locally reject blank text; it still asks Gemini to analyze an empty text block.',
                mistake: 'Using {{$json.sentiment}} downstream. Runtime places sentiment inside {{$json.response.sentiment}} when JSON parsing succeeds.',
              }),
              placeholder: '{{$json.reviewText}}',
              example: '{{$json.reviewText}}',
            },
            {
              name: 'Gemini API Key',
              internalKey: 'apiKey',
              type: 'password',
              required: false,
              description: 'Optional direct Gemini key fallback for the delegated AI Chat Model credential resolver.',
              helpText: fieldHelp({
                what: 'A direct Gemini API key fallback used by the delegated AI Chat Model call.',
                why: 'Sentiment Analyzer calls Gemini 3.5 Flash, so the delegated model step needs a valid Gemini credential.',
                when: 'Use only for testing or legacy workflows; prefer Connections, credential vault, wallet, or key pool.',
                enter: 'A Gemini API key or secure expression such as {{$credentials.gemini.apiKey}}.',
                source: 'Google AI Studio, CtrlChecks Connections, credential system, or vault storage.',
                later: 'The key is consumed for the model request and is never returned to downstream nodes.',
                format: 'Secret string, commonly starting with AIza. Keep it out of plain workflow text.',
                example: 'A feedback triage workflow maps apiKey from a saved Gemini credential in a private workspace.',
                empty: 'The Gemini resolver tries other configured sources; if none work, output includes _error.',
                mistake: 'Pasting an OpenAI sk- key here; this node delegates to Gemini, not OpenAI.',
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
                what: 'A numeric creativity setting passed through to Gemini while requesting sentiment JSON.',
                why: 'Lower temperature helps keep labels and JSON structure more consistent.',
                when: 'Use a low value for routing, reporting, or alerting workflows that depend on stable labels.',
                enter: 'Use 0.2 for steady classification or map a controlled value such as {{$json.temperature}}.',
                source: 'Workflow default, manual setting, or an upstream configuration field.',
                later: 'It is not returned in output. Branch on {{$json.response.sentiment}} when response is parsed JSON.',
                format: 'Number. The UI default is 0.2.',
                example: 'A review-monitoring workflow uses 0.2 before an If/Else routes negative sentiment to Slack.',
                empty: 'The delegated AI Chat Model uses its default temperature handling.',
                mistake: 'Expecting Temperature to create top-level confidence fields; runtime only returns response/model plus preserved input.',
              }),
              defaultValue: '0.2',
              placeholder: '0.2',
              example: '0.2',
            },
          ],
          outputExample: {
            reviewId: 'REV-1048',
            response: { sentiment: 'negative', score: 0.86, summary: 'Customer is frustrated about late delivery.' },
            model: 'gemini-3.5-flash',
          },
          outputDescription: 'response contains parsed JSON with sentiment, score, and summary when Gemini returns valid JSON; if parsing fails, response contains raw text. model contains Gemini 3.5 Flash / gemini-3.5-flash from the delegated AI Chat Model. _error appears for Gemini credential error, prompt failure, or wallet failure, sometimes with code. Incoming fields are preserved. No top-level sentiment, score, confidence, or label keys are produced by runtime.',
          usageExample: {
            scenario: 'Route negative product reviews to a priority Slack alert while keeping the review id.',
            inputValues: {
              text: '{{$json.reviewText}}',
              apiKey: '{{$credentials.gemini.apiKey}}',
              temperature: '0.2',
            },
            expectedOutput: 'Use {{$json.response.sentiment}} in an If/Else node and keep {{$json.reviewId}} from the preserved input for the alert.',
          },
          externalDocsUrl: 'https://ai.google.dev/gemini-api/docs',
        },
      ],
    },
  ],
  commonErrors: [
    {
      error: 'Sentiment is inside response, not top-level sentiment',
      cause: 'Runtime delegates to AI Chat Model with JSON response parsing instead of creating custom sentiment fields.',
      fix: 'Use {{$json.response.sentiment}}, {{$json.response.score}}, and {{$json.response.summary}} when JSON parsing succeeds.',
    },
    {
      error: 'Invalid JSON falls back to raw text response',
      cause: 'The delegated AI Chat Model catches JSON parse errors and stores the model text directly in response.',
      fix: 'Check whether response is an object before branching, or tighten the prompt/temperature for stricter JSON.',
    },
    {
      error: 'Text is blank but no local validation error is raised',
      cause: 'The executor still builds a non-empty sentiment-analysis prompt around blank text.',
      fix: 'Add a validation or If/Else step before this node when empty reviews should be skipped.',
    },
    {
      error: 'Gemini credential error in _error',
      cause: 'The delegated AI Chat Model could not resolve a Gemini credential from Connections, credential vault, wallet, key pool, or apiKey fallback.',
      fix: 'Reconnect Gemini, verify the service node account connection, or map a valid Gemini API key securely.',
    },
    {
      error: 'Output keeps incoming fields',
      cause: 'The delegated AI Chat Model spreads the incoming object on success and handled failures.',
      fix: 'Use preserved fields such as {{$json.reviewId}} normally, and use {{$json.response.sentiment}} for routing.',
    },
  ],
  relatedNodes: ['ai_chat_model', 'google_gemini', 'if_else'],
};
