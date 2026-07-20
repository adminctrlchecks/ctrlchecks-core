import type { NodeDoc, OperationDoc, FieldDoc } from '../types';

const operationField: FieldDoc = {
  name: 'Operation',
  internalKey: 'operation',
  type: 'select',
  required: true,
  description: 'The Mailchimp action to run. Important: none of this dropdown\'s 8 values match the runtime\'s real operations - see Notes.',
  options: ['list', 'get', 'create', 'update', 'delete', 'addMember', 'updateMember', 'deleteMember'],
  notes: "This dropdown and the real execution engine (worker/src/core/registry/overrides/mailchimp.ts) do not agree on anything. The engine only implements three operations, none of which are list, get, create, update, delete, addMember, updateMember, or deleteMember: subscribe (add or update a list member), unsubscribe (remove a member from a list), and send (send an existing campaign). Selecting any of the 8 values in this dropdown always fails with \"Unsupported Mailchimp operation\" - there is currently no way to select a working operation from this Properties Panel at all. A working run requires setting operation to subscribe, unsubscribe, or send directly in workflow JSON or through an AI-generated workflow.",
  helpText: "What this field is: The dropdown that is supposed to select which Mailchimp action this node performs, though none of its options are implemented by the real execution engine (see Notes).\nWhy it matters: Every one of this dropdown's 8 values always fails immediately with an \"Unsupported Mailchimp operation\" error - there is currently no way to run this node successfully using only this Properties Panel dropdown.\nWhen to fill it: The Properties Panel requires a value, but no value chosen here will make the node succeed.\nWhat to enter: To get a working run today, this field's underlying value must be set to subscribe, unsubscribe, or send by editing workflow JSON directly or through an AI-generated workflow - not by picking from this dropdown.\nWhere the value comes from: Chosen in the Properties Panel for display purposes only; the real value must currently come from JSON/AI generation.\nHow to use it later: Downstream nodes read {{$json.data}} for the Mailchimp API response, once a real operation value (subscribe/unsubscribe/send) has been set.\nAccepted format: One of subscribe, unsubscribe, send (case-sensitive) - none of the 8 dropdown labels shown above.\nReal workplace example: Set the underlying operation value to subscribe (via JSON) with a List/Audience ID and an email address to add someone to a Mailchimp list.\nIf it is empty or wrong: An empty value defaults to subscribe; any of the 8 dropdown values, or any other unrecognized value, returns {{$json._error}} = \"Unsupported Mailchimp operation: ...\".\nCommon mistake: Picking any value from this dropdown and expecting it to work - all 8 values shown in the Properties Panel are currently non-functional; only subscribe/unsubscribe/send (set outside this dropdown) work.",
  placeholder: 'subscribe',
  example: 'subscribe',
  defaultValue: 'list',
};

const apiKeyField: FieldDoc = {
  name: 'API Key',
  internalKey: 'apiKey',
  type: 'password',
  required: true,
  description: 'Mailchimp Marketing API key, used for both authentication and detecting your account\'s data-center prefix.',
  helpText: "What this field is: Your Mailchimp Marketing API key, a secret token that authenticates every request this node makes.\nWhy it matters: Mailchimp requires this key on every API call using HTTP Basic Auth (any non-empty username, the API key as the password) - without it, every operation fails immediately. The key's suffix (the part after the last dash, e.g. us21) also tells this node which Mailchimp data center to call.\nWhen to fill it: Leave this field blank once you have saved a Mailchimp connection in CtrlChecks Connections; the node retrieves the key automatically at run time. Fill it directly only for a quick one-off test.\nWhat to enter: The full API key exactly as Mailchimp shows it, including its data-center suffix (for example abc123def456-us21).\nWhere the value comes from: Mailchimp -> Account -> Extras -> API Keys.\nHow to use it later: Never included in the node output.\nAccepted format: A single token string ending in a dash plus a data-center code (for example -us21) - the node needs this suffix to auto-detect where to send requests.\nReal workplace example: Save the key once in Connections -> Add Connection -> Mailchimp, then reuse the same saved connection across every Mailchimp node in every workflow.\nIf it is empty or wrong: An empty key returns {{$json._error}} = \"apiKey is required\"; a key without a recognizable data-center suffix and no Server Prefix filled returns \"serverPrefix is required when the Mailchimp API key does not include a data-center suffix\"; a wrong key returns a Mailchimp authentication failure.\nCommon mistake: Pasting the API key into a plain workflow field or a Data/JSON field instead of Connections, which leaves the secret visible to anyone who can view the workflow.",
  placeholder: 'your-api-key',
  notes: 'Stored and displayed as a masked credential value once saved through Connections.',
};

const dataCenterField: FieldDoc = {
  name: 'Data Center',
  internalKey: 'dataCenter',
  type: 'text',
  required: false,
  description: 'A field shown in the node editor that the execution engine never reads - it uses Server Prefix (auto-detected from API Key) instead.',
  helpText: "What this field is: A Data Center box in the node editor (examples shown: us1, us2, eu1), marked required by the Properties Panel.\nWhy it matters: The execution engine never reads inputs.dataCenter for any operation - it auto-detects the data-center prefix from the suffix of your API Key instead (the real internal field is called serverPrefix, not dataCenter). Filling this field currently has zero effect.\nWhen to fill it: There is no working scenario where filling this field changes the node's behavior; any non-empty text satisfies the Properties Panel's required-field check.\nWhat to enter: Any non-empty placeholder text works today, since the value is never used.\nWhere the value comes from: Not applicable - this field is not wired to a request parameter today.\nHow to use it later: Not applicable - this value never appears in {{$json.data}} or any other output key.\nAccepted format: Freeform text, but format has no effect since the value is unused.\nReal workplace example: None - the node figures out your data center from the API Key's own suffix automatically.\nIf it is empty or wrong: Nothing changes either way; the real data-center detection comes entirely from the API Key.\nCommon mistake: Assuming this field controls which Mailchimp data center is contacted - it does not; the API Key's suffix does, and there is currently no Properties Panel field for the real fallback (Server Prefix) if that auto-detection fails.",
  placeholder: 'us1',
};

const resourceField: FieldDoc = {
  name: 'Resource',
  internalKey: 'resource',
  type: 'select',
  required: true,
  description: 'A dropdown shown in the node editor that the execution engine never reads.',
  options: ['audience', 'member', 'campaign', 'automation', 'segment'],
  notes: "This field is entirely decorative. It offers Audience/List, Member, Campaign, Automation, and Segment, but the real execution engine never checks this value - the three real operations (subscribe, unsubscribe, send) are chosen entirely by the Operation field's underlying value, not by this Resource dropdown.",
  helpText: "What this field is: A Resource dropdown that looks like it selects which Mailchimp object type (audience, member, campaign, etc.) this node works with.\nWhy it matters: It doesn't - see Notes. The engine never reads this value for any operation.\nWhen to fill it: The Properties Panel requires a value here, but changing it has no effect on what the node actually does.\nWhat to enter: Leave the default (Audience/List) selected - it does not matter which option you pick.\nWhere the value comes from: Not applicable - the value is never read by the execution engine.\nHow to use it later: Not applicable - this value never appears in the node's output.\nAccepted format: Any of the five listed options - all behave identically (that is, they have no effect).\nReal workplace example: None - the real subscribe/unsubscribe/send operations do not depend on this field at all.\nIf it is empty or wrong: Nothing changes either way - the engine does not check this field.\nCommon mistake: Picking Member or Campaign expecting it to change what this node does - only the Operation value (set outside this dropdown, see its Notes) determines real behavior.",
  placeholder: 'audience',
  example: 'audience',
  defaultValue: 'audience',
};

const listIdField: FieldDoc = {
  name: 'List/Audience ID',
  internalKey: 'listId',
  type: 'text',
  required: false,
  description: 'The Mailchimp list (audience) ID for Subscribe and Unsubscribe.',
  helpText: "What this field is: The unique ID Mailchimp assigned to one of your mailing lists (Mailchimp calls these \"audiences\").\nWhy it matters: Subscribe and Unsubscribe both need to know which list to add or remove the member from - this field is required for real runs of both operations.\nWhen to fill it: Required whenever the underlying operation value is subscribe or unsubscribe (set via JSON/AI generation - see the Operation field's notes). Not used by send.\nWhat to enter: The Mailchimp list/audience ID exactly as Mailchimp shows it, for example a1b2c3d4e5.\nWhere the value comes from: Mailchimp -> Audience -> Settings -> Audience name and defaults, near the bottom under \"Audience ID\".\nHow to use it later: Echoed inside {{$json.data.list_id}} on a successful subscribe/unsubscribe.\nAccepted format: A short alphanumeric string exactly as Mailchimp provides it.\nReal workplace example: a1b2c3d4e5 for your main newsletter audience.\nIf it is empty or wrong: An empty List/Audience ID on subscribe/unsubscribe returns {{$json._error}} = \"listId is required for subscribe\" (or \"...for unsubscribe\"); a wrong ID returns a Mailchimp \"resource not found\" error.\nCommon mistake: Confusing this with a Campaign ID - lists/audiences and campaigns are different Mailchimp objects with different ID formats, and Send uses a separate Campaign Id field instead of this one.",
  placeholder: 'list-id',
  example: 'list-id',
};

const memberEmailField: FieldDoc = {
  name: 'Member Email',
  internalKey: 'memberEmail',
  type: 'text',
  required: false,
  description: 'A field shown in the node editor that the execution engine never reads - it reads a field literally named Email instead.',
  helpText: "What this field is: A Member Email box in the node editor, labeled as required for member operations.\nWhy it matters: The execution engine reads a config value called email, not memberEmail - this field's value is never sent to Mailchimp no matter what you type here.\nWhen to fill it: There is no working scenario where filling this field changes the node's behavior; the real subscribe/unsubscribe operations need a value under the key email instead, which currently has no matching field in this Properties Panel.\nWhat to enter: Nothing is required here - whatever you type is not used.\nWhere the value comes from: Not applicable today.\nHow to use it later: Not applicable - this value never appears in the output.\nAccepted format: Freeform text, but format has no effect since the value is unused.\nReal workplace example: None - set a config value named email (not memberEmail) via workflow JSON or AI generation to make subscribe/unsubscribe work.\nIf it is empty or wrong: Nothing changes either way.\nCommon mistake: Filling this field and assuming subscribe/unsubscribe will now have an email address to use - they read a differently-named field (email) that this Properties Panel does not expose.",
  placeholder: 'test@example.com',
};

const emailField: FieldDoc = {
  name: 'Email',
  internalKey: 'email',
  type: 'email',
  required: false,
  description: 'The real email field read by Subscribe and Unsubscribe. Not exposed as its own field in this Properties Panel today (the visible "Member Email" field is a different, unused key).',
  helpText: "What this field is: The email address of the person to add, update, or remove from a Mailchimp list.\nWhy it matters: Subscribe and Unsubscribe both identify the member by an MD5 hash of this lowercased, trimmed email address - Mailchimp's API uses that hash as the member's unique ID within the list, so this value is essential for both operations.\nWhen to fill it: Required whenever the underlying operation value is subscribe or unsubscribe. It can also be supplied inside the Data field as email_address or email if you are providing a full raw payload.\nWhat to enter: One valid email address for the list member.\nWhere the value comes from: Type it directly via workflow JSON/AI generation (there is no dedicated visual field for this exact key today - see the Member Email field's notes), or map it from an earlier node's output such as a form submission.\nHow to use it later: Echoed back inside {{$json.data.email_address}} on a successful subscribe/unsubscribe.\nAccepted format: A single standard email address such as name@example.com.\nReal workplace example: alice@example.com when adding a new newsletter signup to your main audience.\nIf it is empty or wrong: An empty value on subscribe/unsubscribe returns {{$json._error}} = \"email is required for subscribe\" (or \"...for unsubscribe\"); an invalid email is rejected by Mailchimp's own API validation.\nCommon mistake: Typing the email into the visible \"Member Email\" field in the Properties Panel - that field uses a different, unused key (memberEmail); this exact key (email) currently has no dedicated visual field.",
  placeholder: 'test@example.com',
  example: 'test@example.com',
};

const dataField: FieldDoc = {
  name: 'Data (JSON)',
  internalKey: 'data',
  type: 'json',
  required: false,
  description: 'Raw Mailchimp API payload override for Subscribe, Unsubscribe, and Send - not for Create/Update as the field label suggests, since those operations do not exist.',
  helpText: "What this field is: A raw JSON request body that, when filled, completely replaces the auto-built payload Subscribe/Unsubscribe/Send would otherwise send.\nWhy it matters: By default, Subscribe builds its own body from Email and Merge Fields, and Unsubscribe/Send build minimal bodies automatically - this field lets you send Mailchimp's exact API shape yourself when you need fields the auto-built body does not cover.\nWhen to fill it: Optional for subscribe/unsubscribe/send (set via JSON/AI generation). It is NOT used for Create or Update, despite this field's Properties Panel label, because those operations do not exist in the runtime.\nWhat to enter: A JSON object matching Mailchimp's List Members API shape, for example {\"email_address\":\"alice@example.com\",\"status\":\"subscribed\",\"merge_fields\":{\"FNAME\":\"Alice\"}}.\nWhere the value comes from: Build it manually following Mailchimp's List Members API reference, or map fields from an earlier node's output.\nHow to use it later: Mailchimp's response comes back as {{$json.data}}, the same key every operation uses.\nAccepted format: Valid JSON wrapped in { } matching Mailchimp's expected request shape for the operation you are running.\nReal workplace example: {\"email_address\":\"alice@example.com\",\"status\":\"subscribed\",\"merge_fields\":{\"FNAME\":\"Alice\",\"LNAME\":\"Chen\"}} for a subscribe with extra profile fields.\nIf it is empty or wrong: If empty, Subscribe/Unsubscribe/Send fall back to their auto-built minimal bodies (see the Email/Merge Fields/Campaign Id fields); invalid JSON here is rejected before the request is sent.\nCommon mistake: Believing this field is for Create/Update (as its Properties Panel label suggests) - those operations are not implemented; this field only matters for subscribe/unsubscribe/send, as an optional raw payload override.",
  placeholder: '{"email_address":"test@example.com","status":"subscribed"}',
  example: '{"email_address":"test@example.com","status":"subscribed"}',
};

const memberDataField: FieldDoc = {
  name: 'Member Data (JSON)',
  internalKey: 'memberData',
  type: 'json',
  required: false,
  description: 'A field shown in the node editor that the execution engine never reads - use Data (JSON) instead for a raw payload override.',
  helpText: "What this field is: A Member Data box in the node editor, labeled as required for add/update member operations.\nWhy it matters: The execution engine never reads inputs.memberData for any operation - the only raw-payload override field the engine actually checks is Data (JSON) (config key data), not this one.\nWhen to fill it: There is no working scenario where filling this field changes the node's behavior; use Data (JSON) instead if you need to send a custom Mailchimp payload.\nWhat to enter: Nothing is required here - whatever JSON you type is not used.\nWhere the value comes from: Not applicable today.\nHow to use it later: Not applicable - this value never appears in the output.\nAccepted format: Valid JSON, though format has no effect since the value is unused.\nReal workplace example: None - use the Data (JSON) field instead.\nIf it is empty or wrong: Nothing changes either way.\nCommon mistake: Filling this field expecting it to control the subscribe/unsubscribe payload - the engine reads Data (JSON) (key data), never Member Data (key memberData).",
  placeholder: '{"email_address":"test@example.com","status":"subscribed","merge_fields":{"FNAME":"John","LNAME":"Doe"}}',
};

const countField: FieldDoc = {
  name: 'Count',
  internalKey: 'count',
  type: 'number',
  required: false,
  description: 'A field shown in the node editor that the execution engine never reads - there is no List operation to paginate.',
  helpText: "What this field is: A Count box in the node editor, intended to limit how many records a listing operation returns.\nWhy it matters: There is no List operation in the real execution engine at all (only subscribe/unsubscribe/send exist) - this field has no operation to apply to and is never read.\nWhen to fill it: There is no working scenario where filling this field changes the node's behavior; leave it blank.\nWhat to enter: Nothing is required - any number typed here is ignored.\nWhere the value comes from: Not applicable today.\nHow to use it later: Not applicable - this value never appears in the output.\nAccepted format: A positive integer, though format has no effect since the value is unused.\nReal workplace example: None.\nIf it is empty or wrong: Nothing changes either way.\nCommon mistake: Assuming this node can list or page through Mailchimp records - it currently cannot; it can only subscribe, unsubscribe, or send.",
  placeholder: '10',
  defaultValue: '10',
};

const offsetField: FieldDoc = {
  name: 'Offset',
  internalKey: 'offset',
  type: 'number',
  required: false,
  description: 'A field shown in the node editor that the execution engine never reads - there is no List operation to paginate.',
  helpText: "What this field is: An Offset box in the node editor, intended for paging through a listing operation's results.\nWhy it matters: There is no List operation in the real execution engine at all - this field has no operation to apply to and is never read.\nWhen to fill it: There is no working scenario where filling this field changes the node's behavior; leave it blank.\nWhat to enter: Nothing is required - any number typed here is ignored.\nWhere the value comes from: Not applicable today.\nHow to use it later: Not applicable - this value never appears in the output.\nAccepted format: A non-negative integer, though format has no effect since the value is unused.\nReal workplace example: None.\nIf it is empty or wrong: Nothing changes either way.\nCommon mistake: Assuming this node supports paginated listing - it currently does not; it can only subscribe, unsubscribe, or send.",
  placeholder: '0',
  defaultValue: '0',
};

const serverPrefixField: FieldDoc = {
  name: 'Server Prefix',
  internalKey: 'serverPrefix',
  type: 'text',
  required: false,
  description: 'Real fallback field, used only if the API Key does not include a recognizable data-center suffix. Not exposed in this Properties Panel today.',
  helpText: "What this field is: The Mailchimp data-center code (for example us21) that tells this node which regional API server to call.\nWhy it matters: Every Mailchimp request must go to the correct data-center subdomain (https://<prefix>.api.mailchimp.com); this node normally figures this out automatically from your API Key's suffix, and only needs this field as a fallback.\nWhen to fill it: Only if your API Key does not end in a dash plus a data-center code (rare) - in that case, this field must currently be set via workflow JSON or AI generation, since it has no dedicated visual field.\nWhat to enter: The short data-center code exactly as it appears in your Mailchimp account URL, for example us21.\nWhere the value comes from: Look at the URL when logged into Mailchimp - it looks like https://us21.admin.mailchimp.com/....\nHow to use it later: Not applicable - never included in the node output.\nAccepted format: A short lowercase code like us1, us21, or eu1.\nReal workplace example: us21 for an account whose admin URL is us21.admin.mailchimp.com.\nIf it is empty or wrong: If the API Key has no usable suffix and this field is also empty, the node returns {{$json._error}} = \"serverPrefix is required when the Mailchimp API key does not include a data-center suffix\".\nCommon mistake: Assuming the Data Center field in the visible Properties Panel sets this value - it does not; that field is a different, unused key (dataCenter).",
  placeholder: 'us21',
  example: 'us21',
};

const mergeFieldsField: FieldDoc = {
  name: 'Merge Fields',
  internalKey: 'mergeFields',
  type: 'json',
  required: false,
  description: 'Real optional field for Subscribe\'s auto-built payload (profile fields like first/last name). Not exposed in this Properties Panel today.',
  helpText: "What this field is: Extra profile fields (Mailchimp calls these \"merge fields\") attached to a new or updated list member, such as first name or last name.\nWhy it matters: When Data (JSON) is left empty, Subscribe automatically builds its request body using this value under merge_fields - it lets you personalize a member's profile without writing the full raw payload yourself.\nWhen to fill it: Optional for subscribe, and only used when Data (JSON) is empty (Data, when filled, completely replaces the auto-built body including this value). Currently must be set via workflow JSON or AI generation, since it has no dedicated visual field.\nWhat to enter: A JSON object whose keys are Mailchimp merge tags configured on your audience, for example {\"FNAME\":\"Alice\",\"LNAME\":\"Chen\"}.\nWhere the value comes from: Mailchimp -> Audience -> Settings -> Audience fields and *|MERGE|* tags, for the exact tag names your audience supports.\nHow to use it later: Echoed back inside {{$json.data.merge_fields}} on a successful subscribe.\nAccepted format: A JSON object with Mailchimp merge-tag keys, for example {\"FNAME\":\"Alice\"}.\nReal workplace example: {\"FNAME\":\"Alice\",\"LNAME\":\"Chen\"} to store a new subscriber's name alongside their email.\nIf it is empty or wrong: Left empty, Subscribe sends an empty merge_fields object; an unrecognized merge tag is generally ignored by Mailchimp rather than causing an error.\nCommon mistake: Using field names from your own database (like \"firstName\") instead of the exact merge tag Mailchimp expects (like \"FNAME\") - Mailchimp only recognizes its own configured tag names.",
  placeholder: '{"FNAME":"Asha"}',
  example: '{"FNAME":"Asha"}',
};

const campaignIdField: FieldDoc = {
  name: 'Campaign Id',
  internalKey: 'campaignId',
  type: 'text',
  required: false,
  description: 'The existing Mailchimp campaign ID to send. Required for Send. Not exposed in this Properties Panel today.',
  helpText: "What this field is: The unique ID of an existing, already-created Mailchimp campaign that this node tells Mailchimp to send.\nWhy it matters: Send does not create a campaign - it only triggers sending one that already exists in your Mailchimp account. Without this ID, Send has nothing to send.\nWhen to fill it: Required whenever the underlying operation value is send. Currently must be set via workflow JSON or AI generation, since it has no dedicated visual field in this Properties Panel.\nWhat to enter: The Mailchimp campaign ID exactly as Mailchimp shows it, for example a1b2c3d4e5.\nWhere the value comes from: Mailchimp -> Campaigns -> open the draft campaign -> the ID is in the browser URL, or from Mailchimp's List Campaigns API.\nHow to use it later: Not echoed back in the output - Send's real response body is empty (see the Send operation's output description).\nAccepted format: A short alphanumeric string exactly as Mailchimp provides it.\nReal workplace example: Use a campaign ID you already created and tested inside Mailchimp's own campaign builder, then trigger its send from this workflow at the right moment.\nIf it is empty or wrong: An empty Campaign Id on send returns {{$json._error}} = \"campaignId is required for send\"; a wrong or already-sent campaign ID returns a Mailchimp API error.\nCommon mistake: Confusing this with List/Audience ID - campaigns and audiences are different Mailchimp objects; Send needs a Campaign Id, not a List/Audience ID.",
  placeholder: 'campaign-id',
  example: 'campaign-id',
};

const sharedFields: FieldDoc[] = [operationField, apiKeyField, dataCenterField, resourceField];

const subscribeOperation: OperationDoc = {
  name: 'Subscribe',
  value: 'subscribe',
  description: 'Adds a new member to a Mailchimp list, or updates an existing member, via PUT /lists/{listId}/members/{md5(email)}. Mailchimp identifies the member by an MD5 hash of the lowercased email - no separate member ID is needed.',
  fields: [...sharedFields, listIdField, memberEmailField, emailField, dataField, memberDataField, mergeFieldsField, countField, offsetField],
  outputExample: {
    operation: 'subscribe',
    data: { id: 'a1b2c3d4e5f6', email_address: 'alice@example.com', status: 'subscribed', merge_fields: { FNAME: 'Alice' }, list_id: 'list-id' },
  },
  outputDescription: 'operation: echoes back "subscribe". data: the full raw Mailchimp list-member object, including id (the MD5 hash used as the member ID), email_address, status, merge_fields, and list_id. _error: present only when the request failed, for example "listId is required for subscribe" or "email is required for subscribe". _errorCode: set to "MAILCHIMP_FAILED" on any failure.',
  usageExample: {
    scenario: 'A signup-form workflow adds a new visitor to the main newsletter audience as soon as they submit their email.',
    inputValues: { operation: 'subscribe', apiKey: 'test-key-us21', listId: '{{$json.listId}}' },
    expectedOutput: 'Mailchimp returns the member record as {{$json.data}}, so a later step can confirm {{$json.data.status}} is subscribed.',
  },
  externalDocsUrl: 'https://mailchimp.com/developer/marketing/api/list-members/add-or-update-list-member/',
};

const unsubscribeOperation: OperationDoc = {
  name: 'Unsubscribe',
  value: 'unsubscribe',
  description: 'Marks an existing list member as unsubscribed via PATCH /lists/{listId}/members/{md5(email)}. Uses the same email-hash lookup as Subscribe.',
  fields: [...sharedFields, listIdField, memberEmailField, emailField, dataField],
  outputExample: {
    operation: 'unsubscribe',
    data: { id: 'a1b2c3d4e5f6', email_address: 'alice@example.com', status: 'unsubscribed', list_id: 'list-id' },
  },
  outputDescription: 'operation: echoes back "unsubscribe". data: the full raw Mailchimp list-member object after the change, with status now "unsubscribed". _error: present only when the request failed, for example "listId is required for unsubscribe" or "email is required for unsubscribe". _errorCode: set to "MAILCHIMP_FAILED" on any failure.',
  usageExample: {
    scenario: 'A preference-center workflow removes a customer from the marketing list as soon as they click an unsubscribe link.',
    inputValues: { operation: 'unsubscribe', apiKey: 'test-key-us21', listId: '{{$json.listId}}' },
    expectedOutput: 'Mailchimp returns the updated member as {{$json.data}}, confirming {{$json.data.status}} is now unsubscribed.',
  },
  externalDocsUrl: 'https://mailchimp.com/developer/marketing/api/list-members/update-list-member/',
};

const sendOperation: OperationDoc = {
  name: 'Send',
  value: 'send',
  description: 'Triggers sending an already-created Mailchimp campaign via POST /campaigns/{campaignId}/actions/send. This does not create a campaign - the campaign must already exist and be ready to send inside Mailchimp.',
  fields: [...sharedFields, campaignIdField, dataField],
  outputExample: {
    operation: 'send',
    data: null,
  },
  outputDescription: 'operation: echoes back "send". data: always null on a successful send - Mailchimp\'s send-campaign endpoint returns HTTP 204 with no response body, so there is no member/campaign object to read here. Check for the absence of _error to confirm the send succeeded. _error: present only when the request failed, for example "campaignId is required for send". _errorCode: set to "MAILCHIMP_FAILED" on any failure.',
  usageExample: {
    scenario: 'A scheduling workflow triggers a pre-built Mailchimp campaign to send at a precise time an internal scheduler decides, rather than Mailchimp\'s own send-time picker.',
    inputValues: { operation: 'send', apiKey: 'test-key-us21', campaignId: '{{$json.campaignId}}' },
    expectedOutput: 'Mailchimp returns {{$json.data}} as null on success - the absence of {{$json._error}} confirms the send was accepted.',
  },
  externalDocsUrl: 'https://mailchimp.com/developer/marketing/api/campaign-actions/send-campaign/',
};

export const mailchimpDoc: NodeDoc = {
  slug: 'mailchimp',
  displayName: 'Mailchimp',
  category: 'CRM',
  logoUrl: '/icons/nodes/mailchimp.svg',
  description: 'Add or remove a Mailchimp list member, or trigger sending an existing campaign. Note: the visual Operation dropdown is entirely non-functional today - see the Operation field for details.',
  credentialType: 'Mailchimp API Key',
  credentialSetupSteps: [
    'What this is: The Mailchimp connection lets CtrlChecks store your Mailchimp API Key safely in Connections, instead of pasting it into every workflow that uses Mailchimp.',
    'Where to start: Log in to Mailchimp, go to Account -> Extras -> API Keys, and create or copy an existing key. The key ends in a dash plus your account\'s data-center code (for example -us21) - this node uses that suffix to know which Mailchimp server to call.',
    'How to connect: In CtrlChecks, open Connections -> Add Connection -> Mailchimp API Key, then paste the key. Mailchimp\'s Basic Auth accepts any non-empty username with the API Key as the password.',
    'Once saved, the connection is injected automatically into the node\'s API Key field at run time - you do not need to fill it directly, and the Data Center field in the visible panel is not used for this (the real data-center detection comes from the API Key\'s own suffix).',
    'Important: Treat the API Key like a bank password. Store it in Connections, not in a plain workflow field, and never share it outside CtrlChecks.',
    'Test it: Save the connection, then run this node with operation set to subscribe (via workflow JSON, since the visual Operation dropdown does not currently expose a working value) and a real List/Audience ID, and confirm CtrlChecks returns a real Mailchimp member record instead of an authentication error.',
    'Connect the Mailchimp output to a logging, If/Else, or follow-up node when later steps should inspect {{$json.data}}. Downstream service node account connection setup is still required for nodes after Mailchimp; this connection only authorizes Mailchimp list/campaign operations.',
  ],
  credentialDocsUrl: 'https://mailchimp.com/developer/marketing/guides/quick-start/',
  resources: [
    {
      name: 'Operations',
      description: 'Mailchimp list and campaign actions. Only three operations exist in the runtime (Subscribe, Unsubscribe, Send); the visual Operation dropdown currently exposes eight completely different values, none of which work - see the Operation field for how to reach a working operation today.',
      operations: [subscribeOperation, unsubscribeOperation, sendOperation],
    },
  ],
  commonErrors: [
    {
      error: 'apiKey is required',
      cause: 'No API Key was typed on the node and no Mailchimp connection is saved in Connections for this workflow/user.',
      fix: 'Connect Mailchimp in CtrlChecks -> Connections -> Mailchimp API Key, or paste an API Key directly into the node for a quick test.',
    },
    {
      error: 'serverPrefix is required when the Mailchimp API key does not include a data-center suffix',
      cause: 'The API Key does not end in a recognizable data-center suffix (like -us21), and no Server Prefix value was supplied as a fallback.',
      fix: 'Use an API Key that includes its data-center suffix (the normal Mailchimp format), or supply a Server Prefix value via workflow JSON.',
    },
    {
      error: 'listId is required for subscribe',
      cause: 'Subscribe or Unsubscribe was run with the List/Audience ID field left empty.',
      fix: 'Fill the List/Audience ID field with the Mailchimp list you want to add or remove the member from.',
    },
    {
      error: 'email is required for subscribe',
      cause: 'Subscribe or Unsubscribe was run without a value under the real email config key - filling the visible "Member Email" field does not count, since it uses a different, unused key.',
      fix: 'Set a config value under the exact key email (via workflow JSON or AI generation) until this field gets its own Properties Panel entry.',
    },
    {
      error: 'campaignId is required for send',
      cause: 'Send was run with no Campaign Id value - this field currently has no Properties Panel entry at all.',
      fix: 'Set a config value under the key campaignId (via workflow JSON or AI generation) pointing to an existing, ready-to-send Mailchimp campaign.',
    },
    {
      error: 'Unsupported Mailchimp operation: <operation>',
      cause: 'Operation was set to one of the 8 values shown in the visual dropdown (List, Get, Create, Update, Delete, Add Member, Update Member, Delete Member) - none of which exist in the execution engine.',
      fix: 'Set the underlying operation value to subscribe, unsubscribe, or send via workflow JSON or AI generation. There is no supported way to run this node using only the visual Operation dropdown today.',
    },
  ],
  relatedNodes: [],
};
