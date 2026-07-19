import type { NodeDoc } from '../types';

const operationHelpText = `What this field means: Operation chooses which Google Tasks action this node performs.

Why it matters: It decides which Google Tasks API call runs and which other fields become required.

When to fill it: Choose it first, before filling any other field.

What to enter: Choose read to fetch every task in a list (or one task when Task ID is filled), create to add a new task, update to change a task (including marking it complete via Status), or delete to remove a task.

Where the value comes from: This is a fixed dropdown choice made while building the workflow.

How to use it later: read/create/update return the affected task under {{$json.data}}; delete returns {{$json.data.deleted}} and {{$json.data.taskId}}.

Accepted format: One of read, create, update, or delete from the dropdown.

Real workplace example: Use read to pull today's task list into a morning digest, create when a new action item is captured from a meeting, update to check off a finished task, and delete to remove a cancelled one.

If it is empty or wrong: Runtime defaults to read when missing, and returns "Unsupported Google Tasks operation" for any other value.

Common mistake: Choosing update to mark a task complete but forgetting to set Status to Completed — without it, update only changes whichever other fields (title/notes/due) you filled in.

Dropdown options: read fetches tasks and needs only Task List ID (leave Task ID empty for every task, or fill it for one specific task). create adds a new task and needs Task Title, with optional Notes and Due Date. update changes a task and needs Task ID plus whichever of Title, Notes, Due Date, or Status is changing. delete removes a task and needs Task ID only.`;

const taskListIdHelpText = `What this field means: Task List ID identifies which Google Tasks list this node reads from or writes to.

Why it matters: A Google account can have several separate task lists (not just one); this tells the API which one to use.

When to fill it: Optional for every operation — defaults to the account's primary list.

What to enter: @default for the primary list, or a specific task list's ID for a secondary list.

Where the value comes from: @default always works for the main list. For a secondary list, its ID is only available via the Tasks API's task list listing (not currently exposed as its own node operation here).

How to use it later: This is not echoed back as its own output field, but it determines which list the returned task(s) belong to.

Accepted format: The literal @default, or a Google Tasks list ID string.

Real workplace example: Use @default for personal to-dos, or a dedicated list ID for a shared team task list if one has been set up.

If it is empty or wrong: Empty defaults to @default automatically. A wrong or inaccessible list ID returns a Google Tasks API error.

Common mistake: Assuming task lists other than @default are automatically available — most workspaces only use the single default list unless additional lists were deliberately created.`;

const taskIdHelpText = `What this field means: Task ID identifies the specific task this Read, Update, or Delete operation should act on.

Why it matters: Tasks needs to know exactly which task to fetch, change, or remove.

When to fill it: Required for update and delete. Optional for read — leave it empty to fetch every task in the list instead of just one. Not used for create (a new ID is generated automatically).

What to enter: Map {{$json.data.id}} from a previous Read/Create/Update step's output.

Where the value comes from: A previous Google Tasks step's output includes id for each task; runtime also automatically checks several common upstream shapes for a usable ID if this field is left as a template that didn't resolve.

How to use it later: The same ID is echoed back inside {{$json.data.id}} after create/update, and at {{$json.data.taskId}} after delete.

Accepted format: A Google Tasks task ID string.

Real workplace example: Loop over {{$json.data.items}} from a Read step and use each item's {{$json.data.items[].id}} to update or delete that specific task.

If it is empty or wrong: Runtime returns "taskId is required for update" or "...for delete" when it cannot resolve an ID. A wrong or already-deleted ID returns a Google Tasks API error.

Common mistake: Using a task list ID here instead of a task ID — Task List ID identifies the list, Task ID identifies one task inside it.`;

const titleHelpText = `What this field means: Task Title is the short one-line description of the task shown in Google Tasks.

Why it matters: It is the primary text people see when scanning their task list.

When to fill it: Required for create. Optional for update — only include it if the title is changing.

What to enter: A short, clear action item, optionally including mapped details.

Where the value comes from: Type it directly, or map it from an earlier step such as a meeting-notes action item or a support ticket subject.

How to use it later: The saved title is echoed back at {{$json.data.title}} after create/update/read.

Accepted format: Plain text.

Real workplace example: "Follow up with {{$json.customerName}} about invoice {{$json.invoiceNumber}}".

If it is empty or wrong: Runtime returns "title is required for create" when blank for create. Update without a value simply keeps the existing title.

Common mistake: Writing a vague title like "Follow up" with no name or reference, making it hard to act on later without opening the task's Notes.`;

const notesHelpText = `What this field means: Notes holds longer details for the task, beyond the short Title.

Why it matters: It gives context, links, or instructions that don't fit in a one-line title.

When to fill it: Optional for create and update.

What to enter: Any additional detail — background, a link, or step-by-step instructions.

Where the value comes from: Type it directly, or map it from an earlier step, such as an AI-generated summary or a form's comments field.

How to use it later: The saved notes are echoed back at {{$json.data.notes}} after create/update/read.

Accepted format: Plain text.

Real workplace example: "Customer reported invoice #{{$json.invoiceNumber}} was billed twice. Check Stripe before responding."

If it is empty or wrong: Empty is fine and simply leaves the task without extra detail.

Common mistake: Leaving Notes empty for tasks that need real context, forcing whoever picks up the task to go dig for background elsewhere.`;

const dueHelpText = `What this field means: Due Date is the calendar day this task should be completed by.

Why it matters: It lets Google Tasks show overdue and upcoming tasks correctly.

When to fill it: Optional for create and update.

What to enter: A local calendar date such as 2026-12-31.

Where the value comes from: Type it directly using the date picker, or map a date from an earlier step, such as an SLA deadline.

How to use it later: The saved date is echoed back at {{$json.data.due}} after create/update/read.

Accepted format: A calendar date (YYYY-MM-DD). Google Tasks only stores the day — any time-of-day portion is not saved by the Google Tasks API.

Real workplace example: "2026-03-01" for a task tied to a month-end deadline.

If it is empty or wrong: Empty is fine and leaves the task with no due date. An unparseable value returns "Google Tasks due date must be a calendar date, for example 2026-12-31".

Common mistake: Expecting a specific due time (like 3pm) to be preserved — Google Tasks only keeps the calendar day, not the time.`;

const statusHelpText = `What this field means: Status marks whether a task still needs action or has been completed.

Why it matters: It is how a task gets checked off (or reopened) in Google Tasks — simply editing the title or notes does not mark it done.

When to fill it: Optional; only used for update.

What to enter: Choose Completed to check the task off, or Needs Action to reopen a previously completed task.

Where the value comes from: This is a fixed workflow design choice, often driven by upstream logic such as an approval or completion event.

How to use it later: The saved status is echoed back at {{$json.data.status}}, and completing a task also sets {{$json.data.completed}} to the completion timestamp automatically.

Accepted format: One of needsAction or completed.

Real workplace example: Set to completed automatically when an If/Else step detects an order has shipped, closing the matching "Ship order" task.

If it is empty or wrong: Leaving it empty simply does not change the task's completion state — other fields you filled in (title/notes/due) still update normally.

Common mistake: Expecting to set a custom completion timestamp — Google Tasks always records the moment the API call runs as the completion time, not a value you provide.

Dropdown options: needsAction marks (or keeps) the task open/incomplete. completed checks the task off and automatically stamps the current time as when it was completed.`;

export const googleTasksDoc: NodeDoc = {
  slug: 'google_tasks',
  displayName: 'Google Tasks',
  category: 'Google',
  logoUrl: '/icons/nodes/google_tasks.svg',
  description: 'Read, create, update, and delete Google Tasks through the connected Google account, including marking tasks complete.',
  credentialType: 'Google OAuth (Tasks scope) - saved in Connections and shared with other Google nodes',
  credentialSetupSteps: [
    'In CtrlChecks, open Connections -> Add Connection -> Google, sign in with the Google account whose tasks this node should manage, and grant the Tasks permission requested.',
    'The OAuth token is stored in the credential system. Do not paste Google tokens, client secrets, or passwords into Google Tasks workflow fields.',
    'The connected Google account needs its normal Tasks access — there is no separate sharing step like Sheets/Docs/Drive, since Tasks lists belong to the account itself.',
    'The same Google connection can also power Gmail, Google Sheets, and Google Calendar nodes if those scopes are granted.',
    'Connect the Google Tasks output to a logging, If/Else, error-handling, or follow-up node when later steps should inspect {{$json.data}} or {{$json._error}}.',
    'Downstream service node account connection setup is still required for nodes after Google Tasks; the Google connection only authorizes Tasks (and optionally Gmail/Sheets/Calendar) access.',
  ],
  credentialDocsUrl: 'https://developers.google.com/tasks/auth',
  resources: [
    {
      name: 'Task',
      description: 'Read, create, update, or delete a Google Task.',
      operations: [
        {
          name: 'Read',
          value: 'read',
          description: 'Fetches every task in a list (Task ID empty) or one specific task (Task ID filled), for reporting, digests, or downstream loops.',
          fields: [
            { name: 'Operation', internalKey: 'operation', type: 'select', required: true, description: 'Google Tasks action to run.', helpText: operationHelpText, placeholder: 'read', example: 'read', defaultValue: 'read', options: ['read', 'create', 'update', 'delete'] },
            { name: 'Task List Id', internalKey: 'taskListId', type: 'string', required: false, description: 'Which task list to use.', helpText: taskListIdHelpText, placeholder: '@default', example: '@default', defaultValue: '@default' },
            { name: 'Task Id', internalKey: 'taskId', type: 'string', required: false, description: 'Optional: fetch one specific task instead of the whole list.', helpText: taskIdHelpText, placeholder: 'abc123def456', example: '' },
          ],
          outputExample: {
            operation: 'read',
            data: {
              items: [
                { id: 'task1', title: 'Follow up with vendor', status: 'needsAction', due: '2026-03-01T00:00:00.000Z' },
                { id: 'task2', title: 'Send invoice', status: 'completed', completed: '2026-02-20T10:00:00.000Z' },
              ],
            },
          },
          outputDescription: 'operation: echoes back "read". data.items: array of task objects when Task Id is empty. When Task Id is filled, data is a single task object instead (id, title, notes, due, status, completed). Failures return _error, _errorCode ("GOOGLE_TASKS_FAILED"), and _errorDetails instead.',
          usageExample: {
            scenario: 'Pull today\'s open tasks into a morning team digest message',
            inputValues: { operation: 'read', taskListId: '@default', taskId: '' },
            expectedOutput: 'Returns every task in the list. Loop over {{$json.data.items}} and map {{$json.data.items[].title}} into a Slack or Email digest.',
          },
          externalDocsUrl: 'https://developers.google.com/tasks/reference/rest/v1/tasks/list',
        },
        {
          name: 'Create',
          value: 'create',
          description: 'Adds a new task to a task list, given a Title and optional Notes/Due Date, returning the new task\'s ID for later updates.',
          fields: [
            { name: 'Operation', internalKey: 'operation', type: 'select', required: true, description: 'Google Tasks action to run.', helpText: operationHelpText, placeholder: 'create', example: 'create', defaultValue: 'read', options: ['read', 'create', 'update', 'delete'] },
            { name: 'Task List Id', internalKey: 'taskListId', type: 'string', required: false, description: 'Which task list to add the task to.', helpText: taskListIdHelpText, placeholder: '@default', example: '@default', defaultValue: '@default' },
            { name: 'Task Title', internalKey: 'title', type: 'string', required: true, description: 'The task title.', helpText: titleHelpText, placeholder: 'Complete project report', example: 'Follow up with {{$json.customerName}}' },
            { name: 'Notes', internalKey: 'notes', type: 'textarea', required: false, description: 'Optional longer detail for the task.', helpText: notesHelpText, placeholder: 'Task notes...', example: '{{$json.details}}' },
            { name: 'Due Date', internalKey: 'due', type: 'string', required: false, description: 'Optional calendar day the task is due.', helpText: dueHelpText, placeholder: '2026-12-31', example: '2026-03-01' },
          ],
          outputExample: {
            operation: 'create',
            data: { id: 'newTask789', title: 'Follow up with Acme Corp', notes: 'Discuss renewal terms', due: '2026-03-01T00:00:00.000Z', status: 'needsAction' },
          },
          outputDescription: 'operation: echoes back "create". data: the newly created task object — data.id is needed for later Update/Delete steps, data.title/notes/due/status hold what was saved. Failures return _error, _errorCode ("GOOGLE_TASKS_FAILED"), and _errorDetails instead.',
          usageExample: {
            scenario: 'Create a follow-up task automatically after a sales call is logged',
            inputValues: { operation: 'create', title: 'Follow up with {{$json.customerName}}', notes: '{{$json.callSummary}}', due: '{{$json.followUpDate}}' },
            expectedOutput: 'A new task appears in Google Tasks. Save {{$json.data.id}} to mark it complete or update it later.',
          },
          externalDocsUrl: 'https://developers.google.com/tasks/reference/rest/v1/tasks/insert',
        },
        {
          name: 'Update',
          value: 'update',
          description: 'Changes an existing task\'s title, notes, due date, and/or completion status, identified by Task ID — only the fields you fill in are changed.',
          fields: [
            { name: 'Operation', internalKey: 'operation', type: 'select', required: true, description: 'Google Tasks action to run.', helpText: operationHelpText, placeholder: 'update', example: 'update', defaultValue: 'read', options: ['read', 'create', 'update', 'delete'] },
            { name: 'Task List Id', internalKey: 'taskListId', type: 'string', required: false, description: 'Which task list the task is on.', helpText: taskListIdHelpText, placeholder: '@default', example: '@default', defaultValue: '@default' },
            { name: 'Task Id', internalKey: 'taskId', type: 'string', required: true, description: 'Which task to update.', helpText: taskIdHelpText, placeholder: 'abc123def456', example: '{{$json.data.id}}' },
            { name: 'Task Title', internalKey: 'title', type: 'string', required: false, description: 'New title, if changing.', helpText: titleHelpText, placeholder: 'Complete project report', example: '' },
            { name: 'Notes', internalKey: 'notes', type: 'textarea', required: false, description: 'New notes, if changing.', helpText: notesHelpText, placeholder: 'Task notes...', example: '' },
            { name: 'Due Date', internalKey: 'due', type: 'string', required: false, description: 'New due date, if changing.', helpText: dueHelpText, placeholder: '2026-12-31', example: '' },
            { name: 'Status', internalKey: 'status', type: 'select', required: false, description: 'Mark the task complete or reopen it.', helpText: statusHelpText, placeholder: 'completed', example: 'completed', options: ['needsAction', 'completed'] },
          ],
          outputExample: {
            operation: 'update',
            data: { id: 'task1', title: 'Follow up with Acme Corp', status: 'completed', completed: '2026-02-25T09:00:00.000Z' },
          },
          outputDescription: 'operation: echoes back "update". data: the updated task object, reflecting the new values — data.status/data.completed confirm completion state. Failures return _error, _errorCode ("GOOGLE_TASKS_FAILED"), and _errorDetails instead.',
          usageExample: {
            scenario: 'Mark a task complete automatically when its related order ships',
            inputValues: { operation: 'update', taskId: '{{$json.data.id}}', status: 'completed' },
            expectedOutput: 'The task is checked off. Use {{$json.data.completed}} to confirm when it was marked done.',
          },
          externalDocsUrl: 'https://developers.google.com/tasks/reference/rest/v1/tasks/patch',
        },
        {
          name: 'Delete',
          value: 'delete',
          description: 'Permanently removes a task from a task list, identified by Task ID — there is no undo once this runs.',
          fields: [
            { name: 'Operation', internalKey: 'operation', type: 'select', required: true, description: 'Google Tasks action to run.', helpText: operationHelpText, placeholder: 'delete', example: 'delete', defaultValue: 'read', options: ['read', 'create', 'update', 'delete'] },
            { name: 'Task List Id', internalKey: 'taskListId', type: 'string', required: false, description: 'Which task list the task is on.', helpText: taskListIdHelpText, placeholder: '@default', example: '@default', defaultValue: '@default' },
            { name: 'Task Id', internalKey: 'taskId', type: 'string', required: true, description: 'Which task to delete.', helpText: taskIdHelpText, placeholder: 'abc123def456', example: '{{$json.data.id}}' },
          ],
          outputExample: { operation: 'delete', data: { deleted: true, taskId: 'task1' } },
          outputDescription: 'operation: echoes back "delete". data.deleted: true once the task is removed. data.taskId: the identifier that was deleted, echoed back for confirmation. Failures return _error, _errorCode ("GOOGLE_TASKS_FAILED"), and _errorDetails instead.',
          usageExample: {
            scenario: 'Remove a task automatically when its related ticket is cancelled',
            inputValues: { operation: 'delete', taskId: '{{$json.data.id}}' },
            expectedOutput: 'The task is removed from Google Tasks. Use {{$json.data.deleted}} to confirm before logging the deletion.',
          },
          externalDocsUrl: 'https://developers.google.com/tasks/reference/rest/v1/tasks/delete',
        },
      ],
    },
  ],
  commonErrors: [
    { error: 'Google OAuth token not found', cause: 'Neither the workflow owner nor the current user has a Google account connected with Tasks scope.', fix: 'Open Connections, add a Google connection, and grant the Tasks permission requested.' },
    { error: 'title is required for create', cause: 'Task Title resolved to empty for a create operation.', fix: 'Fill Task Title or map it from an earlier step\'s output.' },
    { error: 'taskId is required for update', cause: 'Task Id could not be resolved for an update operation, from either this field or upstream data.', fix: 'Fill Task Id or map {{$json.data.id}} from a previous Read/Create step.' },
    { error: 'taskId is required for delete', cause: 'Task Id could not be resolved for a delete operation.', fix: 'Fill Task Id or map {{$json.data.id}} from a previous Read/Create step.' },
    { error: 'Google Tasks due date must be a calendar date, for example 2026-12-31', cause: 'Due Date resolved to a value that is not a recognizable calendar date.', fix: 'Use a plain date such as 2026-12-31, or map a valid date value from an earlier step.' },
    { error: 'Unsupported Google Tasks operation', cause: 'Operation holds a value other than read, create, update, or delete.', fix: 'Choose one of the four supported operations from the dropdown.' },
    { error: 'Next node cannot find task fields', cause: 'The downstream node expects fields spread at the top level, but Google Tasks only nests them under data.', fix: 'Use {{$json.data.id}}, {{$json.data.title}}, {{$json.data.status}}, or {{$json.data.items}} — never a bare {{$json.id}} or {{$json.title}}.' },
    { error: 'Permission denied after Google Tasks', cause: 'The Google connection only authorizes Tasks (and optionally Gmail/Sheets/Calendar) access; downstream service nodes still need their own account connections and permissions.', fix: 'Connect the required account on the downstream service node and confirm that provider permission separately from Google Tasks.' },
  ],
  relatedNodes: ['google_calendar', 'google_gmail', 'ai_agent', 'http_request'],
};
