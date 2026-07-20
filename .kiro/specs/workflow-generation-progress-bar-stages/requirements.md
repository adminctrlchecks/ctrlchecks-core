# Requirements Document

## Introduction

The workflow generation UI shows a "Building Your Workflow" screen with a progress bar. Currently the bar is set to 5% when generation starts and jumps directly to 100% when the pipeline finishes. The backend AI-first pipeline runs through 8 named stages (intent, structural_prompt, node_selection, edge_reasoning, validation, property_population, credential_discovery, field_ownership) but never emits intermediate progress events to the frontend.

This feature connects the backend pipeline stage completions to the frontend progress bar so the bar advances incrementally as each stage finishes, and the System Logs panel shows a human-readable label for each stage as it completes.

## Glossary

- **Pipeline**: The `AiFirstPipeline` in `worker/src/services/ai/ai-first-pipeline.ts` that runs 8 sequential stages to generate a workflow.
- **Stage**: One named step inside the Pipeline (e.g. `intent`, `node_selection`). Each stage has a start time, end time, and result.
- **Stage Event**: A newline-delimited JSON object written to the HTTP response stream when a stage completes, containing `current_phase`, `progress_percentage`, and a `log` label.
- **Progress Bar**: The `<Progress>` component rendered during the `building` wizard step, driven by the `progress` state variable (0–100).
- **System Logs Panel**: The scrollable list of `buildingLogs` strings shown alongside the progress bar during the `building` step.
- **Stage Progress Map**: A lookup table that maps each known stage name to a target progress percentage (0–100).
- **Streaming Response**: The HTTP response from `POST /api/generate-workflow` when the `x-stream-progress: true` header is present. The body is newline-delimited JSON (NDJSON).
- **Frontend Wizard**: `AutonomousAgentWizard` in `ctrl_checks/src/components/workflow/AutonomousAgentWizard.tsx`.
- **deriveMonotonicProgress**: Existing helper that ensures progress never decreases and never exceeds 100.

## Requirements

### Requirement 1: Stage-to-Progress Mapping

**User Story:** As a developer, I want a single authoritative mapping from pipeline stage names to progress percentages, so that both the backend emitter and frontend parser agree on what percentage each stage represents.

#### Acceptance Criteria

1. THE Stage_Progress_Map SHALL define a target percentage for each of the following stage names: `intent`, `structural_prompt`, `node_selection`, `edge_reasoning`, `validation`, `property_population`, `credential_discovery`, `field_ownership`.
2. THE Stage_Progress_Map SHALL assign percentages in strictly ascending order matching the pipeline execution order, starting above 5% and ending below 100%.
3. IF a stage name is not present in the Stage_Progress_Map, THEN THE Stage_Progress_Map SHALL return a non-zero fallback percentage rather than 0 or undefined.
4. FOR ALL stage names in the Stage_Progress_Map, the mapped percentage SHALL be greater than 0 and less than 100.
5. FOR ALL pairs of consecutive stages in pipeline execution order, the later stage SHALL map to a strictly higher percentage than the earlier stage (round-trip property: the map is monotonically ordered by pipeline position).

### Requirement 2: Backend Stage Event Emission

**User Story:** As a frontend developer, I want the backend to emit a progress event after each pipeline stage completes, so that the frontend can update the progress bar in real time.

#### Acceptance Criteria

1. WHEN the `x-stream-progress: true` request header is present, THE Pipeline SHALL write a Stage Event to the response stream after each stage completes.
2. THE Stage Event SHALL be a valid JSON object serialized as a single line followed by a newline character (`\n`).
3. THE Stage Event SHALL include the field `current_phase` set to the completed stage name.
4. THE Stage Event SHALL include the field `progress_percentage` set to the value from the Stage_Progress_Map for that stage.
5. THE Stage Event SHALL include the field `log` set to a human-readable label describing the completed stage (e.g. `"Extracting intent..."`).
6. WHEN the Pipeline completes successfully, THE Pipeline SHALL write a final Stage Event with `progress_percentage` set to 99 and `current_phase` set to `"finalizing"` before writing the terminal workflow payload.
7. IF the `x-stream-progress: true` header is absent, THEN THE Pipeline SHALL NOT write Stage Events and SHALL return a single JSON response as before (backward-compatible).
8. WHILE the Pipeline is emitting Stage Events, THE Pipeline SHALL set the `Content-Type` response header to `application/x-ndjson` and call `res.flushHeaders()` before the first stage begins.

### Requirement 3: Frontend Stage Event Consumption

**User Story:** As a user, I want the progress bar to advance smoothly as each pipeline stage completes, so that I can see the workflow is actively being built rather than stuck at 5%.

#### Acceptance Criteria

1. WHEN a Stage Event with `current_phase` is received from the stream, THE Frontend_Wizard SHALL update the `progress` state to the value of `progress_percentage` from the event using `deriveMonotonicProgress` to ensure the bar never goes backwards.
2. WHEN a Stage Event with `current_phase` is received, THE Frontend_Wizard SHALL append the `log` field value from the event to the `buildingLogs` array, provided the log line is not already present.
3. THE Frontend_Wizard SHALL NOT set `progress` to 100 until the terminal workflow payload (containing `nodes` and `edges`) is received and successfully processed.
4. WHEN the terminal workflow payload is received, THE Frontend_Wizard SHALL set `progress` to 100 and `isComplete` to `true`.
5. IF a Stage Event is received with an unrecognized `current_phase`, THE Frontend_Wizard SHALL still update `progress` using the `progress_percentage` field if present, and SHALL append the `log` field to `buildingLogs`.
6. THE Frontend_Wizard SHALL stop the fallback progress interval as soon as the first Stage Event with `current_phase` is received.

### Requirement 4: Progress Bar Monotonicity and Bounds

**User Story:** As a user, I want the progress bar to only move forward and stay within 0–100%, so that the UI feels stable and trustworthy.

#### Acceptance Criteria

1. THE Progress_Bar SHALL never display a value less than its previously displayed value during a single build session.
2. THE Progress_Bar SHALL never display a value greater than 100.
3. THE Progress_Bar SHALL display 0 at the start of a new build session before any Stage Events are received.
4. FOR ALL sequences of Stage Events received in any order, the final displayed progress SHALL equal the maximum `progress_percentage` seen across all events (monotonic invariant).

### Requirement 5: System Logs Panel Stage Labels

**User Story:** As a user, I want the System Logs panel to show a readable label for each pipeline stage as it completes, so that I understand what the system is doing.

#### Acceptance Criteria

1. THE System_Logs_Panel SHALL display one log entry per completed pipeline stage, using the `log` field from the Stage Event.
2. THE System_Logs_Panel SHALL NOT display duplicate log entries for the same stage within a single build session.
3. WHEN the terminal workflow payload is received, THE System_Logs_Panel SHALL append a final entry indicating successful completion (e.g. `"Workflow Generated Successfully!"`).
4. IF the pipeline fails, THE System_Logs_Panel SHALL append an entry describing the failure stage and reason.
