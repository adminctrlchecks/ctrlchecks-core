# Universal Node Change Guide - Making Changes That Apply to ALL Workflows

## 🎯 **THE PROBLEM**

When you make node changes in Cursor, they often only apply to **one workflow**. You need changes that apply to **ALL workflows** in the entire project.

## ✅ **THE SOLUTION: UnifiedNodeRegistry Architecture**

We have built a **UnifiedNodeRegistry** system that ensures **universal behavior**. Here's how to use it:

---

## 🏗️ **Architecture Overview**

### **Single Source of Truth**

**ALL node behavior must be defined in ONE place:**

```
worker/src/core/registry/unified-node-registry.ts
```

**This ensures:**
- ✅ Change once → applies to ALL workflows
- ✅ Change once → applies to ALL future workflows
- ✅ Change once → applies to ALL AI-generated workflows
- ✅ Infinite scalability (500+ node types)

---

## 📝 **HOW TO MAKE UNIVERSAL NODE CHANGES**

### **Step 1: Identify What Needs to Change**

**Ask yourself:**
- Is this a **node behavior** change? (execution logic)
- Is this a **node schema** change? (input/output structure)
- Is this a **node default** change? (default values)
- Is this a **node validation** change? (validation rules)

### **Step 2: Find the Right Location**

#### **For Node Execution Logic:**
**Location**: `worker/src/core/registry/unified-node-registry.ts`

**Method**: `convertNodeLibrarySchemaToUnified()` → `execute` function

**Example**:
```typescript
// In convertNodeLibrarySchemaToUnified()
execute: async (context: NodeExecutionContext) => {
  // YOUR UNIVERSAL LOGIC HERE
  // This applies to ALL workflows using this node type
  const { node, input, supabase } = context;
  
  // Example: Universal Gmail behavior
  if (schema.type === 'google_gmail') {
    // This logic applies to ALL Gmail nodes in ALL workflows
    return await sendGmailUniversal(input, supabase);
  }
}
```

#### **For Node Input/Output Schema:**
**Location**: `worker/src/core/registry/unified-node-registry.ts`

**Method**: `convertNodeLibrarySchemaToUnified()` → `inputSchema` / `outputSchema`

**Example**:
```typescript
// In convertNodeLibrarySchemaToUnified()
const inputSchema: NodeInputSchema = {
  // Add/modify fields here
  // This applies to ALL workflows
  to: {
    type: 'string',
    required: true,
    description: 'Recipient email address',
  },
  // ... other fields
};
```

#### **For Node Defaults:**
**Location**: `worker/src/core/registry/unified-node-registry.ts`

**Method**: `convertNodeLibrarySchemaToUnified()` → `defaultConfig`

**Example**:
```typescript
// In convertNodeLibrarySchemaToUnified()
const defaultConfig = {
  // Universal defaults for ALL workflows
  operation: 'send',
  priority: 'normal',
  // ... other defaults
};
```

#### **For Node Validation:**
**Location**: `worker/src/core/validation/schema-based-validator.ts`

**Method**: Add validation logic that uses `UnifiedNodeRegistry`

**Example**:
```typescript
// In schema-based-validator.ts
export function validateNodeConfig(node: WorkflowNode): ValidationResult {
  const nodeDef = unifiedNodeRegistry.get(node.type);
  if (!nodeDef) {
    return { valid: false, errors: ['Node type not found'] };
  }
  
  // Universal validation logic
  // This applies to ALL workflows
  return validateAgainstSchema(node.data.config, nodeDef.inputSchema);
}
```

---

## 🚫 **WHERE NOT TO MAKE CHANGES (Legacy Code)**

### **❌ DO NOT Modify These Files for Universal Changes:**

1. **`worker/src/api/execute-workflow.ts`**
   - Contains legacy `switch` statement
   - Only used as fallback for unmigrated nodes
   - Changes here are NOT universal

2. **`worker/src/services/ai/workflow-builder.ts`**
   - Contains workflow generation logic
   - Has many `if (node.type === ...)` checks
   - These are for **generation**, not **execution**
   - Changes here affect generation, not universal behavior

3. **Any file with `switch (node.type)` or `if (node.type === ...)`**
   - These are workflow-specific or generation-specific
   - NOT universal execution behavior

---

## ✅ **VERIFICATION: Is My Change Universal?**

### **Checklist:**

- [ ] Did I modify `UnifiedNodeRegistry`?
- [ ] Did I modify `UnifiedNodeDefinition`?
- [ ] Did I modify `schema-based-validator.ts` to use registry?
- [ ] Did I modify `dynamic-node-executor.ts` to use registry?
- [ ] Does my change apply to **ALL** workflows (existing + future)?
- [ ] Does my change apply to **ALL** AI-generated workflows?

**If YES to all**: ✅ Your change is universal!

**If NO to any**: ❌ Your change is NOT universal. Fix it!

---

## 🔧 **PRODUCTIVE PROMPT FOR CURSOR**

### **Use This Prompt Template:**

```
I need to make a UNIVERSAL change to [NODE_TYPE] that applies to ALL workflows in the entire project, not just one workflow.

REQUIREMENTS:
1. This change must apply to ALL existing workflows
2. This change must apply to ALL future workflows  
3. This change must apply to ALL AI-generated workflows
4. This is a UNIVERSAL node behavior change, not a workflow-specific change

CHANGE NEEDED:
[Describe the change you need]

ARCHITECTURE REQUIREMENTS:
- Modify UnifiedNodeRegistry in worker/src/core/registry/unified-node-registry.ts
- Ensure the change is in the node's UnifiedNodeDefinition
- Update the execute() function if it's execution logic
- Update inputSchema/outputSchema if it's schema change
- Update defaultConfig if it's default values
- DO NOT modify workflow-builder.ts or execute-workflow.ts for universal behavior
- DO NOT add node-specific if/else logic outside the registry

VERIFICATION:
- Confirm the change applies universally by checking:
  - UnifiedNodeRegistry.get(nodeType) returns updated definition
  - dynamic-node-executor.ts uses the registry (not hardcoded logic)
  - All workflows will use the new behavior automatically

This is a CORE ARCHITECTURE change, not a workflow-level patch.
```

---

## 📋 **EXAMPLE: Making Gmail Node Universal**

### **Scenario**: Change Gmail node to always include a default subject

### **❌ WRONG WAY (Workflow-Specific):**

```typescript
// In workflow-builder.ts - WRONG!
if (node.type === 'google_gmail') {
  if (!node.data.config.subject) {
    node.data.config.subject = 'Default Subject';
  }
}
```

**Problem**: Only applies during workflow generation, not execution.

### **✅ RIGHT WAY (Universal):**

```typescript
// In unified-node-registry.ts - CORRECT!
private convertNodeLibrarySchemaToUnified(schema: any): UnifiedNodeDefinition {
  // ... existing code ...
  
  if (schema.type === 'google_gmail') {
    const defaultConfig = {
      operation: 'send',
      subject: 'Default Subject', // ✅ Universal default
      // ... other defaults
    };
    
    return {
      // ... other fields ...
      defaultConfig,
      execute: async (context) => {
        const config = { ...defaultConfig, ...context.node.data.config };
        // Ensure subject is always set
        if (!config.subject) {
          config.subject = defaultConfig.subject;
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

## 🎯 **KEY PRINCIPLES**

1. **Single Source of Truth**: All node behavior in `UnifiedNodeRegistry`
2. **No Hardcoded Logic**: No `if (node.type === ...)` outside registry
3. **Universal by Default**: Changes in registry apply everywhere
4. **Execution Engine Uses Registry**: `dynamic-node-executor.ts` fetches from registry

---

## 🔍 **HOW TO CHECK IF CHANGE IS UNIVERSAL**

### **Test Your Change:**

1. **Check Registry**:
   ```typescript
   const nodeDef = unifiedNodeRegistry.get('google_gmail');
   console.log(nodeDef.defaultConfig); // Should show your change
   ```

2. **Check Execution**:
   - Create a new workflow with the node
   - Execute it
   - Verify the change applies

3. **Check Existing Workflows**:
   - Run an existing workflow with the node
   - Verify the change applies

4. **Check AI-Generated Workflows**:
   - Generate a workflow with AI
   - Verify the change applies

**If all pass**: ✅ Universal!

---

## 📚 **RELATED FILES**

- `worker/src/core/registry/unified-node-registry.ts` - **MAIN FILE** for universal changes
- `worker/src/core/execution/dynamic-node-executor.ts` - Uses registry (don't modify for universal changes)
- `worker/src/core/types/unified-node-contract.ts` - Type definitions
- `worker/src/core/validation/schema-based-validator.ts` - Validation using registry

---

## ✅ **SUMMARY**

**To make universal changes:**
1. ✅ Modify `UnifiedNodeRegistry`
2. ✅ Update `UnifiedNodeDefinition` for the node
3. ✅ Ensure `dynamic-node-executor.ts` uses registry (it already does)
4. ❌ DO NOT modify workflow-specific files
5. ❌ DO NOT add hardcoded node logic outside registry

**Result**: Change once → applies everywhere! 🎉

---

**Last Updated**: Current session  
**Status**: ✅ **PRODUCTION READY**
