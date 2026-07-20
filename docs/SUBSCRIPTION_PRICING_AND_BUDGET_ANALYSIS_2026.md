# Subscription Pricing and Budget Analysis (2026)

## Objective

Design a production-ready subscription strategy for the home screen plans, with clear unit economics for AI + Gmail usage, and projections for 100 and 500 users.

This document is intentionally structured so you can copy sections into Excel.

Currency convention used in this file:
- USD shown as `$`
- INR shown as `Rs`
- Conversion baseline for planning: `1 USD = Rs 92.93`

---

## 1) Current Product Context (from your codebase)

### 1.1 Home screen and pricing currently shown

- UI pricing cards are already present in `ctrl_checks/src/components/landing/Pricing.tsx`:
  - `Free`: $0 (Rs 0), 200 tokens/month, 2 workflows
  - `Pro`: $20/month (Rs 1,858.60/month), 10,000 tokens/month, 20 workflows
  - `Enterprise`: $99/month (Rs 9,200.07/month), 100,000+ tokens/month, unlimited workflows
- There is also a separate messaging section in `ctrl_checks/src/components/landing/SubscriptionSection.tsx` saying "Beta today, subscription later."
- Recommendation: keep current UI unchanged for now, but make backend entitlements and billing authoritative.

### 1.2 Payment flow status

- Checkout and payment verification via Razorpay exist in:
  - `worker/src/api/payments-razorpay.ts`
- Current issue:
  - Verification returns `subscription.status = "active"` in API response only.
  - There is no durable subscription write (no DB persistence for plan activation lifecycle).
- Business impact:
  - "Activated" plan is not truly enforceable for usage limits, invoicing, dunning, renewals, or audits.

### 1.3 AI provider and model stack currently used

- Runtime AI is Gemini-first in your worker:
  - `worker/src/api/ai-gateway.ts`
  - `worker/src/shared/llm-adapter.ts`
  - `worker/src/services/ai/gemini-orchestrator.ts`
- Models present in code:
  - `gemini-2.5-flash`
  - `gemini-2.5-pro`
  - `gemini-3-flash-preview`
- Important gap:
  - Internal pricing constants in `gemini-orchestrator.ts` are outdated versus current public Gemini pricing.
  - If cost dashboards rely on this constant, margin reporting will be inaccurate.

### 1.4 Google Gmail integration status

- Gmail integration exists (`google_gmail` node in `worker/public/node-library.json`).
- OAuth scopes include:
  - `gmail.send`
  - `gmail.readonly`
  - from `ctrl_checks/src/lib/google-scopes.ts`
- Gmail API pricing:
  - No additional per-call fee, but strict quota/rate limits apply.
  - This is mainly a reliability/abuse-control concern, not direct COGS.

---

## 2) Market and API Pricing Inputs (use as finance assumptions)

Use official pages as primary references:

- Gemini API pricing (Google AI): [https://ai.google.dev/gemini-api/docs/pricing](https://ai.google.dev/gemini-api/docs/pricing)
- Vertex AI pricing mirror/details: [https://cloud.google.com/vertex-ai/generative-ai/pricing](https://cloud.google.com/vertex-ai/generative-ai/pricing)
- Gmail API quota/pricing: [https://developers.google.com/workspace/gmail/api/reference/quota](https://developers.google.com/workspace/gmail/api/reference/quota)
- Zapier pricing benchmark: [https://zapier.com/pricing/](https://zapier.com/pricing/)
- Make pricing benchmark: [https://www.make.com/en/pricing](https://www.make.com/en/pricing)
- n8n pricing benchmark: [https://n8n.io/pricing/](https://n8n.io/pricing/)

### 2.1 Suggested baseline model costs (USD + INR / 1M tokens)

For budgeting, start with these conservative values:

| Model | Input ($/1M) | Input (Rs/1M) | Output ($/1M) | Output (Rs/1M) | Notes |
|---|---:|---:|---:|---:|---|
| Gemini 2.5 Flash | 0.30 | 27.88 | 2.50 | 232.33 | Best default for cost/performance |
| Gemini 2.5 Pro | 1.25 | 116.16 | 10.00 | 929.30 | Use for complex reasoning only |
| Gemini 3 Flash Preview | treat as variable | treat as variable | treat as variable | treat as variable | Preview pricing may change |

### 2.2 Gmail API budget note

- API usage itself is not line-item billed.
- Cost drivers around Gmail are:
  - engineering compliance and verification
  - error handling and retries
  - support load (deliverability, OAuth failures)
- So Gmail should be tracked as operational risk + support cost, not per-request API COGS.

---

## 3) Unit Economics Framework (Excel-ready)

## 3.1 Core formulas

Use these formulas per user per month:

- `InputTokens = TotalTokens * InputShare`
- `OutputTokens = TotalTokens * OutputShare`
- `AITokenCost = (InputTokens/1,000,000)*InputPrice + (OutputTokens/1,000,000)*OutputPrice`
- `InfraCostPerUser = DB + Storage + Queue + Observability + SupportAllocation`
- `PaymentFee = Revenue * PaymentFeeRate`
- `TotalCOGSPerUser = AITokenCost + InfraCostPerUser + PaymentFee`
- `GrossProfitPerUser = Revenue - TotalCOGSPerUser`
- `GrossMargin% = GrossProfitPerUser / Revenue`

Recommended starting assumptions:

- `InputShare = 0.70`
- `OutputShare = 0.30`
- `PaymentFeeRate = 0.03` (adjust by gateway/country)

## 3.2 Plan-level token budget assumptions

Your current headline token allowances:

- Free: 200 tokens
- Pro: 10,000 tokens
- Enterprise: 100,000+ tokens

These are very low relative to market expectations in automation + AI workloads. You can keep them in UI for now, but for real commercial scale:

- move to hybrid limits: executions + AI credits + fair-use guardrails
- avoid pure "token-only" messaging because users compare against "tasks/operations/executions"

---

## 4) Scenario Analysis (100 and 500 users)

## 4.1 Proposed pricing for analysis (can be adjusted)

- Pro: `$20` (Rs 1,858.60)
- Enterprise: `$99` (Rs 9,200.07)

User mix assumptions:

- Scenario A (100 users): 85 Pro + 15 Enterprise
- Scenario B (500 users): 425 Pro + 75 Enterprise

Usage assumptions per paid user:

- Pro monthly AI usage: 300k input + 120k output tokens
- Enterprise monthly AI usage: 1.5M input + 700k output tokens
- Model mix:
  - 90% Flash, 10% Pro equivalent for Pro users
  - 70% Flash, 30% Pro equivalent for Enterprise users

### 4.2 Effective token cost per paid user (blended)

For planning simplicity:

- Pro user AI COGS estimate: `$0.42` (Rs 39.03) / month
- Enterprise user AI COGS estimate: `$3.25` (Rs 302.02) / month

Additional assumed per-user monthly costs:

- Pro infra/support: `$1.20` (Rs 111.52)
- Enterprise infra/support: `$4.00` (Rs 371.72)
- Payment fee: `3% of revenue`

### 4.3 100-user scenario (Excel table)

| Metric | Pro | Enterprise | Total |
|---|---:|---:|---:|
| Users | 85 | 15 | 100 |
| Price/user (USD / Rs) | 20.00 / 1,858.60 | 99.00 / 9,200.07 | - |
| MRR (USD / Rs) | 1,700.00 / 157,981.00 | 1,485.00 / 138,001.05 | 3,185.00 / 295,982.05 |
| AI COGS/user (USD / Rs) | 0.42 / 39.03 | 3.25 / 302.02 | - |
| AI COGS total (USD / Rs) | 35.70 / 3,317.60 | 48.75 / 4,530.34 | 84.45 / 7,847.94 |
| Infra+support/user (USD / Rs) | 1.20 / 111.52 | 4.00 / 371.72 | - |
| Infra+support total (USD / Rs) | 102.00 / 9,478.86 | 60.00 / 5,575.80 | 162.00 / 15,054.66 |
| Payment fees 3% (USD / Rs) | 51.00 / 4,739.43 | 44.55 / 4,140.03 | 95.55 / 8,879.46 |
| Total COGS (USD / Rs) | 188.70 / 17,535.89 | 153.30 / 14,246.17 | 342.00 / 31,782.06 |
| Gross Profit (USD / Rs) | 1,511.30 / 140,445.11 | 1,331.70 / 123,754.88 | 2,843.00 / 264,199.99 |
| Gross Margin % | 88.9% | 89.7% | 89.3% |

### 4.4 500-user scenario (Excel table)

| Metric | Pro | Enterprise | Total |
|---|---:|---:|---:|
| Users | 425 | 75 | 500 |
| Price/user (USD / Rs) | 20.00 / 1,858.60 | 99.00 / 9,200.07 | - |
| MRR (USD / Rs) | 8,500.00 / 789,905.00 | 7,425.00 / 690,005.25 | 15,925.00 / 1,479,910.25 |
| AI COGS/user (USD / Rs) | 0.42 / 39.03 | 3.25 / 302.02 | - |
| AI COGS total (USD / Rs) | 178.50 / 16,588.01 | 243.75 / 22,651.69 | 422.25 / 39,239.69 |
| Infra+support/user (USD / Rs) | 1.20 / 111.52 | 4.00 / 371.72 | - |
| Infra+support total (USD / Rs) | 510.00 / 47,394.30 | 300.00 / 27,879.00 | 810.00 / 75,273.30 |
| Payment fees 3% (USD / Rs) | 255.00 / 23,697.15 | 222.75 / 20,700.16 | 477.75 / 44,397.31 |
| Total COGS (USD / Rs) | 943.50 / 87,679.46 | 766.50 / 71,230.85 | 1,710.00 / 158,910.30 |
| Gross Profit (USD / Rs) | 7,556.50 / 702,225.55 | 6,658.50 / 618,774.41 | 14,215.00 / 1,320,999.95 |
| Gross Margin % | 88.9% | 89.7% | 89.3% |

Important: these margins are possible only if model routing is disciplined and heavy users are guarded by execution and token controls.

---

## 5) Competitive Positioning (automation market)

### 5.1 How competitors frame plans

- Zapier: task-based pricing (each action step consumes tasks), strong premium for collaboration/features.
- Make: operation/credit-based pricing (every module execution counts).
- n8n: execution-based pricing (workflow execution with unlimited internal steps), plus self-host path.

### 5.1.1 Direct money comparison (USD + INR)

Currency baseline used:
- `1 USD = Rs 92.93`
- `1 EUR = $1.08` (planning assumption for n8n)

Note:
- Pricing pages change frequently; keep this table as a planning snapshot and refresh before investor/client submission.
- Values below are baseline entry points (typically annual-billing headline prices).

| Platform | Plan basis | Entry paid plan (local) | Entry paid plan (USD) | Entry paid plan (INR) | Scale behavior summary |
|---|---|---:|---:|---:|---|
| CtrlChecks | Subscription (workflows + AI usage) | `$20` | $20.00 | Rs 1,858.60 | Linear subscription; add overage packs recommended |
| Zapier | Task-based | `$19.99` | $19.99 | Rs 1,857.67 | Costs rise as tasks/actions increase |
| Make | Operation/credit-based | `$9` | $9.00 | Rs 836.37 | Low entry, rises by operation volume |
| n8n Cloud | Execution-based | `EUR 20` | $21.60 | Rs 2,007.29 | Pay per workflow execution tier; unlimited steps per execution |

#### Team-level money benchmark (where publicly clear)

| Platform | Typical team-level plan (USD) | Typical team-level plan (INR) | Pricing driver |
|---|---:|---:|---|
| CtrlChecks Enterprise | $99.00 | Rs 9,200.07 | Subscription + governance features |
| Zapier Team | $69.00 | Rs 6,412.17 | Tasks + collaboration features |
| Make Teams | $29.00 | Rs 2,694.97 | Operations + team workspace |
| n8n Business | EUR 667 (~$720.36) | Rs 66,935.07 | Execution tier + enterprise controls |

### 5.2 What this means for your plans

If you stay token-only in marketing:
- buyers will struggle to compare with competitors.

Recommended commercial packaging:

1. Primary metric: `Workflow executions/month`
2. Secondary metric: `AI credits` (token-backed)
3. Guardrails:
   - rate limits
   - concurrency caps
   - retry limits
   - fair-use policy

This mirrors how users already think in the automation category.

---

## 6) Structural Implementation Blueprint (no UI disturbance)

This is the core architecture you need to activate plans correctly.

### Phase 1: Billing source of truth

Create durable tables:

- `subscriptions`:
  - `id`, `user_id`, `plan_id`, `status`, `billing_cycle`, `started_at`, `renewal_at`, `cancel_at_period_end`
- `subscription_events`:
  - payment success/failure, webhook events, plan changes
- `usage_ledger`:
  - per-user monthly counters (`executions`, `ai_input_tokens`, `ai_output_tokens`, `gmail_send_calls`, etc.)

### Phase 2: Entitlement engine

Build centralized entitlement resolver:

- Input: `user_id`
- Output:
  - allowed plan
  - hard limits
  - soft warning thresholds
  - feature flags

Do not enforce limits in scattered endpoints. Use one policy layer.

### Phase 3: Payment lifecycle hardening

Current flow verifies payment signature but does not persist subscription activation.

Implement:

- idempotent activation on payment verification/webhook
- renewals and failed-payment states
- grace period and downgrade path
- ledger close/open at billing cycle boundary

### Phase 4: Usage metering pipeline

Meter in real time:

- LLM usage (input/output tokens) from response metadata
- workflow executions
- connector calls (especially Gmail send/read)

Persist usage in ledger and expose dashboard endpoints.

### Phase 5: Cost observability

Add cost engine:

- pull latest model rates from config (not hardcoded in code)
- compute near-real-time COGS per user
- alert on abnormal cost/user or low-margin cohorts

### Phase 6: Plan enforcement

- soft warning at 80%
- hard cap at 100% (or pay-as-you-go overage if enabled)
- controlled fallback behavior (pause AI-heavy steps first, not entire account immediately)

---

## 7) Suggested Plan Architecture (practical)

For launch simplicity:

- Free:
  - low executions/month
  - low AI credits
  - community support
- Pro:
  - medium executions
  - medium AI credits
  - priority queue and support
- Enterprise:
  - high executions
  - high AI credits
  - SLA, SSO, governance

Add optional overage packs:

- AI Credit Pack (token-based)
- Execution Pack (workflow runs)

This prevents churn from hard cut-offs.

---

## 8) Risks and Controls

### Key risks

- Outdated model pricing constants causing wrong profitability reporting
- No durable subscription activation state
- No centralized entitlement checks
- Gmail quota/rate limits causing failed automations at scale

### Controls

- Move model pricing to admin-config table with monthly review
- Enforce idempotent billing events
- Add per-user and per-project throttles
- Use retries with exponential backoff for Gmail API limits

---

## 9) What to put in your Excel (recommended sheets)

1. `Assumptions`
   - pricing, token split, model mix, infra/support, fee rates
2. `Plan Limits`
   - executions, AI credits, connectors, support tier
3. `Unit Economics`
   - per-user COGS and margin by plan
4. `Scenario 100 Users`
5. `Scenario 500 Users`
6. `Sensitivity`
   - +25% output tokens, +50% heavy users, payment fee variance
7. `Competitor Benchmark`
   - Zapier vs Make vs n8n vs CtrlChecks positioning

---

## 10) Immediate next steps (1-week execution)

Day 1-2:
- define subscription + ledger schema
- add payment activation persistence and idempotency

Day 3-4:
- implement entitlement middleware + usage counters
- wire AI token metering to ledger

Day 5:
- add admin usage/cost dashboard endpoint
- finalize revised commercial plan definitions

Day 6-7:
- run pilot on internal/staging users
- validate margin assumptions vs real usage

---

## Final recommendation

Do not change home UI now. First make subscriptions truly enforceable in backend, meter usage accurately, and run one month of usage telemetry. Then adjust visible plan limits/pricing using real COGS and margin bands.

