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
  { name: 'API Key', internalKey: 'apiKey', type: 'password', required: true, description: 'Hugging Face API token read directly by the current runtime.', helpText: help('The Hugging Face access token used as the Bearer token for the inference router request.', 'The executor cannot call Hugging Face without a token.', 'Fill it for every run, preferably by mapping a secure Connections or credential vault value.', 'Enter a token beginning with hf_ or map {{$credentials.huggingface.apiKey}}.', 'From Hugging Face Settings -> Access Tokens or CtrlChecks Connections/credential vault.', 'This secret is not used downstream. Downstream nodes use {{$json.response}}, {{$json.output}}, {{$json.model}}, and {{$json.success}}.', 'Secret text, usually starting with hf_.', 'A research workflow maps {{$credentials.huggingface.apiKey}} before summarizing product reviews.', 'If blank, runtime returns success false with error: HuggingFace API token is required.', 'Do not paste the token into Prompt or Parameters.'), example: '{{$credentials.huggingface.apiKey}}' },
  { name: 'Model', internalKey: 'model', type: 'string', required: true, description: 'Hugging Face model ID sent to the inference router.', defaultValue: 'facebook/bart-large-cnn', helpText: help('The model repository identifier to call.', 'It chooses which hosted model processes the prompt.', 'Fill it with a model that supports the kind of text task you want.', 'Enter the exact model ID, such as facebook/bart-large-cnn, gpt2, google/flan-t5-large, or deepset/roberta-base-squad2.', 'From huggingface.co/models or a model card URL.', 'The configured model is returned as {{$json.model}} for logging and routing.', 'Exact Hugging Face model ID, often org/model-name.', 'A customer-feedback workflow uses facebook/bart-large-cnn for summarization.', 'Wrong IDs, gated models, or unsupported tasks return a HuggingFace API error.', 'Do not use only a display name from the model card; copy the exact repo ID.'), example: 'facebook/bart-large-cnn' },
  { name: 'Prompt', internalKey: 'prompt', type: 'textarea', required: true, description: 'Text sent as inputs to the Hugging Face inference router.', helpText: help('The text, question, passage, or instruction the model should process.', 'Runtime sends this value as the inputs property in the request body.', 'Fill it for every Hugging Face run.', 'Type text directly or map a field such as {{$json.reviewText}}, {{$json.article}}, or {{$json.question}}.', 'Usually from a form, document parser, chat message, CRM note, or previous transform step.', 'The generated/extracted text is returned as {{$json.response}}, and raw provider data is in {{$json.output}}.', 'Plain text with optional template expressions.', 'A review workflow prompts: Summarize {{$json.reviewText}} in one sentence.', 'If blank, runtime returns success false with error: prompt is required.', 'Do not assume Task changes the request shape; Prompt must contain the actual text to send.'), example: 'Summarize {{$json.reviewText}} in one sentence.' },
  { name: 'Task', internalKey: 'task', type: 'select', required: false, description: 'Visible task hint. Current runtime does not send this value to Hugging Face.', options: ['text-generation', 'text-classification', 'question-answering', 'summarization', 'translation'], defaultValue: 'text-generation', helpText: help('A visible hint for the intended model task.', 'It helps humans pick a compatible model, but the current executor does not read or send task.', 'Choose it for documentation/clarity only; it does not alter the router URL or payload.', 'Select text-generation, text-classification, question-answering, summarization, or translation.', 'Chosen from the model card/task type on Hugging Face.', 'No downstream output confirms task; runtime returns response/output/model/success.', 'One listed task value.', 'A product-review workflow chooses summarization while using facebook/bart-large-cnn.', 'Changing Task alone does not change runtime behavior or fix an incompatible model.', 'Do not rely on Task to transform question-answering inputs into a special object; prepare Prompt yourself.'), example: 'summarization' },
  { name: 'Max Tokens', internalKey: 'maxTokens', type: 'number', required: false, description: 'Maximum new tokens sent as parameters.max_new_tokens on the first request.', defaultValue: '256', helpText: help('The requested maximum length for generated text.', 'The executor sends it as max_new_tokens, then retries without parameters if Hugging Face rejects that parameter.', 'Use it when the selected model supports generation-length limits.', 'Enter a positive integer such as 128, 256, or 512.', 'Chosen by the workflow builder based on desired response length.', 'It can shorten {{$json.response}} when accepted by the model.', 'Positive integer.', 'A ticket summary workflow uses 256 to keep responses concise.', 'Some models reject max_new_tokens; runtime retries once with only inputs when the error mentions max_new_tokens.', 'Do not assume every Hugging Face task honors this value.'), example: '256' },
  { name: 'Temperature', internalKey: 'temperature', type: 'number', required: false, description: 'Sampling temperature sent in parameters on the first request.', defaultValue: '0.7', helpText: help('A number that can affect generation randomness for models that support it.', 'Runtime includes it under parameters.temperature on the first request.', 'Use lower values for stable summaries and labels, higher values for creative text generation.', 'Enter a number such as 0.2 or 0.7.', 'Chosen by the workflow designer for the task.', 'It may change {{$json.response}} if the selected model honors it.', 'Number, commonly 0 to 1.', 'A classification-like workflow uses 0.2 for more stable wording.', 'Unsupported models may ignore or reject it; the executor only retries for max_new_tokens-specific 400 errors.', 'Do not use high temperature when the next node expects strict JSON.'), example: '0.7' },
  { name: 'Parameters', internalKey: 'parameters', type: 'json', required: false, description: 'Legacy visible JSON field ignored by the current executor.', defaultValue: '{}', helpText: help('A visible custom-parameters JSON field from older UI designs.', 'The current runtime does not read this field; it only sends maxTokens and temperature as parameters.', 'Leave it blank unless preserving a legacy config or planning a worker change.', 'Enter {} for now. Use Max Tokens and Temperature for the two runtime-supported controls.', 'Chosen in the node panel; not read from Hugging Face.', 'No downstream output confirms Parameters were applied because they are ignored.', 'JSON object, though current executor ignores it.', 'A workflow leaves Parameters as {} and controls length with Max Tokens.', 'Changing it has no current effect on the HTTP request.', 'Do not place secrets or required model inputs here.'), example: '{}' },
];

export const huggingfaceDoc: NodeDoc = {
  slug: 'huggingface',
  displayName: 'Hugging Face',
  category: 'AI',
  logoUrl: '/icons/nodes/huggingface.svg',
  description: 'Call a Hugging Face inference model through the router API and return preserved input fields plus success, model, response, output, and error.',
  credentialType: 'Hugging Face API Token',
  credentialSetupSteps: [
    'Create a Hugging Face API Token in CtrlChecks Connections or credential vault, then map it into apiKey for this node.',
    'You can create a token at huggingface.co/settings/tokens; a Read token is enough for inference on accessible models.',
    'The current executor reads the apiKey field directly. Store the hf_ token in Connections or the credential vault, not in Prompt, Parameters, or ordinary workflow data.',
    'Connect this node output to parser, CRM, approval, file, or notification steps. Any downstream service node account connection belongs on that downstream service node.',
  ],
  credentialDocsUrl: 'https://huggingface.co/settings/tokens',
  resources: [{
    name: 'Configuration',
    description: 'Hugging Face has one runtime behavior: POST inputs plus max_new_tokens/temperature to the selected model route, retry once without parameters when max_new_tokens is rejected, and normalize common response shapes.',
    operations: [{
      name: 'Run Inference',
      value: 'default',
      description: 'Calls https://router.huggingface.co/hf-inference/models/<model> with Prompt as inputs. Task and Parameters are visible UI hints only; the current executor does not send them.',
      fields,
      outputExample: { customerId: 'C-1048', success: true, model: 'facebook/bart-large-cnn', response: 'Customer reports a duplicate billing charge and wants a refund.', output: [{ summary_text: 'Customer reports a duplicate billing charge and wants a refund.' }] },
      outputDescription: 'Successful output spreads incoming fields and adds success true, model, response, and output. response is normalized from summary_text, generated_text, translation_text, answer, sequence, label, text, or a JSON string fallback. Failures preserve incoming fields and add success false plus error.',
      usageExample: { scenario: 'Summarize product reviews with an open-source model before sending an escalation', inputValues: { apiKey: '{{$credentials.huggingface.apiKey}}', model: 'facebook/bart-large-cnn', prompt: 'Summarize {{$json.reviewText}} in one sentence.', task: 'summarization', maxTokens: '256', temperature: '0.2', parameters: '{}' }, expectedOutput: 'Use {{$json.response}} as the summary and {{$json.output}} when you need the raw provider result.' },
      externalDocsUrl: 'https://huggingface.co/docs/api-inference/index',
    }],
  }],
  commonErrors: [
    { error: 'HuggingFace API token is required', cause: 'apiKey/token is empty.', fix: 'Map a Hugging Face token from Connections or credential vault into apiKey.' },
    { error: 'prompt is required', cause: 'Prompt resolved to an empty string.', fix: 'Fill Prompt or map a text field such as {{$json.reviewText}}.' },
    { error: 'HuggingFace API error <status>: <message>', cause: 'The provider rejected the token, model ID, gated access, payload, quota, or parameters.', fix: 'Check token permissions, exact model ID, model availability, prompt size, and the returned provider text.' },
    { error: 'max_new_tokens rejected, retry used bare input', cause: 'A model returned a 400 mentioning max_new_tokens, so runtime retried with only inputs.', fix: 'Use a model that supports max_new_tokens or accept the bare-input retry behavior.' },
    { error: 'Task and Parameters do not affect request', cause: 'The current executor ignores task and custom parameters JSON.', fix: 'Use Model, Prompt, Max Tokens, and Temperature, or update worker runtime before relying on Task/Parameters.' },
  ],
  relatedNodes: ['cohere', 'mistral', 'openai_gpt', 'text_summarizer', 'sentiment_analyzer'],
};
