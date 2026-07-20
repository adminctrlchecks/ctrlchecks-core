---
inclusion: always
---

# Permanent Core Architecture - Single Source of Truth

## 🚨 CRITICAL ARCHITECTURAL PRINCIPLE

**This is NOT a workflow-level fix.**
**This is NOT a prompt-level patch.**
**This is NOT a single JSON modification.**

**This is a PERMANENT CORE ARCHITECTURE FIX.**

## Core Mandate

**Any node-related error must be fixed ONCE at the core system level.**
**The fix must automatically apply to:**
- All existing workflows
- All future workflows
- All AI-generated workflows
- Infinite user prompts

**No workflow should be able to recreate this error again.**

---

## Single Source of Truth

### ✅ CORRECT: Use UnifiedNodeRegistry

**ALL node behavior MUST originate from:**
- [unified-node-registry.ts](mdc:worker/src/core/registry/unified-node-registry.ts) - **THE SINGLE SOURCE OF TRUTH**

**Workflows MUST NOT define:**
- ❌ Output fields
- ❌ Input schema
- ❌ Credential requirements
- ❌ Execution behavior

### ❌ FORBIDDEN: Hardcoded Node Logic

**NEVER add node-specific logic in:**
- ❌ [workflow-builder.ts](mdc:worker/src/services/ai/workflow-builder.ts) - Only for generation, not execution
- ❌ [execute-workflow.ts](mdc:worker/src/api/execute-workflow.ts) - Legacy fallback only
- ❌ Any file with `if (node.type === ...)` or `switch (node.type)`
- ❌ Workflow-specific files
- ❌ Prompt-specific patches

---

## Enforced Node Contracts

### Each Node Must Define (in UnifiedNodeRegistry):

1. **inputSchema** - All input fields, types, requirements
2. **outputSchema** - All output structure and ports
3. **credentialSchema** - Required credentials and categories
4. **defaultConfig** - Default values for all fields
5. **execute()** - Execution logic (delegates to legacy executor)

**Location**: [unified-node-registry.ts](mdc:worker/src/core/registry/unified-node-registry.ts)
**Method**: `convertNodeLibrarySchemaToUnified()`

---

## Execution Engine Rules

### ✅ CORRECT: Dynamic Execution

**The execution engine MUST:**
1. Fetch node definition from registry:
   ```typescript
   const nodeDef = unifiedNodeRegistry.get(node.type);
   ```
2. Validate node instance against `nodeDef.inputSchema`
3. Use `nodeDef.execute()` for execution
4. Reference [dynamic-node-executor.ts](mdc:worker/src/core/execution/dynamic-node-executor.ts)

### ❌ FORBIDDEN: Hardcoded Execution

**NEVER add:**
- ❌ `if (node.type === 'google_gmail') { ... }`
- ❌ `switch (node.type) { case 'google_sheets': ... }`
- ❌ Node-specific logic in execution engine
- ❌ Workflow-specific execution paths

---

## Validation Layer Rules

### ✅ CORRECT: Dynamic Validation

**Validators MUST:**
1. Reference node schema from registry:
   ```typescript
   const nodeDef = unifiedNodeRegistry.get(node.type);
   const validation = validateAgainstSchema(config, nodeDef.inputSchema);
   ```
2. Use [schema-based-validator.ts](mdc:worker/src/core/validation/schema-based-validator.ts)
3. Read validation rules from node definition

### ❌ FORBIDDEN: Hardcoded Validation

**NEVER add:**
- ❌ Hardcoded validation rules in [workflow-validator.ts](mdc:worker/src/services/ai/workflow-validator.ts)
- ❌ Node-specific validation logic
- ❌ Workflow-specific validation rules

---

## AI Planner / Generator Rules

### ✅ CORRECT: Registry-Based Hydration

**AI Planner MUST:**
1. **ONLY output**: `{ type: "nodeName" }`
2. **NOT generate**:
   - ❌ Output fields
   - ❌ Custom parameters outside schema
   - ❌ Credential structure
3. **WorkflowBuilder MUST hydrate**:
   ```typescript
   const nodeDef = unifiedNodeRegistry.get(node.type);
   const defaults = nodeDef.defaultConfig();
   // Merge defaults with node config
   ```

### ❌ FORBIDDEN: AI-Generated Node Behavior

**NEVER allow AI to:**
- ❌ Generate node execution logic
- ❌ Define output schemas
- ❌ Create custom node parameters
- ❌ Bypass registry defaults

---

## Credential Auto-Enforcement

### ✅ CORRECT: Registry-Based Credentials

**Credential discovery MUST:**
1. Read required categories from node definition:
   ```typescript
   const nodeDef = unifiedNodeRegistry.get(node.type);
   const requiredCreds = nodeDef.credentialSchema?.requirements || [];
   ```
2. Automatically request missing credentials
3. Use [credential-preflight-check.ts](mdc:worker/src/services/ai/credential-preflight-check.ts)

### ❌ FORBIDDEN: Manual Credential Wiring

**NEVER:**
- ❌ Hardcode credential requirements
- ❌ Manually wire credentials in workflows
- ❌ Skip credential validation

---

## Backward Compatibility

### ✅ CORRECT: Runtime Normalization

**For old workflows:**
1. Detect deprecated fields at runtime
2. Normalize to match new schema:
   ```typescript
   const nodeDef = unifiedNodeRegistry.get(node.type);
   const normalized = nodeDef.migrations?.reduce((config, migration) => {
     return migration.migrate(config);
   }, oldConfig);
   ```

**Location**: [unified-node-registry.ts](mdc:worker/src/core/registry/unified-node-registry.ts)
**Method**: `applyMigrations()`

---

## Removing Duplications

### ✅ CORRECT: Centralized Logic

**ALL node logic in ONE place:**
- [unified-node-registry.ts](mdc:worker/src/core/registry/unified-node-registry.ts)

### ❌ FORBIDDEN: Scattered Logic

**Search and eliminate:**
- ❌ Node-specific logic in [workflow-builder.ts](mdc:worker/src/services/ai/workflow-builder.ts)
- ❌ Node-specific logic in workflow templates
- ❌ Node-specific logic in execution engine
- ❌ Hardcoded output field references

**Use grep to find:**
```bash
grep -r "if.*node\.type.*===" worker/src
grep -r "switch.*node\.type" worker/src
```

---

## Making Universal Changes

### ✅ CORRECT: Registry Modification

**To fix ANY node behavior:**

1. **Modify**: [unified-node-registry.ts](mdc:worker/src/core/registry/unified-node-registry.ts)
2. **Method**: `convertNodeLibrarySchemaToUnified()`
3. **Update**:
   - `inputSchema` - For input changes
   - `outputSchema` - For output changes
   - `defaultConfig` - For default values
   - `execute()` - For execution logic

**Result**: ✅ Change applies to ALL workflows automatically

### ❌ FORBIDDEN: Workflow-Specific Fixes

**NEVER:**
- ❌ Patch a single workflow file
- ❌ Fix only the current failing example
- ❌ Hardcode a fix for this node only
- ❌ Add `if (node.type === ...)` outside registry

---

## Verification Checklist

**Before making ANY node-related change, verify:**

- [ ] Is this change in [unified-node-registry.ts](mdc:worker/src/core/registry/unified-node-registry.ts)?
- [ ] Does this apply to ALL workflows (existing + future + AI-generated)?
- [ ] Is there NO hardcoded `if (node.type === ...)` logic?
- [ ] Does [dynamic-node-executor.ts](mdc:worker/src/core/execution/dynamic-node-executor.ts) use the registry?
- [ ] Are validators using registry schemas?
- [ ] Is AI planner only outputting `{ type: "nodeName" }`?

**If NO to any**: ❌ **STOP - This is NOT a universal fix**

---

## Example: Making a Universal Change

### ❌ WRONG (Workflow-Specific):

```typescript
// In workflow-builder.ts - WRONG!
if (node.type === 'google_gmail') {
  if (!node.data.config.subject) {
    node.data.config.subject = 'Default Subject';
  }
}
```

**Problem**: Only applies during generation, not execution.

### ✅ CORRECT (Universal):

```typescript
// In unified-node-registry.ts - CORRECT!
private convertNodeLibrarySchemaToUnified(schema: any): UnifiedNodeDefinition {
  if (schema.type === 'google_gmail') {
    const defaultConfig = () => ({
      operation: 'send',
      subject: 'Default Subject', // ✅ Universal default
      // ... other defaults
    });
    
    return {
      // ... other fields ...
      defaultConfig,
      execute: async (context) => {
        const config = { ...defaultConfig(), ...context.config };
        // Ensure subject is always set
        if (!config.subject) {
          config.subject = defaultConfig().subject;
        }
        // Execute with universal behavior
        return await executeGmail(config, context.supabase);
      },
    };
  }
}
```

**Result**: ✅ Applies to ALL workflows automatically!

---

## Enterprise-Grade Requirements

**This architecture must support:**
- ✅ 500+ node types
- ✅ Infinite workflows
- ✅ Infinite user prompts
- ✅ Long-term maintainability
- ✅ Zero duplication
- ✅ Type safety
- ✅ Backward compatibility

**Think framework-level, not feature-level.**

---

## Key Files Reference

**Single Source of Truth:**
- [unified-node-registry.ts](mdc:worker/src/core/registry/unified-node-registry.ts) - **ALL node definitions**

**Execution:**
- [dynamic-node-executor.ts](mdc:worker/src/core/execution/dynamic-node-executor.ts) - Uses registry

**Validation:**
- [schema-based-validator.ts](mdc:worker/src/core/validation/schema-based-validator.ts) - Uses registry

**Types:**
- [unified-node-contract.ts](mdc:worker/src/core/types/unified-node-contract.ts) - Type definitions

---

## Summary

**✅ DO:**
- Modify [unified-node-registry.ts](mdc:worker/src/core/registry/unified-node-registry.ts) for ALL node changes
- Use registry for execution, validation, defaults
- Ensure changes apply universally

**❌ DON'T:**
- Add hardcoded node logic anywhere
- Fix workflows individually
- Bypass the registry
- Create workflow-specific patches

**Remember: Fix ONCE at the core → Applies EVERYWHERE automatically.**

---

## Universal Template Resolution

### ✅ CORRECT: Use UniversalTemplateResolver

**ALL template resolution MUST use:**
- [universal-template-resolver.ts](mdc:worker/src/core/utils/universal-template-resolver.ts) - **THE SINGLE SOURCE OF TRUTH**

**Template resolution happens:**
- ✅ At registry level (BEFORE execution)
- ✅ For ALL nodes automatically
- ✅ For ALL config fields
- ✅ No node-specific logic needed

### ❌ FORBIDDEN: Node-Specific Template Resolution

**NEVER add:**
- ❌ Node-specific template resolvers
- ❌ Hardcoded template resolution in legacy executor
- ❌ Skip template resolution for any node

### Template Resolution Flow

1. **Node Config** → Contains template: `{ array: "{{$json.items}}" }`
2. **Registry Execute** → Calls `resolveConfigTemplates()`
3. **Universal Resolver** → Resolves `{{$json.items}}` to actual array
4. **Resolved Config** → `{ array: [actual, array, data] }`
5. **Legacy Executor** → Receives resolved config, executes node

**Location**: [unified-node-registry.ts](mdc:worker/src/core/registry/unified-node-registry.ts)
**Method**: `execute()` - Resolves templates BEFORE calling legacy executor

**Supported Formats**:
- `{{$json.items}}` → Resolved to actual array
- `$json.items` → Also resolved (handles non-template format)
- `{{json.items}}` → Resolved (without $ prefix)
- Nested paths: `{{$json.field.path}}` → Resolved recursively

**Result**: ✅ Template resolution works for ALL nodes automatically.
