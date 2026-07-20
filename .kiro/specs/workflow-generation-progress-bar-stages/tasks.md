# Implementation Plan: Workflow Generation Progress Bar Stages

## Overview

Wire the 8 backend pipeline stages to the frontend progress bar via NDJSON streaming. The backend emits a stage event after each stage completes; the frontend parses those events to advance the progress bar and populate the System Logs panel incrementally.

## Tasks

- [x] 1. Create shared stage-progress-map module
  - Create `worker/src/services/ai/stage-progress-map.ts` with `STAGE_PROGRESS_MAP`, `STAGE_LOG_LABELS`, and `getStageProgress`
  - `STAGE_PROGRESS_MAP` must cover all 8 stage names in pipeline execution order with strictly ascending values in (0, 100): `intent:10`, `structural_prompt:20`, `node_selection:35`, `edge_reasoning:50`, `validation:62`, `property_population:74`, `credential_discovery:85`, `field_ownership:93`
  - `getStageProgress` returns `STAGE_PROGRESS_MAP[stageName] ?? 5` (non-zero fallback for unknown stages)
  - Export `PIPELINE_STAGE_ORDER` as a `readonly string[]` of the 8 stage names in execution order (used by property tests)
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [ ]* 1.1 Write property test for Stage Progress Map monotonicity
  - **Property 1: Stage Progress Map Monotonicity**
  - For each consecutive pair `(PIPELINE_STAGE_ORDER[i], PIPELINE_STAGE_ORDER[i+1])`, assert `getStageProgress(i) > 0 && getStageProgress(i+1) > getStageProgress(i) && getStageProgress(i+1) < 100`
  - Use `fc.integer({ min: 0, max: PIPELINE_STAGE_ORDER.length - 2 })` as the arbitrary
  - **Validates: Requirements 1.2, 1.4, 1.5**

- [ ]* 1.2 Write property test for unknown stage fallback
  - **Property 2: Unknown Stage Fallback is Non-Zero**
  - Use `fc.string().filter(s => !(s in STAGE_PROGRESS_MAP))` as the arbitrary; assert `getStageProgress(s) > 0 && getStageProgress(s) < 100`
  - **Validates: Requirements 1.3**

- [x] 2. Add `onStageComplete` callback to `AiFirstPipeline`
  - In `worker/src/services/ai/ai-first-pipeline.ts`, add `onStageComplete?: (stageName: string, progress: number, log: string) => void` to the `AiPipelineInput` interface
  - Import `getStageProgress` and `STAGE_LOG_LABELS` from `./stage-progress-map`
  - After each `stageTrace.push(...)` call for the 8 named stages (`intent`, `structural_prompt`, `node_selection`, `edge_reasoning`, `validation`, `property_population`, `credential_discovery`, `field_ownership`), invoke `input.onStageComplete?.(stageName, getStageProgress(stageName), STAGE_LOG_LABELS[stageName] ?? stageName)` — wrap each call in a try/catch so a throwing callback never aborts the pipeline
  - Do not invoke the callback for the `build_manifest` internal trace entry
  - _Requirements: 2.1, 2.3, 2.4, 2.5_

- [ ]* 2.1 Write property test for stage event count
  - **Property 4: Stage Event Count Matches Completed Stages**
  - Instantiate `AiFirstPipeline` with a mocked deps object; pass an `onStageComplete` that pushes to an array; assert the array length equals the number of stages that completed (use a mock pipeline that completes all 8 stages)
  - **Validates: Requirements 2.1**

- [x] 3. Update `generate-workflow.ts` to support streaming mode
  - In `worker/src/api/generate-workflow.ts`, detect `req.headers['x-stream-progress'] === 'true'` in the `refine`/no-mode branch
  - When streaming: call `res.setHeader('Content-Type', 'application/x-ndjson')`, `res.setHeader('Transfer-Encoding', 'chunked')`, and `res.flushHeaders()` before calling `pipeline.run()`
  - Define a `writeEvent = (event: object) => res.write(JSON.stringify(event) + '\n')` helper
  - Pass `onStageComplete: (stageName, progress, log) => writeEvent({ current_phase: stageName, progress_percentage: progress, log })` in the `pipeline.run()` input
  - After `pipeline.run()` resolves successfully, write the finalizing sentinel: `writeEvent({ current_phase: 'finalizing', progress_percentage: 99, log: 'Finalizing workflow...' })`
  - Write the terminal payload as a single NDJSON line (same fields as the current `res.json()` call, plus `success: true` and `phase: 'ready'`), then call `res.end()`
  - On pipeline error (`!result.ok`), write `{ status: 'error', error: result.code, message: result.message }` as the final NDJSON line, then `res.end()`
  - When the header is absent, keep the existing `res.json(...)` path unchanged (backward-compatible)
  - _Requirements: 2.1, 2.2, 2.6, 2.7, 2.8_

- [ ]* 3.1 Write property test for stage events as valid NDJSON
  - **Property 3: Stage Events Are Valid NDJSON**
  - For each line written by `writeEvent`, assert it is a valid JSON object with `current_phase` (string), `progress_percentage` (number in 0–99), and `log` (non-empty string)
  - Use a mock `res.write` that collects lines; run through all 8 stage names plus `'finalizing'`
  - **Validates: Requirements 2.2, 2.3, 2.4, 2.5**

- [x] 4. Checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Update `AutonomousAgentWizard.tsx` to consume stage events
  - The request already sends `'x-stream-progress': 'true'`; no header change needed
  - In the `current_phase` branch of the stream-reading loop (around line 4262), replace `getPhaseDescription(update.current_phase)` with `update.log ?? getPhaseDescription(update.current_phase)` so the label comes from the backend's `STAGE_LOG_LABELS` when present, falling back to the existing local map for backward compatibility
  - The `stopFallbackProgress()` call on the first `current_phase` event is already present; verify it is unconditional (not gated on a specific phase name) — if it is gated, remove the gate
  - Verify the existing `deriveMonotonicProgress` call already caps stage events at 99 (`Math.min(99, ...)`) so progress never reaches 100 from stage events alone; if not, add the cap
  - No structural changes to the stream-reading loop are required — the backend now emits the events the loop already handles
  - _Requirements: 3.1, 3.2, 3.3, 3.6_

- [ ]* 5.1 Write property test for progress bar monotonicity
  - **Property 5: Progress Bar Monotonicity**
  - Use `fc.float({ min: 0, max: 100 })` and `fc.float({ min: 0, max: 150 })` as arbitraries; assert `deriveMonotonicProgress(prev, next) >= Math.min(prev, 100) && deriveMonotonicProgress(prev, next) <= 100`
  - **Validates: Requirements 4.1, 4.2**

- [ ]* 5.2 Write property test for progress never reaching 100 from stage events alone
  - **Property 6: Progress Never Reaches 100 from Stage Events Alone**
  - Use `fc.array(fc.record({ current_phase: fc.constantFrom(...PIPELINE_STAGE_ORDER, 'finalizing'), progress_percentage: fc.integer({ min: 0, max: 99 }), log: fc.string({ minLength: 1 }) }), { minLength: 1, maxLength: 20 })` as the arbitrary
  - Simulate the frontend accumulation loop using `deriveMonotonicProgress`; assert final progress `< 100`
  - **Validates: Requirements 3.3**

- [ ]* 5.3 Write property test for buildingLogs deduplication
  - **Property 7: BuildingLogs Deduplication**
  - Use `fc.array(fc.string({ minLength: 1 }), { minLength: 1, maxLength: 30 })` as the arbitrary
  - Simulate the `setBuildingLogs` dedup pattern (`if (!prev.includes(line)) return [...prev, line]`); assert `new Set(logs).size === logs.length`
  - **Validates: Requirements 3.2, 5.1, 5.2**

- [ ]* 5.4 Write property test for final progress equals maximum seen
  - **Property 8: Final Progress Equals Maximum Seen**
  - Use `fc.array(fc.integer({ min: 0, max: 99 }), { minLength: 1, maxLength: 20 })` as the arbitrary
  - Simulate accumulation with `deriveMonotonicProgress`; assert `result === Math.min(99, Math.max(...percentages))`
  - **Validates: Requirements 4.4**

- [x] 6. Final checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Property tests use **fast-check** (`fc`) which is already present in the codebase
- The `onStageComplete` callback is always wrapped in try/catch inside the pipeline so a throwing callback never aborts generation
- Backward compatibility is preserved: requests without `x-stream-progress: true` continue to receive a single `res.json()` response
