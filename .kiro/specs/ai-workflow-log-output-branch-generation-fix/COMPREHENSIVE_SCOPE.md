# Comprehensive Scope - AI Workflow Log Output Branch Generation Fix

## Overview

This spec has been **comprehensively updated** to cover **ALL** auto-injection and hardcoding issues across the entire repository. The fix is now truly universal and will prevent ANY file from overriding the intent-driven behavior.

## Total Files Modified: 15

### Phase 1: Revert Multi-Input Capability (4 files)
1. `worker/src/core/registry/overrides/log-output.ts` - Remove `allowsMultipleInputs: true`
2. `worker/src/core/validation/dag-validator.ts` - Restore hardcoded log_output in-degree check
3. `worker/src/core/orchestration/edge-reconciliation-engine.ts` - Restore splitMultiInputLogOutputs behavior
4. `worker/src/core/validation/graph-branching-validator.ts` - Restore category/tag heuristic

### Phase 2: Fix AI Workflow Generation (5 files)
5. `worker/src/core/registry/overrides/log-output.ts` - Change `alwaysRequired: false`, `autoInject: false`
6. `worker/src/services/ai/production-workflow-builder.ts` - Make `ensureAlwaysRequiredTerminalNodes` and `createSwitchBranchLogStub` intent-driven
7. `worker/src/services/ai/workflow-builder.ts` - Add branch-specific output analysis
8. `worker/src/services/ai/system-prompt-builder.ts` - Add branch-aware output instructions
9. `worker/src/core/orchestration/unified-graph-orchestrator.ts` - Add validation to prevent multi-input

### Phase 3: Remove Auto-Injection from Additional Files (6 files)
10. `worker/src/services/ai/error-branch-injector.ts` - Make error logging intent-driven
11. `worker/src/services/ai/safety-node-injector.ts` - Enforce intent detection for safety logging
12. `worker/src/services/ai/missing-node-injector.ts` - Make missing node detection intent-driven
13. `worker/src/services/ai/node-sufficiency-checker.ts` - Remove `alwaysRequired` flag check
14. `worker/src/core/orchestration/unified-graph-orchestrator.ts` - Remove flag-based preservation
15. `worker/src/core/orchestration/edge-reconciliation-engine.ts` - Remove flag-based preservation

## Bug Conditions Addressed: 15

### Original Issues (1.1-1.9)
- Automatic injection via `ensureAlwaysRequiredTerminalNodes`
- Registry flags forcing auto-injection
- Automatic switch branch log stubs
- Invalid merge topology for branching workflows
- Ignoring branch-specific output requirements
- Incorrect nested branching handling
- Adding log_output to all branches instead of specific ones
- Multiple incoming edges to single log_output
- Forcing log_output when not requested

### Additional Issues Discovered (1.10-1.15)
- Error-branch-injector auto-injection
- Safety-node-injector auto-injection
- Missing-node-injector auto-injection
- Node-sufficiency-checker preserving based on flags
- Unified-graph-orchestrator preserving based on flags
- Edge-reconciliation-engine preserving based on flags

## Expected Behaviors: 15

All 15 bug conditions now have corresponding expected behaviors (2.1-2.15) that make the system **purely intent-driven**.

## Implementation Tasks: 18

### Phase 1: Revert (Tasks 1-6)
- Task 1: Write bug condition exploration test
- Task 2: Write preservation property tests
- Tasks 3-6: Revert multi-input capability in 4 files

### Phase 2: Fix AI Generation (Tasks 7-11)
- Tasks 7-10: Fix AI workflow generation in 5 files
- Task 11: Checkpoint verification

### Phase 3: Remove Additional Auto-Injection (Tasks 12-18)
- Tasks 12-17: Make 6 additional files intent-driven
- Task 18: Final comprehensive verification

## Key Principles

### 1. Purely Intent-Driven
- **ONLY** generate log_output when user explicitly requests logging
- Check for logging keywords: "log", "output", "record", "track", "observe", "monitor"
- NO automatic injection from ANY file
- NO hardcoded defaults

### 2. Branch-Specific Outputs
- Analyze which branches need which output nodes
- Generate SEPARATE log_output nodes per branch when needed
- Each log_output has exactly ONE incoming edge
- NO shared log_output across multiple branches

### 3. No Flag-Based Behavior
- Remove `alwaysRequired: true` from registry
- Remove `autoInject: true` from registry
- Remove `exemptFromRemoval: true` from registry
- Remove ALL flag-based preservation logic

### 4. Universal Coverage
- ALL 15 files that touch log_output are updated
- NO file can override the intent-driven behavior
- Comprehensive testing covers all code paths

## Verification Checklist

After implementation, verify:

- [ ] Zero `allowsMultipleInputs: true` for log_output
- [ ] Zero `alwaysRequired: true` for log_output
- [ ] AI generates separate log_output per branch
- [ ] No automatic log_output injection from ANY file
- [ ] No multi-input edges to log_output
- [ ] Error-branch-injector respects intent
- [ ] Safety-node-injector respects intent
- [ ] Missing-node-injector respects intent
- [ ] Node-sufficiency-checker respects intent
- [ ] Unified-graph-orchestrator respects intent
- [ ] Edge-reconciliation-engine respects intent
- [ ] Workflows WITHOUT logging keywords have ZERO log_output
- [ ] Workflows WITH logging keywords have log_output ONLY where requested

## Impact

This fix ensures that:
1. **No workflow will have unwanted log_output nodes**
2. **Branching workflows will have correct topology**
3. **User intent is the ONLY driver for log_output generation**
4. **No file in the repo can override this behavior**

## Next Steps

1. Review the updated spec files:
   - `bugfix.md` - Now has 15 bug conditions and 15 expected behaviors
   - `design.md` - Now covers all 15 files with detailed changes
   - `tasks.md` - Now has 18 comprehensive tasks

2. Begin implementation by opening `tasks.md` and working through tasks sequentially

3. Run tests after each phase to ensure no regressions

4. Final verification ensures ALL auto-injection points are eliminated
