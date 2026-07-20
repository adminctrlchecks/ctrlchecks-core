import type { NodeDoc, OperationDoc, FieldDoc } from '../types';

const operationField: FieldDoc = {
  name: 'Operation',
  internalKey: 'operation',
  type: 'select',
  required: true,
  description: 'The Pipedrive action to run. Important: the exact value "getMany" always fails - see Notes.',
  options: ['get', 'getMany', 'create', 'update', 'delete', 'search'],
  notes: 'The runtime checks operation === \'list\' for listing records, not \'getMany\' - so the "Get Many" dropdown option always fails with "Unsupported operation \\"getMany\\" for resource ...", regardless of which Resource is selected. Get/Create/Update/Delete/Search generally exist per resource, but not every resource supports every one of these five (for example Pipeline has no create/update/delete/search at all, and Stage has no create/delete/search). Several resources also have extra real operations not in this dropdown at all, such as getDeals, getActivities, getProducts, addProduct, duplicate, getStages, getPersons, upload, and download - reachable only via workflow JSON or an AI-generated workflow.',
  helpText: "What this field is: The dropdown that tells this node which Pipedrive action to run against the selected Resource.\nWhy it matters: Pipedrive needs to know whether you are reading, listing, creating, changing, removing, or searching before it can build the right API request - and, critically, this dropdown's \"Get Many\" value never actually works (see Notes).\nWhen to fill it: Every time you add a Pipedrive node.\nWhat to enter: Choose Get to fetch one record by its resource-specific ID, Create to add a new record, Update to change an existing record, Delete to remove a record, or Search to find records by a text term. Avoid Get Many - despite being in this dropdown, it always fails; to list records, this field's underlying value must be set to list via workflow JSON or an AI-generated workflow instead.\nWhere the value comes from: Chosen directly in the Properties Panel; it is rarely set dynamically since the required fields differ per resource and operation.\nHow to use it later: Downstream nodes read {{$json.data}} for the Pipedrive API result, regardless of which operation ran.\nAccepted format: One of get, list, create, update, delete, search (case-sensitive) - not getMany, which is a dropdown label that does not match any real runtime value.\nReal workplace example: Set Resource to person and Operation to get with the real personId value supplied via JSON/AI generation to fetch one contact's full details.\nIf it is empty or wrong: An empty value defaults to get; getMany or any unrecognized value returns {{$json._error}} = \"Pipedrive node: Unsupported operation \\\"...\\\" for resource \\\"...\\\"\".\nCommon mistake: Selecting Get Many expecting it to list records - it never works under that exact label; the real listing behavior requires the underlying value list, which is not one of this dropdown's options today.",
  placeholder: 'get',
  example: 'get',
  defaultValue: 'get',
};

const resourceField: FieldDoc = {
  name: 'Resource',
  internalKey: 'resource',
  type: 'select',
  required: true,
  description: 'The Pipedrive object type this operation works with. Important: "User" is not a real resource, and 3 real resources (Lead, File, Webhook) are missing from this dropdown - see Notes.',
  options: ['person', 'organization', 'deal', 'note', 'activity', 'product', 'pipeline', 'stage', 'user'],
  notes: 'This node\'s real runtime supports 11 resources, each with its own ID field name and its own create/update field names (none of which have dedicated Properties Panel fields - see the Resource ID/Data fields\' notes): deal (dealId; dealTitle, dealValue, dealCurrency, personId, orgId, stageId, status, expectedCloseDate), person (personId; personName, personEmail, personPhone, orgId), organization (orgId; orgName, orgAddress, personPhone), activity (activityId; activitySubject, dueDate, activityType, dealId, personId, orgId, noteContent), note (noteId; noteContent, dealId, personId, orgId, pinnedToDealFlag), pipeline (pipelineId; read-only in this node - no create/update/delete), stage (stageId; stageName, dealProbability, pipelineId), product (productId; productName, productCode, productUnit, productTax), lead (leadId; leadTitle, personId, orgId, dealValue, expectedCloseDate, status), file (fileId; fileUrl, fileName, plus a dealId/personId/orgId/activityId association), webhook (webhookId; event, subscriptionUrl). Of these 11, only person, organization, deal, note, activity, product, pipeline, and stage are selectable in this dropdown - lead, file, and webhook are real but currently unreachable except via workflow JSON or an AI-generated workflow. The dropdown\'s ninth option, "User", is NOT a real resource at all - selecting it always returns "Unsupported resource \\"user\\"".',
  helpText: "What this field is: The Pipedrive object type - Person, Organization, Deal, Note, Activity, Product, Pipeline, Stage, or User - that the chosen Operation reads or writes.\nWhy it matters: This value determines which branch of Pipedrive logic runs and which real field names apply - each resource uses its own ID and create-field names (see Notes), none of which match this node's generic Resource ID/Data fields.\nWhen to fill it: Every time you add a Pipedrive node; it is required on every run alongside Operation.\nWhat to enter: Pick Person, Organization, Deal, Note, Activity, Product, Pipeline, or Stage for the eight working dropdown options. Avoid User - it is not a real resource and always fails. Lead, File, and Webhook are real but not in this dropdown; reach them only via workflow JSON or AI generation.\nWhere the value comes from: Chosen directly in the Properties Panel, or set dynamically with {{$json.resource}} when a previous node decides which Pipedrive object to touch.\nHow to use it later: The resource you pick determines which record shape appears inside {{$json.data}}.\nAccepted format: One of person, organization, deal, note, activity, product, pipeline, stage (lowercase, matched exactly) - not user.\nReal workplace example: Set Resource to deal and Operation to get (with the real dealId value supplied via JSON/AI generation) to fetch one sales deal's full details.\nIf it is empty or wrong: An empty value falls back to deal; User or any unrecognized value returns {{$json._error}} = \"Pipedrive node: Unsupported resource \\\"...\\\"\".\nCommon mistake: Selecting User expecting to manage Pipedrive users/team members - this resource does not exist in the runtime at all, despite appearing in the dropdown.",
  placeholder: 'person',
  example: 'person',
  defaultValue: 'person',
};

const apiTokenField: FieldDoc = {
  name: 'API Token',
  internalKey: 'apiToken',
  type: 'password',
  required: true,
  description: 'Your Pipedrive API token, used to authenticate every request.',
  helpText: "What this field is: Your personal Pipedrive API token, a secret string that authenticates every request this node makes.\nWhy it matters: Pipedrive requires this token on every API call - without it, every operation fails immediately.\nWhen to fill it: Leave this field blank once you have saved a Pipedrive connection in CtrlChecks Connections; the node automatically retrieves the token from the credential vault at run time. Fill it directly only for a quick one-off test.\nWhat to enter: The raw API token exactly as Pipedrive shows it, with no surrounding quotes.\nWhere the value comes from: pipedrive.com -> Settings -> Personal Preferences -> API.\nHow to use it later: Never included in the node output.\nAccepted format: A single token string.\nReal workplace example: Save the token once in Connections -> Add Connection -> Pipedrive, then reuse the same saved connection across every Pipedrive node in every workflow.\nIf it is empty or wrong: An empty token returns {{$json._error}} = \"Pipedrive node: API Token is required\"; a wrong token returns a Pipedrive authentication failure inside {{$json._error}}.\nCommon mistake: Pasting the token into a plain workflow field or a Data/JSON field instead of Connections, which leaves the secret visible to anyone who can view the workflow.",
  placeholder: 'your-api-token',
  notes: 'Stored and displayed as a masked credential value once saved through Connections.',
};

const companyDomainField: FieldDoc = {
  name: 'Company Domain',
  internalKey: 'companyDomain',
  type: 'text',
  required: false,
  description: 'A field shown in the node editor that the execution engine never reads - all requests go to the global api.pipedrive.com endpoint regardless.',
  helpText: "What this field is: A Company Domain box in the node editor, labeled as your Pipedrive subdomain (without .pipedrive.com), marked required by the Properties Panel.\nWhy it matters: The real Pipedrive API client used by this node has its base URL hardcoded to https://api.pipedrive.com/v1 and only ever takes the API Token as a constructor argument - this field is never read anywhere, so filling it has zero effect on which Pipedrive account is contacted (the API Token alone determines that).\nWhen to fill it: There is no working scenario where filling this field changes the node's behavior; any non-empty text satisfies the Properties Panel's required-field check.\nWhat to enter: Any non-empty placeholder text works today, since the value is never used.\nWhere the value comes from: Not applicable - this field is not wired to a request parameter today.\nHow to use it later: Not applicable - this value never appears in {{$json.data}} or any other output key.\nAccepted format: Freeform text, but format has no effect since the value is unused.\nReal workplace example: None - which Pipedrive account is contacted is determined entirely by the API Token, not this field.\nIf it is empty or wrong: Nothing changes either way.\nCommon mistake: Assuming this field selects which Pipedrive company/subdomain is used, the way it would for a node like Freshdesk's Domain field - Pipedrive's API is token-only and global, so this concept does not apply here.",
  placeholder: 'yourcompany',
};

const credentialIdField: FieldDoc = {
  name: 'Credential Id',
  internalKey: 'credentialId',
  type: 'string',
  required: false,
  description: 'Reserved field for a stored credential reference; not currently read by the execution engine.',
  helpText: "What this field is: A field intended to reference a specific stored Pipedrive credential by its internal ID.\nWhy it matters: The execution code never reads this value - credential lookup always goes through the standard saved-connection/vault lookup keyed by workflow and node, never through this field.\nWhen to fill it: There is currently no working scenario where filling this field changes which credential is used; leave it blank.\nWhat to enter: Nothing is required - any value typed here has no effect.\nWhere the value comes from: Not applicable today.\nHow to use it later: Not applicable - this value never appears in the output.\nAccepted format: Freeform text, but format has no effect since the value is unused.\nReal workplace example: None - connect Pipedrive once through Connections instead.\nIf it is empty or wrong: Nothing changes either way.\nCommon mistake: Assuming this lets you pick between multiple saved Pipedrive connections on a per-node basis - it does not.",
  placeholder: '(unused)',
};

const idField: FieldDoc = {
  name: 'Resource ID',
  internalKey: 'id',
  type: 'text',
  required: false,
  description: 'A field shown in the node editor that the execution engine never reads for any resource - each resource uses its own differently-named ID field instead (see the Resource field\'s Notes).',
  helpText: "What this field is: A Resource ID box in the node editor, labeled as required for get/update/delete operations.\nWhy it matters: The execution engine never reads a plain \"id\" config value for any resource - Person needs personId, Deal needs dealId, Organization needs orgId, and so on for every other resource (see the Resource field's Notes for the full list). Filling only this generic field leaves every resource-specific ID requirement unmet.\nWhen to fill it: There is no working scenario where filling this field changes the node's behavior; supply the real, resource-specific ID key instead via workflow JSON or an AI-generated workflow.\nWhat to enter: Nothing is required here - whatever you type is not sent to Pipedrive.\nWhere the value comes from: Not applicable - this field is not wired to a request parameter today.\nHow to use it later: Not applicable - this value never appears in {{$json.data}} or any other output key.\nAccepted format: Freeform text, but format has no effect since the value is unused.\nReal workplace example: None - use the resource-specific key (for example personId) instead.\nIf it is empty or wrong: Nothing changes either way; the real per-resource ID errors (like \"Pipedrive node: personId is required for get operation\") fire regardless of what this field contains.\nCommon mistake: Filling this field and assuming Get/Update/Delete will now work - they need the exact resource-specific ID key instead, which has no Properties Panel field today.",
  placeholder: '123',
};

const dataField: FieldDoc = {
  name: 'Data (JSON)',
  internalKey: 'data',
  type: 'json',
  required: false,
  description: 'A field shown in the node editor that the execution engine never reads - each resource\'s Create/Update instead reads individually-named fields (see the Resource field\'s Notes).',
  helpText: "What this field is: A Data (JSON) box in the node editor, labeled as required for create/update operations.\nWhy it matters: The execution engine never reads a generic \"data\" config object for Create/Update on any resource - Person's create reads personName/personEmail/personPhone/orgId as separate config keys, Deal's create reads dealTitle/dealValue/dealCurrency/personId/orgId/stageId, and so on for every other resource (see the Resource field's Notes for the full list). There is a real, generic additionalFields JSON key that gets merged into whichever payload is built, but it also has no Properties Panel field today.\nWhen to fill it: There is no working scenario where filling this field changes the node's behavior for any resource's Create/Update; supply the real, resource-specific fields instead via workflow JSON or an AI-generated workflow.\nWhat to enter: Nothing is required here - whatever JSON you type is not used.\nWhere the value comes from: Not applicable - this field is not wired to any request body today.\nHow to use it later: Not applicable - this value never appears in {{$json.data}} (the output's own data key holds Pipedrive's response, unrelated to this input field of the same name).\nAccepted format: Valid JSON, though format has no effect since the value is unused.\nReal workplace example: None - use the resource-specific fields (for example personName, personEmail) instead.\nIf it is empty or wrong: Nothing changes either way; the real per-resource required-field errors (like \"Pipedrive node: personName is required for create operation\") fire regardless of what this field contains.\nCommon mistake: Assuming this field works like HubSpot's or ActiveCampaign's generic Properties/Data field - Pipedrive's real implementation uses individually-named fields per resource instead of one shared JSON blob.",
  placeholder: '{"name":"John Doe","email":[{"value":"test@example.com","primary":true}]}',
};

const termField: FieldDoc = {
  name: 'Search Term',
  internalKey: 'term',
  type: 'text',
  required: false,
  description: 'A field shown in the node editor that the execution engine never reads - Search instead reads a field named searchTerm.',
  helpText: "What this field is: A Search Term box in the node editor, labeled as required for the search operation.\nWhy it matters: The execution engine's Search branches all read a config value named searchTerm, never term - filling this field has zero effect on any resource's Search operation.\nWhen to fill it: There is no working scenario where filling this field changes the node's behavior; supply searchTerm instead via workflow JSON or an AI-generated workflow.\nWhat to enter: Nothing is required here - whatever you type is not sent to Pipedrive.\nWhere the value comes from: Not applicable today.\nHow to use it later: Not applicable - this value never appears in the output.\nAccepted format: Freeform text, but format has no effect since the value is unused.\nReal workplace example: None - use the searchTerm key instead.\nIf it is empty or wrong: Nothing changes either way; Search still returns {{$json._error}} = \"Pipedrive node: searchTerm is required for search operation\" if the real searchTerm key is also missing.\nCommon mistake: Filling this field and assuming Search will now work - it needs a config value named searchTerm, which has no Properties Panel field today.",
  placeholder: 'test@example.com',
  example: 'test@example.com',
};

const fieldsField: FieldDoc = {
  name: 'Fields (comma-separated)',
  internalKey: 'fields',
  type: 'text',
  required: false,
  description: 'A field shown in the node editor that the execution engine never reads - Search instead reads a JSON array named searchFields.',
  helpText: "What this field is: A comma-separated Fields box in the node editor, intended to narrow which fields Search matches against.\nWhy it matters: The execution engine's Search branches all read a JSON array config value named searchFields (not a comma-separated string named fields) - filling this field has zero effect.\nWhen to fill it: There is no working scenario where filling this field changes the node's behavior; supply a searchFields JSON array instead via workflow JSON or an AI-generated workflow.\nWhat to enter: Nothing is required here - whatever you type is not sent to Pipedrive.\nWhere the value comes from: Not applicable today.\nHow to use it later: Not applicable - this value never appears in the output.\nAccepted format: Freeform text, but format has no effect since the value is unused.\nReal workplace example: None - use a searchFields JSON array (for example [\"email\"]) instead.\nIf it is empty or wrong: Nothing changes either way - Search runs against Pipedrive's own default searchable fields when searchFields is not supplied.\nCommon mistake: Typing a comma-separated list here expecting it to narrow the search - the real field expects a JSON array under a completely different key (searchFields).",
  placeholder: 'id,name,email',
};

const limitField: FieldDoc = {
  name: 'Limit',
  internalKey: 'limit',
  type: 'number',
  required: false,
  description: 'Maximum number of records to return for list-style operations. This field works correctly.',
  helpText: "What this field is: The maximum number of records this node asks Pipedrive for in one listing request.\nWhy it matters: Unlike most other fields on this node, Limit is read correctly by the real runtime for every resource that supports listing (Person, Organization, Deal, Activity, Product) - it genuinely controls how many records come back.\nWhen to fill it: Optional whenever the underlying operation is list (reached via workflow JSON/AI generation, since the \"Get Many\" dropdown value itself does not work - see the Operation field's notes).\nWhat to enter: A whole number representing how many records you want per run.\nWhere the value comes from: Type it directly based on how many records you realistically need per run.\nHow to use it later: The array inside {{$json.data}} will contain at most this many records.\nAccepted format: A positive whole number.\nReal workplace example: 100 to pull a manageable batch of deals for a nightly sync.\nIf it is empty or wrong: Left empty, Pipedrive applies its own default page size.\nCommon mistake: Assuming this field also works for the Get Many dropdown option - Limit itself is real and correctly wired, but it only has an effect once the underlying operation value is genuinely list, which the Get Many dropdown option does not produce.",
  placeholder: '100',
  defaultValue: '100',
};

const startField: FieldDoc = {
  name: 'Start (Pagination)',
  internalKey: 'start',
  type: 'number',
  required: false,
  description: 'Pagination offset for list-style operations. This field works correctly.',
  helpText: "What this field is: The number of matching records to skip before Pipedrive starts returning results, for listing operations.\nWhy it matters: Like Limit, Start is genuinely read by the real runtime for every resource that supports listing - combined with Limit, it lets a workflow page through records in batches.\nWhen to fill it: Optional whenever the underlying operation is list (see the Operation field's notes about reaching this value).\nWhat to enter: A whole number - 0 for the first page, Limit for the second page, and so on.\nWhere the value comes from: Computed by a Loop node that increments this value by Limit on each iteration.\nHow to use it later: Not applicable to this node's own output - it only affects which slice of records {{$json.data}} contains on this run.\nAccepted format: A non-negative whole number.\nReal workplace example: Set Limit to 100 and Start to {{$json.pageNumber * 100}} inside a Loop node to page through a large deals list.\nIf it is empty or wrong: Left empty, this defaults to 0 (the first page).\nCommon mistake: Assuming this field also works for the Get Many dropdown option - Start itself is real and correctly wired, but only takes effect once the underlying operation value is genuinely list.",
  placeholder: '0',
  defaultValue: '0',
};

const sharedFields: FieldDoc[] = [operationField, resourceField, apiTokenField, companyDomainField, credentialIdField];

const getOperation: OperationDoc = {
  name: 'Get',
  value: 'get',
  description: 'Fetches one existing Pipedrive record by its resource-specific ID (for example personId for Person, dealId for Deal). This node\'s generic "Resource ID" field is never read - the real ID key must be supplied via workflow JSON or an AI-generated workflow, using the exact key name for the chosen Resource (see the Resource field\'s Notes).',
  fields: [...sharedFields, idField],
  outputExample: {
    success: true,
    data: { id: 1, name: 'Alice Chen', email: [{ value: 'alice@example.com', primary: true }] },
  },
  outputDescription: 'success: true when Pipedrive accepted the request. data: the full raw Pipedrive record for the requested Resource and ID. _error: present only when the request failed, for example "Pipedrive node: personId is required for get operation". _errorDetails: present on Pipedrive API-level failures, holding the raw {error, error_info} from Pipedrive.',
  usageExample: {
    scenario: 'A sales workflow fetches the full details of one specific Pipedrive contact right before drafting a personalized follow-up.',
    inputValues: { resource: 'person', operation: 'get', apiToken: '' },
    expectedOutput: 'Pipedrive returns the contact as {{$json.data}}, so a later step can read {{$json.data.email}}.',
  },
  externalDocsUrl: 'https://developers.pipedrive.com/docs/api/v1/Persons#getPerson',
};

const listOperation: OperationDoc = {
  name: 'List (real value; "Get Many" dropdown label does not work)',
  value: 'list',
  description: 'Fetches multiple Pipedrive records of the chosen Resource. Important: this is the real underlying operation value - the "Get Many" option shown in the visual Operation dropdown does not match it and always fails; set this value via workflow JSON or an AI-generated workflow instead.',
  fields: [...sharedFields, limitField, startField],
  outputExample: {
    success: true,
    data: [
      { id: 1, name: 'Alice Chen' },
      { id: 2, name: 'Bob Smith' },
    ],
  },
  outputDescription: 'success: true when Pipedrive accepted the request. data: the array of matching Pipedrive records for this page, honoring Limit/Start. _error: present only when the request failed, for example an authentication problem. _errorDetails: present on Pipedrive API-level failures.',
  usageExample: {
    scenario: 'A sales reporting workflow pulls a batch of Pipedrive deals every hour to build a pipeline summary.',
    inputValues: { resource: 'deal', operation: 'list', apiToken: '', limit: '100' },
    expectedOutput: 'Pipedrive returns matching records as {{$json.data}}, which a Loop node can iterate.',
  },
  externalDocsUrl: 'https://developers.pipedrive.com/docs/api/v1/Deals#getDeals',
};

const createOperation: OperationDoc = {
  name: 'Create',
  value: 'create',
  description: 'Creates a new Pipedrive record on the chosen Resource, using that resource\'s own individually-named fields (for example personName/personEmail/personPhone for Person). This node\'s generic "Data (JSON)" field is never read for Create - see the Resource field\'s Notes for every resource\'s real field names.',
  fields: [...sharedFields, dataField],
  outputExample: {
    success: true,
    data: { id: 3, name: 'Acme Corp', add_time: '2026-07-19 00:00:00' },
  },
  outputDescription: 'success: true when Pipedrive accepted the create request. data: the full raw Pipedrive record Pipedrive created and returned, including its new id. _error: present only when the request failed, for example "Pipedrive node: personName is required for create operation". _errorDetails: present on Pipedrive API-level failures.',
  usageExample: {
    scenario: 'A signup-form workflow creates a new Pipedrive contact for every visitor who submits their name and email.',
    inputValues: { resource: 'person', operation: 'create', apiToken: '' },
    expectedOutput: 'Pipedrive returns the new contact as {{$json.data}}, including {{$json.data.id}} for use in a later Update step.',
  },
  externalDocsUrl: 'https://developers.pipedrive.com/docs/api/v1/Persons#addPerson',
};

const updateOperation: OperationDoc = {
  name: 'Update',
  value: 'update',
  description: 'Updates an existing Pipedrive record identified by its resource-specific ID, using that resource\'s own individually-named fields. This node\'s generic "Resource ID" and "Data (JSON)" fields are never read for Update - see the Resource field\'s Notes.',
  fields: [...sharedFields, idField, dataField],
  outputExample: {
    success: true,
    data: { id: 3, name: 'Acme Corp Updated' },
  },
  outputDescription: 'success: true when Pipedrive accepted the update request. data: the full raw Pipedrive record after the change. _error: present only when the request failed, for example "Pipedrive node: orgId is required for update operation". _errorDetails: present on Pipedrive API-level failures.',
  usageExample: {
    scenario: 'A billing workflow updates a Pipedrive deal\'s stage after a payment is confirmed in an external system.',
    inputValues: { resource: 'deal', operation: 'update', apiToken: '' },
    expectedOutput: 'Pipedrive returns the changed record as {{$json.data}}.',
  },
  externalDocsUrl: 'https://developers.pipedrive.com/docs/api/v1/Deals#updateDeal',
};

const deleteOperation: OperationDoc = {
  name: 'Delete',
  value: 'delete',
  description: 'Permanently deletes an existing Pipedrive record identified by its resource-specific ID. This node\'s generic "Resource ID" field is never read - see the Resource field\'s Notes for the real ID key per resource. Not supported for the Pipeline resource.',
  fields: [...sharedFields, idField],
  outputExample: {
    success: true,
    data: { id: 3 },
  },
  outputDescription: 'success: true when Pipedrive accepted the delete request. data: Pipedrive\'s own delete confirmation, typically just the deleted record\'s id. _error: present only when the request failed, for example "Pipedrive node: dealId is required for delete operation". _errorDetails: present on Pipedrive API-level failures.',
  usageExample: {
    scenario: 'A data-cleanup workflow removes duplicate test contacts created accidentally during an integration test run.',
    inputValues: { resource: 'person', operation: 'delete', apiToken: '' },
    expectedOutput: 'Pipedrive confirms removal, echoed as {{$json.data.id}}.',
  },
  externalDocsUrl: 'https://developers.pipedrive.com/docs/api/v1/Persons#deletePerson',
};

const searchOperation: OperationDoc = {
  name: 'Search',
  value: 'search',
  description: 'Finds Pipedrive records matching a text term. This node\'s generic "Search Term"/"Fields" fields are never read - the real runtime reads searchTerm/searchFields/exactMatch instead (see the Search Term field\'s notes). Not supported for Activity, Note, Pipeline, Stage, Lead, File, or Webhook resources.',
  fields: [...sharedFields, termField, fieldsField],
  outputExample: {
    success: true,
    data: {
      items: [
        { item: { id: 1, name: 'Alice Chen' } },
      ],
    },
  },
  outputDescription: 'success: true when Pipedrive accepted the search request. data: Pipedrive\'s own search response shape, typically an object containing an items array of matches. _error: present only when the request failed, for example "Pipedrive node: searchTerm is required for search operation". _errorDetails: present on Pipedrive API-level failures.',
  usageExample: {
    scenario: 'A support workflow looks up the exact Pipedrive contact by email before creating a related activity.',
    inputValues: { resource: 'person', operation: 'search', apiToken: '' },
    expectedOutput: 'Pipedrive returns matching records inside {{$json.data.items}}.',
  },
  externalDocsUrl: 'https://developers.pipedrive.com/docs/api/v1/SearchResults#searchPersons',
};

export const pipedriveDoc: NodeDoc = {
  slug: 'pipedrive',
  displayName: 'Pipedrive',
  category: 'CRM',
  logoUrl: '/icons/nodes/pipedrive.svg',
  description: 'Get, list, create, update, delete, or search Pipedrive deals, persons, organizations, and more. Note: this node supports 11 real resources with individually-named fields, but the visual panel\'s generic Resource ID/Data/Search fields are never read for any of them - see the Resource field for the real per-resource field names.',
  credentialType: 'Pipedrive API Token',
  credentialSetupSteps: [
    'What this is: The Pipedrive connection lets CtrlChecks store your Pipedrive API Token safely in Connections, instead of pasting it into every workflow that uses Pipedrive.',
    'Where to start: Log in to Pipedrive, go to Settings -> Personal Preferences -> API, and copy your personal API Token.',
    'How to connect: In CtrlChecks, open Connections -> Add Connection -> Pipedrive, then paste the API Token. CtrlChecks tests the credential with GET https://api.pipedrive.com/v1/users/me.',
    'Once saved, the connection is injected automatically into the node\'s API Token field at run time - you do not need to fill it directly. The Company Domain field in the visible panel is not used for this or anything else - Pipedrive\'s API is reached at a single global address using only the token.',
    'Important: Treat the API Token like a bank password. Store it in Connections, not in a plain workflow field, and never share it outside CtrlChecks.',
    'Test it: Save the connection, add a Pipedrive node with Resource set to person and Operation set to get (supplying a real personId via workflow JSON, since the visual panel\'s generic Resource ID field is not read), run it, and confirm CtrlChecks returns real Pipedrive contact data instead of an authentication error.',
    'Connect the Pipedrive output to a logging, If/Else, or follow-up node when later steps should inspect {{$json.data}}. Downstream service node account connection setup is still required for nodes after Pipedrive; this connection only authorizes Pipedrive CRM operations.',
  ],
  credentialDocsUrl: 'https://developers.pipedrive.com/docs/api/v1',
  resources: [
    {
      name: 'Operations',
      description: 'Pipedrive CRM actions. This node supports 11 real resources (person, organization, deal, activity, note, pipeline, stage, product, lead, file, webhook), each with its own ID and create/update field names - see the Resource field for the complete list. Only 8 of the 11 resources are selectable in the visual Resource dropdown, and none of the generic Resource ID/Data/Search Term/Fields inputs are actually read by the runtime for any resource; the operations below are documented using Person (the panel\'s default Resource) as the fully worked example.',
      operations: [getOperation, listOperation, createOperation, updateOperation, deleteOperation, searchOperation],
    },
  ],
  commonErrors: [
    {
      error: 'Pipedrive node: API Token is required',
      cause: 'No API Token was typed on the node and no Pipedrive connection is saved in Connections for this workflow/user.',
      fix: 'Connect Pipedrive in CtrlChecks -> Connections -> Pipedrive, or paste an API Token directly into the node for a quick test.',
    },
    {
      error: 'Pipedrive node: Unsupported resource "user"',
      cause: 'The Resource dropdown was set to User, which appears in the dropdown but does not exist in the execution engine.',
      fix: 'Choose Person, Organization, Deal, Note, Activity, Product, Pipeline, or Stage instead - Pipedrive team-member management is not supported by this node.',
    },
    {
      error: 'Pipedrive node: Unsupported operation "getMany" for resource "person"',
      cause: 'The Operation dropdown was set to Get Many, whose real underlying value ("getMany") never matches the runtime\'s expected value ("list") for any resource.',
      fix: 'Set the underlying operation value to list via workflow JSON or an AI-generated workflow, since "Get Many" cannot currently be reached from the visual dropdown.',
    },
    {
      error: 'Pipedrive node: personId is required for get operation',
      cause: 'Get, Update, or Delete was run without the resource-specific ID field set (for example personId for Person, dealId for Deal) - filling the generic "Resource ID" field does not count, since it is never read.',
      fix: 'Set the exact resource-specific ID key (see the Resource field\'s notes for the full list) via workflow JSON or an AI-generated workflow.',
    },
    {
      error: 'Pipedrive node: personName is required for create operation',
      cause: 'Create was run without the resource-specific required field set (for example personName for Person, dealTitle for Deal, orgName for Organization) - filling the generic "Data (JSON)" field does not count.',
      fix: 'Set the exact resource-specific field keys (see the Resource field\'s notes for the full list) via workflow JSON or an AI-generated workflow.',
    },
    {
      error: 'Pipedrive API error: <message>',
      cause: 'Pipedrive itself rejected the request - common causes are an invalid or already-used value, a missing required Pipedrive-side field, or insufficient API Token permissions.',
      fix: 'Check the {{$json._errorDetails}} object for Pipedrive\'s own error and error_info text, and confirm the connected API Token belongs to a user with access to the resource being changed.',
    },
  ],
  relatedNodes: [],
};
