// Comprehensive Guide Generator for All Input Field Types
// This ensures every input field has a contextual guide

import { NodeGuide } from './nodeGuides';

export interface FieldGuide {
  title: string;
  steps: string[];
  url?: string;
  example?: string;
  securityWarning?: boolean;
}

/**
 * Generate a guide for any field type based on field metadata
 */
/** Optional metadata from UnifiedNodeRegistry (serialized via /api/node-definitions). */
export type RegistryFieldGuideMeta = {
  helpCategory?: string;
  docsUrl?: string;
  exampleValue?: string;
};

function guideFromRegistryHelpCategory(
  helpCategory: string,
  nodeType: string,
  fieldKey: string,
  fieldLabel: string,
  fieldType: string,
  placeholder: string | undefined,
  docsUrl: string | undefined,
  exampleValue: string | undefined
): FieldGuide | null {
  const url = docsUrl;
  const ex = exampleValue;
  switch (helpCategory) {
    case 'api_key':
      return { ...generateAPIKeyGuide(nodeType, fieldLabel), ...(url ? { url } : {}), ...(ex ? { example: ex } : {}) };
    case 'oauth_token':
    case 'refresh_token':
    case 'generic_token':
    case 'bearer_token':
      return { ...generateTokenGuide(nodeType, fieldLabel), ...(url ? { url } : {}), ...(ex ? { example: ex } : {}) };
    case 'client_id':
      return nodeType.includes('google')
        ? { ...generateGoogleOAuthClientIDGuide(), ...(url ? { url } : {}) }
        : { ...generateCredentialGuide(nodeType, fieldLabel), ...(url ? { url } : {}) };
    case 'client_secret':
      return nodeType.includes('google')
        ? { ...generateGoogleOAuthSecretGuide(), ...(url ? { url } : {}) }
        : { ...generateCredentialGuide(nodeType, fieldLabel), ...(url ? { url } : {}) };
    case 'credential_id':
      return {
        title: `How to connect ${fieldLabel}?`,
        url,
        steps: [
          'Step 1: Open your workspace credentials or connections screen.',
          'Step 2: Create or select an existing connection for this integration.',
          'Step 3: Complete OAuth or paste the stored credential as required.',
          'Step 4: Choose the connection in this field when running the workflow.',
        ],
        securityWarning: true,
      };
    case 'spreadsheet_id':
      return { ...generateSpreadsheetIDGuide(), ...(ex ? { example: ex } : {}) };
    case 'document_id':
      return {
        title: 'How to get Google Docs document ID?',
        url: url || 'https://docs.google.com/document',
        steps: [
          'Step 1: Open the document in Google Docs.',
          'Step 2: Copy the ID from the URL: /document/d/DOCUMENT_ID/edit',
          'Step 3: Paste the ID into this field.',
        ],
        example: ex,
      };
    case 'base_url':
    case 'api_endpoint':
      return { ...generateURLGuide(nodeType, fieldKey, fieldLabel), ...(url ? { url } : {}) };
    case 'webhook_url':
      return { ...generateWebhookURLGuide(nodeType, fieldLabel), ...(url ? { url } : {}) };
    case 'callback_url':
      return {
        ...generateOAuthRedirectGuide('callback', fieldLabel),
        ...(url ? { url } : {}),
        ...(ex ? { example: ex } : {}),
      };
    case 'redirect_url':
      return {
        ...generateOAuthRedirectGuide('redirect', fieldLabel),
        ...(url ? { url } : {}),
        ...(ex ? { example: ex } : {}),
      };
    case 'smtp_host':
      return generateSMTPHostGuide();
    case 'smtp_username':
      return generateSMTPUsernameGuide();
    case 'smtp_password':
      return generateSMTPPasswordGuide();
    case 'host':
      return generateHostGuide(fieldLabel);
    case 'port':
      return generatePortGuide(fieldLabel);
    case 'database_name':
      return generateDatabaseGuide(fieldKey, fieldLabel);
    case 'db_password':
      return generateCredentialGuide(nodeType, fieldLabel);
    case 'shop_domain':
      return generateShopDomainGuide();
    case 'page_id':
      return generatePageIDGuide(nodeType);
    case 'account_id':
      return generateAccountIDGuide(nodeType);
    case 'sheet_name':
      if (nodeType.includes('google_sheets')) {
        return {
          ...generateGoogleSheetsTabNameGuide(),
          ...(url ? { url } : {}),
          ...(ex ? { example: ex } : {}),
        };
      }
      return {
        title: `How to get ${fieldLabel}?`,
        url,
        steps: [
          `Step 1: Open your ${nodeType.replace(/_/g, ' ')} provider dashboard or app.`,
          'Step 2: Open the resource (sheet tab, table, or list) you need.',
          'Step 3: Copy the tab or sheet name exactly as shown (spacing and case may matter).',
          'Step 4: Paste it into this field.',
        ],
        example: ex,
      };
    case 'calendar_id':
    case 'table_id':
    case 'base_id':
      return {
        title: `How to get ${fieldLabel}?`,
        url,
        steps: [
          `Step 1: Open your ${nodeType.replace(/_/g, ' ')} provider dashboard or app.`,
          'Step 2: Open the resource (calendar, table, base, or sheet) you need.',
          'Step 3: Copy the ID or name from the URL or resource settings.',
          'Step 4: Paste it into this field exactly as shown.',
        ],
        example: ex,
      };
    case 'resource_select':
      return {
        title: `How to choose ${fieldLabel}?`,
        url,
        steps: [
          'Step 1: This field picks which remote resource the node uses (object type, module, or dataset).',
          'Step 2: In the provider app, confirm the resource name matches what you want to automate.',
          'Step 3: If the list is empty, finish connecting credentials first, then refresh or reopen the workflow.',
          'Step 4: Check the integration docs for this node if labels differ between UI and API.',
        ],
        example: ex,
      };
    case 'operation_select':
      return {
        title: `How to choose ${fieldLabel}?`,
        url,
        steps: [
          'Step 1: Pick the operation that matches your intent (read, write, create, update, delete, send, etc.).',
          'Step 2: After selecting, fill any required fields that appear — some operations need IDs or payloads.',
          'Step 3: If execution fails with "forbidden" or "not allowed", your credential may lack scopes for that operation.',
          'Step 4: See provider API docs for the exact behavior of each operation.',
        ],
        example: ex,
      };
    case 'cron_expression':
      return generateCronGuide(fieldLabel);
    case 'json_payload':
      return generateJSONGuide(fieldLabel, placeholder);
    case 'expression':
      return generateExpressionGuide(fieldLabel);
    case 'prompt_text':
      return generatePromptGuide(fieldLabel);
    case 'email_address':
      return generateEmailGuide(fieldLabel);
    case 'phone_number':
      return generatePhoneGuide(fieldLabel);
    case 'private_key':
    case 'consumer_key':
    case 'consumer_secret':
    case 'webhook_secret':
    case 'generic_credential':
      return generateCredentialGuide(nodeType, fieldLabel);
    case 'connection_string':
      return { ...generateConnectionStringGuide(nodeType, fieldLabel), ...(url ? { url } : {}), ...(ex ? { example: ex } : {}) };
    case 'username':
      return { ...generateUsernameGuide(nodeType, fieldLabel), ...(url ? { url } : {}), ...(ex ? { example: ex } : {}) };
    case 'password':
      return { ...generatePasswordGuide(nodeType, fieldLabel), ...(url ? { url } : {}), ...(ex ? { example: ex } : {}) };
    case 'service_account_email':
      return { ...generateServiceAccountEmailGuide(fieldLabel), ...(url ? { url } : {}), ...(ex ? { example: ex } : {}) };
    case 'phone_number_id':
      return { ...generateWhatsAppPhoneNumberIdGuide(fieldLabel), ...(url ? { url } : {}), ...(ex ? { example: ex } : {}) };
    case 'business_account_id':
      return { ...generateMetaBusinessAccountGuide(fieldLabel), ...(url ? { url } : {}), ...(ex ? { example: ex } : {}) };
    case 'database_id':
      return { ...generateProviderResourceIdGuide(nodeType, fieldLabel, 'database'), ...(url ? { url } : {}), ...(ex ? { example: ex } : {}) };
    case 'workspace_id':
      return { ...generateProviderResourceIdGuide(nodeType, fieldLabel, 'workspace'), ...(url ? { url } : {}), ...(ex ? { example: ex } : {}) };
    case 'channel_id':
      return { ...generateProviderResourceIdGuide(nodeType, fieldLabel, 'channel'), ...(url ? { url } : {}), ...(ex ? { example: ex } : {}) };
    case 'list_id':
      return { ...generateProviderResourceIdGuide(nodeType, fieldLabel, 'list'), ...(url ? { url } : {}), ...(ex ? { example: ex } : {}) };
    case 'folder_id':
      return { ...generateProviderResourceIdGuide(nodeType, fieldLabel, 'folder'), ...(url ? { url } : {}), ...(ex ? { example: ex } : {}) };
    case 'file_path':
      return { ...generateFilePathGuide(fieldLabel), ...(url ? { url } : {}), ...(ex ? { example: ex } : {}) };
    case 'project_id':
      return { ...generateProjectIdGuide(nodeType, fieldLabel), ...(url ? { url } : {}), ...(ex ? { example: ex } : {}) };
    case 'dataset_id':
      return { ...generateProviderResourceIdGuide(nodeType, fieldLabel, 'dataset'), ...(url ? { url } : {}), ...(ex ? { example: ex } : {}) };
    case 'bucket_name':
      return { ...generateBucketNameGuide(nodeType, fieldLabel), ...(url ? { url } : {}), ...(ex ? { example: ex } : {}) };
    case 'region':
      return { ...generateRegionGuide(nodeType, fieldLabel), ...(url ? { url } : {}), ...(ex ? { example: ex } : {}) };
    case 'model_id':
      return { ...generateModelGuide(nodeType, fieldLabel), ...(url ? { url } : {}), ...(ex ? { example: ex } : {}) };
    case 'timezone':
      return { ...generateTimezoneGuide(fieldLabel), ...(url ? { url } : {}), ...(ex ? { example: ex } : {}) };
    case 'http_headers':
      return { ...generateHeadersGuide(fieldLabel), ...(url ? { url } : {}), ...(ex ? { example: ex } : {}) };
    case 'http_body':
      return { ...generateBodyPayloadGuide(fieldLabel, placeholder), ...(url ? { url } : {}), ...(ex ? { example: ex } : {}) };
    case 'query_params':
      return { ...generateQueryParamsGuide(fieldLabel), ...(url ? { url } : {}), ...(ex ? { example: ex } : {}) };
    case 'field_mapping':
      return { ...generateFieldMappingGuide(fieldLabel, placeholder), ...(url ? { url } : {}), ...(ex ? { example: ex } : {}) };
    case 'case_list':
      return { ...generateCaseListGuide(fieldLabel), ...(url ? { url } : {}), ...(ex ? { example: ex } : {}) };
    case 'form_fields':
      return { ...generateFormFieldsGuide(fieldLabel), ...(url ? { url } : {}), ...(ex ? { example: ex } : {}) };
    case 'sql_query':
      return { ...generateSQLQueryGuide(nodeType, fieldLabel), ...(url ? { url } : {}), ...(ex ? { example: ex } : {}) };
    case 'graphql_query':
      return { ...generateGraphQLQueryGuide(fieldLabel), ...(url ? { url } : {}), ...(ex ? { example: ex } : {}) };
    case 'search_query':
      return { ...generateSearchQueryGuide(nodeType, fieldLabel), ...(url ? { url } : {}), ...(ex ? { example: ex } : {}) };
    case 'code_snippet':
      return { ...generateCodeSnippetGuide(fieldLabel), ...(url ? { url } : {}), ...(ex ? { example: ex } : {}) };
    default:
      return null;
  }
}

export function generateFieldGuide(
  nodeType: string,
  fieldKey: string,
  fieldLabel: string,
  fieldType: string,
  placeholder?: string,
  registryMeta?: RegistryFieldGuideMeta
): FieldGuide {
  const hc = registryMeta?.helpCategory;
  if (hc && hc !== 'none') {
    const fromRegistry = guideFromRegistryHelpCategory(
      hc,
      nodeType,
      fieldKey,
      fieldLabel,
      fieldType,
      placeholder,
      registryMeta.docsUrl,
      registryMeta.exampleValue
    );
    if (fromRegistry) {
      return fromRegistry;
    }
  }

  // ✅ PRODUCTION: Null-safe string operations
  const normalizedKey = fieldKey?.toLowerCase?.() ?? "";
  const normalizedLabel = fieldLabel?.toLowerCase?.() ?? "";
  const normalizedPlaceholder = (placeholder?.toLowerCase?.() ?? "").toLowerCase();
  const lowerKey = normalizedKey;
  const lowerLabel = normalizedLabel;
  const lowerPlaceholder = normalizedPlaceholder;
  const combined = `${lowerKey} ${lowerLabel} ${lowerPlaceholder}`;
  
  // CRITICAL: Check for Slack Bot Token FIRST (before any other checks)
  // This ensures the specific Slack guide is used instead of generic token guide
  if ((lowerLabel.includes('slack') && (lowerLabel.includes('bot token') || lowerLabel.includes('bot_token'))) ||
      (lowerKey.includes('slack') && (lowerKey.includes('bot_token') || lowerKey.includes('bottoken'))) ||
      (combined.includes('slack') && (combined.includes('bot token') || combined.includes('bot_token')))) {
    return {
      title: 'How to get Slack Bot Token?',
      url: 'https://api.slack.com/apps',
      steps: [
        'Step 1: Go to https://api.slack.com/apps',
        'Step 2: Sign in with your Slack workspace account',
        'Step 3: Click "Create New App" button (or select an existing app)',
        'Step 4: Choose "From scratch" option',
        'Step 5: Enter an app name (e.g., "Workflow Bot") and select your workspace',
        'Step 6: Click "Create App"',
        'Step 7: In the left sidebar, click "OAuth & Permissions"',
        'Step 8: Scroll down to "Scopes" section → "Bot Token Scopes"',
        'Step 9: Click "Add an OAuth Scope" and add required scopes:',
        '   • chat:write (to send messages)',
        '   • channels:read (to read channel info)',
        '   • channels:history (to read message history, if needed)',
        'Step 10: Scroll up to the top of the page',
        'Step 11: Click "Install to Workspace" button',
        'Step 12: Review permissions and click "Allow" to authorize',
        'Step 13: After installation, you\'ll see "Bot User OAuth Token"',
        'Step 14: Click "Copy" next to the token (starts with xoxb-)',
        'Step 15: Paste the token into the input field above',
        '',
        'Token format:',
        'xoxb-XXXXXXXXXX-XXXXXXXXXXXXX-XXXXXXXXXXXXXXXXXXXXXXXX',
        '',
        '⚠️ Security Warning:',
        '• Keep your Bot Token secret - never share it publicly',
        '• If exposed, regenerate it immediately in Slack app settings',
        '• Use environment variables for production workflows'
      ],
      example: 'xoxb-XXXXXXXXXX-XXXXXXXXXXXXX-XXXXXXXXXXXXXXXXXXXXXXXX',
      securityWarning: true
    };
  }
  
  // CRITICAL: Check fieldLabel directly (not lowercased) for URLs first
  // This handles cases where fieldLabel IS the URL (e.g., "https://api.twitter.com/1.1/?")
  if (fieldLabel.includes('api.twitter.com') || fieldLabel.includes('https://api.twitter.com') || 
      fieldLabel.includes('http://api.twitter.com')) {
    return generateTwitterAPIGuide();
  }
  if (fieldLabel.includes('graph.facebook.com') || fieldLabel.includes('https://graph.facebook.com')) {
    return generateFacebookGraphAPIGuide();
  }

  // Check for specific URLs in label or placeholder (HIGHEST PRIORITY)
  // Twitter API URLs - Check for api.twitter.com specifically
  if (combined.includes('api.twitter.com') || lowerLabel.includes('api.twitter.com') || 
      lowerPlaceholder.includes('api.twitter.com')) {
    return generateTwitterAPIGuide();
  }

  if (combined.includes('developers.facebook.com') || combined.includes('facebook.com/docs') || 
      combined.includes('graph-api') || combined.includes('facebook graph') ||
      lowerLabel.includes('developers.facebook.com') || lowerPlaceholder.includes('developers.facebook.com')) {
    return generateFacebookGraphAPIGuide();
  }

  if (combined.includes('developers.instagram.com') || combined.includes('instagram.com/docs') ||
      lowerLabel.includes('developers.instagram.com') || lowerPlaceholder.includes('developers.instagram.com')) {
    return generateInstagramAPIDocsGuide();
  }

  if (combined.includes('developer.twitter.com') || combined.includes('twitter.com/en/developer') ||
      lowerLabel.includes('developer.twitter.com') || lowerPlaceholder.includes('developer.twitter.com')) {
    return generateTwitterAPIDocsGuide();
  }

  // Facebook API - Specific guide
  if (combined.includes('facebook api') || lowerLabel.includes('facebook api')) {
    return generateFacebookAPIGuide();
  }

  // Instagram API - Specific guide
  if (combined.includes('instagram api') || lowerLabel.includes('instagram api')) {
    return generateInstagramAPIGuide();
  }

  // Twitter API - Specific guide
  if (combined.includes('twitter api') || lowerLabel.includes('twitter api') || lowerLabel.includes('x api')) {
    return generateTwitterAPIGuide();
  }

  // Content Repository - Specific guide
  if (combined.includes('content repository') || lowerLabel.includes('content repository') || 
      lowerLabel.includes('google drive') || lowerLabel.includes('dropbox')) {
    return generateContentRepositoryGuide(fieldLabel);
  }

  // API Key fields
  if (combined.includes('api key') || combined.includes('apikey') || lowerKey.includes('apikey')) {
    return generateAPIKeyGuide(nodeType, fieldLabel);
  }

  // URL/Endpoint fields - Check FIRST before token detection
  // Check if field label or placeholder contains a URL
  const hasURL = lowerLabel.includes('http://') || lowerLabel.includes('https://') ||
                 lowerPlaceholder.includes('http://') || lowerPlaceholder.includes('https://') ||
                 fieldLabel.includes('http://') || fieldLabel.includes('https://') ||
                 combined.includes('url') || combined.includes('endpoint') || 
                 combined.includes('base url') || combined.includes('server url') || 
                 combined.includes('webhook url');
  
  if (hasURL) {
    // Check for specific API URLs first (HIGHEST PRIORITY)
    if (combined.includes('api.twitter.com') || lowerLabel.includes('api.twitter.com') || 
        lowerPlaceholder.includes('api.twitter.com') || fieldLabel.includes('api.twitter.com')) {
      return generateTwitterAPIGuide();
    }
    if (combined.includes('graph.facebook.com') || lowerLabel.includes('graph.facebook.com') ||
        lowerPlaceholder.includes('graph.facebook.com') || fieldLabel.includes('graph.facebook.com')) {
      return generateFacebookGraphAPIGuide();
    }
    // Check if it's a documentation URL that needs specific guide
    if (combined.includes('docs') || combined.includes('documentation')) {
      return generateDocumentationURLGuide(fieldLabel, placeholder || fieldLabel);
    }
    return generateURLGuide(nodeType, fieldKey, fieldLabel);
  }

  // Page Token fields (Facebook Page Access Token) - Must come before generic token
  // Check fieldLabel directly for "page-token" or "page access token" pattern
  const isPageToken = fieldLabel.toLowerCase().includes('page-token') || 
                      fieldLabel.toLowerCase().includes('page token') ||
                      fieldLabel.toLowerCase().includes('page access token') ||
                      combined.includes('page token') || combined.includes('page-token') || 
                      lowerKey.includes('pagetoken') || lowerKey.includes('page_token') ||
                      lowerKey.includes('pageaccesstoken') || lowerKey.includes('page_access_token') ||
                      lowerLabel.includes('page token') || lowerLabel.includes('page-token') ||
                      lowerLabel.includes('page access token');
  
  // If it's a page token and in Facebook context, use Facebook Page Token guide
  if (isPageToken && (nodeType === 'facebook' || combined.includes('facebook') || 
                      lowerLabel.includes('facebook') || lowerPlaceholder.includes('facebook'))) {
    return generateFacebookPageTokenGuide();
  }
  
  // Also check if nodeType is facebook and field contains page/token
  if (nodeType === 'facebook' && isPageToken) {
    return generateFacebookPageTokenGuide();
  }

  // Token fields
  if (combined.includes('token') || combined.includes('bearer') || combined.includes('access token')) {
    // Check node type for service-specific token guides
    if (nodeType === 'facebook' && (combined.includes('access token') || combined.includes('page'))) {
      return generateFacebookPageTokenGuide();
    }
    if (nodeType === 'instagram' && combined.includes('access token')) {
      return generateInstagramAPIGuide();
    }
    if (nodeType === 'twitter' && combined.includes('access token')) {
      return generateTwitterAPIGuide();
    }
    return generateTokenGuide(nodeType, fieldLabel);
  }

  // Credential/Secret fields - Check for specific credentials first
  if (combined.includes('slack') && combined.includes('webhook')) {
    return generateSlackWebhookGuide();
  }
  if (combined.includes('google') && (combined.includes('oauth') || combined.includes('client'))) {
    if (combined.includes('secret')) {
      return generateGoogleOAuthSecretGuide();
    }
    return generateGoogleOAuthClientIDGuide();
  }
  if (combined.includes('smtp')) {
    if (combined.includes('host')) {
      return generateSMTPHostGuide();
    }
    if (combined.includes('username') || combined.includes('user')) {
      return generateSMTPUsernameGuide();
    }
    if (combined.includes('password') || combined.includes('pass')) {
      return generateSMTPPasswordGuide();
    }
    return generateSMTPGuide();
  }
  if (combined.includes('credential') || combined.includes('password') || combined.includes('secret') || 
      combined.includes('auth') || combined.includes('client secret')) {
    return generateCredentialGuide(nodeType, fieldLabel);
  }

  // Spreadsheet ID fields (Google Sheets)
  if (combined.includes('spreadsheet') || combined.includes('sheet id') || lowerKey.includes('spreadsheetid')) {
    return generateSpreadsheetIDGuide();
  }

  // Webhook URL fields
  if (combined.includes('webhook') && (combined.includes('url') || lowerKey.includes('webhook'))) {
    return generateWebhookURLGuide(nodeType, fieldLabel);
  }

  // Page ID fields (Facebook, Instagram)
  if (combined.includes('page id') || lowerKey.includes('pageid') || lowerKey.includes('page_id')) {
    return generatePageIDGuide(nodeType);
  }

  // Account ID fields (Instagram, etc.)
  if (combined.includes('account id') || lowerKey.includes('accountid') || lowerKey.includes('account_id')) {
    return generateAccountIDGuide(nodeType);
  }

  // Shop Domain fields (Shopify)
  if (combined.includes('shop domain') || combined.includes('shop url') || lowerKey.includes('shopdomain')) {
    return generateShopDomainGuide();
  }

  // Product/Order/Customer ID fields
  if ((combined.includes('product id') || lowerKey.includes('productid')) && 
      !combined.includes('api')) {
    return generateIDGuide('Product', 'product');
  }
  if ((combined.includes('order id') || lowerKey.includes('orderid')) && 
      !combined.includes('api')) {
    return generateIDGuide('Order', 'order');
  }
  if ((combined.includes('customer id') || lowerKey.includes('customerid')) && 
      !combined.includes('api')) {
    return generateIDGuide('Customer', 'customer');
  }

  // Expression fields (template variables)
  if (combined.includes('expression') || combined.includes('template') || 
      placeholder?.includes('{{') || lowerKey.includes('expression')) {
    return generateExpressionGuide(fieldLabel);
  }

  // Condition fields
  if (combined.includes('condition') || combined.includes('filter')) {
    return generateConditionGuide(fieldLabel);
  }

  // Array fields
  if (combined.includes('array') || lowerKey.includes('array')) {
    return generateArrayGuide(fieldLabel);
  }

  // Database fields
  if (combined.includes('database') || combined.includes('db name') || combined.includes('db_name')) {
    return generateDatabaseGuide(fieldKey, fieldLabel);
  }

  // Host/Server fields
  if (combined.includes('host') || combined.includes('server') || combined.includes('address')) {
    return generateHostGuide(fieldLabel);
  }

  // Port fields
  if (combined.includes('port')) {
    return generatePortGuide(fieldLabel);
  }

  // Model fields
  if (combined.includes('model')) {
    return generateModelGuide(nodeType, fieldLabel);
  }

  // Prompt fields
  if (combined.includes('prompt') || combined.includes('system prompt') || combined.includes('message')) {
    return generatePromptGuide(fieldLabel);
  }

  // JSON fields
  if (fieldType === 'json' || lowerKey.includes('json')) {
    return generateJSONGuide(fieldLabel, placeholder);
  }

  // Cron/Schedule fields
  if (fieldType === 'cron' || combined.includes('cron') || combined.includes('schedule')) {
    return generateCronGuide(fieldLabel);
  }

  // Time fields
  if (fieldType === 'time' || combined.includes('time')) {
    return generateTimeGuide(fieldLabel);
  }

  // Temperature fields
  if (combined.includes('temperature')) {
    return generateTemperatureGuide();
  }

  // Number fields
  if (fieldType === 'number') {
    return generateNumberGuide(fieldLabel, placeholder);
  }

  // Textarea fields
  if (fieldType === 'textarea') {
    // Check if it's a specific textarea type
    if (combined.includes('prompt') || combined.includes('system prompt')) {
      return generatePromptGuide(fieldLabel);
    }
    if (combined.includes('message') || combined.includes('body') || combined.includes('content')) {
      return generateMessageGuide(fieldLabel);
    }
    return generateTextareaGuide(fieldLabel);
  }

  // Text fields - check for specific patterns
  if (fieldType === 'text') {
    // Email fields
    if (combined.includes('email') || lowerKey.includes('email')) {
      return generateEmailGuide(fieldLabel);
    }
    // Phone fields
    if (combined.includes('phone') || combined.includes('tel') || lowerKey.includes('phone')) {
      return generatePhoneGuide(fieldLabel);
    }
    // Name fields (usually don't need guide, but provide basic help)
    if ((combined.includes('name') || lowerKey.includes('name')) && 
        !combined.includes('username') && !combined.includes('hostname')) {
      return generateNameGuide(fieldLabel);
    }
    // Title/Subject fields
    if (combined.includes('title') || combined.includes('subject') || lowerKey.includes('title')) {
      return generateTitleGuide(fieldLabel);
    }
    // Description fields
    if (combined.includes('description') || lowerKey.includes('description')) {
      return generateDescriptionGuide(fieldLabel);
    }
    // Message fields
    if (combined.includes('message') || lowerKey.includes('message')) {
      return generateMessageGuide(fieldLabel);
    }
  }

  // Default: Generic guide for any other field
  return generateGenericGuide(fieldLabel, fieldType);
}

function generateAPIKeyGuide(nodeType: string, fieldLabel: string): FieldGuide {
  const lowerLabel = fieldLabel.toLowerCase();
  
  // Check for Gemini API Key (most specific first)
  if (lowerLabel.includes('gemini') && (lowerLabel.includes('api key') || lowerLabel.includes('api_key'))) {
    return {
      title: 'How to get Gemini API Key?',
      url: 'https://aistudio.google.com/apikey',
      steps: [
        'Step 1: Go to https://aistudio.google.com/apikey',
        'Step 2: Sign in with your Google account',
        'Step 3: Click "Get API key" or "Create API key" button',
        'Step 4: Select "Create API key in new project" or choose an existing project',
        'Step 5: If creating new project:',
        '   • Enter a project name (e.g., "Workflow Automation")',
        '   • Click "Create"',
        'Step 6: Your API key will be generated and displayed',
        'Step 7: Click "Copy" to copy the API key immediately',
        'Step 8: Paste the API key into the input field above',
        '',
        'Important Notes:',
        '• The API key starts with "AIza"',
        '• You can only see the full key once - copy it immediately',
        '• If you lose it, you\'ll need to create a new one',
        '• API keys are free but have usage limits',
        '',
        'Token format:',
        'AIzaSyDxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
        '',
        '⚠️ Security Warning:',
        '• Keep your API key secret - never share it publicly',
        '• Do not commit API keys to version control',
        '• Use environment variables for production workflows',
        '• If exposed, delete and regenerate the key immediately'
      ],
      example: 'AIzaSyDxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
      securityWarning: true
    };
  }
  
  // Check for specific services in fieldLabel
  if (lowerLabel.includes('google sheets') || lowerLabel.includes('sheets api')) {
    return {
      title: 'How to get Google Sheets API?',
      url: 'https://console.cloud.google.com',
      steps: [
        'Step 1: Go to https://console.cloud.google.com',
        'Step 2: Sign in with your Google account',
        'Step 3: Create a new project or select an existing project',
        'Step 4: Click "APIs & Services" → "Library"',
        'Step 5: Search for "Google Sheets API"',
        'Step 6: Click on "Google Sheets API" and click "Enable"',
        'Step 7: Go to "APIs & Services" → "Credentials"',
        'Step 8: Click "Create Credentials" → "API Key"',
        'Step 9: Copy the API key immediately',
        'Step 10: (Optional) Restrict the API key to Google Sheets API for security',
        'Step 11: Paste the API key into the input field',
        '',
        'Example format:',
        'AIzaSyDxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
        '',
        '⚠️ Keep your API key secure. Restrict it to specific APIs and services.'
      ],
      example: 'AIzaSyDxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
      securityWarning: true
    };
  }
  
  // Check for Slack Bot Token (most specific first)
  if (lowerLabel.includes('slack') && (lowerLabel.includes('bot token') || lowerLabel.includes('bot_token'))) {
    return {
      title: 'How to get Slack Bot Token?',
      url: 'https://api.slack.com/apps',
      steps: [
        'Step 1: Go to https://api.slack.com/apps',
        'Step 2: Sign in with your Slack workspace account',
        'Step 3: Click "Create New App" button (or select an existing app)',
        'Step 4: Choose "From scratch" option',
        'Step 5: Enter an app name (e.g., "Workflow Bot") and select your workspace',
        'Step 6: Click "Create App"',
        'Step 7: In the left sidebar, click "OAuth & Permissions"',
        'Step 8: Scroll down to "Scopes" section → "Bot Token Scopes"',
        'Step 9: Click "Add an OAuth Scope" and add required scopes:',
        '   • chat:write (to send messages)',
        '   • channels:read (to read channel info)',
        '   • channels:history (to read message history, if needed)',
        'Step 10: Scroll up to the top of the page',
        'Step 11: Click "Install to Workspace" button',
        'Step 12: Review permissions and click "Allow" to authorize',
        'Step 13: After installation, you\'ll see "Bot User OAuth Token"',
        'Step 14: Click "Copy" next to the token (starts with xoxb-)',
        'Step 15: Paste the token into the input field above',
        '',
        'Token format:',
        'xoxb-XXXXXXXXXX-XXXXXXXXXXXXX-XXXXXXXXXXXXXXXXXXXXXXXX',
        '',
        '⚠️ Security Warning:',
        '• Keep your Bot Token secret - never share it publicly',
        '• If exposed, regenerate it immediately in Slack app settings',
        '• Use environment variables for production workflows'
      ],
      example: 'xoxb-XXXXXXXXXX-XXXXXXXXXXXXX-XXXXXXXXXXXXXXXXXXXXXXXX',
      securityWarning: true
    };
  }
  
  // Check for Slack API (general)
  if (lowerLabel.includes('slack') && lowerLabel.includes('api')) {
    return {
      title: 'How to get Slack API?',
      url: 'https://api.slack.com/apps',
      steps: [
        'Step 1: Go to https://api.slack.com/apps',
        'Step 2: Sign in with your Slack workspace',
        'Step 3: Click "Create New App" or select an existing app',
        'Step 4: Choose "From scratch"',
        'Step 5: Enter app name and select workspace',
        'Step 6: Go to "OAuth & Permissions" in left sidebar',
        'Step 7: Scroll to "Scopes" → "Bot Token Scopes"',
        'Step 8: Add required scopes (e.g., chat:write, channels:read)',
        'Step 9: Scroll up and click "Install to Workspace"',
        'Step 10: Authorize the app',
        'Step 11: Copy the "Bot User OAuth Token" (starts with xoxb-)',
        'Step 12: Paste it into the input field',
        '',
        'Example format:',
        'xoxb-YOUR-BOT-TOKEN-HERE',
        '',
        '⚠️ Keep your Bot Token secure. Never expose it publicly.'
      ],
      example: 'xoxb-YOUR-BOT-TOKEN-HERE',
      securityWarning: true
    };
  }
  
  const guides: Record<string, FieldGuide> = {
    google_gemini: {
      title: 'How to get Gemini API Key?',
      url: 'https://aistudio.google.com/apikey',
      steps: [
        'Step 1: Go to https://aistudio.google.com/apikey',
        'Step 2: Sign in with your Google account',
        'Step 3: Click "Get API key" or "Create API key" button',
        'Step 4: Select "Create API key in new project" or choose an existing project',
        'Step 5: If creating new project:',
        '   • Enter a project name (e.g., "Workflow Automation")',
        '   • Click "Create"',
        'Step 6: Your API key will be generated and displayed',
        'Step 7: Click "Copy" to copy the API key immediately',
        'Step 8: Paste the API key into the input field above',
        '',
        'Important Notes:',
        '• The API key starts with "AIza"',
        '• You can only see the full key once - copy it immediately',
        '• If you lose it, you\'ll need to create a new one',
        '• API keys are free but have usage limits',
        '',
        'Token format:',
        'AIzaSyDxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
        '',
        '⚠️ Security Warning:',
        '• Keep your API key secret - never share it publicly',
        '• Do not commit API keys to version control',
        '• Use environment variables for production workflows',
        '• If exposed, delete and regenerate the key immediately'
      ],
      example: 'AIzaSyDxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
      securityWarning: true
    },
    openai_gpt: {
      title: 'How to get OpenAI API Key?',
      url: 'https://platform.openai.com/api-keys',
      steps: [
        'Step 1: Go to https://platform.openai.com/api-keys',
        'Step 2: Sign in or create an account',
        'Step 3: Click on your profile icon (top right)',
        'Step 4: Select "API keys" from the dropdown',
        'Step 5: Click "Create new secret key"',
        'Step 6: Give it a name (e.g., "Workflow Integration")',
        'Step 7: Copy the key immediately (starts with "sk-")',
        '',
        'Example:',
        'sk-proj-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
        '',
        '⚠️ Do not expose this key in frontend code. Store it securely.'
      ],
      example: 'sk-proj-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
      securityWarning: true
    },
    anthropic_claude: {
      title: 'How to get Anthropic Claude API Key?',
      url: 'https://console.anthropic.com/settings/keys',
      steps: [
        'Step 1: Go to https://console.anthropic.com/settings/keys',
        'Step 2: Sign in or create an account',
        'Step 3: Click "Create Key" button',
        'Step 4: Give it a name (e.g., "Workflow Integration")',
        'Step 5: Copy the key immediately (starts with "sk-ant-")',
        '',
        'Example:',
        'sk-ant-api03-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
        '',
        '⚠️ Do not expose this key in frontend code. Store it securely.'
      ],
      example: 'sk-ant-api03-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
      securityWarning: true
    },
    mailgun: {
      title: 'How to get Mailgun API Key?',
      url: 'https://app.mailgun.com/settings/api_security',
      steps: [
        'Step 1: Log in to https://app.mailgun.com',
        'Step 2: Click your account name (top right) → "API Security"',
        'Step 3: Under "Mailgun API keys", click "Add new key"',
        'Step 4: Enter a description (e.g., "Workflow Automation") and click "Create Key"',
        'Step 5: Copy the key immediately — it starts with "key-"',
        'Step 6: Paste it into the API Key field above',
        '',
        'Note: You also need your sending domain from Domains → your domain → Domain Settings.',
        '',
        '⚠️ The private API key can send email on your behalf. Keep it secret.',
      ],
      example: 'key-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
      securityWarning: true,
    },
    sendgrid: {
      title: 'How to get SendGrid API Key?',
      url: 'https://app.sendgrid.com/settings/api_keys',
      steps: [
        'Step 1: Log in to https://app.sendgrid.com',
        'Step 2: Go to Settings → API Keys in the left sidebar',
        'Step 3: Click "Create API Key" (top right)',
        'Step 4: Enter a name (e.g., "Workflow Automation")',
        'Step 5: Select "Restricted Access" and enable "Mail Send" → Full Access',
        'Step 6: Click "Create & View"',
        'Step 7: Copy the key immediately — it starts with "SG."',
        'Step 8: Paste it into the API Key field above',
        '',
        '⚠️ The key is shown only once. If lost, delete it and create a new one.',
      ],
      example: 'SG.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
      securityWarning: true,
    },
    pipedrive: {
      title: 'How to get Pipedrive API Token?',
      url: 'https://app.pipedrive.com/settings/api',
      steps: [
        'Step 1: Log in to your Pipedrive account at https://app.pipedrive.com',
        'Step 2: Click your profile avatar (top right) → "Personal preferences"',
        'Step 3: Go to the "API" tab',
        'Step 4: Your personal API token is displayed — click the copy icon',
        'Step 5: Paste the token into the API Token field above',
        '',
        'Format: a 40-character alphanumeric string.',
        '',
        '⚠️ This token acts as your personal credentials. Do not share it.',
      ],
      example: 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2',
      securityWarning: true,
    },
    activecampaign: {
      title: 'How to get ActiveCampaign API Key?',
      url: 'https://www.activecampaign.com/api/overview.php',
      steps: [
        'Step 1: Log in to your ActiveCampaign account',
        'Step 2: Go to Settings (gear icon, bottom left) → "Developer"',
        'Step 3: Your API Key and API URL are shown on this page',
        'Step 4: Click the copy icon next to the API Key',
        'Step 5: Paste it into the API Key field above',
        'Step 6: Also copy the API URL (e.g., https://youraccountname.api-us1.com) into the API URL field',
        '',
        'Format: a 64-character hex string.',
        '',
        '⚠️ Do not share your API key — it grants full account access.',
      ],
      example: 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2',
      securityWarning: true,
    },
    jenkins: {
      title: 'How to get Jenkins API Token?',
      url: 'https://your-jenkins-server/user/your-username/configure',
      steps: [
        'Step 1: Log in to your Jenkins server',
        'Step 2: Click your username (top right) → "Configure"',
        'Step 3: Scroll down to the "API Token" section',
        'Step 4: Click "Add new Token"',
        'Step 5: Enter a name (e.g., "Workflow Automation") and click "Generate"',
        'Step 6: Copy the token immediately — it is shown only once',
        'Step 7: Paste it into the API Token field above',
        '',
        'Note: Use this token with your Jenkins username for Basic Auth.',
        '',
        '⚠️ Tokens cannot be retrieved after creation. Store them securely.',
      ],
      example: '11abc123def456ghi789jkl012mno345pq',
      securityWarning: true,
    },
    supabase: {
      title: 'How to get Supabase API Key?',
      url: 'https://supabase.com/dashboard/project/_/settings/api',
      steps: [
        'Step 1: Log in to https://supabase.com/dashboard',
        'Step 2: Select your project',
        'Step 3: Go to Project Settings → API (left sidebar)',
        'Step 4: Under "Project API keys", copy one of:',
        '   • anon / public — safe for client-side usage with RLS enabled',
        '   • service_role — bypasses RLS; use only in server-side workflows',
        'Step 5: Also copy the "Project URL" (e.g., https://xxxx.supabase.co) into the URL field',
        'Step 6: Paste the key into the API Key field above',
        '',
        '⚠️ Never expose the service_role key in client-side code.',
      ],
      example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIn0.xxx',
      securityWarning: true,
    },
    aws: {
      title: 'How to get AWS Access Key ID?',
      url: 'https://console.aws.amazon.com/iam/home#/users',
      steps: [
        'Step 1: Log in to https://console.aws.amazon.com',
        'Step 2: Go to IAM → Users',
        'Step 3: Select the IAM user you want to use (or create a new one with least-privilege permissions)',
        'Step 4: Go to the "Security credentials" tab',
        'Step 5: Scroll to "Access keys" and click "Create access key"',
        'Step 6: Choose use case (e.g., "Application running outside AWS") → Next',
        'Step 7: Copy both the Access Key ID and Secret Access Key',
        'Step 8: Paste the Access Key ID into the Access Key ID field and the Secret into the Secret Access Key field',
        '',
        'Format: Access Key ID starts with "AKIA" (20 characters).',
        '',
        '⚠️ Never use root account credentials. Create a dedicated IAM user with minimal permissions.',
      ],
      example: 'AKIAIOSFODNN7EXAMPLE',
      securityWarning: true,
    },
  };

  return guides[nodeType] || {
    title: `How to get ${fieldLabel}?`,
    steps: [
      'Step 1: Log in to your service provider\'s dashboard or developer portal',
      'Step 2: Navigate to the "API Keys", "Developer Settings", or "Credentials" section',
      'Step 3: Click "Create API Key" or "Generate New Key"',
      'Step 4: Give your API key a descriptive name (e.g., "Workflow Automation")',
      'Step 5: Select the permissions/scopes your workflow needs',
      'Step 6: Copy the API key immediately - it may only be shown once',
      'Step 7: Store it securely and paste it into the input field above',
      '',
      '⚠️ Do not expose this value on frontend. Store it securely.'
    ],
    securityWarning: true
  };
}

function generateTokenGuide(nodeType: string, fieldLabel: string): FieldGuide {
  if (nodeType === 'telegram') {
    return {
      title: 'How to get Telegram Bot Token?',
      url: 'https://t.me/BotFather',
      steps: [
        'Step 1: Open Telegram and search for "@BotFather" in the search bar',
        'Step 2: Tap BotFather and press "Start"',
        'Step 3: Send the command: /newbot',
        'Step 4: BotFather asks for a display name — enter one (e.g., "My Workflow Bot")',
        'Step 5: Choose a username — it must end in "bot" (e.g., "myworkflow_bot")',
        'Step 6: BotFather confirms creation and shows your Bot Token',
        'Step 7: Copy the full token — it looks like: 1234567890:ABCdefGHIjklMNOpqrSTUvwxYZ',
        'Step 8: Paste the token into the field above',
        '',
        'To revoke a leaked token: send /token to BotFather and regenerate it.',
        '',
        '⚠️ Never share your bot token. Anyone with it can control your bot.',
      ],
      example: '1234567890:ABCdefGHIjklMNOpqrSTUvwxYZ',
      securityWarning: true,
    };
  }

  if (nodeType === 'discord') {
    return {
      title: 'How to get Discord Bot Token?',
      url: 'https://discord.com/developers/applications',
      steps: [
        'Step 1: Go to https://discord.com/developers/applications and sign in',
        'Step 2: Click "New Application" → give it a name → click "Create"',
        'Step 3: In the left sidebar, click "Bot"',
        'Step 4: Click "Add Bot" → confirm with "Yes, do it!"',
        'Step 5: Under TOKEN, click "Reset Token" → confirm → copy the token immediately',
        'Step 6: Scroll down and enable "Message Content Intent" if your bot reads messages',
        'Step 7: To add the bot to a server: go to OAuth2 → URL Generator → select "bot" scope',
        '   Select required permissions and visit the generated URL to invite the bot',
        'Step 8: Paste the token into the field above',
        '',
        'Token format: MTxxxxxxxxxxxxxxxxxxxxxxxx.Gxxxxx.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
        '',
        '⚠️ The token is shown only once after reset. If lost, reset it again.',
      ],
      example: 'MTxxxxxxxxxxxxxxxxxxxxxxxx.Gxxxxx.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
      securityWarning: true,
    };
  }

  if (nodeType === 'twilio') {
    return {
      title: 'How to get Twilio Auth Token?',
      url: 'https://console.twilio.com',
      steps: [
        'Step 1: Go to https://console.twilio.com and sign in',
        'Step 2: Your Account SID and Auth Token are on the dashboard homepage',
        'Step 3: Click the eye icon next to Auth Token to reveal the value',
        'Step 4: Click the copy icon to copy the Auth Token',
        'Step 5: Paste it into the Auth Token field above',
        '',
        'Also note your Account SID from the same page — you need it for the Account SID field.',
        '',
        'Format: a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4 (32-character hex string)',
        '',
        '⚠️ Treat the Auth Token like a password. Never expose it in client-side code.',
      ],
      example: 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4',
      securityWarning: true,
    };
  }

  if (nodeType === 'hubspot') {
    return {
      title: 'How to get HubSpot Private App Token?',
      url: 'https://developers.hubspot.com/docs/api/private-apps',
      steps: [
        'Step 1: Log in to HubSpot at https://app.hubspot.com',
        'Step 2: Click the settings gear icon (top right)',
        'Step 3: Go to Integrations → Private Apps in the left sidebar',
        'Step 4: Click "Create a private app" (top right)',
        'Step 5: On the "Basic Info" tab, enter a name and description for the app',
        'Step 6: Go to the "Scopes" tab and enable the permissions your workflow needs',
        '   Common scopes: crm.objects.contacts.read/write, crm.objects.deals.read/write',
        'Step 7: Click "Create app" (top right) → confirm',
        'Step 8: A dialog shows your access token — click "Copy" immediately',
        'Step 9: Paste the token into the field above',
        '',
        'Format: pat-eu1-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
        '',
        '⚠️ This token grants API access based on the scopes you selected. Keep it secret.',
      ],
      example: 'pat-eu1-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
      securityWarning: true,
    };
  }

  return {
    title: `How to get ${fieldLabel}?`,
    steps: [
      'Step 1: Log in to your service provider\'s platform',
      'Step 2: Navigate to "Developer Settings", "API Tokens", or "Access Tokens"',
      'Step 3: Click "Generate Token" or "Create New Token"',
      'Step 4: Select the required permissions or scopes for your workflow',
      'Step 5: Set an expiration time if available (or use long-lived tokens for automation)',
      'Step 6: Copy the token immediately after generation',
      'Step 7: For OAuth tokens: Complete the OAuth flow and copy the access token',
      'Step 8: Paste the token into the input field - tokens are case-sensitive',
      '',
      '⚠️ Do not expose this value on frontend. Store it securely.'
    ],
    securityWarning: true
  };
}

function generateURLGuide(nodeType: string, fieldKey: string, fieldLabel: string): FieldGuide {
  const lowerKey = fieldKey.toLowerCase();

  if (lowerKey.includes('webhook')) {
    return {
      title: 'How to get Webhook URL?',
      steps: [
        'Step 1: Identify where you want to receive webhook data',
        'Step 2: Use your server\'s public URL',
        'Step 3: For production: Use your server\'s public URL',
        'Step 4: The webhook URL format is: https://your-domain.com/webhook/endpoint',
        'Step 5: Copy the complete URL including protocol (http:// or https://)',
        'Step 6: Paste it into the service that will send webhooks to you',
        'Step 7: Test the webhook to verify it\'s working',
        '',
        'Example:',
        'https://api.example.com/webhook/receive',
      ],
      example: 'https://api.example.com/webhook/receive',
    };
  }

  if (nodeType === 'mailgun') {
    return {
      title: 'How to get your Mailgun Sending Domain?',
      url: 'https://app.mailgun.com/mg/sending/domains',
      steps: [
        'Step 1: Log in to https://app.mailgun.com',
        'Step 2: Go to Send → Domains in the left sidebar',
        'Step 3: You will see your verified sending domains listed',
        'Step 4: If you have not added a domain yet, click "Add New Domain" and follow the DNS setup guide',
        'Step 5: Copy the domain name exactly as shown (e.g., mg.yourdomain.com)',
        'Step 6: Paste it into the Domain field above',
        '',
        'Note: Mailgun provides a sandbox domain (sandbox....mailgun.org) for testing. Use your own domain for production.',
      ],
      example: 'mg.yourdomain.com',
    };
  }

  if (nodeType === 'activecampaign') {
    return {
      title: 'How to get ActiveCampaign API URL?',
      url: 'https://help.activecampaign.com/hc/en-us/articles/207317590',
      steps: [
        'Step 1: Log in to your ActiveCampaign account',
        'Step 2: Go to Settings (gear icon, bottom left) → "Developer"',
        'Step 3: Your API URL is shown on this page (next to your API Key)',
        'Step 4: Copy the full URL — it includes your account name',
        'Step 5: Paste it into the API URL field above',
        '',
        'Format: https://youraccountname.api-us1.com',
        '',
        'Note: The URL is unique to your account and region.',
      ],
      example: 'https://youraccountname.api-us1.com',
    };
  }

  if (nodeType === 'woocommerce') {
    return {
      title: 'How to get your WooCommerce Store URL?',
      steps: [
        'Step 1: Your store URL is the domain where your WordPress/WooCommerce site is hosted',
        'Step 2: It is the root URL of your site — not a product or checkout page',
        'Step 3: Make sure it includes the protocol: https://',
        'Step 4: Paste it into the Store URL field above',
        '',
        'Example: if your site is at https://shop.example.com, enter that.',
        '',
        'Note: The REST API will be accessed at <store_url>/wp-json/wc/v3/...',
      ],
      example: 'https://shop.example.com',
    };
  }

  if (nodeType === 'jenkins') {
    return {
      title: 'How to get Jenkins Base URL?',
      steps: [
        'Step 1: Your Jenkins Base URL is the root address of your Jenkins server',
        'Step 2: For self-hosted Jenkins it is typically http://your-server:8080 or https://jenkins.yourdomain.com',
        'Step 3: Check with your DevOps team if you are unsure',
        'Step 4: Paste the full URL (with protocol) into the Base URL field above',
        '',
        'Example: https://jenkins.yourdomain.com',
        '',
        'Note: Do not include trailing slashes or specific job paths.',
      ],
      example: 'https://jenkins.yourdomain.com',
    };
  }

  if (nodeType === 'supabase') {
    return {
      title: 'How to get Supabase Project URL?',
      url: 'https://supabase.com/dashboard/project/_/settings/api',
      steps: [
        'Step 1: Log in to https://supabase.com/dashboard',
        'Step 2: Select your project',
        'Step 3: Go to Project Settings → API in the left sidebar',
        'Step 4: Under "Project URL", copy the URL shown (e.g., https://xxxx.supabase.co)',
        'Step 5: Paste it into the Project URL field above',
        '',
        'Format: https://<project-ref>.supabase.co',
      ],
      example: 'https://xxxxxxxxxxxxxxxxxxxx.supabase.co',
    };
  }

  return {
    title: `How to get ${fieldLabel}?`,
    steps: [
      'Step 1: Identify the service or API you need to connect to',
      'Step 2: Check the service\'s official documentation for the base URL or endpoint',
      'Step 3: Common formats: https://api.service.com or https://service.com/api/v1',
      'Step 4: For REST APIs, the URL typically includes: protocol (https://), domain, and path',
      'Step 5: Some services provide URLs in their dashboard under "API Settings" or "Integration"',
      'Step 6: Ensure the URL includes the protocol (http:// or https://)',
      'Step 7: Test the URL in a browser or API client to verify it\'s accessible',
      '',
      'Example:',
      'https://api.example.com/v1',
    ],
    example: 'https://api.example.com/v1',
  };
}

function generateCredentialGuide(nodeType: string, fieldLabel: string): FieldGuide {
  // Check if this is a database credential
  const isDatabaseCredential = fieldLabel.toLowerCase().includes('database') || 
                               nodeType?.toLowerCase().includes('postgres') ||
                               nodeType?.toLowerCase().includes('mysql') ||
                               nodeType?.toLowerCase().includes('mongo') ||
                               nodeType?.toLowerCase().includes('sql') ||
                               nodeType?.toLowerCase().includes('timescale') ||
                               nodeType?.toLowerCase().includes('database');
  
  if (isDatabaseCredential) {
    return {
      title: 'How to get DATABASE CREDENTIALS?',
      steps: [
        'Step 1: Identify Your Database Type',
        '   Determine which database you\'re using:',
        '   • PostgreSQL / TimescaleDB',
        '   • MySQL / MariaDB',
        '   • MongoDB',
        '   • Microsoft SQL Server',
        '   • SQLite',
        '   • Other (Redis, Cassandra, etc.)',
        '',
        'Step 2: Access Database Management Interface',
        '   For Cloud Databases (AWS RDS, Google Cloud SQL, Azure):',
        '   • Log in to your cloud provider console',
        '   • Navigate to Database Services section',
        '   • Select your database instance',
        '   • Go to "Connection" or "Credentials" tab',
        '',
        '   For Self-Hosted Databases:',
        '   • Connect via database client (pgAdmin, MySQL Workbench, etc.)',
        '   • Or access via command line (psql, mysql, mongo)',
        '   • Or check your application configuration files',
        '',
        'Step 3: Locate Connection Credentials',
        '   You need these details:',
        '   • Host/Server: Database server address (e.g., localhost, db.example.com)',
        '   • Port: Database port number (PostgreSQL: 5432, MySQL: 3306, MongoDB: 27017)',
        '   • Database Name: Specific database to connect to',
        '   • Username: Database user account name',
        '   • Password: Database user password',
        '',
        'Step 4: Get Username and Password',
        '   For New Databases:',
        '   • Create user: CREATE USER myuser WITH PASSWORD \'mypassword\';',
        '   • Grant permissions: GRANT ALL PRIVILEGES ON DATABASE mydb TO myuser;',
        '',
        '   For Existing Databases:',
        '   • Check with your database administrator',
        '   • Review application configuration files (.env, config.yml)',
        '   • Check cloud provider\'s credential management',
        '',
        'Step 5: For Cloud Databases',
        '   AWS RDS:',
        '   • Go to RDS Dashboard → Your Database → Configuration',
        '   • Master username and password are set during creation',
        '   • Or use IAM database authentication',
        '',
        '   Google Cloud SQL:',
        '   • Go to SQL → Your Instance → Users',
        '   • Create or view existing users',
        '   • Reset password if needed',
        '',
        '   Azure SQL Database:',
        '   • Go to SQL Server → Your Server → SQL databases',
        '   • Use server admin credentials or create contained database users',
        '',
        'Step 6: Security Best Practices',
        '   • Use strong, unique passwords',
        '   • Create dedicated users with minimal required permissions',
        '   • Never use root/admin accounts for applications',
        '   • Store credentials in environment variables or secret managers',
        '   • Enable SSL/TLS encryption for connections',
        '   • Rotate credentials regularly',
        '',
        'Step 7: Enter Credentials',
        '   • Copy each credential value exactly as shown',
        '   • Usernames and database names are often case-sensitive',
        '   • Passwords may contain special characters - copy carefully',
        '   • Test connection before saving',
        '',
        '⚠️ Security Warning:',
        '   Never commit database credentials to version control.',
        '   Use environment variables or secure vaults for production.'
      ],
      securityWarning: true
    };
  }
  
  // WooCommerce consumer key / consumer secret
  if (nodeType === 'woocommerce') {
    const isSecret = fieldLabel.toLowerCase().includes('secret');
    return {
      title: isSecret ? 'How to get WooCommerce Consumer Secret?' : 'How to get WooCommerce Consumer Key?',
      url: 'https://woocommerce.com/document/woocommerce-rest-api/',
      steps: [
        'Step 1: Log in to your WordPress admin panel (https://yourstore.com/wp-admin)',
        'Step 2: Go to WooCommerce → Settings → Advanced → REST API',
        'Step 3: Click "Add Key"',
        'Step 4: Fill in Description (e.g., "Workflow Automation"), select User, set Permissions to "Read/Write"',
        'Step 5: Click "Generate API Key"',
        'Step 6: The Consumer Key and Consumer Secret are shown — copy both immediately',
        'Step 7: Paste the Consumer Key into the Consumer Key field and Consumer Secret into its field',
        '',
        '⚠️ The Consumer Secret is shown only once. If lost, you must regenerate the key pair.',
      ],
      example: isSecret ? 'cs_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx' : 'ck_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
      securityWarning: true,
    };
  }

  // SFTP private key
  if (nodeType === 'sftp' && fieldLabel.toLowerCase().includes('private')) {
    return {
      title: 'How to get SFTP Private Key?',
      steps: [
        'Step 1: Generate an SSH key pair if you do not have one:',
        '   Run: ssh-keygen -t ed25519 -C "workflow-automation"',
        '   This creates ~/.ssh/id_ed25519 (private) and ~/.ssh/id_ed25519.pub (public)',
        'Step 2: Add the public key to the SFTP server\'s authorized_keys file:',
        '   cat ~/.ssh/id_ed25519.pub >> ~/.ssh/authorized_keys  (on the server)',
        'Step 3: Copy the full content of the private key file:',
        '   cat ~/.ssh/id_ed25519  (on your local machine)',
        'Step 4: Paste the entire content — including the -----BEGIN and -----END lines — into this field',
        '',
        'Note: If your SFTP provider gave you a private key file, open it in a text editor and copy all its contents.',
        '',
        '⚠️ Never share your private key. Treat it like a password.',
      ],
      example: '-----BEGIN OPENSSH PRIVATE KEY-----\nb3BlbnNzaC1...\n-----END OPENSSH PRIVATE KEY-----',
      securityWarning: true,
    };
  }

  // Generic credential guide for non-database credentials
  return {
    title: `How to get ${fieldLabel}?`,
    steps: [
      'Step 1: Access your service provider\'s account settings or developer portal',
      'Step 2: Look for "Security", "Authentication", or "Credentials" section',
      'Step 3: Depending on the service, you may need:',
      '   • Username and Password',
      '   • OAuth tokens',
      '   • API keys',
      '   • Service account credentials',
      'Step 4: Follow the service\'s specific authentication setup process',
      'Step 5: For OAuth: Authorize the application and copy the access token',
      'Step 6: For service accounts: Download the JSON key file or copy credentials',
      'Step 7: Store credentials securely - use environment variables or secure vaults when possible',
      '',
      '⚠️ Do not expose this value on frontend. Store it securely.'
    ],
    securityWarning: true
  };
}

function generateConnectionStringGuide(nodeType: string, fieldLabel: string): FieldGuide {
  const lowerNode = nodeType.toLowerCase();
  const example =
    lowerNode.includes('postgres') ? 'postgresql://user:password@host:5432/database?sslmode=require' :
    lowerNode.includes('mysql') ? 'mysql://user:password@host:3306/database' :
    lowerNode.includes('mongo') ? 'mongodb+srv://user:password@cluster.example.mongodb.net/database' :
    lowerNode.includes('redis') ? 'redis://default:password@host:6379' :
    'protocol://username:password@host:port/database';

  return {
    title: `How to fill ${fieldLabel}?`,
    steps: [
      'Step 1: Open your database or service dashboard and find the connection details.',
      'Step 2: Copy the full connection URI if the provider gives one.',
      'Step 3: If it gives separate fields, combine protocol, username, password, host, port, and database name.',
      'Step 4: Include SSL options when the provider requires them, for example sslmode=require for PostgreSQL.',
      'Step 5: Paste the complete URI into this field. Do not paste only the host name.',
      'Step 6: Use a dedicated low-permission database user for workflow automation.',
    ],
    example,
    securityWarning: true,
  };
}

function generateUsernameGuide(nodeType: string, fieldLabel: string): FieldGuide {
  return {
    title: `How to get ${fieldLabel}?`,
    steps: [
      'Step 1: Open the provider dashboard or admin console for this service.',
      'Step 2: Go to users, credentials, database users, or account settings.',
      'Step 3: Copy the username exactly as shown. It may be an email address, login name, or generated service user.',
      'Step 4: For databases and automation accounts, prefer a dedicated user with only the permissions this workflow needs.',
      'Step 5: Paste only the username, not the password or full connection string.',
    ],
    example: nodeType.toLowerCase().includes('smtp') ? 'your-email@example.com' : 'workflow_user',
  };
}

function generatePasswordGuide(nodeType: string, fieldLabel: string): FieldGuide {
  return {
    title: `How to get ${fieldLabel}?`,
    steps: [
      'Step 1: Open the provider dashboard where the user, app, or database credential is managed.',
      'Step 2: If the password is not visible, create or reset it and copy the new value immediately.',
      'Step 3: For services like Gmail, Outlook, Bitbucket, or Jira, use an app password or API token when available.',
      'Step 4: Paste the password/token exactly as generated. Preserve symbols, spaces, and capitalization.',
      'Step 5: Rotate the password if it was ever exposed or pasted into the wrong place.',
    ],
    example: nodeType.toLowerCase().includes('smtp') ? 'app-password-or-smtp-password' : 'generated-password-or-token',
    securityWarning: true,
  };
}

function generateServiceAccountEmailGuide(fieldLabel: string): FieldGuide {
  return {
    title: `How to get ${fieldLabel}?`,
    url: 'https://console.cloud.google.com/iam-admin/serviceaccounts',
    steps: [
      'Step 1: Open Google Cloud Console and select the project used by this workflow.',
      'Step 2: Go to IAM & Admin -> Service Accounts.',
      'Step 3: Create a service account or open an existing one.',
      'Step 4: Copy the service account email. It usually ends with .iam.gserviceaccount.com.',
      'Step 5: Grant that service account access to the target resource, such as sharing a Google Sheet with it.',
    ],
    example: 'workflow-service@project-id.iam.gserviceaccount.com',
  };
}

function generateWhatsAppPhoneNumberIdGuide(fieldLabel: string): FieldGuide {
  return {
    title: `How to get ${fieldLabel}?`,
    url: 'https://developers.facebook.com/docs/whatsapp/cloud-api/get-started',
    steps: [
      'Step 1: Open Meta for Developers and select the app connected to WhatsApp.',
      'Step 2: Go to WhatsApp -> API Setup.',
      'Step 3: Select the WhatsApp Business Account and phone number.',
      'Step 4: Copy the Phone number ID shown in the API setup panel.',
      'Step 5: Paste the numeric ID only. Do not paste the display phone number.',
    ],
    example: '123456789012345',
  };
}

function generateMetaBusinessAccountGuide(fieldLabel: string): FieldGuide {
  return {
    title: `How to get ${fieldLabel}?`,
    url: 'https://business.facebook.com/settings/whatsapp-business-accounts',
    steps: [
      'Step 1: Open Meta Business Settings.',
      'Step 2: Go to Accounts -> WhatsApp accounts or Business assets.',
      'Step 3: Select the business account used by the connected Meta app.',
      'Step 4: Copy the WhatsApp Business Account ID or Business Account ID from account details.',
      'Step 5: Paste the numeric ID only.',
    ],
    example: '123456789012345',
  };
}

function generateProviderResourceIdGuide(nodeType: string, fieldLabel: string, resourceName: string): FieldGuide {
  const serviceName = nodeType.replace(/_/g, ' ') || 'the provider';
  return {
    title: `How to get ${fieldLabel}?`,
    steps: [
      `Step 1: Open ${serviceName} and navigate to the ${resourceName} you want this node to use.`,
      `Step 2: Look in the URL, settings, or API/details panel for the ${resourceName} ID.`,
      'Step 3: Copy the stable ID, not the display name, unless the field description explicitly asks for a name.',
      'Step 4: If the ID is not visible in the UI, list resources with the provider API and copy the id field from the response.',
      'Step 5: Paste the ID exactly as shown.',
    ],
    example: `${resourceName}_123456`,
  };
}

function generateProjectIdGuide(nodeType: string, fieldLabel: string): FieldGuide {
  return {
    title: `How to get ${fieldLabel}?`,
    url: nodeType.toLowerCase().includes('google') ? 'https://console.cloud.google.com/' : undefined,
    steps: [
      'Step 1: Open the cloud or provider console for the account this workflow will use.',
      'Step 2: Select the target project or workspace.',
      'Step 3: Copy the project ID from project settings, not the project display name.',
      'Step 4: For Google Cloud, use the Project ID string such as my-project-123, not the numeric project number.',
      'Step 5: Make sure the saved credential has access to this project.',
    ],
    example: nodeType.toLowerCase().includes('google') ? 'my-gcp-project-id' : 'project_123456',
  };
}

function generateBucketNameGuide(nodeType: string, fieldLabel: string): FieldGuide {
  return {
    title: `How to get ${fieldLabel}?`,
    steps: [
      'Step 1: Open the storage service console, such as Amazon S3 or Google Cloud Storage.',
      'Step 2: Open the bucket list and select the bucket this workflow should use.',
      'Step 3: Copy the bucket name exactly. Bucket names are usually globally unique and case-sensitive rules vary by provider.',
      'Step 4: Paste only the bucket name, not a full URL, unless the field asks for a URL.',
      'Step 5: Confirm the saved credential can read/write this bucket for the selected operation.',
    ],
    example: nodeType.toLowerCase().includes('s3') ? 'my-s3-bucket' : 'my-storage-bucket',
  };
}

function generateRegionGuide(nodeType: string, fieldLabel: string): FieldGuide {
  return {
    title: `How to choose ${fieldLabel}?`,
    steps: [
      'Step 1: Open the service dashboard and check the region where the resource was created.',
      'Step 2: Copy the provider region code, not the friendly location label.',
      'Step 3: AWS examples: us-east-1, us-west-2, ap-south-1.',
      'Step 4: Google Cloud examples: us-central1, asia-south1, europe-west1.',
      'Step 5: Use the same region as the bucket, database, queue, or service instance.',
    ],
    example: nodeType.toLowerCase().includes('aws') ? 'us-east-1' : 'us-central1',
  };
}

function generateTimezoneGuide(fieldLabel: string): FieldGuide {
  return {
    title: `How to set ${fieldLabel}?`,
    url: 'https://en.wikipedia.org/wiki/List_of_tz_database_time_zones',
    steps: [
      'Step 1: Use an IANA timezone name in Area/City format.',
      'Step 2: Examples include Asia/Kolkata, America/New_York, Europe/London, and UTC.',
      'Step 3: Do not use vague abbreviations like IST, CST, or PST because they can be ambiguous.',
      'Step 4: Pick the timezone where scheduled work should be interpreted.',
    ],
    example: 'Asia/Kolkata',
  };
}

function generateHeadersGuide(fieldLabel: string): FieldGuide {
  return {
    title: `How to format ${fieldLabel}?`,
    steps: [
      'Step 1: Enter a JSON object where each key is a header name and each value is a string.',
      'Step 2: Use double quotes around all keys and string values.',
      'Step 3: Common headers are Authorization, Content-Type, Accept, and X-API-Key.',
      'Step 4: For bearer auth, use "Authorization": "Bearer {{$credentials.apiToken}}".',
      'Step 5: Do not put secrets directly here when the node can use dashboard credentials.',
    ],
    example: '{ "Authorization": "Bearer {{$credentials.apiToken}}", "Content-Type": "application/json" }',
    securityWarning: true,
  };
}

function generateBodyPayloadGuide(fieldLabel: string, placeholder?: string): FieldGuide {
  return {
    title: `How to format ${fieldLabel}?`,
    steps: [
      'Step 1: Enter valid JSON for API payloads, or plain text only if the node description says text is accepted.',
      'Step 2: Use double quotes in JSON and no trailing commas.',
      'Step 3: Use expressions like {{$json.email}} to map values from previous nodes.',
      'Step 4: Match the provider API schema exactly: required keys, nested objects, and arrays must be in the expected shape.',
      'Step 5: For arrays, use [ ... ]; for objects, use { ... }.',
    ],
    example: placeholder || '{ "name": "{{$json.name}}", "email": "{{$json.email}}" }',
  };
}

function generateQueryParamsGuide(fieldLabel: string): FieldGuide {
  return {
    title: `How to format ${fieldLabel}?`,
    steps: [
      'Step 1: Enter query parameters as a JSON object unless the field description asks for a raw query string.',
      'Step 2: Keys are parameter names; values can be strings, numbers, booleans, or expressions.',
      'Step 3: Do not include the leading ? when using JSON object mode.',
      'Step 4: If the field asks for a raw string, use format like limit=10&status=active.',
      'Step 5: Encode special characters only when using raw string mode.',
    ],
    example: '{ "limit": 10, "status": "active" }',
  };
}

function generateFieldMappingGuide(fieldLabel: string, placeholder?: string): FieldGuide {
  return {
    title: `How to map ${fieldLabel}?`,
    steps: [
      'Step 1: Enter a JSON object where keys are target field names in the destination app.',
      'Step 2: Set each value to a static value or an expression from upstream data.',
      'Step 3: Use provider field/API names, not always the friendly labels from the UI.',
      'Step 4: For optional fields, include only keys you want to send.',
      'Step 5: Validate nested objects and arrays against the provider documentation.',
    ],
    example: placeholder || '{ "name": "{{$json.name}}", "email": "{{$json.email}}" }',
  };
}

function generateCaseListGuide(fieldLabel: string): FieldGuide {
  return {
    title: `How to format ${fieldLabel}?`,
    steps: [
      'Step 1: Enter an array of case objects.',
      'Step 2: Each case should include a value to match and a label/name for the branch.',
      'Step 3: The value must match the switch expression output exactly unless the node supports pattern matching.',
      'Step 4: Keep branch labels short and stable because they become output paths.',
      'Step 5: Add a fallback/default path if the node supports it.',
    ],
    example: '[{ "value": "new", "label": "New" }, { "value": "done", "label": "Done" }]',
  };
}

function generateFormFieldsGuide(fieldLabel: string): FieldGuide {
  return {
    title: `How to format ${fieldLabel}?`,
    steps: [
      'Step 1: Enter an array of field definitions.',
      'Step 2: Each field should have key, label, type, and required.',
      'Step 3: Use stable lowercase keys such as email, name, company, or message.',
      'Step 4: Supported types commonly include text, email, number, select, checkbox, textarea, and date.',
      'Step 5: For select fields, add an options array with label/value pairs.',
    ],
    example: '[{ "key": "email", "label": "Email", "type": "email", "required": true }]',
  };
}

function generateSQLQueryGuide(nodeType: string, fieldLabel: string): FieldGuide {
  const isSalesforce = nodeType.toLowerCase().includes('salesforce') || fieldLabel.toLowerCase().includes('soql');
  return {
    title: `How to write ${fieldLabel}?`,
    steps: [
      isSalesforce ? 'Step 1: Use SOQL/SOSL syntax for Salesforce fields and objects.' : 'Step 1: Write a SQL query supported by the target database.',
      'Step 2: Use SELECT for read nodes and INSERT/UPDATE/DELETE only on write nodes.',
      'Step 3: Use placeholders or expressions for dynamic values instead of string concatenation.',
      'Step 4: Check table/object names and field names against the provider schema.',
      'Step 5: Limit large reads during testing to avoid slow or expensive workflow runs.',
    ],
    example: isSalesforce ? 'SELECT Id, Name, Email FROM Contact LIMIT 10' : 'SELECT * FROM users WHERE id = $1',
  };
}

function generateGraphQLQueryGuide(fieldLabel: string): FieldGuide {
  return {
    title: `How to write ${fieldLabel}?`,
    steps: [
      'Step 1: Write a valid GraphQL query or mutation.',
      'Step 2: Include the operation name when possible for easier debugging.',
      'Step 3: Put dynamic inputs in GraphQL variables rather than string-building the query.',
      'Step 4: Make sure the selected fields exist in the GraphQL schema.',
      'Step 5: Keep variables as a separate JSON object if the node provides a variables field.',
    ],
    example: 'query GetItem($id: ID!) { item(id: $id) { id name } }',
  };
}

function generateSearchQueryGuide(nodeType: string, fieldLabel: string): FieldGuide {
  const lowerNode = nodeType.toLowerCase();
  return {
    title: `How to write ${fieldLabel}?`,
    steps: [
      'Step 1: Use the search syntax for the selected provider.',
      lowerNode.includes('gmail') ? 'Step 2: Gmail examples: is:unread, from:customer@example.com, newer_than:7d.' : 'Step 2: Start with simple keywords or filters, then add provider-specific operators.',
      'Step 3: Use upstream expressions for dynamic search terms only when needed.',
      'Step 4: Test with a narrow query first to avoid returning too much data.',
      'Step 5: If results are empty, verify the connected account has access to the target resource.',
    ],
    example: lowerNode.includes('gmail') ? 'is:unread newer_than:7d' : 'status:active',
  };
}

function generateFilePathGuide(fieldLabel: string): FieldGuide {
  return {
    title: `How to fill ${fieldLabel}?`,
    steps: [
      'Step 1: Use the path format expected by the provider or server.',
      'Step 2: For cloud storage, use object paths like folder/file.csv without a leading bucket name unless requested.',
      'Step 3: For SFTP/FTP, use the remote path such as /exports/file.csv.',
      'Step 4: Preserve file extensions and capitalization.',
      'Step 5: Use expressions like {{$json.fileName}} only for the dynamic part.',
    ],
    example: 'exports/report.csv',
  };
}

function generateCodeSnippetGuide(fieldLabel: string): FieldGuide {
  return {
    title: `How to write ${fieldLabel}?`,
    steps: [
      'Step 1: Write JavaScript that returns the value or object this node should output.',
      'Step 2: Use $json for the current input object when supported by the node.',
      'Step 3: Keep side effects out of transformation nodes unless the node description allows API calls.',
      'Step 4: Return plain JSON-compatible values: objects, arrays, strings, numbers, booleans, or null.',
      'Step 5: Test with sample input before using it in a live workflow.',
    ],
    example: 'return { ...$json, processed: true };',
  };
}

function generateDatabaseGuide(fieldKey: string, fieldLabel: string): FieldGuide {
  return {
    title: `How to get ${fieldLabel}?`,
    steps: [
      'Step 1: Access your database management interface (phpMyAdmin, pgAdmin, MongoDB Compass, etc.)',
      'Step 2: List all available databases',
      'Step 3: Select the database name you want to use',
      'Step 4: Copy the exact database name (case-sensitive for some databases)',
      'Step 5: Ensure the database exists and you have proper permissions',
      'Step 6: Paste the database name into the input field',
      '',
      'Example:',
      'my_workflow_db'
    ],
    example: 'my_workflow_db'
  };
}

function generateHostGuide(fieldLabel: string): FieldGuide {
  return {
    title: `How to get ${fieldLabel}?`,
    steps: [
      'Step 1: Identify your server or service hostname',
      'Step 2: For cloud services: Check your service dashboard for the host address',
      'Step 3: Common formats:',
      '   • IP address: 192.168.1.100',
      '   • Domain: db.example.com',
      '   • Localhost: localhost or 127.0.0.1',
      'Step 4: For databases: Usually found in your database provider\'s connection details',
      'Step 5: Copy the hostname or IP address',
      'Step 6: Paste it into the input field (do not include protocol or port)',
      '',
      'Example:',
      'db.example.com'
    ],
    example: 'db.example.com'
  };
}

function generatePortGuide(fieldLabel: string): FieldGuide {
  return {
    title: `How to get ${fieldLabel}?`,
    steps: [
      'Step 1: Identify the service you\'re connecting to',
      'Step 2: Common default ports:',
      '   • HTTP: 80',
      '   • HTTPS: 443',
      '   • PostgreSQL: 5432',
      '   • MySQL: 3306',
      '   • MongoDB: 27017',
      '   • Redis: 6379',
      'Step 3: Check your service provider\'s documentation for the correct port',
      'Step 4: For custom installations: Check your server configuration',
      'Step 5: Enter the port number (usually a number between 1-65535)',
      '',
      'Example:',
      '5432'
    ],
    example: '5432'
  };
}

function generateModelGuide(nodeType: string, fieldLabel: string): FieldGuide {
  return {
    title: `How to select ${fieldLabel}?`,
    steps: [
      'Step 1: Review available models in the dropdown menu',
      'Step 2: Consider your use case:',
      '   • GPT-4o: Most capable, best for complex tasks',
      '   • GPT-4o Mini: Faster and cheaper, good for simple tasks',
      '   • Claude 3.5 Sonnet: Best for analysis and reasoning',
      '   • Gemini 3.5 Flash: Efficient and cost-effective',
      'Step 3: Check model availability in your API plan',
      'Step 4: Consider cost vs. performance trade-offs',
      'Step 5: Select the model from the dropdown',
      '',
      'Note: Model availability depends on your API provider and plan.'
    ]
  };
}

function generatePromptGuide(fieldLabel: string): FieldGuide {
  return {
    title: `How to write ${fieldLabel}?`,
    steps: [
      'Step 1: Define the AI\'s role and behavior clearly',
      'Step 2: Specify the input format and expected output format',
      'Step 3: Include constraints and rules (e.g., "Always return JSON")',
      'Step 4: Add examples if helpful for the AI to understand the task',
      'Step 5: Be specific about what the AI should NOT do',
      'Step 6: Test your prompt with sample inputs',
      'Step 7: Refine based on results',
      '',
      'Tip: Good prompts are clear, specific, and include examples.'
    ]
  };
}

function generateJSONGuide(fieldLabel: string, placeholder?: string): FieldGuide {
  return {
    title: `How to format ${fieldLabel}?`,
    steps: [
      'Step 1: Ensure valid JSON syntax (use double quotes, proper commas)',
      'Step 2: Follow the expected structure shown in the placeholder',
      'Step 3: Use a JSON validator if unsure (jsonlint.com)',
      'Step 4: For arrays: Use square brackets []',
      'Step 5: For objects: Use curly braces {}',
      'Step 6: All keys must be strings (in double quotes)',
      'Step 7: Values can be strings, numbers, booleans, arrays, or objects',
      '',
      'Example:',
      placeholder || '{"key": "value", "number": 123, "array": [1, 2, 3]}'
    ],
    example: placeholder || '{"key": "value", "number": 123, "array": [1, 2, 3]}'
  };
}

function generateCronGuide(fieldLabel: string): FieldGuide {
  return {
    title: `How to create ${fieldLabel}?`,
    url: 'https://crontab.guru',
    steps: [
      'Step 1: Understand cron format: minute hour day month weekday',
      'Step 2: Use https://crontab.guru to build and test cron expressions',
      'Step 3: Common examples:',
      '   • Every minute: * * * * *',
      '   • Every hour: 0 * * * *',
      '   • Daily at 9 AM: 0 9 * * *',
      '   • Weekly on Monday: 0 9 * * 1',
      '   • Monthly on 1st: 0 9 1 * *',
      'Step 4: Test your expression using the crontab.guru website',
      'Step 5: Paste the cron expression into the field',
      '',
      'Example:',
      '0 9 * * * (Daily at 9 AM)'
    ],
    example: '0 9 * * *'
  };
}

function generateTimeGuide(fieldLabel: string): FieldGuide {
  return {
    title: `How to set ${fieldLabel}?`,
    steps: [
      'Step 1: Use 24-hour format (HH:MM)',
      'Step 2: Enter hours (00-23) and minutes (00-59)',
      'Step 3: Examples:',
      '   • 09:00 = 9:00 AM',
      '   • 14:30 = 2:30 PM',
      '   • 23:59 = 11:59 PM',
      'Step 4: Use the time picker or type directly',
      '',
      'Example:',
      '09:00'
    ],
    example: '09:00'
  };
}

function generateTemperatureGuide(): FieldGuide {
  return {
    title: 'How to set Temperature?',
    steps: [
      'Step 1: Understand temperature range: 0.0 to 2.0',
      'Step 2: Lower values (0.0-0.3): More deterministic, focused responses',
      'Step 3: Medium values (0.4-0.7): Balanced creativity and consistency',
      'Step 4: Higher values (0.8-2.0): More creative, varied responses',
      'Step 5: Recommended settings:',
      '   • Summarization/Extraction: 0.3-0.5',
      '   • General tasks: 0.5-0.7',
      '   • Creative writing: 0.7-1.2',
      'Step 6: Start with default (0.5) and adjust based on results',
      '',
      'Example:',
      '0.5'
    ],
    example: '0.5'
  };
}

function generateNumberGuide(fieldLabel: string, placeholder?: string): FieldGuide {
  return {
    title: `How to set ${fieldLabel}?`,
    steps: [
      'Step 1: Enter a numeric value',
      'Step 2: Check the field description for valid range or constraints',
      'Step 3: Use whole numbers (integers) or decimals as appropriate',
      'Step 4: Do not include commas or currency symbols',
      'Step 5: For percentages: Enter as decimal (e.g., 0.5 for 50%)',
      '',
      'Example:',
      placeholder || '100'
    ],
    example: placeholder || '100'
  };
}

function generateTextareaGuide(fieldLabel: string): FieldGuide {
  return {
    title: `How to fill ${fieldLabel}?`,
    steps: [
      'Step 1: Read the field description to understand what\'s expected',
      'Step 2: Enter your text in the textarea',
      'Step 3: You can use multiple lines for better readability',
      'Step 4: Check for any formatting requirements',
      'Step 5: Review your input before saving',
      '',
      'Tip: Use clear, descriptive text that explains your intent.'
    ]
  };
}

function generateFacebookAPIGuide(): FieldGuide {
  return {
    title: 'How to get Facebook API?',
    url: 'https://developers.facebook.com',
    steps: [
      'Step 1: Go to https://developers.facebook.com',
      'Step 2: Sign in with your Facebook account',
      'Step 3: Click "My Apps" in the top right',
      'Step 4: Click "Create App" or select an existing app',
      'Step 5: Choose app type: "Business" or "Other"',
      'Step 6: Fill in app details (name, contact email)',
      'Step 7: Go to "Settings" → "Basic"',
      'Step 8: Copy your "App ID" and "App Secret"',
      'Step 9: Add products you need (Facebook Login, Pages API, etc.)',
      'Step 10: Go to "Tools" → "Graph API Explorer"',
      'Step 11: Select your app and generate an access token',
      'Step 12: For Page access: Select your Page and generate Page Access Token',
      '',
      'Example App ID:',
      '1234567890123456',
      '',
      '⚠️ Keep your App Secret secure. Never expose it publicly.'
    ],
    example: '1234567890123456',
    securityWarning: true
  };
}

function generateInstagramAPIGuide(): FieldGuide {
  return {
    title: 'How to get Instagram API?',
    url: 'https://developers.facebook.com',
    steps: [
      'Step 1: Go to https://developers.facebook.com',
      'Step 2: Sign in with your Facebook account',
      'Step 3: Create or select a Facebook App',
      'Step 4: Add "Instagram Graph API" product to your app',
      'Step 5: Go to "Settings" → "Basic" and note your App ID',
      'Step 6: Connect your Instagram Business Account:',
      '   • Your Instagram account must be a Business or Creator account',
      '   • Link it to a Facebook Page',
      'Step 7: Go to "Tools" → "Graph API Explorer"',
      'Step 8: Select your app and Instagram Business Account',
      'Step 9: Add permissions: instagram_basic, instagram_content_publish',
      'Step 10: Click "Generate Access Token"',
      'Step 11: Copy the access token',
      'Step 12: Get your Instagram Business Account ID:',
      '   • Query: GET /me/accounts → Get your Page ID',
      '   • Query: GET /{page-id}?fields=instagram_business_account',
      '   • Copy the "instagram_business_account.id" value',
      '',
      'Example Access Token:',
      'EAAG...',
      '',
      '⚠️ Keep your access token secure. Never expose it publicly.'
    ],
    example: 'EAAG...',
    securityWarning: true
  };
}

function generateTwitterAPIGuide(): FieldGuide {
  return {
    title: 'How to get Twitter API URL?',
    url: 'https://developer.twitter.com',
    steps: [
      'Step 1: Go to https://developer.twitter.com',
      'Step 2: Sign in with your Twitter/X account',
      'Step 3: Apply for Developer Access (if not already approved)',
      'Step 4: Go to "Developer Portal" → "Projects & Apps"',
      'Step 5: Create a new Project or select existing',
      'Step 6: Create a new App within the project',
      'Step 7: The Twitter API base URLs are:',
      '   • API v2: https://api.twitter.com/2',
      '   • API v1.1: https://api.twitter.com/1.1',
      'Step 8: For most workflows, use API v2: https://api.twitter.com/2',
      'Step 9: Common endpoints:',
      '   • Tweets: /2/tweets',
      '   • Users: /2/users',
      '   • Search: /2/tweets/search/recent',
      'Step 10: Full endpoint format: https://api.twitter.com/2/{endpoint}',
      'Step 11: You need API credentials (API Key, Secret, Access Token)',
      'Step 12: Get credentials from: Developer Portal → Projects & Apps → Keys and tokens',
      '',
      'Example Base URL (v2):',
      'https://api.twitter.com/2',
      '',
      'Example Base URL (v1.1):',
      'https://api.twitter.com/1.1',
      '',
      '⚠️ Keep all credentials secure. Never expose them publicly.'
    ],
    example: 'https://api.twitter.com/2',
    securityWarning: true
  };
}

function generateFacebookPageTokenGuide(): FieldGuide {
  return {
    title: 'How to get Facebook Page Access Token?',
    url: 'https://developers.facebook.com',
    steps: [
      'Step 1: Go to https://developers.facebook.com',
      'Step 2: Sign in with your Facebook account',
      'Step 3: Create or select an App',
      'Step 4: Add "Facebook Login" product to your app',
      'Step 5: Go to "Tools" → "Graph API Explorer"',
      'Step 6: Select your app from the dropdown',
      'Step 7: Select your Page from the "User or Page" dropdown',
      'Step 8: Select required permissions:',
      '   • pages_manage_posts (to create posts)',
      '   • pages_read_engagement (to read engagement)',
      '   • pages_show_list (to list pages)',
      'Step 9: Click "Generate Access Token"',
      'Step 10: Copy the Page Access Token immediately',
      'Step 11: For long-lived tokens:',
      '   • Use the token to exchange for a long-lived token',
      '   • Query: GET /oauth/access_token?grant_type=fb_exchange_token&client_id={app-id}&client_secret={app-secret}&fb_exchange_token={short-lived-token}',
      'Step 12: Paste the token into the input field',
      '',
      'Example Token Format:',
      'EAAG...',
      '',
      '⚠️ Keep your Page Access Token secure. Never expose it publicly.'
    ],
    example: 'EAAG...',
    securityWarning: true
  };
}

function generateFacebookGraphAPIGuide(): FieldGuide {
  return {
    title: 'How to get Facebook Graph API URL?',
    url: 'https://developers.facebook.com/docs/graph-api',
    steps: [
      'Step 1: Go to https://developers.facebook.com/docs/graph-api',
      'Step 2: Read the documentation to understand the API structure',
      'Step 3: The base URL for Facebook Graph API is:',
      '   https://graph.facebook.com',
      'Step 4: Add API version to the URL:',
      '   https://graph.facebook.com/v18.0',
      '   (Replace v18.0 with the latest version number)',
      'Step 5: To find the latest version:',
      '   • Check the documentation header for "Current Version"',
      '   • Or use: https://graph.facebook.com/v18.0 (check docs for latest)',
      'Step 6: For specific endpoints, add the path:',
      '   • Pages: /me/accounts or /{page-id}',
      '   • Posts: /{page-id}/posts',
      '   • User: /me',
      'Step 7: Full endpoint example:',
      '   https://graph.facebook.com/v18.0/me/accounts',
      'Step 8: You need an access token to use the API',
      'Step 9: Get access token:',
      '   • Go to developers.facebook.com',
      '   • Tools → Graph API Explorer',
      '   • Select your app and generate token',
      '',
      'Example Base URL:',
      'https://graph.facebook.com/v18.0',
      '',
      'Example Full Endpoint:',
      'https://graph.facebook.com/v18.0/me/accounts'
    ],
    example: 'https://graph.facebook.com/v18.0'
  };
}

function generateInstagramAPIDocsGuide(): FieldGuide {
  return {
    title: 'How to get Instagram API URL?',
    url: 'https://developers.facebook.com/docs/instagram-api',
    steps: [
      'Step 1: Go to https://developers.facebook.com/docs/instagram-api',
      'Step 2: Instagram uses Facebook Graph API',
      'Step 3: Base URL: https://graph.facebook.com',
      'Step 4: Instagram endpoints use: https://graph.facebook.com/v18.0/{instagram-business-account-id}/...',
      'Step 5: To get your Instagram Business Account ID:',
      '   • Go to Graph API Explorer',
      '   • Query: GET /me/accounts → Get your Page ID',
      '   • Query: GET /{page-id}?fields=instagram_business_account',
      '   • Copy the "instagram_business_account.id"',
      'Step 6: Example endpoint: https://graph.facebook.com/v18.0/{account-id}/media',
      'Step 7: You need an access token with instagram_basic permission',
      'Step 8: Get token from: developers.facebook.com → Tools → Graph API Explorer',
      '',
      'Example Base URL:',
      'https://graph.facebook.com/v18.0',
      '',
      'Example Endpoint:',
      'https://graph.facebook.com/v18.0/{instagram-business-account-id}/media'
    ],
    example: 'https://graph.facebook.com/v18.0'
  };
}

function generateTwitterAPIDocsGuide(): FieldGuide {
  return {
    title: 'How to get Twitter API URL?',
    url: 'https://developer.twitter.com/en/docs',
    steps: [
      'Step 1: Go to https://developer.twitter.com/en/docs',
      'Step 2: Twitter API v2 base URL: https://api.twitter.com/2',
      'Step 3: Twitter API v1.1 base URL: https://api.twitter.com/1.1',
      'Step 4: For most workflows, use API v2: https://api.twitter.com/2',
      'Step 5: Common endpoints:',
      '   • Tweets: /2/tweets',
      '   • Users: /2/users',
      '   • Search: /2/tweets/search/recent',
      'Step 6: Full endpoint format: https://api.twitter.com/2/{endpoint}',
      'Step 7: You need API credentials (API Key, Secret, Access Token)',
      'Step 8: Get credentials from: developer.twitter.com → Developer Portal → Projects & Apps',
      '',
      'Example Base URL (v2):',
      'https://api.twitter.com/2',
      '',
      'Example Endpoint:',
      'https://api.twitter.com/2/tweets'
    ],
    example: 'https://api.twitter.com/2'
  };
}

function generateDocumentationURLGuide(fieldLabel: string, placeholder?: string): FieldGuide {
  // Extract service name from URL if possible
  const url = placeholder || fieldLabel;
  let serviceName = 'the service';
  
  if (url.includes('facebook')) serviceName = 'Facebook';
  else if (url.includes('instagram')) serviceName = 'Instagram';
  else if (url.includes('twitter')) serviceName = 'Twitter';
  else if (url.includes('google')) serviceName = 'Google';
  else if (url.includes('github')) serviceName = 'GitHub';
  else if (url.includes('slack')) serviceName = 'Slack';
  
  return {
    title: `How to get ${fieldLabel}?`,
    url: url.includes('http') ? url : undefined,
    steps: [
      `Step 1: Go to ${url.includes('http') ? url : 'the documentation URL'}`,
      'Step 2: This is the official API documentation',
      'Step 3: Read the documentation to find:',
      '   • Base API URL (usually in "Getting Started" or "Quick Start")',
      '   • Endpoint URLs for specific operations',
      '   • Authentication requirements',
      'Step 4: Look for sections like:',
      '   • "Base URL" or "API Endpoint"',
      '   • "Authentication" or "Getting Started"',
      '   • "Endpoints" or "API Reference"',
      'Step 5: Copy the base URL or specific endpoint URL',
      'Step 6: Note any required parameters or authentication',
      'Step 7: Test the URL in a browser or API client',
      '',
      `Example: Check ${serviceName} documentation for the exact URL format`
    ],
    example: url.includes('http') ? url : undefined
  };
}

function generateContentRepositoryGuide(fieldLabel: string): FieldGuide {
  return {
    title: `How to get ${fieldLabel}?`,
    steps: [
      'Step 1: Choose your content repository service:',
      '   • Google Drive: drive.google.com',
      '   • Dropbox: dropbox.com',
      '   • OneDrive: onedrive.live.com',
      '   • Other cloud storage services',
      '',
      'For Google Drive:',
      'Step 2: Go to https://console.cloud.google.com',
      'Step 3: Create or select a project',
      'Step 4: Enable "Google Drive API"',
      'Step 5: Go to "Credentials" → "Create Credentials"',
      'Step 6: Choose "OAuth client ID" or "Service Account"',
      'Step 7: For OAuth: Configure consent screen and get Client ID/Secret',
      'Step 8: For Service Account: Download JSON key file',
      'Step 9: Copy credentials or upload JSON file',
      '',
      'For Dropbox:',
      'Step 2: Go to https://dropbox.com/developers',
      'Step 3: Sign in and go to "App Console"',
      'Step 4: Click "Create app"',
      'Step 5: Choose app type (Scoped access recommended)',
      'Step 6: Set app name and permissions',
      'Step 7: Go to "Settings" → "OAuth 2"',
      'Step 8: Generate access token or use OAuth flow',
      'Step 9: Copy the access token',
      '',
      'Example (Google Drive Client ID):',
      '123456789-abcdefghijklmnop.apps.googleusercontent.com',
      '',
      '⚠️ Keep credentials secure. Use OAuth for user data access.'
    ],
    example: '123456789-abcdefghijklmnop.apps.googleusercontent.com',
    securityWarning: true
  };
}

function generateGoogleSheetsTabNameGuide(): FieldGuide {
  return {
    title: 'How to get Google Sheets tab (sheet) name?',
    url: 'https://docs.google.com/spreadsheets',
    steps: [
      'Step 1: Open the spreadsheet in Google Sheets in your browser.',
      'Step 2: Look at the bottom of the window — each tab is a separate sheet.',
      'Step 3: The tab label text is the sheet name (e.g. "Sheet1", "Data", "Q1").',
      'Step 4: Double-click the tab if you need to rename it; copy the exact name including spaces and capitalization.',
      'Step 5: Paste that name into this field. If you leave it empty, many workflows use the first tab by default.',
      'Step 6: If your sheet was copied from a template, confirm you are not using a hidden or duplicate tab name.',
    ],
    example: 'Sheet1',
  };
}

function generateOAuthRedirectGuide(kind: 'callback' | 'redirect', fieldLabel: string): FieldGuide {
  const isCallback = kind === 'callback';
  return {
    title: `How to set ${fieldLabel}?`,
    url: 'https://developers.google.com/identity/protocols/oauth2',
    steps: [
      `Step 1: This value is an OAuth ${isCallback ? 'callback' : 'redirect'} URL — it must match exactly what your OAuth client expects.`,
      'Step 2: Open your provider console (e.g. Google Cloud Console → APIs & Services → Credentials, Meta for Developers, GitHub OAuth App settings, or your IdP).',
      `Step 3: Find "${isCallback ? 'Authorized redirect URIs' : 'Redirect URLs'}" or "Callback URL" for your OAuth client.`,
      'Step 4: Add the URL shown by this application (same scheme https/http, host, path, and trailing slash).',
      'Step 5: Save in the provider console, then paste the same URL here if this field stores the registered value.',
      'Step 6: Common errors: http vs https, missing path segment, or extra slash — copy-paste instead of retyping.',
    ],
  };
}

function generateSpreadsheetIDGuide(): FieldGuide {
  return {
    title: 'How to get Google Sheets Spreadsheet ID?',
    url: 'https://docs.google.com/spreadsheets',
    steps: [
      'Step 1: Open your Google Sheet in a web browser while logged into the Google account that owns or can access the file.',
      'Step 2: Look at the URL in the address bar. Format:',
      '   https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/edit',
      'Step 3: Copy SPREADSHEET_ID — the long string between /d/ and the next / (often letters, numbers, and hyphens).',
      'Step 4: Example URL:',
      '   https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit',
      '   ID: 1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms',
      'Step 5: Paste only the ID into this field (not the full URL unless the field label says otherwise).',
      'Step 6: Sharing: the Google account used by your workflow credentials must have at least Viewer (read) or Editor (write) access to the sheet.',
      'Step 7: If you use a Google Cloud service account, open Share in Sheets and add the service account email (from the JSON key) with the required role.',
      'Step 8: For API access, Google Sheets API must be enabled in the same Google Cloud project as your OAuth client or service account.',
      'Step 9: If the ID is correct but access fails, re-check OAuth scopes or service account sharing — not the ID string.',
    ],
    example: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms',
  };
}

function generateWebhookURLGuide(nodeType: string, fieldLabel: string): FieldGuide {
  const serviceGuides: Record<string, FieldGuide> = {
    slack_webhook: {
      title: 'How to get Slack Webhook URL?',
      url: 'https://api.slack.com/apps',
      steps: [
        'Step 1: Go to https://api.slack.com/apps',
        'Step 2: Sign in with your Slack workspace',
        'Step 3: Click "Create New App" or select existing app',
        'Step 4: Choose "From scratch"',
        'Step 5: Enter app name and select workspace',
        'Step 6: Go to "Incoming Webhooks" in left sidebar',
        'Step 7: Toggle "Activate Incoming Webhooks" to ON',
        'Step 8: Click "Add New Webhook to Workspace"',
        'Step 9: Select the channel where messages should be posted',
        'Step 10: Click "Allow"',
        'Step 11: Copy the Webhook URL (starts with https://hooks.slack.com/services/)',
        'Step 12: Paste it into the input field',
        '',
        'Example format:',
        '[YOUR_SLACK_WEBHOOK_URL] - Format: https://hooks.slack.com/services/...',
        '',
        '⚠️ Keep your webhook URL secure. Anyone with this URL can post to your Slack channel.'
      ],
      example: '[YOUR_SLACK_WEBHOOK_URL]',
      securityWarning: true
    },
    discord_webhook: {
      title: 'How to get Discord Webhook URL?',
      url: 'https://discord.com',
      steps: [
        'Step 1: Open Discord app or web',
        'Step 2: Go to your server',
        'Step 3: Right-click on the channel where you want messages',
        'Step 4: Select "Edit Channel" or "Channel Settings"',
        'Step 5: Go to "Integrations" tab',
        'Step 6: Click "Webhooks" → "New Webhook"',
        'Step 7: Give it a name (e.g., "Workflow Bot")',
        'Step 8: Click "Copy Webhook URL"',
        'Step 9: Paste it into the input field',
        '',
        'Example:',
        'https://discord.com/api/webhooks/123456789012345678/abcdefghijklmnopqrstuvwxyz1234567890abcdefghijklmnopqrstuvwxyz',
        '',
        '⚠️ Keep your webhook URL secure. Anyone with this URL can post to your Discord channel.'
      ],
      example: 'https://discord.com/api/webhooks/123456789012345678/abcdefghijklmnopqrstuvwxyz1234567890abcdefghijklmnopqrstuvwxyz1234567890abcdefghijklmnopqrstuvwxyz',
      securityWarning: true
    }
  };

  return serviceGuides[nodeType] || {
    title: `How to get ${fieldLabel}?`,
    steps: [
      'Step 1: Identify where you want to receive webhook data',
      'Step 2: Use your server\'s public URL',
      'Step 3: For production: Use your server\'s public URL',
      'Step 4: The webhook URL format is: https://your-domain.com/webhook/endpoint',
      'Step 5: Copy the complete URL including protocol (http:// or https://)',
      'Step 6: Paste it into the service that will send webhooks to you',
      'Step 7: Test the webhook to verify it\'s working',
      '',
      'Example:',
      'https://api.example.com/webhook/receive',
      '',
      '⚠️ Keep your webhook URL secure.'
    ],
    example: 'https://api.example.com/webhook/receive',
    securityWarning: true
  };
}

function generatePageIDGuide(nodeType: string): FieldGuide {
  if (nodeType === 'facebook') {
    return {
      title: 'How to get Facebook Page ID?',
      url: 'https://developers.facebook.com',
      steps: [
        'Step 1: Go to your Facebook Page',
        'Step 2: Click "About" in the left sidebar',
        'Step 3: Scroll down to find "Page ID"',
        'Step 4: Or use Graph API Explorer:',
        '   • Go to developers.facebook.com → Tools → Graph API Explorer',
        '   • Query: GET /me/accounts',
        '   • Find your page and copy the "id" field',
        'Step 5: Alternative method:',
        '   • View page source (Ctrl+U)',
        '   • Search for "page_id"',
        '   • Copy the numeric ID',
        '',
        'Example:',
        '123456789012345'
      ],
      example: '123456789012345'
    };
  }
  
  return {
    title: 'How to get Page ID?',
    steps: [
      'Step 1: Go to the service\'s dashboard or admin panel',
      'Step 2: Navigate to your page/profile settings',
      'Step 3: Look for "Page ID", "Profile ID", or "Account ID"',
      'Step 4: Copy the ID (usually a numeric string)',
      'Step 5: Paste it into the input field',
      '',
      'Tip: Check the service\'s API documentation for specific instructions.'
    ]
  };
}

function generateAccountIDGuide(nodeType: string): FieldGuide {
  if (nodeType === 'instagram') {
    return {
      title: 'How to get Instagram Business Account ID?',
      url: 'https://developers.facebook.com',
      steps: [
        'Step 1: Go to https://developers.facebook.com',
        'Step 2: Go to Tools → Graph API Explorer',
        'Step 3: Select your app and generate an access token',
        'Step 4: Query: GET /me/accounts',
        'Step 5: Find your Facebook Page and copy the Page ID',
        'Step 6: Query: GET /{page-id}?fields=instagram_business_account',
        'Step 7: Copy the "instagram_business_account.id" value',
        'Step 8: Paste it into the input field',
        '',
        'Example:',
        '17841405309211844',
      ],
      example: '17841405309211844',
    };
  }

  if (nodeType === 'twilio') {
    return {
      title: 'How to get Twilio Account SID?',
      url: 'https://console.twilio.com',
      steps: [
        'Step 1: Go to https://console.twilio.com and sign in',
        'Step 2: Your Account SID is displayed on the dashboard homepage under "Account Info"',
        'Step 3: Click the copy icon next to Account SID',
        'Step 4: Paste it into the Account SID field above',
        '',
        'Format: starts with "AC" followed by 32 hex characters.',
        '',
        'Note: You also need the Auth Token from the same page — see the Auth Token field guide.',
      ],
      example: 'ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
    };
  }

  return {
    title: 'How to get Account ID?',
    steps: [
      'Step 1: Go to the service\'s dashboard or admin panel',
      'Step 2: Navigate to account settings or API settings',
      'Step 3: Look for "Account ID", "User ID", or "Business Account ID"',
      'Step 4: Copy the ID',
      'Step 5: Paste it into the input field',
      '',
      'Tip: Check the service\'s API documentation for specific instructions.',
    ],
  };
}

function generateShopDomainGuide(): FieldGuide {
  return {
    title: 'How to get Shopify Shop Domain?',
    url: 'https://admin.shopify.com',
    steps: [
      'Step 1: Log in to your Shopify Admin panel',
      'Step 2: Go to https://admin.shopify.com',
      'Step 3: Look at the URL in your browser address bar',
      'Step 4: The format is: admin.shopify.com/store/YOUR_SHOP',
      'Step 5: Or go to Settings → General → Store details',
      'Step 6: Find "Store address" or "Primary domain"',
      'Step 7: Copy the domain (e.g., "mystore.myshopify.com")',
      'Step 8: Do NOT include "https://" or "www"',
      'Step 9: Paste it into the input field',
      '',
      'Example:',
      'mystore.myshopify.com'
    ],
    example: 'mystore.myshopify.com'
  };
}

function generateIDGuide(resourceType: string, resourceKey: string): FieldGuide {
  return {
    title: `How to get ${resourceType} ID?`,
    steps: [
      `Step 1: Go to the ${resourceType.toLowerCase()} in your dashboard`,
      `Step 2: Open the ${resourceType.toLowerCase()} details page`,
      `Step 3: Look for "${resourceType} ID" in the URL or details`,
      `Step 4: The ID is usually in the URL format:`,
      `   .../${resourceKey}s/ID or .../${resourceKey}/ID`,
      `Step 5: Copy the ID (numeric or alphanumeric string)`,
      `Step 6: Or get it from API response when creating/listing ${resourceType.toLowerCase()}s`,
      `Step 7: Paste it into the input field`,
      '',
      `Example ${resourceType} ID:`,
      resourceType === 'Product' ? 'gid://shopify/Product/123456789' : '123456789'
    ],
    example: resourceType === 'Product' ? 'gid://shopify/Product/123456789' : '123456789'
  };
}

function generateExpressionGuide(fieldLabel: string): FieldGuide {
  return {
    title: `How to write ${fieldLabel}?`,
    steps: [
      'Step 1: Use template expressions to reference data from previous nodes',
      'Step 2: Format: {{input.fieldName}} or {{$json.fieldName}}',
      'Step 3: Examples:',
      '   • {{input.name}} - Get "name" from input',
      '   • {{input.user.email}} - Get nested field',
      '   • {{$json.items[0].title}} - Get first item title',
      'Step 4: For arrays: {{input.items}}',
      'Step 5: For conditions: Use JavaScript expressions',
      'Step 6: Test your expression to ensure it works',
      '',
      'Example:',
      '{{input.userName}}'
    ],
    example: '{{input.userName}}'
  };
}

function generateConditionGuide(fieldLabel: string): FieldGuide {
  return {
    title: `How to write ${fieldLabel}?`,
    steps: [
      'Step 1: Write a JavaScript expression that returns true or false',
      'Step 2: Use template variables: {{input.fieldName}}',
      'Step 3: Comparison operators: ===, !==, >, <, >=, <=',
      'Step 4: Logical operators: && (AND), || (OR), ! (NOT)',
      'Step 5: Examples:',
      '   • {{input.status}} === "active"',
      '   • {{input.age}} >= 18',
      '   • {{input.count}} > 10 && {{input.enabled}} === true',
      'Step 6: For arrays: item.fieldName (in filter/loop contexts)',
      'Step 7: Test your condition to ensure it works correctly',
      '',
      'Example:',
      '{{input.status}} === "active"'
    ],
    example: '{{input.status}} === "active"'
  };
}

function generateArrayGuide(fieldLabel: string): FieldGuide {
  return {
    title: `How to get ${fieldLabel}?`,
    steps: [
      'Step 1: Use a template expression that returns an array',
      'Step 2: Format: {{input.arrayField}}',
      'Step 3: The expression should reference data from a previous node',
      'Step 4: Examples:',
      '   • {{input.items}} - Get items array',
      '   • {{input.users}} - Get users array',
      'Step 5: Ensure the previous node outputs an array',
      'Step 6: Test to verify the array is correctly formatted',
      '',
      'Example:',
      '{{input.items}}'
    ],
    example: '{{input.items}}'
  };
}

function generateEmailGuide(fieldLabel: string): FieldGuide {
  return {
    title: `How to enter ${fieldLabel}?`,
    steps: [
      'Step 1: Enter a valid email address',
      'Step 2: Format: username@domain.com',
      'Step 3: Examples:',
      '   • john@example.com',
      '   • user.name@company.co.uk',
      '   • test+tag@domain.com',
      'Step 4: Must include @ symbol',
      'Step 5: Domain must have a valid TLD (.com, .org, etc.)',
      'Step 6: No spaces allowed',
      '',
      'Example:',
      'user@example.com'
    ],
    example: 'user@example.com'
  };
}

function generatePhoneGuide(fieldLabel: string): FieldGuide {
  return {
    title: `How to enter ${fieldLabel}?`,
    steps: [
      'Step 1: Enter phone number with country code',
      'Step 2: Format: +[country code][number]',
      'Step 3: Examples:',
      '   • +1234567890 (US)',
      '   • +441234567890 (UK)',
      '   • +911234567890 (India)',
      'Step 4: Include + prefix for international format',
      'Step 5: No spaces, dashes, or parentheses needed',
      'Step 6: Country code is required for international numbers',
      '',
      'Example:',
      '+1234567890'
    ],
    example: '+1234567890'
  };
}

function generateNameGuide(fieldLabel: string): FieldGuide {
  return {
    title: `How to enter ${fieldLabel}?`,
    steps: [
      'Step 1: Enter the name as it should appear',
      'Step 2: Can be a person name, company name, or identifier',
      'Step 3: Examples:',
      '   • John Doe',
      '   • Acme Corporation',
      '   • Product Name',
      'Step 4: Use proper capitalization',
      'Step 5: Avoid special characters unless required',
      '',
      'Example:',
      'John Doe'
    ],
    example: 'John Doe'
  };
}

function generateTitleGuide(fieldLabel: string): FieldGuide {
  return {
    title: `How to enter ${fieldLabel}?`,
    steps: [
      'Step 1: Enter a clear, descriptive title',
      'Step 2: Keep it concise (typically 50-100 characters)',
      'Step 3: Use title case or sentence case',
      'Step 4: Examples:',
      '   • "New Product Launch"',
      '   • "Customer Support Request"',
      '   • "Monthly Report - January 2024"',
      'Step 5: Make it specific and meaningful',
      '',
      'Example:',
      'New Product Launch'
    ],
    example: 'New Product Launch'
  };
}

function generateDescriptionGuide(fieldLabel: string): FieldGuide {
  return {
    title: `How to write ${fieldLabel}?`,
    steps: [
      'Step 1: Write a clear description',
      'Step 2: Explain what this item is or what it does',
      'Step 3: Include relevant details',
      'Step 4: Keep it concise but informative',
      'Step 5: Use proper grammar and punctuation',
      'Step 6: Examples:',
      '   • "This workflow processes customer orders"',
      '   • "Automated email notification system"',
      '',
      'Example:',
      'This workflow processes customer orders and sends confirmation emails.'
    ],
    example: 'This workflow processes customer orders and sends confirmation emails.'
  };
}

function generateMessageGuide(fieldLabel: string): FieldGuide {
  return {
    title: `How to write ${fieldLabel}?`,
    steps: [
      'Step 1: Write your message content',
      'Step 2: Use clear, professional language',
      'Step 3: Include all necessary information',
      'Step 4: You can use template variables: {{input.fieldName}}',
      'Step 5: Examples:',
      '   • Plain text: "Hello, thank you for your order!"',
      '   • With variables: "Hello {{input.name}}, your order #{{input.orderId}} is ready."',
      'Step 6: For multi-line messages, use line breaks',
      '',
      'Example:',
      'Hello {{input.name}},\n\nThank you for your order!'
    ],
    example: 'Hello {{input.name}},\n\nThank you for your order!'
  };
}

function generateSlackWebhookGuide(): FieldGuide {
  return {
    title: 'How to get Slack Webhook URL?',
    url: 'https://api.slack.com/apps',
    steps: [
      'Step 1: Go to https://api.slack.com/apps',
      'Step 2: Sign in with your Slack workspace',
      'Step 3: Click "Create New App" or select an existing app',
      'Step 4: Choose "From scratch"',
      'Step 5: Enter app name and select workspace',
      'Step 6: Go to "Incoming Webhooks" in left sidebar',
      'Step 7: Toggle "Activate Incoming Webhooks" to ON',
      'Step 8: Click "Add New Webhook to Workspace"',
      'Step 9: Select the channel where messages should be posted',
      'Step 10: Click "Allow"',
      'Step 11: Copy the Webhook URL (starts with https://hooks.slack.com/services/)',
      'Step 12: Paste it into the input field',
      '',
      'Example format:',
      'https://hooks.slack.com/services/YOUR-WORKSPACE-ID/YOUR-CHANNEL-ID/YOUR-WEBHOOK-TOKEN',
      '',
      '⚠️ Keep your webhook URL secure. Anyone with this URL can post to your Slack channel.'
    ],
    example: 'https://hooks.slack.com/services/YOUR-WORKSPACE-ID/YOUR-CHANNEL-ID/YOUR-WEBHOOK-TOKEN',
    securityWarning: true
  };
}

function generateGoogleOAuthClientIDGuide(): FieldGuide {
  return {
    title: 'How to get Google OAuth Client ID?',
    url: 'https://console.cloud.google.com',
    steps: [
      'Step 1: Go to https://console.cloud.google.com',
      'Step 2: Sign in with your Google account',
      'Step 3: Create a new project or select an existing project',
      'Step 4: Click "APIs & Services" → "Credentials"',
      'Step 5: Click "Create Credentials" → "OAuth client ID"',
      'Step 6: If prompted, configure the OAuth consent screen:',
      '   • Choose "External" (unless you have Google Workspace)',
      '   • Fill in app name, user support email, developer contact',
      '   • Add scopes (e.g., https://www.googleapis.com/auth/spreadsheets)',
      '   • Add test users if needed',
      'Step 7: Back in Credentials, select "Web application" as application type',
      'Step 8: Enter a name for your OAuth client',
      'Step 9: Add authorized redirect URIs (if needed for your workflow)',
      'Step 10: Click "Create"',
      'Step 11: Copy the "Client ID" (long string ending in .apps.googleusercontent.com)',
      'Step 12: Paste it into the input field',
      '',
      'Example format:',
      '123456789-abcdefghijklmnopqrstuvwxyz123456.apps.googleusercontent.com',
      '',
      '⚠️ Keep your Client ID and Secret secure. Do not expose them publicly.'
    ],
    example: '123456789-abcdefghijklmnopqrstuvwxyz123456.apps.googleusercontent.com',
    securityWarning: true
  };
}

function generateGoogleOAuthSecretGuide(): FieldGuide {
  return {
    title: 'How to get Google OAuth Client Secret?',
    url: 'https://console.cloud.google.com',
    steps: [
      'Step 1: Go to https://console.cloud.google.com',
      'Step 2: Sign in with your Google account',
      'Step 3: Select your project',
      'Step 4: Click "APIs & Services" → "Credentials"',
      'Step 5: Find your OAuth 2.0 Client ID in the list',
      'Step 6: Click on the Client ID name to open details',
      'Step 7: Look for "Client secret" section',
      'Step 8: If secret is hidden, click "Show" or "Reveal"',
      'Step 9: Copy the Client Secret (long random string)',
      'Step 10: Paste it into the input field',
      '',
      'Note: If you don\'t see a secret, you may need to create a new OAuth client.',
      'The secret is only shown once when created - save it securely!',
      '',
      'Example format:',
      'GOCSPX-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
      '',
      '⚠️ Keep your Client Secret secure. Never expose it publicly or commit it to version control.'
    ],
    example: 'GOCSPX-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
    securityWarning: true
  };
}

function generateSMTPHostGuide(): FieldGuide {
  return {
    title: 'How to get SMTP Host?',
    steps: [
      'Step 1: Identify your email service provider',
      'Step 2: Common SMTP host addresses:',
      '   • Gmail: smtp.gmail.com',
      '   • Outlook/Hotmail: smtp-mail.outlook.com',
      '   • Yahoo: smtp.mail.yahoo.com',
      '   • Custom domain: Check with your email provider',
      'Step 3: For Gmail:',
      '   • Host: smtp.gmail.com',
      '   • Port: 587 (TLS) or 465 (SSL)',
      'Step 4: For Outlook:',
      '   • Host: smtp-mail.outlook.com',
      '   • Port: 587',
      'Step 5: For custom email (cPanel, etc.):',
      '   • Check your hosting provider\'s documentation',
      '   • Usually: mail.yourdomain.com or smtp.yourdomain.com',
      'Step 6: Enter the SMTP host address (without port number)',
      '',
      'Example:',
      'smtp.gmail.com'
    ],
    example: 'smtp.gmail.com'
  };
}

function generateSMTPUsernameGuide(): FieldGuide {
  return {
    title: 'How to get SMTP Username?',
    steps: [
      'Step 1: Use your full email address as the username',
      'Step 2: For Gmail:',
      '   • Username: your-email@gmail.com',
      '   • Or use App Password if 2FA is enabled',
      'Step 3: For Outlook/Hotmail:',
      '   • Username: your-email@outlook.com',
      'Step 4: For custom email:',
      '   • Username: your-email@yourdomain.com',
      '   • Or just the part before @ (check with your provider)',
      'Step 5: If using App Password (Gmail with 2FA):',
      '   • Go to Google Account → Security → 2-Step Verification',
      '   • Generate App Password',
      '   • Use the generated password as username (or email)',
      'Step 6: Enter your email address into the input field',
      '',
      'Example:',
      'your-email@gmail.com'
    ],
    example: 'your-email@gmail.com'
  };
}

function generateSMTPPasswordGuide(): FieldGuide {
  return {
    title: 'How to get SMTP Password?',
    steps: [
      'Step 1: For Gmail:',
      '   • If 2FA is enabled: Generate App Password',
      '   • Go to Google Account → Security → 2-Step Verification',
      '   • Click "App passwords"',
      '   • Select "Mail" and "Other (Custom name)"',
      '   • Enter "Workflow" as name',
      '   • Copy the 16-character password',
      '   • If 2FA is NOT enabled: Use your regular Gmail password',
      'Step 2: For Outlook/Hotmail:',
      '   • Use your Microsoft account password',
      '   • Or use App Password if 2FA is enabled',
      'Step 3: For custom email:',
      '   • Use your email account password',
      '   • Check with your hosting provider for specific requirements',
      'Step 4: Enter the password into the input field',
      '',
      '⚠️ Security Note:',
      '• Never share your password',
      '• Use App Passwords when 2FA is enabled',
      '• Store passwords securely (use environment variables)',
      '',
      'Example (Gmail App Password):',
      'abcd efgh ijkl mnop'
    ],
    example: 'abcd efgh ijkl mnop',
    securityWarning: true
  };
}

function generateSMTPGuide(): FieldGuide {
  return {
    title: 'How to configure SMTP?',
    steps: [
      'Step 1: Identify your email service provider',
      'Step 2: Get SMTP settings from your provider:',
      '   • SMTP Host (e.g., smtp.gmail.com)',
      '   • SMTP Port (usually 587 for TLS or 465 for SSL)',
      '   • Username (your email address)',
      '   • Password (your email password or App Password)',
      'Step 3: For Gmail:',
      '   • Host: smtp.gmail.com',
      '   • Port: 587',
      '   • Username: your-email@gmail.com',
      '   • Password: App Password (if 2FA enabled)',
      'Step 4: For Outlook:',
      '   • Host: smtp-mail.outlook.com',
      '   • Port: 587',
      '   • Username: your-email@outlook.com',
      '   • Password: Your Microsoft account password',
      'Step 5: Test the connection to verify settings are correct',
      '',
      '⚠️ Keep your SMTP credentials secure. Use environment variables in production.'
    ],
    securityWarning: true
  };
}

function generateGenericGuide(fieldLabel: string, fieldType: string): FieldGuide {
  // ✅ PRODUCTION: Null-safe string operations
  const normalizedLabel = fieldLabel?.toLowerCase?.() ?? "";
  const normalizedType = fieldType?.toLowerCase?.() ?? "";
  const lowerLabel = normalizedLabel;
  
  // Try to detect service from fieldLabel
  if (lowerLabel.includes('google sheets') || lowerLabel.includes('sheets')) {
    return {
      title: 'How to get Google Sheets API?',
      url: 'https://console.cloud.google.com',
      steps: [
        'Step 1: Go to https://console.cloud.google.com',
        'Step 2: Sign in with your Google account',
        'Step 3: Create a new project or select an existing project',
        'Step 4: Click "APIs & Services" → "Library"',
        'Step 5: Search for "Google Sheets API" and click "Enable"',
        'Step 6: Go to "APIs & Services" → "Credentials"',
        'Step 7: Click "Create Credentials" → "API Key"',
        'Step 8: Copy the API key and paste it into the input field',
        '',
        'Example format:',
        'AIzaSyDxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
        '',
        '⚠️ Keep your API key secure. Restrict it to specific APIs for security.'
      ],
      example: 'AIzaSyDxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
      securityWarning: true
    };
  }
  
  // Check for Slack (general, not webhook)
  if (lowerLabel.includes('slack') && !lowerLabel.includes('webhook')) {
    // If it's a token field, use the detailed Bot Token guide
    // ✅ PRODUCTION: Use lowerLabel only (lowerKey not available in this function)
    if (lowerLabel.includes('token')) {
      return {
        title: 'How to get Slack Bot Token?',
        url: 'https://api.slack.com/apps',
        steps: [
          'Step 1: Go to https://api.slack.com/apps',
          'Step 2: Sign in with your Slack workspace account',
          'Step 3: Click "Create New App" button (or select an existing app)',
          'Step 4: Choose "From scratch" option',
          'Step 5: Enter an app name (e.g., "Workflow Bot") and select your workspace',
          'Step 6: Click "Create App"',
          'Step 7: In the left sidebar, click "OAuth & Permissions"',
          'Step 8: Scroll down to "Scopes" section → "Bot Token Scopes"',
          'Step 9: Click "Add an OAuth Scope" and add required scopes:',
          '   • chat:write (to send messages)',
          '   • channels:read (to read channel info)',
          '   • channels:history (to read message history, if needed)',
          'Step 10: Scroll up to the top of the page',
          'Step 11: Click "Install to Workspace" button',
          'Step 12: Review permissions and click "Allow" to authorize',
          'Step 13: After installation, you\'ll see "Bot User OAuth Token"',
          'Step 14: Click "Copy" next to the token (starts with xoxb-)',
          'Step 15: Paste the token into the input field above',
          '',
          'Token format:',
          'xoxb-XXXXXXXXXX-XXXXXXXXXXXXX-XXXXXXXXXXXXXXXXXXXXXXXX',
          '',
          '⚠️ Security Warning:',
          '• Keep your Bot Token secret - never share it publicly',
          '• If exposed, regenerate it immediately in Slack app settings',
          '• Use environment variables for production workflows'
        ],
        example: 'xoxb-XXXXXXXXXX-XXXXXXXXXXXXX-XXXXXXXXXXXXXXXXXXXXXXXX',
        securityWarning: true
      };
    }
    // Otherwise use general Slack API guide
    return {
      title: 'How to get Slack API?',
      url: 'https://api.slack.com/apps',
      steps: [
        'Step 1: Go to https://api.slack.com/apps',
        'Step 2: Sign in with your Slack workspace',
        'Step 3: Click "Create New App" or select an existing app',
        'Step 4: Choose "From scratch" and enter app details',
        'Step 5: Go to "OAuth & Permissions" in left sidebar',
        'Step 6: Add required Bot Token Scopes (e.g., chat:write, channels:read)',
        'Step 7: Click "Install to Workspace" and authorize',
        'Step 8: Copy the "Bot User OAuth Token" (starts with xoxb-)',
        'Step 9: Paste it into the input field',
        '',
        'Example format:',
        'xoxb-YOUR-BOT-TOKEN-HERE',
        '',
        '⚠️ Keep your Bot Token secure. Never expose it publicly.'
      ],
      example: 'xoxb-YOUR-BOT-TOKEN-HERE',
      securityWarning: true
    };
  }
  
  return {
    title: `How to get ${fieldLabel}?`,
    steps: [
      'Step 1: Identify the service or platform you need credentials from',
      'Step 2: Go to the service\'s official developer portal or dashboard',
      'Step 3: Sign in with your account or create a new account',
      'Step 4: Navigate to "API Keys", "Credentials", or "Developer Settings"',
      'Step 5: Create a new API key, token, or credential',
      'Step 6: Give it a descriptive name (e.g., "Workflow Integration")',
      'Step 7: Select the required permissions or scopes',
      'Step 8: Copy the credential immediately - it may only be shown once',
      'Step 9: Paste it into the input field above',
      'Step 10: Test the connection to verify it works',
      '',
      `Field Type: ${fieldType}`,
      '',
      '💡 Tip: Check the service\'s official documentation for specific setup instructions.'
    ]
  };
}

