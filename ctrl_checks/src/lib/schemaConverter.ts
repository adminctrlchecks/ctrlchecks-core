/**
 * Schema Converter
 * 
 * Converts backend NodeDefinition inputSchema to frontend ConfigField format.
 * This bridges the gap between backend schema format and frontend UI requirements.
 * 
 * WORLD-CLASS: Intelligent field type detection
 * - Automatically converts dropdown-worthy fields (model, provider, operation, etc.) to select dropdowns
 * - Converts examples to dropdown options when appropriate
 * - Preserves text inputs for user-provided fields (URLs, API keys, prompts, etc.)
 */

import { InputFieldSchema, NodeDefinition } from '@/services/nodeSchemaService';
import { ConfigField } from '@/components/workflow/nodeTypes';

/**
 * Generate friendly label from value
 * Converts technical values to readable labels for dropdowns
 */
function generateFriendlyLabel(value: string, fieldKey: string): string {
  const keyLower = fieldKey.toLowerCase();
  
  // Model names - keep as-is but format nicely
  if (keyLower.includes('model')) {
    if (value.includes(':')) {
      const [name, variant] = value.split(':');
      const formattedName = name
        .replace(/([a-z])([A-Z])/g, '$1 $2')
        .replace(/\d+/g, (match) => ` ${match}`)
        .trim();
      const formattedVariant = variant
        .replace(/_/g, ' ')
        .replace(/\bq(\d+)\b/gi, 'Q$1')
        .trim();
      return `${formattedName} (${formattedVariant})`;
    }
    return value.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
  }
  
  if (keyLower.includes('provider')) {
    const providerMap: Record<string, string> = {
      'ollama': 'Ollama (Local)',
      'openai': 'OpenAI',
      'anthropic': 'Anthropic Claude',
      'claude': 'Anthropic Claude',
      'gemini': 'Google Gemini',
      'azure': 'Azure OpenAI',
    };
    return providerMap[value.toLowerCase()] || value.charAt(0).toUpperCase() + value.slice(1);
  }
  
  if (keyLower.includes('operation') || keyLower.includes('action')) {
    return value.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
  }
  
  if (keyLower.includes('method')) return value.toUpperCase();
  
  if (keyLower.includes('format') || keyLower.includes('type')) {
    return value.charAt(0).toUpperCase() + value.slice(1);
  }
  
  if (keyLower.includes('level') || keyLower.includes('severity') || keyLower.includes('priority')) {
    return value.charAt(0).toUpperCase() + value.slice(1);
  }
  
  return value.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
}

/**
 * Detect the right widget for 'object' typed fields.
 * Defaults to 'keyValue' for all plain objects — much friendlier than a raw JSON textarea.
 */
function detectObjectWidget(
  fieldKey: string,
  _fieldSchema: InputFieldSchema,
  nodeType?: string
): ConfigField['type'] {
  if (nodeType === 'hubspot' && fieldKey === 'properties') {
    return 'hubspotProperties';
  }

  // MongoDB filter/document/update values routinely need nested operators
  // ($set, $gte, etc.) that a flat key-value editor can't express — a
  // key-value widget would silently drop the operator wrapper.
  if (nodeType === 'mongodb' && ['filter', 'document', 'update'].includes(fieldKey)) {
    return 'json';
  }

  // Everything that's a plain object becomes a key-value editor
  return 'keyValue';
}

/**
 * Detect the right widget for 'array' typed fields based on naming conventions.
 */
function detectArrayWidget(
  fieldKey: string,
  fieldSchema: InputFieldSchema,
  nodeType?: string
): ConfigField['type'] {
  const k = fieldKey.toLowerCase();
  const desc = (fieldSchema.description || '').toLowerCase();

  if (nodeType === 'hubspot' && k === 'records') {
    return 'hubspotRecords';
  }

  // Condition arrays → ConditionBuilder
  if (k.includes('condition') || k.includes('rule') || k.includes('filter')) {
    return 'conditionList';
  }

  // Switch/routing case arrays → CaseListEditor
  if (k.includes('case') || k.includes('route') || k.includes('branch')) {
    return 'caseList';
  }

  // Variable/field-assignment arrays → VariableListEditor
  if (
    k.includes('variable') ||
    k === 'values' ||
    k === 'fields' ||
    k === 'assignments' ||
    k === 'mappings' ||
    desc.includes('key-value') ||
    desc.includes('name') && desc.includes('value')
  ) {
    // Form node's 'fields' array stays as formFieldList
    if (k === 'fields' && nodeType === 'form') return 'formFieldList';
    return 'variableList';
  }

  // Generic arrays stay as raw JSON (edge cases like items, tags, etc.)
  return 'json';
}

function guideText(parts: Array<string | null | undefined>): string {
  return parts.filter(Boolean).join('\n');
}

function dynamicTip(fieldKey: string, frontendType: ConfigField['type']): string | null {
  if (frontendType === 'boolean' || frontendType === 'select') return null;
  return `Tip: To use data from an earlier node, type {{$json.${fieldKey}}} or choose the value from the field picker.`;
}

function deriveInputHelpText(fieldKey: string, fieldSchema: InputFieldSchema, frontendType: ConfigField['type'], nodeType?: string): string {
  const lower = fieldKey.toLowerCase();
  const label = fieldKey
    .replace(/_/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\b\w/g, (c) => c.toUpperCase());
  const plainLabel = label.toLowerCase();
  const description = fieldSchema.description || `${label} for this node.`;
  if (lower === 'operation' || lower === 'resource') {
    return '';
  }
  if (nodeType === 'hubspot' && lower === 'properties') {
    return guideText([
      'What this field is: HubSpot properties are the fields sent when creating or updating a HubSpot record.',
      'Where to find property names: In HubSpot, open Settings -> Properties, choose the object type, and copy the internal property name.',
      'Contact example: {"email":"alice@example.com","firstname":"Alice","lastname":"Kumar","phone":"+919876543210"}',
      'Deal example: {"dealname":"Website redesign","amount":"25000","pipeline":"default","dealstage":"appointmentscheduled"}',
      'Common mistake: Use HubSpot internal names such as firstname, not only the visible label such as First name.',
    ]);
  }
  if ((nodeType === 'whatsapp' || nodeType === 'whatsapp_cloud') && lower === 'contacts') {
    return guideText([
      'What this field is: Contact data that WhatsApp sends as a contact card.',
      'How to fill it: Provide a JSON array of contact objects with name and phone information.',
      'Example: [{"name":{"formatted_name":"Alice Kumar","first_name":"Alice"},"phones":[{"phone":"+919876543210","type":"MOBILE"}]}]',
      'What the user sees: The recipient receives a WhatsApp contact card they can save on their phone.',
    ]);
  }
  if (lower.includes('spreadsheetid') || lower.includes('sheetid')) {
    return guideText([
      'What this field is: This is the unique ID of the Google Sheet file.',
      'Where to find it: Open the Google Sheet and copy the long text between /d/ and /edit in the browser URL.',
      'Format: https://docs.google.com/spreadsheets/d/{SHEET_ID}/edit',
      'Example: 1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms',
    ]);
  }
  if (lower.includes('url') || lower.includes('endpoint') || lower.includes('webhook')) {
    return guideText([
      `What this field is: ${description}`,
      'How to fill it: Paste the full web address, starting with https:// whenever possible.',
      'Example: https://api.example.com/customers',
      dynamicTip(fieldKey, frontendType),
    ]);
  }
  if (lower.includes('email') || lower.includes('recipient') || lower === 'to') {
    return guideText([
      `What this field is: The email address that this node should use for ${plainLabel}.`,
      'How to fill it: Type one email address, or multiple addresses separated by commas if the field supports several recipients.',
      'Example: alice@example.com',
      'Dynamic example: {{$json.email}} uses the email value from an earlier node.',
    ]);
  }
  if (lower.includes('channel')) {
    return guideText([
      'What this field is: The Slack channel or conversation where the message should go.',
      'Where to find it: Open Slack, choose the channel, and use its name with #, or copy the channel ID from channel details.',
      'Example: #alerts or C01234567',
    ]);
  }
  if (lower.includes('token') || lower.includes('apikey') || lower.includes('api_key') || lower.includes('secret')) {
    return guideText([
      `What this field is: A private key or token that lets CtrlChecks access ${label.replace(/Api/gi, 'API')}.`,
      'Where to get it: Open the service dashboard, go to API Keys, Developers, or Settings, then create or copy a secret key.',
      'Important: Keep this value private. Do not paste it into normal text fields unless the node specifically asks for it.',
      'Example format: sk_live_..., xoxb-..., or token_...',
    ]);
  }
  if (lower.includes('query') || lower.includes('filter')) {
    return guideText([
      `What this field is: ${description}`,
      'How to fill it: Enter the search, filter, SQL, or API query that tells the service which records to return.',
      'Leave it blank only when you really want all available records and the node allows it.',
      'Example: status = active or from:billing@example.com',
      dynamicTip(fieldKey, frontendType),
    ]);
  }
  if (lower.includes('body') || lower.includes('text') || lower.includes('message') ||
      lower.includes('content') || lower === 'prompt' || frontendType === 'textarea') {
    return guideText([
      `What this field is: ${description}`,
      'How to fill it: Type the message, prompt, or content you want this node to send or process.',
      'Example: Hello {{$json.name}}, your report is ready.',
      'Tip: Anything inside {{ }} can come from an earlier workflow step.',
    ]);
  }
  if (lower.endsWith('id') || lower.includes('id')) {
    return guideText([
      `What this field is: ${description}`,
      'Where to find it: Open the item in the service dashboard and copy its ID from the URL, details page, or API response.',
      'Example: abc123, cus_123, msg_123, or C01234567',
      dynamicTip(fieldKey, frontendType),
    ]);
  }
  if (frontendType === 'json' || frontendType === 'keyValue') {
    return guideText([
      `What this field is: ${description}`,
      'How to fill it: Enter valid JSON or key-value pairs. Use { } for one object, or [ ] for a list.',
      'Example object: {"name":"Alice","email":"alice@example.com"}',
      'Example list: [{"name":"Alice"},{"name":"Bob"}]',
      dynamicTip(fieldKey, frontendType),
    ]);
  }
  if (frontendType === 'select') {
    return guideText([
      `What this field is: A list of allowed choices for ${plainLabel}.`,
      'How to fill it: Pick one option from the dropdown. Do not type a custom value unless the UI allows it.',
      'Example: Choose "public" for a public post, or "private" for a private item.',
    ]);
  }
  if (frontendType === 'boolean') {
    return guideText([
      `What this field is: An on/off choice for ${plainLabel}.`,
      'How to fill it: Turn it on for Yes/True, or off for No/False.',
      'Example: Turn Retry On Fail on when you want CtrlChecks to try again after a temporary error.',
    ]);
  }
  return guideText([
    `What this field is: ${description}`,
    `How to fill it: Enter the ${plainLabel} value requested by the service or by the previous workflow step.`,
    dynamicTip(fieldKey, frontendType),
  ]);
}

/**
 * Convert backend InputFieldSchema to frontend ConfigField
 */
export function convertSchemaToConfigField(
  fieldKey: string,
  fieldSchema: InputFieldSchema,
  requiredInputs: string[],
  nodeType?: string
): ConfigField {
  const isRequired = requiredInputs.includes(fieldKey);

  let frontendType: ConfigField['type'] = 'text';
  switch (fieldSchema.type) {
    case 'string':
      if (
        fieldSchema.description.toLowerCase().includes('cron') ||
        fieldSchema.description.toLowerCase().includes('schedule')
      ) {
        frontendType = 'cron';
      } else {
        frontendType = 'text';
      }
      break;
    case 'number':
      frontendType = 'number';
      break;
    case 'boolean':
      frontendType = 'boolean';
      break;
    case 'object':
      frontendType = detectObjectWidget(fieldKey, fieldSchema, nodeType);
      break;
    case 'array':
      frontendType = detectArrayWidget(fieldKey, fieldSchema, nodeType);
      break;
    case 'json':
      frontendType = 'json';
      break;
    default:
      frontendType = 'text';
  }

  const keyLower = fieldKey.toLowerCase();

  const isUserProvidedTextField =
    keyLower.includes('url') ||
    keyLower.includes('endpoint') ||
    (keyLower.includes('api') &&
      (keyLower.includes('key') || keyLower.includes('token') || keyLower.includes('secret'))) ||
    keyLower.includes('spreadsheet') ||
    (keyLower.includes('table') && keyLower.includes('name')) ||
    (keyLower.includes('file') && keyLower.includes('name')) ||
    (keyLower.includes('database') && keyLower.includes('name')) ||
    (keyLower.includes('sheet') && keyLower.includes('id')) ||
    (keyLower.includes('id') && !keyLower.includes('credential') && !keyLower.includes('model')) ||
    keyLower.includes('secret') ||
    keyLower.includes('password') ||
    keyLower.includes('token') ||
    keyLower.includes('auth') ||
    keyLower.includes('prompt') ||
    keyLower.includes('message') ||
    keyLower.includes('body') ||
    keyLower.includes('content') ||
    (keyLower.includes('text') && !keyLower.includes('format'));

  const isDropdownWorthyField =
    keyLower.includes('model') ||
    keyLower.includes('provider') ||
    keyLower.includes('operation') ||
    keyLower.includes('resource') ||
    keyLower.includes('action') ||
    keyLower.includes('method') ||
    keyLower.includes('mode') ||
    (keyLower.includes('type') && !keyLower.includes('input') && !keyLower.includes('output')) ||
    keyLower.includes('format') ||
    keyLower.includes('level') ||
    keyLower.includes('severity') ||
    keyLower.includes('priority') ||
    keyLower.includes('channel') ||
    keyLower.includes('granularity') ||
    keyLower.includes('framework') ||
    keyLower.includes('strategy') ||
    keyLower.includes('rule') ||
    keyLower.includes('audience') ||
    keyLower.includes('direction') ||
    keyLower.includes('approvaltype') ||
    keyLower.includes('defaultaction') ||
    keyLower.includes('responseformat') ||
    (keyLower.includes('task') && keyLower.includes('type'));

  let options: { label: string; value: string }[] | undefined = undefined;

  if (isUserProvidedTextField) {
    frontendType = 'text';
  } else if (fieldSchema.ui?.options && fieldSchema.ui.options.length > 0) {
    frontendType = 'select';
    options = fieldSchema.ui.options;
  } else if (
    isDropdownWorthyField &&
    fieldSchema.examples &&
    Array.isArray(fieldSchema.examples) &&
    fieldSchema.examples.length > 0
  ) {
    const validExamples = fieldSchema.examples.filter((ex: any) => {
      if (typeof ex === 'string') {
        if (ex.includes('{{') || ex.includes('$json') || ex.includes('$node')) return false;
        if (ex.startsWith('http://') || ex.startsWith('https://')) return false;
        return true;
      }
      return typeof ex === 'number' || typeof ex === 'boolean';
    });

    if (validExamples.length >= 2 && validExamples.length <= 50) {
      frontendType = 'select';
      const uniqueValues = Array.from(new Set(validExamples.map((ex: any) => String(ex))));
      options = uniqueValues.map((value) => ({
        label: generateFriendlyLabel(value, fieldKey),
        value,
      }));
    } else if (validExamples.length === 1) {
      const value = String(validExamples[0]);
      frontendType = 'select';
      options = [{ label: generateFriendlyLabel(value, fieldKey), value }];
    }
  }

  if (fieldSchema.type === 'boolean' && !isUserProvidedTextField) {
    frontendType = 'boolean';
  }

  if (fieldSchema.ui?.widget === 'multi_email') {
    frontendType = 'textarea';
  }

  if (fieldSchema.ui?.widget === 'textarea') {
    frontendType = 'textarea';
  }

  if (fieldSchema.ui?.widget === 'date') {
    frontendType = 'date';
  }

  if (nodeType === 'mysql' && fieldKey === 'query') {
    frontendType = 'mysqlQueryEditor';
  }

  if (nodeType === 'mongodb' && fieldKey === 'collection') {
    frontendType = 'mongoCollectionSelect';
  }

  if (nodeType === 'firebase' && fieldKey === 'collection') {
    frontendType = 'firebaseCollectionSelect';
  }

  if (nodeType === 'firebase' && ['documentId', 'data', 'filter'].includes(fieldKey)) {
    frontendType = 'firebaseDocumentSelect';
  }

  if (nodeType === 'db' && fieldKey === 'table') {
    frontendType = 'supabaseTableSelect';
  }

  if (nodeType === 'postgresql' && fieldKey === 'query') {
    frontendType = 'postgresQueryEditor';
  }

  let friendlyLabel =
    fieldKey.charAt(0).toUpperCase() + fieldKey.slice(1).replace(/([A-Z])/g, ' $1').trim();
  if (nodeType === 'google_tasks' && fieldKey === 'due') {
    friendlyLabel = 'Due Date';
  }
  if (nodeType === 'google_gmail') {
    const gmailLabels: Record<string, string> = {
      spreadsheetId: 'Spreadsheet ID (fallback)',
      sheetName: 'Sheet name',
      range: 'Range (optional)',
      useAiRecipientMapping: 'Scan all cells for emails',
    };
    if (gmailLabels[fieldKey]) friendlyLabel = gmailLabels[fieldKey];
  }

  // Use short, actionable placeholders instead of the full description text.
  // The full description is already shown above the field as helpText.
  // Showing it again as placeholder makes the field look pre-filled when it is empty.
  const shortPlaceholderMap: Record<string, string> = {
    recipientEmails: 'e.g. alice@example.com, bob@example.com',
    spreadsheetId: 'e.g. 1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms',
    sheetName: 'e.g. Sheet1',
    range: 'e.g. A2:D100 (optional)',
    subject: 'e.g. Hello from the workflow',
    body: 'e.g. Hi, your message here...',
    query: 'e.g. from:example@gmail.com',
    messageId: 'e.g. abc123def456',
    from: 'e.g. your-email@gmail.com (optional)',
    due: 'YYYY-MM-DD',
  };
  const firstExample =
    fieldSchema.examples && Array.isArray(fieldSchema.examples) && fieldSchema.examples.length > 0
      ? String(fieldSchema.examples[0])
      : undefined;
  const placeholderText =
    frontendType === 'select'
      ? `Select ${friendlyLabel}`
      : frontendType === 'date'
      ? shortPlaceholderMap[fieldKey] || 'YYYY-MM-DD'
      : shortPlaceholderMap[fieldKey] || (firstExample ? `e.g. ${firstExample}` : undefined);

  // Determine add-button label for list widgets
  const addButtonLabel: string | undefined = (() => {
    if (frontendType === 'keyValue') {
      const k = fieldKey.toLowerCase();
      if (k.includes('header')) return 'Add Header';
      if (k.includes('param') || k.includes('qs') || k.includes('query')) return 'Add Param';
      if (k.includes('body') || k.includes('payload')) return 'Add Field';
      return 'Add Entry';
    }
    if (frontendType === 'hubspotRecords') {
      return 'Add Another';
    }
    if (frontendType === 'variableList') return 'Add Variable';
    if (frontendType === 'caseList') return 'Add Case';
    return undefined;
  })();

  const configField: ConfigField = {
    key: fieldKey,
    label: friendlyLabel,
    type: frontendType,
    required: isRequired,
    defaultValue: fieldSchema.default,
    placeholder: placeholderText,
    helpText: deriveInputHelpText(fieldKey, fieldSchema, frontendType, nodeType),
    options,
    helpCategory: fieldSchema.helpCategory,
    docsUrl: fieldSchema.docsUrl,
    exampleValue: fieldSchema.exampleValue,
    contextHints: fieldSchema.ui?.contextHints,
    visibleIf: fieldSchema.ui?.visibleIf,
    requiredIf: fieldSchema.ui?.requiredIf,
    addButtonLabel,
  };

  return configField;
}

/**
 * Convert backend NodeDefinition to frontend ConfigField array
 */
export function convertNodeDefinitionToConfigFields(
  nodeDefinition: NodeDefinition
): ConfigField[] {
  const configFields: ConfigField[] = [];

  for (const [fieldKey, fieldSchema] of Object.entries(nodeDefinition.inputSchema)) {
    // Skip credential-owned fields — managed by the credential system, not user text input.
    if ((fieldSchema as any).ownership === 'credential') continue;

    const configField = convertSchemaToConfigField(
      fieldKey,
      fieldSchema,
      nodeDefinition.requiredInputs,
      nodeDefinition.type
    );
    configFields.push(configField);
  }

  return configFields;
}

/**
 * Validate node inputs against schema and return errors
 */
export function validateNodeInputsAgainstSchema(
  nodeDefinition: NodeDefinition,
  inputs: Record<string, any>
): { valid: boolean; errors: Array<{ field: string; message: string }> } {
  const errors: Array<{ field: string; message: string }> = [];

  const conditionMatches = (actual: unknown, expected: unknown) => {
    if (Array.isArray(expected)) {
      return expected.some((candidate) => actual === candidate);
    }
    return actual === expected;
  };

  for (const requiredField of nodeDefinition.requiredInputs) {
    if (
      !(requiredField in inputs) ||
      inputs[requiredField] === null ||
      inputs[requiredField] === undefined ||
      inputs[requiredField] === ''
    ) {
      errors.push({ field: requiredField, message: `${requiredField} is required` });
    }
  }

  // Conditional required fields (schema-driven)
  for (const [fieldKey, fieldSchema] of Object.entries(nodeDefinition.inputSchema)) {
    const requiredIf = (fieldSchema as any)?.ui?.requiredIf as
      | { field: string; equals: any }
      | undefined;
    if (!requiredIf) continue;
    const depValue = (inputs as any)?.[requiredIf.field];
    if (!conditionMatches(depValue, requiredIf.equals)) continue;

    const value = (inputs as any)?.[fieldKey];
    const missing =
      value === undefined ||
      value === null ||
      value === '' ||
      (Array.isArray(value) && value.length === 0);
    if (missing) {
      errors.push({ field: fieldKey, message: `${fieldKey} is required` });
    }
  }

  for (const [fieldKey, fieldSchema] of Object.entries(nodeDefinition.inputSchema)) {
    const value = inputs[fieldKey];

    if ((value === null || value === undefined || value === '') && !fieldSchema.required) {
      continue;
    }

    if (fieldSchema.validation) {
      const validationResult = fieldSchema.validation(value);
      if (validationResult !== true) {
        errors.push({
          field: fieldKey,
          message:
            typeof validationResult === 'string' ? validationResult : `${fieldKey} is invalid`,
        });
      }
    }

    if (value !== null && value !== undefined && value !== '') {
      switch (fieldSchema.type) {
        case 'string':
          if (typeof value !== 'string') {
            errors.push({ field: fieldKey, message: `${fieldKey} must be a string` });
          }
          break;
        case 'number':
          if (typeof value !== 'number' && isNaN(Number(value))) {
            errors.push({ field: fieldKey, message: `${fieldKey} must be a number` });
          }
          break;
        case 'boolean':
          if (typeof value !== 'boolean') {
            errors.push({ field: fieldKey, message: `${fieldKey} must be a boolean` });
          }
          break;
        case 'array':
          if (!Array.isArray(value)) {
            errors.push({ field: fieldKey, message: `${fieldKey} must be an array` });
          }
          break;
        case 'object':
        case 'json': {
          let parsedValue = value;
          if (typeof value === 'string' && value.trim() !== '') {
            try {
              parsedValue = JSON.parse(value);
            } catch {
              errors.push({ field: fieldKey, message: `${fieldKey} must be valid JSON` });
              break;
            }
          }
          if (typeof parsedValue !== 'object' || parsedValue === null || Array.isArray(parsedValue)) {
            errors.push({ field: fieldKey, message: `${fieldKey} must be an object` });
          }
          break;
        }
      }
    }
  }

  return { valid: errors.length === 0, errors };
}
