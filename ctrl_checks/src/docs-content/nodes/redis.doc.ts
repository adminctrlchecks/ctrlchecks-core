import type { FieldDoc, NodeDoc } from '../types';

const help = (
  field: string,
  why: string,
  when: string,
  enter: string,
  source: string,
  format: string,
  example: string,
  wrong: string,
  mistake: string,
) => `What this field is: ${field}
Why it matters: ${why}
When to fill it: ${when}
What to enter: ${enter}
Where the value comes from: ${source}
How to use it later: Map values from earlier steps with {{$json.fieldName}}, and use this node output later as {{$json.value}}, {{$json.deleted}}, {{$json.count}}, {{$json.length}}, or {{$json.result}} depending on the Redis operation.
Accepted format: ${format}
Real workplace example: ${example}
If it is empty or wrong: ${wrong}
Common mistake: ${mistake}`;

const operation: FieldDoc = {
  name: 'Operation',
  internalKey: 'operation',
  type: 'select',
  required: true,
  description: 'Choose the Redis command wrapper to run: get, set, delete, incr, hget, hset, lpush, rpop, or command.',
  options: ['get', 'set', 'delete', 'incr', 'hget', 'hset', 'lpush', 'rpop', 'command'],
  helpText: help('The Redis action this node should run.', 'It decides which Redis command is called and which fields are required.', 'Choose it before filling the key, hash, value, or custom command fields.', 'Use get to read a key, set to write a key, delete to remove a key, incr to add one to a numeric key, hget/hset for hash fields, lpush/rpop for lists, or command for a controlled custom Redis command.', 'Choose from the dropdown based on whether the workflow is reading cache, writing cache, counting, managing a hash, managing a queue-like list, or running an approved command.', 'One of get, set, delete, incr, hget, hset, lpush, rpop, or command.', 'set to cache a customer profile for one hour after a CRM lookup.', 'The run returns _error saying operation is required or operation must be one of the supported values.', 'Do not use Custom Command for routine get/set work; choose the safer specific operation.'),
  defaultValue: 'get',
};

const connectionFields: FieldDoc[] = [
  {
    name: 'Host',
    internalKey: 'host',
    type: 'string',
    required: true,
    description: 'Redis server host name.',
    helpText: help('The network host of your Redis server.', 'The executor cannot create a Redis client without a host.', 'Fill it for every Redis operation unless a saved Redis connection injects it.', 'Enter a host such as localhost, redis.company.internal, or an Upstash/Redis Cloud host.', 'Copy it from Redis Cloud, Upstash, AWS ElastiCache, your internal platform dashboard, or your infrastructure team. You can map {{$json.redisHost}} when routing by environment.', 'Host name or IP address only; do not include redis:// or the port.', 'redis-cache.internal for a production cache cluster.', 'The run returns _error "host is required" or a connection failure.', 'Do not paste a full Redis URL into Host; split host, port, password, and TLS into their own fields.'),
    placeholder: 'redis.example.com',
    example: 'redis-cache.internal',
  },
  {
    name: 'Port',
    internalKey: 'port',
    type: 'number',
    required: false,
    description: 'Redis TCP port.',
    helpText: help('The port number Redis listens on.', 'Host and port together point the executor to the right Redis service.', 'Fill it when your Redis endpoint does not use the default 6379.', 'Enter 6379 for most Redis servers, or the custom port from your provider.', 'Find it beside the Redis endpoint in the provider dashboard or connection details. You can map {{$json.redisPort}}.', 'Number between 1 and 65535.', '6379 for most Redis and 6380 for some TLS endpoints.', 'The run returns _error "port must be a valid number between 1 and 65535" or cannot connect.', 'Do not enter host:port here; keep the port as digits only.'),
    placeholder: '6379',
    defaultValue: '6379',
    example: '6379',
  },
  {
    name: 'Password',
    internalKey: 'password',
    type: 'password',
    required: false,
    description: 'Redis AUTH password.',
    helpText: help('The secret Redis password when the server requires authentication.', 'Redis rejects protected databases unless the client authenticates.', 'Fill it only when your Redis server requires AUTH and a saved connection does not inject it.', 'Use the password from your Redis provider or internal vault.', 'Copy it from Redis Cloud, Upstash, ElastiCache auth token settings, or your secret manager. Avoid mapping secrets from normal workflow data.', 'Secret text stored as a masked value when entered directly.', 'A saved Redis connection containing the Upstash password.', 'The run returns an authentication or NOAUTH error.', 'Do not put the Redis password into Key, Value, or upstream sample data.'),
    placeholder: 'Use Connections when possible',
    notes: 'Prefer storing Redis passwords in Connections or the credential vault.',
  },
  {
    name: 'Database Number',
    internalKey: 'db',
    type: 'number',
    required: false,
    description: 'Redis logical database index.',
    helpText: help('The Redis logical database number selected after connecting.', 'Some Redis deployments separate data by numeric database index.', 'Use it only when your Redis administrator assigned a nonzero database.', 'Enter 0 for the default database, or the exact number you were given.', 'Find it in your application config or ask your infrastructure team. You can map {{$json.redisDb}} for environment-specific workflows.', 'Whole number. Runtime defaults to 0.', '0 for a shared app cache, or 2 for a staging cache namespace.', 'The node may read or write the wrong logical database.', 'Do not use database numbers as a security boundary; use separate credentials or instances when data must be isolated.'),
    defaultValue: '0',
    example: '0',
  },
  {
    name: 'Use TLS',
    internalKey: 'tls',
    type: 'boolean',
    required: false,
    description: 'Whether to use encrypted Redis transport.',
    helpText: help('A toggle that enables TLS for the Redis connection.', 'Managed Redis providers often require encrypted connections.', 'Turn it on for rediss:// style endpoints, Upstash, Redis Cloud, or provider instructions that require TLS.', 'Use true for TLS-required hosts and false for local Redis without TLS.', 'Check the provider connection string or database settings. You can map {{$json.redisTls}} when environments differ.', 'Boolean true or false.', 'true for an Upstash production Redis database.', 'The run may fail with a TLS handshake, connection reset, or connection refused error.', 'Do not turn TLS off for production just to make a failing connection pass.'),
    defaultValue: 'false',
    example: 'true',
  },
];

const keyField: FieldDoc = {
  name: 'Key',
  internalKey: 'key',
  type: 'string',
  required: true,
  description: 'Redis key used by get, set, delete, incr, lpush, and rpop.',
  helpText: help('The Redis key that identifies the value, counter, or list.', 'Redis stores data by key, so this decides exactly what is read, written, deleted, incremented, pushed, or popped.', 'Required for get, set, delete, incr, lpush, and rpop.', 'Enter a namespaced key such as user:123, session:abc, or cache:orders:2026-07-20.', 'Use a stable ID from a trigger, database row, CRM record, or previous cache step. Map it as user:{{$json.userId}} or session:{{$json.sessionId}}.', 'Plain Redis key string.', 'user:{{$json.customerId}} to cache one customer profile.', 'The run returns a key is required error, or writes to a key that later steps cannot find.', 'Do not use a vague shared key such as user for every customer.'),
  placeholder: 'user:{{$json.userId}}',
  example: 'user:1048',
};

const valueField: FieldDoc = {
  name: 'Value',
  internalKey: 'value',
  type: 'string',
  required: true,
  description: 'Value written by set, hset, or lpush.',
  helpText: help('The text value Redis should store or push.', 'The executor converts it to a string before sending it to Redis.', 'Required for set, hset, and lpush. Not used by get, delete, incr, hget, rpop, or command.', 'Enter text, a number, or a JSON string such as {"status":"active"}.', 'Map it from a form, webhook, database row, or AI output. For objects, map a prepared JSON string such as {{$json.cachePayload}}.', 'String value. Objects should be stringified before storage.', '{"name":"Alex","plan":"Pro"} for cached customer context.', 'The run returns value is required for set/hset/lpush operation.', 'Do not assume Redis stores typed JSON objects here; this executor sends text.'),
  placeholder: '{{$json.value}}',
  example: '{"status":"active"}',
};

const ttlField: FieldDoc = {
  name: 'TTL',
  internalKey: 'ttl',
  type: 'number',
  required: false,
  description: 'Optional expiry time in seconds for set.',
  helpText: help('The time-to-live for a Redis key written by Set.', 'It controls when cached data expires automatically.', 'Use it with set when the cached value should be temporary.', 'Enter seconds, such as 300, 3600, or 86400. Leave blank or 0 for no expiry.', 'Choose it from the freshness requirement for the data. You can map {{$json.cacheTtlSeconds}}.', 'Positive number of seconds.', '3600 to keep a customer lookup for one hour.', 'A missing or zero TTL creates a key with no automatic expiration.', 'Do not use very long TTLs for data that changes often or includes sensitive temporary state.'),
  placeholder: '3600',
  example: '3600',
};

const hashField: FieldDoc = {
  name: 'Hash Key',
  internalKey: 'hash',
  type: 'string',
  required: true,
  description: 'Redis hash key used by hget and hset.',
  helpText: help('The Redis hash that contains named fields.', 'Hash operations need both the hash key and the field name.', 'Required for hget and hset.', 'Enter a hash key such as user:123 or customer:profile:1048.', 'Build it from a stable ID in a previous step, such as user:{{$json.userId}}.', 'Plain Redis key string.', 'user:1048 for a hash containing email, plan, and lastSeenAt fields.', 'The run returns hash is required for hget/hset operation.', 'Do not put the field name here; use Hash Field for that.'),
  placeholder: 'user:{{$json.userId}}',
  example: 'user:1048',
};

const fieldField: FieldDoc = {
  name: 'Hash Field',
  internalKey: 'field',
  type: 'string',
  required: true,
  description: 'Field name inside a Redis hash.',
  helpText: help('The named field inside the Redis hash.', 'It tells Redis which part of the hash to read or write.', 'Required for hget and hset.', 'Enter one field name such as email, status, plan, or lastSeenAt.', 'Copy it from your cache design or map a controlled field name from a previous step.', 'Plain field name string.', 'plan to read or update the customer subscription plan inside user:1048.', 'The run returns field is required for hget/hset operation or reads the wrong hash field.', 'Do not pass a JSON path here; Redis hash fields are simple names.'),
  placeholder: 'email',
  example: 'plan',
};

const commandField: FieldDoc = {
  name: 'Command',
  internalKey: 'command',
  type: 'string',
  required: true,
  description: 'Custom Redis command name.',
  helpText: help('The Redis command to call when Operation is Custom Command.', 'The runtime passes this name directly to the Redis client.', 'Use it only for approved commands that are not covered by the specific operations.', 'Enter a command name such as EXPIRE, TTL, or EXISTS.', 'Choose it from Redis documentation or an approved internal runbook. You can map {{$json.redisCommand}} only when the upstream value is trusted.', 'Redis command name string.', 'EXPIRE to set expiry on a key after a separate write.', 'The run returns command is required or Redis may reject the command.', 'Do not let untrusted users choose arbitrary Redis commands.'),
  placeholder: 'EXPIRE',
  example: 'EXPIRE',
};

const argsField: FieldDoc = {
  name: 'Args',
  internalKey: 'args',
  type: 'json',
  required: false,
  description: 'Arguments for a custom Redis command.',
  helpText: help('The ordered arguments passed after the custom command name.', 'Redis commands depend on argument order.', 'Use it when Operation is Custom Command and the command needs arguments.', 'Enter a JSON array such as ["user:123", 3600].', 'Map approved values from previous steps, such as ["user:{{$json.userId}}", {{$json.ttl}}].', 'JSON array.', '["user:1048", 3600] for EXPIRE user:1048 3600.', 'Redis may return an arity or command syntax error.', 'Do not enter an object when Redis expects ordered command arguments.'),
  placeholder: '["user:123", 3600]',
  example: '["user:1048", 3600]',
};

const fields = [operation, ...connectionFields, keyField, valueField, ttlField, hashField, fieldField, commandField, argsField];

const op = (
  name: string,
  value: string,
  description: string,
  inputValues: Record<string, string>,
  outputExample: Record<string, unknown>,
  outputDescription: string,
) => ({
  name,
  value,
  description,
  fields,
  outputExample,
  outputDescription,
  usageExample: {
    scenario: `${name} Redis data in a cache, session, counter, hash, list, or controlled command workflow after an upstream app supplies a stable key.`,
    inputValues: { operation: value, host: 'redis-cache.internal', port: '6379', password: 'Use saved Redis connection', ...inputValues },
    expectedOutput: 'Use the Redis result in later steps as {{$json.value}}, {{$json.result}}, {{$json.deleted}}, {{$json.count}}, or {{$json.length}} depending on the operation.',
  },
  externalDocsUrl: 'https://redis.io/docs/latest/commands/',
});

export const redisDoc: NodeDoc = {
  slug: 'redis',
  displayName: 'Redis',
  category: 'Data',
  logoUrl: '/icons/nodes/redis.svg',
  description: 'Read, write, delete, increment, and manage simple Redis cache data from a workflow. Use it for short-lived lookup caches, session handoff, counters, queue-like lists, and hash fields.',
  credentialType: 'Redis Connection',
  credentialSetupSteps: [
    'Create or choose a Redis credential in CtrlChecks Connections with host, port, password if required, database number, and TLS setting. The credential vault should store the password instead of normal workflow fields.',
    'For Upstash or Redis Cloud, copy the endpoint host/port and use TLS when the provider gives a rediss:// connection string.',
    'For AWS ElastiCache, make sure the worker network can reach the private endpoint and the selected Redis user/token has the needed command permissions.',
    'Test with Get on a known key or Set on a temporary cache key before using write/delete operations in production.',
    'Connect this node output to the next node with an outgoing line; downstream service node account connection is still required for Slack, email, CRM, database, or file steps.',
  ],
  credentialDocsUrl: 'https://redis.io/docs/latest/develop/connect/',
  resources: [
    {
      name: 'Operations',
      description: 'Redis uses ioredis. Successful database-node results are flattened by the workflow executor, while failures return _error from validation, authentication, connection, or Redis command errors.',
      operations: [
        op('Get', 'get', 'Reads the string value stored at Key and returns it as value. Use it when a workflow needs cached customer context, session data, or a previously stored temporary result.', { key: 'user:{{$json.userId}}' }, { key: 'user:1048', value: '{"plan":"Pro"}' }, 'key: Redis key that was read. value: string value or null when the key does not exist. _error appears when credentials, host, operation, key, or Redis execution fails.'),
        op('Set', 'set', 'Stores Value at Key, optionally with TTL seconds. Use it to cache expensive lookups, save short-lived session state, or make a later workflow step reuse data quickly.', { key: 'user:{{$json.userId}}', value: '{"plan":"Pro"}', ttl: '3600' }, { key: 'user:1048', value: '{"plan":"Pro"}', result: 'OK' }, 'key: Redis key written. value: submitted value. result: OK when Redis accepts the write. _error appears when key/value/connection is missing or Redis rejects the command.'),
        op('Delete', 'delete', 'Removes Key from Redis. Use it to clear stale cache entries, invalidate sessions, or clean temporary workflow state after it is no longer needed.', { key: 'user:{{$json.userId}}' }, { key: 'user:1048', deleted: true, count: 1 }, 'key: Redis key deleted. deleted: true when Redis removed at least one key. count: number of keys removed. _error appears on validation or Redis failure.'),
        op('Increment', 'incr', 'Adds one to a numeric Redis key and returns the new value. Use it for simple counters such as retry counts, daily event counts, or rate-limit counters.', { key: 'counter:daily-signups' }, { key: 'counter:daily-signups', value: 43 }, 'key: Redis key incremented. value: new numeric value. _error appears if key is missing, Redis cannot connect, or the existing value is not numeric.'),
        op('Hash Get', 'hget', 'Reads one field from a Redis hash. Use it when a workflow stores several related values under one customer, user, or session hash.', { hash: 'user:{{$json.userId}}', field: 'plan' }, { hash: 'user:1048', field: 'plan', value: 'Pro' }, 'hash: Redis hash key. field: field read inside the hash. value: string value or null. _error appears when hash/field/connection is missing or Redis fails.'),
        op('Hash Set', 'hset', 'Writes one field inside a Redis hash. Use it to update a small part of cached profile or session state without rewriting the whole object.', { hash: 'user:{{$json.userId}}', field: 'lastSeenAt', value: '{{$json.timestamp}}' }, { hash: 'user:1048', field: 'lastSeenAt', value: '2026-07-20T09:00:00Z', result: 1 }, 'hash: Redis hash key. field: field written. value: submitted value. result: Redis hset result count. _error appears when hash/field/value/connection is missing or Redis fails.'),
        op('List Push Left', 'lpush', 'Pushes Value onto the left side of a Redis list and returns the new list length. Use it for lightweight queues or recent-event lists.', { key: 'events:recent', value: '{"eventId":"evt_1048"}' }, { key: 'events:recent', length: 12 }, 'key: Redis list key. length: list length after push. _error appears when key/value/connection is missing or Redis fails.'),
        op('List Pop Right', 'rpop', 'Pops one value from the right side of a Redis list. Use it with List Push Left for simple first-in-first-out processing patterns.', { key: 'events:recent' }, { key: 'events:recent', value: '{"eventId":"evt_1048"}' }, 'key: Redis list key. value: popped value or null when the list is empty. _error appears when key/connection is missing or Redis fails.'),
        op('Custom Command', 'command', 'Runs one custom Redis command with Args. Use it only for controlled commands that are not already covered by the safer dedicated operations.', { command: 'EXPIRE', args: '["user:1048", 3600]' }, { command: 'EXPIRE', args: ['user:1048', 3600], result: 1 }, 'command: Redis command name. args: ordered arguments sent to Redis. result: raw command result. _error appears when command/connection is missing or Redis rejects the command.'),
      ],
    },
  ],
  commonErrors: [
    { error: 'host is required', cause: 'Host is empty or a saved Redis connection did not inject it.', fix: 'Fill Host or select a Redis connection with host, port, and password stored in the credential vault.' },
    { error: 'port must be a valid number between 1 and 65535', cause: 'Port is not a valid TCP port.', fix: 'Use 6379 for most Redis servers or copy the numeric port from your provider.' },
    { error: 'operation must be one of: get, set, delete, incr, hget, hset, lpush, rpop, command', cause: 'The operation value is unsupported or stale.', fix: 'Choose one of the supported Redis operations from the UI.' },
    { error: 'key is required for get/set/delete/incr/lpush/rpop operation', cause: 'The operation needs Key, but Key is empty or an expression resolved blank.', fix: 'Map a stable key such as user:{{$json.userId}} and verify the upstream value exists.' },
    { error: 'hash/field/value/command is required for <operation> operation', cause: 'A hash, field, value, or custom command input is missing for the selected operation.', fix: 'Fill the required field shown for Hash Get, Hash Set, List Push Left, Set, or Custom Command.' },
    { error: 'Redis operation failed', cause: 'Redis authentication, TLS, network access, command syntax, or data type validation failed.', fix: 'Check host, port, TLS, password, network allowlist, and whether the Redis key already contains a compatible type.' },
  ],
  relatedNodes: ['cache_get', 'cache_set', 'queue_push', 'queue_consume'],
};
