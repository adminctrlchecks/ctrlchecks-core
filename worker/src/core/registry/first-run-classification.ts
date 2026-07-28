/**
 * First-run classification — what an operation does to the outside world.
 *
 * Drives whether the wizard's first run may execute a node automatically (plan §2.1).
 *
 * **This is data, not branching logic.** There is no `switch (node.type)` here: lookups
 * are table reads, which keeps the CLAUDE.md single-source-of-truth rule intact while
 * letting the classification live next to the registry it describes.
 *
 * Resolution order (implemented in `core/execution/first-run-policy.ts`):
 *   1. `firstRunClass` on the node's own NodeOperationContract, if the contract sets it
 *   2. a per-node override in FIRST_RUN_CLASS_OVERRIDES
 *   3. the node-level default in NODE_DEFAULT_FIRST_RUN_CLASS (nodes with no operations)
 *   4. the operation verb in OPERATION_VERB_CLASS
 *   5. **'write'** — never 'none'
 *
 * The default matters more than any entry below: an unclassified operation is treated as
 * consequential and never auto-runs, so forgetting to classify something over-protects
 * rather than causing an unwanted side effect.
 */

export type FirstRunClass = 'none' | 'read' | 'write' | 'destructive';

/**
 * Deletes/archives, payments/refunds, and bulk overwrite/truncate — the settled
 * deny-list. Matched against the operation name, case-insensitively.
 */
const DESTRUCTIVE_VERBS = [
  'delete',
  'deleteone',
  'deletemany',
  'deleterecord',
  'delete_entry',
  'delete_post',
  'destroy',
  'remove',
  'archive',
  'purge',
  'truncate',
  'drop',
  'cancel',
  'cancel_subscription',
  'refund',
  'charge',
  'payment',
  'pay',
  'batchdelete',
  'bulkdelete',
  'overwrite',
  'unsubscribe',
  'revoke',
];

/** Fetches data without changing anything. */
const READ_VERBS = [
  'read',
  'get',
  'list',
  'find',
  'search',
  'query',
  'select',
  'fetch',
  'download',
  'getmany',
  'getrecord',
  'getrecords',
  'getentries',
  'getentry',
  'get_entries',
  'get_entry',
  'get_events',
  'get_event_types',
  'get_scheduled_events',
  'get_user',
  'get_profile',
  'get_issue',
  'get_teams',
  'list_issues',
  'list_repos',
  'get_deploy',
  'get_site',
  'list_deploys',
  'list_sites',
  'get_customer',
  'getcustomers',
  'getinvoices',
  'gettasks',
  'get_tasks_list',
  'get_tasks_space',
  'getmedia',
  'getrecentmedia',
  'status',
  'gettimezoneinfo',
  'parse',
  'extract',
  'totext',
  'now',
  'format',
  'diff',
  'converttimezone',
];

/** Pure computation / control flow — nothing leaves the system at all. */
const NONE_VERBS = [
  'avg',
  'count',
  'join',
  'max',
  'min',
  'sum',
  'abs',
  'add',
  'ceil',
  'divide',
  'floor',
  'modulo',
  'multiply',
  'power',
  'round',
  'sqrt',
  'subtract',
  'generate',
];

/**
 * Node types that perform no external operation regardless of configuration:
 * triggers (they receive, they do not act), logic, and in-process transforms.
 */
export const NODE_DEFAULT_FIRST_RUN_CLASS: Record<string, FirstRunClass> = {
  manual_trigger: 'none',
  schedule_trigger: 'none',
  schedule: 'none',
  cron: 'none',
  webhook: 'none',
  webhook_trigger: 'none',
  form: 'none',
  form_trigger: 'none',
  chat_trigger: 'none',
  email_trigger: 'none',
  if_else: 'none',
  switch: 'none',
  merge: 'none',
  loop: 'none',
  split_in_batches: 'none',
  filter: 'none',
  set: 'none',
  transform: 'none',
  code: 'none',
  math: 'none',
  date_time: 'none',
  aggregate: 'none',
  sort: 'none',
  limit: 'none',
  wait: 'none',
  no_op: 'none',
  sticky_note: 'none',
  log_output: 'none',
};

/**
 * Per-node, per-operation exceptions where the verb alone is misleading.
 * Keyed `nodeType` → `operation` → class.
 */
export const FIRST_RUN_CLASS_OVERRIDES: Record<string, Record<string, FirstRunClass>> = {
  // HTTP verbs carry the meaning, not the node name.
  http_request: {
    GET: 'read',
    HEAD: 'read',
    OPTIONS: 'read',
    POST: 'write',
    PUT: 'write',
    PATCH: 'write',
    DELETE: 'destructive',
  },
  // 'cancel' on a CI job stops a build — disruptive, but not data loss.
  jenkins: { cancel: 'write', build: 'write', status: 'read' },
  // Billing: cancelling a subscription and issuing refunds are the deny-list cases.
  chargebee: {
    cancel_subscription: 'destructive',
    create_customer: 'write',
    create_subscription: 'write',
    get_customer: 'read',
  },
  stripe: { refund: 'destructive', charge: 'destructive', create_payment: 'destructive' },
  // Mailing lists: unsubscribing is irreversible from the recipient's point of view.
  mailchimp: { send: 'write', subscribe: 'write', unsubscribe: 'destructive' },
  // Bulk operations touch many records at once.
  hubspot: {
    batchDelete: 'destructive',
    batchCreate: 'write',
    batchUpdate: 'write',
    create: 'write',
    delete: 'destructive',
    get: 'read',
    getMany: 'read',
    search: 'read',
    update: 'write',
  },
  // 'write' on a sheet overwrites a range; 'append' adds. Both are writes, neither
  // is destructive, but they are called out so the verb table is not relied on.
  google_sheets: { read: 'read', append: 'write', update: 'write', write: 'write' },
  google_gmail: { get: 'read', list: 'read', search: 'read', send: 'write' },
  mongodb: { find: 'read', insertOne: 'write', updateOne: 'write', deleteOne: 'destructive' },
  db: { select: 'read', insert: 'write', update: 'write', delete: 'destructive' },
  // AI nodes cost money and produce output, but nothing leaves the workspace.
  langchain: { run_agent: 'read', run_chain: 'read' },
};

const norm = (value: string) => String(value ?? '').trim().toLowerCase();

/** Classification implied by the operation name alone. Undefined when unknown. */
export function classifyOperationVerb(operation: string): FirstRunClass | undefined {
  const op = norm(operation);
  if (!op) return undefined;
  if (DESTRUCTIVE_VERBS.includes(op)) return 'destructive';
  if (READ_VERBS.includes(op)) return 'read';
  if (NONE_VERBS.includes(op)) return 'none';
  // Substring checks catch compound names like `delete_entry_by_id`.
  if (DESTRUCTIVE_VERBS.some((verb) => op.startsWith(verb) || op.includes(`_${verb}`))) {
    return 'destructive';
  }
  return undefined;
}

/** Per-node override for a specific operation, if one exists. */
export function lookupFirstRunOverride(
  nodeType: string,
  operation?: string
): FirstRunClass | undefined {
  const byNode = FIRST_RUN_CLASS_OVERRIDES[nodeType] ?? FIRST_RUN_CLASS_OVERRIDES[norm(nodeType)];
  if (!byNode || !operation) return undefined;
  return (
    byNode[operation] ??
    byNode[norm(operation)] ??
    byNode[String(operation).toUpperCase()]
  );
}

/** Node-level default for node types that take no operation at all. */
export function lookupNodeDefaultClass(nodeType: string): FirstRunClass | undefined {
  return NODE_DEFAULT_FIRST_RUN_CLASS[nodeType] ?? NODE_DEFAULT_FIRST_RUN_CLASS[norm(nodeType)];
}
