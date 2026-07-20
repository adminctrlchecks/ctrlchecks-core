import type { DocsSearchIndexItem } from '../search-index';

export const huggingfaceSearchIndex = [
  { type: 'node', title: 'Hugging Face', slug: 'huggingface', category: 'AI', href: '/docs/nodes/huggingface', text: 'Hugging Face inference router model prompt apiKey hf token response output success error maxTokens temperature task parameters' },
  { type: 'operation', title: 'Hugging Face: Run Inference', slug: 'huggingface', category: 'AI', href: '/docs/nodes/huggingface#operation-default', text: 'Run Inference posts inputs to router.huggingface.co hf-inference models returns preserved input success model response output error retries max_new_tokens rejection' },
  { type: 'field', title: 'Hugging Face: API Key', slug: 'huggingface', category: 'AI', href: '/docs/nodes/huggingface#operation-default', text: 'apiKey Hugging Face API Token hf_ credential vault Connections direct runtime Bearer token' },
  { type: 'field', title: 'Hugging Face: Prompt', slug: 'huggingface', category: 'AI', href: '/docs/nodes/huggingface#operation-default', text: 'prompt inputs text review article question required returns response output' },
  { type: 'field', title: 'Hugging Face: Task and Parameters', slug: 'huggingface', category: 'AI', href: '/docs/nodes/huggingface#operation-default', text: 'task parameters visible legacy ignored current executor Max Tokens Temperature runtime controls' },
] satisfies DocsSearchIndexItem[];
