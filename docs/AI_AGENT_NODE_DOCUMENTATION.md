# AI Agent Node

The `ai_agent` node supports production tool-calling while preserving the legacy single-shot behavior for workflows with no attached tool nodes.

## Handles

Canonical handles:

- Main input: `userInput`
- Attachment inputs: `chat_model`, `memory`, `tool`
- Outputs: `success`, `error`

Legacy compatibility:

- `input` is accepted as an alias for `userInput`.
- `chatModel` is accepted as an alias for `chat_model` at agent boundaries.
- `output` remains available as a legacy output handle.

Attachment edges are persisted in the workflow graph, but the runtime planning path filters `chat_model`, `memory`, and `tool` attachment edges out of normal dependency/topological execution. The agent receives the full persisted graph through `NodeExecutionContext.agentGraph`.

## Canvas Placement UX

The AI Agent node now exposes first-class placement slots on the node card:

- `Model` places one chat/model node on the `chat_model` attachment handle.
- `Memory` places one memory node on the `memory` attachment handle.
- `Tools` places any eligible non-trigger node on the `tool` attachment handle.

Click `Place` on a slot to open the searchable node picker. Choosing a node creates it near the agent, renders it as a compact circular attached node, and automatically saves the correct attachment edge. Users do not need to drag a node from the library or manually choose the technical handle for common agent setup.

The circular attached nodes are visual sugar over normal workflow nodes: selecting the circle still opens that node's configuration, and the persisted edge still uses `chat_model`, `memory`, or `tool` so backend execution behaves exactly like manually connected attachments.

## Tool Eligibility

Attached tools are discovered dynamically from the unified node registry. A node is eligible when it:

- Is attached to the agent through the `tool` handle.
- Exists in the registry.
- Is not a trigger (`category === "trigger"` or `"triggers"`).
- Is not marked `internalOnly`.
- Is not the agent itself.

The agent module does not maintain node-type allowlists. New registry nodes become eligible tools automatically when they pass the generic predicate and are attached through the `tool` handle.

## Tool Execution

Tool calls are executed only through the existing `executeNode()` path. The bridge preserves the attached node config and `connectionRefs`, overlays validated model arguments, and returns a sanitized result to the model.

Tool arguments are validated against the generated manifest schema. Unknown arguments, missing required arguments, and type mismatches are rejected before execution.

## Model Calling

The agent uses `ChatModelAdapter`:

- Gemini uses native function declarations first.
- Other providers use a structured JSON tool protocol fallback.

Secrets, API keys, OAuth values, credential-owned fields, and sensitive logs are excluded from tool manifests and sanitized from tool results/errors before they can be shown to the model.

## Guardrails

The current human-in-the-loop implementation is a guardrail gate. Calls classified as `write` or `destructive` can be blocked by configuration and surfaced as structured failures. Omitted `firstRunClass` defaults to `write`.

Runtime guardrails include:

- Iteration limit
- Timeout
- Repeated tool-call loop detection
- Result size cap
- Secret/error sanitization

## Memory

Memory is a thin wrapper over `HybridMemoryService`. Supported scopes are:

- `none`
- `conversation`
- `user`

Memory recall is added to the agent prompt when configured; successful answers can be written back through the shared service.

## Zero-Tool Compatibility

When there is no attached `tool` edge, `ai_agent` delegates to the existing legacy executor path. This preserves byte-compatible legacy output behavior, including the `output` handle.

## Verification

Focused checks run for this implementation:

- `worker`: `npx jest src/core/execution/agent/__tests__/tool-manifest.test.ts --runInBand --no-coverage`
- `worker`: `npx jest src/core/execution/agent/__tests__/tool-adapter.test.ts --runInBand --no-coverage`
- `worker`: `npx jest src/core/registry/overrides/__tests__/ai-agent-override.test.ts --runInBand --no-coverage`
- `worker`: `npx jest src/core/utils/__tests__/node-handle-registry.test.ts --runInBand --no-coverage`
- `worker`: `npx jest src/services/edges/__tests__/handle_aliasing.test.ts --runInBand --no-coverage`
- `worker`: `npx jest src/core/execution/__tests__/ai-agent-attachment-planning.test.ts --runInBand --no-coverage`
- `worker`: `npm run type-check`
- `worker`: `npm run lint`
- `worker`: `npm run build`
- `ctrl_checks`: `npx vitest run src/components/workflow/__tests__/WorkflowNode.ai-agent.test.tsx`
- `ctrl_checks`: `npx tsc --noEmit`
- `ctrl_checks`: `npm run lint`
- `ctrl_checks`: `npm run build`
