# Node Architecture & Flow Diagram

## System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    NODE DEFINITION LAYER                        │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  node-library.ts                                         │  │
│  │  - NodeSchema definitions                                │  │
│  │  - Input/Output schemas                                  │  │
│  │  - AI selection criteria                                 │  │
│  │  - Validation rules                                      │  │
│  │  - Common patterns                                       │  │
│  └──────────────────────────────────────────────────────────┘  │
│                            │                                     │
│                            ▼                                     │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  unified-node-registry.ts                                │  │
│  │  - Auto-converts NodeSchema → UnifiedNodeDefinition      │  │
│  │  - Single source of truth                                │  │
│  │  - Stores all node definitions                           │  │
│  └──────────────────────────────────────────────────────────┘  │
│                            │                                     │
│                            ▼                                     │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  unified-node-registry-overrides.ts                      │  │
│  │  - Optional custom behavior                              │  │
│  │  - Node-specific overrides                               │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                    EXECUTION LAYER                                │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  dynamic-node-executor.ts                                │  │
│  │  - Fetches definition from registry                      │  │
│  │  - Validates config                                      │  │
│  │  - Calls definition.execute()                           │  │
│  └──────────────────────────────────────────────────────────┘  │
│                            │                                     │
│                            ▼                                     │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  unified-node-registry-legacy-adapter.ts                 │  │
│  │  - Resolves templates                                    │  │
│  │  - Filters placeholders                                   │  │
│  │  - Prepares execution context                            │  │
│  └──────────────────────────────────────────────────────────┘  │
│                            │                                     │
│                            ▼                                     │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  execute-workflow.ts (executeNodeLegacy)                  │  │
│  │  - Actual node execution logic                            │  │
│  │  - API calls, database operations, etc.                   │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                    SUPPORTING SERVICES                           │
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐        │
│  │ Template     │  │ Validation   │  │ Credential   │        │
│  │ Resolver     │  │ Service      │  │ Service      │        │
│  └──────────────┘  └──────────────┘  └──────────────┘        │
└─────────────────────────────────────────────────────────────────┘
```

---

## Node Registration Flow

```
1. System Startup
   │
   ▼
2. NodeLibrary.initializeSchemas()
   │
   ▼
3. For each node:
   ├─ createYourNodeSchema()
   │  └─ Returns NodeSchema
   │
   └─ this.registerSchema(schema)
      └─ Stores in this.schemas Map
   │
   ▼
4. UnifiedNodeRegistry.initializeFromNodeLibrary()
   │
   ▼
5. For each schema:
   ├─ convertNodeLibrarySchemaToUnified()
   │  └─ Converts NodeSchema → UnifiedNodeDefinition
   │
   ├─ applyNodeDefinitionOverrides()
   │  └─ Applies custom overrides (if any)
   │
   └─ this.register(definition)
      └─ Stores in this.definitions Map
   │
   ▼
6. Node is now available system-wide!
```

---

## Node Execution Flow

```
1. Workflow Execution Starts
   │
   ▼
2. executeNode() called
   │
   ▼
3. Try Dynamic Executor First
   │
   ├─ executeNodeDynamically()
   │  │
   │  ├─ Get definition from UnifiedNodeRegistry
   │  │  └─ unifiedNodeRegistry.get(nodeType)
   │  │
   │  ├─ Migrate config (backward compatibility)
   │  │  └─ unifiedNodeRegistry.migrateConfig()
   │  │
   │  ├─ Validate config
   │  │  └─ unifiedNodeRegistry.validateConfig()
   │  │
   │  └─ Execute node
   │     └─ definition.execute(context)
   │        │
   │        ├─ (If override exists)
   │        │  └─ Custom execute() function
   │        │
   │        └─ (Otherwise)
   │           └─ executeViaLegacyExecutor()
   │              │
   │              ├─ Resolve templates
   │              │  └─ resolveConfigTemplates()
   │              │
   │              ├─ Filter placeholders
   │              │  └─ filterPlaceholderValues()
   │              │
   │              └─ Call legacy executor
   │                 └─ executeNodeLegacy()
   │                    │
   │                    └─ switch (nodeType)
   │                       └─ case 'your_node_type':
   │                          └─ Your execution logic
   │
   └─ (If dynamic executor fails)
      └─ Fallback to executeNodeLegacy() directly
```

---

## Template Resolution Flow

```
1. Node config contains template: "{{$json.field}}"
   │
   ▼
2. executeViaLegacyExecutor() called
   │
   ▼
3. resolveConfigTemplates() called
   │
   ├─ Scans config for templates
   │  └─ Finds: {{$json.field}}, {{input.field}}, etc.
   │
   ├─ Looks up values in nodeOutputs cache
   │  └─ nodeOutputs.get('$json') → { field: 'value' }
   │
   └─ Replaces templates with actual values
      └─ "{{$json.field}}" → "value"
   │
   ▼
4. Resolved config passed to execution
   │
   └─ Your node receives: config.field = "value" (already resolved!)
```

---

## File Dependency Graph

```
node-library.ts
    │
    ├─→ unified-node-registry.ts
    │      │
    │      ├─→ unified-node-registry-overrides.ts
    │      │      │
    │      │      └─→ overrides/your-node.ts
    │      │
    │      └─→ unified-node-registry-legacy-adapter.ts
    │              │
    │              └─→ execute-workflow.ts
    │                      │
    │                      └─→ (Your node execution logic)
    │
    └─→ dynamic-node-executor.ts
            │
            └─→ unified-node-registry.ts (circular, but handled)
```

---

## Data Flow: Adding a New Node

```
┌─────────────────────────────────────────────────────────────┐
│ STEP 1: Define Schema                                        │
│                                                               │
│  node-library.ts                                             │
│  └─ createYourNodeSchema()                                   │
│     └─ Returns: NodeSchema {                                │
│          type, label, category,                               │
│          configSchema,                                       │
│          aiSelectionCriteria,                                │
│          outputSchema, etc.                                  │
│        }                                                     │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│ STEP 2: Auto-Registration                                    │
│                                                               │
│  unified-node-registry.ts                                   │
│  └─ convertNodeLibrarySchemaToUnified()                      │
│     └─ Converts: NodeSchema → UnifiedNodeDefinition         │
│        └─ Extracts:                                          │
│           - inputSchema from configSchema                    │
│           - outputSchema from outputSchema                   │
│           - credentialSchema (auto-detected)                 │
│           - defaultConfig() factory                          │
│           - validateConfig() function                        │
│           - execute() function (delegates to legacy)         │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│ STEP 3: (Optional) Custom Override                          │
│                                                               │
│  overrides/your-node.ts                                      │
│  └─ overrideYourNode()                                       │
│     └─ Modifies:                                             │
│        - inputSchema (add/remove fields)                    │
│        - outputSchema (add output ports)                    │
│        - execute() (custom logic)                           │
│        - tags, outgoingPorts, etc.                           │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│ STEP 4: Execution Logic                                      │
│                                                               │
│  execute-workflow.ts                                         │
│  └─ executeNodeLegacy()                                      │
│     └─ case 'your_node_type':                                │
│        └─ Your actual execution code                         │
│           - API calls                                        │
│           - Database operations                              │
│           - Data processing                                  │
│           - Return output                                    │
└─────────────────────────────────────────────────────────────┘
```

---

## Component Responsibilities

### node-library.ts
**Responsibility**: Define node schemas
- ✅ Input/output structure
- ✅ Validation rules
- ✅ AI selection criteria
- ✅ Common patterns
- ❌ NOT execution logic

### unified-node-registry.ts
**Responsibility**: Central registry
- ✅ Store all node definitions
- ✅ Convert schemas to unified format
- ✅ Provide lookup API
- ✅ Handle migrations
- ❌ NOT execution logic

### unified-node-registry-overrides.ts
**Responsibility**: Custom behavior
- ✅ Node-specific overrides
- ✅ Complex template resolution
- ✅ Custom execution paths
- ❌ NOT basic execution (use legacy executor)

### execute-workflow.ts
**Responsibility**: Actual execution
- ✅ API calls
- ✅ Database operations
- ✅ Business logic
- ✅ Error handling
- ❌ NOT schema definition

---

## Key Principles Visual

```
┌─────────────────────────────────────────────────────────────┐
│ PRINCIPLE 1: Single Source of Truth                         │
│                                                               │
│  ALL node behavior defined in:                              │
│  └─→ UnifiedNodeRegistry                                    │
│                                                               │
│  ❌ FORBIDDEN:                                               │
│     if (node.type === 'your_node') { ... }                  │
│     (outside registry)                                       │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ PRINCIPLE 2: Automatic Features                             │
│                                                               │
│  ✅ Template Resolution: Automatic                           │
│  ✅ Validation: Automatic                                    │
│  ✅ AI Generation: Automatic                                 │
│  ✅ Credential Detection: Automatic                         │
│                                                               │
│  You only need to:                                           │
│  └─→ Define schema + execution logic                        │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ PRINCIPLE 3: Override Only When Needed                      │
│                                                               │
│  Most nodes:                                                 │
│  └─→ Schema + Execution = Done                             │
│                                                               │
│  Complex nodes only:                                         │
│  └─→ Add override for special behavior                      │
└─────────────────────────────────────────────────────────────┘
```

---

## Quick Reference: What Goes Where?

| What | Where | Why |
|------|-------|-----|
| **Schema Definition** | `node-library.ts` | Single source of truth |
| **Execution Logic** | `execute-workflow.ts` | Actual node behavior |
| **Custom Override** | `overrides/your-node.ts` | Special behavior only |
| **Template Resolution** | Automatic | System handles it |
| **Validation** | Automatic | From schema |
| **AI Generation** | Automatic | From aiSelectionCriteria |

---

## Summary

1. **Define schema** → `node-library.ts`
2. **Add execution** → `execute-workflow.ts`
3. **Test** → Done!

**Optional**: Add override only if you need special behavior.

The system handles everything else automatically! 🚀
