# Prompt To Continue In Claude

Paste this prompt into Claude Code:

```text
Read this file first, completely, before doing anything else:

c:\Users\user\Desktop\ctrlchecks-hostinger\.claude\logs\UNIVERSAL_RUNTIME_GUIDANCE_FIX_PLAN.md

Then analyze the current code and fix the workflow/debug guidance system universally.

Context:
- The product goal is real-time fixing guidance, but only when it truly matters for the current operation.
- The system should tell the user exactly which node and input field is missing/empty/invalid when that field blocks execution.
- It must not show guidance for optional fields, disabled fields, false boolean toggles, provider-default fields, credential-owned fields, inactive operation fields, or fields that do not affect the current node operation.
- The current screenshot shows a bad example: workflow-level guidance reports Form Trigger -> Allow Multiple Submissions, Require Authentication, and Captcha as missing. These are likely optional/default/disabled booleans and should not block workflow run.
- Another current example: Slack message and channel are present, but Slack returns `not_in_channel`. That should be shown as a Slack channel access/connection issue, not a missing field.

Important constraints:
- Do not add node-type-specific hardcoding outside the node registry/contracts.
- Do not patch only Form Trigger or only Slack.
- Build a universal, schema/contract-driven field relevance classifier.
- Use backend registry metadata, operation contracts, operation field policies, runtime contracts, `_fieldEnabled`, fill mode, and value type to decide whether a field truly matters.
- Backend diagnostics should be the source of truth when present. Frontend validation should not override precise backend/provider diagnostics with broad guessed missing fields.
- Keep fixes focused; this repo has many unrelated dirty files.
- Do not run `npm test`.
- Run `npm run build` inside `ctrl_checks/`.
- Run `npm run type-check` inside `worker/`.

Your first task:
1. Reproduce/trace where workflow-level guidance decides Form Trigger optional/default fields are missing.
2. Identify the exact function(s) that treat optional/disabled/false boolean fields as missing.
3. Design the universal classifier before editing.
4. Implement the classifier and wire it into both workflow-level guidance and debug-node field highlighting.
5. Verify with small smoke examples:
   - false boolean optional field is not missing
   - disabled optional field is not missing
   - required string missing is reported with node + field
   - required string present is not reported
   - Slack `not_in_channel` is provider guidance, not missing field guidance
6. Then run the build/type-check commands above.

Acceptance criteria:
- Guidance appears only for execution-blocking issues.
- Optional/default booleans like false are not flagged.
- Form Trigger captcha/requireAuthentication/allowMultipleSubmissions are not flagged unless a real contract says they block execution.
- Slack provider errors remain provider guidance.
- Debug Node and whole Workflow guidance use the same requiredness semantics.
- No hardcoded per-node exceptions.

After finishing, summarize:
- root cause
- files changed
- smoke checks performed
- build/type-check result
- any remaining risk
```

