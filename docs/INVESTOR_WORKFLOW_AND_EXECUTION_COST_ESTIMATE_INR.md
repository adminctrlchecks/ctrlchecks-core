# CtrlChecks Workflow Cost Estimate for Investor Review

Date: 2026-05-04  
Currency baseline: `1 USD = Rs 94.91`  
Scope: workflow build cost and per-execution cost for the current CtrlChecks repo.

---

## Executive Summary

CtrlChecks has two different cost events:

1. **Workflow creation/build cost**: paid when a user asks AI to generate or configure a workflow.
2. **Workflow execution cost**: paid every time a saved workflow runs.

For the current repo, the primary AI workflow builder is Gemini-first and mostly uses **Gemini 2.5 Flash**. Normal connector workflows such as webhook to Slack, form to email, HubSpot, Gmail, Google Sheets, Stripe, and database workflows do **not** require LLM calls during every execution unless an AI node is included.

Recommended investor-facing estimate:

| Cost Area | Min | Medium | Max | Notes |
|---|---:|---:|---:|---|
| AI workflow creation/build | Rs 2.00 | Rs 8.00 | Rs 30.00 | One-time cost per generated workflow; Rs 30 is the recommended max planning figure. |
| Non-AI workflow execution | Rs 0.02 | Rs 0.08 | Rs 0.50 | Per run; excludes third-party vendor charges and large data transfer. |
| AI workflow execution | Rs 0.20 | Rs 1.25 | Rs 8.00 | Per run/message; depends on prompt size, output length, memory, retries, and AI node count. |
| Search-grounded AI execution, if enabled | add Rs 3.32+ | add Rs 3.32+ | add Rs 3.32+ | Google Search grounding is extra after free quota. Not a default path in the sampled workflows. |

---

## Repo Evidence Used

| Area | Evidence in Repo | What It Means |
|---|---|---|
| Primary AI provider | `worker/src/services/ai/gemini-orchestrator.ts`, `worker/src/shared/llm-adapter.ts`, `worker/src/services/ai/model-manager.ts` | Gemini is the central provider for build-time generation, chat, and AI execution. |
| Build pipeline | `worker/src/api/generate-workflow.ts`, `worker/src/services/ai/pipeline/workflow-generation-pipeline.ts` | Workflow generation runs staged AI: intent, capability selection, structural prompt, node selection, validation, and property population. |
| Runtime execution | `worker/src/api/execute-workflow.ts` | Non-AI nodes execute through API/DB/connector logic; AI nodes call LLM providers. |
| Distributed execution | `infra/docker-compose.yml`, `infra/k8s-hpa.yaml` | Production shape includes multiple worker replicas, Redis/Kafka path, and autoscaling from 3 to 20 pods. |
| Node catalog | `worker/src/services/ai/node-catalog-builder.ts` | Current compact LLM catalog is about 31,844 chars, around 7,961 tokens, from 154 registry node types. |
| Sample workflows | `worker/data/workflow_examples/**` | Current examples are mostly 2-4 node workflows; only the chatbot example contains runtime AI nodes. |

Important implementation note: `gemini-orchestrator.ts` still contains older internal pricing constants. This report uses current public Google Gemini prices, not those constants.

---

## Pricing Assumptions

Current Gemini public pricing checked on 2026-05-04:

| Model | Input USD / 1M tokens | Output USD / 1M tokens | Input INR / 1M tokens | Output INR / 1M tokens | Used For |
|---|---:|---:|---:|---:|---|
| Gemini 2.5 Flash | 0.30 | 2.50 | Rs 28.47 | Rs 237.28 | Default build-time and runtime AI estimate. |
| Gemini 2.5 Pro | 1.25 | 10.00 | Rs 118.64 | Rs 949.10 | Conservative fallback or complex future route. |
| Gemini 3 Flash Preview | 0.50 | 3.00 | Rs 47.46 | Rs 284.73 | Preview model present in code, pricing may change. |

Formula:

`Cost INR = (input_tokens / 1,000,000 * input_rate_inr) + (output_tokens / 1,000,000 * output_rate_inr)`

Sources:

- Google Gemini API pricing: https://ai.google.dev/gemini-api/docs/pricing
- USD/INR planning rate reference: https://www.exchange-rates.org/converter/usd-inr

---

## Workflow Creation Cost

These costs are paid when the user generates/builds the workflow, not every time the workflow runs.

| Workflow Build Type | Typical Repo Shape | Min Cost | Medium Cost | Max Cost | Explanation |
|---|---|---:|---:|---:|---|
| Simple linear workflow | 2-3 nodes, no branching, no runtime AI | Rs 1.50 | Rs 4.00 | Rs 8.00 | Uses staged Gemini planning plus small property population. |
| Standard connector workflow | 3-5 nodes, 1-2 integrations | Rs 2.00 | Rs 8.00 | Rs 15.00 | Most sample workflows fit here. |
| Branching workflow | IF/Switch, 5-8 nodes | Rs 5.00 | Rs 12.00 | Rs 22.00 | Extra edge reasoning, validation, and property population. |
| AI-rich workflow | AI agent/chat model plus memory/tool nodes | Rs 6.00 | Rs 15.00 | Rs 30.00 | More AI configuration fields, longer prompts, and possible retries. |
| Retry-heavy / exceptional path | Long prompt, parse retries, possible Pro fallback | Rs 10.00 | Rs 22.00 | Rs 30.00 | Use Rs 30 as the investor max planning ceiling for generated workflows. |

Recommended finance reserve: use **Rs 8 per workflow creation** as the normal blended planning number, and **Rs 30 per workflow creation** as the conservative max planning number.

---

## Execution Cost by Workflow Type

Execution costs are recurring. They depend on whether the run contains an AI node.

| Runtime Workflow Type | Example Nodes | Min / Run | Medium / Run | Max / Run | Notes |
|---|---|---:|---:|---:|---|
| Basic webhook/action | `webhook -> slack_message` | Rs 0.02 | Rs 0.05 | Rs 0.15 | Mostly worker CPU, DB log, queue/log overhead. |
| Form to CRM/email | `form -> hubspot/email -> log_output` | Rs 0.03 | Rs 0.08 | Rs 0.25 | Connector APIs generally do not add platform LLM cost. |
| Scheduled API to sheet | `schedule -> http_request -> google_sheets` | Rs 0.05 | Rs 0.15 | Rs 0.50 | Higher max covers retries and slower external APIs. |
| Database/file workflow | `schedule -> mysql/postgresql -> drive/bigquery` | Rs 0.10 | Rs 0.35 | Rs 1.50 | Sensitive to row count, payload size, and storage transfer. |
| One AI chat/model node | `ai_chat_model` or `google_gemini` | Rs 0.20 | Rs 0.75 | Rs 3.00 | Based on Gemini 2.5 Flash token usage per run. |
| AI agent with memory | `chat_trigger -> memory -> google_gemini -> ai_agent` | Rs 0.40 | Rs 1.50 | Rs 8.00 | Memory and longer context increase input tokens; retries increase max. |
| AI + Search grounding | AI node with grounded search | Rs 3.50 | Rs 4.50 | Rs 12.00+ | Add Google Search grounding after free quota; not assumed by default. |
| Media AI workflow | image/video/audio generation nodes | Quote separately | Quote separately | Quote separately | External media vendors/models can dominate cost; do not blend with text workflow cost. |

Recommended finance reserve: use **Rs 0.10 per non-AI execution** and **Rs 1.50 per AI execution** as blended planning assumptions.

---

## Cost Estimate for Current Sample Workflows

| Sample Workflow | Nodes | Runtime AI? | Build Cost Range | Execution Cost Range | Investor Comment |
|---|---:|---|---:|---:|---|
| Webhook to Slack Notification | 2 | No | Rs 1.50-Rs 8.00 | Rs 0.02-Rs 0.15 | Very low recurring cost. |
| Lead Capture to HubSpot | 3 | No | Rs 2.00-Rs 15.00 | Rs 0.03-Rs 0.25 | Normal connector workflow. |
| Form Submission to Email Confirmation | 3 | No | Rs 2.00-Rs 15.00 | Rs 0.03-Rs 0.25 | Email API/provider limits matter more than LLM cost. |
| Webhook to Gmail Notification | 3 | No | Rs 2.00-Rs 15.00 | Rs 0.03-Rs 0.25 | Gmail API has quotas; no direct Gmail API fee assumed. |
| Scheduled API Data to Google Sheets | 3 | No | Rs 2.00-Rs 15.00 | Rs 0.05-Rs 0.50 | Retry and payload size drive upper range. |
| Stripe Payments to Google Sheets | 3 | No | Rs 2.00-Rs 15.00 | Rs 0.05-Rs 0.50 | Payment provider fees are outside platform execution cost. |
| Database Backup to Google Drive | 3 | No | Rs 2.00-Rs 15.00 | Rs 0.10-Rs 1.50 | Data volume is the main variable. |
| Database to BigQuery ETL | 3 | No | Rs 2.00-Rs 15.00 | Rs 0.10-Rs 1.50 | BigQuery/storage billing is separate from CtrlChecks compute. |
| Google Doc Generation from Template | 3 | No | Rs 2.00-Rs 15.00 | Rs 0.05-Rs 0.50 | Depends on document size and Google API retries. |
| AI Chatbot with Memory (Gemini) | 4 | Yes | Rs 6.00-Rs 30.00 | Rs 0.40-Rs 8.00 | Runtime cost scales with message length, memory, and reply length. |

---

## Monthly Cost Projection

| Scenario | Non-AI Runs | AI Runs | Workflow Builds | Estimated Monthly Platform COGS |
|---|---:|---:|---:|---:|
| Small pilot | 10,000 | 1,000 | 500 | Rs 8,000-Rs 14,000 |
| Early paid usage | 100,000 | 10,000 | 3,000 | Rs 60,000-Rs 110,000 |
| Growth stage | 500,000 | 50,000 | 10,000 | Rs 250,000-Rs 450,000 |

Projection formula used:

- Non-AI execution reserve: Rs 0.10/run
- AI execution reserve: Rs 1.50/run
- Workflow build reserve: Rs 8/build
- Added operational buffer: 25%-100% depending on scale

This excludes engineering payroll, customer support, paid observability tools, enterprise compliance, third-party API vendor fees, media generation fees, and payment gateway fees.

---

## Margin Guidance

Recommended packaging for healthy margins:

| Plan Type | Suggested Cost Guardrail | Reason |
|---|---:|---|
| Free | Low workflow count, low AI credits, low execution count | Prevents abuse while keeping onboarding open. |
| Pro | Execution cap + AI credit cap | Works better than token-only limits because automation buyers think in runs/tasks. |
| Enterprise | Higher execution cap, negotiated AI credit pool, overage pricing | Protects margin for AI-heavy or data-heavy users. |

Recommended overage pricing:

| Overage Type | Suggested Price Floor | Why |
|---|---:|---|
| Non-AI execution pack | Rs 0.25-Rs 0.50 per run | Covers infra, logs, retries, and support margin. |
| AI execution pack | Rs 3-Rs 8 per AI run/message | Covers token variance and retry risk. |
| Workflow generation pack | Rs 15-Rs 40 per generated workflow | Covers build-time LLM spikes and keeps margin above the Rs 30 max planning cost. |

---

## Key Risks

| Risk | Impact | Control |
|---|---|---|
| Internal pricing constants are stale | Cost dashboard may under-report real COGS | Move pricing to config/admin table and refresh monthly. |
| Heavy AI memory/chatbot usage | Per-run cost can rise quickly | Cap context window, summarize memory, and meter per AI call. |
| Retry storms from external APIs | Non-AI workflows become expensive | Use circuit breakers, rate limits, and retry budgets. |
| Large DB/file workflows | Data transfer and storage dominate | Meter rows, bytes processed, and file size. |
| Search grounding/media generation | External model/tool cost can exceed normal text AI | Price these as premium add-ons, not normal workflow runs. |

---

## Final Investor Figure

For investor discussion, use these clean headline numbers:

| Metric | Conservative Planning Figure |
|---|---:|
| Average AI workflow build cost | Rs 8 per workflow |
| Upper-reserve AI workflow build cost | Rs 30 per workflow |
| Average non-AI execution cost | Rs 0.10 per run |
| Average AI execution cost | Rs 1.50 per run/message |
| High-risk AI execution reserve | Rs 8 per run/message |

These figures are realistic for the current repo architecture if Gemini 2.5 Flash remains the default, usage is metered, retries are capped, and media/search-heavy nodes are priced separately.
