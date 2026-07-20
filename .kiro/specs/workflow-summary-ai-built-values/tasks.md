# Implementation Plan: Workflow Summary AI-Built Values

## Overview

This implementation plan addresses two critical features in the workflow generation pipeline:

1. **Workflow Summary Generation Enhancement**: Add branching structure analysis to the AI-driven summary generator to correctly explain conditional workflows with branches, edges, and data flow paths
2. **AI-Built Field Values UI**: Create frontend field ownership toggle component to display and manage AI-built values with mode switching functionality

The implementation follows a phased approach: backend enhancements for workflow summary generation, frontend UI components for field ownership, and comprehensive integration testing.

**Implementation Language**: TypeScript (as specified in the design document)

## Tasks

### Phase 1: Workflow Summary Generation Enhancement

- [x] 1. Add branching structure analysis to AI-driven summary generator
  - [x] 1.1 Implement `analyzeBranchingStructure()` method in `ai-driven-workflow-summary-generator.ts`
    - Add method to analyze workflow graph structure
    - Identify branching nodes (if_else, switch) using `unifiedNodeRegistry.get(nodeType).isBranching`
    - Extract outgoing edges for each branching node
    - Build `BranchInfo` objects with nodeId, nodeType, branchType, and cases array
    - Identify merge points by counting incoming edges per node
    - Return `BranchingAnalysis` object with hasBranching flag, branches array, and mergePoints array
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_
  
  - [x] 1.2 Implement `buildNodeContextWithBranching()` method
    - Enhance node context string to include branching metadata
    - Format branch information for AI prompt consumption
    - Include edge routing information (true/false for if_else, case_N for switch)
    - Show merge point locations in execution flow
    - _Requirements: 1.1, 1.2, 1.3_
  
  - [x] 1.3 Update `createAIPrompt()` to include branch-aware instructions
    - Add branching logic detection section to prompt
    - Include explicit instructions for explaining each branch path separately
    - Add instructions for if_else: explain TRUE and FALSE branches
    - Add instructions for switch: explain ALL case branches
    - Add instructions for merge points where branches reconverge
    - Emphasize distinction between OBJECTIVE (business purpose) and DETAILED_FLOW (technical execution)
    - Add CONNECTIONS section instructions for edge routing and data flow
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7_
  
  - [x] 1.4 Update `formatAIResponse()` to extract branch explanations
    - Parse AI response for branch-specific content
    - Validate that OBJECTIVE and DETAILED_FLOW sections are distinct
    - Ensure CONNECTIONS section includes edge information
    - Format branch explanations with proper hierarchy
    - _Requirements: 1.6, 1.7_
  
  - [x] 1.5 Update `generateSummary()` method signature to accept workflow graph
    - Add optional `workflow?: Workflow` parameter to `AIWorkflowSummaryInput`
    - Add optional `edges?: WorkflowEdge[]` parameter to `AIWorkflowSummaryInput`
    - Update method to call `analyzeBranchingStructure()` when workflow is provided
    - Pass branching analysis to prompt creation and response formatting
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_
  
  - [x] 1.6 Write unit tests for branching analysis
    - Test `analyzeBranchingStructure()` with if_else node (2 branches)
    - Test `analyzeBranchingStructure()` with switch node (N cases)
    - Test merge point detection with multiple incoming edges
    - Test linear workflow (no branching)
    - Test nested branching structures
    - _Requirements: 1.1, 1.2, 1.3, 1.4_
  
  - [x] 1.7 Write unit tests for AI prompt generation
    - Test prompt includes branching instructions when branches detected
    - Test prompt distinguishes OBJECTIVE vs DETAILED_FLOW requirements
    - Test prompt includes CONNECTIONS section instructions
    - Test prompt for linear workflow (no branching instructions)
    - _Requirements: 1.6, 1.7_

- [x] 2. Checkpoint - Verify workflow summary generation
  - Ensure all tests pass, ask the user if questions arise.

### Phase 2: System Prompt Enhancement

- [x] 3. Update system prompt builder with branching context
  - [x] 3.1 Enhance capability selection prompt with branching awareness
    - Update `system-prompt-builder.ts` to include branching context in capability selection
    - Add instructions for identifying when conditional logic is needed
    - Include examples of branching vs linear workflows
    - _Requirements: 1.1, 1.2_
  
  - [x] 3.2 Enhance node selection prompt with branching metadata
    - Add branching node descriptions (if_else, switch) to node selection prompt
    - Include edge routing information in node selection context
    - Explain when to use branching nodes vs linear flow
    - _Requirements: 1.1, 1.2, 1.3_
  
  - [x] 3.3 Enhance edge reasoning prompt with branch routing
    - Add edge type explanations (main, true, false, case_N)
    - Include merge point detection in edge reasoning
    - Explain how edges connect branching nodes to targets
    - _Requirements: 1.5, 1.7_
  
  - [x] 3.4 Write unit tests for enhanced system prompts
    - Test capability selection prompt includes branching context
    - Test node selection prompt includes branching metadata
    - Test edge reasoning prompt includes branch routing
    - _Requirements: 1.1, 1.2, 1.3, 1.5, 1.7_

- [x] 4. Checkpoint - Verify system prompt enhancements
  - Ensure all tests pass, ask the user if questions arise.

### Phase 3: Frontend Field Ownership UI

- [x] 5. Create FieldOwnershipToggle component
  - [x] 5.1 Create `FieldOwnershipToggle.tsx` component file
    - Create new React component in `ctrl_checks/src/components/`
    - Accept props: fieldName, nodeId, currentMode, onModeChange, isLocked
    - Implement three-state toggle: "AI-built" (buildtime_ai_once), "You" (manual_static), "AI Runtime" (runtime_ai)
    - Display current mode with visual indicator
    - Handle locked state for credential-owned fields
    - _Requirements: 4.2, 4.3, 4.7_
  
  - [x] 5.2 Implement mode switching logic
    - Add click handler for toggle button
    - Cycle through modes: AI-built → You → AI Runtime → AI-built
    - Call `onModeChange` callback with new mode
    - Update visual state immediately (optimistic UI)
    - _Requirements: 4.3, 4.4_
  
  - [x] 5.3 Add value restoration functionality
    - Store original AI-built value in component state or context
    - When switching from "You" back to "AI-built", restore original value
    - Handle case where original value is not available (use empty/default)
    - _Requirements: 4.5_
  
  - [x] 5.4 Handle credential-owned fields with unlock
    - Check if field has `credentialTogglePolicy: 'locked'` from registry
    - Display lock icon when field is credential-owned and locked
    - Disable toggle when locked and not unlocked
    - Add unlock button/checkbox to allow user to unlock field
    - Update `_ownershipUnlock` flag when user unlocks field
    - _Requirements: 4.7, 5.6_
  
  - [x] 5.5 Write unit tests for FieldOwnershipToggle component
    - Test component renders with correct initial mode
    - Test mode switching cycles through all three modes
    - Test value restoration when switching back to AI-built
    - Test locked state disables toggle
    - Test unlock functionality enables toggle
    - _Requirements: 4.2, 4.3, 4.4, 4.5, 4.7_

- [x] 6. Integrate FieldOwnershipToggle with PropertiesPanel
  - [x] 6.1 Update PropertiesPanel to read `_fillMode` metadata
    - Read `node.data.config._fillMode` for each field
    - Pass current mode to FieldOwnershipToggle component
    - Display field value alongside toggle
    - _Requirements: 4.1, 4.2, 4.6_
  
  - [x] 6.2 Implement mode change handler in PropertiesPanel
    - Create handler function to update `_fillMode` in node config
    - Call attach-inputs endpoint with `mode_<nodeId>_<fieldName>` key
    - Update local state optimistically
    - Handle API errors and revert on failure
    - _Requirements: 4.4, 5.4_
  
  - [x] 6.3 Implement value restoration in PropertiesPanel
    - Store original AI-built values in component state or context
    - When user switches from "You" to "AI-built", restore original value
    - Call attach-inputs endpoint with restored value
    - _Requirements: 4.5_
  
  - [x] 6.4 Handle unlock functionality in PropertiesPanel
    - Add unlock checkbox/button for credential-owned fields
    - Call attach-inputs endpoint with `unlock_<nodeId>_<fieldName>` key
    - Update `_ownershipUnlock` flag in node config
    - Enable toggle when field is unlocked
    - _Requirements: 4.7, 5.6_
  
  - [x] 6.5 Write integration tests for PropertiesPanel with field ownership
    - Test PropertiesPanel displays FieldOwnershipToggle for each field
    - Test mode change updates node config and calls API
    - Test value restoration works end-to-end
    - Test unlock functionality enables toggle
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.7_

- [x] 7. Create useFieldOwnership hook
  - [x] 7.1 Create `useFieldOwnership.ts` hook file
    - Create custom React hook in `ctrl_checks/src/hooks/`
    - Accept parameters: workflowId, nodeId, fieldName
    - Return: currentMode, originalValue, isLocked, isUnlocked, changeMode, unlock, restoreValue
    - _Requirements: 4.2, 4.3, 4.4, 4.5, 4.7_
  
  - [x] 7.2 Implement mode change logic in hook
    - Call attach-inputs API with `mode_<nodeId>_<fieldName>` key
    - Update local state optimistically
    - Handle API errors and revert on failure
    - _Requirements: 4.4, 5.4_
  
  - [x] 7.3 Implement value restoration logic in hook
    - Store original AI-built value in hook state
    - Provide `restoreValue()` function to restore original value
    - Call attach-inputs API with restored value
    - _Requirements: 4.5_
  
  - [x] 7.4 Implement unlock logic in hook
    - Call attach-inputs API with `unlock_<nodeId>_<fieldName>` key
    - Update `isUnlocked` state
    - _Requirements: 4.7, 5.6_
  
  - [x] 7.5 Write unit tests for useFieldOwnership hook
    - Test hook returns correct initial state
    - Test changeMode calls API and updates state
    - Test restoreValue restores original value
    - Test unlock enables toggle
    - Test error handling reverts state
    - _Requirements: 4.2, 4.3, 4.4, 4.5, 4.7_

- [x] 8. Checkpoint - Verify frontend field ownership UI
  - Ensure all tests pass, ask the user if questions arise.

### Phase 4: Integration and Testing

- [x] 9. End-to-end testing of workflow generation with branching
  - [x] 9.1 Write E2E test for if_else workflow with AI-built values
    - Generate workflow with if_else node from user prompt
    - Verify branching structure (2 branches: true, false)
    - Verify AI-built values populated with `_fillMode: 'buildtime_ai_once'`
    - Verify workflow summary explains both branches
    - _Requirements: 1.1, 1.2, 2.1, 2.2, 2.3_
  
  - [x] 9.2 Write E2E test for switch workflow with AI-built values
    - Generate workflow with switch node from user prompt
    - Verify branching structure (N cases)
    - Verify AI-built values populated for all branches
    - Verify workflow summary explains all case branches
    - _Requirements: 1.2, 2.1, 2.2, 2.3_
  
  - [x] 9.3 Write E2E test for nested branching workflow
    - Generate workflow with nested if_else or switch nodes
    - Verify nested branching structure
    - Verify AI-built values populated at all levels
    - Verify workflow summary explains nested branching with hierarchy
    - _Requirements: 1.4, 2.1, 2.2, 2.3_

- [x] 10. End-to-end testing of AI-built value preservation
  - [x] 10.1 Write E2E test for attach-inputs preserves AI-built values
    - Generate workflow with AI-built values
    - Call attach-inputs with empty values for AI-built fields
    - Verify AI-built values preserved (not overwritten)
    - Verify `_fillMode` remains `buildtime_ai_once`
    - _Requirements: 3.1, 3.2, 3.6_
  
  - [x] 10.2 Write E2E test for attach-inputs prevents array shrinking
    - Generate workflow with AI-built array field (N items)
    - Call attach-inputs with fewer than N items
    - Verify original array preserved
    - _Requirements: 3.2, 3.6_
  
  - [x] 10.3 Write E2E test for attach-inputs prevents object shrinking
    - Generate workflow with AI-built object field (rich config)
    - Call attach-inputs with sparse object
    - Verify original object preserved
    - _Requirements: 3.2, 3.6_
  
  - [x] 10.4 Write E2E test for user override updates fillMode
    - Generate workflow with AI-built values
    - User explicitly changes field value in UI
    - Verify `_fillMode` updated to `manual_static`
    - Verify new value accepted
    - _Requirements: 3.4_

- [x] 11. End-to-end testing of field ownership UI round-trip
  - [x] 11.1 Write E2E test for field ownership UI displays AI-built values
    - Generate workflow with AI-built values
    - Open credential field ownership UI
    - Verify all field values displayed
    - Verify toggles show "AI-built" for buildtime_ai_once fields
    - _Requirements: 4.1, 4.2_
  
  - [x] 11.2 Write E2E test for mode switching from AI-built to You
    - Generate workflow with AI-built values
    - Switch field from "AI-built" to "You" in UI
    - Verify `_fillMode` updated to `manual_static`
    - Verify user can edit field value
    - _Requirements: 4.3, 4.4_
  
  - [x] 11.3 Write E2E test for mode switching from You to AI-built
    - Generate workflow with AI-built values
    - Switch field to "You" and modify value
    - Switch back to "AI-built"
    - Verify original AI-built value restored
    - Verify `_fillMode` updated to `buildtime_ai_once`
    - _Requirements: 4.3, 4.5_
  
  - [x] 11.4 Write E2E test for credential-owned field unlock
    - Generate workflow with credential-owned field
    - Verify toggle disabled (locked)
    - Unlock field in UI
    - Verify toggle enabled
    - Verify `_ownershipUnlock` flag set
    - _Requirements: 4.7, 5.6_

- [x] 12. Performance and load testing
  - [x] 12.1 Test workflow summary generation performance
    - Generate workflows with varying complexity (10, 50, 100 nodes)
    - Measure summary generation time
    - Verify performance acceptable (<5s for 100 nodes)
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_
  
  - [x] 12.2 Test attach-inputs performance with large workflows
    - Create workflow with 100+ nodes and AI-built values
    - Call attach-inputs with various input combinations
    - Measure response time
    - Verify merge guard performance acceptable
    - _Requirements: 3.1, 3.2, 3.6_
  
  - [x] 12.3 Test field ownership UI performance
    - Open PropertiesPanel with 50+ fields
    - Toggle multiple field ownership modes
    - Measure UI responsiveness
    - Verify no performance degradation
    - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [x] 13. Documentation updates
  - [x] 13.1 Update AI_DRIVEN_WORKFLOW_SUMMARY_GENERATION.md
    - Document branching structure analysis
    - Add examples of branch-aware summaries
    - Explain OBJECTIVE vs DETAILED_FLOW distinction
    - Document CONNECTIONS section requirements
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7_
  
  - [x] 13.2 Update AI_WORKFLOW_ARCHITECTURE.md
    - Document AI-built value population flow
    - Explain `_fillMode` metadata synchronization
    - Document attach-inputs merge guard behavior
    - Add field ownership UI architecture
    - _Requirements: 2.1, 2.2, 2.3, 3.1, 3.2, 3.6, 4.1, 4.2, 4.3, 4.4, 4.5, 4.7_
  
  - [x] 13.3 Create FIELD_OWNERSHIP_UI_GUIDE.md
    - Document how to use field ownership toggles
    - Explain AI-built vs You vs AI Runtime modes
    - Document value restoration behavior
    - Explain credential-owned field unlock
    - Add screenshots and examples
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7_

- [x] 14. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- All code examples use TypeScript as specified in the design document
- Backend changes follow registry-driven architecture (no hardcoding)
- Frontend changes follow React best practices with hooks and components
- Integration tests validate end-to-end workflows
- Performance tests ensure scalability

## Implementation Dependencies

**Phase 1 depends on**:
- Existing `ai-driven-workflow-summary-generator.ts`
- Existing `unifiedNodeRegistry`
- Existing `Workflow` and `WorkflowEdge` types

**Phase 2 depends on**:
- Phase 1 completion (branching analysis)
- Existing `system-prompt-builder.ts`

**Phase 3 depends on**:
- Existing `PropertiesPanel.tsx`
- Existing attach-inputs API endpoint
- Existing `_fillMode` metadata in node configs

**Phase 4 depends on**:
- Phase 1, 2, and 3 completion
- Existing test infrastructure

## Estimated Effort

- **Phase 1**: 2-3 days (backend workflow summary enhancement)
- **Phase 2**: 1-2 days (system prompt enhancement)
- **Phase 3**: 3-4 days (frontend field ownership UI)
- **Phase 4**: 2-3 days (integration and testing)

**Total**: 8-12 days for complete implementation

## Success Criteria

1. Workflow summaries correctly explain branching logic for if_else and switch nodes
2. OBJECTIVE and DETAILED_FLOW sections contain distinct content
3. CONNECTIONS section explains edge routing and data flow
4. AI-built values are preserved through attach-inputs pipeline
5. Field ownership UI displays AI-built values with toggles
6. Users can switch between AI-built, You, and AI Runtime modes
7. Value restoration works when switching back to AI-built
8. Credential-owned fields can be unlocked
9. All unit tests pass
10. All integration tests pass
11. Performance meets acceptable thresholds
12. Documentation is complete and accurate
