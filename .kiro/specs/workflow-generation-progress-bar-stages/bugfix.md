# Bugfix Requirements Document

## Introduction

The "Building Your Workflow" progress screen has two related bugs. The progress bar stays at 5% for the entire duration of backend processing, then jumps directly to 100% when done. The System Logs panel shows static placeholder messages instead of real-time stage labels from the AI pipeline.

The root cause is a phase name mismatch: the frontend's `mapBackendPhaseToProgress` and `getPhaseDescription` functions use legacy phase names (`understand`, `planning`, `construction`, etc.) while the backend's `AiFirstPipeline` emits real stage names (`intent`, `structural_prompt`, `node_selection`, `edge_reasoning`, `validation`, `property_population`, `credential_discovery`, `field_ownership`). Because no real stage name matches the frontend's lookup tables, every stage event falls through to the fallback value, leaving progress stuck near 5% until the terminal payload arrives.

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN the backend emits a stage event with `current_phase` set to a real pipeline stage name (e.g. `intent`, `node_selection`, `edge_reasoning`) THEN the system returns the fallback progress value (10) from `mapBackendPhaseToProgress` because the phase name does not match any key in the frontend's legacy phase map

1.2 WHEN the backend emits a stage event with `current_phase` set to a real pipeline stage name THEN the system displays `"Processing..."` in the System Logs panel because `getPhaseDescription` has no entry for real stage names and falls through to its default

1.3 WHEN all pipeline stages complete and the terminal workflow payload arrives THEN the system jumps the progress bar directly from 5% to 100% with no intermediate updates, because no stage event ever advanced the progress state

### Expected Behavior (Correct)

2.1 WHEN the backend emits a stage event with `current_phase` set to a real pipeline stage name (e.g. `intent`, `node_selection`, `edge_reasoning`) THEN the system SHALL return the correct progress percentage for that stage from `mapBackendPhaseToProgress` (e.g. `intent` → 10, `node_selection` → 35, `edge_reasoning` → 50)

2.2 WHEN the backend emits a stage event with `current_phase` set to a real pipeline stage name THEN the system SHALL display a human-readable label for that stage in the System Logs panel (e.g. `"Extracting intent..."`, `"Selecting workflow nodes..."`) instead of `"Processing..."`

2.3 WHEN the backend emits stage events for all 8 pipeline stages in sequence THEN the system SHALL advance the progress bar incrementally through at least 8 distinct values between 5% and 100%, never regressing

### Unchanged Behavior (Regression Prevention)

3.1 WHEN the terminal workflow payload (containing `nodes` and `edges`) is received THEN the system SHALL CONTINUE TO set progress to 100 and `isComplete` to true

3.2 WHEN a stage event is received with an unrecognized `current_phase` value THEN the system SHALL CONTINUE TO use the `progress_percentage` field from the event if present, and fall back to a non-zero default otherwise

3.3 WHEN the `x-stream-progress` header is absent THEN the system SHALL CONTINUE TO return a single non-streaming JSON response from the backend (backward-compatible path unchanged)

3.4 WHEN the build starts THEN the system SHALL CONTINUE TO initialize progress to 5 and `buildingLogs` to the initial placeholder message before any stage events arrive

3.5 WHEN `deriveMonotonicProgress` is called with a new value lower than the current progress THEN the system SHALL CONTINUE TO return the current (higher) value, ensuring the bar never goes backwards
