// Comprehensive node-specific guides for getting API keys, URLs, and credentials

export interface NodeGuide {
  title: string;
  steps: string[];
  url?: string;
  example?: string;
}

export type NodeType = string;
export type FieldKey = string;

// Guide data structure: nodeType -> fieldKey -> guide
export const NODE_GUIDES: Record<NodeType, Record<FieldKey, NodeGuide>> = {
  amazon_ses: {
    recipients: {
      title: 'How to set Recipients?',
      steps: [
        'Enter a JSON object with to, cc, and bcc arrays.',
        'At least one recipient is required across those arrays.',
        'Example: {"to":["customer@example.com"],"cc":["ops@example.com"]}',
        'Use workflow values such as {{input.email}} when the address comes from an earlier step.'
      ],
      example: '{"to":["customer@example.com"]}'
    },
    fromAddress: {
      title: 'How to set From Address?',
      url: 'https://docs.aws.amazon.com/ses/latest/dg/verify-addresses-and-domains.html',
      steps: [
        'Use an email address or domain identity verified in Amazon SES.',
        'Open AWS Console -> Amazon SES -> Verified identities in the same region as this node.',
        'Copy the exact sender address, for example notifications@yourdomain.com.',
        'SES sandbox accounts can send only to verified recipients until production access is approved.'
      ],
      example: 'notifications@yourdomain.com'
    },
    awsRegion: {
      title: 'How to choose AWS Region?',
      steps: [
        'Choose the region where your SES identities, templates, and configuration sets exist.',
        'The node defaults to us-east-1 when no region is set.',
        'If your saved Amazon SES connection includes a region, leave this field at the matching value or override it deliberately.'
      ],
      example: 'us-east-1'
    },
    templateName: {
      title: 'How to use Template Name?',
      url: 'https://docs.aws.amazon.com/ses/latest/dg/send-personalized-email-api.html',
      steps: [
        'Turn on Use AWS SES Template.',
        'Open AWS Console -> Amazon SES -> Email templates in the selected region.',
        'Copy the exact template name.',
        'Fill Template Data with the variables used by that template.'
      ],
      example: 'OrderConfirmation'
    },
    templateData: {
      title: 'How to set Template Data?',
      steps: [
        'Enter a JSON object whose keys match the variables in the SES template.',
        'Example: {"name":"Ada","orderId":"12345"}',
        'Use workflow values such as {{$json.name}} or {{input.orderId}} when values come from earlier steps.'
      ],
      example: '{"name":"Ada","orderId":"12345"}'
    },
    attachments: {
      title: 'How to add Attachments?',
      steps: [
        'Enter a JSON array of attachment objects.',
        'Each item needs filename, base64 content, and contentType.',
        'SES sends attachments through a raw MIME email and enforces the total message size limit.'
      ],
      example: '[{"filename":"report.pdf","content":"{{input.pdfBase64}}","contentType":"application/pdf"}]'
    }
  },
  mailgun: {
    from: {
      title: 'How to set From Email?',
      steps: [
        'Use an email address on the sending domain saved in your Mailgun connection.',
        'Open Mailgun -> Sending -> Domains to confirm the domain is verified.',
        'For sandbox domains, Mailgun can send only to authorized recipients.',
        'Example: noreply@mg.yourdomain.com'
      ],
      example: 'noreply@mg.yourdomain.com'
    },
    to: {
      title: 'How to set To Email?',
      steps: [
        'Enter one recipient email address, or comma-separated addresses for multiple recipients.',
        'Use workflow values such as {{input.email}} when the recipient comes from an earlier step.',
        'For sandbox domains, add the recipient as an authorized recipient in Mailgun before testing.'
      ],
      example: 'customer@example.com'
    },
    text: {
      title: 'How to write Plain Text?',
      steps: [
        'Provide the plain text body of the email.',
        'Mailgun requires at least one of Text, HTML, or Template.',
        'Use workflow values such as {{input.name}} or {{input.resetUrl}} for personalization.'
      ],
      example: 'Hi {{input.name}}, your order {{input.orderId}} has shipped.'
    },
    html: {
      title: 'How to write HTML?',
      steps: [
        'Provide HTML content for email clients that support rich formatting.',
        'Mailgun requires at least one of Text, HTML, or Template.',
        'Keep dynamic values escaped or trusted before placing them in HTML.'
      ],
      example: '<p>Hi {{input.name}}, click <a href="{{input.resetUrl}}">here</a>.</p>'
    },
    template: {
      title: 'How to use a Mailgun Template?',
      steps: [
        'Create or find the stored template in Mailgun -> Sending -> Templates.',
        'Enter the exact template name in this field.',
        'Add Template Variables as a JSON object whose keys match the template variables.'
      ],
      example: 'welcome_email'
    },
    templateVariables: {
      title: 'How to set Template Variables?',
      steps: [
        'Enter a JSON object sent to Mailgun as t:variables.',
        'Use keys that match the variables used in the stored Mailgun template.',
        'Use workflow values when variables come from earlier steps.'
      ],
      example: '{"name":"Ada","resetUrl":"{{input.resetUrl}}"}'
    }
  },
  google_gemini: {
    apiKey: {
      title: 'Gemini AI Studio API Key – Step-by-Step',
      url: 'https://aistudio.google.com',
      steps: [
        '1️⃣ Open Gemini AI Studio',
        '   Go to 👉 https://aistudio.google.com',
        '   Make sure you\'re logged in with your Google account.',
        '',
        '2️⃣ Sign in with Google',
        '   Use your Gmail / Google Workspace account',
        '   Accept the basic terms if prompted',
        '',
        '3️⃣ Go to "Get API key"',
        '   On the left sidebar (or top menu):',
        '   ➡️ Click "Get API key"',
        '   or',
        '   ➡️ Click "API keys"',
        '',
        '4️⃣ Create a New API Key',
        '   Click "Create API key"',
        '   Select a Google Cloud Project',
        '   You can:',
        '   • Use an existing project, OR',
        '   • Create a new project (recommended)',
        '',
        '5️⃣ Copy the API Key',
        '   Once created:',
        '   • Copy the key immediately 🔐',
        '   • Store it securely (env file, secret manager, etc.)',
        '',
        'Example:',
        'AIzaSyDxxxxxxxxxxxxxxxxxxxxx'
      ],
      example: 'AIzaSyDxxxxxxxxxxxxxxxxxxxxx'
    },
    temperature: {
      title: 'How to set Temperature?',
      steps: [
        'Temperature controls how random or focused Gemini’s responses are.',
        '',
        'Range: 0.0 to 2.0 (default 0.7).',
        '',
        'Recommended ranges:',
        '• 0.0 – 0.3 → Very deterministic and factual (good for code, calculations, data extraction).',
        '• 0.4 – 0.8 → Balanced, natural answers (good general setting).',
        '• 0.9 – 1.5 → More creative and varied (brainstorming, story writing).',
        '',
        'Tip: If outputs feel too random, lower the temperature; if they feel too rigid or repetitive, increase it slightly.'
      ],
      example: '0.7'
    },
    memory: {
      title: 'How to set Memory?',
      steps: [
        'Memory is how many recent conversation turns this node keeps when sending context to Gemini.',
        '',
        'Each turn = 1 user message + 1 AI response.',
        '',
        'Guidelines:',
        '• 0–2 → One-off questions or very short interactions.',
        '• 3–10 → Typical chatbots and assistants (remembers recent part of the conversation).',
        '• 10+ → Long dialogues; more context but higher token usage and cost.',
        '',
        'Tip: Increase Memory only if the AI is “forgetting” earlier parts of the conversation that still matter.'
      ],
      example: '10'
    }
  },
  openai_gpt: {
    apiKey: {
      title: 'OpenAI API Key – Step-by-Step',
      url: 'https://platform.openai.com/api-keys',
      steps: [
        '1️⃣ Open OpenAI Platform',
        '   Go to 👉 https://platform.openai.com/api-keys',
        '   Sign in or create an account',
        '',
        '2️⃣ Navigate to API Keys',
        '   Click on your profile icon (top right)',
        '   Select "API keys" from the dropdown',
        '   Or go directly to: platform.openai.com/api-keys',
        '',
        '3️⃣ Create New Secret Key',
        '   Click "Create new secret key" button',
        '   Give it a name (e.g., "Workflow Integration")',
        '   Select permissions if prompted',
        '',
        '4️⃣ Copy the API Key',
        '   ⚠️ IMPORTANT: Copy the key immediately!',
        '   You won\'t be able to see it again after closing',
        '   The key starts with "sk-"',
        '',
        '5️⃣ Store Securely',
        '   Paste it into the input field above',
        '   Never commit to version control',
        '   Use environment variables in production',
        '',
        'Example:',
        'sk-proj-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
      ],
      example: 'sk-proj-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
    },
    model: {
      title: 'How to choose Model?',
      steps: [
        'Select the OpenAI model that matches your task.',
        '',
        'Options:',
        '• gpt-4o – most capable',
        '• gpt-4o-mini – faster, lower cost',
        '• gpt-4-turbo – strong general performance'
      ],
      example: 'gpt-4o'
    },
    prompt: {
      title: 'How to write System Prompt?',
      steps: [
        'System Prompt defines the AI’s role and behavior.',
        '',
        'Example:',
        'You are a helpful assistant that summarizes text clearly.',
        '',
        'Tip: Be explicit about format and tone.'
      ],
      example: 'You are a helpful assistant that summarizes text clearly.'
    },
    temperature: {
      title: 'How to set Temperature?',
      steps: [
        'Temperature controls creativity vs. determinism.',
        '',
        'Guidelines:',
        '• 0.0–0.3 for factual tasks',
        '• 0.7 for balanced output',
        '• 1.0+ for creative tasks'
      ],
      example: '0.7'
    },
    memory: {
      title: 'How to set Memory?',
      steps: [
        'Memory is the number of conversation turns remembered.',
        '',
        'Set higher values for longer context, lower for short tasks.'
      ],
      example: '10'
    }
  },
  ollama: {
    prompt: {
      title: 'How to write Prompt?',
      steps: [
        'Prompt is the instruction sent to the model.',
        '',
        'Example:',
        'Summarize the text in 3 bullet points.',
        '',
        'Tip: Be clear and specific.'
      ],
      example: 'Summarize the text in 3 bullet points.'
    },
    temperature: {
      title: 'How to set Temperature?',
      steps: [
        'Temperature controls creativity vs. determinism.',
        '',
        'Guidelines:',
        '• 0.0–0.3 for factual tasks',
        '• 0.7 for balanced output',
        '• 1.0+ for creative tasks'
      ],
      example: '0.7'
    }
  },
  anthropic_claude: {
    apiKey: {
      title: 'Anthropic Claude API Key – Step-by-Step',
      url: 'https://console.anthropic.com/settings/keys',
      steps: [
        '1️⃣ Open Anthropic Console',
        '   Go to 👉 https://console.anthropic.com/settings/keys',
        '   Sign in or create an account',
        '',
        '2️⃣ Navigate to API Keys',
        '   Click on "API Keys" in the left sidebar',
        '   Or go to Settings → API Keys',
        '',
        '3️⃣ Create New Key',
        '   Click "Create Key" button',
        '   Give it a name (e.g., "Workflow Integration")',
        '   Select the organization if you have multiple',
        '',
        '4️⃣ Copy the API Key',
        '   ⚠️ IMPORTANT: Copy the key immediately!',
        '   You won\'t be able to see it again',
        '   The key starts with "sk-ant-"',
        '',
        '5️⃣ Store Securely',
        '   Paste it into the input field above',
        '   Store in secure vault or environment variables',
        '   Never share publicly or commit to git',
        '',
        'Example:',
        'sk-ant-api03-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
      ],
      example: 'sk-ant-api03-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
    }
  },
  azure_openai: {
    apiKey: {
      title: 'Azure OpenAI API Key – Step-by-Step',
      url: 'https://portal.azure.com',
      steps: [
        '1️⃣ Open Azure Portal',
        '   Go to 👉 https://portal.azure.com',
        '   Sign in with your Azure account',
        '',
        '2️⃣ Navigate to Azure OpenAI Resource',
        '   Search for "Azure OpenAI" in the top search bar',
        '   Click on your Azure OpenAI resource',
        '   (Create one if you don\'t have it)',
        '',
        '3️⃣ Go to Keys and Endpoint',
        '   In the left sidebar, click "Keys and Endpoint"',
        '   Under "Resource Management" section',
        '',
        '4️⃣ Copy API Key',
        '   You\'ll see KEY 1 and KEY 2',
        '   Copy either KEY 1 or KEY 2',
        '   Both keys work the same way',
        '',
        '5️⃣ Copy Endpoint URL',
        '   Also copy the "Endpoint" URL',
        '   Format: https://your-resource.openai.azure.com',
        '   You\'ll need this for the Endpoint field',
        '',
        '6️⃣ Store Securely',
        '   Paste the key into the API Key field above',
        '   Paste the endpoint into the Endpoint field',
        '   Never commit to version control',
        '',
        'Example Key:',
        'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
      ],
      example: 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
    },
    endpoint: {
      title: 'Azure OpenAI Endpoint – Step-by-Step',
      url: 'https://portal.azure.com',
      steps: [
        '1️⃣ Open Azure Portal',
        '   Go to 👉 https://portal.azure.com',
        '   Sign in with your Azure account',
        '',
        '2️⃣ Navigate to Azure OpenAI Resource',
        '   Search for "Azure OpenAI" in the top search bar',
        '   Click on your Azure OpenAI resource',
        '',
        '3️⃣ Go to Keys and Endpoint',
        '   In the left sidebar, click "Keys and Endpoint"',
        '   Under "Resource Management" section',
        '',
        '4️⃣ Copy Endpoint URL',
        '   Find the "Endpoint" field',
        '   Copy the full URL',
        '   Format: https://your-resource.openai.azure.com',
        '',
        '5️⃣ Use the Endpoint',
        '   Paste it into the Endpoint field above',
        '   Make sure it includes https://',
        '   Don\'t include any paths after .com',
        '',
        'Example:',
        'https://my-openai-resource.openai.azure.com'
      ],
      example: 'https://my-openai-resource.openai.azure.com'
    }
  },
  huggingface_inference: {
    apiKey: {
      title: 'Hugging Face Token – Step-by-Step',
      url: 'https://huggingface.co/settings/tokens',
      steps: [
        '1️⃣ Open Hugging Face',
        '   Go to 👉 https://huggingface.co/settings/tokens',
        '   Sign in or create an account',
        '',
        '2️⃣ Navigate to Access Tokens',
        '   Click on "Access Tokens" in the left sidebar',
        '   Or go to Settings → Access Tokens',
        '',
        '3️⃣ Create New Token',
        '   Click "New token" button',
        '   Give it a name (e.g., "Workflow Integration")',
        '   Select token type:',
        '   • Read: For inference only',
        '   • Write: For uploading models',
        '',
        '4️⃣ Copy the Token',
        '   ⚠️ IMPORTANT: Copy the token immediately!',
        '   You won\'t be able to see it again',
        '   The token starts with "hf_"',
        '',
        '5️⃣ Store Securely',
        '   Paste it into the input field above',
        '   Store in secure vault or environment variables',
        '   Never share publicly',
        '',
        'Example:',
        'hf_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
      ],
      example: 'hf_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
    }
  },
  cohere: {
    apiKey: {
      title: 'Cohere API Key – Step-by-Step',
      url: 'https://dashboard.cohere.com',
      steps: [
        '1️⃣ Open Cohere Dashboard',
        '   Go to 👉 https://dashboard.cohere.com',
        '   Sign in or create an account',
        '',
        '2️⃣ Navigate to API Keys',
        '   Click on "API Keys" in the left sidebar',
        '   Or go to Settings → API Keys',
        '',
        '3️⃣ Create API Key',
        '   Click "Create API Key" button',
        '   Give it a name (e.g., "Workflow Integration")',
        '   Select the environment (Trial or Production)',
        '',
        '4️⃣ Copy the API Key',
        '   ⚠️ IMPORTANT: Copy the key immediately!',
        '   You won\'t be able to see it again',
        '   The key is a long alphanumeric string',
        '',
        '5️⃣ Store Securely',
        '   Paste it into the input field above',
        '   Store in secure vault or environment variables',
        '   Never commit to version control',
        '',
        'Example:',
        'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
      ],
      example: 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
    }
  },
  // Shared guides for nodes that use OpenAI API key
  text_summarizer: {
    apiKey: {
      title: 'OpenAI API Key – Step-by-Step',
      url: 'https://platform.openai.com/api-keys',
      steps: [
        '1️⃣ Open OpenAI Platform',
        '   Go to 👉 https://platform.openai.com/api-keys',
        '   Sign in or create an account',
        '',
        '2️⃣ Navigate to API Keys',
        '   Click on your profile icon (top right)',
        '   Select "API keys" from the dropdown',
        '   Or go directly to: platform.openai.com/api-keys',
        '',
        '3️⃣ Create New Secret Key',
        '   Click "Create new secret key" button',
        '   Give it a name (e.g., "Workflow Integration")',
        '   Select permissions if prompted',
        '',
        '4️⃣ Copy the API Key',
        '   ⚠️ IMPORTANT: Copy the key immediately!',
        '   You won\'t be able to see it again after closing',
        '   The key starts with "sk-"',
        '',
        '5️⃣ Store Securely',
        '   Paste it into the input field above',
        '   Never commit to version control',
        '   Use environment variables in production',
        '',
        'Example:',
        'sk-proj-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
      ],
      example: 'sk-proj-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
    }
  },
  sentiment_analyzer: {
    apiKey: {
      title: 'OpenAI API Key – Step-by-Step',
      url: 'https://platform.openai.com/api-keys',
      steps: [
        '1️⃣ Open OpenAI Platform',
        '   Go to 👉 https://platform.openai.com/api-keys',
        '   Sign in or create an account',
        '',
        '2️⃣ Navigate to API Keys',
        '   Click on your profile icon (top right)',
        '   Select "API keys" from the dropdown',
        '',
        '3️⃣ Create New Secret Key',
        '   Click "Create new secret key" button',
        '   Give it a name (e.g., "Workflow Integration")',
        '',
        '4️⃣ Copy the API Key',
        '   ⚠️ IMPORTANT: Copy the key immediately!',
        '   The key starts with "sk-"',
        '',
        '5️⃣ Store Securely',
        '   Paste it into the input field above',
        '   Never commit to version control',
        '',
        'Example:',
        'sk-proj-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
      ],
      example: 'sk-proj-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
    }
  },
  llm_chain: {
    apiKey: {
      title: 'OpenAI API Key – Step-by-Step',
      url: 'https://platform.openai.com/api-keys',
      steps: [
        '1️⃣ Open OpenAI Platform',
        '   Go to 👉 https://platform.openai.com/api-keys',
        '   Sign in or create an account',
        '',
        '2️⃣ Navigate to API Keys',
        '   Click on your profile icon (top right)',
        '   Select "API keys" from the dropdown',
        '',
        '3️⃣ Create New Secret Key',
        '   Click "Create new secret key" button',
        '   Give it a name (e.g., "Workflow Integration")',
        '',
        '4️⃣ Copy the API Key',
        '   ⚠️ IMPORTANT: Copy the key immediately!',
        '   The key starts with "sk-"',
        '',
        '5️⃣ Store Securely',
        '   Paste it into the input field above',
        '',
        'Example:',
        'sk-proj-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
      ],
      example: 'sk-proj-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
    }
  },
  hugging_face: {
    apiKey: {
      title: 'Hugging Face Token – Step-by-Step',
      url: 'https://huggingface.co/settings/tokens',
      steps: [
        '1️⃣ Open Hugging Face',
        '   Go to 👉 https://huggingface.co/settings/tokens',
        '   Sign in or create an account',
        '',
        '2️⃣ Navigate to Access Tokens',
        '   Click on "Access Tokens" in the left sidebar',
        '   Or go to Settings → Access Tokens',
        '',
        '3️⃣ Create New Token',
        '   Click "New token" button',
        '   Give it a name (e.g., "Workflow Integration")',
        '   Select token type:',
        '   • Read: For inference only',
        '   • Write: For uploading models',
        '',
        '4️⃣ Copy the Token',
        '   ⚠️ IMPORTANT: Copy the token immediately!',
        '   You won\'t be able to see it again',
        '   The token starts with "hf_"',
        '',
        '5️⃣ Store Securely',
        '   Paste it into the input field above',
        '   Store in secure vault or environment variables',
        '',
        'Example:',
        'hf_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
      ],
      example: 'hf_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
    }
  },
  embeddings: {
    apiKey: {
      title: 'API Key for Embeddings – Step-by-Step',
      steps: [
        '1️⃣ For OpenAI Embeddings',
        '   Go to 👉 https://platform.openai.com/api-keys',
        '   Sign in or create an account',
        '   Click "Create new secret key"',
        '   Copy the key (starts with "sk-")',
        '',
        '2️⃣ For Google Gemini Embeddings',
        '   Go to 👉 https://aistudio.google.com/apikey',
        '   Sign in with Google account',
        '   Click "Create API key"',
        '   Copy the key (starts with "AIza")',
        '',
        '3️⃣ Select Provider',
        '   Choose the provider in the dropdown above',
        '   Then use the corresponding API key',
        '',
        '4️⃣ Store Securely',
        '   Paste it into the input field above',
        '   Never commit to version control',
        '',
        'Example (OpenAI):',
        'sk-proj-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
        '',
        'Example (Gemini):',
        'AIzaSyDxxxxxxxxxxxxxxxxxxxxx'
      ],
      example: 'sk-proj-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
    }
  },
  vector_store: {
    apiKey: {
      title: 'Vector Store API Key – Step-by-Step',
      steps: [
        '1️⃣ For Pinecone',
        '   Go to 👉 https://app.pinecone.io',
        '   Sign in or create an account',
        '   Navigate to "API Keys" section',
        '   Copy your API key',
        '   Also note your environment and index name',
        '',
        '2️⃣ For Supabase',
        '   Go to 👉 https://app.supabase.com',
        '   Sign in to your project',
        '   Go to Settings → API',
        '   Copy the "anon" or "service_role" key',
        '   Use "service_role" for server-side operations',
        '',
        '3️⃣ Select Provider',
        '   Choose Pinecone or Supabase in dropdown',
        '   Use the corresponding API key',
        '',
        '4️⃣ Store Securely',
        '   Paste it into the input field above',
        '   Never commit to version control',
        '',
        'Example (Pinecone):',
        'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
        '',
        'Example (Supabase):',
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
      ],
      example: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx'
    }
  },
  chat_model: {
    apiKey: {
      title: 'AI Provider API Key – Step-by-Step',
      steps: [
        '1️⃣ For OpenAI',
        '   Go to 👉 https://platform.openai.com/api-keys',
        '   Click "Create new secret key"',
        '   Copy key (starts with "sk-")',
        '',
        '2️⃣ For Anthropic Claude',
        '   Go to 👉 https://console.anthropic.com/settings/keys',
        '   Click "Create Key"',
        '   Copy key (starts with "sk-ant-")',
        '',
        '3️⃣ For Google Gemini',
        '   Go to 👉 https://aistudio.google.com/apikey',
        '   Click "Create API key"',
        '   Copy key (starts with "AIza")',
        '',
        '4️⃣ For Azure OpenAI',
        '   Go to 👉 https://portal.azure.com',
        '   Navigate to Azure OpenAI resource',
        '   Go to "Keys and Endpoint"',
        '   Copy KEY 1 or KEY 2',
        '',
        '5️⃣ Select Provider',
        '   Choose provider in dropdown above',
        '   Use corresponding API key',
        '',
        '6️⃣ Store Securely',
        '   Paste it into the input field above',
        '',
        'Example (OpenAI):',
        'sk-proj-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
      ],
      example: 'sk-proj-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
    },
    endpoint: {
      title: 'Azure OpenAI Endpoint – Step-by-Step',
      url: 'https://portal.azure.com',
      steps: [
        '1️⃣ Open Azure Portal',
        '   Go to 👉 https://portal.azure.com',
        '   Sign in with your Azure account',
        '',
        '2️⃣ Navigate to Azure OpenAI Resource',
        '   Search for "Azure OpenAI" in top search bar',
        '   Click on your Azure OpenAI resource',
        '',
        '3️⃣ Go to Keys and Endpoint',
        '   In left sidebar, click "Keys and Endpoint"',
        '   Under "Resource Management" section',
        '',
        '4️⃣ Copy Endpoint URL',
        '   Find the "Endpoint" field',
        '   Copy the full URL',
        '   Format: https://your-resource.openai.azure.com',
        '',
        '5️⃣ Use the Endpoint',
        '   Paste it into the Endpoint field above',
        '   Make sure it includes https://',
        '   Don\'t include any paths after .com',
        '',
        'Example:',
        'https://my-openai-resource.openai.azure.com'
      ],
      example: 'https://my-openai-resource.openai.azure.com'
    }
  },
  // AI Agent nodes that use apiKey
  intent_classification_agent: {
    apiKey: {
      title: 'AI Provider API Key – Step-by-Step',
      steps: [
        '1️⃣ For OpenAI',
        '   Go to 👉 https://platform.openai.com/api-keys',
        '   Click "Create new secret key"',
        '   Copy key (starts with "sk-")',
        '',
        '2️⃣ For Anthropic Claude',
        '   Go to 👉 https://console.anthropic.com/settings/keys',
        '   Click "Create Key"',
        '   Copy key (starts with "sk-ant-")',
        '',
        '3️⃣ For Google Gemini',
        '   Go to 👉 https://aistudio.google.com/apikey',
        '   Click "Create API key"',
        '   Copy key (starts with "AIza")',
        '',
        '4️⃣ Select Model',
        '   Choose model in dropdown above',
        '   Use corresponding API key',
        '',
        '5️⃣ Store Securely',
        '   Paste it into the input field above',
        '',
        'Example:',
        'sk-proj-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
      ],
      example: 'sk-proj-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
    }
  },
  sentiment_analysis_agent: {
    apiKey: {
      title: 'AI Provider API Key – Step-by-Step',
      steps: [
        '1️⃣ For OpenAI',
        '   Go to 👉 https://platform.openai.com/api-keys',
        '   Click "Create new secret key"',
        '   Copy key (starts with "sk-")',
        '',
        '2️⃣ For Anthropic Claude',
        '   Go to 👉 https://console.anthropic.com/settings/keys',
        '   Click "Create Key"',
        '   Copy key (starts with "sk-ant-")',
        '',
        '3️⃣ For Google Gemini',
        '   Go to 👉 https://aistudio.google.com/apikey',
        '   Click "Create API key"',
        '   Copy key (starts with "AIza")',
        '',
        '4️⃣ Store Securely',
        '   Paste it into the input field above',
        '',
        'Example:',
        'sk-proj-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
      ],
      example: 'sk-proj-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
    }
  },
  confidence_scoring_agent: {
    apiKey: {
      title: 'AI Provider API Key – Step-by-Step',
      steps: [
        '1️⃣ For OpenAI',
        '   Go to 👉 https://platform.openai.com/api-keys',
        '   Click "Create new secret key"',
        '   Copy key (starts with "sk-")',
        '',
        '2️⃣ For Anthropic Claude',
        '   Go to 👉 https://console.anthropic.com/settings/keys',
        '   Click "Create Key"',
        '   Copy key (starts with "sk-ant-")',
        '',
        '3️⃣ For Google Gemini',
        '   Go to 👉 https://aistudio.google.com/apikey',
        '   Click "Create API key"',
        '   Copy key (starts with "AIza")',
        '',
        '4️⃣ Store Securely',
        '   Paste it into the input field above',
        '',
        'Example:',
        'sk-proj-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
      ],
      example: 'sk-proj-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
    }
  },
  lead_qualification_agent: {
    apiKey: {
      title: 'AI Provider API Key – Step-by-Step',
      steps: [
        '1️⃣ For OpenAI',
        '   Go to 👉 https://platform.openai.com/api-keys',
        '   Click "Create new secret key"',
        '   Copy key (starts with "sk-")',
        '',
        '2️⃣ For Anthropic Claude',
        '   Go to 👉 https://console.anthropic.com/settings/keys',
        '   Click "Create Key"',
        '   Copy key (starts with "sk-ant-")',
        '',
        '3️⃣ For Google Gemini',
        '   Go to 👉 https://aistudio.google.com/apikey',
        '   Click "Create API key"',
        '   Copy key (starts with "AIza")',
        '',
        '4️⃣ Store Securely',
        '   Paste it into the input field above',
        '',
        'Example:',
        'sk-proj-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
      ],
      example: 'sk-proj-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
    }
  },
  http_request: {
    url: {
      title: 'API Endpoint URL – Step-by-Step',
      steps: [
        '1️⃣ Identify the Service',
        '   Determine which API you need to connect to',
        '   Check the service\'s official documentation',
        '',
        '2️⃣ Find Base URL',
        '   Look for "Base URL" or "API Endpoint" in docs',
        '   Common formats:',
        '   • https://api.service.com',
        '   • https://service.com/api/v1',
        '   • https://api.service.com/v2',
        '',
        '3️⃣ Check API Documentation',
        '   Most services provide URLs in:',
        '   • API Documentation page',
        '   • Developer Dashboard → API Settings',
        '   • Integration Guides',
        '',
        '4️⃣ For REST APIs',
        '   Base URL + Resource Path',
        '   Example: https://api.example.com/users',
        '   Example: https://api.example.com/data?id=123',
        '',
        '5️⃣ For Webhooks',
        '   Use your server\'s public URL',
        '   Format: https://your-domain.com/webhook',
        '',
        '6️⃣ Verify the URL',
        '   Test in browser or API client (Postman)',
        '   Ensure it includes protocol (https://)',
        '   Check if authentication is required',
        '',
        'Example:',
        'https://api.example.com/v1/data'
      ],
      example: 'https://api.example.com/v1/data'
    },
    method: {
      title: 'How to get Method?',
      steps: [
        'Choose the HTTP method required by the API.',
        '',
        '• GET – Read data',
        '• POST – Create data',
        '• PUT – Replace data',
        '• PATCH – Update part of data',
        '• DELETE – Remove data',
        '',
        'Check the API documentation for the correct method.'
      ],
      example: 'GET'
    },
    headers: {
      title: 'HTTP Request Headers – Step-by-Step',
      steps: [
        '1️⃣ Common Headers',
        '   Headers are key-value pairs in JSON format',
        '   Used for authentication and content type',
        '',
        '2️⃣ Authorization Header',
        '   For API keys:',
        '   {"Authorization": "Bearer YOUR_API_KEY"}',
        '   For Basic Auth:',
        '   {"Authorization": "Basic base64(username:password)"}',
        '',
        '3️⃣ Content-Type Header',
        '   For JSON data:',
        '   {"Content-Type": "application/json"}',
        '   For form data:',
        '   {"Content-Type": "application/x-www-form-urlencoded"}',
        '',
        '4️⃣ Custom Headers',
        '   Some APIs require custom headers:',
        '   {"X-API-Key": "your-key"}',
        '   {"X-Custom-Header": "value"}',
        '',
        '5️⃣ Format',
        '   Use valid JSON format',
        '   All keys and string values in quotes',
        '   Separate multiple headers with commas',
        '',
        'Example:',
        '{"Authorization": "Bearer sk-xxx", "Content-Type": "application/json"}'
      ],
      example: '{"Authorization": "Bearer sk-xxx", "Content-Type": "application/json"}'
    },
    body: {
      title: 'How to get Body (JSON)?',
      steps: [
        'Body is required for POST, PUT, or PATCH requests.',
        '',
        'Use JSON format and follow the API schema.',
        '',
        'Example:',
        '{"name": "John Doe", "email": "john@example.com"}'
      ],
      example: '{"name": "John Doe"}'
    },
    timeout: {
      title: 'How to get Timeout (ms)?',
      steps: [
        'Set how long to wait before the request fails.',
        '',
        'Default is 30000 (30 seconds).',
        '',
        'Increase for slow APIs or large responses.'
      ],
      example: '30000'
    }
  },
  google_sheets: {
    operation: {
      title: 'How to choose Operation?',
      steps: [
        'Operation defines what you want to do in Google Sheets.',
        '',
        'Options:',
        '• Read – retrieve data',
        '• Write – replace data in a range',
        '• Append – add new rows',
        '• Update – modify existing cells',
        '',
        'Choose based on whether you are reading or writing.'
      ],
      example: 'read'
    },
    spreadsheetId: {
      title: 'Google Sheets ID – Step-by-Step',
      steps: [
        '1️⃣ Open Your Google Sheet',
        '   Go to 👉 https://sheets.google.com',
        '   Open the spreadsheet you want to use',
        '',
        '2️⃣ Get the Spreadsheet ID from URL',
        '   Look at the URL in your browser',
        '   Format: https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/edit',
        '   The ID is the long string between /d/ and /edit',
        '',
        '3️⃣ Copy the ID',
        '   Select and copy the ID from the URL',
        '   It looks like: 1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms',
        '   It\'s usually 44 characters long',
        '',
        '4️⃣ Paste the ID',
        '   Paste it into the Spreadsheet ID field above',
        '   Make sure there are no extra spaces',
        '',
        '5️⃣ Verify Access',
        '   Ensure the sheet is accessible',
        '   For private sheets, use OAuth authentication',
        '',
        'Example:',
        '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms'
      ],
      example: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms'
    },
    sheetName: {
      title: 'How to set Sheet Name?',
      steps: [
        'Sheet Name is the tab name at the bottom of your spreadsheet.',
        '',
        'Example: Sheet1',
        'Leave empty to use the first sheet.'
      ],
      example: 'Sheet1'
    },
    range: {
      title: 'How to set Range?',
      steps: [
        'Range defines which cells to read or write.',
        '',
        'Examples:',
        '• A1:D10',
        '• A1:D (all rows in columns A–D)',
        '',
        'Leave empty to read all used cells.'
      ],
      example: 'A1:D10'
    },
    outputFormat: {
      title: 'How to choose Output Format?',
      steps: [
        'Output Format controls how data is returned when reading.',
        '',
        'Options:',
        '• JSON Array',
        '• Key‑Value Pairs',
        '• Plain Text Table'
      ],
      example: 'json'
    },
    readDirection: {
      title: 'How to set Read Direction?',
      steps: [
        'Read Direction chooses row‑wise or column‑wise output.',
        '',
        'Row‑wise is the default and most common.'
      ],
      example: 'rows'
    },
    allowWrite: {
      title: 'What is Allow Write Access?',
      steps: [
        'Enable this to allow Write/Append/Update operations.',
        '',
        'If disabled, the node will only read data.',
        'This may be restricted to admin users.'
      ],
      example: 'false'
    },
    data: {
      title: 'How to set Data to Write (JSON)?',
      steps: [
        'Data is required for Write, Append, or Update.',
        '',
        'Use a JSON array of rows:',
        '[["Name","Email"],["John","john@example.com"]]',
        '',
        'Tip: Ensure your data matches the sheet structure.'
      ],
      example: '[["Name","Email"],["John","john@example.com"]]'
    }
  },
  twitter: {
    apiKey: {
      title: 'Twitter API Key – Step-by-Step',
      url: 'https://developer.twitter.com',
      steps: [
        '1️⃣ Open Twitter Developer Portal',
        '   Go to 👉 https://developer.twitter.com',
        '   Sign in with your Twitter/X account',
        '',
        '2️⃣ Create or Select App',
        '   Go to "Projects & Apps"',
        '   Create a new App or select existing one',
        '   Give it a name (e.g., "Workflow Integration")',
        '',
        '3️⃣ Go to Keys and Tokens',
        '   Click on your App',
        '   Navigate to "Keys and tokens" tab',
        '',
        '4️⃣ Copy API Key',
        '   Find "Consumer Keys" section',
        '   Copy the "API Key" (also called Consumer Key)',
        '   ⚠️ You can regenerate if needed',
        '',
        '5️⃣ Store Securely',
        '   Paste it into the API Key field above',
        '   You\'ll also need API Secret, Access Token, and Access Token Secret',
        '',
        'Example:',
        'xxxxxxxxxxxxxxxxxxxxxxxxx'
      ],
      example: 'xxxxxxxxxxxxxxxxxxxxxxxxx'
    },
    apiSecret: {
      title: 'Twitter API Secret – Step-by-Step',
      url: 'https://developer.twitter.com',
      steps: [
        '1️⃣ Go to Keys and Tokens',
        '   In your Twitter App settings',
        '   Navigate to "Keys and tokens" tab',
        '',
        '2️⃣ Find Consumer Keys Section',
        '   Look for "Consumer Keys"',
        '   Find "API Secret" (Consumer Secret)',
        '',
        '3️⃣ Copy API Secret',
        '   Click "Reveal" if hidden',
        '   Copy the API Secret',
        '   ⚠️ You can regenerate if needed',
        '',
        '4️⃣ Store Securely',
        '   Paste it into the API Secret field above',
        '   Never share publicly',
        '',
        'Example:',
        'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
      ],
      example: 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
    },
    accessToken: {
      title: 'Twitter Access Token – Step-by-Step',
      url: 'https://developer.twitter.com',
      steps: [
        '1️⃣ Go to Keys and Tokens',
        '   In your Twitter App settings',
        '   Navigate to "Keys and tokens" tab',
        '',
        '2️⃣ Find Access Token Section',
        '   Scroll to "Access Token and Secret"',
        '   Click "Generate" if not created yet',
        '',
        '3️⃣ Copy Access Token',
        '   Copy the "Access Token"',
        '   ⚠️ You\'ll only see it once when generated',
        '',
        '4️⃣ Store Securely',
        '   Paste it into the Access Token field above',
        '   You\'ll also need Access Token Secret',
        '',
        'Example:',
        'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
      ],
      example: 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
    },
    accessTokenSecret: {
      title: 'Twitter Access Token Secret – Step-by-Step',
      url: 'https://developer.twitter.com',
      steps: [
        '1️⃣ Go to Keys and Tokens',
        '   In your Twitter App settings',
        '   Navigate to "Keys and tokens" tab',
        '',
        '2️⃣ Find Access Token Section',
        '   In "Access Token and Secret" section',
        '   Find "Access Token Secret"',
        '',
        '3️⃣ Copy Access Token Secret',
        '   Click "Reveal" if hidden',
        '   Copy the Access Token Secret',
        '   ⚠️ You\'ll only see it once when generated',
        '',
        '4️⃣ Store Securely',
        '   Paste it into the Access Token Secret field above',
        '   Never share publicly',
        '',
        'Example:',
        'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
      ],
      example: 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
    },
    operation: {
      title: 'How to get Operation?',
      steps: [
        'You don’t get this from anywhere—you choose it from the dropdown in this node.',
        '',
        '• Create Tweet – Post a text tweet (requires Tweet Text).',
        '',
        '• Create Tweet with Media – Post with an image/video (requires Tweet Text + Media URL).',
        '',
        '• Delete Tweet / Like / Unlike / Retweet / Get Tweet by ID – Requires Tweet ID.',
        '',
        '• Search Tweets – Requires Search Query (optional Max Results).',
        '',
        '• Get User Timeline / Follow / Unfollow – Requires Username.',
        '',
        '• Get Mentions – Uses Max Results to control how many items.',
      ],
      example: 'Create Tweet'
    },
    text: {
      title: 'How to get Tweet Text?',
      steps: [
        'You type the tweet content or map it from a previous step.',
        '',
        '• Static: "Hello World from automation!"',
        '',
        '• Dynamic: Use data like "{{input.text}}".',
        '',
        'Required for Create Tweet and Create Tweet with Media.',
      ],
      example: 'Hello World from automation!'
    },
    tweetId: {
      title: 'Twitter Tweet ID – Step-by-Step',
      steps: [
        '1️⃣ Open the tweet in a browser',
        '',
        '2️⃣ Copy the number after /status/ in the URL',
        '',
        '3️⃣ Or use the ID returned when you create or list tweets',
        '',
        'Example:',
        '1234567890123456789'
      ],
      example: '1234567890123456789'
    },
    mediaUrl: {
      title: 'How to get Media URL?',
      steps: [
        'Upload the image or video to a public host (CDN, Cloudinary, Imgur, etc.).',
        '',
        'Copy the direct HTTPS URL to the file.',
        '',
        'The URL must be publicly accessible.',
        '',
        'Example:',
        'https://example.com/image.jpg'
      ],
      example: 'https://example.com/image.jpg'
    },
    query: {
      title: 'How to get Search Query?',
      steps: [
        'Write a Twitter search query using operators.',
        '',
        'Common examples:',
        '• "keyword" (exact match)',
        '• from:username',
        '• has:media',
        '• automation OR workflow',
        '',
        'Example:',
        'automation OR workflow'
      ],
      example: 'automation OR workflow'
    },
    username: {
      title: 'How to get Username?',
      steps: [
        'Open the Twitter profile in a browser.',
        '',
        'Copy the username from the URL (without the @).',
        '',
        'Example:',
        'twitter_username'
      ],
      example: 'twitter_username'
    },
    maxResults: {
      title: 'How to get Max Results?',
      steps: [
        'Enter how many results you want returned.',
        '',
        'Allowed range is 1–100.',
        '',
        'Used for Search Tweets, Get Mentions, and Get User Timeline.'
      ],
      example: '10'
    }
  },
  database_read: {
    table: {
      title: 'How to enter Table Name?',
      steps: [
        'Table Name is the database table you are reading from.',
        '',
        'Step 1: Check your database schema.',
        '• Use your DB tool (psql, MySQL client, pgAdmin, etc.) to list tables.',
        '• Copy the exact table name (respect case-sensitivity if your DB enforces it).',
        '',
        'Step 2: Enter the table name here.',
        '• Examples: users, orders, events, logs.',
        '• For schemas/namespaces, include schema prefix, e.g. public.users or analytics.daily_reports.',
        '',
        'Step 3: (Optional) Use template variables.',
        '• You can build dynamic table names like {{input.tableName}} if your workflow passes the name from a previous node.',
        '',
        'Tip: Avoid quoting the name here; the node will construct the SQL safely. Just provide the raw table name.'
      ],
      example: 'users'
    },
    columns: {
      title: 'How to set Columns?',
      steps: [
        'Columns controls which fields/columns are returned in the query.',
        '',
        'Option 1 – All columns:',
        '• Use * to select every column from the table.',
        '• Good for quick debugging or small tables.',
        '',
        'Option 2 – Specific columns (recommended):',
        '• Provide a comma-separated list of column names, e.g. id, email, created_at.',
        '• This reduces data size and improves performance.',
        '',
        'Examples:',
        '• *',
        '• id,name,email',
        '• id,order_id,amount,created_at',
        '',
        'Tip: Make sure column names exist on the table; invalid names will cause SQL errors.'
      ],
      example: 'id,name,email'
    },
    orderBy: {
      title: 'How to set Order By?',
      steps: [
        'Order By defines how the results should be sorted.',
        '',
        'Step 1: Choose a column to sort by.',
        '• Common choices: created_at, updated_at, id, name.',
        '• The column must exist in the selected table.',
        '',
        'Step 2: Enter the column name here (without ASC/DESC).',
        '• Example: created_at.',
        '',
        'Step 3: Control direction with the Ascending toggle (in the node properties).',
        '• Ascending = true → oldest to newest / A–Z / smallest to largest.',
        '• Ascending = false → newest to oldest / Z–A / largest to smallest.',
        '',
        'Tip: Leave Order By empty if you do not care about sort order or will sort later in another step.'
      ],
      example: 'created_at'
    }
  },
  database_write: {
    table: {
      title: 'How to enter Table Name?',
      steps: [
        'Table Name is the database table you are writing to.',
        '',
        'Step 1: Confirm the target table in your database.',
        '• Use your DB tool to list tables and verify the correct one (e.g. users, orders, events).',
        '',
        'Step 2: Enter the exact table name.',
        '• Examples: users, orders, audit_logs.',
        '• For schemas, include schema prefix (public.users, analytics.events).',
        '',
        'Step 3: Make sure the table has the columns referenced in your Data Template and Match Column.',
        '',
        'Tip: Use a staging/test table while building workflows, then switch to production table after validation.'
      ],
      example: 'orders'
    },
    operation: {
      title: 'How to choose Operation?',
      steps: [
        'Operation defines how this node modifies data in the table.',
        '',
        'Insert:',
        '• Adds new rows.',
        '• Requires Data Template with column/value pairs.',
        '',
        'Update:',
        '• Modifies existing rows.',
        '• Requires Match Column to identify which rows to update (e.g., id or email).',
        '• Data Template defines the columns to change.',
        '',
        'Upsert (insert or update):',
        '• If a row with the Match Column value exists → update it.',
        '• If not → insert a new row.',
        '• Useful for "sync" scenarios, deduplicating by unique key (email, external_id, etc.).',
        '',
        'Delete:',
        '• Deletes rows matching the Match Column (and value coming from input).',
        '• Use carefully—consider soft deletes or archiving first.',
        '',
        'Tip: Start with Insert while testing to avoid accidental data loss. Switch to Update/Upsert/Delete once your filters and keys are correct.'
      ],
      example: 'insert'
    },
    data: {
      title: 'How to design Data Template?',
      steps: [
        'Data Template describes the row values to write, using JSON with column names as keys.',
        '',
        'Step 1: List the columns you want to write.',
        '• Example columns: id, email, name, created_at, status.',
        '',
        'Step 2: Map values from input or constants.',
        '• Use static values: {"status": "active"}.',
        '• Use template variables: {"email": "{{input.email}}", "name": "{{input.name}}"}.',
        '',
        'Insert example:',
        '{"email": "{{input.email}}", "name": "{{input.name}}", "created_at": "{{now}}"}',
        '',
        'Update/Upsert example (excluding Match Column if DB fills it automatically):',
        '{"status": "active", "last_login_at": "{{input.login_time}}"}',
        '',
        'Tip:',
        '• Ensure JSON is valid (double quotes around keys and string values).',
        '• Only include columns you actually want to write or update.'
      ],
      example: '{"email": "{{input.email}}", "name": "{{input.name}}"}'
    },
    matchColumn: {
      title: 'How to set Match Column?',
      steps: [
        'Match Column is the column used to find which rows to Update, Upsert, or Delete.',
        '',
        'Common choices:',
        '• id – primary key for the table.',
        '• user_id – foreign key to a users table.',
        '• email or external_id – unique business identifier.',
        '',
        'How it works:',
        '• The value for this column usually comes from workflow input (e.g., {{input.id}} or {{input.email}}).',
        '• For Update/Upsert/Delete, the node builds a WHERE clause like "WHERE matchColumn = providedValue".',
        '',
        'Examples:',
        '• id',
        '• user_id',
        '• email',
        '',
        'Tip: Make sure the Match Column is indexed or unique for best performance and to avoid updating multiple rows unintentionally.'
      ],
      example: 'id'
    }
  },
  supabase: {
    apiKey: {
      title: 'Supabase API Key – Step-by-Step',
      url: 'https://app.supabase.com',
      steps: [
        '1️⃣ Open Supabase Dashboard',
        '   Go to 👉 https://app.supabase.com',
        '   Sign in or create an account',
        '',
        '2️⃣ Select Your Project',
        '   Click on your project',
        '   Or create a new project if needed',
        '',
        '3️⃣ Go to API Settings',
        '   Click "Settings" in left sidebar',
        '   Click "API" under Project Settings',
        '',
        '4️⃣ Copy API Key',
        '   You\'ll see two keys:',
        '   • "anon" key: For client-side (public)',
        '   • "service_role" key: For server-side (private)',
        '   Use "service_role" for workflows',
        '',
        '5️⃣ Store Securely',
        '   Paste it into the API Key field above',
        '   Never expose service_role key publicly',
        '',
        'Example:',
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlvdXJwcm9qZWN0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTY0NTc5ODAwMCwiZXhwIjoxOTYxMzc0MDAwfQ.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
      ],
      example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
    },
    projectUrl: {
      title: 'Supabase Project URL – Step-by-Step',
      steps: [
        '1️⃣ Open Supabase Dashboard',
        '   Go to 👉 https://app.supabase.com',
        '   Sign in and open your project',
        '',
        '2️⃣ Go to API Settings',
        '   Click "Settings" → "API"',
        '',
        '3️⃣ Copy Project URL',
        '   It looks like: https://YOUR-PROJECT.supabase.co',
        '',
        '4️⃣ Paste into the Project URL field above',
        '',
        'Example:',
        'https://xyzcompany.supabase.co'
      ],
      example: 'https://xyzcompany.supabase.co'
    },
    operation: {
      title: 'How to get Operation?',
      steps: [
        'You don’t get this from anywhere—you choose it from the dropdown in this node.',
        '',
        '• Select – Simple read from one table. You fill Table Name and optionally Filters, Limit, Order By, Ascending.',
        '',
        '• Raw SQL – You provide the full SQL Query (SELECT, INSERT, UPDATE, DELETE, or complex queries). Use for JOINs, subqueries, or write operations.',
        '',
        'Pick the one that matches what you need; the rest of the fields depend on this choice.'
      ],
      example: 'Select'
    },
    table: {
      title: 'Supabase Table Name – Step-by-Step',
      steps: [
        '1️⃣ Open Supabase Dashboard',
        '   Go to Database → Tables',
        '',
        '2️⃣ Copy the exact table name',
        '   e.g. users, orders, events',
        '',
        '3️⃣ Paste into the Table Name field above',
        '',
        'Used only for Select operation.',
        '',
        'Example:',
        'users'
      ],
      example: 'my_table'
    },
    query: {
      title: 'How to get SQL Query?',
      steps: [
        'You write it or get it from a developer.',
        '',
        '• Read: SELECT * FROM table_name WHERE column = \'value\' LIMIT 10;',
        '',
        '• Insert: INSERT INTO table_name (col1, col2) VALUES (\'a\', \'b\');',
        '',
        '• Update: UPDATE table_name SET col1 = \'value\' WHERE id = 1;',
        '',
        '• Delete: DELETE FROM table_name WHERE id = 1;',
        '',
        'For complex queries (JOINs, subqueries), write or paste the full SQL. Used only for Raw SQL.',
        'Be careful with INSERT/UPDATE/DELETE—they change data.'
      ],
      example: 'SELECT * FROM table WHERE id = 1'
    },
    filters: {
      title: 'How to get Filters (JSON)?',
      steps: [
        'You build the JSON from the columns and values you want to filter on.',
        '',
        '• Format: {"column_name": "value"}',
        '  Use exact column names from your table.',
        '',
        '• Multiple conditions: {"status": "active", "role": "user"}',
        '  Both must match (AND).',
        '',
        '• Numbers: {"id": 1} or {"count": 100}',
        '',
        'Used only for Select. For complex conditions (e.g. OR, greater than), use Raw SQL.',
        '',
        'Example:',
        '{"status": "active"}'
      ],
      example: '{"column": "value"}'
    },
    limit: {
      title: 'How to get Limit?',
      steps: [
        'You enter a number—how many rows you want at most.',
        '',
        '• Default is often 100.',
        '',
        '• Use a smaller value (e.g. 10 or 20) for previews or to avoid large result sets.',
        '',
        'Used for Select (and sometimes for Raw SQL if the platform applies it). Prevents accidentally returning too much data.',
        '',
        'Example:',
        '100'
      ],
      example: '100'
    },
    orderBy: {
      title: 'How to get Order By?',
      steps: [
        'You type a column name from your table (e.g. created_at, id, name).',
        '',
        '• Leave empty if you don’t care about order.',
        '',
        '• Used with Ascending to control sort direction.',
        '',
        'Used only for Select operation.',
        '',
        'Example:',
        'created_at'
      ],
      example: 'created_at'
    },
    ascending: {
      title: 'How to get Ascending?',
      steps: [
        'You set the toggle in this node: true or false.',
        '',
        '• true – Ascending (A-Z, oldest first).',
        '• false – Descending (Z-A, newest first).',
        '',
        'Only applies when Order By is set. Used only for Select operation.'
      ],
      example: 'true'
    }
  },
  mssql: {
    server: {
      title: 'SQL Server Connection – Step-by-Step',
      steps: [
        '1️⃣ For Azure SQL Database',
        '   Format: server.database.windows.net',
        '   Find it in Azure Portal → SQL Database → Overview',
        '   Example: myserver.database.windows.net',
        '',
        '2️⃣ For On-Premise SQL Server',
        '   Use server name or IP address',
        '   Example: localhost, 192.168.1.100, myserver',
        '',
        '3️⃣ Get Server Name',
        '   Check with your database administrator',
        '   Or find in connection strings documentation',
        '',
        '4️⃣ Include Port (if custom)',
        '   Default: 1433',
        '   Custom: server,1433 or server:1433',
        '',
        '5️⃣ Use the Server',
        '   Paste it into the Server field above',
        '   You\'ll also need Database, Username, Password',
        '',
        'Example (Azure):',
        'myserver.database.windows.net',
        '',
        'Example (On-Premise):',
        'localhost'
      ],
      example: 'myserver.database.windows.net'
    },
    username: {
      title: 'SQL Server Username – Step-by-Step',
      steps: [
        '1️⃣ For Azure SQL Database',
        '   Format: username@servername',
        '   Example: admin@myserver',
        '   Use the admin account or created user',
        '',
        '2️⃣ For SQL Server Authentication',
        '   Use the SQL login username',
        '   Example: sa, myuser, admin',
        '',
        '3️⃣ Get Username',
        '   Check with your database administrator',
        '   Or use the account created for this workflow',
        '',
        '4️⃣ Use the Username',
        '   Paste it into the Username field above',
        '   You\'ll also need Password',
        '',
        'Example (Azure):',
        'admin@myserver',
        '',
        'Example (SQL Auth):',
        'myuser'
      ],
      example: 'admin@myserver'
    },
    password: {
      title: 'SQL Server Password – Step-by-Step',
      steps: [
        '1️⃣ Get Password',
        '   Use the password for your SQL Server account',
        '   Check with your database administrator',
        '   Or use the password you set when creating the account',
        '',
        '2️⃣ For Azure SQL Database',
        '   Use password for username@servername account',
        '   Can reset in Azure Portal if needed',
        '',
        '3️⃣ Store Securely',
        '   Paste it into the Password field above',
        '   Never commit to version control',
        '   Use environment variables in production',
        '',
        '4️⃣ Test Connection',
        '   Verify the credentials work',
        '   Check firewall rules if connection fails',
        '',
        '⚠️ Security Note:',
        'Passwords are sensitive - store securely!'
      ],
      example: 'YourSecurePassword123!'
    }
  },
  facebook: {
    accessToken: {
      title: 'Facebook Page Access Token – Step-by-Step',
      url: 'https://developers.facebook.com',
      steps: [
        '1️⃣ Open Facebook Developers',
        '   Go to 👉 https://developers.facebook.com',
        '   Sign in with your Facebook account',
        '',
        '2️⃣ Create or Select App',
        '   Click "My Apps" → "Create App"',
        '   Or select an existing app',
        '   Choose "Business" as app type',
        '',
        '3️⃣ Add Facebook Login Product',
        '   In App Dashboard, click "+ Add Product"',
        '   Find "Facebook Login" and click "Set Up"',
        '',
        '4️⃣ Go to Graph API Explorer',
        '   Click "Tools" → "Graph API Explorer"',
        '   Or go to: developers.facebook.com/tools/explorer',
        '',
        '5️⃣ Select Your Page',
        '   In "User or Page" dropdown, select your Page',
        '   Not your personal profile - must be a Page',
        '',
        '6️⃣ Select Permissions',
        '   Click "Get Token" → "Get Page Access Token"',
        '   Select permissions:',
        '   • pages_manage_posts',
        '   • pages_read_engagement',
        '   • pages_show_list',
        '',
        '7️⃣ Generate and Copy Token',
        '   Click "Generate Access Token"',
        '   Copy the token immediately',
        '   ⚠️ Token expires - you may need to extend it',
        '',
        '8️⃣ Store Securely',
        '   Paste it into the Page Access Token field above',
        '   Never share publicly',
        '',
        'Example:',
        'EAAxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
      ],
      example: 'EAAxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
    },
    pageId: {
      title: 'Facebook Page ID – Step-by-Step',
      steps: [
        '1️⃣ Go to Your Facebook Page',
        '   Navigate to your Facebook Page',
        '   Make sure you\'re an admin',
        '',
        '2️⃣ Method 1: About Section',
        '   Click "About" in left sidebar',
        '   Scroll down to find "Page ID"',
        '   Copy the numeric ID',
        '',
        '3️⃣ Method 2: Page Source',
        '   Right-click on page → "View Page Source"',
        '   Press Ctrl+F (or Cmd+F)',
        '   Search for "page_id"',
        '   Copy the numeric value',
        '',
        '4️⃣ Method 3: Graph API',
        '   Go to Graph API Explorer',
        '   Query: GET /me/accounts',
        '   Find your page in the response',
        '   Copy the "id" field',
        '',
        '5️⃣ Use the Page ID',
        '   Paste it into the Page ID field above',
        '   It\'s a long numeric string',
        '',
        'Example:',
        '123456789012345'
      ],
      example: '123456789012345'
    },
    operation: {
      title: 'How to get Operation?',
      steps: [
        'You don’t get this from anywhere—you choose it from the dropdown in this node.',
        '',
        '• Create Page Post (Text/Image/Link/Video) – Create a post. Requires Page ID and Message (plus URL for image/link/video).',
        '',
        '• Get Page Posts – List posts from the Page. Requires Page ID and optional Limit.',
        '',
        '• Delete Page Post – Delete a post. Requires Post ID.',
        '',
        '• Create Comment / Reply to Comment – Add a comment. Requires Comment Text and Comment ID for replies.',
        '',
        '• Get Page Insights – Retrieve metrics like reach or impressions. Requires Insight Metric.',
      ],
      example: 'Create Page Post (Text)'
    },
    message: {
      title: 'How to get Post Message?',
      steps: [
        'You type or provide the post content.',
        '',
        '• Static: Type it directly (e.g. "New product launched!").',
        '',
        '• Dynamic: Use data from earlier steps, e.g. "{{input.message}}".',
        '',
        'Required for create_post operations.'
      ],
      example: 'Your post content'
    },
    imageUrl: {
      title: 'How to get Image URL?',
      steps: [
        'Upload the image to a public host (e.g. Cloudinary, CDN, Imgur).',
        '',
        'Copy the direct HTTPS URL to the image file.',
        '',
        'The URL must be publicly accessible.',
        '',
        'Example:',
        'https://example.com/image.jpg'
      ],
      example: 'https://example.com/image.jpg'
    },
    linkUrl: {
      title: 'How to get Link URL?',
      steps: [
        'Use the URL you want to share in the post.',
        '',
        'Must be a valid HTTP/HTTPS link.',
        '',
        'Example:',
        'https://example.com/article'
      ],
      example: 'https://example.com/article'
    },
    videoUrl: {
      title: 'How to get Video URL?',
      steps: [
        'Upload the video to a public host.',
        '',
        'Copy the direct HTTPS URL to the video file.',
        '',
        'The URL must be publicly accessible.',
        '',
        'Example:',
        'https://example.com/video.mp4'
      ],
      example: 'https://example.com/video.mp4'
    },
    postId: {
      title: 'Facebook Post ID – Step-by-Step',
      steps: [
        '1️⃣ Open the post on your Facebook Page',
        '',
        '2️⃣ Click on the post → Copy link',
        '',
        '3️⃣ The Post ID is in the URL (often PAGE_ID_POST_ID)',
        '',
        '4️⃣ Or use the ID returned by the API when creating the post',
        '',
        'Example:',
        '123456789012345_987654321098765'
      ],
      example: '123456789012345_987654321098765'
    },
    commentText: {
      title: 'How to get Comment Text?',
      steps: [
        'You type or provide the comment text.',
        '',
        '• Static: Type it directly.',
        '',
        '• Dynamic: Use data from earlier steps, e.g. "{{input.comment}}".',
        '',
        'Required for Create Comment and Reply to Comment.'
      ],
      example: 'Your comment'
    },
    commentId: {
      title: 'Facebook Comment ID – Step-by-Step',
      steps: [
        '1️⃣ Go to the post → View comments',
        '',
        '2️⃣ Click on a comment → Copy link',
        '',
        '3️⃣ The Comment ID appears in the URL',
        '',
        '4️⃣ Or use the ID returned by the API when listing comments',
        '',
        'Example:',
        '123456789012345'
      ],
      example: '123456789012345'
    },
    metric: {
      title: 'How to get Insight Metric?',
      steps: [
        'Choose a metric from the dropdown.',
        '',
        'Options include: page_impressions, page_reach, page_engaged_users, post_engagements.',
        '',
        'Used only for Get Page Insights.'
      ],
      example: 'page_reach'
    },
    limit: {
      title: 'How to get Limit?',
      steps: [
        'Enter how many posts to return.',
        '',
        'Default is often 25 (max 100).',
        '',
        'Used for Get Page Posts.'
      ],
      example: '25'
    }
  },
  instagram: {
    accessToken: {
      title: 'Instagram Access Token – Step-by-Step',
      url: 'https://developers.facebook.com',
      steps: [
        '1️⃣ Open Facebook Developers',
        '   Go to 👉 https://developers.facebook.com',
        '   Sign in with your Facebook account',
        '',
        '2️⃣ Create or Select App',
        '   Click "My Apps" → "Create App"',
        '   Or select an existing app',
        '   Choose "Business" as app type',
        '',
        '3️⃣ Add Instagram Graph API',
        '   In App Dashboard, click "+ Add Product"',
        '   Find "Instagram Graph API" and click "Set Up"',
        '',
        '4️⃣ Connect Instagram Business Account',
        '   Go to "Basic" settings',
        '   Connect your Instagram Business Account',
        '   Must be a Business or Creator account',
        '',
        '5️⃣ Go to Graph API Explorer',
        '   Click "Tools" → "Graph API Explorer"',
        '   Or go to: developers.facebook.com/tools/explorer',
        '',
        '6️⃣ Select Instagram Business Account',
        '   In "User or Page" dropdown',
        '   Select your Instagram Business Account',
        '',
        '7️⃣ Select Permissions',
        '   Click "Get Token" → "Get User Access Token"',
        '   Select permissions:',
        '   • instagram_basic',
        '   • instagram_content_publish',
        '   • pages_show_list',
        '',
        '8️⃣ Generate and Copy Token',
        '   Click "Generate Access Token"',
        '   Copy the token immediately',
        '   ⚠️ Token expires - extend it in App settings',
        '',
        '9️⃣ Store Securely',
        '   Paste it into the Access Token field above',
        '   Never share publicly',
        '',
        'Example:',
        'IGQWxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
      ],
      example: 'IGQWxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
    },
    accountId: {
      title: 'Instagram Business Account ID – Step-by-Step',
      url: 'https://developers.facebook.com/tools/explorer',
      steps: [
        '1️⃣ Go to Graph API Explorer',
        '   Go to 👉 https://developers.facebook.com/tools/explorer',
        '   Make sure you have an access token',
        '',
        '2️⃣ Get Your Facebook Page ID',
        '   Query: GET /me/accounts',
        '   Find your connected Facebook Page',
        '   Copy the "id" (this is your Page ID)',
        '',
        '3️⃣ Get Instagram Business Account',
        '   Query: GET /{page-id}?fields=instagram_business_account',
        '   Replace {page-id} with your Page ID from step 2',
        '',
        '4️⃣ Copy Instagram Account ID',
        '   In the response, find:',
        '   "instagram_business_account": {',
        '     "id": "17841405309211844"',
        '   }',
        '   Copy the "id" value',
        '',
        '5️⃣ Use the Account ID',
        '   Paste it into the Account ID field above',
        '   It\'s a long numeric string',
        '',
        'Example:',
        '17841405309211844'
      ],
      example: '17841405309211844'
    }
  },
  linkedin: {
    accessToken: {
      title: 'LinkedIn Access Token – Step-by-Step',
      url: 'https://www.linkedin.com/developers',
      steps: [
        '1️⃣ Open LinkedIn Developers',
        '   Go to 👉 https://www.linkedin.com/developers',
        '   Sign in with your LinkedIn account',
        '',
        '2️⃣ Create or Select App',
        '   Click "Create app" or select existing',
        '   Fill in app details',
        '   Accept terms and create',
        '',
        '3️⃣ Get Client ID and Secret',
        '   Go to "Auth" tab',
        '   Copy "Client ID" and "Client Secret"',
        '   You\'ll need these for OAuth',
        '',
        '4️⃣ Set Redirect URL',
        '   In "Auth" tab, add redirect URL',
        '   Example: https://your-domain.com/callback',
        '   Or use: http://localhost:3000/callback for testing',
        '',
        '5️⃣ Request Permissions',
        '   Request these permissions:',
        '   • w_member_social (for posting)',
        '   • r_liteprofile (for profile access)',
        '   • r_basicprofile (for basic info)',
        '',
        '6️⃣ Generate Access Token',
        '   Use OAuth 2.0 flow',
        '   Or use LinkedIn OAuth Playground:',
        '   developers.linkedin.com/oauthplayground',
        '',
        '7️⃣ Copy Access Token',
        '   After OAuth flow completes',
        '   Copy the access token',
        '   ⚠️ Token expires - refresh when needed',
        '',
        '8️⃣ Store Securely',
        '   Paste it into the Access Token field above',
        '   Never share publicly',
        '',
        'Example:',
        'AQVxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
      ],
      example: 'AQVxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
    },
    organizationId: {
      title: 'LinkedIn Organization ID (URN) – Step-by-Step',
      steps: [
        '1️⃣ Go to Your Company Page',
        '   Navigate to your LinkedIn Company Page',
        '   Make sure you\'re an admin',
        '',
        '2️⃣ Method 1: View Page Source',
        '   Right-click on page → "View Page Source"',
        '   Press Ctrl+F (or Cmd+F)',
        '   Search for "organization"',
        '   Find URN like "urn:li:organization:123456"',
        '   Copy the full URN',
        '',
        '3️⃣ Method 2: Use Graph API',
        '   Go to Graph API Explorer',
        '   Query: GET /organizationAcls',
        '   Response will show organization URNs',
        '   Format: urn:li:organization:123456',
        '',
        '4️⃣ Method 3: From Page URL',
        '   Some pages show ID in URL',
        '   Check the page URL structure',
        '',
        '5️⃣ Use the Organization ID',
        '   Paste the full URN into the field above',
        '   Format: urn:li:organization:123456',
        '   Include the "urn:li:organization:" prefix',
        '',
        'Example:',
        'urn:li:organization:123456'
      ],
      example: 'urn:li:organization:123456'
    }
  },
  twilio: {
    accountSid: {
      title: 'Twilio Account SID – Step-by-Step',
      url: 'https://console.twilio.com',
      steps: [
        '1️⃣ Open Twilio Console',
        '   Go to 👉 https://console.twilio.com',
        '   Sign in or create an account',
        '',
        '2️⃣ View Dashboard',
        '   After signing in, you\'ll see the dashboard',
        '   Your Account SID is displayed prominently',
        '',
        '3️⃣ Copy Account SID',
        '   Find "Account SID" on the dashboard',
        '   It starts with "AC"',
        '   Click to copy or select and copy',
        '',
        '4️⃣ Use the Account SID',
        '   Paste it into the Account SID field above',
        '   You\'ll also need Auth Token',
        '',
        'Example:',
        'ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
      ],
      example: 'ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
    },
    authToken: {
      title: 'Twilio Auth Token – Step-by-Step',
      url: 'https://console.twilio.com',
      steps: [
        '1️⃣ Open Twilio Console',
        '   Go to 👉 https://console.twilio.com',
        '   Sign in to your account',
        '',
        '2️⃣ View Dashboard',
        '   Your Auth Token is shown on dashboard',
        '   It may be hidden - click "show" to reveal',
        '',
        '3️⃣ Copy Auth Token',
        '   ⚠️ IMPORTANT: Copy immediately!',
        '   You won\'t be able to see it again',
        '   If lost, you\'ll need to regenerate',
        '',
        '4️⃣ Regenerate if Needed',
        '   If you lost the token:',
        '   Go to Settings → Auth Tokens',
        '   Click "Create" to generate new token',
        '   Old token will be invalidated',
        '',
        '5️⃣ Store Securely',
        '   Paste it into the Auth Token field above',
        '   Never commit to version control',
        '   Use environment variables in production',
        '',
        'Example:',
        'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
      ],
      example: 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
    },
    from: {
      title: 'Twilio Phone Number – Step-by-Step',
      url: 'https://console.twilio.com',
      steps: [
        '1️⃣ Open Twilio Console',
        '   Go to 👉 https://console.twilio.com',
        '   Sign in to your account',
        '',
        '2️⃣ Go to Phone Numbers',
        '   Click "Phone Numbers" in left sidebar',
        '   Or go to: console.twilio.com/us1/develop/phone-numbers/manage/incoming',
        '',
        '3️⃣ View Your Numbers',
        '   You\'ll see your purchased phone numbers',
        '   If you don\'t have one, click "Buy a number"',
        '',
        '4️⃣ Copy Phone Number',
        '   Copy the phone number',
        '   Format: +1234567890 (with country code)',
        '   Include the + sign',
        '',
        '5️⃣ Use the Number',
        '   Paste it into the From Number field above',
        '   Must be in E.164 format',
        '   Example: +1234567890',
        '',
        'Example:',
        '+1234567890'
      ],
      example: '+1234567890'
    }
  },
  stripe: {
    apiKey: {
      title: 'Stripe API Key – Step-by-Step',
      url: 'https://dashboard.stripe.com',
      steps: [
        '1️⃣ Open Stripe Dashboard',
        '   Go to 👉 https://dashboard.stripe.com',
        '   Sign in or create an account',
        '',
        '2️⃣ Navigate to API Keys',
        '   Click "Developers" in top menu',
        '   Click "API keys" in left sidebar',
        '   Or go to: dashboard.stripe.com/apikeys',
        '',
        '3️⃣ Choose Test or Live Mode',
        '   Toggle "Test mode" or "Live mode"',
        '   Test keys start with "sk_test_"',
        '   Live keys start with "sk_live_"',
        '',
        '4️⃣ Copy Secret Key',
        '   Find "Secret key" section',
        '   Click "Reveal test key" or "Reveal live key"',
        '   Copy the secret key',
        '   ⚠️ Never share the secret key publicly',
        '',
        '5️⃣ For Publishable Key',
        '   "Publishable key" is for client-side',
        '   Starts with "pk_test_" or "pk_live_"',
        '   Use secret key for server-side workflows',
        '',
        '6️⃣ Store Securely',
        '   Paste it into the API Key field above',
        '   Never commit to version control',
        '   Use environment variables in production',
        '',
        'Example (Test):',
        '[YOUR_STRIPE_TEST_KEY] - Format: sk_test_...',
        '',
        'Example (Live):',
        '[YOUR_STRIPE_LIVE_KEY] - Format: sk_live_...'
      ],
      example: '[YOUR_STRIPE_TEST_KEY]'
    }
  },
  postgresql: {
    host: {
      title: 'PostgreSQL Host – Step-by-Step',
      steps: [
        '1️⃣ For Local PostgreSQL',
        '   If running locally:',
        '   • Host: localhost or 127.0.0.1',
        '   • Port: 5432 (default)',
        '',
        '2️⃣ For Cloud PostgreSQL',
        '   For AWS RDS:',
        '   • Format: your-db.region.rds.amazonaws.com',
        '   • Find in RDS Console → Connectivity',
        '',
        '3️⃣ For Heroku Postgres',
        '   Go to Heroku Dashboard',
        '   Click on your Postgres add-on',
        '   Find "Host" in connection settings',
        '',
        '4️⃣ For Other Providers',
        '   Check your provider\'s documentation',
        '   Usually in connection string or settings',
        '   Format: hostname or IP address',
        '',
        '5️⃣ Use the Host',
        '   Paste it into the Host field above',
        '   Don\'t include port number here',
        '',
        'Examples:',
        'localhost',
        'db.example.com',
        'my-db.region.rds.amazonaws.com'
      ],
      example: 'localhost'
    },
    database: {
      title: 'PostgreSQL Database Name – Step-by-Step',
      steps: [
        '1️⃣ For New Database',
        '   Connect to PostgreSQL',
        '   Run: CREATE DATABASE mydb;',
        '   Use the name you created',
        '',
        '2️⃣ For Existing Database',
        '   Check with your database administrator',
        '   Or list databases: \\l in psql',
        '',
        '3️⃣ Common Defaults',
        '   Default database: postgres',
        '   Or check your application config',
        '',
        '4️⃣ Use the Database Name',
        '   Paste it into the Database field above',
        '   Must be exact name (case-sensitive)',
        '',
        'Examples:',
        'mydb',
        'production',
        'app_database'
      ],
      example: 'mydb'
    },
    username: {
      title: 'PostgreSQL Username – Step-by-Step',
      steps: [
        '1️⃣ Default Superuser',
        '   Common default: postgres',
        '   Or the user you created',
        '',
        '2️⃣ Create New User',
        '   Connect as superuser',
        '   Run: CREATE USER myuser WITH PASSWORD \'mypassword\';',
        '',
        '3️⃣ Grant Permissions',
        '   Run: GRANT ALL PRIVILEGES ON DATABASE mydb TO myuser;',
        '',
        '4️⃣ Get Username',
        '   Check with your database administrator',
        '   Or check application configuration',
        '',
        '5️⃣ Use the Username',
        '   Paste it into the Username field above',
        '   You\'ll also need Password',
        '',
        'Examples:',
        'postgres',
        'myuser',
        'app_user'
      ],
      example: 'postgres'
    },
    password: {
      title: 'PostgreSQL Password – Step-by-Step',
      steps: [
        '1️⃣ Get Password',
        '   Use the password for your PostgreSQL user',
        '   Check with your database administrator',
        '   Or use the password you set when creating user',
        '',
        '2️⃣ Reset Password',
        '   If you forgot:',
        '   Connect as superuser',
        '   Run: ALTER USER username WITH PASSWORD \'newpassword\';',
        '',
        '3️⃣ Store Securely',
        '   Paste it into the Password field above',
        '   Never commit to version control',
        '   Use environment variables in production',
        '',
        '4️⃣ Test Connection',
        '   Verify credentials work',
        '   Check firewall rules if connection fails',
        '',
        '⚠️ Security Note:',
        'Passwords are sensitive - store securely!'
      ],
      example: 'YourSecurePassword123!'
    },
    port: {
      title: 'PostgreSQL Port – Step-by-Step',
      steps: [
        '• Default: Use 5432. It is correct in most cases.',
        '',
        '• If connection fails: Check your hosting dashboard or ask your provider for the correct port.',
        '',
        '• Enter only the number (e.g. 5432). Do not use MySQL port (3306) or other ports by mistake.',
        '',
        'Example:',
        '5432'
      ],
      example: '5432'
    },
    operation: {
      title: 'How to get Operation?',
      steps: [
        'You don’t get this from anywhere—you choose it from the dropdown in this node.',
        '',
        '• Select – Simple read from one table. You fill Table Name and optionally Filters, Limit, Order By, Ascending. Use when you only need to read rows from a single table with simple conditions.',
        '',
        '• Raw SQL – You provide the full SQL Query (SELECT, INSERT, UPDATE, DELETE, or complex queries). Use for JOINs, subqueries, or write operations.',
        '',
        'Pick the one that matches what you need; the rest of the fields depend on this choice.'
      ],
      example: 'Select'
    },
    table: {
      title: 'PostgreSQL Table Name – Step-by-Step',
      steps: [
        '1️⃣ Open your database admin tool',
        '   (e.g. pgAdmin, DBeaver, or your hosting SQL editor)',
        '',
        '2️⃣ View the tables in your database',
        '   Copy the exact table name',
        '   e.g. users, orders, events',
        '',
        '3️⃣ Paste into the Table Name field above',
        '   Names are case-sensitive in PostgreSQL',
        '',
        'Used only for Select operation. Ignored for Raw SQL.',
        '',
        'Example:',
        'users'
      ],
      example: 'my_table'
    },
    query: {
      title: 'How to get SQL Query?',
      steps: [
        'You write it or get it from a developer.',
        '',
        '• Read: SELECT * FROM table_name WHERE column = \'value\' LIMIT 10;',
        '',
        '• Insert: INSERT INTO table_name (col1, col2) VALUES (\'a\', \'b\');',
        '',
        '• Update: UPDATE table_name SET col1 = \'value\' WHERE id = 1;',
        '',
        '• Delete: DELETE FROM table_name WHERE id = 1;',
        '',
        'For complex queries (JOINs, subqueries), write or paste the full SQL. Used only for Raw SQL. Be careful with INSERT/UPDATE/DELETE—they change data.'
      ],
      example: 'SELECT * FROM table WHERE id = 1'
    },
    filters: {
      title: 'How to get Filters (JSON)?',
      steps: [
        'You build the JSON from the columns and values you want to filter on.',
        '',
        '• Format: {"column_name": "value"}',
        '  Use exact column names from your table.',
        '',
        '• Multiple conditions: {"status": "active", "role": "user"}',
        '  Both must match (AND).',
        '',
        '• Numbers: {"id": 1} or {"count": 100}',
        '',
        'Used only for Select. For complex conditions (e.g. OR, greater than), use Raw SQL.',
        '',
        'Example:',
        '{"status": "active"}'
      ],
      example: '{"column": "value"}'
    },
    limit: {
      title: 'How to get Limit?',
      steps: [
        'You enter a number—how many rows you want at most.',
        '',
        '• Default is often 100.',
        '',
        '• Use a smaller value (e.g. 10 or 20) for previews or to avoid large result sets.',
        '',
        'Used for Select (and sometimes for Raw SQL if the platform applies it). Prevents accidentally returning too much data.',
        '',
        'Example:',
        '100'
      ],
      example: '100'
    },
    orderBy: {
      title: 'How to get Order By?',
      steps: [
        'You type a column name from your table (e.g. created_at, id, name).',
        '',
        '• Leave empty if you don’t care about order.',
        '',
        '• Used with Ascending to control sort direction.',
        '',
        'Used only for Select operation.',
        '',
        'Example:',
        'created_at'
      ],
      example: 'created_at'
    },
    ascending: {
      title: 'How to get Ascending?',
      steps: [
        'You set the toggle in this node: true or false.',
        '',
        '• true – Ascending (e.g. oldest first for dates, A–Z for text).',
        '',
        '• false – Descending (e.g. newest first, Z–A).',
        '',
        'Only applies when Order By is set. Used only for Select operation.'
      ],
      example: 'true'
    }
  },
  mysql: {
    host: {
      title: 'MySQL Host – Step-by-Step',
      steps: [
        '1️⃣ For Local MySQL',
        '   If running locally:',
        '   • Host: localhost or 127.0.0.1',
        '   • Port: 3306 (default)',
        '',
        '2️⃣ For Cloud MySQL',
        '   For AWS RDS:',
        '   • Format: your-db.region.rds.amazonaws.com',
        '   • Find in RDS Console → Connectivity',
        '',
        '3️⃣ For Other Providers',
        '   Check your provider\'s documentation',
        '   Usually in connection string or settings',
        '',
        '4️⃣ Use the Host',
        '   Paste it into the Host field above',
        '',
        'Examples:',
        'localhost',
        'db.example.com',
        'my-db.region.rds.amazonaws.com'
      ],
      example: 'localhost'
    },
    database: {
      title: 'MySQL Database Name – Step-by-Step',
      steps: [
        '1️⃣ For New Database',
        '   Connect to MySQL',
        '   Run: CREATE DATABASE mydb;',
        '',
        '2️⃣ For Existing Database',
        '   Check with your database administrator',
        '   Or list databases: SHOW DATABASES;',
        '',
        '3️⃣ Use the Database Name',
        '   Paste it into the Database field above',
        '',
        'Examples:',
        'mydb',
        'production',
        'app_database'
      ],
      example: 'mydb'
    },
    username: {
      title: 'MySQL Username – Step-by-Step',
      steps: [
        '1️⃣ Default Root User',
        '   Common default: root',
        '   Or the user you created',
        '',
        '2️⃣ Create New User',
        '   Connect as root',
        '   Run: CREATE USER \'myuser\'@\'%\' IDENTIFIED BY \'mypassword\';',
        '   Run: GRANT ALL ON mydb.* TO \'myuser\'@\'%\';',
        '',
        '3️⃣ Use the Username',
        '   Paste it into the Username field above',
        '',
        'Examples:',
        'root',
        'myuser',
        'app_user'
      ],
      example: 'root'
    },
    password: {
      title: 'MySQL Password – Step-by-Step',
      steps: [
        '1️⃣ Get Password',
        '   Use the password for your MySQL user',
        '   Check with your database administrator',
        '',
        '2️⃣ Store Securely',
        '   Paste it into the Password field above',
        '   Never commit to version control',
        '',
        '⚠️ Security Note:',
        'Passwords are sensitive - store securely!'
      ],
      example: 'YourSecurePassword123!'
    },
    port: {
      title: 'MySQL Port – Step-by-Step',
      steps: [
        '• Default: Use 3306. It is correct in most cases.',
        '',
        '• If connection fails: Check your hosting dashboard or ask your provider for the correct port.',
        '',
        '• Enter only the number (e.g. 3306). Do not use PostgreSQL port (5432) or other ports by mistake.',
        '',
        'Example:',
        '3306'
      ],
      example: '3306'
    },
    operation: {
      title: 'How to get Operation?',
      steps: [
        'You don’t get this from anywhere—you choose it from the dropdown in this node.',
        '',
        '• Select – Simple read from one table. You fill Table Name and optionally Filters and Limit.',
        '',
        'This MySQL node currently supports Select only. For Insert/Update/Delete or custom SQL, use a Raw SQL-capable node.',
      ],
      example: 'Select'
    },
    table: {
      title: 'MySQL Table Name – Step-by-Step',
      steps: [
        '1️⃣ Open your database admin tool',
        '   (e.g. phpMyAdmin, MySQL Workbench, or your hosting SQL editor)',
        '',
        '2️⃣ View the tables in your database',
        '   Copy the exact table name',
        '   e.g. users, orders, events',
        '',
        '3️⃣ Paste into the Table Name field above',
        '',
        'Used only for Select operation.',
        '',
        'Example:',
        'customers'
      ],
      example: 'my_table'
    },
    filters: {
      title: 'How to get Filters (JSON)?',
      steps: [
        'You build the JSON from the columns and values you want to filter on.',
        '',
        '• Format: {"column_name": "value"}',
        '  Use exact column names from your table.',
        '',
        '• Multiple conditions: {"status": "active", "role": "user"}',
        '  Both must match (AND).',
        '',
        '• Numbers: {"id": 1} or {"count": 100}',
        '',
        'Used only for Select. For complex conditions (e.g. OR, greater than), use a Raw SQL-capable node.',
        '',
        'Example:',
        '{"status": "active"}'
      ],
      example: '{"column": "value"}'
    },
    limit: {
      title: 'How to get Limit?',
      steps: [
        'You enter a number—how many rows you want at most.',
        '',
        '• Default is often 100.',
        '',
        '• Use a smaller value (e.g. 10 or 20) for previews or to avoid large result sets.',
        '',
        'Used for Select operation. Prevents accidentally returning too much data.',
        '',
        'Example:',
        '100'
      ],
      example: '100'
    }
  },
  mongodb: {
    connectionString: {
      title: 'MongoDB Connection String – Step-by-Step',
      steps: [
        '1️⃣ For MongoDB Atlas (Cloud)',
        '   Go to 👉 https://cloud.mongodb.com',
        '   Sign in to your account',
        '   Click "Connect" on your cluster',
        '   Choose "Connect your application"',
        '   Copy the connection string',
        '',
        '2️⃣ For Local MongoDB',
        '   Format: mongodb://localhost:27017/mydb',
        '   Or: mongodb://username:password@localhost:27017/mydb',
        '',
        '3️⃣ Connection String Format',
        '   mongodb://[username:password@]host[:port][/database]',
        '   Include username/password if authentication required',
        '',
        '4️⃣ Use the Connection String',
        '   Paste it into the Connection String field above',
        '   Replace <password> with actual password',
        '',
        '5️⃣ Test Connection',
        '   Verify the connection string works',
        '   Check firewall rules if connection fails',
        '',
        'Example (Atlas):',
        'mongodb+srv://username:password@cluster.mongodb.net/mydb',
        '',
        'Example (Local):',
        'mongodb://localhost:27017/mydb'
      ],
      example: 'mongodb+srv://username:password@cluster.mongodb.net/mydb'
    },
    operation: {
      title: 'How to get Operation?',
      steps: [
        'You don’t get this from anywhere—you choose it from the dropdown in this node.',
        '',
        '• Find Documents – Query documents from a collection using filters.',
        '',
        'This MongoDB node supports Find only. For insert/update/delete/aggregate, use a write-capable or raw-query MongoDB node if available.',
      ],
      example: 'Find'
    },
    collection: {
      title: 'MongoDB Collection Name – Step-by-Step',
      steps: [
        '1️⃣ Open your database dashboard or MongoDB Compass',
        '',
        '2️⃣ Browse the database and view Collections',
        '   Copy the exact collection name',
        '   e.g. users, orders, events',
        '',
        '3️⃣ Paste into the Collection Name field above',
        '',
        'Example:',
        'users'
      ],
      example: 'my_collection'
    },
    query: {
      title: 'How to get Query (JSON)?',
      steps: [
        'You build the JSON filter to match the documents you want.',
        '',
        '• Exact match: {"status": "Active"}',
        '',
        '• Greater than: {"age": {"$gt": 18}}',
        '',
        '• Regex: {"name": {"$regex": "^John"}}',
        '',
        'Paste the JSON into the Query field.',
        '',
        'Example:',
        '{"status": "Active"}'
      ],
      example: '{"field": "value"}'
    },
    limit: {
      title: 'How to get Limit?',
      steps: [
        'You enter a number—how many documents you want at most.',
        '',
        '• Default is often 100.',
        '',
        '• Use a smaller value (e.g. 10 or 20) for previews or large collections.',
        '',
        'Used for Find operation.',
        '',
        'Example:',
        '100'
      ],
      example: '100'
    }
  },
  redis: {
    host: {
      title: 'Redis Host – Step-by-Step',
      steps: [
        '1️⃣ For Local Redis',
        '   If running locally:',
        '   • Host: localhost or 127.0.0.1',
        '   • Port: 6379 (default)',
        '',
        '2️⃣ For Redis Cloud',
        '   Go to Redis Cloud dashboard',
        '   Find your database endpoint',
        '   Format: hostname:port',
        '',
        '3️⃣ For AWS ElastiCache',
        '   Go to ElastiCache Console',
        '   Find your Redis cluster endpoint',
        '   Copy the hostname',
        '',
        '4️⃣ Use the Host',
        '   Paste it into the Host field above',
        '',
        'Examples:',
        'localhost',
        'redis.example.com',
        'my-redis.abc123.cache.amazonaws.com'
      ],
      example: 'localhost'
    },
    password: {
      title: 'Redis Password – Step-by-Step',
      steps: [
        '1️⃣ For Redis with Auth',
        '   If Redis requires authentication',
        '   Get password from Redis config',
        '   Or from your Redis provider',
        '',
        '2️⃣ For Redis Cloud',
        '   Password is shown in dashboard',
        '   Or set when creating database',
        '',
        '3️⃣ For Local Redis',
        '   Check redis.conf file',
        '   Look for: requirepass yourpassword',
        '',
        '4️⃣ Store Securely',
        '   Paste it into the Password field above',
        '   Leave empty if no authentication',
        '',
        '⚠️ Security Note:',
        'Passwords are sensitive - store securely!'
      ],
      example: 'YourRedisPassword123!'
    }
  },
  telegram: {
    botToken: {
      title: 'Telegram Bot Token – Step-by-Step',
      url: 'https://t.me/BotFather',
      steps: [
        '1️⃣ Open Telegram',
        '   Open Telegram app or web.telegram.org',
        '   Make sure you\'re logged in',
        '',
        '2️⃣ Find BotFather',
        '   Search for @BotFather in Telegram',
        '   Or go to: t.me/BotFather',
        '',
        '3️⃣ Start Chat with BotFather',
        '   Click "Start" or send /start',
        '   BotFather will show available commands',
        '',
        '4️⃣ Create New Bot',
        '   Send: /newbot',
        '   BotFather will ask for bot name',
        '   Enter a name (e.g., "My Workflow Bot")',
        '',
        '5️⃣ Set Bot Username',
        '   BotFather will ask for username',
        '   Must end with "bot" (e.g., "myworkflow_bot")',
        '   Must be unique',
        '',
        '6️⃣ Copy Bot Token',
        '   BotFather will send you a token',
        '   Format: 123456789:ABCdefGHIjklMNOpqrsTUVwxyz',
        '   ⚠️ Keep this token secret!',
        '',
        '7️⃣ Store Securely',
        '   Paste it into the Bot Token field above',
        '   Never share publicly',
        '',
        'Example:',
        '123456789:ABCdefGHIjklMNOpqrsTUVwxyz'
      ],
      example: '123456789:ABCdefGHIjklMNOpqrsTUVwxyz'
    },
    chatId: {
      title: 'Telegram Chat ID – Step-by-Step',
      steps: [
        '1️⃣ For Personal Chat',
        '   Start a chat with your bot',
        '   Send any message to your bot',
        '   Use @userinfobot to get your chat ID',
        '',
        '2️⃣ For Group Chat',
        '   Add your bot to the group',
        '   Send a message in the group',
        '   Use @userinfobot or @getidsbot',
        '',
        '3️⃣ Method: Use @userinfobot',
        '   Search for @userinfobot in Telegram',
        '   Start chat and send /start',
        '   It will show your chat ID',
        '',
        '4️⃣ Method: Use @getidsbot',
        '   Add @getidsbot to your group',
        '   It will show the group chat ID',
        '',
        '5️⃣ Method: Use Bot API',
        '   Send message to your bot',
        '   Call: https://api.telegram.org/bot<TOKEN>/getUpdates',
        '   Find "chat":{"id":123456789} in response',
        '',
        '6️⃣ Use the Chat ID',
        '   Copy the numeric ID',
        '   Paste it into the Chat ID field above',
        '',
        'Example:',
        '123456789'
      ],
      example: '123456789'
    }
  },
  notion: {
    apiKey: {
      title: 'Notion API Key (Internal Integration Token) – Step-by-Step',
      url: 'https://www.notion.so/my-integrations',
      steps: [
        '1️⃣ Open Notion Integrations',
        '   Go to 👉 https://www.notion.so/my-integrations',
        '   Sign in with your Notion account.',
        '',
        '2️⃣ Create a New Integration',
        '   Click "+ New integration".',
        '   Give it a clear name (e.g., "CtrlChecks Workflow Integration").',
        '   Select the correct workspace.',
        '',
        '3️⃣ Configure Capabilities',
        '   Enable the capabilities you need (typically "Read content" and "Update content").',
        '   Save the integration.',
        '',
        '4️⃣ Copy the Internal Integration Token',
        '   After creating the integration, Notion shows an "Internal Integration Token".',
        '   It starts with "secret_".',
        '   Click "Copy" and store it somewhere safe.',
        '   ⚠️ You can only see this token once—if you lose it, you must generate a new one.',
        '',
        '5️⃣ Share Pages/Databases With the Integration',
        '   For every page or database you want to access:',
        '   • Open the page or database in Notion.',
        '   • Click "Share" → "Add people, emails, or integrations".',
        '   • Search for your integration name and add it.',
        '   • Give it the correct permission (usually "Can edit").',
        '',
        '6️⃣ Use the Token as API Key',
        '   Paste the Internal Integration Token into the "Notion API Key" field in this node.',
        '   Never commit this key to git or share it publicly.',
        '',
        'Example:',
        'secret_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
      ],
      example: 'secret_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
    },
    databaseId: {
      title: 'Notion Database ID – Step-by-Step',
      steps: [
        '1️⃣ Open the Database as a Full Page',
        '   In Notion, open the database (table, board, list, etc.) you want to use.',
        '   Click "Open as page" if it is inlined inside another page.',
        '',
        '2️⃣ Copy the Database Link',
        '   Click the "Share" button or the "•••" menu in the top‑right.',
        '   Click "Copy link".',
        '',
        '3️⃣ Identify the Database ID in the URL',
        '   Modern Notion URLs look like:',
        '   • https://workspace-name.notion.site/Database-Name-0123456789abcdef0123456789abcdef?pvs=4',
        '   • or https://www.notion.so/workspace/Database-Name-0123456789abcdef0123456789abcdef',
        '',
        '4️⃣ Extract the ID',
        '   • The Database ID is the last 32 characters of the URL (letters/numbers),',
        '     OR the 36‑character UUID with hyphens at the end before any ?query string.',
        '   • Example raw form: 0123456789abcdef0123456789abcdef',
        '   • Example UUID form: 01234567-89ab-cdef-0123-456789abcdef',
        '',
        '5️⃣ Paste Into Database ID Field',
        '   Paste either the 32‑character hex string (no hyphens) or the full UUID with hyphens into the "Database ID" input.',
        '   Make sure this database has been shared with your integration (see API Key steps).',
        '',
        'Example:',
        '01234567-89ab-cdef-0123-456789abcdef'
      ],
      example: '01234567-89ab-cdef-0123-456789abcdef'
    },
    pageId: {
      title: 'Notion Page ID – Step-by-Step',
      steps: [
        '1️⃣ Open the Target Page',
        '   In Notion, open the page you want this node to work with (for read/update/delete).',
        '',
        '2️⃣ Copy the Page Link',
        '   Click "Share" (top‑right) → "Copy link",',
        '   or copy the page URL directly from your browser.',
        '',
        '3️⃣ Identify the Page ID in the URL',
        '   Modern Notion page URLs look like:',
        '   • https://workspace-name.notion.site/Page-Title-0123456789abcdef0123456789abcdef?pvs=4',
        '   • or https://www.notion.so/workspace/Page-Title-0123456789abcdef0123456789abcdef',
        '',
        '4️⃣ Extract the ID',
        '   • The Page ID is the last 32 characters of the URL (letters/numbers),',
        '     OR the 36‑character UUID with hyphens at the end before any ?query string.',
        '   • Example raw form: 0123456789abcdef0123456789abcdef',
        '   • Example UUID form: 01234567-89ab-cdef-0123-456789abcdef',
        '',
        '5️⃣ Use the Page ID in the Node',
        '   Paste this value into the "Page ID" field.',
        '   This is required for operations like read_page, update_page, delete_page, and update_database_entry.',
        '',
        'Example:',
        '01234567-89ab-cdef-0123-456789abcdef'
      ],
      example: '01234567-89ab-cdef-0123-456789abcdef'
    },
    operation: {
      title: 'How to choose Notion Operation?',
      steps: [
        'You do not fetch this value from Notion; you select it from the Operation dropdown in this node.',
        '',
        'Available operations in this node:',
        '',
        '• Create Page (create_page)',
        '  - Creates a new page under a parent page or inside a database.',
        '  - Typically requires: Parent Page ID (or Database ID), Page Title, and optional Content/Properties.',
        '',
        '• Update Page (update_page)',
        '  - Updates title, content, or properties of an existing page.',
        '  - Requires: Page ID.',
        '',
        '• Read Page (read_page)',
        '  - Fetches metadata and/or content blocks for a single page.',
        '  - Requires: Page ID.',
        '',
        '• Delete Page (delete_page)',
        '  - Archives (soft‑deletes) a page in Notion.',
        '  - Requires: Page ID.',
        '',
        '• Query Database (query_database)',
        '  - Runs a filtered/sorted query against a database.',
        '  - Requires: Database ID. Optional: Filter JSON, Sorts JSON, Page Size, Cursor.',
        '',
        '• Create Database Entry (create_database_entry)',
        '  - Inserts a new row into a database.',
        '  - Requires: Database ID and Properties JSON matching your database schema.',
        '',
        '• Update Database Entry (update_database_entry)',
        '  - Updates an existing database row (which is a page in that database).',
        '  - Requires: Page ID (of the row) and Properties JSON.',
        '',
        'Pick the operation that matches what you want this node to do, then fill the required IDs and JSON fields accordingly.'
      ],
      example: 'create_page'
    },
    parentPageId: {
      title: 'Notion Parent Page ID – Step-by-Step',
      steps: [
        '1️⃣ Open the parent page where you want new pages to be created (for create_page).',
        '',
        '2️⃣ Click "Share" → "Copy link", or copy the URL from your browser.',
        '',
        '3️⃣ Find the Page ID in the URL',
        '   Example URLs:',
        '   • https://workspace-name.notion.site/Parent-Page-0123456789abcdef0123456789abcdef?pvs=4',
        '   • https://www.notion.so/workspace/Parent-Page-0123456789abcdef0123456789abcdef',
        '',
        '4️⃣ Extract the ID',
        '   • Copy the last 32 characters (letters/numbers) of the URL (ignoring hyphens),',
        '     OR copy the full 36‑character UUID with hyphens.',
        '',
        '5️⃣ Paste Into Parent Page ID Field',
        '   Use this value in the "Parent Page ID (for create)" field so new pages are created under this parent.',
        '',
        'Example:',
        '01234567-89ab-cdef-0123-456789abcdef'
      ],
      example: '01234567-89ab-cdef-0123-456789abcdef'
    },
    title: {
      title: 'How to get Page Title?',
      steps: [
        'You type the page title—the name of the page you want to create.',
        '',
        '• Static: Type it directly, e.g. "Weekly Report".',
        '',
        '• Dynamic: Use data from earlier steps, e.g. "{{input.reportTitle}}".',
        '',
        'Required for Create Page.'
      ],
      example: 'Weekly Report'
    },
    content: {
      title: 'How to get Page Content (JSON)?',
      steps: [
        'Page content is a JSON array of Notion blocks.',
        '',
        '• For simple text, use a paragraph block:',
        '  [{"type":"paragraph","paragraph":{"rich_text":[{"text":{"content":"Hello"}}]}}]',
        '',
        '• You can build blocks from previous steps or templates.',
        '',
        'Used for Create Page and Update Page.'
      ],
      example: '[{"type":"paragraph","paragraph":{"rich_text":[{"text":{"content":"Hello"}}]}}]'
    },
    properties: {
      title: 'How to get Properties (JSON)?',
      steps: [
        'Properties are database fields and values for database entries.',
        '',
        '1️⃣ Open your database and note the property names',
        '',
        '2️⃣ Build a JSON object that matches those properties',
        '   Example:',
        '   {"Name":{"title":[{"text":{"content":"Task Name"}}]},"Status":{"select":{"name":"In Progress"}}}',
        '',
        'Required for Create Database Entry and Update Database Entry.'
      ],
      example: '{"Name":{"title":[{"text":{"content":"Task Name"}}]}}'
    },
    filter: {
      title: 'How to get Database Filter (JSON)?',
      steps: [
        'Filters limit results when querying a database.',
        '',
        'Example:',
        '{"property":"Status","select":{"equals":"Done"}}',
        '',
        'Use property names exactly as they appear in your database.',
        'Use Notion filter format from API docs.'
      ],
      example: '{"property":"Status","select":{"equals":"Done"}}'
    },
    sorts: {
      title: 'How to get Sorts (JSON)?',
      steps: [
        'Sorts control the order of query results.',
        '',
        'Example:',
        '[{"property":"Created","direction":"descending"}]',
        '',
        'Use property names exactly as they appear in your database.'
      ],
      example: '[{"property":"Created","direction":"descending"}]'
    },
    pageSize: {
      title: 'How to get Page Size?',
      steps: [
        'Page Size is the maximum number of results for query_database.',
        '',
        'Enter a number between 1 and 100.',
        '',
        'Default is often 100.'
      ],
      example: '100'
    }
  },
  airtable: {
    apiKey: {
      title: 'Airtable API Key (Personal Access Token) – Step-by-Step',
      url: 'https://airtable.com/create/tokens',
      steps: [
        '1️⃣ Open Airtable Tokens',
        '   Go to 👉 https://airtable.com/create/tokens',
        '   Sign in with your Airtable account',
        '',
        '2️⃣ Create New Token',
        '   Click "Create new token"',
        '   Give it a name (e.g., "Workflow Integration")',
        '',
        '3️⃣ Select Scopes',
        '   Choose required permissions:',
        '   • data.records:read (to read records)',
        '   • data.records:write (to create/update records)',
        '   • schema.bases:read (to read base structure)',
        '',
        '4️⃣ Select Bases',
        '   Choose which bases this token can access',
        '   Select specific bases or "All bases"',
        '',
        '5️⃣ Create Token',
        '   Click "Create token"',
        '   Copy the token immediately',
        '   Token starts with "pat"',
        '   ⚠️ You can only see it once!',
        '',
        '6️⃣ Store Securely',
        '   Paste it into the Airtable API Key field above',
        '   Never share publicly',
        '',
        'Example:',
        'patxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
      ],
      example: 'patxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
    },
    baseId: {
      title: 'Airtable Base ID – Step-by-Step',
      url: 'https://airtable.com/api',
      steps: [
        '1️⃣ Open Airtable API Docs',
        '   Go to 👉 https://airtable.com/api',
        '   Sign in with your Airtable account',
        '',
        '2️⃣ Select Your Base',
        '   Choose the base you want to use',
        '   From the dropdown menu',
        '',
        '3️⃣ View API Documentation',
        '   You\'ll see the API documentation',
        '   The Base ID is shown at the top',
        '   Format: appxxxxxxxxxxxxxxxx',
        '',
        '4️⃣ Alternative: From Base URL',
        '   Open your base in Airtable',
        '   Look at the URL:',
        '   airtable.com/appBASE_ID/...',
        '   Copy the Base ID from URL',
        '',
        '5️⃣ Copy Base ID',
        '   Select and copy the Base ID',
        '   It starts with "app"',
        '   Usually 14-17 characters',
        '',
        '6️⃣ Use the Base ID',
        '   Paste it into the Base ID field above',
        '   Make sure your token has access',
        '',
        'Example:',
        'appxxxxxxxxxxxxxxxx'
      ],
      example: 'appxxxxxxxxxxxxxxxx'
    }
  },
  razorpay: {
    keyId: {
      title: 'Razorpay Key ID – Step-by-Step',
      url: 'https://dashboard.razorpay.com',
      steps: [
        '1️⃣ Open Razorpay Dashboard',
        '   Go to 👉 https://dashboard.razorpay.com',
        '   Sign in or create an account',
        '',
        '2️⃣ Navigate to API Keys',
        '   Click "Settings" in left sidebar',
        '   Click "API Keys"',
        '   Or go to: dashboard.razorpay.com/app/keys',
        '',
        '3️⃣ View Your Keys',
        '   You\'ll see Key ID and Key Secret',
        '   Test keys start with "rzp_test_"',
        '   Live keys start with "rzp_live_"',
        '',
        '4️⃣ Copy Key ID',
        '   Find "Key ID"',
        '   Click to copy or select and copy',
        '   It\'s visible without revealing',
        '',
        '5️⃣ Toggle Test/Live Mode',
        '   Use test mode for development',
        '   Use live mode for production',
        '   Keys are different for each mode',
        '',
        '6️⃣ Use the Key ID',
        '   Paste it into the Key ID field above',
        '   You\'ll also need Key Secret',
        '',
        'Example (Test):',
        'rzp_test_xxxxxxxxxxxxxxxx',
        '',
        'Example (Live):',
        'rzp_live_xxxxxxxxxxxxxxxx'
      ],
      example: 'rzp_test_xxxxxxxxxxxxxxxx'
    },
    keySecret: {
      title: 'Razorpay Key Secret – Step-by-Step',
      url: 'https://dashboard.razorpay.com',
      steps: [
        '1️⃣ Open Razorpay Dashboard',
        '   Go to 👉 https://dashboard.razorpay.com',
        '   Sign in to your account',
        '',
        '2️⃣ Go to API Keys',
        '   Click "Settings" → "API Keys"',
        '   Or go to: dashboard.razorpay.com/app/keys',
        '',
        '3️⃣ Reveal Key Secret',
        '   Find "Key Secret"',
        '   Click "Reveal" button',
        '   The secret will be shown',
        '',
        '4️⃣ Copy Key Secret',
        '   ⚠️ IMPORTANT: Copy immediately!',
        '   Click "Copy" or select and copy',
        '   Keep it secure',
        '',
        '5️⃣ Regenerate if Needed',
        '   If you lost the secret:',
        '   Click "Regenerate"',
        '   Old secret will be invalidated',
        '',
        '6️⃣ Store Securely',
        '   Paste it into the Key Secret field above',
        '   Never commit to version control',
        '   Use environment variables in production',
        '',
        'Example:',
        'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
      ],
      example: 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
    }
  },
  paypal: {
    clientId: {
      title: 'PayPal Client ID – Step-by-Step',
      url: 'https://developer.paypal.com',
      steps: [
        '1️⃣ Open PayPal Developer Dashboard',
        '   Go to 👉 https://developer.paypal.com',
        '   Sign in or create an account',
        '',
        '2️⃣ Create or Select App',
        '   Click "My Apps & Credentials"',
        '   Click "Create App" or select existing',
        '   Give it a name (e.g., "Workflow Integration")',
        '',
        '3️⃣ Choose Environment',
        '   Select "Sandbox" for testing',
        '   Or "Live" for production',
        '   You can create apps for both',
        '',
        '4️⃣ Copy Client ID',
        '   After creating app',
        '   You\'ll see "Client ID"',
        '   Click to copy or select and copy',
        '',
        '5️⃣ Use the Client ID',
        '   Paste it into the Client ID field above',
        '   You\'ll also need Client Secret',
        '',
        'Example:',
        'AeA1QIZXiflr1_-MoAz5x5vQM3bLxVx1xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
      ],
      example: 'AeA1QIZXiflr1_-MoAz5x5vQM3bLxVx1xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
    },
    clientSecret: {
      title: 'PayPal Client Secret – Step-by-Step',
      url: 'https://developer.paypal.com',
      steps: [
        '1️⃣ Open PayPal Developer Dashboard',
        '   Go to 👉 https://developer.paypal.com',
        '   Sign in to your account',
        '',
        '2️⃣ Go to App Credentials',
        '   Click "My Apps & Credentials"',
        '   Select your app',
        '',
        '3️⃣ Reveal Client Secret',
        '   Find "Client Secret"',
        '   Click "Show" to reveal',
        '   The secret will be displayed',
        '',
        '4️⃣ Copy Client Secret',
        '   ⚠️ IMPORTANT: Copy immediately!',
        '   Click "Copy" or select and copy',
        '   Keep it secure',
        '',
        '5️⃣ Store Securely',
        '   Paste it into the Client Secret field above',
        '   Never commit to version control',
        '   Use environment variables in production',
        '',
        'Example:',
        'ELxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
      ],
      example: 'ELxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
    }
  },
  shopify: {
    shopDomain: {
      title: 'Shopify Shop Domain – Step-by-Step',
      url: 'https://admin.shopify.com',
      steps: [
        '1️⃣ Open Shopify Admin',
        '   Go to 👉 https://admin.shopify.com',
        '   Sign in to your Shopify store',
        '',
        '2️⃣ Method 1: From URL',
        '   Look at the URL in your browser',
        '   Format: admin.shopify.com/store/YOUR_SHOP',
        '   Or: YOUR_SHOP.myshopify.com/admin',
        '   Copy the shop name',
        '',
        '3️⃣ Method 2: From Settings',
        '   Click "Settings" in bottom left',
        '   Click "General"',
        '   Find "Store address"',
        '   Copy the domain (e.g., mystore.myshopify.com)',
        '',
        '4️⃣ Format the Domain',
        '   Use format: yourshop.myshopify.com',
        '   Do NOT include "https://"',
        '   Do NOT include "/admin"',
        '   Just the domain name',
        '',
        '5️⃣ Use the Shop Domain',
        '   Paste it into the Shop Domain field above',
        '   You\'ll also need Access Token',
        '',
        'Example:',
        'mystore.myshopify.com'
      ],
      example: 'mystore.myshopify.com'
    },
    accessToken: {
      title: 'Shopify Admin API Access Token – Step-by-Step',
      url: 'https://admin.shopify.com',
      steps: [
        '1️⃣ Open Shopify Admin',
        '   Go to 👉 https://admin.shopify.com',
        '   Sign in to your Shopify store',
        '',
        '2️⃣ Enable Developer Mode',
        '   Go to Settings → Apps and sales channels',
        '   Click "Develop apps" (enable if needed)',
        '',
        '3️⃣ Create New App',
        '   Click "Create an app"',
        '   Give it a name (e.g., "Workflow Integration")',
        '   Click "Create app"',
        '',
        '4️⃣ Configure Admin API Scopes',
        '   Click "Configure Admin API scopes"',
        '   Select required scopes:',
        '   • read_orders (to read orders)',
        '   • write_products (to create/update products)',
        '   • read_products (to read products)',
        '   • read_customers (to read customers)',
        '   • etc. (select as needed)',
        '   Click "Save"',
        '',
        '5️⃣ Install App',
        '   Go to "API credentials" tab',
        '   Click "Install app"',
        '   Confirm installation',
        '',
        '6️⃣ Reveal Admin API Access Token',
        '   In "API credentials" tab',
        '   Find "Admin API access token"',
        '   Click "Reveal token once" or "Reveal token"',
        '',
        '7️⃣ Copy Access Token',
        '   ⚠️ IMPORTANT: Copy immediately!',
        '   Token starts with "shpat_"',
        '   Format: shpat_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
        '   You may only see it once!',
        '',
        '8️⃣ Store Securely',
        '   Paste it into the Access Token field above',
        '   Never share publicly',
        '   Use environment variables in production',
        '',
        'Example:',
        'shpat_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
      ],
      example: 'shpat_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
    },
    operation: {
      title: 'How to get Operation?',
      steps: [
        'You don’t get this from anywhere—you choose it from the dropdown in this node.',
        '',
        '• Get Product / Update Product – Requires Product ID.',
        '',
        '• List Products – Optional Limit.',
        '',
        '• Create Product – Use product data from your workflow.',
        '',
        '• Get Order – Requires Order ID.',
        '',
        '• List Orders – Optional Limit.',
        '',
        '• Create Order – Use order data from your workflow.',
        '',
        '• Get Customer – Requires Customer ID.',
        '',
        '• List Customers – Optional Limit.',
      ],
      example: 'Get Product'
    },
    productId: {
      title: 'Shopify Product ID – Step-by-Step',
      steps: [
        '1️⃣ Open the product in Shopify Admin',
        '',
        '2️⃣ Copy the numeric ID from the URL',
        '',
        '3️⃣ Paste it into the Product ID field',
        '',
        'Example:',
        '123456789'
      ],
      example: '123456789'
    },
    orderId: {
      title: 'Shopify Order ID – Step-by-Step',
      steps: [
        '1️⃣ Go to Orders in Shopify Admin',
        '',
        '2️⃣ Open the order',
        '',
        '3️⃣ Copy the numeric ID from the URL',
        '',
        'Example:',
        '987654321'
      ],
      example: '987654321'
    },
    customerId: {
      title: 'Shopify Customer ID – Step-by-Step',
      steps: [
        '1️⃣ Go to Customers in Shopify Admin',
        '',
        '2️⃣ Open the customer record',
        '',
        '3️⃣ Copy the numeric ID from the URL',
        '',
        'Example:',
        '555666777'
      ],
      example: '555666777'
    },
    limit: {
      title: 'How to get Limit?',
      steps: [
        'Enter how many results you want returned.',
        '',
        'Default is 250. Lower it for faster responses.',
        '',
        'Used for List Products, List Orders, and List Customers.'
      ],
      example: '250'
    }
  },
  // Google Services
  google_bigquery: {
    projectId: {
      title: 'Google Cloud Project ID – Step-by-Step',
      url: 'https://console.cloud.google.com',
      steps: [
        '1️⃣ Open Google Cloud Console',
        '   Go to 👉 https://console.cloud.google.com',
        '   Sign in with your Google account',
        '',
        '2️⃣ Select or Create Project',
        '   Click project dropdown (top bar)',
        '   Select existing project or "New Project"',
        '',
        '3️⃣ Get Project ID',
        '   Project ID is shown in project dropdown',
        '   Or go to: IAM & Admin → Settings',
        '   Copy the "Project ID" (not Project Name)',
        '',
        '4️⃣ Use the Project ID',
        '   Paste it into the Project ID field above',
        '   Format: my-project-id-123456',
        '',
        'Example:',
        'my-project-id-123456'
      ],
      example: 'my-project-id-123456'
    },
    datasetId: {
      title: 'BigQuery Dataset ID – Step-by-Step',
      url: 'https://console.cloud.google.com/bigquery',
      steps: [
        '1️⃣ Open BigQuery Console',
        '   Go to 👉 https://console.cloud.google.com/bigquery',
        '   Sign in with your Google account',
        '',
        '2️⃣ View Datasets',
        '   In left sidebar, expand your project',
        '   You\'ll see list of datasets',
        '',
        '3️⃣ Get Dataset ID',
        '   Dataset ID is the name shown',
        '   Or create new: Click "Create dataset"',
        '   Enter dataset ID (lowercase, no spaces)',
        '',
        '4️⃣ Use the Dataset ID',
        '   Paste it into the Dataset ID field above',
        '   Format: my_dataset',
        '',
        'Example:',
        'my_dataset'
      ],
      example: 'my_dataset'
    }
  },
  google_calendar: {
    operation: {
      title: 'How to get Operation?',
      steps: [
        'You choose this from the dropdown in the node.',
        '',
        '• List Events – Use when you want to retrieve events from a calendar. You need Calendar ID (default: primary).',
        '',
        '• Create Event – Use when you want to add a new event. You need Calendar ID, Event Title, Start Time, and End Time (and optionally Description).',
        '',
        '• Update Event – Use when you want to change an existing event. You need Calendar ID, Event ID, and the fields you want to change.',
        '',
        '• Delete Event – Use when you want to remove an event. You need Calendar ID and Event ID.'
      ]
    },
    calendarId: {
      title: 'Google Calendar ID – Step-by-Step',
      steps: [
        '1️⃣ For Primary Calendar',
        '   Use "primary" for your main calendar',
        '   This is the default calendar',
        '',
        '2️⃣ For Other Calendars',
        '   Go to Google Calendar (calendar.google.com)',
        '   On the left, under My calendars, find the calendar',
        '   Click the three dots (⋮) next to the calendar name',
        '   Click "Settings and sharing"',
        '   Scroll to "Integrate calendar"',
        '   Copy "Calendar ID"',
        '',
        '3️⃣ Calendar ID Format',
        '   Usually an email-like address (e.g. xxx@group.calendar.google.com)',
        '   Or a long alphanumeric string',
        '',
        '4️⃣ Use the Calendar ID',
        '   Paste it into the Calendar ID field above',
        '   Use "primary" for main calendar',
        '',
        'Example:',
        'primary'
      ],
      example: 'primary'
    },
    eventId: {
      title: 'Google Calendar Event ID – Step-by-Step',
      steps: [
        '1️⃣ Open Google Calendar',
        '   Go to 👉 https://calendar.google.com',
        '   Sign in with your Google account',
        '',
        '2️⃣ Open Event',
        '   Click on the event you want',
        '   Event details will open',
        '',
        '3️⃣ Get Event ID from URL',
        '   Look at the URL in your browser',
        '   Format: calendar.google.com/calendar/event?eid=EVENT_ID',
        '   The ID is after eid=',
        '',
        '4️⃣ Alternative: From a previous node',
        '   If you used List Events earlier, use the event id from the output, e.g. {{listNode.events[0].id}}',
        '',
        '5️⃣ Use the Event ID',
        '   Paste it into the Event ID field above',
        '',
        'Example:',
        'abc123def456'
      ],
      example: 'abc123def456'
    },
    summary: {
      title: 'How to get Event Title?',
      steps: [
        'You type or set the title—it is not copied from an existing event unless you reference a previous step.',
        '',
        'Static title: Type it directly, e.g. "Team Standup".',
        '',
        'Dynamic title: If your platform supports expressions, use data from earlier steps, e.g. "Call with {{input.clientName}}" or "Review: {{input.taskName}}".',
        '',
        'This field is only used when Operation = Create or Update. It is ignored for List and Delete.'
      ],
      example: 'Meeting with Team'
    },
    startTime: {
      title: 'How to get Start Time (ISO 8601)?',
      steps: [
        'You provide the start time in the format the platform expects (usually ISO 8601).',
        '',
        'Format:',
        '   • UTC: YYYY-MM-DDTHH:mm:ssZ (e.g. 2024-01-15T14:00:00Z)',
        '   • With offset: YYYY-MM-DDTHH:mm:ss+00:00 or -05:00',
        '',
        'Dynamic time: If your platform supports expressions, use a value from a previous step (e.g. {{input.startTime}}) that resolves to a valid ISO 8601 string.',
        '',
        'Tip: Use UTC (Z) or explicit offsets to avoid time zone confusion. Required for Create and Update.'
      ],
      example: '2024-01-15T10:00:00Z'
    },
    endTime: {
      title: 'How to get End Time (ISO 8601)?',
      steps: [
        'You provide the end time in the same ISO 8601 format as Start Time.',
        '',
        'Format: YYYY-MM-DDTHH:mm:ssZ (UTC) or with offset (e.g. 2024-01-15T11:00:00-05:00).',
        '',
        'Rule: End time must be after start time. Use the same time zone (or UTC) as the start time.',
        '',
        'Dynamic time: If your platform supports expressions, use {{input.endTime}} or similar. Required for Create and Update.'
      ],
      example: '2024-01-15T11:00:00Z'
    },
    description: {
      title: 'How to get Description?',
      steps: [
        'You type or paste the description—it is not copied from an existing event unless you reference a previous step.',
        '',
        'Static: Type or paste into the Description field. Line breaks are usually kept.',
        '',
        'Dynamic: If your platform supports expressions, use content from earlier steps, e.g. "Agenda: {{input.agenda}}" or "Attendees: {{input.attendees}}".',
        '',
        'This field is only used when Operation = Create or Update. Leave empty if not needed.'
      ],
      example: 'Event description...'
    }
  },
  google_doc: {
    operation: {
      title: 'How to get Operation?',
      steps: [
        'You choose this from the dropdown in the node—you do not get it from elsewhere.',
        '',
        '• Read – Use when you want to extract all text from an existing document. You must fill Document ID or URL.',
        '',
        '• Create – Use when you want to create a new document. You must fill Document Title (and usually Content). Leave Document ID empty.',
        '',
        '• Update – Use when you want to add or change content in an existing document. You must fill Document ID or URL and Content.'
      ]
    },
    documentId: {
      title: 'Google Docs Document ID – Step-by-Step',
      steps: [
        '1️⃣ Open Your Google Doc',
        '   Go to 👉 https://docs.google.com',
        '   Open the document you want to use',
        '',
        '2️⃣ Get Document ID from URL',
        '   Look at the URL in your browser',
        '   Format: docs.google.com/document/d/DOCUMENT_ID/edit',
        '   The ID is the long string between /d/ and /edit',
        '',
        '3️⃣ Copy the Document ID',
        '   Select and copy the ID from URL',
        '   It\'s usually 44 characters long',
        '',
        '4️⃣ Use the Document ID',
        '   Paste the full URL or just the ID into the Document ID or URL field',
        '   Make sure the document is shared with your Google account',
        '',
        'Example:',
        '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms'
      ],
      example: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms'
    },
    title: {
      title: 'How to get Document Title?',
      steps: [
        'You choose or type the title—it is not copied from an existing document.',
        '',
        'Static title: Type it directly, e.g. "Meeting Notes – Jan 15".',
        '',
        'Dynamic title: If your platform supports expressions, use data from earlier steps, e.g. "Report – {{input.date}}" or "Contract – {{input.clientName}}".',
        '',
        'This field is only used when Operation = Create. It is ignored for Read and Update.'
      ],
      example: 'My Document'
    },
    content: {
      title: 'How to get Content?',
      steps: [
        'Option 1: Type or paste – Write or paste the text into the Content field. Use line breaks for new paragraphs.',
        '',
        'Option 2: From a previous node – If another step produced text (e.g. AI summary, report), reference it, e.g. {{aiNode.text}} or {{reportNode.content}}.',
        '',
        'Option 3: Template with placeholders – Mix fixed text and dynamic values, e.g. "Hello {{input.name}}, your request #{{input.id}} has been received."',
        '',
        'This field is only used when Operation = Create or Update. It is ignored for Read.'
      ],
      example: 'Document content...'
    }
  },
  google_drive: {
    operation: {
      title: 'How to get Operation?',
      steps: [
        'You don’t get this from anywhere—you choose it from the dropdown in this node.',
        '',
        '• List Files – Use when you want to retrieve files from a folder. Set Folder ID (or leave empty for root). The node returns a list of files.',
        '',
        '• Upload File – Use when you want to add a new file to Drive. You need File Name and File Content (Base64). Optionally Folder ID if your platform supports uploading to a folder.',
        '',
        '• Download File – Use when you want to get the content of an existing file. You need File ID. The node returns the file content (e.g. Base64).',
        '',
        '• Delete File – Use when you want to remove a file. You need File ID only.'
      ],
      example: 'List Files'
    },
    folderId: {
      title: 'Google Drive Folder ID – Step-by-Step',
      steps: [
        '1️⃣ Open Google Drive',
        '   Go to 👉 https://drive.google.com',
        '   Open the folder you want to list files from (or where you want to upload)',
        '',
        '2️⃣ Get Folder ID from URL',
        '   Look at the URL in your browser',
        '   Format: drive.google.com/drive/folders/FOLDER_ID',
        '   The ID is the long string after /folders/',
        '',
        '3️⃣ Copy the Folder ID',
        '   Select and copy the entire ID—no slashes, no spaces',
        '',
        '4️⃣ Use the Folder ID',
        '   Paste it into the Folder ID field above',
        '   Leave empty to list files in the root of your Drive',
        '',
        'Example:',
        '1a2b3c4d5e6f7g8h9i0j'
      ],
      example: '1a2b3c4d5e6f7g8h9i0j'
    },
    fileId: {
      title: 'Google Drive File ID – Step-by-Step',
      steps: [
        '1️⃣ Open Your File in Google Drive',
        '   Go to 👉 https://drive.google.com',
        '   Open the file you want to use',
        '',
        '2️⃣ Get File ID from URL',
        '   Look at the URL in your browser',
        '   Format: drive.google.com/file/d/FILE_ID/view',
        '   The ID is between /d/ and /view',
        '',
        '3️⃣ Copy the File ID',
        '   Select and copy the ID from URL',
        '   It\'s a long alphanumeric string',
        '',
        '4️⃣ Use the File ID',
        '   Paste it into the File ID field above',
        '   Make sure the file is accessible',
        '',
        'Option: From a previous List Files node, use the id from the output, e.g. {{listNode.files[0].id}}',
        '',
        'Example:',
        '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms'
      ],
      example: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms'
    },
    fileName: {
      title: 'How to get File Name?',
      steps: [
        'You choose or type the file name—it is the name you want the file to have in Google Drive.',
        '',
        '• Static name: Type it directly, e.g. report.pdf, export.csv, backup.json',
        '',
        '• Dynamic name: If your platform supports expressions, use data from earlier steps, e.g. report_{{input.date}}.pdf or {{input.clientName}}_invoice.pdf',
        '',
        '• Always include the correct file extension (e.g. .pdf, .csv, .txt) so Drive and other apps recognize the file type.',
        '',
        'This field is only used when Operation = Upload. It is ignored for List, Download, and Delete.'
      ],
      example: 'report_2024-01-15.pdf'
    },
    fileContent: {
      title: 'How to get File Content (Base64)?',
      steps: [
        'File content must be Base64-encoded—you do not type it by hand.',
        '',
        '• From a previous node – Use output from a step that reads or generates a file (e.g. Read File, HTTP response). Reference it, e.g. {{readFileNode.content}} or {{httpNode.body}}.',
        '',
        '• From a workflow expression – If your platform can encode text or binary to Base64, use that function (see your platform’s docs).',
        '',
        '• For testing – Encode a small file with an online Base64 encoder or a script, then paste the result. Do not paste huge content by hand.',
        '',
        'Format: Base64 uses letters A–Z, a–z, digits 0–9, and +, /. It may end with = for padding. No spaces or line breaks inside the string unless your platform accepts wrapped Base64.',
        '',
        'This field is only used when Operation = Upload. It is ignored for List, Download, and Delete.'
      ],
      example: 'Base64 encoded content...'
    }
  },
  google_gmail: {
    operation: {
      title: 'How to get Operation?',
      steps: [
        'You don’t get this from anywhere—you choose it from the dropdown in this node.',
        '',
        '• Send Email – Use when this node should send an email. You will fill To, Subject, and Body.',
        '',
        '• List Messages – Use when this node should return a list of emails (e.g. from inbox). You can optionally set Search Query and Max Results.',
        '',
        '• Get Message – Use when this node should fetch one email by its ID. You must fill Message ID (from Gmail URL or from a previous List/Search node).',
        '',
        '• Search Messages – Use when this node should find emails matching a search. Fill Search Query (and optionally Max Results).'
      ]
    },
    recipientEmails: {
      title: 'How to set Recipient Emails?',
      steps: [
        'Recipient Emails is the To list for Send Email.',
        '',
        'Manual entry: Type one email address, or multiple addresses separated with commas, semicolons, or new lines.',
        '',
        'From previous data: Use a value such as {{$json.email}} when an earlier step provides the recipient address.',
        '',
        'For sheet-driven sends, choose Extract from sheet in Recipient Source and leave this field empty.'
      ],
      example: 'alice@example.com, bob@example.com'
    },
    to: {
      title: 'How to get To?',
      steps: [
        'To is the recipient’s email address—not something you copy from Gmail.',
        '',
        'Option 1: Type it – If the recipient is fixed (e.g. support@company.com), type that address in the To field.',
        '',
        'Option 2: From a form or trigger – If the workflow was started by a form or webhook, the submitter’s email is often in the trigger data. Use the expression your platform provides, e.g. {{trigger.email}} or {{input.email}}.',
        '',
        'Option 3: From a previous node – If an earlier step (e.g. CRM, database) returned a contact email, reference it, e.g. {{previousNode.email}}.',
        '',
        'Format: Must be a valid email (name@domain.com). No spaces.'
      ],
      example: 'recipient@example.com'
    },
    cc: {
      title: 'How to set CC?',
      steps: [
        'CC is optional and only used for Send Email.',
        '',
        'Use it for visible copied recipients. Enter one email address, or multiple addresses separated with commas, semicolons, or new lines.',
        '',
        'Leave it blank if no copied recipients are needed.'
      ],
      example: 'manager@example.com'
    },
    bcc: {
      title: 'How to set BCC?',
      steps: [
        'BCC is optional and only used for Send Email.',
        '',
        'Use it for hidden copied recipients. Enter one email address, or multiple addresses separated with commas, semicolons, or new lines.',
        '',
        'Leave it blank if no hidden recipients are needed.'
      ],
      example: 'archive@example.com'
    },
    from: {
      title: 'How to set From?',
      steps: [
        'From is optional and only used for Send Email.',
        '',
        'Leave it blank to send from the connected Google account.',
        '',
        'Only enter a sender address when it is a Gmail alias configured on that account. Gmail may reject unverified sender aliases.'
      ],
      example: 'orders@example.com'
    },
    subject: {
      title: 'How to get Subject?',
      steps: [
        'You write the subject—it is not copied from Gmail or another app.',
        '',
        'Static subject: Type it directly, e.g. "Daily report ready".',
        '',
        'Dynamic subject: If your platform supports expressions, you can insert data from earlier steps, e.g. "Order #{{input.orderId}} confirmed" or "Alert: {{input.alertType}}".',
        '',
        'Tip: Keep it short and clear so the email is less likely to be marked as spam.'
      ],
      example: 'Workflow Notification'
    },
    body: {
      title: 'How to get Body?',
      steps: [
        'Body is the main text (or HTML) of the email—the content inside the email, not the subject or recipient.',
        '',
        'Option 1: Type or paste – Write the message in the Body field, or paste from a document. Line breaks are kept in plain text.',
        '',
        'Option 2: From a previous node – If another step produced text (e.g. report, AI summary), reference it, e.g. {{reportNode.content}}.',
        '',
        'Option 3: Template with placeholders – Mix fixed text and dynamic values, e.g. "Hi {{input.name}}, your request #{{input.id}} has been received."',
        '',
        'This Gmail node currently sends text/plain messages. Do not rely on HTML rendering in this field.'
      ],
      example: 'Your workflow completed successfully.'
    },
    messageId: {
      title: 'Gmail Message ID – Step-by-Step',
      steps: [
        '1️⃣ Open Gmail',
        '   Go to 👉 https://mail.google.com',
        '   Open the email you want to use',
        '',
        '2️⃣ Get Message ID from URL',
        '   Look at the URL in your browser',
        '   Format: mail.google.com/mail/u/0/#inbox/MESSAGE_ID',
        '   The ID is after #inbox/',
        '',
        '3️⃣ Alternative: Use Gmail API',
        '   Query messages using Gmail API',
        '   Message ID is in the response',
        '',
        '4️⃣ Use the Message ID',
        '   Paste it into the Message ID field above',
        '',
        'Example:',
        '18c1234567890abcdef'
      ],
      example: '18c1234567890abcdef'
    },
    query: {
      title: 'How to get Search Query?',
      steps: [
        'This is not an email address or subject—it is a search string using Gmail’s search syntax.',
        '',
        'Where to learn: Open Gmail, use the search box at the top, and try queries there. The same text works in this Search Query field.',
        '',
        'Common operators (use exactly as shown):',
        '   • from:email@example.com – emails from this sender',
        '   • to:email@example.com – emails to this address',
        '   • subject:word – subject contains this word',
        '   • is:unread – only unread',
        '   • is:read – only read',
        '   • has:attachment – has an attachment',
        '   • label:LabelName – in this Gmail label',
        '   • newer_than:7d – from the last 7 days',
        '   • older_than:1m – older than 1 month',
        '',
        'Combining: Put a space between parts, e.g. from:support@company.com is:unread newer_than:3d',
        '',
        'Leave empty if you just want the latest messages with no filter.'
      ],
      example: 'from:example@gmail.com'
    },
    maxResults: {
      title: 'How to get Max Results?',
      steps: [
        'You choose the number—it is not copied from Gmail or another field.',
        '',
        'What to use:',
        '   • 10–20 – Good for most cases (e.g. “last 10 emails”).',
        '   • 50–100 – Use only if you need more; may be slower or hit rate limits.',
        '',
        'This field only affects List and Search. It is ignored when Operation is Send Email or Get Message.'
      ],
      example: '10'
    }
  },
  // CRM Services
  hubspot: {
    authType: {
      title: 'How to choose Authentication Type?',
      steps: [
        'Choose how this node connects to HubSpot.',
        '',
        '• API Key: Older method. Only use if your account still allows it.',
        '• OAuth2 Access Token (Private App): Recommended and more secure.',
        '',
        'Tip: Use a Private App token for production workflows.'
      ],
      example: 'oauth'
    },
    apiKey: {
      title: 'HubSpot API Key – Step-by-Step',
      url: 'https://app.hubspot.com',
      steps: [
        '1️⃣ Open HubSpot Account',
        '   Go to 👉 https://app.hubspot.com',
        '   Sign in to your HubSpot account',
        '',
        '2️⃣ Go to Settings',
        '   Click "Settings" icon (gear) in top right',
        '   Or go to: app.hubspot.com/settings',
        '',
        '3️⃣ Navigate to API Keys',
        '   In left sidebar, click "Integrations"',
        '   Click "Private Apps" or "API Key"',
        '',
        '4️⃣ Create API Key',
        '   Click "Create API key"',
        '   Give it a name (e.g., "Workflow Integration")',
        '   Select required scopes',
        '',
        '5️⃣ Copy API Key',
        '   ⚠️ IMPORTANT: Copy immediately!',
        '   You may only see it once',
        '',
        '6️⃣ Store Securely',
        '   Paste it into the API Key field above',
        '   Never share publicly',
        '',
        'Example:',
        'pat-na1-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx'
      ],
      example: 'pat-na1-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx'
    },
    accessToken: {
      title: 'HubSpot OAuth2 Access Token – Step-by-Step',
      url: 'https://app.hubspot.com',
      steps: [
        '1️⃣ Open HubSpot Account',
        '   Go to 👉 https://app.hubspot.com',
        '   Sign in to your HubSpot account',
        '',
        '2️⃣ Go to Settings',
        '   Click "Settings" icon (gear)',
        '   Navigate to "Integrations"',
        '',
        '3️⃣ Create Private App',
        '   Click "Private Apps"',
        '   Click "Create a private app"',
        '   Give it a name and select scopes',
        '',
        '4️⃣ Generate Access Token',
        '   After creating app',
        '   Go to "Auth" tab',
        '   Copy the access token',
        '',
        '5️⃣ Store Securely',
        '   Paste it into the Access Token field above',
        '',
        'Example:',
        'pat-na1-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx'
      ],
      example: 'pat-na1-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx'
    },
    resource: {
      title: 'How to choose Resource (Object Type)?',
      steps: [
        'Resource tells HubSpot which CRM object you want to manage.',
        '',
        'Common choices:',
        '• Contact – People in your CRM',
        '• Company – Organizations',
        '• Deal – Sales opportunities',
        '• Ticket – Support tickets',
        '• Engagements – Calls, emails, meetings, notes, tasks',
        '',
        'Tip: Pick the object that matches the data you want to create or update.'
      ],
      example: 'contact'
    },
    operation: {
      title: 'How to choose Operation?',
      steps: [
        'Operation defines the action you want to perform on the selected object.',
        '',
        'Common operations:',
        '• Get – Fetch one record by ID',
        '• Get Many – Fetch multiple records',
        '• Create – Add a new record',
        '• Update – Modify an existing record',
        '• Delete – Remove a record',
        '• Search – Find records by query',
        '• Batch – Create/Update/Delete multiple records at once',
        '',
        'Tip: Use Search before Create to avoid duplicates.'
      ],
      example: 'create'
    },
    id: {
      title: 'How to get Resource ID?',
      steps: [
        'Resource ID is the unique ID of the HubSpot record.',
        '',
        'How to find it:',
        '• From a previous HubSpot node output (id field)',
        '• From a Search operation result',
        '• From the HubSpot record URL',
        '',
        'Tip: This field is required for Get, Update, and Delete.'
      ],
      example: '123456789'
    },
    properties: {
      title: 'How to set Properties (JSON)?',
      steps: [
        'Properties is a JSON object with HubSpot field names and values.',
        '',
        'Example (Contact):',
        '{ "email": "user@example.com", "firstname": "John", "lastname": "Doe" }',
        '',
        'Tips:',
        '• Use HubSpot internal field names (not labels)',
        '• Only include fields you want to create or update',
        '• For custom fields, use the custom property key',
        '',
        'This field is required for Create and Update.'
      ],
      example: '{"email":"user@example.com","firstname":"John","lastname":"Doe"}'
    },
    searchQuery: {
      title: 'How to write a Search Query?',
      steps: [
        'Search Query is used when Operation = Search.',
        '',
        'Format example:',
        '• email:test@example.com',
        '• firstname:John',
        '',
        'Tip: Start simple with one field and expand as needed.'
      ],
      example: 'email:test@example.com'
    },
    limit: {
      title: 'How to set Limit?',
      steps: [
        'Limit controls how many records are returned.',
        '',
        'Recommended values:',
        '• 10–50 for most workflows',
        '• 100+ only if you need large batches',
        '',
        'Tip: Use pagination with "After" when retrieving large datasets.'
      ],
      example: '10'
    },
    after: {
      title: 'What is After (Pagination)?',
      steps: [
        'After is a paging token used to fetch the next page of results.',
        '',
        'How to use it:',
        '• Run a Get Many or Search',
        '• Read the paging token from the output',
        '• Pass it into After to get the next page',
        '',
        'Leave empty for the first page.'
      ],
      example: 'paging_token'
    }
  },
  pipedrive: {
    apiToken: {
      title: 'Pipedrive API Token – Step-by-Step',
      url: 'https://app.pipedrive.com',
      steps: [
        '1️⃣ Open Pipedrive',
        '   Go to 👉 https://app.pipedrive.com',
        '   Sign in to your Pipedrive account',
        '',
        '2️⃣ Go to Personal Preferences',
        '   Click your profile icon (top right)',
        '   Click "Personal preferences"',
        '',
        '3️⃣ Navigate to API',
        '   Click "API" in left sidebar',
        '   Or go to: app.pipedrive.com/settings/api',
        '',
        '4️⃣ Generate API Token',
        '   Find "API Token" section',
        '   Click "Generate" if you don\'t have one',
        '   Copy the token',
        '',
        '5️⃣ Store Securely',
        '   Paste it into the API Token field above',
        '   Never share publicly',
        '',
        'Example:',
        'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
      ],
      example: 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
    }
  },
  freshdesk: {
    apiKey: {
      title: 'Freshdesk API Key – Step-by-Step',
      url: 'https://yourdomain.freshdesk.com',
      steps: [
        '1️⃣ Open Freshdesk',
        '   Go to your Freshdesk domain',
        '   Format: yourdomain.freshdesk.com',
        '   Sign in as admin',
        '',
        '2️⃣ Go to Profile Settings',
        '   Click your profile icon (top right)',
        '   Click "Profile settings"',
        '',
        '3️⃣ Navigate to API',
        '   Click "API" tab',
        '   Or go to: yourdomain.freshdesk.com/a/profile/api',
        '',
        '4️⃣ Generate API Key',
        '   Find "API Key" section',
        '   Click "Reset API key" if needed',
        '   Copy the API key',
        '',
        '5️⃣ Store Securely',
        '   Paste it into the API Key field above',
        '   You\'ll also need your domain',
        '',
        'Example:',
        'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
      ],
      example: 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
    }
  },
  intercom: {
    accessToken: {
      title: 'Intercom Access Token – Step-by-Step',
      url: 'https://app.intercom.com',
      steps: [
        '1️⃣ Open Intercom',
        '   Go to 👉 https://app.intercom.com',
        '   Sign in to your Intercom account',
        '',
        '2️⃣ Go to Developer Hub',
        '   Click "Settings" (gear icon)',
        '   Click "Developers" → "Developer hub"',
        '',
        '3️⃣ Create App',
        '   Click "New app"',
        '   Give it a name (e.g., "Workflow Integration")',
        '   Select required scopes',
        '',
        '4️⃣ Generate Access Token',
        '   After creating app',
        '   Go to "Authentication" tab',
        '   Copy the Access Token',
        '',
        '5️⃣ Store Securely',
        '   Paste it into the Access Token field above',
        '',
        'Example:',
        'dG9rOmxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
      ],
      example: 'dG9rOmxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
    }
  },
  mailchimp: {
    apiKey: {
      title: 'Mailchimp API Key – Step-by-Step',
      url: 'https://mailchimp.com/developer',
      steps: [
        '1️⃣ Open Mailchimp',
        '   Go to 👉 https://mailchimp.com',
        '   Sign in to your Mailchimp account',
        '',
        '2️⃣ Go to Account & Billing',
        '   Click your profile icon (top right)',
        '   Click "Account & Billing"',
        '',
        '3️⃣ Navigate to Extras',
        '   Click "Extras" → "API keys"',
        '   Or go to: mailchimp.com/developer/',
        '',
        '4️⃣ Create API Key',
        '   Click "Create A Key"',
        '   Give it a label (e.g., "Workflow Integration")',
        '   Copy the API key',
        '',
        '5️⃣ Get Server Prefix',
        '   API key format: xxxxx-us1',
        '   The part after dash (us1, us2, etc.) is server',
        '   You may need this for API calls',
        '',
        '6️⃣ Store Securely',
        '   Paste it into the API Key field above',
        '',
        'Example:',
        'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx-us1'
      ],
      example: 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx-us1'
    }
  },
  activecampaign: {
    apiKey: {
      title: 'ActiveCampaign API Key – Step-by-Step',
      url: 'https://www.activecampaign.com',
      steps: [
        '1️⃣ Open ActiveCampaign',
        '   Go to 👉 https://www.activecampaign.com',
        '   Sign in to your account',
        '',
        '2️⃣ Go to Settings',
        '   Click "Settings" in left sidebar',
        '   Click "Developer"',
        '',
        '3️⃣ View API Credentials',
        '   Find "API Access" section',
        '   Your API URL and API Key are shown',
        '',
        '4️⃣ Copy API Key',
        '   Click "Show" to reveal API Key',
        '   Copy the API key',
        '   Also note your API URL',
        '',
        '5️⃣ Store Securely',
        '   Paste it into the API Key field above',
        '   Never share publicly',
        '',
        'Example:',
        'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
      ],
      example: 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
    },
    apiUrl: {
      title: 'ActiveCampaign API URL – Step-by-Step',
      url: 'https://www.activecampaign.com',
      steps: [
        '1️⃣ Open ActiveCampaign',
        '   Go to 👉 https://www.activecampaign.com',
        '   Sign in to your account',
        '',
        '2️⃣ Go to Settings',
        '   Click "Settings" → "Developer"',
        '',
        '3️⃣ Get API URL',
        '   In "API Access" section',
        '   Find "API URL"',
        '   Format: https://youraccount.api-us1.com',
        '',
        '4️⃣ Copy API URL',
        '   Copy the full URL',
        '   Include https://',
        '',
        '5️⃣ Use the API URL',
        '   Paste it into the API URL field above',
        '',
        'Example:',
        'https://youraccount.api-us1.com'
      ],
      example: 'https://youraccount.api-us1.com'
    }
  },
  // GitHub
  github: {
    _github_connection_info: {
      title: 'GitHub OAuth Connection – How It Works',
      url: '/settings/connections',
      steps: [
        '🔐 OAuth Authentication',
        '   GitHub nodes use OAuth authentication via Supabase.',
        '   No manual token entry required!',
        '',
        '1️⃣ Connect GitHub Account',
        '   Go to Settings → Connections',
        '   Click "Connect GitHub" button',
        '   Authorize CtrlChecks to access your GitHub account',
        '',
        '2️⃣ Automatic Token Management',
        '   Your GitHub OAuth token is securely stored',
        '   Token is automatically retrieved when workflows run',
        '   No need to copy/paste tokens manually',
        '',
        '3️⃣ Required Scopes',
        '   The OAuth connection requests these scopes:',
        '   • repo (repository access)',
        '   • user (user profile data)',
        '   • read:org (organization membership)',
        '',
        '4️⃣ Disconnect & Reconnect',
        '   To disconnect: Settings → Connections → Disconnect GitHub',
        '   To reconnect: Click "Connect GitHub" again',
        '',
        '✅ Once connected, you can use GitHub nodes in workflows!'
      ],
      example: 'Connected: @your-username'
    },
    operation: {
      title: 'How to get Operation?',
      steps: [
        'You don’t get this from anywhere—you choose it from the dropdown in this node.',
        '',
        '• Get Repository / List Repositories – Get repo details or list repos. Need Owner and Repository.',
        '',
        '• Create Issue / Update Issue / Close Issue / List Issues / Get Issue / Add Issue Comment – Manage issues. Need Owner, Repository; for update/close/get/comment, need Issue Number.',
        '',
        '• Create Pull Request / Update PR / Merge PR / List PRs / Get PR / Add PR Comment – Manage pull requests. Need Owner, Repository; for update/merge/get/comment, need Pull Request Number.',
        '',
        '• Create Branch / List Branches / Get Branch / Delete Branch – Manage branches. Need Owner, Repository; for create/get/delete, need Branch Name or SHA.',
        '',
        '• Create Commit / List Commits / Get Commit – Manage commits. Need Owner, Repository; for create, need Branch/Ref, File Path, File Content, Commit Message; for get, need Commit SHA.',
        '',
        '• Create Release / List Releases / Get Release – Manage releases. Need Owner, Repository; for create, need Tag Name; for get, need Release ID.',
        '',
        '• Get Workflow Runs / Trigger Workflow – Workflow runs. Need Owner, Repository, Workflow ID (filename in .github/workflows/), Branch/Ref.',
        '',
        '• List Contributors – List repo contributors. Need Owner and Repository.'
      ],
      example: 'Create Issue'
    },
    owner: {
      title: 'GitHub Owner/Organization – Step-by-Step',
      steps: [
        '1️⃣ Open your GitHub repository in the browser',
        '',
        '2️⃣ Look at the URL',
        '   Format: https://github.com/OWNER/repo-name',
        '   OWNER is the first part after github.com/',
        '',
        '3️⃣ Copy the owner name',
        '   It is the username or organization name (e.g. octocat, microsoft)',
        '   No slashes, no repository name',
        '',
        '4️⃣ Paste into the Owner/Organization field above',
        '',
        'Example: For github.com/octocat/Hello-World, Owner is octocat'
      ],
      example: 'octocat'
    },
    repo: {
      title: 'GitHub Repository Name – Step-by-Step',
      steps: [
        '1️⃣ Open your GitHub repository in the browser',
        '',
        '2️⃣ Look at the URL',
        '   Format: https://github.com/owner/REPO-NAME',
        '   REPO-NAME is the second part after the owner',
        '',
        '3️⃣ Copy the repository name',
        '   Do not include .git (use Hello-World, not Hello-World.git)',
        '',
        '4️⃣ Paste into the Repository field above',
        '',
        'Example: For github.com/octocat/Hello-World, Repository is Hello-World'
      ],
      example: 'Hello-World'
    },
    title: {
      title: 'How to get Title?',
      steps: [
        'You type or provide the title—it is the headline for the issue or pull request.',
        '',
        '• Static: Type it directly, e.g. "Bug in login page", "Add API documentation"',
        '',
        '• Dynamic: If your platform supports expressions, use data from earlier steps, e.g. {{input.subject}} or "Deploy: {{trigger.env}}"',
        '',
        'Required for Create Issue and Create Pull Request. Ignored for other operations.'
      ],
      example: 'Bug in login page'
    },
    body: {
      title: 'How to get Body?',
      steps: [
        'You type or provide the body—the description of the issue or pull request. Markdown supported.',
        '',
        '• Static: Type or paste directly. You can use Markdown (headers, lists, code blocks).',
        '',
        '• Dynamic: Use an expression from a previous step, e.g. {{aiNode.summary}} or {{trigger.body}}',
        '',
        'Required for Create Issue and Create Pull Request. Ignored for other operations.'
      ],
      example: 'Issue/PR description'
    },
    workflowId: {
      title: 'GitHub Workflow ID – Step-by-Step',
      steps: [
        '1️⃣ Open your GitHub repository',
        '',
        '2️⃣ Go to .github/workflows/ folder',
        '   Or click Actions → Workflows',
        '',
        '3️⃣ The Workflow ID is the filename',
        '   e.g. deploy.yml, ci.yml',
        '',
        '4️⃣ Copy the filename (including .yml or .yaml)',
        '',
        '5️⃣ Paste into the Workflow ID field above',
        '',
        'Example: deploy.yml'
      ],
      example: 'deploy.yml'
    },
    ref: {
      title: 'GitHub Branch/Ref – Step-by-Step',
      steps: [
        '1️⃣ Open your GitHub repository',
        '',
        '2️⃣ Click the branch dropdown',
        '   It shows the current branch (e.g. main, master)',
        '',
        '3️⃣ Copy the branch name you want',
        '   e.g. main, develop, feature-branch',
        '',
        '4️⃣ Paste into the Branch/Ref field above',
        '',
        'Used for Trigger Workflow (which branch to run on), Create Commit (which branch to commit to), etc. Default is often main.',
        '',
        'Example: main'
      ],
      example: 'main'
    },
    issueNumber: {
      title: 'GitHub Issue Number – Step-by-Step',
      steps: [
        '1️⃣ Open your GitHub repository',
        '',
        '2️⃣ Click the Issues tab',
        '',
        '3️⃣ Open the issue you want',
        '',
        '4️⃣ Look at the URL',
        '   Format: github.com/owner/repo/issues/123',
        '   The number after /issues/ is the Issue Number',
        '',
        '5️⃣ Or look at the issue title',
        '   It shows #123 — the number is 123',
        '',
        '6️⃣ Enter only the number (e.g. 123), not #123',
        '',
        'Example: 123'
      ],
      example: '123'
    },
    prNumber: {
      title: 'GitHub Pull Request Number – Step-by-Step',
      steps: [
        '1️⃣ Open your GitHub repository',
        '',
        '2️⃣ Click the Pull requests tab',
        '',
        '3️⃣ Open the pull request you want',
        '',
        '4️⃣ Look at the URL',
        '   Format: github.com/owner/repo/pull/456',
        '   The number after /pull/ is the PR Number',
        '',
        '5️⃣ Or look at the PR title',
        '   It shows #456 — the number is 456',
        '',
        '6️⃣ Enter only the number (e.g. 456), not #456',
        '',
        'Example: 456'
      ],
      example: '456'
    },
    state: {
      title: 'How to get State?',
      steps: [
        'You choose from the dropdown in this node: Open or Closed.',
        '',
        '• Open – Issue is open.',
        '• Closed – Issue is closed.',
        '',
        'Used for Update Issue (e.g. to close or reopen). Ignored for other operations.'
      ],
      example: 'open'
    },
    comment: {
      title: 'How to get Comment?',
      steps: [
        'You type or provide the comment—the text that will appear on the issue or pull request.',
        '',
        '• Static: Type or paste directly.',
        '',
        '• Dynamic: Use an expression, e.g. {{aiNode.summary}} or "Deployment completed at {{now}}"',
        '',
        'Required for Add Issue Comment and Add PR Comment. Ignored for other operations.'
      ],
      example: 'Your comment text'
    },
    mergeMethod: {
      title: 'How to get Merge Method?',
      steps: [
        'You choose from the dropdown in this node: Merge, Squash, or Rebase.',
        '',
        '• Merge – Creates a merge commit.',
        '• Squash – Combines all commits into one.',
        '• Rebase – Replays commits on top of the base branch.',
        '',
        'Used only for Merge Pull Request. Ignored for other operations.'
      ],
      example: 'merge'
    },
    branchName: {
      title: 'How to get Branch Name?',
      steps: [
        'You type the branch name—the name you want for the new branch, or the name of the branch to get/delete.',
        '',
        '• Static: Type it directly, e.g. feature-ai, fix/login-bug',
        '',
        '• Dynamic: Use an expression, e.g. {{input.branch}} or feature-{{trigger.id}}',
        '',
        'Used for Create Branch, Get Branch, Delete Branch. Ignored for other operations.'
      ],
      example: 'feature-branch'
    },
    sha: {
      title: 'GitHub SHA/Commit Hash – Step-by-Step',
      steps: [
        '1️⃣ Open your GitHub repository',
        '',
        '2️⃣ Click Commits (or the commit history)',
        '',
        '3️⃣ Click on a commit to open its details',
        '',
        '4️⃣ The SHA is the long hash at the top',
        '   40 characters (e.g. abc123def456789...)',
        '   You can also use the short SHA (first 7–12 characters)',
        '',
        '5️⃣ Copy and paste into the SHA/Commit Hash field above',
        '',
        'From command line: run "git log" and copy the commit hash.',
        '',
        'Example: abc123def456789...'
      ],
      example: 'abc123def456'
    },
    commitMessage: {
      title: 'How to get Commit Message?',
      steps: [
        'You type or provide the message—a short description of the change.',
        '',
        '• Static: Type it directly, e.g. "Updated documentation", "Fix login bug"',
        '',
        '• Dynamic: Use an expression, e.g. "Deploy {{trigger.env}}" or {{aiNode.summary}}',
        '',
        'Required for Create Commit. Ignored for other operations.'
      ],
      example: 'Updated documentation'
    },
    filePath: {
      title: 'GitHub File Path – Step-by-Step',
      steps: [
        '1️⃣ Open your GitHub repository and navigate to the file (or where you want to create it)',
        '',
        '2️⃣ Look at the URL or breadcrumb',
        '   The path after the branch name is the File Path',
        '   e.g. docs/readme.md, src/utils.js',
        '',
        '3️⃣ Or build it: folder(s) + filename',
        '   Use forward slashes (/). No leading slash.',
        '',
        '4️⃣ Paste into the File Path field above',
        '',
        'Example: docs/readme.md'
      ],
      example: 'docs/readme.md'
    },
    fileContent: {
      title: 'How to get File Content?',
      steps: [
        'You provide the content—the exact text or bytes to write to the file.',
        '',
        '• From a previous step: Use output from another node (e.g. generated doc, report), e.g. {{aiNode.content}} or {{readFileNode.content}}.',
        '',
        '• Static: Type or paste text. For binary files, the platform may require base64; use a step that outputs base64 if needed.',
        '',
        'Required for Create Commit when creating/updating a file. Ignored for other operations.'
      ],
      example: 'File content (base64 or text)'
    },
    tagName: {
      title: 'How to get Tag Name?',
      steps: [
        'You type the tag name—the version or tag you want for the release.',
        '',
        '• Static: Type it directly, e.g. v1.0.0, v2.1.3',
        '',
        '• Dynamic: Use an expression, e.g. v{{input.version}} or release-{{trigger.env}}',
        '',
        'Required for Create Release. Ignored for other operations.'
      ],
      example: 'v1.0.0'
    },
    releaseName: {
      title: 'How to get Release Name?',
      steps: [
        'You type the release name—the human-readable title shown on the Releases page.',
        '',
        '• Static: Type it directly, e.g. "Release v1.0.0", "January 2024 Release"',
        '',
        '• Dynamic: Use an expression if your platform supports it.',
        '',
        'Used for Create Release. Ignored for other operations.'
      ],
      example: 'Release v1.0.0'
    },
    releaseBody: {
      title: 'How to get Release Body?',
      steps: [
        'You type or provide the release notes—the description shown on the release page. Markdown supported.',
        '',
        '• Static: Type or paste. You can use Markdown (headers, lists).',
        '',
        '• Dynamic: Use an expression, e.g. {{changelogNode.markdown}} or "Built from {{trigger.branch}}"',
        '',
        'Used for Create Release. Ignored for other operations.'
      ],
      example: 'Release notes and description'
    },
    releaseId: {
      title: 'GitHub Release ID – Step-by-Step',
      steps: [
        '1️⃣ Open your GitHub repository',
        '',
        '2️⃣ Click Releases (right sidebar or repo → Releases)',
        '',
        '3️⃣ Click on a release to view details',
        '',
        '4️⃣ The Release ID is a numeric ID from the API',
        '   Use List Releases first; each release in the response has an "id" field',
        '   Or call GitHub API: GET /repos/owner/repo/releases and copy the "id" of the release you want',
        '',
        '5️⃣ Paste into the Release ID field above',
        '',
        'Example: 12345'
      ],
      example: '12345'
    },
    commitSha: {
      title: 'GitHub Commit SHA – Step-by-Step',
      steps: [
        '1️⃣ Open your GitHub repository',
        '',
        '2️⃣ Click Commits or go to a specific commit',
        '',
        '3️⃣ The commit SHA is the long hash shown',
        '   e.g. abc123def456789... (full 40 chars or short 7–12)',
        '',
        '4️⃣ Copy and paste into the Commit SHA field above',
        '',
        'You can also get it from a previous List Commits or Create Commit response (sha field).',
        '',
        'Example: abc123def456'
      ],
      example: 'abc123def456'
    }
  },
  // E-commerce
  woocommerce: {
    consumerKey: {
      title: 'WooCommerce Consumer Key – Step-by-Step',
      steps: [
        '1️⃣ Open WooCommerce Admin',
        '   Log in to your WordPress admin',
        '   Navigate to WooCommerce',
        '',
        '2️⃣ Go to REST API Settings',
        '   Click "WooCommerce" → "Settings"',
        '   Click "Advanced" tab',
        '   Click "REST API"',
        '',
        '3️⃣ Add API Key',
        '   Click "Add key" button',
        '   Give it a description (e.g., "Workflow Integration")',
        '   Select user (admin recommended)',
        '   Set permissions (Read/Write)',
        '',
        '4️⃣ Generate Key',
        '   Click "Generate API key"',
        '   Copy the "Consumer key"',
        '   It starts with "ck_"',
        '',
        '5️⃣ Store Securely',
        '   Paste it into the Consumer Key field above',
        '   You\'ll also need Consumer Secret',
        '',
        'Example:',
        'ck_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
      ],
      example: 'ck_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
    },
    consumerSecret: {
      title: 'WooCommerce Consumer Secret – Step-by-Step',
      steps: [
        '1️⃣ In WooCommerce REST API Settings',
        '   After generating API key',
        '   Find "Consumer secret"',
        '',
        '2️⃣ Copy Consumer Secret',
        '   ⚠️ IMPORTANT: Copy immediately!',
        '   It starts with "cs_"',
        '   You may only see it once',
        '',
        '3️⃣ Store Securely',
        '   Paste it into the Consumer Secret field above',
        '   Never share publicly',
        '',
        'Example:',
        'cs_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
      ],
      example: 'cs_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
    },
    storeUrl: {
      title: 'WooCommerce Store URL – Step-by-Step',
      steps: [
        '1️⃣ Open Your Store',
        '   Go to your WooCommerce store',
        '   Or WordPress admin panel',
        '',
        '2️⃣ Get Store URL',
        '   The URL is your website domain',
        '   Format: https://yourstore.com',
        '   Don\'t include /wp-admin or paths',
        '',
        '3️⃣ Use the Store URL',
        '   Paste it into the Store URL field above',
        '   Include https:// or http://',
        '   No trailing slash',
        '',
        'Example:',
        'https://yourstore.com'
      ],
      example: 'https://yourstore.com'
    }
  },
  bigcommerce: {
    storeHash: {
      title: 'BigCommerce Store Hash – Step-by-Step',
      url: 'https://login.bigcommerce.com',
      steps: [
        '1️⃣ Open BigCommerce',
        '   Go to 👉 https://login.bigcommerce.com',
        '   Sign in to your account',
        '',
        '2️⃣ Go to Advanced Settings',
        '   Click "Advanced Settings" in left sidebar',
        '   Click "API Accounts"',
        '',
        '3️⃣ Create API Account',
        '   Click "Create API Account"',
        '   Give it a name',
        '   Select OAuth scopes',
        '',
        '4️⃣ Get Store Hash',
        '   After creating, you\'ll see credentials',
        '   Store Hash is in the API Path',
        '   Format: stores/STORE_HASH/v3/...',
        '   Copy the STORE_HASH part',
        '',
        '5️⃣ Use the Store Hash',
        '   Paste it into the Store Hash field above',
        '   You\'ll also need Access Token',
        '',
        'Example:',
        'abc123def4'
      ],
      example: 'abc123def4'
    },
    accessToken: {
      title: 'BigCommerce Access Token – Step-by-Step',
      url: 'https://login.bigcommerce.com',
      steps: [
        '1️⃣ Open BigCommerce',
        '   Go to 👉 https://login.bigcommerce.com',
        '   Sign in to your account',
        '',
        '2️⃣ Go to API Accounts',
        '   Advanced Settings → API Accounts',
        '   Create or select API account',
        '',
        '3️⃣ Get Access Token',
        '   After creating API account',
        '   Copy the "Access Token"',
        '   ⚠️ You may only see it once!',
        '',
        '4️⃣ Store Securely',
        '   Paste it into the Access Token field above',
        '',
        'Example:',
        'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
      ],
      example: 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
    },
    operation: {
      title: 'How to get Operation?',
      steps: [
        'You don’t get this from anywhere—you choose it from the dropdown in this node.',
        '',
        '• Get Product – Requires Product ID.',
        '',
        '• List Products – Optional Limit.',
        '',
        '• Create Product – Use product data from your workflow.',
        '',
        '• Update Product – Requires Product ID.',
        '',
        '• Get Order – Requires Order ID.',
        '',
        '• List Orders – Optional Limit.',
        '',
        '• Get Customer – Requires Customer ID.',
      ],
      example: 'Get Product'
    },
    productId: {
      title: 'BigCommerce Product ID – Step-by-Step',
      steps: [
        '1️⃣ Open the product in BigCommerce',
        '',
        '2️⃣ Copy the numeric ID from the URL',
        '',
        '3️⃣ Paste it into the Product ID field',
        '',
        'Example:',
        '123'
      ],
      example: '123'
    },
    orderId: {
      title: 'BigCommerce Order ID – Step-by-Step',
      steps: [
        '1️⃣ Go to Orders in BigCommerce',
        '',
        '2️⃣ Open the order',
        '',
        '3️⃣ Copy the numeric ID from the URL or order details',
        '',
        'Example:',
        '456'
      ],
      example: '456'
    },
    customerId: {
      title: 'BigCommerce Customer ID – Step-by-Step',
      steps: [
        '1️⃣ Go to Customers in BigCommerce',
        '',
        '2️⃣ Open the customer record',
        '',
        '3️⃣ Copy the numeric ID from the URL',
        '',
        'Example:',
        '789'
      ],
      example: '789'
    },
    limit: {
      title: 'How to get Limit?',
      steps: [
        'Enter how many results you want returned.',
        '',
        'Default is 250. Lower it for faster responses.',
        '',
        'Used for List Products and List Orders.'
      ],
      example: '250'
    }
  },
  magento: {
    accessToken: {
      title: 'Magento Access Token – Step-by-Step',
      steps: [
        '1️⃣ Open Magento Admin',
        '   Log in to your Magento admin panel',
        '   Navigate to System',
        '',
        '2️⃣ Go to Integrations',
        '   System → Extensions → Integrations',
        '   Or: Stores → Configuration → Services → OAuth',
        '',
        '3️⃣ Create Integration',
        '   Click "Add New Integration"',
        '   Fill in name and email',
        '   Set API access permissions',
        '',
        '4️⃣ Activate and Get Token',
        '   After creating, activate integration',
        '   Copy the Access Token',
        '   Or use OAuth 2.0 flow',
        '',
        '5️⃣ Store Securely',
        '   Paste it into the Access Token field above',
        '',
        'Example:',
        'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
      ],
      example: 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
    }
  },
  // Communication Services
  slack_message: {
    channel: {
      title: 'Slack Channel',
      url: 'https://api.slack.com/methods/chat.postMessage',
      steps: [
        'Use a channel name such as #general, a channel ID such as C01234567, or a user ID for direct messages.',
        'For private channels, invite the connected Slack bot before running the workflow.',
        'Use Slack channel details to copy a stable channel ID when names may change.'
      ],
      example: '#alerts'
    },
    message: {
      title: 'Slack Message',
      steps: [
        'Write the message text to send with chat.postMessage.',
        'Slack markdown such as *bold*, _italic_, and `code` is supported.',
        'Use template values like {{input.orderId}} for dynamic content.'
      ],
      example: 'New order: {{input.orderId}}'
    },
    blocks: {
      title: 'Slack Blocks JSON',
      url: 'https://app.slack.com/block-kit-builder',
      steps: [
        'Use Slack Block Kit Builder to design rich message blocks.',
        'Copy the JSON array and paste it into Blocks.',
        'Keep Message filled as fallback text for notifications.'
      ],
      example: '[{"type":"section","text":{"type":"mrkdwn","text":"Hello"}}]'
    }
  },
  slack_webhook: {
    message: {
      title: 'Slack Webhook Message',
      steps: [
        'Write the simple text payload sent through the selected Slack Incoming Webhook connection.',
        'The webhook URL is stored in Connections, not in this node field.',
        'Slack markdown and template values like {{input.field}} are supported.'
      ],
      example: 'New user registered: {{input.email}}'
    }
  },  microsoft_teams: {
    webhookUrl: {
      title: 'Microsoft Teams Webhook URL - Step-by-Step',
      steps: [
        '1. Open Microsoft Teams',
        '   Open Teams app or web',
        '   Go to your team/channel',
        '',
        '2. Go to Channel Settings',
        '   Click "..." next to channel name',
        '   Click "Connectors"',
        '',
        '3. Find Incoming Webhook',
        '   Search for "Incoming Webhook"',
        '   Click "Configure"',
        '',
        '4. Configure Webhook',
        '   Give it a name',
        '   Optionally upload image',
        '   Click "Create"',
        '',
        '5. Copy Webhook URL',
        '   You\'ll see the Webhook URL',
        '   Format: https://outlook.office.com/webhook/...',
        '   Copy the entire URL',
        '',
        '6. Store Securely',
        '   Paste it into the Webhook URL field above',
        '   Never share publicly',
        '',
        'Example:',
        'https://outlook.office.com/webhook/xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx@xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx/IncomingWebhook/xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx/xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx'
      ],
      example: 'https://outlook.office.com/webhook/xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx@xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx/IncomingWebhook/xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx/xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx'
    },
    message: {
      title: 'How to write Message?',
      steps: [
        'Message is the main content sent to Teams.',
        '',
        'The webhook sends this value as the text field.',
        'Use dynamic values like {{input.field}} if needed.'
      ],
      example: 'Task completed successfully'
    }
  },
  outlook: {
    operation: {
      title: 'How to choose Operation?',
      steps: [
        'Choose Send Email.',
        'Outlook currently sends email through Microsoft Graph sendMail.',
        'Only Send Email is available in the Outlook operation dropdown.'
      ],
      example: 'send_email'
    },
    to: {
      title: 'How to set To?',
      steps: [
        'Enter one recipient email address, or comma-separated addresses for multiple recipients.',
        'Use workflow values such as {{$json.email}} when the recipient comes from an earlier step.',
        'Do not put Microsoft tokens or connection details here; the Microsoft connection is selected separately.'
      ],
      example: 'customer@example.com'
    },
    subject: {
      title: 'How to write Subject?',
      steps: [
        'Enter the email subject line.',
        'Use workflow values such as {{$json.subject}} when another node prepared the subject.',
        'Keep it clear and short so recipients can scan it in Outlook.'
      ],
      example: 'Weekly report'
    },
    body: {
      title: 'How to write Body?',
      steps: [
        'Enter the plain-text message body.',
        'Use workflow values such as {{$json.message}} or {{$json.digest}} for dynamic content.',
        'The current Outlook executor sends this value as Text content through Microsoft Graph.'
      ],
      example: 'Your report is ready.'
    }
  },
  salesforce: {
    instanceUrl: {
      title: 'Salesforce Instance URL – Step-by-Step',
      steps: [
        'Instance URL is your Salesforce org URL.',
        '',
        'Example: https://yourinstance.salesforce.com',
        'Copy it from your browser after logging in.'
      ],
      example: 'https://yourinstance.salesforce.com'
    },
    accessToken: {
      title: 'Salesforce Access Token – Step-by-Step',
      steps: [
        'Access Token is generated via OAuth.',
        '',
        'Use your Salesforce OAuth flow to get it,',
        'then paste it into this field.'
      ],
      example: '00Dxx0000000000!AQ0...'
    },
    resource: {
      title: 'How to choose Resource/Object?',
      steps: [
        'Select the Salesforce object you want to work with.',
        '',
        'Common objects: Account, Contact, Lead, Opportunity, Case.',
        'Use Custom Object if you need a custom object.'
      ],
      example: 'Contact'
    },
    customObject: {
      title: 'How to set Custom Object API Name?',
      steps: [
        'Required only if Resource is Custom Object.',
        '',
        'Find the API name in Salesforce Setup → Object Manager.',
        'Custom objects end with __c.'
      ],
      example: 'CustomObject__c'
    },
    operation: {
      title: 'How to choose Operation?',
      steps: [
        'Choose the action to perform.',
        '',
        'Examples:',
        '• query (SOQL)',
        '• search (SOSL)',
        '• get / create / update / delete',
        '• upsert / bulk operations'
      ],
      example: 'query'
    },
    soql: {
      title: 'How to write SOQL Query?',
      steps: [
        'SOQL is used for structured queries.',
        '',
        'Example:',
        'SELECT Id, Name, Email FROM Contact WHERE Email != null'
      ],
      example: 'SELECT Id, Name FROM Contact LIMIT 10'
    },
    sosl: {
      title: 'How to write SOSL Search Query?',
      steps: [
        'SOSL searches text across objects.',
        '',
        'Example:',
        'FIND {john} IN ALL FIELDS RETURNING Contact(Id, Name, Email)'
      ],
      example: 'FIND {john} IN ALL FIELDS RETURNING Contact(Id, Name, Email)'
    },
    id: {
      title: 'How to get Record ID?',
      steps: [
        'Record ID is the unique Salesforce identifier.',
        '',
        'Copy it from the record URL or from a query result.'
      ],
      example: '0035g00000ABCDe'
    },
    fields: {
      title: 'How to set Fields (JSON)?',
      steps: [
        'Fields is a JSON object with Salesforce field API names.',
        '',
        'Example:',
        '{ "FirstName": "John", "LastName": "Doe", "Email": "john@example.com" }'
      ],
      example: '{"FirstName":"John","LastName":"Doe","Email":"john@example.com"}'
    },
    externalIdField: {
      title: 'How to set External ID Field?',
      steps: [
        'Used for upsert operations.',
        '',
        'Example: Email or External_Id__c'
      ],
      example: 'Email'
    },
    externalIdValue: {
      title: 'How to set External ID Value?',
      steps: [
        'The value to match for upsert.',
        '',
        'Example: john@example.com'
      ],
      example: 'john@example.com'
    }
  },
  zoho_crm: {
    accessToken: {
      title: 'Zoho CRM Access Token – Step-by-Step',
      steps: [
        'Access Token authenticates this node with your Zoho CRM account. It is generated via OAuth.',
        '',
        'Step 1: Go to Zoho API Console.',
        '• Open 👉 https://api-console.zoho.com',
        '• Sign in with the same Zoho account you use for CRM.',
        '',
        'Step 2: Create or select a Server-based Client.',
        '• Click "Add Client".',
        '• Choose "Server-based" (or the client type you use for backend apps).',
        '• Set Redirect URI to your app’s OAuth callback URL.',
        '',
        'Step 3: Generate an authorization code in your app.',
        '• Use the Client ID + Client Secret from the Zoho client.',
        '• Direct the user to the Zoho authorization URL.',
        '• After consent, Zoho redirects back with code=? in the URL.',
        '',
        'Step 4: Exchange the authorization code for an access token.',
        '• Your backend calls Zoho OAuth token endpoint with code, client_id, client_secret, redirect_uri, and grant_type=authorization_code.',
        '• Zoho responds with access_token and refresh_token.',
        '',
        'Step 5: Paste the access_token here.',
        '• Use ONLY the access_token string (starts with 1000.).',
        '• Store refresh_token securely in your backend to rotate tokens when they expire.',
        '',
        'Security tips:',
        '• Do not hard-code tokens in source control.',
        '• Prefer environment variables or a secrets manager.'
      ],
      example: '1000.xxxxxxx'
    },
    apiDomain: {
      title: 'How to choose API Domain?',
      steps: [
        'API Domain is the base URL for Zoho CRM APIs and depends on your Zoho data center (region).',
        '',
        'If you sign in at:',
        '• crm.zoho.com → use https://www.zohoapis.com (US).',
        '• crm.zoho.eu → use https://www.zohoapis.eu (EU).',
        '• crm.zoho.in → use https://www.zohoapis.in (IN).',
        '• crm.zoho.com.cn → use https://www.zohoapis.com.cn (CN).',
        '• crm.zoho.com.au → use https://www.zohoapis.com.au (AU).',
        '• crm.zoho.jp → use https://www.zohoapis.jp (JP).',
        '',
        'Tip:',
        '• Match the region where your Zoho CRM account is hosted.',
        '• Using the wrong domain will cause "invalid domain" or auth errors.'
      ],
      example: 'https://www.zohoapis.com'
    },
    module: {
      title: 'How to choose Module?',
      steps: [
        'Module is the Zoho CRM object you want to work with.',
        '',
        'Common standard modules:',
        '• Leads – potential customers before qualification.',
        '• Contacts – people you have a relationship with.',
        '• Accounts – companies or organizations.',
        '• Deals – opportunities or sales pipelines.',
        '• Tasks / Events / Calls – activities linked to records.',
        '',
        'If you select "Custom Module":',
        '• You must also provide Custom Module API Name.',
        '• This is the API name configured in Zoho CRM (e.g., CustomModule1).',
        '',
        'Tip: Choose the module that actually stores the records you want to create, update, or read.'
      ],
      example: 'Contacts'
    },
    customModule: {
      title: 'How to set Custom Module API Name?',
      steps: [
        'This is required only if Module is set to "Custom Module".',
        '',
        'Step 1: Open Zoho CRM → Setup → Developer Space → APIs → API Names (or Modules & Fields).',
        'Step 2: Find your custom module in the list.',
        'Step 3: Copy the API Name (NOT the display label).',
        '• It often looks like CustomModule1, Deals_Extension, etc.',
        '',
        'Paste that exact API name here. The name must match Zoho CRM exactly or requests will fail with "invalid module" errors.'
      ],
      example: 'CustomModule1'
    },
    operation: {
      title: 'How to choose Operation?',
      steps: [
        'Operation defines what action you want to perform in Zoho CRM.',
        '',
        'Core operations:',
        '• Get – Fetch a single record by Record ID.',
        '• Get Many – List records from a module (supports pagination and Fields).',
        '• Create – Insert a new record using Data (JSON).',
        '• Update – Modify an existing record by Record ID + Data (JSON).',
        '• Delete – Remove a record by Record ID.',
        '• Search – Find records matching Search Criteria.',
        '• Upsert – Create or update based on unique field (e.g., email).',
        '',
        'Bulk operations:',
        '• Bulk Create / Bulk Update – Send multiple records at once (Records Array).',
        '',
        'Tip:',
        '• After choosing an operation, check which fields are required (Record ID, Data, Criteria, etc.) and fill only those relevant to that operation.'
      ],
      example: 'get'
    },
    id: {
      title: 'How to get Record ID?',
      steps: [
        'Record ID is the unique Zoho CRM identifier for a single record. It is required for Get, Update, and Delete.',
        '',
        'Option 1 – From Zoho CRM UI:',
        '• Open the record in your browser.',
        '• Look at the URL: crm.zoho.com/crm/org123456789/tab/Accounts/4876876000000123456.',
        '• The long number at the end is the Record ID.',
        '',
        'Option 2 – From API response:',
        '• When you create or search for records via API, the response includes an "id" field.',
        '• Use that id value directly here.',
        '',
        'Tip: Store Record IDs from previous nodes (e.g., Create or Search) and reference them using expressions like {{previousNode.id}}.'
      ],
      example: '4876876000000123456'
    },
    data: {
      title: 'How to set Data (JSON)?',
      steps: [
        'Data is a JSON object that defines the fields and values to send to Zoho CRM. It is required for Create, Update, Upsert, and bulk write operations.',
        '',
        'Rules:',
        '• Keys must be Zoho field API names (not labels).',
        '• Values should match the field type (text, number, date, lookup, etc.).',
        '',
        'Examples (single record):',
        '{',
        '  "Last_Name": "Sharma",',
        '  "First_Name": "Amit",',
        '  "Email": "amit.sharma@example.com",',
        '  "Phone": "9876543210"',
        '}',
        '',
        'Examples (for Bulk Create/Update with Records Array):',
        '[',
        '  { "Last_Name": "Sharma", "Email": "amit@example.com" },',
        '  { "Last_Name": "Patel", "Email": "patel@example.com" }',
        ']',
        '',
        'Tip: Use Zoho CRM "Fields" / "API Names" screen to confirm exact field keys before sending data.'
      ],
      example: '{"Last_Name":"Sharma","First_Name":"Amit","Email":"amit.sharma@example.com"}'
    },
    criteria: {
      title: 'How to set Search Criteria?',
      steps: [
        'Search Criteria is used when Operation = Search. It tells Zoho which records to return.',
        '',
        'Basic pattern:',
        '(Field_API_Name:operator:value)',
        '',
        'Common operators:',
        '• equals – exact match',
        '• starts_with – prefix match',
        '• contains – substring match',
        '• greater_than, less_than – numeric/date comparisons',
        '',
        'Examples:',
        '(Email:equals:amit.sharma@example.com)',
        '(Last_Name:starts_with:Shar)',
        '',
        'You can also combine with AND/OR:',
        '((Last_Name:equals:Sharma)and(Email:contains:@example.com))',
        '',
        'Tip: Always use field API names in criteria, not display labels.'
      ],
      example: '(Email:equals:amit.sharma@example.com)'
    },
    fields: {
      title: 'How to set Fields?',
      steps: [
        'Fields controls which columns Zoho CRM returns in the response.',
        '',
        'Format: comma-separated list of field API names.',
        'Examples:',
        '• id,First_Name,Last_Name,Email',
        '• id,Account_Name,Deal_Name,Stage,Amount',
        '',
        'Tips:',
        '• Use this to reduce payload size and speed up responses.',
        '• If left empty, Zoho may return many default fields, which can be heavy for large datasets.'
      ],
      example: 'id,First_Name,Last_Name,Email'
    },
    page: {
      title: 'How to set Page Number?',
      steps: [
        'Page controls which "slice" of results you are viewing when listing records (Get Many or Search).',
        '',
        'Rules:',
        '• Starts at 1 (Page = 1 is the first page).',
        '• Use together with Records Per Page to navigate.',
        '',
        'Examples:',
        '• Page 1, Per Page 200 → first 200 records.',
        '• Page 2, Per Page 200 → next 200 records (201–400).',
        '',
        'Tip: For cursor-based pagination or very large datasets, consider storing last page processed and resuming from there.'
      ],
      example: '1'
    },
    perPage: {
      title: 'How to set Records Per Page?',
      steps: [
        'Records Per Page controls how many records Zoho returns per request.',
        '',
        'Rules:',
        '• Maximum allowed by Zoho CRM is typically 200.',
        '• Higher values reduce the number of API calls but increase response size.',
        '',
        'Recommendations:',
        '• 50–100 for most workflows.',
        '• 200 when you need to process many records and your system can handle larger responses.',
        '',
        'Tip: Combine this with Page Number to iterate through all results safely.'
      ],
      example: '200'
    }
  },
  // Cloud Storage
  aws_s3: {
    accessKeyId: {
      title: 'AWS Access Key ID – Step-by-Step',
      url: 'https://console.aws.amazon.com',
      steps: [
        '1️⃣ Open AWS Console',
        '   Go to 👉 https://console.aws.amazon.com',
        '   Sign in to your AWS account',
        '',
        '2️⃣ Go to IAM',
        '   Search for "IAM" in top search bar',
        '   Click "IAM" service',
        '',
        '3️⃣ Navigate to Users',
        '   Click "Users" in left sidebar',
        '   Select your user or create new',
        '',
        '4️⃣ Go to Security Credentials',
        '   Click "Security credentials" tab',
        '   Scroll to "Access keys"',
        '',
        '5️⃣ Create Access Key',
        '   Click "Create access key"',
        '   Choose use case (Application running outside AWS)',
        '   Click "Next" → "Create access key"',
        '',
        '6️⃣ Copy Access Key ID',
        '   Copy the "Access key ID"',
        '   Also copy "Secret access key"',
        '   ⚠️ You won\'t see secret again!',
        '',
        '7️⃣ Store Securely',
        '   Paste it into the Access Key ID field above',
        '',
        'Example:',
        'AKIAIOSFODNN7EXAMPLE'
      ],
      example: 'AKIAIOSFODNN7EXAMPLE'
    },
    secretAccessKey: {
      title: 'AWS Secret Access Key – Step-by-Step',
      url: 'https://console.aws.amazon.com',
      steps: [
        '1️⃣ When Creating Access Key',
        '   After clicking "Create access key"',
        '   You\'ll see both keys',
        '',
        '2️⃣ Copy Secret Access Key',
        '   ⚠️ IMPORTANT: Copy immediately!',
        '   You won\'t be able to see it again',
        '   Click "Show" if hidden',
        '',
        '3️⃣ Download CSV (Optional)',
        '   Click "Download .csv file"',
        '   Store it securely',
        '',
        '4️⃣ Store Securely',
        '   Paste it into the Secret Access Key field above',
        '   Never commit to version control',
        '   Use IAM roles when possible',
        '',
        'Example:',
        'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY'
      ],
      example: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY'
    },
    bucket: {
      title: 'AWS S3 Bucket Name – Step-by-Step',
      url: 'https://console.aws.amazon.com/s3',
      steps: [
        '1️⃣ Open S3 Console',
        '   Go to 👉 https://console.aws.amazon.com/s3',
        '   Sign in to your AWS account',
        '',
        '2️⃣ View Buckets',
        '   You\'ll see list of S3 buckets',
        '   Or create new: Click "Create bucket"',
        '',
        '3️⃣ Get Bucket Name',
        '   Bucket name is shown in the list',
        '   Or from bucket URL',
        '',
        '4️⃣ Use the Bucket Name',
        '   Paste it into the Bucket field above',
        '   Must be globally unique',
        '',
        'Example:',
        'my-bucket-name'
      ],
      example: 'my-bucket-name'
    }
  },
  dropbox: {
    accessToken: {
      title: 'Dropbox Access Token – Step-by-Step',
      url: 'https://www.dropbox.com/developers',
      steps: [
        '1️⃣ Open Dropbox Developers',
        '   Go to 👉 https://www.dropbox.com/developers',
        '   Sign in with your Dropbox account',
        '',
        '2️⃣ Go to App Console',
        '   Click "App Console"',
        '   Or go to: dropbox.com/developers/apps',
        '',
        '3️⃣ Create App',
        '   Click "Create app"',
        '   Choose "Scoped access"',
        '   Select "Full Dropbox" or "App folder"',
        '   Give it a name',
        '',
        '4️⃣ Generate Access Token',
        '   In app settings, go to "Permissions"',
        '   Select required scopes',
        '   Go to "OAuth 2" tab',
        '   Click "Generate" under "Generated access token"',
        '',
        '5️⃣ Copy Access Token',
        '   Copy the access token',
        '   ⚠️ Keep it secure!',
        '',
        '6️⃣ Store Securely',
        '   Paste it into the Access Token field above',
        '',
        'Example:',
        'sl.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
      ],
      example: 'sl.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
    }
  },
  onedrive: {
    accessToken: {
      title: 'OneDrive Access Token – Step-by-Step',
      url: 'https://portal.azure.com',
      steps: [
        '1️⃣ Open Azure Portal',
        '   Go to 👉 https://portal.azure.com',
        '   Sign in with Microsoft account',
        '',
        '2️⃣ Register App',
        '   Go to Azure Active Directory',
        '   Click "App registrations"',
        '   Click "New registration"',
        '',
        '3️⃣ Configure App',
        '   Give it a name',
        '   Set redirect URI',
        '   Click "Register"',
        '',
        '4️⃣ Get Client ID and Secret',
        '   Copy "Application (client) ID"',
        '   Go to "Certificates & secrets"',
        '   Create new client secret',
        '',
        '5️⃣ Generate Access Token',
        '   Use OAuth 2.0 flow',
        '   Or use Microsoft Graph Explorer',
        '   Complete authorization',
        '',
        '6️⃣ Copy Access Token',
        '   After OAuth completes',
        '   Copy the access_token',
        '',
        '7️⃣ Store Securely',
        '   Paste it into the Access Token field above',
        '',
        'Example:',
        'eyJ0eXAiOiJKV1QiLCJubGciOiJSUzI1NiIsIng1dCI6...'
      ],
      example: 'eyJ0eXAiOiJKV1QiLCJubGciOiJSUzI1NiIsIng1dCI6...'
    }
  },
  box: {
    accessToken: {
      title: 'Box Access Token – Step-by-Step',
      url: 'https://developer.box.com',
      steps: [
        '1️⃣ Open Box Developers',
        '   Go to 👉 https://developer.box.com',
        '   Sign in with your Box account',
        '',
        '2️⃣ Go to App Console',
        '   Click "My Apps"',
        '   Or go to: box.com/developers/console',
        '',
        '3️⃣ Create App',
        '   Click "Create New App"',
        '   Choose "Custom App"',
        '   Select "Server Authentication (with JWT)"',
        '',
        '4️⃣ Configure App',
        '   Fill in app details',
        '   Go to "Configuration" tab',
        '   Set redirect URLs if needed',
        '',
        '5️⃣ Generate Access Token',
        '   Use OAuth 2.0 flow',
        '   Or use JWT authentication',
        '   Complete authorization',
        '',
        '6️⃣ Copy Access Token',
        '   After OAuth/JWT completes',
        '   Copy the access_token',
        '',
        '7️⃣ Store Securely',
        '   Paste it into the Access Token field above',
        '',
        'Example:',
        'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
      ],
      example: 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
    }
  },
  ftp: {
    host: {
      title: 'FTP Host – Step-by-Step',
      steps: [
        '1️⃣ Get FTP Server Address',
        '   From your hosting provider',
        '   Or from your FTP client settings',
        '   Usually: ftp.yourdomain.com or IP address',
        '',
        '2️⃣ Use the Host',
        '   Paste it into the Host field above',
        '   Don\'t include ftp:// prefix',
        '   Just the hostname or IP',
        '',
        'Examples:',
        'ftp.yourdomain.com',
        '192.168.1.100',
        'your-server.com'
      ],
      example: 'ftp.yourdomain.com'
    },
    port: {
      title: 'FTP Port – Step-by-Step',
      steps: [
        'Use the port provided by your FTP server.',
        '',
        'Common ports:',
        '• 21 – Standard FTP',
        '• 990 – FTPS (FTP over TLS/SSL)',
        '• 2121 – Custom port (if configured)',
        '',
        'If unsure, use 21 or ask your hosting provider.'
      ],
      example: '21'
    },
    username: {
      title: 'FTP Username – Step-by-Step',
      steps: [
        '1️⃣ Get FTP Username',
        '   From your hosting provider',
        '   Or from your FTP account settings',
        '   Usually provided when creating FTP account',
        '',
        '2️⃣ Use the Username',
        '   Paste it into the Username field above',
        '   You\'ll also need Password',
        '',
        'Example:',
        'ftpuser'
      ],
      example: 'ftpuser'
    },
    password: {
      title: 'FTP Password – Step-by-Step',
      steps: [
        '1️⃣ Get FTP Password',
        '   From your hosting provider',
        '   Or reset in hosting control panel',
        '',
        '2️⃣ Store Securely',
        '   Paste it into the Password field above',
        '   Never commit to version control',
        '',
        '⚠️ Security Note:',
        'Passwords are sensitive - store securely!'
      ],
      example: 'YourSecurePassword123!'
    },
    operation: {
      title: 'How to get Operation?',
      steps: [
        'You don’t get this from anywhere—you choose it from the dropdown in this node.',
        '',
        '• Get File – Download a file (requires Remote Path).',
        '',
        '• Put File – Upload a file (requires Remote Path + Content).',
        '',
        '• List Files – List files in a directory (requires Remote Path).',
        '',
        '• Delete File – Delete a file (requires Remote Path).'
      ],
      example: 'Get File'
    },
    remotePath: {
      title: 'How to get Remote Path?',
      steps: [
        'Remote Path is the file or folder location on the FTP server.',
        '',
        'For Get/Put/Delete: use the full file path.',
        'For List: use a folder path.',
        '',
        'Examples:',
        '/files/data.txt',
        '/var/www/uploads/',
        'files/backup.zip'
      ],
      example: '/files/data.txt'
    },
    content: {
      title: 'How to get Content (for Put)?',
      steps: [
        'Provide the file content you want to upload.',
        '',
        '• Text files: paste plain text.',
        '• Binary files: use base64 encoding.',
        '',
        'Examples:',
        'Hello World',
        'base64-encoded string for a PDF or image'
      ],
      example: 'Hello World'
    }
  },
  sftp: {
    host: {
      title: 'SFTP Host – Step-by-Step',
      steps: [
        '1️⃣ Get SFTP Server Address',
        '   From your hosting provider',
        '   Usually same as SSH host',
        '   Format: sftp.yourdomain.com or IP',
        '',
        '2️⃣ Use the Host',
        '   Paste it into the Host field above',
        '   Don\'t include sftp:// prefix',
        '',
        'Examples:',
        'sftp.yourdomain.com',
        '192.168.1.100',
        'your-server.com'
      ],
      example: 'sftp.yourdomain.com'
    },
    port: {
      title: 'SFTP Port – Step-by-Step',
      steps: [
        'Use the port provided by your SFTP server.',
        '',
        'Common ports:',
        '• 22 – Standard SFTP (SSH)',
        '• 2222 – Custom port (if configured)',
        '',
        'If unsure, use 22 or ask your server admin.'
      ],
      example: '22'
    },
    username: {
      title: 'SFTP Username – Step-by-Step',
      steps: [
        '1️⃣ Get SFTP Username',
        '   Usually same as SSH username',
        '   From your hosting provider',
        '',
        '2️⃣ Use the Username',
        '   Paste it into the Username field above',
        '',
        'Example:',
        'sftpuser'
      ],
      example: 'sftpuser'
    },
    password: {
      title: 'SFTP Password – Step-by-Step',
      steps: [
        '1️⃣ Get SFTP Password',
        '   From your hosting provider',
        '   Or use SSH key authentication',
        '',
        '2️⃣ Store Securely',
        '   Paste it into the Password field above',
        '   Consider using SSH keys instead',
        '',
        '⚠️ Security Note:',
        'Passwords are sensitive - store securely!'
      ],
      example: 'YourSecurePassword123!'
    },
    privateKey: {
      title: 'SFTP Private Key – Step-by-Step',
      steps: [
        'Use this only for key-based authentication.',
        '',
        '1️⃣ Locate your private key file',
        '   Common file names: id_rsa, id_ed25519, *.pem, *.ppk',
        '',
        '2️⃣ Open the private key file',
        '   Copy the full content including header/footer',
        '   Example header: -----BEGIN RSA PRIVATE KEY-----',
        '',
        '3️⃣ Paste it into the Private Key field above',
        '',
        'Make sure the matching public key is in the server\'s authorized_keys.'
      ],
      example: '-----BEGIN RSA PRIVATE KEY-----'
    },
    operation: {
      title: 'How to get Operation?',
      steps: [
        'You don’t get this from anywhere—you choose it from the dropdown in this node.',
        '',
        '• Get File – Download a file (requires Remote Path).',
        '',
        '• Put File – Upload a file (requires Remote Path + Content).',
        '',
        '• List Files – List files in a directory (requires Remote Path).',
        '',
        '• Delete File – Delete a file (requires Remote Path).'
      ],
      example: 'Get File'
    },
    remotePath: {
      title: 'How to get Remote Path?',
      steps: [
        'Remote Path is the file or folder location on the SFTP server.',
        '',
        'For Get/Put/Delete: use the full file path.',
        'For List: use a folder path.',
        '',
        'Examples:',
        '/files/data.txt',
        '/var/www/uploads/',
        '~/backup.zip'
      ],
      example: '/files/data.txt'
    },
    content: {
      title: 'How to get Content (for Put)?',
      steps: [
        'Provide the file content you want to upload.',
        '',
        '• Text files: paste plain text.',
        '• Binary files: use base64 encoding.',
        '',
        'Examples:',
        'Hello World',
        'base64-encoded string for a PDF or image'
      ],
      example: 'Hello World'
    }
  },
  minio: {
    accessKey: {
      title: 'MinIO Access Key – Step-by-Step',
      steps: [
        '1️⃣ For MinIO Server',
        '   Access your MinIO server',
        '   Go to MinIO Console',
        '   Usually: http://your-server:9001',
        '',
        '2️⃣ Go to Access Keys',
        '   Click "Access Keys" in left sidebar',
        '   Or go to Identity → Access Keys',
        '',
        '3️⃣ Create Access Key',
        '   Click "Create Access Key"',
        '   Give it a name',
        '   Set policy (read/write)',
        '',
        '4️⃣ Copy Access Key',
        '   Copy the "Access Key"',
        '   Also copy "Secret Key"',
        '   ⚠️ You won\'t see secret again!',
        '',
        '5️⃣ Store Securely',
        '   Paste it into the Access Key field above',
        '',
        'Example:',
        'minioadmin'
      ],
      example: 'minioadmin'
    },
    secretKey: {
      title: 'MinIO Secret Key – Step-by-Step',
      steps: [
        '1️⃣ When Creating Access Key',
        '   After clicking "Create Access Key"',
        '   You\'ll see both keys',
        '',
        '2️⃣ Copy Secret Key',
        '   ⚠️ IMPORTANT: Copy immediately!',
        '   You won\'t be able to see it again',
        '',
        '3️⃣ Store Securely',
        '   Paste it into the Secret Key field above',
        '   Never share publicly',
        '',
        'Example:',
        'minioadmin'
      ],
      example: 'minioadmin'
    },
    endpoint: {
      title: 'MinIO Endpoint – Step-by-Step',
      steps: [
        '1️⃣ Get MinIO Server URL',
        '   From your MinIO server configuration',
        '   Usually: http://your-server:9000',
        '   Or: https://minio.yourdomain.com',
        '',
        '2️⃣ Use the Endpoint',
        '   Paste it into the Endpoint field above',
        '   Include protocol (http:// or https://)',
        '   Include port if not default',
        '',
        'Examples:',
        'http://localhost:9000',
        'https://minio.yourdomain.com'
      ],
      example: 'http://localhost:9000'
    }
  },
  // YouTube
  youtube: {
    apiKey: {
      title: 'YouTube Data API Key – Step-by-Step',
      url: 'https://console.cloud.google.com',
      steps: [
        '1️⃣ Open Google Cloud Console',
        '   Go to 👉 https://console.cloud.google.com',
        '   Sign in with your Google account',
        '',
        '2️⃣ Create or Select Project',
        '   Click project dropdown',
        '   Select project or create new',
        '',
        '3️⃣ Enable YouTube Data API',
        '   Search for "YouTube Data API v3"',
        '   Click on it',
        '   Click "Enable"',
        '',
        '4️⃣ Go to Credentials',
        '   Click "Credentials" in left sidebar',
        '   Click "Create Credentials"',
        '   Select "API key"',
        '',
        '5️⃣ Copy API Key',
        '   API key will be generated',
        '   Copy it immediately',
        '   Optionally restrict the key',
        '',
        '6️⃣ Store Securely',
        '   Paste it into the API Key field above',
        '',
        'Example:',
        'AIzaSyDxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
      ],
      example: 'AIzaSyDxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
    },
    accessToken: {
      title: 'YouTube OAuth Access Token – Step-by-Step',
      url: 'https://console.cloud.google.com',
      steps: [
        '1️⃣ Open Google Cloud Console',
        '   Go to 👉 https://console.cloud.google.com',
        '   Sign in with your Google account',
        '',
        '2️⃣ Create OAuth 2.0 Credentials',
        '   Go to "APIs & Services" → "Credentials"',
        '   Click "Create Credentials" → "OAuth client ID"',
        '   Choose "Web application"',
        '',
        '3️⃣ Configure OAuth',
        '   Set authorized redirect URIs',
        '   Copy Client ID and Client Secret',
        '',
        '4️⃣ Complete OAuth Flow',
        '   Redirect user to Google OAuth',
        '   Request scopes:',
        '   • https://www.googleapis.com/auth/youtube.upload',
        '   • https://www.googleapis.com/auth/youtube',
        '',
        '5️⃣ Get Access Token',
        '   After user authorizes',
        '   Exchange code for access token',
        '   Copy the access_token',
        '',
        '6️⃣ Store Securely',
        '   Paste it into the Access Token field above',
        '   ⚠️ Required for upload/update/delete operations',
        '',
        'Example:',
        'ya29.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
      ],
      example: 'ya29.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
    },
    operation: {
      title: 'How to get Operation?',
      steps: [
        'You don’t get this from anywhere—you choose it from the dropdown in this node.',
        '',
        '• Upload Video – Requires Video URL, Title, and optional Description/Tags/Privacy.',
        '',
        '• Update Video Metadata – Requires Video ID and new Title/Description/Tags.',
        '',
        '• Delete Video – Requires Video ID.',
        '',
        '• Get Channel Details – Requires Channel ID (or "mine").',
        '',
        '• Get Video Statistics – Requires Video ID.',
        '',
        '• Search Videos – Requires Search Query (optional Max Results).',
        '',
        '• Get Comments – Requires Video ID (optional Max Results).',
        '',
        '• Reply to Comment – Requires Comment ID and Comment Text.'
      ],
      example: 'Upload Video'
    },
    videoUrl: {
      title: 'How to get Video URL?',
      steps: [
        'Upload the video file to a public host (CDN, cloud storage, file server).',
        '',
        'Copy the direct HTTPS URL to the video file.',
        '',
        'Supported formats: MP4, MOV, AVI.',
        '',
        'Example:',
        'https://example.com/video.mp4'
      ],
      example: 'https://example.com/video.mp4'
    },
    title: {
      title: 'How to get Video Title?',
      steps: [
        'This is the title shown on YouTube.',
        '',
        '• Type it directly.',
        '',
        '• Or map from earlier steps (e.g. "{{input.title}}").',
        '',
        'Max length is 100 characters.'
      ],
      example: 'My Video Title'
    },
    description: {
      title: 'How to get Video Description?',
      steps: [
        'This text appears below the video.',
        '',
        '• Type it directly.',
        '',
        '• Or map from earlier steps (e.g. "{{input.description}}").',
        '',
        'Optional for uploads and updates.'
      ],
      example: 'Video description with keywords'
    },
    tags: {
      title: 'How to get Tags (comma-separated)?',
      steps: [
        'Enter keywords separated by commas.',
        '',
        'Example: tutorial, automation, workflow',
        '',
        'Total length across all tags should be under 500 characters.'
      ],
      example: 'tutorial, automation, workflow'
    },
    videoId: {
      title: 'YouTube Video ID – Step-by-Step',
      steps: [
        '1️⃣ Open the video in a browser',
        '',
        '2️⃣ Copy the value after v= in the URL',
        '',
        '3️⃣ Or use the ID returned when you upload or search videos',
        '',
        'Example:',
        'dQw4w9WgXcQ'
      ],
      example: 'dQw4w9WgXcQ'
    },
    channelId: {
      title: 'YouTube Channel ID – Step-by-Step',
      steps: [
        '1️⃣ Open your channel page',
        '',
        '2️⃣ If the URL is youtube.com/channel/CHANNEL_ID, copy the ID',
        '',
        '3️⃣ If you are authenticated, you can use "mine" for your channel',
        '',
        'Example:',
        'UCxxxxxxxxxxxxxxxxxxxxxxxxxx'
      ],
      example: 'UCxxxxxxxxxxxxxxxxxxxxxxxxxx'
    },
    query: {
      title: 'How to get Search Query?',
      steps: [
        'Type the keywords you want to search for.',
        '',
        'Example:',
        'workflow automation tutorial'
      ],
      example: 'workflow automation tutorial'
    },
    commentText: {
      title: 'How to get Comment Text?',
      steps: [
        'Type the reply you want to post.',
        '',
        'You can also map text from earlier steps.',
        '',
        'Required for Reply to Comment.'
      ],
      example: 'Thanks for watching!'
    },
    commentId: {
      title: 'YouTube Comment ID – Step-by-Step',
      steps: [
        '1️⃣ Use "Get Comments" to list comments for a video',
        '',
        '2️⃣ Copy the "id" field from the comment you want to reply to',
        '',
        '3️⃣ Paste it here',
        '',
        'Example:',
        'Ugxxxxxxxxxxxxxxxxxxxxxxxxxx'
      ],
      example: 'Ugxxxxxxxxxxxxxxxxxxxxxxxxxx'
    },
    maxResults: {
      title: 'How to get Max Results?',
      steps: [
        'Enter how many results to return.',
        '',
        'Allowed range is 1–50.',
        '',
        'Used for Search Videos and Get Comments.'
      ],
      example: '10'
    },
    privacyStatus: {
      title: 'How to get Privacy Status?',
      steps: [
        'Choose the visibility for the uploaded video.',
        '',
        '• public – visible to everyone',
        '• unlisted – visible to anyone with the link',
        '• private – visible only to you',
        '',
        'Used for Upload Video.'
      ],
      example: 'public'
    }
  },
  // XML
  xml: {
    operation: {
      title: 'How to get Operation?',
      steps: [
        'You don’t get this from anywhere—you choose it from the dropdown in this node.',
        '',
        '• Parse – Convert XML into JSON-like output.',
        '',
        '• Extract – Use XPath to pull specific values (requires XPath Expression).',
        '',
        '• Validate – Check that the XML is well‑formed.'
      ],
      example: 'Parse'
    },
    xml: {
      title: 'How to get XML Content?',
      steps: [
        'Paste the XML text you want to process.',
        '',
        'You can also map from a previous step, e.g. "{{input.xml}}".',
        '',
        'Examples:',
        '<root><item>value</item></root>',
        '<order><id>123</id></order>'
      ],
      example: '<root><item>value</item></root>'
    },
    xpath: {
      title: 'How to get XPath Expression?',
      steps: [
        'Use XPath to select the data you need.',
        '',
        'Examples:',
        '• /root/item',
        '• /root/item[1]',
        '• /root/item[@id="1"]',
        '• //item',
        '• /root/item/text()'
      ],
      example: '/root/item'
    },
    safeMode: {
      title: 'How to get Safe Mode?',
      steps: [
        'Safe Mode protects against unsafe XML features (XXE, entity expansion).',
        '',
        'Keep this enabled unless you fully trust the XML source.'
      ],
      example: 'true'
    },
    maxSize: {
      title: 'How to get Max Size (bytes)?',
      steps: [
        'Set the maximum XML size you want to process.',
        '',
        'Default is 10 MB (10485760).',
        '',
        'Increase for larger files or decrease for stricter limits.',
        '',
        'Examples:',
        '1048576 (1 MB)',
        '10485760 (10 MB)',
        '52428800 (50 MB)'
      ],
      example: '10485760'
    }
  },
  // PDF
  pdf: {
    operation: {
      title: 'How to get Operation?',
      steps: [
        'You don’t get this from anywhere—you choose it from the dropdown in this node.',
        '',
        '• Extract Text – Read the text content from the PDF.',
        '',
        '• Read Metadata – Read PDF details like title, author, and created date.'
      ],
      example: 'Extract Text'
    },
    pdfUrl: {
      title: 'How to get PDF URL/Base64?',
      steps: [
        'Provide the PDF as a public URL or a Base64 data URI.',
        '',
        'URL option:',
        '• Upload the PDF to a public location (cloud storage or file server).',
        '• Copy the direct HTTPS link to the PDF file.',
        '',
        'Base64 option:',
        '• Convert the PDF to Base64.',
        '• Prefix with: data:application/pdf;base64,',
        '',
        'Examples:',
        'https://example.com/document.pdf',
        'data:application/pdf;base64,JVBERi0xLjQK...'
      ],
      example: 'https://example.com/document.pdf'
    },
    maxSize: {
      title: 'How to get Max Size (bytes)?',
      steps: [
        'Set the maximum size of PDF you want to process.',
        '',
        'Default is 10 MB (10485760).',
        '',
        'Increase for larger PDFs, or lower it to prevent heavy processing.',
        '',
        'Examples:',
        '1048576 (1 MB)',
        '10485760 (10 MB)',
        '52428800 (50 MB)'
      ],
      example: '10485760'
    }
  },
  // Date & Time
  date_time: {
    operation: {
      title: 'How to get Operation?',
      steps: [
        'You don’t get this from anywhere—you choose it from the dropdown in this node.',
        '',
        '• Format – Format a date into a specific output (ISO, Timestamp, Locale, or Custom).',
        '',
        '• Add – Add time to a base date (requires Value + Unit).',
        '',
        '• Subtract – Subtract time from a base date (requires Value + Unit).',
        '',
        '• Difference – Calculate the time difference between dates.',
        '',
        '• Now – Get the current date/time.',
        '',
        '• Convert Timezone – Convert a date into another time zone.',
        '',
        '• Get Timezone Info – Return details about a time zone.',
      ],
      example: 'Format'
    },
    date: {
      title: 'How to get Date (ISO)?',
      steps: [
        'Provide the base date in ISO 8601 format.',
        '',
        'You can type it directly or map it from a previous step (e.g. "{{input.date}}").',
        '',
        'Examples:',
        '• 2024-01-15',
        '• 2024-01-15T10:30:00Z',
        '• 2024-01-15T10:30:00+05:30',
        '',
        'Leave empty to use the current date/time.'
      ],
      example: '2024-01-15T10:30:00Z'
    },
    timezone: {
      title: 'How to get Timezone (IANA)?',
      steps: [
        'Use an IANA timezone identifier.',
        '',
        'Common examples:',
        '• UTC',
        '• America/New_York',
        '• Europe/London',
        '• Asia/Kolkata',
        '',
        'You can find your timezone in system settings or search "my time zone".'
      ],
      example: 'America/New_York'
    },
    format: {
      title: 'How to get Format?',
      steps: [
        'Choose how the output should look:',
        '',
        '• ISO – Standard ISO 8601 string.',
        '• Timestamp – Unix timestamp in milliseconds.',
        '• Locale Date – Uses Locale field for language/region.',
        '• Custom – Uses the Custom Format field.',
      ],
      example: 'ISO'
    },
    locale: {
      title: 'How to get Locale?',
      steps: [
        'Locale is used only when Format = Locale Date.',
        '',
        'Use language-REGION codes such as:',
        '• en-US',
        '• en-GB',
        '• fr-FR',
        '• de-DE',
        '• ja-JP',
      ],
      example: 'en-US'
    },
    value: {
      title: 'How to get Value?',
      steps: [
        'Enter the number of units to add or subtract.',
        '',
        'Examples:',
        '• 1 = one unit',
        '• 7 = seven units',
        '• -5 = subtract five units',
        '',
        'Used only for Add/Subtract operations.'
      ],
      example: '3'
    },
    unit: {
      title: 'How to get Unit?',
      steps: [
        'Choose the unit that matches your calculation:',
        '',
        'Seconds, Minutes, Hours, Days, Weeks, Months, Years.',
        '',
        'Used only for Add/Subtract operations.'
      ],
      example: 'days'
    },
    customFormat: {
      title: 'How to get Custom Format?',
      steps: [
        'Use format tokens for custom output:',
        '',
        '• YYYY = year',
        '• MM = month',
        '• DD = day',
        '• HH = hours (24h)',
        '• mm = minutes',
        '• ss = seconds',
        '',
        'Example:',
        'YYYY-MM-DD HH:mm:ss'
      ],
      example: 'YYYY-MM-DD HH:mm:ss'
    }
  },
  // Schedule Trigger
  schedule: {
    timezone: {
      title: 'How to create Timezone?',
      steps: [
        'Timezone tells the scheduler which local time zone to use when running this workflow.',
        '',
        'Step 1: Decide where this schedule should be based.',
        '• If the report is for your team, use your team’s primary location.',
        '• Example: India team → Asia/Kolkata, US East team → America/New_York.',
        '',
        'Step 2: Pick a timezone from the dropdown.',
        '• Common options include India (Asia/Kolkata), UTC, US (America/New_York), Europe (Europe/London).',
        '• All times you set in the Time field will be interpreted in this timezone.',
        '',
        'Step 3: Keep it stable for users.',
        '• Avoid changing timezone frequently—otherwise the run time will appear to jump.',
        '• For global teams, prefer UTC and adjust reports/notifications on the receiving side.'
      ],
      example: 'Asia/Kolkata'
    }
  },
  // Kubernetes
  kubernetes: {
    apiServer: {
      title: 'Kubernetes API Server URL – Step-by-Step',
      steps: [
        '1️⃣ Method 1: From kubeconfig',
        '   Open ~/.kube/config file',
        '   Find "server" field under "clusters"',
        '   Copy the URL',
        '   Format: https://kubernetes.example.com:6443',
        '',
        '2️⃣ Method 2: Using kubectl',
        '   Run: kubectl cluster-info',
        '   Shows the Kubernetes master URL',
        '   Copy the URL',
        '',
        '3️⃣ Method 3: Cloud Providers',
        '   GKE:',
        '   gcloud container clusters describe CLUSTER_NAME --zone ZONE --format="value(endpoint)"',
        '',
        '   EKS:',
        '   aws eks describe-cluster --name CLUSTER_NAME --query "cluster.endpoint"',
        '',
        '   AKS:',
        '   az aks show --resource-group RG --name CLUSTER --query "fqdn"',
        '',
        '4️⃣ Use the API Server URL',
        '   Paste it into the API Server URL field above',
        '   Include https:// and port',
        '',
        'Example:',
        'https://kubernetes.example.com:6443'
      ],
      example: 'https://kubernetes.example.com:6443'
    },
    token: {
      title: 'Kubernetes Bearer Token – Step-by-Step',
      steps: [
        '1️⃣ Method 1: From kubeconfig',
        '   Open ~/.kube/config file',
        '   Find "token" in user section',
        '   Copy the token',
        '',
        '2️⃣ Method 2: Service Account Token',
        '   Create service account:',
        '   kubectl create serviceaccount myuser',
        '',
        '   Get token:',
        '   kubectl get secret $(kubectl get sa myuser -o jsonpath=\'{.secrets[0].name}\') -o jsonpath=\'{.data.token}\' | base64 -d',
        '',
        '3️⃣ Method 3: From Running Pod',
        '   If in a pod, token is at:',
        '   /var/run/secrets/kubernetes.io/serviceaccount/token',
        '',
        '4️⃣ Store Securely',
        '   Paste it into the Bearer Token field above',
        '   Never share publicly',
        '',
        'Example:',
        'eyJhbGciOiJSUzI1NiIsImtpZCI6...'
      ],
      example: 'eyJhbGciOiJSUzI1NiIsImtpZCI6...'
    },
    operation: {
      title: 'How to choose Operation?',
      steps: [
        'Operation defines the action you want to perform on the cluster.',
        '',
        'Examples:',
        '• List Pods / Get Pod',
        '• List Deployments / Get Deployment',
        '• Create or Update Deployment',
        '• Scale or Restart Deployment',
        '• List Services / Get Service',
        '• Get Pod Logs',
        '',
        'Choose the action that matches your workflow step.'
      ],
      example: 'list_pods'
    },
    namespace: {
      title: 'How to set Namespace?',
      steps: [
        'Namespace is where the resource lives.',
        '',
        'Common values:',
        '• default (most common)',
        '• kube-system (system resources)',
        '• production / staging / dev (custom)',
        '',
        'How to find it:',
        '• kubectl get namespaces',
        '• Kubernetes dashboard',
        '• Ask your cluster admin'
      ],
      example: 'default'
    },
    resourceName: {
      title: 'How to get Resource Name?',
      steps: [
        'Resource Name is the name of the pod, deployment, or service.',
        '',
        'How to find it:',
        '• kubectl get pods / deployments / services',
        '• Kubernetes dashboard resource list',
        '• From a previous list operation output'
      ],
      example: 'backend-api'
    },
    deploymentManifest: {
      title: 'How to provide Deployment Manifest (JSON)?',
      steps: [
        'Deployment Manifest defines the deployment you want to create or update.',
        '',
        'You can convert YAML to JSON or build JSON directly.',
        'Minimum fields: apiVersion, kind, metadata.name, spec',
        '',
        'Tip: Validate your manifest before submitting.'
      ],
      example: '{"apiVersion":"apps/v1","kind":"Deployment","metadata":{"name":"backend-api"},"spec":{"replicas":2}}'
    },
    replicas: {
      title: 'How to set Replicas?',
      steps: [
        'Replicas is the number of pods you want running.',
        '',
        'Use it for scale operations.',
        'Example: 3 = run three pod replicas.'
      ],
      example: '3'
    }
  },
  // Snowflake
  snowflake: {
    account: {
      title: 'Snowflake Account Identifier – Step-by-Step',
      url: 'https://app.snowflake.com',
      steps: [
        '1️⃣ Open Snowflake',
        '   Go to 👉 https://app.snowflake.com',
        '   Sign in to your Snowflake account',
        '',
        '2️⃣ Get Account from URL',
        '   Look at the URL after logging in',
        '   Format: app.snowflake.com/ACCOUNT/...',
        '   The ACCOUNT part is your account identifier',
        '',
        '3️⃣ Alternative: From Account Settings',
        '   Click your username (top right)',
        '   Click "Account"',
        '   Find "Account Locator"',
        '',
        '4️⃣ Account Format',
        '   Can be: xy12345 (simple)',
        '   Or: organization-account (full)',
        '   Example: mycompany-abc123',
        '',
        '5️⃣ Use the Account',
        '   Paste it into the Account field above',
        '',
        'Examples:',
        'xy12345',
        'mycompany-abc123'
      ],
      example: 'xy12345'
    },
    username: {
      title: 'Snowflake Username – Step-by-Step',
      url: 'https://app.snowflake.com',
      steps: [
        '1️⃣ Your Snowflake Login Username',
        '   This is the username you use to log in',
        '   Go to: app.snowflake.com',
        '',
        '2️⃣ Use the Username',
        '   Paste it into the Username field above',
        '   You\'ll also need Password',
        '',
        'Example:',
        'myuser'
      ],
      example: 'myuser'
    },
    password: {
      title: 'Snowflake Password – Step-by-Step',
      steps: [
        '1️⃣ Your Snowflake Login Password',
        '   This is the password for your username',
        '',
        '2️⃣ Store Securely',
        '   Paste it into the Password field above',
        '   Never commit to version control',
        '',
        '⚠️ Security Note:',
        'Consider using key pair authentication for enhanced security'
      ],
      example: 'YourSecurePassword123!'
    },
    warehouse: {
      title: 'Snowflake Warehouse Name – Step-by-Step',
      url: 'https://app.snowflake.com',
      steps: [
        '1️⃣ Open Snowflake',
        '   Go to 👉 https://app.snowflake.com',
        '   Sign in to your account',
        '',
        '2️⃣ View Warehouses',
        '   Click "Warehouses" in left sidebar',
        '   You\'ll see list of warehouses',
        '',
        '3️⃣ Get Warehouse Name',
        '   Warehouse name is shown in the list',
        '   Common default: COMPUTE_WH',
        '   Or create new: Click "Create"',
        '',
        '4️⃣ Use the Warehouse Name',
        '   Paste it into the Warehouse field above',
        '',
        'Examples:',
        'COMPUTE_WH',
        'ANALYTICS_WH'
      ],
      example: 'COMPUTE_WH'
    },
    database: {
      title: 'Snowflake Database Name – Step-by-Step',
      url: 'https://app.snowflake.com',
      steps: [
        '1️⃣ Open Snowflake',
        '   Go to 👉 https://app.snowflake.com',
        '   Sign in to your account',
        '',
        '2️⃣ View Databases',
        '   Click "Databases" in left sidebar',
        '   You\'ll see list of databases',
        '',
        '3️⃣ Get Database Name',
        '   Database name is shown in the list',
        '   Or create new: Click "Create"',
        '',
        '4️⃣ Use the Database Name',
        '   Paste it into the Database field above',
        '   Case-sensitive in Snowflake',
        '',
        'Examples:',
        'SNOWFLAKE_SAMPLE_DATA',
        'MY_DATABASE'
      ],
      example: 'SNOWFLAKE_SAMPLE_DATA'
    },
    schema: {
      title: 'Snowflake Schema Name – Step-by-Step',
      url: 'https://app.snowflake.com',
      steps: [
        '1️⃣ In Snowflake Database',
        '   After selecting database',
        '   Expand the database in left sidebar',
        '',
        '2️⃣ View Schemas',
        '   You\'ll see list of schemas',
        '   Common default: PUBLIC',
        '',
        '3️⃣ Get Schema Name',
        '   Schema name is shown',
        '   Or create new: Right-click → "Create Schema"',
        '',
        '4️⃣ Use the Schema Name',
        '   Paste it into the Schema field above',
        '   Default: PUBLIC',
        '   Case-sensitive in Snowflake',
        '',
        'Examples:',
        'PUBLIC',
        'SCHEMA1'
      ],
      example: 'PUBLIC'
    }
  },
  // TimescaleDB (similar to PostgreSQL)
  timescaledb: {
    host: {
      title: 'TimescaleDB Host – Step-by-Step',
      steps: [
        '1️⃣ Get TimescaleDB Server Address',
        '   From your hosting provider',
        '   Or from your database configuration',
        '   Format: hostname or IP address',
        '',
        '2️⃣ Use the Host',
        '   Paste it into the Host field above',
        '   Examples: localhost, timescale.example.com',
        '',
        'Examples:',
        'localhost',
        'timescale.example.com',
        '192.168.1.100'
      ],
      example: 'localhost'
    },
    database: {
      title: 'TimescaleDB Database Name – Step-by-Step',
      steps: [
        '1️⃣ Connect to TimescaleDB',
        '   Use psql or database client',
        '   Or check with your DBA',
        '',
        '2️⃣ List Databases',
        '   Run: \\l in psql',
        '   Or: SELECT datname FROM pg_database;',
        '',
        '3️⃣ Use the Database Name',
        '   Paste it into the Database field above',
        '',
        'Examples:',
        'mydb',
        'timeseries_db'
      ],
      example: 'mydb'
    },
    username: {
      title: 'TimescaleDB Username – Step-by-Step',
      steps: [
        '1️⃣ Get Database Username',
        '   From your database administrator',
        '   Or from your connection settings',
        '   Common default: postgres',
        '',
        '2️⃣ Use the Username',
        '   Paste it into the Username field above',
        '',
        'Example:',
        'postgres'
      ],
      example: 'postgres'
    },
    password: {
      title: 'TimescaleDB Password – Step-by-Step',
      steps: [
        '1️⃣ Get Database Password',
        '   From your database administrator',
        '   Or reset in database settings',
        '',
        '2️⃣ Store Securely',
        '   Paste it into the Password field above',
        '   Never commit to version control',
        '',
        '⚠️ Security Note:',
        'Passwords are sensitive - store securely!'
      ],
      example: 'YourSecurePassword123!'
    }
  },
  // GraphQL
  graphql: {
    endpoint: {
      title: 'GraphQL Endpoint URL – Step-by-Step',
      steps: [
        '1️⃣ Get GraphQL Endpoint',
        '   From your GraphQL API documentation',
        '   Or from your API provider',
        '   Format: https://api.example.com/graphql',
        '',
        '2️⃣ Common GraphQL Endpoints',
        '   GitHub: https://api.github.com/graphql',
        '   Shopify: https://yourstore.myshopify.com/admin/api/2024-01/graphql.json',
        '   Custom: https://your-api.com/graphql',
        '',
        '3️⃣ Use the Endpoint',
        '   Paste it into the Endpoint field above',
        '   Include full URL with https://',
        '',
        'Examples:',
        'https://api.example.com/graphql',
        'https://yourstore.myshopify.com/admin/api/2024-01/graphql.json'
      ],
      example: 'https://api.example.com/graphql'
    },
    headers: {
      title: 'GraphQL Headers – Step-by-Step',
      steps: [
        '1️⃣ Common Headers Needed',
        '   Authorization: Bearer token or API key',
        '   Content-Type: application/json',
        '',
        '2️⃣ Format Headers as JSON',
        '   Format: {"Header-Name": "value"}',
        '',
        '3️⃣ Examples',
        '   For API Key:',
        '   {"Authorization": "Bearer YOUR_API_KEY"}',
        '',
        '   For OAuth:',
        '   {"Authorization": "Bearer YOUR_ACCESS_TOKEN"}',
        '',
        '   Multiple headers:',
        '   {"Authorization": "Bearer TOKEN", "Content-Type": "application/json"}',
        '',
        '4️⃣ Use the Headers',
        '   Paste JSON into the Headers field above',
        '',
        'Example:',
        '{"Authorization": "Bearer YOUR_TOKEN", "Content-Type": "application/json"}'
      ],
      example: '{"Authorization": "Bearer YOUR_TOKEN", "Content-Type": "application/json"}'
    }
  },
  // QuickBooks
  quickbooks: {
    clientId: {
      title: 'QuickBooks Client ID – Step-by-Step',
      url: 'https://developer.intuit.com',
      steps: [
        '1️⃣ Open Intuit Developer',
        '   Go to 👉 https://developer.intuit.com',
        '   Sign in with your Intuit account',
        '',
        '2️⃣ Go to My Apps',
        '   Click "My Apps" in top menu',
        '   Or go to: developer.intuit.com/app/developer/myapps',
        '',
        '3️⃣ Create or Select App',
        '   Click "Create an app" or select existing',
        '   Choose "QuickBooks Online"',
        '',
        '4️⃣ Get Client ID',
        '   In app settings, find "Keys" section',
        '   Copy the "Client ID" (OAuth 2.0 Client ID)',
        '',
        '5️⃣ Store Securely',
        '   Paste it into the Client ID field above',
        '   You\'ll also need Client Secret',
        '',
        'Example:',
        'Q0xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
      ],
      example: 'Q0xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
    },
    clientSecret: {
      title: 'QuickBooks Client Secret – Step-by-Step',
      url: 'https://developer.intuit.com',
      steps: [
        '1️⃣ In Intuit Developer App Settings',
        '   After getting Client ID',
        '   In "Keys" section',
        '',
        '2️⃣ Get Client Secret',
        '   Copy the "Client Secret"',
        '   ⚠️ Keep it secure!',
        '',
        '3️⃣ Store Securely',
        '   Paste it into the Client Secret field above',
        '   Never share publicly',
        '',
        'Example:',
        'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
      ],
      example: 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
    },
    accessToken: {
      title: 'QuickBooks OAuth Access Token – Step-by-Step',
      url: 'https://developer.intuit.com',
      steps: [
        '1️⃣ Complete OAuth 2.0 Flow',
        '   Use Client ID and Client Secret',
        '   Redirect to QuickBooks authorization',
        '   User grants permissions',
        '',
        '2️⃣ Get Authorization Code',
        '   After user authorizes',
        '   You\'ll receive authorization code',
        '',
        '3️⃣ Exchange for Access Token',
        '   POST to: https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer',
        '   Include: client_id, client_secret, code, redirect_uri',
        '',
        '4️⃣ Copy Access Token',
        '   From OAuth response',
        '   Copy the access_token',
        '   ⚠️ Token expires - use refresh token',
        '',
        '5️⃣ Store Securely',
        '   Paste it into the Access Token field above',
        '',
        'Example:',
        'eyJlbmMiOiJBMTI4Q0JDLUhTMjU2IiwiYWxnIjoiZGlyIn0...'
      ],
      example: 'eyJlbmMiOiJBMTI4Q0JDLUhTMjU2IiwiYWxnIjoiZGlyIn0...'
    },
    refreshToken: {
      title: 'QuickBooks Refresh Token – Step-by-Step',
      steps: [
        '1️⃣ From OAuth Response',
        '   When exchanging authorization code',
        '   Response includes refresh_token',
        '',
        '2️⃣ Copy Refresh Token',
        '   Copy the refresh_token',
        '   Use to get new access tokens',
        '',
        '3️⃣ Store Securely',
        '   Paste it into the Refresh Token field above',
        '   Never share publicly',
        '',
        'Example:',
        'L011xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
      ],
      example: 'L011xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
    },
    companyId: {
      title: 'QuickBooks Company ID (Realm ID) – Step-by-Step',
      steps: [
        '1️⃣ From OAuth Response',
        '   After OAuth flow completes',
        '   Response includes realmId',
        '',
        '2️⃣ Alternative: From API Call',
        '   Call: GET /v3/company/{companyId}/companyinfo/{companyId}',
        '   Company ID is in the URL',
        '',
        '3️⃣ Use the Company ID',
        '   Paste it into the Company ID field above',
        '   Format: numeric ID',
        '',
        'Example:',
        '123456789'
      ],
      example: '123456789'
    }
  },
  // YouTube (additional fields)
  // SQLite
  sqlite: {
    databasePath: {
      title: 'SQLite Database Path – Step-by-Step',
      steps: [
        '1️⃣ SQLite Database File',
        '   SQLite uses a single file for database',
        '   File extension: .db or .sqlite',
        '',
        '2️⃣ Get Database Path',
        '   Absolute path: /path/to/database.db',
        '   Relative path: ./database.db',
        '   Or from your application config',
        '',
        '3️⃣ Use the Database Path',
        '   Paste it into the Database Path field above',
        '   Include full path if not in same directory',
        '',
        'Examples:',
        '/var/db/myapp.db',
        './data/database.db',
        'C:\\data\\database.db'
      ],
      example: '/var/db/myapp.db'
    }
  },
  // DevOps Tools
  gitlab: {
    token: {
      title: 'GitLab Personal Access Token – Step-by-Step',
      url: 'https://gitlab.com',
      steps: [
        '1️⃣ Open GitLab',
        '   Go to 👉 https://gitlab.com',
        '   Or your GitLab instance URL',
        '   Sign in to your account',
        '',
        '2️⃣ Go to Access Tokens',
        '   Click your profile icon (top right)',
        '   Click "Preferences" or "User Settings"',
        '   Click "Access Tokens" in left sidebar',
        '',
        '3️⃣ Create New Token',
        '   Click "Add new token"',
        '   Give it a name (e.g., "Workflow Integration")',
        '   Set expiration date (optional)',
        '',
        '4️⃣ Select Scopes',
        '   Select required scopes:',
        '   • api (full API access)',
        '   • read_repository (read repos)',
        '   • write_repository (write repos)',
        '',
        '5️⃣ Create and Copy Token',
        '   Click "Create personal access token"',
        '   ⚠️ IMPORTANT: Copy immediately!',
        '   Token starts with "glpat-"',
        '   You won\'t see it again!',
        '',
        '6️⃣ Store Securely',
        '   Paste it into the GitLab Token field above',
        '   Never commit to version control',
        '',
        'Example:',
        'glpat-xxxxxxxxxxxxxxxxxxxxxxxx'
      ],
      example: 'glpat-xxxxxxxxxxxxxxxxxxxxxxxx'
    },
    baseUrl: {
      title: 'GitLab URL (Base URL) – Step-by-Step',
      steps: [
        '• GitLab.com: Leave as https://gitlab.com (or the default value).',
        '',
        '• Self-hosted: Open your GitLab in the browser and copy the domain from the address bar.',
        '  Example: https://gitlab.company.com',
        '  Do not include path or trailing slash.',
        '',
        'Paste it into the GitLab URL field above.'
      ],
      example: 'https://gitlab.com'
    },
    operation: {
      title: 'How to get Operation?',
      steps: [
        'You don’t get this from anywhere—you choose it from the dropdown in this node.',
        '',
        '• Get Project / List Projects – Get project details or list projects. Need Project ID for get.',
        '',
        '• Create Issue / Update Issue / Close Issue / List Issues / Get Issue – Manage issues. Need Project ID; for update/close/get, need Issue IID.',
        '',
        '• Create Merge Request / Update MR / Approve MR / Merge MR / List MRs / Get MR – Manage merge requests. Need Project ID; for create, need Source Branch, Target Branch, Title, Description; for update/approve/merge/get, need Merge Request IID.',
        '',
        '• Trigger Pipeline / Get Pipeline / List Pipelines / Get Pipeline Jobs / Get Job Log – Pipelines. Need Project ID; for trigger, need Trigger Token and Branch/Ref; for get pipeline/jobs, need Pipeline ID; for job log, need Job ID.',
        '',
        '• Create Branch / List Branches / Delete Branch – Manage branches. Need Project ID; for create/delete, need Branch Name; for create, need Ref/Branch as source.',
        '',
        '• Get File / Create File / Update File / Delete File – File operations. Need Project ID, Branch Name, File Path; for create/update, need File Content and Commit Message.'
      ],
      example: 'Create Issue'
    },
    projectId: {
      title: 'GitLab Project ID – Step-by-Step',
      steps: [
        'Method 1 – Numeric ID:',
        '1. Open your GitLab project in the browser',
        '2. Go to Settings → General',
        '3. Under "Project ID", copy the numeric ID (e.g. 12345)',
        '4. Paste into the Project ID field above',
        '',
        'Method 2 – Path:',
        '1. Look at the project URL: https://gitlab.com/group/project-name',
        '2. The path is group/project-name (or username/project-name)',
        '3. Use that as Project ID, e.g. mygroup/myproject',
        '4. Some setups require URL-encoding the slash (mygroup%2Fmyproject)',
        '',
        'Example: 12345 or mygroup/myproject'
      ],
      example: '12345 or group/project'
    },
    title: {
      title: 'How to get Title?',
      steps: [
        'You type or provide the title—the headline for the issue or merge request.',
        '',
        '• Static: Type it directly, e.g. "Login Bug", "Add API documentation"',
        '',
        '• Dynamic: If your platform supports expressions, use data from earlier steps, e.g. {{input.subject}} or "Deploy: {{trigger.env}}"',
        '',
        'Required for Create Issue and Create Merge Request. Ignored for other operations.'
      ],
      example: 'Login Bug'
    },
    description: {
      title: 'How to get Description?',
      steps: [
        'You type or provide the description—the detailed explanation of the issue or merge request. Markdown supported.',
        '',
        '• Static: Type or paste directly. You can use Markdown.',
        '',
        '• Dynamic: Use an expression from a previous step, e.g. {{aiNode.summary}} or {{trigger.body}}',
        '',
        'Required for Create Issue and Create Merge Request. Ignored for other operations.'
      ],
      example: 'Issue/MR description'
    },
    sourceBranch: {
      title: 'How to get Source Branch?',
      steps: [
        'You type the branch name—the branch that contains your changes (the "source" of the merge request).',
        '',
        '• Static: Type it directly, e.g. feature-ai, fix/login-bug',
        '',
        '• Dynamic: Use an expression if your workflow created the branch earlier, e.g. {{createBranchNode.name}}',
        '',
        'In the project, open the branch dropdown and copy the branch name to confirm.',
        '',
        'Required for Create Merge Request. Ignored for other operations.'
      ],
      example: 'feature-branch'
    },
    targetBranch: {
      title: 'How to get Target Branch?',
      steps: [
        'You type the branch name—the branch you want to merge into (usually main or master).',
        '',
        '• Static: Type it directly, e.g. main, master, develop',
        '',
        'In the project, open the branch dropdown; the default branch is often shown first. Copy that name.',
        '',
        'Required for Create Merge Request. Ignored for other operations.'
      ],
      example: 'main'
    },
    triggerToken: {
      title: 'GitLab Trigger Token – Step-by-Step',
      steps: [
        '1️⃣ Open your GitLab project',
        '',
        '2️⃣ Go to Settings → CI/CD',
        '',
        '3️⃣ Expand "Pipeline triggers" section',
        '',
        '4️⃣ Click "Add trigger" (or use an existing one)',
        '',
        '5️⃣ Give it a description and click "Create trigger"',
        '',
        '6️⃣ Copy the "Trigger token" value shown',
        '   This is different from your Personal Access Token—it is used only to trigger pipelines for this project',
        '',
        '7️⃣ Paste into the Trigger Token field above'
      ],
      example: 'Your pipeline trigger token'
    },
    ref: {
      title: 'GitLab Branch/Ref – Step-by-Step',
      steps: [
        '1️⃣ Open your GitLab project',
        '',
        '2️⃣ Click the branch dropdown',
        '   Copy the branch name you want (e.g. main, develop)',
        '',
        '3️⃣ Paste into the Branch/Ref (or Ref/Branch) field above',
        '',
        'Used for Trigger Pipeline (which branch to run on), Create Branch (source ref), List Branches, and file operations. Default is often main.',
        '',
        'Example: main'
      ],
      example: 'main'
    },
    pipelineId: {
      title: 'GitLab Pipeline ID – Step-by-Step',
      steps: [
        '1️⃣ Open your GitLab project',
        '',
        '2️⃣ Go to CI/CD → Pipelines',
        '',
        '3️⃣ Click on a pipeline to open its details',
        '',
        '4️⃣ Look at the URL',
        '   Format: .../pipelines/12345',
        '   The number after /pipelines/ is the Pipeline ID',
        '',
        '5️⃣ Or use List Pipelines first; each pipeline in the response has an "id" field',
        '',
        '6️⃣ Paste into the Pipeline ID field above',
        '',
        'Example: 12345'
      ],
      example: '12345'
    },
    issueIid: {
      title: 'GitLab Issue IID – Step-by-Step',
      steps: [
        '1️⃣ Open your GitLab project',
        '',
        '2️⃣ Click Issues',
        '',
        '3️⃣ Open the issue you want',
        '',
        '4️⃣ Look at the URL',
        '   Format: .../issues/123',
        '   The number after /issues/ is the Issue IID',
        '',
        '5️⃣ Or look at the issue title',
        '   It shows #123 — the number is 123',
        '',
        '6️⃣ Enter only the number (e.g. 123), not #123',
        '',
        'Example: 123'
      ],
      example: '123'
    },
    mrIid: {
      title: 'GitLab Merge Request IID – Step-by-Step',
      steps: [
        '1️⃣ Open your GitLab project',
        '',
        '2️⃣ Click Merge Requests',
        '',
        '3️⃣ Open the merge request you want',
        '',
        '4️⃣ Look at the URL',
        '   Format: .../merge_requests/456',
        '   The number after /merge_requests/ is the MR IID',
        '',
        '5️⃣ Or look at the MR title',
        '   It often shows !456 — the number is 456',
        '',
        '6️⃣ Enter only the number (e.g. 456)',
        '',
        'Example: 456'
      ],
      example: '456'
    },
    stateEvent: {
      title: 'How to get State Event?',
      steps: [
        'You choose from the dropdown in this node: Close or Reopen.',
        '',
        '• Close – Marks the issue or merge request as closed.',
        '• Reopen – Reopens a closed issue or MR.',
        '',
        'Used for Update Issue and Update Merge Request. Ignored for other operations.'
      ],
      example: 'close'
    },
    mergeCommitMessage: {
      title: 'How to get Merge Commit Message?',
      steps: [
        'You type or provide the message—optional. Used as the merge commit message when merging a merge request.',
        '',
        '• Leave empty to use GitLab’s default merge commit message.',
        '',
        'Used only for Merge Merge Request. Ignored for other operations.'
      ],
      example: 'Merge commit message'
    },
    jobId: {
      title: 'GitLab Job ID – Step-by-Step',
      steps: [
        '1️⃣ Open your GitLab project',
        '',
        '2️⃣ Go to CI/CD → Pipelines',
        '',
        '3️⃣ Click on a pipeline to view its jobs',
        '',
        '4️⃣ Click on a specific job',
        '',
        '5️⃣ Look at the URL',
        '   Format: .../jobs/789',
        '   The number after /jobs/ is the Job ID',
        '',
        '6️⃣ Or use Get Pipeline Jobs first; each job in the response has an "id" field',
        '',
        '7️⃣ Paste into the Job ID field above',
        '',
        'Example: 789'
      ],
      example: '789'
    },
    branchName: {
      title: 'How to get Branch Name?',
      steps: [
        'You type the branch name—the name you want for a new branch, or the name of the branch to delete or use for file operations.',
        '',
        '• Static: Type it directly, e.g. feature-ai, fix/login-bug',
        '',
        '• Dynamic: Use an expression if your workflow created the branch earlier',
        '',
        'In the project, open the branch dropdown and copy the branch name to confirm.',
        '',
        'Used for Create Branch, Delete Branch, Get File, Create File, Update File, Delete File. Ignored for other operations.'
      ],
      example: 'feature-branch'
    },
    filePath: {
      title: 'GitLab File Path – Step-by-Step',
      steps: [
        '1️⃣ Open your GitLab project and navigate to the file (or folder where you want to create it)',
        '',
        '2️⃣ Look at the URL or breadcrumb',
        '   The path after the branch name is the File Path',
        '   e.g. docs/readme.md, src/utils.js',
        '',
        '3️⃣ Or build it: folder(s) + filename',
        '   Use forward slashes (/). No leading slash.',
        '',
        '4️⃣ Paste into the File Path field above',
        '',
        'Example: docs/readme.md'
      ],
      example: 'src/file.js'
    },
    fileContent: {
      title: 'How to get File Content?',
      steps: [
        'You provide the content—the exact text (or encoded content) to write to the file.',
        '',
        '• From a previous step: Use output from another node (e.g. generated doc, report), e.g. {{aiNode.content}} or {{readFileNode.content}}.',
        '',
        '• Static: Type or paste text.',
        '',
        'Required for Create File and Update File. Ignored for other operations.'
      ],
      example: 'File content'
    },
    commitMessage: {
      title: 'How to get Commit Message?',
      steps: [
        'You type or provide the message—a short description of the file change.',
        '',
        '• Static: Type it directly, e.g. "Updated API documentation", "Add AI docs"',
        '',
        '• Dynamic: Use an expression, e.g. "Deploy {{trigger.env}}" or {{aiNode.summary}}',
        '',
        'Required for Create File, Update File, Delete File. Ignored for other operations.'
      ],
      example: 'Updated API documentation'
    }
  },
  jenkins: {
    baseUrl: {
      title: 'How to get Jenkins URL?',
      steps: [
        'Jenkins URL is the base address of your Jenkins server.',
        '',
        'Example: https://jenkins.example.com',
        '',
        'Tip: Include https:// or http:// and remove any extra paths.'
      ],
      example: 'https://jenkins.example.com'
    },
    username: {
      title: 'Jenkins Username – Step-by-Step',
      steps: [
        '1️⃣ Get Jenkins Username',
        '   From your Jenkins administrator',
        '   Or from Jenkins user management',
        '   Usually your login username',
        '',
        '2️⃣ Use the Username',
        '   Paste it into the Username field above',
        '   You\'ll also need API Token',
        '',
        'Example:',
        'jenkins-user'
      ],
      example: 'jenkins-user'
    },
    token: {
      title: 'Jenkins API Token – Step-by-Step',
      steps: [
        '1️⃣ Log in to Jenkins',
        '   Go to your Jenkins instance',
        '   Sign in with your account',
        '',
        '2️⃣ Go to User Profile',
        '   Click your username (top right)',
        '   Click "Configure"',
        '',
        '3️⃣ Generate API Token',
        '   Scroll to "API Token" section',
        '   Click "Add new Token"',
        '   Give it a name',
        '',
        '4️⃣ Copy API Token',
        '   ⚠️ IMPORTANT: Copy immediately!',
        '   You won\'t see it again!',
        '',
        '5️⃣ Store Securely',
        '   Paste it into the Token field above',
        '',
        'Example:',
        '11xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
      ],
      example: '11xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
    },
    operation: {
      title: 'How to choose Operation?',
      steps: [
        'Operation tells Jenkins what action to run.',
        '',
        'Common options:',
        '• Get Job / List Jobs',
        '• Build Job / Stop Build',
        '• Get Build / Get Build Status / Get Build Log',
        '• Poll Build Status (for long builds)',
        '',
        'Choose the action that matches your workflow step.'
      ],
      example: 'build_job'
    },
    jobName: {
      title: 'How to get Job Name?',
      steps: [
        'Open the Jenkins dashboard.',
        'Click the job you want.',
        '',
        'The job name appears in the page title and URL:',
        'https://jenkins.example.com/job/JOB-NAME/',
        '',
        'Tip: For folder jobs, use format: folder/job-name'
      ],
      example: 'deploy-backend'
    },
    buildNumber: {
      title: 'How to get Build Number?',
      steps: [
        'Build number comes from the job’s build history.',
        '',
        'Open the job → Build History',
        'Copy the number (e.g., #25).'
      ],
      example: '25'
    },
    parameters: {
      title: 'How to set Build Parameters (JSON)?',
      steps: [
        'Build Parameters are used only for parameterized jobs.',
        '',
        'Enter a JSON object with parameter names and values.',
        'Example: {"ENV":"production","VERSION":"1.2.3"}',
        '',
        'Tip: If the job is not parameterized, leave this empty.'
      ],
      example: '{"ENV":"production","VERSION":"1.2.3"}'
    },
    pollInterval: {
      title: 'What is Poll Interval?',
      steps: [
        'Poll Interval is how often (in seconds) the workflow checks build status.',
        '',
        'Common values: 5–15 seconds.',
        'Use longer intervals for very long builds.'
      ],
      example: '10'
    },
    maxPollAttempts: {
      title: 'What is Max Poll Attempts?',
      steps: [
        'Max Poll Attempts limits how many times to check build status.',
        '',
        'Example: 60 attempts with 10s interval = 10 minutes total.',
        'Increase if your builds take longer.'
      ],
      example: '60'
    }
  },
  pagerduty: {
    apiKey: {
      title: 'PagerDuty API Key – Step-by-Step',
      url: 'https://app.pagerduty.com',
      steps: [
        '1️⃣ Open PagerDuty',
        '   Go to 👉 https://app.pagerduty.com',
        '   Sign in to your account',
        '',
        '2️⃣ Go to API Access Keys',
        '   Click "Configuration" → "API"',
        '   Click "API Access Keys"',
        '',
        '3️⃣ Create New API Key',
        '   Click "Create New API Key"',
        '   Give it a description (e.g., "Workflow Integration")',
        '   Select authorization level (Read-only or Full)',
        '',
        '4️⃣ Copy API Key',
        '   ⚠️ IMPORTANT: Copy immediately!',
        '   You won\'t see it again!',
        '',
        '5️⃣ Store Securely',
        '   Paste it into the API Key field above',
        '',
        'Example:',
        'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
      ],
      example: 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
    },
    operation: {
      title: 'How to choose Operation?',
      steps: [
        'Operation defines what action you want to perform.',
        '',
        'Common operations:',
        '• Create / Update / Get Incident',
        '• Acknowledge / Resolve Incident',
        '• List On-Calls or Schedules',
        '',
        'Pick the action that matches your workflow step.'
      ],
      example: 'create_incident'
    },
    incidentId: {
      title: 'How to get Incident ID?',
      steps: [
        'Open the incident in PagerDuty.',
        '',
        'The ID appears in the URL:',
        'app.pagerduty.com/incidents/INCIDENT_ID',
        '',
        'Copy the ID from the URL or incident header.'
      ],
      example: 'QWER456'
    },
    title: {
      title: 'How to write Incident Title?',
      steps: [
        'Title should be short and actionable.',
        '',
        'Example: "Database connection failure"',
        'Tip: Include the system and the problem.'
      ],
      example: 'Database connection failure'
    },
    serviceId: {
      title: 'How to get Service ID?',
      steps: [
        'Go to PagerDuty → Services.',
        'Click the service you want.',
        '',
        'The ID appears in the URL:',
        'app.pagerduty.com/services/SERVICE_ID',
        '',
        'Copy that ID into this field.'
      ],
      example: 'PABC123'
    },
    urgency: {
      title: 'How to set Urgency?',
      steps: [
        'Urgency defines how critical the incident is.',
        '',
        'Values:',
        '• high – immediate attention',
        '• low – less urgent',
        '',
        'Use high only for real critical issues.'
      ],
      example: 'high'
    },
    status: {
      title: 'How to set Status?',
      steps: [
        'Status is used when updating an incident.',
        '',
        'Values:',
        '• triggered',
        '• acknowledged',
        '• resolved'
      ],
      example: 'acknowledged'
    },
    escalationPolicyId: {
      title: 'How to get Escalation Policy ID?',
      steps: [
        'Go to PagerDuty → Escalation Policies.',
        'Open the policy you need.',
        '',
        'Copy the ID from the URL:',
        'app.pagerduty.com/escalation_policies/ESCALATION_ID'
      ],
      example: 'EP12345'
    },
    assigneeId: {
      title: 'How to get Assignee User ID?',
      steps: [
        'Open the user profile in PagerDuty.',
        '',
        'Copy the user ID from the URL:',
        'app.pagerduty.com/users/USER_ID'
      ],
      example: 'U123ABC'
    },
    note: {
      title: 'How to add a Note?',
      steps: [
        'Add a short note when acknowledging or resolving.',
        '',
        'Example: "Investigating database latency."',
        'Tip: Keep notes concise and actionable.'
      ],
      example: 'Investigating database latency.'
    },
    scheduleId: {
      title: 'How to get Schedule ID?',
      steps: [
        'Go to PagerDuty → Configuration → Schedules.',
        'Open the schedule.',
        '',
        'Copy the ID from the URL:',
        'app.pagerduty.com/schedules/SCHEDULE_ID'
      ],
      example: 'PSCHED123'
    }
  },
  http_post: {
    url: {
      title: 'How to set the URL?',
      steps: [
        'URL is the full endpoint where the POST request is sent.',
        '',
        'Examples:',
        '• https://api.example.com/create-user',
        '• https://hooks.service.com/trigger?id=123',
        '',
        'Tip: Include http:// or https://.'
      ],
      example: 'https://api.example.com/create-user'
    },
    headers: {
      title: 'How to set Headers (JSON)?',
      steps: [
        'Headers are key-value pairs for authentication and content type.',
        '',
        'Common headers:',
        '• Content-Type: application/json',
        '• Authorization: Bearer YOUR_TOKEN',
        '',
        'Example JSON:',
        '{ "Content-Type": "application/json", "Authorization": "Bearer YOUR_TOKEN" }'
      ],
      example: '{"Content-Type":"application/json","Authorization":"Bearer YOUR_TOKEN"}'
    },
    bodyTemplate: {
      title: 'How to write Body Template?',
      steps: [
        'Body Template is the request body sent to the API.',
        '',
        'Use JSON for most APIs, or plain text if required.',
        'You can insert dynamic values like {{input}} or {{input.field}}.',
        '',
        'Example:',
        '{ "event": "created", "data": {{input}} }'
      ],
      example: '{"event":"created","data":{{input}}}'
    }
  },
  respond_to_webhook: {
    statusCode: {
      title: 'How to set Status Code?',
      steps: [
        'Status Code is the HTTP code returned to the webhook caller.',
        '',
        'Common values:',
        '• 200 – Success',
        '• 201 – Created',
        '• 400 – Bad request',
        '• 401 – Unauthorized',
        '• 404 – Not found',
        '• 500 – Server error',
        '',
        'Tip: Use 200 when processing succeeds.'
      ],
      example: '200'
    },
    responseBody: {
      title: 'How to write Response Body (JSON)?',
      steps: [
        'Response Body is the JSON sent back to the caller.',
        '',
        'Example:',
        '{ "status": "success", "message": "Processed" }',
        '',
        'You can include dynamic values like {{input}}.'
      ],
      example: '{"status":"success","message":"Processed"}'
    },
    headers: {
      title: 'How to set Custom Headers (JSON)?',
      steps: [
        'Headers are optional key‑value pairs in JSON.',
        '',
        'Common header:',
        '• Content-Type: application/json',
        '',
        'Example:',
        '{ "Content-Type": "application/json" }'
      ],
      example: '{"Content-Type":"application/json"}'
    }
  },
  switch: {
    expression: {
      title: 'How to set Expression?',
      steps: [
        'Expression is the value you want to match against cases.',
        '',
        'Use a field from previous nodes, e.g. {{input.status}}.',
        'The expression result is compared to each case value.'
      ],
      example: '{{input.status}}'
    },
    cases: {
      title: 'How to set Cases (JSON)?',
      steps: [
        'Cases is a JSON array. Each case creates a branch.',
        '',
        'Format:',
        '[{"value":"success","label":"Success"},{"value":"failed","label":"Failed"}]',
        '',
        'Value must match the expression result exactly.',
        'Label becomes the output branch name.'
      ],
      example: '[{"value":"success","label":"Success"},{"value":"failed","label":"Failed"}]'
    }
  },
  if_else: {
    // Legacy single-condition guide (for old UIs)
    condition: {
      title: 'How to write Condition?',
      steps: [
        'Condition is a JavaScript-style expression that returns true or false.',
        '',
        'Examples:',
        '• {{input.value}} > 10',
        '• {{input.status}} === "active"',
        '• {{input.count}} >= 5',
        '',
        'Tip: Combine checks with && (AND) or || (OR), e.g. {{input.age}} >= 18 && {{input.country}} === "US".'
      ],
      example: '{{input.value}} > 10'
    },
    // New multi-condition builder
    conditions: {
      title: 'How to write Conditions?',
      steps: [
        'Conditions control when the TRUE or FALSE branch runs. Each row in the table is one condition.',
        '',
        'Step 1: Choose the Field to check.',
        '• Use fields from trigger or previous nodes, e.g. input.age, input.status, data.total.',
        '• The dropdown shows common fields; you can also type a custom path.',
        '',
        'Step 2: Select the Operator.',
        '• Common operators: equals, not_equals, greater_than, greater_than_or_equal, less_than, contains.',
        '• Example: age greater_than_or_equal 18, status equals "active".',
        '',
        'Step 3: Enter the Value to compare against.',
        '• Numbers: 18, 100, 0.',
        '• Text: active, US, high (no quotes needed in the Value box).',
        '',
        'You can add multiple rows – they will be combined using the Combine Operation setting below (AND/OR).'
      ],
      example: 'Field: input.age, Operator: greater_than_or_equal, Value: 18'
    },
    combineOperation: {
      title: 'How to write Combine Operation?',
      steps: [
        'Combine Operation decides how multiple conditions work together.',
        '',
        'Option 1: AND (all conditions must be true).',
        '• TRUE branch runs only if every row evaluates to true.',
        '• Example: age >= 18 AND country == "US" → both must match.',
        '',
        'Option 2: OR (any condition can be true).',
        '• TRUE branch runs if at least one row is true.',
        '• Example: country == "US" OR country == "CA" → either value matches.',
        '',
        'If you are not sure, use AND for stricter checks, OR for more permissive routing.'
      ],
      example: 'AND'
    }
  },
  email: {
    to: {
      title: 'How to set To?',
      steps: [
        'To is the recipient email address.',
        '',
        'You can enter a static address or a variable like {{input.email}}.'
      ],
      example: 'user@example.com'
    },
    subject: {
      title: 'How to set Subject?',
      steps: [
        'Subject is the email title shown in the inbox.',
        '',
        'Keep it short and clear.'
      ],
      example: 'Your Order Has Been Shipped'
    },
    text: {
      title: 'How to write Text?',
      steps: [
        'Text is the plain‑text email body.',
        '',
        'Use it for simple messages or as a fallback.'
      ],
      example: 'Hello, your order is on the way!'
    },
    html: {
      title: 'How to write HTML?',
      steps: [
        'HTML is the rich‑text email body.',
        '',
        'Use valid HTML tags and keep it lightweight.'
      ],
      example: '<h1>Hello</h1><p>Your order is on the way!</p>'
    }
  },
  email_sequence_sender: {
    recipient: {
      title: 'How to set Recipient (JSON)?',
      steps: [
        'Recipient is a JSON object with email and optional name.',
        '',
        'Example:',
        '{"email": "user@example.com", "name": "John Doe"}'
      ],
      example: '{"email":"user@example.com","name":"John Doe"}'
    },
    sequence: {
      title: 'How to set Sequence Steps (JSON Array)?',
      steps: [
        'Sequence is a JSON array of steps.',
        '',
        'Each step includes:',
        '• step (number)',
        '• subject (string)',
        '• body (string)',
        '• delayAfter (seconds)',
        '• sendCondition (optional)',
        '',
        'Example:',
        '[{"step":1,"subject":"Welcome","body":"Hello!","delayAfter":0}]'
      ],
      example: '[{"step":1,"subject":"Welcome","body":"Hello!","delayAfter":0}]'
    },
    stopOnReply: {
      title: 'What is Stop on Reply?',
      steps: [
        'When enabled, the sequence stops if the recipient replies.',
        '',
        'Use this to avoid sending follow‑ups after engagement.'
      ],
      example: 'true'
    },
    tracking: {
      title: 'How to set Tracking Settings (JSON)?',
      steps: [
        'Tracking controls open and click tracking.',
        '',
        'Example:',
        '{"openTracking": true, "clickTracking": true}'
      ],
      example: '{"openTracking":true,"clickTracking":true}'
    }
  },
  merge: {
    mode: {
      title: 'How to choose Mode?',
      steps: [
        'Mode defines how inputs are combined.',
        '',
        'Options:',
        '• merge – combine object fields',
        '• append – add items to an array',
        '• key_based – merge by a shared key',
        '• wait_all – wait for all inputs',
        '• concat – join arrays',
        '',
        'Choose the simplest mode that fits your data.'
      ],
      example: 'merge'
    },
    mergeKey: {
      title: 'How to set Merge Key?',
      steps: [
        'Merge Key is required for key‑based merge.',
        '',
        'Pick a field that exists in all inputs, e.g. "id" or "user_id".',
        'Records with the same key will be combined.'
      ],
      example: 'user_id'
    }
  },
  webhook: {
    method: {
      title: 'How to choose HTTP Method?',
      steps: [
        'Method is how the webhook accepts incoming requests.',
        '',
        'Supported values:',
        '• GET – send data in URL/query',
        '• POST – send data in the body (most common)',
        '• PUT – update/replace data',
        '',
        'Tip: Use POST for most webhook integrations.'
      ],
      example: 'POST'
    },
    path: {
      title: 'How to set Path?',
      steps: [
        'Path is the last part of your webhook URL.',
        '',
        'Example: In https://your-domain.com/webhooks/order-created, the path is /webhooks/order-created.',
        '',
        'If you leave this empty, a unique path is auto-generated for you.',
        '',
        'When setting it manually:',
        '• Use a short, descriptive value like /order-created or /lead/new.',
        '• Use only letters, numbers, dashes, and slashes.',
        '• Do not include the domain (https://...) or query parameters (?key=value).',
        '',
        'After saving the workflow, copy the full webhook URL (including this path) and paste it into the external service that should trigger this workflow.'
      ],
      example: '/webhooks/order-created'
    }
  },
  form: {
    redirectUrl: {
      title: 'How to set Redirect URL?',
      steps: [
        'Redirect URL is where users are sent after a successful form submission.',
        '',
        'Leave this empty to keep users on the same page and show the success message below the form.',
        '',
        'To redirect users to another page:',
        '• Enter a full, valid URL such as https://example.com/thank-you.',
        '• Make sure the URL is accessible to your users (no localhost in production).',
        '',
        'Common uses:',
        '• Send users to a custom “Thank you” or confirmation page.',
        '• Redirect to a signup, download, or next‑step page after form submission.'
      ],
      example: 'https://example.com/thank-you'
    }
  },
  discord_webhook: {
    message: {
      title: 'How to write Message?',
      steps: [
        'Message is the text posted to the channel.',
        '',
        'Supports Discord markdown:',
        '• **bold**, *italic*, `code`, and line breaks',
        '',
        'Tip: You can include dynamic data like {{input.field}}.'
      ],
      example: '✅ Workflow completed successfully!'
    },
    username: {
      title: 'How to set Username?',
      steps: [
        'Username is an optional override for the webhook sender name.',
        '',
        'Leave empty to use the webhook’s default name.'
      ],
      example: 'CtrlChecks Bot'
    },
    avatarUrl: {
      title: 'How to set Avatar URL?',
      steps: [
        'Avatar URL is an optional image for the webhook sender.',
        '',
        'Use a direct image link (PNG, JPG, GIF).',
        'Leave empty to use the webhook’s default avatar.'
      ],
      example: 'https://example.com/avatar.png'
    }
  },
  datadog: {
    apiKey: {
      title: 'Datadog API Key – Step-by-Step',
      url: 'https://app.datadoghq.com',
      steps: [
        '1️⃣ Open Datadog',
        '   Go to 👉 https://app.datadoghq.com',
        '   Sign in to your account',
        '',
        '2️⃣ Go to Organization Settings',
        '   Click profile icon (top right)',
        '   Click "Organization Settings"',
        '',
        '3️⃣ Navigate to API Keys',
        '   Click "API Keys" in left sidebar',
        '',
        '4️⃣ Create New Key',
        '   Click "New Key"',
        '   Give it a name (e.g., "Workflow Integration")',
        '   Click "Create Key"',
        '',
        '5️⃣ Copy API Key',
        '   ⚠️ IMPORTANT: Copy immediately!',
        '   You won\'t see it again!',
        '',
        '6️⃣ Store Securely',
        '   Paste it into the API Key field above',
        '   You\'ll also need Application Key',
        '',
        'Example:',
        'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
      ],
      example: 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
    },
    appKey: {
      title: 'Datadog Application Key – Step-by-Step',
      url: 'https://app.datadoghq.com',
      steps: [
        '1️⃣ In Datadog Organization Settings',
        '   After getting API Key',
        '   Click "Application Keys" in left sidebar',
        '',
        '2️⃣ Create New Application Key',
        '   Click "New Key"',
        '   Give it a name (e.g., "Workflow Integration")',
        '   Click "Create Key"',
        '',
        '3️⃣ Copy Application Key',
        '   ⚠️ IMPORTANT: Copy immediately!',
        '   You won\'t see it again!',
        '',
        '4️⃣ Store Securely',
        '   Paste it into the App Key field above',
        '',
        'Example:',
        'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
      ],
      example: 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
    }
  },
  sentry: {
    token: {
      title: 'Sentry Auth Token – Step-by-Step',
      url: 'https://sentry.io',
      steps: [
        '1️⃣ Open Sentry',
        '   Go to 👉 https://sentry.io',
        '   Sign in to your account',
        '',
        '2️⃣ Go to Auth Tokens',
        '   Click "Settings" → "Account"',
        '   Click "Auth Tokens" in left sidebar',
        '',
        '3️⃣ Create New Token',
        '   Click "Create New Token"',
        '   Give it a name (e.g., "Workflow Integration")',
        '   Select scopes:',
        '   • org:read',
        '   • project:read, project:write',
        '   • event:read, event:write',
        '',
        '4️⃣ Copy Token',
        '   ⚠️ IMPORTANT: Copy immediately!',
        '   You won\'t see it again!',
        '',
        '5️⃣ Store Securely',
        '   Paste it into the Auth Token field above',
        '',
        'Example:',
        'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
      ],
      example: 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
    }
  },
  // Productivity Tools
  clickup: {
    apiKey: {
      title: 'ClickUp API Key – Step-by-Step',
      url: 'https://app.clickup.com',
      steps: [
        'Step 1: Open ClickUp in your browser.',
        '• Go to 👉 https://app.clickup.com and sign in with your account.',
        '',
        'Step 2: Navigate to the API settings.',
        '• Click your avatar → "Settings" (gear icon).',
        '• Go to "Apps" → "API".',
        '• Or open 👉 app.clickup.com/settings/apps directly.',
        '',
        'Step 3: Locate your personal API token.',
        '• On the API page you will see a token that starts with "pk_".',
        '• Click the "Copy" button to copy it to your clipboard.',
        '',
        'Step 4: Paste the token into this node.',
        '• In this workflow node, paste the value into the ClickUp API Key field.',
        '• This token authorizes all ClickUp operations in this workflow.',
        '',
        'Step 5: Store and protect the token.',
        '• Never commit the token to Git or share screenshots.',
        '• Prefer environment variables or a secret manager for long‑term storage.',
        '',
        'Example:',
        'pk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
      ],
      example: 'pk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
    },
    operation: {
      title: 'How to choose Operation?',
      steps: [
        'You choose Operation from the dropdown to tell this node what to do in ClickUp.',
        '',
        'Task-level operations:',
        '• Create Task – Create a new task in a list. Requires List ID and Task Name; you can also set Description, Priority, Assignees, Due Date, Status.',
        '• Update Task – Modify an existing task. Requires Task ID; only the fields you provide (Name, Description, Status, Priority, Due Date, Assignees) will be changed.',
        '• Get Task – Retrieve a single task. Requires Task ID.',
        '• Delete Task – Permanently delete a task. Requires Task ID (use with care).',
        '• Add Comment – Add a comment to an existing task. Requires Task ID and Comment Text.',
        '• Update Task Status – Change a task’s status column. Requires Task ID and Status (must match a status in the list).',
        '',
        'List retrieval operations (for IDs / browsing):',
        '• Get Teams – Lists your workspaces (teams). Use this to find Workspace ID.',
        '• Get Spaces – Lists spaces in a workspace. Requires Workspace ID; use to find Space ID.',
        '• Get Folders – Lists folders in a space. Requires Workspace ID and Space ID; use to find Folder ID.',
        '• Get Lists – Lists lists in a folder or space. Requires at least Space ID (and optionally Folder ID); use to find List ID.',
        '• List Tasks – Lists tasks in a list. Requires List ID; you can toggle Include Closed Tasks.',
        '',
        'Guidance:',
        '• Use the Get* operations first to discover IDs (workspace/space/folder/list).',
        '• Then switch to Create/Update/Get/Delete/List Tasks once you know which list and tasks you want to automate.'
      ],
      example: 'Create Task'
    },
    workspaceId: {
      title: 'ClickUp Workspace ID – Step-by-Step',
      steps: [
        'Step 1: Use Get Teams operation (recommended).',
        '• In this ClickUp node, temporarily set Operation to "Get Teams".',
        '• Run the workflow once.',
        '• In the execution result, open the JSON and look for "teams": [{ "id": 90123456, "name": "Workspace Name", ... }].',
        '• The numeric "id" for the team you want to use is your Workspace ID.',
        '',
        'Step 2: Copy Workspace ID from the browser URL (alternative).',
        '• Log into ClickUp in your browser.',
        '• When you are on the workspace home screen, the URL often looks like: app.clickup.com/WORKSPACE_ID.',
        '• The segment after the domain (for example 90123456) is your Workspace ID.',
        '',
        'Step 3: Paste Workspace ID into this field.',
        '• Use the numeric ID only, no slashes or extra characters.',
        '• This ID will be used by other operations (Get Spaces, Create Space, etc.).',
        '',
        'Example:',
        '90123456'
      ],
      example: '90123456'
    },
    spaceId: {
      title: 'ClickUp Space ID – Step-by-Step',
      steps: [
        'Step 1: Discover spaces using Get Spaces.',
        '• Make sure Workspace ID is filled in.',
        '• Set Operation to "Get Spaces" and run the node.',
        '• In the response, look under "spaces": [{ "id": "space_id", "name": "My Space", ... }].',
        '• Copy the "id" value for the space you plan to use.',
        '',
        'Step 2: Or copy Space ID from the ClickUp URL.',
        '• Open the space in ClickUp (click its name in the left sidebar).',
        '• In some views or settings, the URL contains the space ID (e.g. .../space/SPACE_ID or in query parameters).',
        '• Copy just the ID portion.',
        '',
        'Step 3: Paste the ID into Space ID.',
        '• Paste the ID here exactly.',
        '• This ID is needed when creating folders/lists or listing folders/lists within this space.',
        '',
        'Example:',
        '12345678'
      ],
      example: '12345678'
    },
    folderId: {
      title: 'ClickUp Folder ID – Step-by-Step',
      steps: [
        'Step 1: List folders via Get Folders.',
        '• Ensure Workspace ID and Space ID are filled in.',
        '• Set Operation to "Get Folders" and run the node.',
        '• In the result, look for "folders": [{ "id": "folder_id", "name": "My Folder", ... }].',
        '• Copy the "id" of the folder you want to use.',
        '',
        'Step 2: Or copy from the Folder URL.',
        '• Open that folder in ClickUp in your browser.',
        '• Many URLs contain /folder/FOLDER_ID or similar.',
        '• Copy only the FOLDER_ID segment.',
        '',
        'Step 3: Paste into Folder ID.',
        '• Paste the folder ID into this field.',
        '• This value is required when creating lists under a folder or when listing lists for a folder.',
        '',
        'Example:',
        '12345678'
      ],
      example: '12345678'
    },
    listId: {
      title: 'ClickUp List ID – Step-by-Step',
      steps: [
        'Step 1: Use Get Lists to see all lists.',
        '• Fill Workspace ID, Space ID, and (optionally) Folder ID.',
        '• Set Operation to "Get Lists" and run the node.',
        '• In the response, inspect "lists": [{ "id": "list_id", "name": "My List", ... }].',
        '• Copy the "id" value for the list you plan to read from or write to.',
        '',
        'Step 2: Or copy List ID from the URL.',
        '• Open the list in ClickUp.',
        '• The URL often has a segment like .../v/li/LIST_ID.',
        '• Copy the string after "li/" (that is your List ID).',
        '',
        'Step 3: Paste the ID into List ID.',
        '• Paste the list ID here exactly.',
        '• This ID is required for Create Task, List Tasks, and other list‑scoped task operations.',
        '',
        'Example:',
        '98765432'
      ],
      example: '98765432'
    },
    taskId: {
      title: 'ClickUp Task ID – Step-by-Step',
      steps: [
        'Step 1: Capture Task ID from a previous node (recommended).',
        '• When you Create Task or List Tasks, the API response includes an "id" field for each task.',
        '• Store that value or reference it directly, e.g. {{createTask.id}} or {{listTasks[0].id}}.',
        '• Use that expression in this Task ID field.',
        '',
        'Step 2: Copy from the task URL.',
        '• Open the task in ClickUp.',
        '• The URL usually contains /t/TASK_ID or similar (for example .../t/abc123def456).',
        '• Copy just the TASK_ID portion.',
        '',
        'Step 3: Paste or reference the ID here.',
        '• Paste the literal ID or use a variable expression.',
        '• This ID is required for Get Task, Update Task, Delete Task, Add Comment, and Update Task Status.',
        '',
        'Example:',
        'abc123def456'
      ],
      example: 'abc123def456'
    },
    name: {
      title: 'How to get Task Name?',
      steps: [
        'You type or provide the name—it is the title you want the task to have in ClickUp.',
        '',
        '• Static: Type it directly, e.g. "Complete project report", "Review proposal"',
        '',
        '• Dynamic: If your platform supports expressions, use data from earlier steps, e.g. {{input.title}} or "Follow up: {{trigger.subject}}"',
        '',
        'This field is required for Create Task and can be set in Update Task. It is ignored for other operations.'
      ],
      example: 'Complete project report'
    },
    description: {
      title: 'How to get Task Description?',
      steps: [
        'You type or provide the description—optional. ClickUp supports markdown.',
        '',
        '• Static: Type or paste directly',
        '',
        '• Dynamic: Use an expression from a previous step, e.g. {{aiNode.summary}} or {{trigger.body}}',
        '',
        'Used for Create Task and Update Task. Ignored for other operations.'
      ],
      example: 'Task description'
    },
    status: {
      title: 'How to get Status?',
      steps: [
        'Status must match exactly a status that exists in your List.',
        '',
        '• From ClickUp: Open your List and look at the status column or list settings. The labels (e.g. "to do", "in progress", "complete") are the exact names to use.',
        '',
        '• From API: When you Get Task or List Tasks, each task has a status object with a "status" field (the name). Use that exact string.',
        '',
        'Type the exact status name into the Status field. Case-sensitive. Used for Update Task Status and optionally for Create/Update Task.'
      ],
      example: 'in progress'
    },
    priority: {
      title: 'How to get Priority?',
      steps: [
        'You choose from the dropdown in this node: Urgent, High, Normal, or Low.',
        '',
        '• Urgent = 4, High = 3, Normal = 2, Low = 1',
        '',
        'Used for Create Task and Update Task. Ignored for other operations.'
      ],
      example: 'Normal (2)'
    },
    assignees: {
      title: 'How to get Assignees (JSON)?',
      steps: [
        'Assignees is a JSON array of user IDs (workspace member IDs).',
        '',
        '• Get user IDs from workspace members (API or ClickUp team settings). Each member has an "id".',
        '',
        '• From a previous node: If you listed tasks or got a task, assignees may be in the response as an array of IDs. Reuse that format.',
        '',
        '• Format: Enter a JSON array, e.g. ["12345678"] or ["id1","id2"]. No spaces inside brackets if your platform expects strict JSON.',
        '',
        'Used for Create Task and Update Task. Ignored for other operations.'
      ],
      example: '["user-id-1","user-id-2"]'
    },
    dueDate: {
      title: 'How to get Due Date (Unix timestamp)?',
      steps: [
        'Due date must be in Unix timestamp in milliseconds (ms since Jan 1, 1970 00:00:00 UTC).',
        '',
        '• Example: 1735689600000 = 2024-12-31 00:00:00 UTC',
        '',
        '• From a previous step: If your platform has a "date to Unix ms" or "timestamp" function, use it (e.g. timestamp(input.dueDate)).',
        '',
        '• Manual: Use an online "date to Unix timestamp milliseconds" tool, or in code: new Date("2024-12-31").getTime()',
        '',
        'Used for Create Task and Update Task. Ignored for other operations.'
      ],
      example: '1735689600000'
    },
    commentText: {
      title: 'How to get Comment Text?',
      steps: [
        'You type or provide the comment—the text that will appear as a comment on the task.',
        '',
        '• Static: Type or paste directly',
        '',
        '• Dynamic: Use an expression, e.g. {{aiNode.summary}} or "Workflow completed at {{now}}"',
        '',
        'Required for Add Comment. Ignored for other operations.'
      ],
      example: 'My comment'
    },
    includeClosed: {
      title: 'How to use Include Closed Tasks?',
      steps: [
        'This is a toggle (on/off) in the node—you don’t "get" it from elsewhere.',
        '',
        '• Off (false): List Tasks returns only open/incomplete tasks. Default.',
        '',
        '• On (true): List Tasks returns all tasks, including closed/completed.',
        '',
        'Used only for List Tasks. Ignored for other operations.'
      ],
      example: 'false'
    }
  },
  trello: {
    apiKey: {
      title: 'Trello API Key – Step-by-Step',
      url: 'https://trello.com/app-key',
      steps: [
        '1️⃣ Open Trello App Key Page',
        '   Go to 👉 https://trello.com/app-key',
        '   Sign in to your Trello account',
        '',
        '2️⃣ Copy API Key',
        '   Your API Key is displayed on the page',
        '   Copy it',
        '',
        '3️⃣ Get Token',
        '   You\'ll also need a Token',
        '   Generate it using the API Key',
        '',
        '4️⃣ Store Securely',
        '   Paste it into the Trello API Key field above',
        '',
        'Example:',
        'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
      ],
      example: 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
    },
    token: {
      title: 'Trello Token – Step-by-Step',
      url: 'https://trello.com/1/authorize',
      steps: [
        '1️⃣ Get API Key First',
        '   Go to trello.com/app-key',
        '   Copy your API Key',
        '',
        '2️⃣ Generate Token',
        '   Go to: trello.com/1/authorize',
        '   Add parameters:',
        '   ?expiration=never&scope=read,write&response_type=token&name=WorkflowIntegration&key=YOUR_API_KEY',
        '',
        '3️⃣ Authorize',
        '   Click "Allow"',
        '   You\'ll be redirected with token in URL',
        '',
        '4️⃣ Copy Token',
        '   Token is in the URL after #token=',
        '   Copy it',
        '',
        '5️⃣ Store Securely',
        '   Paste it into the Token field above',
        '',
        'Example:',
        'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
      ],
      example: 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
    }
  },
  asana: {
    accessToken: {
      title: 'Asana Personal Access Token – Step-by-Step',
      url: 'https://app.asana.com',
      steps: [
        '1️⃣ Open Asana',
        '   Go to 👉 https://app.asana.com',
        '   Sign in to your account',
        '',
        '2️⃣ Go to Developer Console',
        '   Click your profile icon (top right)',
        '   Click "My Profile Settings"',
        '   Click "Apps" → "Manage Developer Apps"',
        '',
        '3️⃣ Create Personal Access Token',
        '   Click "Create New Token"',
        '   Give it a name (e.g., "Workflow Integration")',
        '',
        '4️⃣ Copy Token',
        '   ⚠️ IMPORTANT: Copy immediately!',
        '   You won\'t see it again!',
        '',
        '5️⃣ Store Securely',
        '   Paste it into the Access Token field above',
        '',
        'Example:',
        '1/xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
      ],
      example: '1/xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
    }
  },
  jira: {
    apiToken: {
      title: 'Jira API Token – Step-by-Step',
      url: 'https://id.atlassian.com',
      steps: [
        '1️⃣ Open Atlassian Account',
        '   Go to 👉 https://id.atlassian.com',
        '   Sign in with your Atlassian account',
        '',
        '2️⃣ Go to Security',
        '   Click "Security" in left sidebar',
        '   Or go to: id.atlassian.com/manage-profile/security/api-tokens',
        '',
        '3️⃣ Create API Token',
        '   Click "Create API token"',
        '   Give it a label (e.g., "Workflow Integration")',
        '   Click "Create"',
        '',
        '4️⃣ Copy API Token',
        '   ⚠️ IMPORTANT: Copy immediately!',
        '   You won\'t see it again!',
        '',
        '5️⃣ Store Securely',
        '   Paste it into the API Token field above',
        '   Use with your email for authentication',
        '',
        'Example:',
        'ATATT3xFfGF0xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
      ],
      example: 'ATATT3xFfGF0xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
    },
    email: {
      title: 'How to get Jira Email?',
      steps: [
        'Use the same email address you use to sign in to Jira.',
        '',
        'Example:',
        'user@example.com'
      ],
      example: 'user@example.com'
    },
    domain: {
      title: 'Jira Domain (Site URL) – Step-by-Step',
      steps: [
        '1️⃣ Open Jira in your browser',
        '',
        '2️⃣ Copy the site URL domain',
        '   Example full URL: https://yourcompany.atlassian.net',
        '   Domain to enter: yourcompany.atlassian.net',
        '',
        '3️⃣ Paste it into the Jira Domain field above',
        '   Do not include https://',
        '',
        'Example:',
        'yourcompany.atlassian.net'
      ],
      example: 'yourcompany.atlassian.net'
    },
    operation: {
      title: 'How to get Operation?',
      steps: [
        'You don’t get this from anywhere—you choose it from the dropdown in this node.',
        '',
        '• Create Issue – Create a new issue (requires Project Key, Summary).',
        '',
        '• Update Issue – Modify an issue (requires Issue Key).',
        '',
        '• Get Issue – Retrieve issue details (requires Issue Key).',
        '',
        '• Delete Issue – Remove an issue (requires Issue Key).',
        '',
        '• Search Issues – Find issues using JQL (requires JQL Query).',
        '',
        '• Transition Issue – Change issue status (requires Issue Key and Transition ID).',
        '',
        '• Add Comment – Add a comment (requires Issue Key and Comment Body).',
        '',
        '• Get Projects – List all projects.'
      ],
      example: 'Create Issue'
    },
    projectKey: {
      title: 'Jira Project Key – Step-by-Step',
      steps: [
        '1️⃣ Open your Jira project',
        '',
        '2️⃣ Look at the URL or project settings',
        '   The project key is shown in the URL or next to the project name',
        '   Example: PROJ',
        '',
        '3️⃣ Paste it into the Project Key field above',
        '',
        'Example:',
        'PROJ'
      ],
      example: 'PROJ'
    },
    issueKey: {
      title: 'Jira Issue Key – Step-by-Step',
      steps: [
        '1️⃣ Open the issue in Jira',
        '',
        '2️⃣ Copy the issue key from the header or URL',
        '   Example: PROJ-123',
        '',
        '3️⃣ Paste it into the Issue Key field above',
        '',
        'Example:',
        'PROJ-123'
      ],
      example: 'PROJ-123'
    },
    summary: {
      title: 'How to get Issue Summary?',
      steps: [
        'You type the summary—the short title of the issue.',
        '',
        '• Static: Type it directly, e.g. "Fix login bug".',
        '',
        '• Dynamic: Use data from earlier steps, e.g. "{{input.subject}}".',
        '',
        'Required for Create Issue.'
      ],
      example: 'Fix login bug'
    },
    description: {
      title: 'How to get Issue Description?',
      steps: [
        'You type the detailed issue description.',
        '',
        '• Static: Type or paste directly.',
        '',
        '• Dynamic: Use data from earlier steps, e.g. "{{aiNode.summary}}".',
        '',
        'Markdown is supported.'
      ],
      example: 'Issue description'
    },
    issueType: {
      title: 'How to get Issue Type?',
      steps: [
        'Issue Type must match a type in your project.',
        '',
        'Examples: Task, Bug, Story, Epic.',
        '',
        'Check your project\'s issue type list and use the exact name.'
      ],
      example: 'Task'
    },
    assignee: {
      title: 'How to get Assignee Account ID?',
      steps: [
        'Assignee Account ID is a user identifier in Jira Cloud.',
        '',
        '• Use Jira user search API to find the accountId.',
        '• Or open the user profile (if visible) and copy account ID.',
        '',
        'Paste the account ID into the Assignee field.'
      ],
      example: 'account-id'
    },
    priority: {
      title: 'How to get Priority?',
      steps: [
        'Choose a priority from the dropdown.',
        '',
        'Common values: Highest, High, Medium, Low, Lowest.',
        '',
        'Use the priority names defined in your Jira instance.'
      ],
      example: 'Medium'
    },
    labels: {
      title: 'How to get Labels (JSON)?',
      steps: [
        'Labels are a JSON array of label names.',
        '',
        'Example: ["bug", "urgent"]',
        '',
        'Use labels that already exist or create new ones.'
      ],
      example: '["bug","urgent"]'
    },
    transitionId: {
      title: 'Jira Transition ID – Step-by-Step',
      steps: [
        '1️⃣ Use Jira transitions API for the issue',
        '',
        '2️⃣ Find the transition you want',
        '   Copy its "id" value',
        '',
        '3️⃣ Paste it into the Transition ID field above',
        '',
        'Example:',
        '31'
      ],
      example: '31'
    },
    commentBody: {
      title: 'How to get Comment Body?',
      steps: [
        'You type or provide the comment text.',
        '',
        '• Static: Type it directly.',
        '',
        '• Dynamic: Use data from earlier steps, e.g. "{{input.feedback}}".',
        '',
        'Required for Add Comment.'
      ],
      example: 'My comment'
    },
    jql: {
      title: 'How to get JQL Query?',
      steps: [
        'Use Jira Advanced Search to build a JQL query.',
        '',
        'Example: project = PROJ AND status = "In Progress"',
        '',
        'Copy the JQL string and paste it into the JQL Query field.'
      ],
      example: 'project = PROJ AND status = "In Progress"'
    },
    maxResults: {
      title: 'How to get Max Results?',
      steps: [
        'Enter the maximum number of issues to return.',
        '',
        'Default is often 50.',
        '',
        'Use smaller values for large projects to avoid large responses.'
      ],
      example: '50'
    }
  },
  monday: {
    apiToken: {
      title: 'Monday.com API Token – Step-by-Step',
      url: 'https://monday.com',
      steps: [
        '1️⃣ Open Monday.com',
        '   Go to 👉 https://monday.com',
        '   Sign in to your account',
        '',
        '2️⃣ Go to Admin',
        '   Click your profile icon (bottom left)',
        '   Click "Admin"',
        '',
        '3️⃣ Navigate to API',
        '   Click "API" in left sidebar',
        '   Or go to: monday.com/marketplace/api',
        '',
        '4️⃣ Generate API Token',
        '   Click "Generate new token"',
        '   Give it a name (e.g., "Workflow Integration")',
        '   Click "Generate"',
        '',
        '5️⃣ Copy Token',
        '   ⚠️ IMPORTANT: Copy immediately!',
        '   You won\'t see it again!',
        '',
        '6️⃣ Store Securely',
        '   Paste it into the API Token field above',
        '',
        'Example:',
        'eyJhbGciOiJIUzI1NiJ9.eyJ0aWQiOjxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
      ],
      example: 'eyJhbGciOiJIUzI1NiJ9.eyJ0aWQiOjxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
    }
  },
  todoist: {
    apiToken: {
      title: 'Todoist API Token – Step-by-Step',
      url: 'https://todoist.com',
      steps: [
        '1️⃣ Open Todoist',
        '   Go to 👉 https://todoist.com',
        '   Sign in to your account',
        '',
        '2️⃣ Go to Settings',
        '   Click "Settings" (gear icon)',
        '   Click "Integrations"',
        '',
        '3️⃣ Get API Token',
        '   Scroll to "API token" section',
        '   Click "Copy" to copy your token',
        '   Or go to: todoist.com/app/settings/integrations',
        '',
        '4️⃣ Store Securely',
        '   Paste it into the API Token field above',
        '',
        'Example:',
        'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
      ],
      example: 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
    }
  },
  // Analytics & Monitoring
  reddit: {
    clientId: {
      title: 'Reddit Client ID – Step-by-Step',
      url: 'https://www.reddit.com/prefs/apps',
      steps: [
        '1️⃣ Open Reddit Apps',
        '   Go to 👉 https://www.reddit.com/prefs/apps',
        '   Sign in to your Reddit account',
        '',
        '2️⃣ Create App',
        '   Scroll down and click "create another app..."',
        '   Or "create app" button',
        '',
        '3️⃣ Fill App Details',
        '   Name: Your app name (e.g., "Workflow Integration")',
        '   App type: Select "script"',
        '   Description: Brief description',
        '   Redirect URI: http://localhost:8080',
        '',
        '4️⃣ Create App',
        '   Click "create app"',
        '',
        '5️⃣ Get Client ID',
        '   Under your app, find the string',
        '   Under "personal use script" label',
        '   That\'s your Client ID',
        '',
        '6️⃣ Store Securely',
        '   Paste it into the Client ID field above',
        '   You\'ll also need Client Secret',
        '',
        'Example:',
        'xxxxxxxxxxxxxxxxxx'
      ],
      example: 'xxxxxxxxxxxxxxxxxx'
    },
    clientSecret: {
      title: 'Reddit Client Secret – Step-by-Step',
      url: 'https://www.reddit.com/prefs/apps',
      steps: [
        '1️⃣ In Reddit App Settings',
        '   After creating app',
        '   Find "secret" field',
        '',
        '2️⃣ Copy Client Secret',
        '   The secret is shown under your app',
        '   It\'s a long string',
        '',
        '3️⃣ Store Securely',
        '   Paste it into the Client Secret field above',
        '   Never share publicly',
        '',
        'Example:',
        'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
      ],
      example: 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
    },
    accessToken: {
      title: 'Reddit Access Token – Step-by-Step',
      steps: [
        '1️⃣ Use OAuth 2.0 Flow',
        '   POST to: https://www.reddit.com/api/v1/access_token',
        '   Include: grant_type, username, password',
        '   Use Basic Auth with clientId:clientSecret',
        '',
        '2️⃣ Get Access Token',
        '   Response includes access_token',
        '   Copy the access_token',
        '',
        '3️⃣ Store Securely',
        '   Paste it into the Access Token field above',
        '   ⚠️ Token expires - refresh when needed',
        '',
        'Example:',
        'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
      ],
      example: 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
    }
  },
  google_analytics: {
    operation: {
      title: 'How to get Operation?',
      steps: [
        'You choose this from the dropdown in the node.',
        '',
        '• Get Report – Use when you want metrics and dimensions for a date range. Set Access Token, Property ID, Date Ranges, and Metrics (and optionally Dimensions).',
        '',
        '• List Properties – Use when you want to list Analytics properties you can access (e.g. to find a Property ID). You need Access Token only.',
        '',
        '• Track Event – Use when you want to send an event to Google Analytics. Set Access Token, Property ID, Event Name, and optionally Event Parameters.'
      ]
    },
    accessToken: {
      title: 'How to get Access Token?',
      url: 'https://console.cloud.google.com',
      steps: [
        '1️⃣ If your platform has "Connect Google" or "Sign in with Google":',
        '   Go to Settings → Integrations (or similar)',
        '   Click Connect Google',
        '   Sign in with the Google account that has access to your Analytics property',
        '   Approve the requested scopes (e.g. "View your Google Analytics data")',
        '   The platform stores the Access Token and may fill this field automatically',
        '',
        '2️⃣ If using a Service Account:',
        '   The platform uses the Service Account JSON to obtain the token',
        '   Ensure the service account email is added in Analytics Admin → Property Access Management',
        '',
        '3️⃣ If you must paste a token manually:',
        '   Use OAuth2 flow with your platform\'s Client ID and Client Secret to get an access token',
        '   The token is temporary (often 1 hour); the platform may use a refresh token to get new ones',
        '',
        '⚠️ For Analytics Data API, an access token is required—not a long-lived API key.'
      ]
    },
    apiKey: {
      title: 'Google Analytics Access Token – Step-by-Step',
      url: 'https://console.cloud.google.com',
      steps: [
        '1️⃣ Open Google Cloud Console',
        '   Go to 👉 https://console.cloud.google.com',
        '   Sign in with your Google account',
        '',
        '2️⃣ Create or Select Project',
        '   Click project dropdown',
        '   Select project or create new',
        '',
        '3️⃣ Enable Google Analytics Data API',
        '   Search for "Google Analytics Data API"',
        '   Click on it',
        '   Click "Enable"',
        '',
        '4️⃣ Create OAuth credentials or Service Account',
        '   Credentials → Create Credentials → OAuth client ID (or Service Account)',
        '   For OAuth: Use the platform\'s "Connect Google" to get an access token',
        '   For Service Account: Download JSON and add the service account email to Analytics Admin → Property Access Management',
        '',
        '5️⃣ Use the access token',
        '   The platform may fill the Access Token field after you connect Google',
        '   Or paste the token if your platform expects it',
        '',
        '⚠️ Use an access token (OAuth or Service Account), not a static API key.'
      ]
    },
    propertyId: {
      title: 'How to get Property ID?',
      url: 'https://analytics.google.com',
      steps: [
        '1️⃣ Open Google Analytics',
        '   Go to 👉 https://analytics.google.com',
        '   Sign in and select the account that contains your property',
        '',
        '2️⃣ Go to Admin',
        '   Click Admin (gear icon) in the bottom left',
        '',
        '3️⃣ Select your property',
        '   In the Property column, select the GA4 property you want',
        '',
        '4️⃣ Open Property Settings',
        '   Click Property Settings',
        '',
        '5️⃣ Copy Property ID',
        '   At the top you will see Property ID – a numeric value (e.g. 123456789)',
        '   For the node use: properties/123456789',
        '',
        'Example:',
        'properties/123456789'
      ],
      example: 'properties/123456789'
    },
    dateRanges: {
      title: 'How to get Date Ranges (JSON)?',
      steps: [
        'You type or build this—it is not copied from the Analytics dashboard.',
        '',
        'Format: Use YYYY-MM-DD for dates. JSON array of objects with startDate and endDate.',
        '',
        'Single range:',
        '[{"startDate": "2024-01-01", "endDate": "2024-01-31"}]',
        '',
        'Multiple ranges (if supported):',
        '[{"startDate": "2024-01-01", "endDate": "2024-01-31"}, {"startDate": "2024-02-01", "endDate": "2024-02-29"}]',
        '',
        'If your platform supports expressions, you can use dynamic dates (e.g. from a previous step) as long as they resolve to YYYY-MM-DD.'
      ],
      example: '[{"startDate": "2024-01-01", "endDate": "2024-01-31"}]'
    },
    dimensions: {
      title: 'How to get Dimensions (JSON)?',
      steps: [
        'You choose dimension names from the Google Analytics Data API (GA4). They are not copied from the dashboard.',
        '',
        'Common GA4 dimensions:',
        '   • date – Date in YYYYMMDD',
        '   • country, city – Geography',
        '   • deviceCategory – desktop, mobile, tablet',
        '   • sessionSource, sessionMedium, sessionCampaignName – Acquisition',
        '   • pagePath, pageTitle – Page',
        '',
        'Format: JSON array of strings: ["date", "country", "city"]',
        '',
        'Check Google\'s "Dimensions & metrics reference" for the Analytics Data API. Invalid names cause API errors. Leave empty for totals only.'
      ],
      example: '["date", "country", "city"]'
    },
    metrics: {
      title: 'How to get Metrics (JSON)?',
      steps: [
        'You choose metric names from the Google Analytics Data API (GA4). They are not copied from the dashboard.',
        '',
        'Common GA4 metrics:',
        '   • activeUsers – Users in the period',
        '   • sessions – Sessions',
        '   • screenPageViews – Page/screen views',
        '   • conversions – Conversions',
        '   • totalRevenue – Revenue (e-commerce)',
        '',
        'Format: JSON array of strings: ["activeUsers", "sessions", "screenPageViews"]',
        '',
        'Check Google\'s "Dimensions & metrics reference" for the Analytics Data API. At least one metric is required for Get Report.'
      ],
      example: '["activeUsers", "sessions", "screenPageViews"]'
    },
    eventName: {
      title: 'How to get Event Name?',
      steps: [
        'You choose or type the event name—the name you give to the action you are tracking.',
        '',
        'Standard events: Google recommends names like purchase, sign_up, page_view.',
        '',
        'Custom events: Use lowercase and underscores (e.g. form_submit, report_generated, workflow_completed).',
        '',
        'If your platform supports expressions, you can use a value from a previous step (e.g. {{input.eventName}}).',
        '',
        'This field is only used when Operation = Track Event.'
      ],
      example: 'purchase'
    },
    eventParams: {
      title: 'How to get Event Parameters (JSON)?',
      steps: [
        'You build this JSON object—it is not copied from Analytics.',
        '',
        'Common parameters:',
        '   • value – Numeric value (e.g. revenue)',
        '   • currency – Currency code (e.g. USD)',
        '   • Custom parameter names allowed by the Measurement Protocol or your platform',
        '',
        'Format: JSON object: {"value": 100, "currency": "USD"}',
        '',
        'This field is only used when Operation = Track Event. Leave empty or {} if you do not need parameters.'
      ],
      example: '{"value": 100, "currency": "USD"}'
    }
  },
  mixpanel: {
    apiSecret: {
      title: 'Mixpanel API Secret – Step-by-Step',
      url: 'https://mixpanel.com',
      steps: [
        '1️⃣ Open Mixpanel',
        '   Go to 👉 https://mixpanel.com',
        '   Sign in to your account',
        '',
        '2️⃣ Go to Project Settings',
        '   Click "Settings" (gear icon)',
        '   Click "Project Settings"',
        '',
        '3️⃣ Navigate to Service Accounts',
        '   Click "Service Accounts" tab',
        '   Or go to: mixpanel.com/project/YOUR_PROJECT/settings',
        '',
        '4️⃣ Get API Secret',
        '   Find "API Secret" in settings',
        '   Click "Show" to reveal',
        '   Copy the secret',
        '',
        '5️⃣ Store Securely',
        '   Paste it into the API Secret field above',
        '',
        'Example:',
        'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
      ],
      example: 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
    }
  },
  segment: {
    writeKey: {
      title: 'Segment Write Key – Step-by-Step',
      url: 'https://app.segment.com',
      steps: [
        '1️⃣ Open Segment',
        '   Go to 👉 https://app.segment.com',
        '   Sign in to your account',
        '',
        '2️⃣ Select Workspace',
        '   Select your workspace',
        '   Or create new workspace',
        '',
        '3️⃣ Go to Sources',
        '   Click "Sources" in left sidebar',
        '   Select or create a source',
        '',
        '4️⃣ Get Write Key',
        '   In source settings, find "Write Key"',
        '   Copy the Write Key',
        '',
        '5️⃣ Store Securely',
        '   Paste it into the Write Key field above',
        '',
        'Example:',
        'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
      ],
      example: 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
    }
  },
  amplitude: {
    apiKey: {
      title: 'Amplitude API Key – Step-by-Step',
      url: 'https://amplitude.com',
      steps: [
        '1️⃣ Open Amplitude',
        '   Go to 👉 https://amplitude.com',
        '   Sign in to your account',
        '',
        '2️⃣ Select Project',
        '   Select your project',
        '   Or create new project',
        '',
        '3️⃣ Go to Settings',
        '   Click "Settings" (gear icon)',
        '   Click "Projects" → Select your project',
        '',
        '4️⃣ Get API Key',
        '   Find "API Key" in project settings',
        '   Copy the API Key',
        '',
        '5️⃣ Store Securely',
        '   Paste it into the API Key field above',
        '',
        'Example:',
        'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
      ],
      example: 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
    }
  },
  elasticsearch: {
    username: {
      title: 'Elasticsearch Username – Step-by-Step',
      steps: [
        '1️⃣ Get Elasticsearch Username',
        '   From your Elasticsearch administrator',
        '   Or from Elasticsearch configuration',
        '   Common default: elastic',
        '',
        '2️⃣ Use the Username',
        '   Paste it into the Username field above',
        '   You\'ll also need Password',
        '',
        'Example:',
        'elastic'
      ],
      example: 'elastic'
    },
    password: {
      title: 'Elasticsearch Password – Step-by-Step',
      steps: [
        '1️⃣ Get Elasticsearch Password',
        '   From your Elasticsearch administrator',
        '   Or reset in Elasticsearch settings',
        '',
        '2️⃣ Store Securely',
        '   Paste it into the Password field above',
        '   Never commit to version control',
        '',
        '⚠️ Security Note:',
        'Passwords are sensitive - store securely!'
      ],
      example: 'YourSecurePassword123!'
    }
  },
  // Accounting
  xero: {
    clientId: {
      title: 'Xero Client ID – Step-by-Step',
      url: 'https://developer.xero.com',
      steps: [
        '1️⃣ Open Xero Developer Portal',
        '   Go to 👉 https://developer.xero.com',
        '   Sign in with your Xero account',
        '',
        '2️⃣ Go to My Apps',
        '   Click "My Apps" in top menu',
        '   Or go to: developer.xero.com/myapps',
        '',
        '3️⃣ Create New App',
        '   Click "New app"',
        '   Choose "Web app" or "Public"',
        '   Fill in app details',
        '',
        '4️⃣ Get Client ID',
        '   After creating app',
        '   Copy the "Client ID"',
        '',
        '5️⃣ Store Securely',
        '   Paste it into the Client ID field above',
        '   You\'ll also need Client Secret',
        '',
        'Example:',
        'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx'
      ],
      example: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx'
    },
    clientSecret: {
      title: 'Xero Client Secret – Step-by-Step',
      url: 'https://developer.xero.com',
      steps: [
        '1️⃣ In Xero App Settings',
        '   After creating app',
        '   Find "Client Secret"',
        '',
        '2️⃣ Copy Client Secret',
        '   Click "Show" to reveal',
        '   Copy the secret',
        '',
        '3️⃣ Store Securely',
        '   Paste it into the Client Secret field above',
        '   Never share publicly',
        '',
        'Example:',
        'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
      ],
      example: 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
    },
    accessToken: {
      title: 'Xero OAuth Access Token – Step-by-Step',
      url: 'https://developer.xero.com',
      steps: [
        '1️⃣ Complete OAuth 2.0 Flow',
        '   Use Client ID and Client Secret',
        '   Redirect to Xero authorization',
        '   User grants permissions',
        '',
        '2️⃣ Get Authorization Code',
        '   After user authorizes',
        '   You\'ll receive authorization code',
        '',
        '3️⃣ Exchange for Access Token',
        '   POST to: https://identity.xero.com/connect/token',
        '   Include: grant_type, code, redirect_uri',
        '',
        '4️⃣ Copy Access Token',
        '   From OAuth response',
        '   Copy the access_token',
        '   ⚠️ Token expires - use refresh token',
        '',
        '5️⃣ Store Securely',
        '   Paste it into the Access Token field above',
        '',
        'Example:',
        'eyJhbGciOiJSUzI1NiIsImtpZCI6...'
      ],
      example: 'eyJhbGciOiJSUzI1NiIsImtpZCI6...'
    }
  },
  // Google Contacts
  google_contacts: {
    operation: {
      title: 'How to get Operation?',
      steps: [
        'You choose this from the dropdown in the node.',
        '',
        '• List Contacts – Use when you want to retrieve contacts from Google Contacts. You can set Max Results to limit how many are returned.',
        '',
        '• Create Contact – Use when you want to add a new contact. You need Name and Email (and optionally Phone).',
        '',
        '• Update Contact – Use when you want to change an existing contact. You need Contact ID and the fields you want to change (Name, Email, Phone).',
        '',
        '• Delete Contact – Use when you want to remove a contact. You need Contact ID only.'
      ]
    },
    contactId: {
      title: 'Google Contacts Contact ID – Step-by-Step',
      steps: [
        '1️⃣ Open Google Contacts',
        '   Go to 👉 https://contacts.google.com',
        '   Sign in with your Google account',
        '',
        '2️⃣ Find Contact',
        '   Search for or select the contact',
        '   Click on the contact to view details',
        '',
        '3️⃣ Get Contact ID',
        '   Contact ID is in the URL',
        '   Format: contacts.google.com/person/c1234567890',
        '   The ID is after /person/',
        '',
        '4️⃣ Alternative: From a previous node',
        '   If you used List Contacts earlier, use the contact id or resourceName from the output, e.g. {{listNode.contacts[0].resourceName}}',
        '',
        '5️⃣ Use the Contact ID',
        '   Paste it into the Contact ID field above (or use people/c1234567890 if your platform expects resource name)',
        '',
        'Example:',
        'c1234567890'
      ],
      example: 'c1234567890'
    },
    name: {
      title: 'How to get Name?',
      steps: [
        'You type or set the name—it is not copied from an existing contact unless you reference a previous step.',
        '',
        'Static name: Type it directly, e.g. "John Doe" or "Jane Smith".',
        '',
        'Dynamic name: If your platform supports expressions, use data from earlier steps, e.g. {{input.firstName}} {{input.lastName}} or {{form.name}}.',
        '',
        'This field is only used when Operation = Create or Update. It is ignored for List and Delete.'
      ],
      example: 'John Doe'
    },
    email: {
      title: 'How to get Email?',
      steps: [
        'Option 1: Type it – If the email is fixed (e.g. support@company.com), type it in the Email field.',
        '',
        'Option 2: From a form or trigger – If the workflow was started by a form or webhook, the submitter\'s email is often in the trigger data. Use {{trigger.email}} or {{input.email}}.',
        '',
        'Option 3: From a previous node – If an earlier step (e.g. CRM, spreadsheet, AI) returned an email, reference it, e.g. {{previousNode.email}}.',
        '',
        'Format: Must be a valid email (name@domain.com). No spaces. Required for Create and Update.'
      ],
      example: 'john@example.com'
    },
    phone: {
      title: 'How to get Phone?',
      steps: [
        'You type or set the phone number—it is not copied from an existing contact unless you reference a previous step.',
        '',
        'Format: Include country code with + prefix when possible (e.g. +1 for US, +44 for UK). Examples: +1234567890, +441234567890.',
        '',
        'Dynamic: If your platform supports expressions, use {{input.phone}} or {{form.phone}}. Optional for Create and Update.'
      ],
      example: '+1234567890'
    },
    maxResults: {
      title: 'How to get Max Results?',
      steps: [
        'You choose the number—it is not copied from Google Contacts.',
        '',
        'What to use: 10–100 for most cases (e.g. "last 50 contacts"); 500–1000 only if you need a larger list.',
        '',
        'This field only affects List Contacts. It is ignored when Operation = Create, Update, or Delete.'
      ],
      example: '100'
    }
  },
  // Google Tasks
  google_tasks: {
    operation: {
      title: 'How to get Operation?',
      steps: [
        'You choose the operation from the dropdown in this node.',
        '',
        'Read - Retrieve tasks from a task list, or one task when Task ID is provided. Set Task List ID or @default.',
        '',
        'Create - Add a new task. You need Task Title; Notes and Due Date are optional.',
        '',
        'Update - Change an existing task. Provide Task ID and any fields you want to update: title, notes, due date, or status.',
        '',
        'Delete - Remove a task. Provide Task ID and Task List ID.'
      ],
      example: 'Read'
    },
    taskListId: {
      title: 'Google Tasks Task List ID – Step-by-Step',
      steps: [
        '1️⃣ For Default List',
        '   Use "@default" for your main task list',
        '   This is the default value',
        '',
        '2️⃣ For Other Lists',
        '   Use a "List Task Lists" step in your workflow if available',
        '   The response includes an "id" for each list—copy that',
        '',
        '3️⃣ Alternative: Google Tasks API',
        '   Call: GET /tasks/v1/users/@me/lists',
        '   Find the "id" field in the response',
        '',
        '4️⃣ Use the Task List ID',
        '   Paste it into the Task List ID field above',
        '   Use "@default" for your main list',
        '',
        'Example:',
        '@default'
      ],
      example: '@default'
    },
    taskId: {
      title: 'Google Tasks Task ID – Step-by-Step',
      steps: [
        '1️⃣ From a previous node (recommended)',
        '   Use a List Tasks node earlier in the workflow',
        '   Each task in the output has an "id" field',
        '   Use that value here, e.g. {{listTasksNode.tasks[0].id}}',
        '',
        '2️⃣ From Create Task output',
        '   When you create a task, the node returns an "id"',
        '   Use that id for Update or Complete later',
        '',
        '3️⃣ Task IDs are not shown in Gmail/Calendar UI',
        '   They only come from the API or from a previous List Tasks or Create Task step',
        '',
        'Example:',
        'abc123def456'
      ],
      example: 'abc123def456'
    },
    title: {
      title: 'How to get Task Title?',
      steps: [
        'You type or provide the title—it is the text you want the task to show in Google Tasks.',
        '',
        '• Static title: Type it directly, e.g. "Review proposal", "Send weekly report"',
        '',
        '• Dynamic title: If your platform supports expressions, use data from earlier steps, e.g. {{input.actionItem}} or "Follow up: {{trigger.subject}}"',
        '',
        'Keep it short; use the Notes field for longer details.',
        '',
        'This field is only used when Operation = Create or Update. It is ignored for Read and Delete.'
      ],
      example: 'Complete project report'
    },
    notes: {
      title: 'How to get Notes?',
      steps: [
        'Notes are optional detailed text for the task (instructions, context, links).',
        '',
        '• Static notes: Type or paste directly, e.g. "Check budget and timeline."',
        '',
        '• Dynamic notes: If your platform supports expressions, use data from earlier steps, e.g. {{aiNode.summary}} or "Source: {{trigger.url}}"',
        '',
        'Leave empty if you don’t need notes.',
        '',
        'This field is only used when Operation = Create or Update. It is ignored for Read and Delete.'
      ],
      example: 'Task notes...'
    },
    due: {
      title: 'How to choose Due Date?',
      steps: [
        'Choose the calendar day when the task should be due.',
        '',
        'Use the date picker or type a date as YYYY-MM-DD, for example 2026-12-31.',
        '',
        'Google Tasks stores task due dates at day level. Time of day is not saved by the Google Tasks API.',
        '',
        'If an older workflow already has an RFC3339 value like 2026-12-31T23:59:59Z, CtrlChecks keeps the same calendar day and sends the Google-compatible value automatically.',
        '',
        'Dynamic value: use data from an earlier step only if it resolves to a date, for example {{input.dueDate}}.',
        '',
        'This field is only used when Operation = Create or Update. It is ignored for Read and Delete.'
      ],
      example: '2026-12-31'
    },
    dueDate: {
      title: 'How to choose Due Date?',
      steps: [
        'Use the Due Date field as a calendar date, for example 2026-12-31.',
        '',
        'Google Tasks stores task due dates at day level. Time of day is not saved by the Google Tasks API.'
      ],
      example: '2026-12-31'
    }
  },
  fraud_detection_node: {
    transaction: {
      title: 'How to build the Transaction (JSON)?',
      steps: [
        'The Transaction field is a single JSON object that describes the event you want to check for fraud.',
        '',
        'Include the core details so the model can evaluate risk:',
        '• id: Unique transaction ID from your payment/order system',
        '• amount: Numeric value (no currency symbols)',
        '• currency: 3-letter currency code (USD, INR, EUR)',
        '• merchant: Store, seller, or channel name',
        '• location: Country or region where the transaction happened',
        '• timestamp: ISO date-time (e.g., 2026-02-01T14:32:00Z)',
        '',
        'Where to get these values:',
        '• Payment gateway or order system for id, amount, currency',
        '• User profile or billing address for location',
        '• Your database or logs for timestamp',
        '',
        'Tip: If you do not have a field, leave it out rather than guessing.'
      ],
      example: '{"id":"txn_98456321","amount":4999.00,"currency":"INR","merchant":"Store A","location":"India","timestamp":"2026-02-01T14:32:00Z"}'
    },
    historicalPatterns: {
      title: 'How to set Historical Patterns (JSON)?',
      steps: [
        'Historical Patterns is optional context about typical behavior for this user or account.',
        '',
        'Use it to help the model compare the current transaction against normal activity.',
        '',
        'Common fields include:',
        '• averageAmount: Typical transaction size',
        '• commonMerchants: Usual merchants or channels',
        '• commonLocations: Usual countries or regions',
        '',
        'How to get these values:',
        '• Calculate averages from your last 30–90 days of transactions',
        '• Use your analytics or reporting dashboards',
        '• Store per-user stats in your database for easy reuse',
        '',
        'Tip: If you do not track history, use an empty object {}.'
      ],
      example: '{"averageAmount":800,"commonMerchants":["Store A","Store B"],"commonLocations":["India"]}'
    },
    riskThreshold: {
      title: 'How to set Risk Threshold?',
      steps: [
        'Risk Threshold is the score above which a transaction is flagged as risky.',
        '',
        'This node expects a value from 0 to 1.',
        '• 0.3 = Low threshold (more alerts)',
        '• 0.6 = Medium threshold (balanced)',
        '• 0.8 = High threshold (fewer alerts)',
        '',
        'How to choose a value:',
        '• Start with 0.7 (default)',
        '• Lower it if fraud is missed',
        '• Raise it if too many false positives appear',
        '',
        'Tip: Review outcomes weekly and adjust gradually.'
      ],
      example: '0.7'
    }
  },
  resume_parser: {
    file: {
      title: 'How to provide the Resume File (JSON)?',
      steps: [
        'This field expects a JSON file object with the resume content in Base64.',
        '',
        'Required keys:',
        '• name: File name (e.g., resume.pdf)',
        '• type: File type (pdf, doc, docx, txt, image)',
        '• binary: Base64-encoded file content',
        '',
        'How to get this value:',
        '• From a Form upload field (use its file output)',
        '• From email attachments or file storage nodes',
        '• By encoding a local file to Base64 in your system',
        '',
        'Tip: Use clean, text-based PDFs for best accuracy.'
      ],
      example: '{"name":"John_Doe_Resume.pdf","type":"pdf","binary":"base64..."}'
    },
    normalizeSkills: {
      title: 'What is Normalize Skills?',
      steps: [
        'Normalize Skills standardizes skill names so they match common formats.',
        '',
        'Examples:',
        '• JS → JavaScript',
        '• Py → Python',
        '',
        'Turn this on for better matching and cleaner skill lists.',
        'Turn it off only if you want the raw skill text as-is.'
      ],
      example: 'true'
    },
    experienceCalculation: {
      title: 'What is Calculate Experience?',
      steps: [
        'Calculate Experience estimates total years of experience from the resume timeline.',
        '',
        'Turn this on if you need a single number like "5.5 years".',
        'Turn it off if you only want raw job history details.'
      ],
      example: 'true'
    }
  },
  bitbucket: {
    username: {
      title: 'How to get Bitbucket Username?',
      steps: [
        'Your username is part of your Bitbucket profile.',
        '',
        'Steps:',
        '• Log in to bitbucket.org',
        '• Click your profile picture → Personal settings',
        '• Copy your username from the account settings',
        '',
        'Tip: It also appears in your profile URL: bitbucket.org/USERNAME'
      ],
      example: 'your-username'
    },
    appPassword: {
      title: 'How to create a Bitbucket App Password?',
      steps: [
        'App Passwords are required for API access.',
        '',
        'Steps:',
        '• Go to Personal settings → App passwords',
        '• Click "Create app password"',
        '• Give it a label (e.g., "Automation Access")',
        '• Enable required permissions (Repos, PRs, Issues)',
        '• Click Create and copy the password',
        '',
        'Important: You cannot view it again, so store it securely.'
      ],
      example: 'app-password-from-bitbucket'
    },
    operation: {
      title: 'How to choose Operation?',
      steps: [
        'Operation defines what action the node should perform.',
        '',
        'Common choices:',
        '• Get/List Repository',
        '• Create/Update/Merge Pull Request',
        '• List/Get Branches and Commits',
        '• Get Pipeline status',
        '',
        'Tip: Choose the action that matches your workflow step.'
      ],
      example: 'create_pr'
    },
    workspace: {
      title: 'How to get Workspace ID?',
      steps: [
        'Workspace ID is the first part of the Bitbucket URL.',
        '',
        'Example URL:',
        'bitbucket.org/WORKSPACE/repo-name',
        '',
        'The WORKSPACE part is what you need.',
        'For personal repos, it is often your username.'
      ],
      example: 'my-company-workspace'
    },
    repo: {
      title: 'How to get Repository Name?',
      steps: [
        'Open the repository in Bitbucket.',
        '',
        'Copy the repo name from:',
        '• The page header, or',
        '• The URL: bitbucket.org/workspace/REPO',
        '',
        'Tip: Use the repository slug, not the display title.'
      ],
      example: 'backend-api'
    },
    title: {
      title: 'How to set Pull Request Title?',
      steps: [
        'Title is a short summary of what your PR does.',
        '',
        'Example: "Add login feature"',
        'Tip: Keep it clear and action-focused.'
      ],
      example: 'Add login feature'
    },
    description: {
      title: 'How to set Pull Request Description?',
      steps: [
        'Description is a longer explanation of the changes.',
        '',
        'Include:',
        '• What changed',
        '• Why it changed',
        '• Testing steps (if any)'
      ],
      example: 'Adds login form, validation, and API integration.'
    },
    sourceBranch: {
      title: 'How to get Source Branch?',
      steps: [
        'Source Branch is the branch where changes are made.',
        '',
        'Find it in the Branches list or your PR creation screen.',
        'Example: feature/login'
      ],
      example: 'feature/login'
    },
    destinationBranch: {
      title: 'How to get Destination Branch?',
      steps: [
        'Destination Branch is the branch you want to merge into.',
        '',
        'Common choices: main or master.',
        'Use the default branch if unsure.'
      ],
      example: 'main'
    },
    prId: {
      title: 'How to get Pull Request ID?',
      steps: [
        'Open the pull request in Bitbucket.',
        '',
        'The PR ID is the number in the URL:',
        'bitbucket.org/workspace/repo/pull-requests/123',
        '',
        'The number after /pull-requests/ is the ID.'
      ],
      example: '42'
    },
    comment: {
      title: 'How to add a PR Comment?',
      steps: [
        'Type the exact comment text you want to post on the PR.',
        '',
        'Tip: Use this for approvals, feedback, or automated updates.'
      ],
      example: 'Looks good to me.'
    },
    mergeStrategy: {
      title: 'How to choose Merge Strategy?',
      steps: [
        'Merge Strategy controls how commits are combined.',
        '',
        'Options:',
        '• Merge Commit – keeps all commits',
        '• Squash – combines into one commit',
        '• Fast Forward – no merge commit if possible',
        '',
        'Choose based on your team’s Git workflow.'
      ],
      example: 'merge_commit'
    },
    branchName: {
      title: 'How to set Branch Name?',
      steps: [
        'Branch Name is used for branch actions (create/get/delete).',
        '',
        'Example: feature/login',
        'Tip: Use the exact branch name as shown in Bitbucket.'
      ],
      example: 'feature/login'
    },
    targetBranch: {
      title: 'What is Target Branch?',
      steps: [
        'Target Branch is used as the base when creating a new branch, or for listing branches.',
        '',
        'Example: main',
        'Tip: Use your default branch if unsure.'
      ],
      example: 'main'
    },
    commitSha: {
      title: 'How to get Commit SHA?',
      steps: [
        'Commit SHA is the unique identifier for a commit.',
        '',
        'Find it in the commit history list or commit details page.',
        'It looks like a short hash: a1b2c3d4'
      ],
      example: 'a1b2c3d4e5'
    },
    pipelineUuid: {
      title: 'How to get Pipeline UUID?',
      steps: [
        'Open Pipelines in your repository.',
        'Click a pipeline run to view details.',
        '',
        'The UUID appears in the URL and in API responses.',
        'Example URL: .../results/UUID'
      ],
      example: 'pipeline-uuid'
    }
  },
  docker: {
    host: {
      title: 'How to set Docker Host?',
      steps: [
        'Docker Host is the address of the Docker daemon.',
        '',
        'Common values:',
        '• localhost (for local TCP access)',
        '• unix:///var/run/docker.sock (Linux/macOS socket)',
        '',
        'Tip: Use the socket for local machines when possible.'
      ],
      example: 'localhost'
    },
    port: {
      title: 'How to set Docker Port?',
      steps: [
        'Port is used only for TCP connections.',
        '',
        'Common values:',
        '• 2375 = TCP (no TLS)',
        '• 2376 = TLS',
        '',
        'Leave the default unless your Docker daemon uses a different port.'
      ],
      example: '2375'
    },
    operation: {
      title: 'How to choose Operation?',
      steps: [
        'Operation tells Docker what action to run.',
        '',
        'Examples:',
        '• List Containers / Images',
        '• Build / Tag / Push / Pull Image',
        '• Start / Stop / Inspect Container',
        '',
        'Pick the action that matches your workflow step.'
      ],
      example: 'list_containers'
    },
    containerId: {
      title: 'How to get Container ID or Name?',
      steps: [
        'You can use either the container name or ID.',
        '',
        'How to find it:',
        '• Run: docker ps (or docker ps -a)',
        '• Copy the CONTAINER ID or NAMES value',
        '',
        'Tip: Names are easier to remember.'
      ],
      example: 'web-server'
    },
    imageName: {
      title: 'How to set Image Name?',
      steps: [
        'Image Name follows the format: repository:tag',
        '',
        'Examples:',
        '• nginx:latest',
        '• node:18',
        '• registry.example.com/myapp:v1.0.0',
        '',
        'Tip: If no tag is provided, "latest" is used.'
      ],
      example: 'nginx:latest'
    },
    dockerfilePath: {
      title: 'How to set Dockerfile Path?',
      steps: [
        'This is the path to your Dockerfile for builds.',
        '',
        'Examples:',
        '• ./Dockerfile',
        '• ./docker/Dockerfile',
        '',
        'Tip: The path is relative to the build context.'
      ],
      example: './Dockerfile'
    },
    buildContext: {
      title: 'What is Build Context?',
      steps: [
        'Build Context is the folder Docker uses for build files.',
        '',
        'Common value: . (current directory)',
        'All files in this folder can be accessed by the Dockerfile.'
      ],
      example: '.'
    },
    tag: {
      title: 'How to set Tag?',
      steps: [
        'Tag is the image name used for tag/push/pull operations.',
        '',
        'Format: repository:tag',
        'Example: myapp:v1.0.0'
      ],
      example: 'myapp:v1.0.0'
    },
    sourceTag: {
      title: 'What is Source Tag?',
      steps: [
        'Source Tag is the existing image you want to tag.',
        '',
        'Example: myapp:latest',
        'Used only for tag_image operation.'
      ],
      example: 'myapp:latest'
    },
    registry: {
      title: 'How to set Registry?',
      steps: [
        'Registry is where images are stored.',
        '',
        'Examples:',
        '• docker.io (Docker Hub)',
        '• registry.example.com',
        '',
        'Use the registry required by your organization.'
      ],
      example: 'docker.io'
    },
    registryUsername: {
      title: 'How to set Registry Username?',
      steps: [
        'Enter the username for your container registry.',
        '',
        'Required only for private registries or private images.'
      ],
      example: 'registry-user'
    },
    registryPassword: {
      title: 'How to set Registry Password?',
      steps: [
        'Enter the password or access token for your registry account.',
        '',
        'Tip: Use tokens instead of real passwords when possible.'
      ],
      example: 'registry-token'
    }
  }
};

// Helper function to get guide for a specific node and field
export function getNodeGuide(nodeType: NodeType, fieldKey: FieldKey): NodeGuide | null {
  return NODE_GUIDES[nodeType]?.[fieldKey] || null;
}

// Helper function to check if a guide exists
export function hasNodeGuide(nodeType: NodeType, fieldKey: FieldKey): boolean {
  return !!getNodeGuide(nodeType, fieldKey);
}
