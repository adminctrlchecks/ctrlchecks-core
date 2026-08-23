# CtrlChecks — Buildable Template Catalog (per category, ~20 each)

> **Purpose:** an implementation-ready *spec* (not the JSON bodies yet) of ~20 templates per live
> category. Every entry is **buildable on the current CtrlChecks engine** — it uses only registered
> node types, real triggers, and control flow that actually runs. This becomes the blueprint for
> generating the workflow JSON (via the AI builder or debug-mode paste) later.
>
> **Status legend:** `✓ EXISTS` = already in the live library (listed for a complete 20-per-category
> picture); `＋ NEW` = proposed addition, buildable today.
>
> **"Integrations (N)"** = external services the user must connect (needs a credential). It does **not**
> count engine/AI nodes (`form`, `schedule`, `if_else`, `switch`, `javascript`, `merge`, `openai_gpt`,
> `gemini`, `sentiment_analyzer`, `text_summarizer`, `chat_trigger`, `log_output`) — the LLM runs on
> the platform AI wallet / BYOK.

---

## Engine constraints every template here respects

These are the hard rules that make a template "buildable." Anything violating them was excluded.

1. **No per-item iteration.** `loop`/`split_in_batches` do not fan out. When n8n would "process all
   rows/files," we use the **poll-one-record-per-run** pattern:
   `schedule → read ONE unprocessed record (filter) → act → write-back a "processed" marker`.
2. **No PDF / document text-extraction, no OCR/vision.** Structured data must arrive via `form`,
   `webhook`, or an API (`http_request`). `google_gemini` may do *light* classification/tagging of
   pasted text, not full-document extraction.
3. **No semantic vector RAG.** Grounded chatbots use **RAG-lite**: keyword/`ILIKE`/filter lookup over
   `postgresql`/`airtable`, then the LLM answers only from the returned rows (with citation of row ids).
4. **No headless browser / scraper.** `http_request` fetches **static** pages/APIs; `html` parses them.
5. **No audio/image/video generation, no SSH.** Text in, text/actions out.
6. **`if_else` = one comparison per row.** Multiple conditions → multiple `if_else` nodes or a `switch`.
7. **State is per-run.** Cross-run memory = a marker column in `airtable`/`postgresql`, not `set_variable`.
8. **Triggers available (all wired):** `form`, `schedule`, `interval`, `webhook`, `chat_trigger`,
   `gmail_trigger`, `outlook_trigger`, `google_sheets_trigger`, `google_drive_trigger`,
   `google_calendar_trigger`, `slack_trigger`, `discord_trigger`, `telegram_trigger`,
   `whatsapp_trigger`, `stripe_trigger`, `shopify_trigger`, `github_trigger`, `gitlab_trigger`,
   `jira_trigger`, `linear_trigger`, `trello_trigger`, `typeform_trigger`, `tally_trigger`.
   **Airtable has NO trigger** → always poll it on a `schedule`.

---

## Category 1 — Business Verification & Compliance (target 20)

| # | Template | Status | Trigger | Integrations |
|---|---|---|---|---|
| 1 | Approval Chance Predictor | ✓ EXISTS | form | 3 (Airtable, Slack, Gmail) |
| 2 | Business Details Matcher | ✓ EXISTS | schedule | 3 (Airtable, HTTP, Gmail) |
| 3 | Document Vault — Intake & Auto-Tagging | ✓ EXISTS | form | 1 (Airtable) |
| 4 | Document Vault — Smart Search | ✓ EXISTS | chat_trigger | 1 (Airtable) |
| 5 | License Renewal Reminder | ✓ EXISTS | schedule | 2 (Airtable, Gmail) |
| 6 | Live Status Lookup Bot | ✓ EXISTS | chat_trigger | 2 (Airtable, Slack) |
| 7 | Missing Document Finder | ✓ EXISTS | form | 3 (Airtable, Gmail, +) |
| 8 | New Client Risk Checker | ✓ EXISTS | form | 3 (HTTP, Airtable, Slack) |
| 9 | Smart Alert Co-Pilot | ✓ EXISTS | schedule | 2 (Airtable, Slack) |
| 10 | Submission Package Builder | ✓ EXISTS | schedule | 3 (HTTP, Drive, Gmail) |
| 11 | Verification Co-Pilot Chat | ✓ EXISTS | chat_trigger | 1 (Airtable) |
| 12 | Verification Readiness Checker | ✓ EXISTS | form | 3 (Airtable, HTTP, Gmail) |
| 13 | KYC Document Checklist Generator | ＋ NEW | form | 2 (Airtable, Gmail) |
| 14 | Domain Age & Reputation Screener | ＋ NEW | form | 3 (HTTP, Airtable, Slack) |
| 15 | Policy Page Presence Checker | ＋ NEW | form | 2 (Airtable, Gmail) |
| 16 | Verification Rejection Reason Classifier | ＋ NEW | form | 2 (Airtable, Gmail) |
| 17 | Tax/GST ID Format Validator | ＋ NEW | form | 2 (Airtable, Gmail) |
| 18 | Compliance Deadline Digest | ＋ NEW | schedule | 3 (Airtable, Gmail, Slack) |
| 19 | Website Compliance Snapshot Logger | ＋ NEW | schedule | 3 (HTTP, Airtable, Slack) |
| 20 | Client Onboarding Compliance Tracker | ＋ NEW | form | 3 (Airtable, Gmail, Slack) |
| 21 | Duplicate Client Detector | ＋ NEW | schedule | 2 (Airtable, Slack) |

**Detailed flows (new ones):**

**13. KYC Document Checklist Generator** — Client submits which documents they have; AI figures out
what's still required for their entity/jurisdiction and emails a specific checklist.
`form → openai_gpt (map submitted vs required set) → airtable (log request) → google_gmail (checklist)`
*Buildable:* single submission, no iteration; AI reasons over a fixed required-doc list held in the prompt.

**14. Domain Age & Reputation Screener** — Screen a new applicant's domain on real signals.
`form (domain) → http_request (WHOIS/reputation API) → openai_gpt (risk read) → airtable (score) → if_else (risk>threshold) → slack_message`
*Buildable:* static API call; single record.

**15. Policy Page Presence Checker** — Confirm a site actually has privacy policy + terms before applying.
`form (homepage URL) → http_request (fetch homepage) → html (extract links/text) → openai_gpt (present? which missing?) → airtable → google_gmail (fix list)`
*Buildable:* static fetch only (no JS-rendered pages).

**16. Verification Rejection Reason Classifier** — Paste a platform's rejection message; get the real cause + fix steps.
`form (paste rejection text) → openai_gpt (classify reason category) → airtable (log) → google_gmail (targeted remediation steps)`

**17. Tax/GST ID Format Validator** — Validate an ID's format before submission.
`form (id + country) → javascript (regex/checksum validate) → openai_gpt (explain issue if invalid) → airtable → google_gmail`

**18. Compliance Deadline Digest** — Daily roll-up of upcoming compliance deadlines.
`schedule (daily) → airtable (read items due in ≤N days) → openai_gpt (summarize/prioritize) → google_gmail + slack_message`
*Note:* summarizes the returned set in one LLM call (no per-row iteration).

**19. Website Compliance Snapshot Logger** — Detect when a client's public site changes in a compliance-relevant way.
`schedule → http_request (fetch ONE client site) → html (extract) → airtable (log + compare to last) → if_else (changed) → slack_message → airtable (mark checked)`
*Buildable:* one client per run (poll-drain).

**20. Client Onboarding Compliance Tracker** — New client kickoff with doc request + team alert.
`form → airtable (create client) → google_gmail (welcome + doc request) → slack_message (notify ops)`

**21. Duplicate Client Detector** — Flag likely duplicate client records.
`schedule → airtable (read ONE unchecked record) → javascript (fuzzy-compare against pulled candidates) → if_else (match) → slack_message → airtable (mark checked)`

---

## Category 2 — Sales, Support & Internal Operations (target 20)

| # | Template | Status | Trigger | Integrations |
|---|---|---|---|---|
| 1 | Client Priority Ranker | ✓ EXISTS | schedule | 2 (Airtable, Slack) |
| 2 | CRM Data Cleanup Assistant | ✓ EXISTS | schedule | 2 (HubSpot, Slack) |
| 3 | Cross-Platform Sync Engine | ✓ EXISTS | schedule | 4 (Airtable, HubSpot, Sheets, Slack) |
| 4 | Customer Churn Risk Alert | ✓ EXISTS | schedule | 2 (Airtable, Slack) |
| 5 | Customer Support Agent | ✓ EXISTS | chat_trigger | 2 (Postgres, Slack) |
| 6 | Employee Onboarding Checklist | ✓ EXISTS | schedule | 3 (Airtable, Gmail, Slack) |
| 7 | FAQ Answering Assistant | ✓ EXISTS | chat_trigger | 2 (Airtable, Slack) |
| 8 | HR / Hiring Workflow Agent | ✓ EXISTS | webhook | 2 (Postgres, Gmail) |
| 9 | Internal Knowledge / Ops Agent | ✓ EXISTS | chat_trigger | 2 (Postgres, Slack) |
| 10 | Meeting Notes to Action Items | ✓ EXISTS | form | 2 (Postgres, Slack) |
| 11 | Overdue Task Tracker | ✓ EXISTS | schedule | 2 (Airtable, Slack) |
| 12 | Sales & Lead Qualification Agent | ✓ EXISTS | webhook | 2 (HubSpot, Gmail) |
| 13 | Support Ticket Triage | ✓ EXISTS | form | 3 (Postgres, Slack, Gmail) |
| 14 | Weekly Pipeline Report | ✓ EXISTS | schedule | 3 (Airtable, Gmail, Slack) |
| 15 | AI Inbox Triage & Auto-Label | ＋ NEW | gmail_trigger | 2 (Gmail, Slack) |
| 16 | AI Reply-Draft Assistant | ＋ NEW | gmail_trigger | 2 (Gmail, Slack) |
| 17 | Sheets New-Lead Pipeline (native trigger) | ＋ NEW | google_sheets_trigger | 3 (Sheets, HubSpot, Gmail) |
| 18 | Telegram Support Bot | ＋ NEW | telegram_trigger | 2 (Telegram, Airtable) |
| 19 | GitHub PR AI Code Review | ＋ NEW | github_trigger | 1 (GitHub) |
| 20 | Calendar Meeting-Prep Brief | ＋ NEW | google_calendar_trigger | 3 (Calendar, HubSpot, Gmail) |
| 21 | New Bug Auto-Classifier (Linear/Jira) | ＋ NEW | linear_trigger | 2 (Linear, Slack) |
| 22 | CRM Org Enrichment on Demand | ＋ NEW | form | 3 (HTTP, HubSpot, Slack) |
| 23 | Slack Message → Task Logger | ＋ NEW | slack_trigger | 2 (Slack, Trello) |

**Detailed flows (new ones):**

**15. AI Inbox Triage & Auto-Label** — Classify each inbound email and label/route it.
`gmail_trigger → openai_gpt (category + urgency + intent) → switch (category) → google_gmail (apply label) → slack_message (urgent only) → log_output`

**16. AI Reply-Draft Assistant** — Draft a reply for review (never auto-sends).
`gmail_trigger → openai_gpt (draft reply) → google_gmail (create draft) → slack_message (link for review)`
*Buildable & safe:* creates a **draft**, human sends.

**17. Sheets New-Lead Pipeline** — Showcases the real push trigger.
`google_sheets_trigger (new row) → javascript (validate/dedupe) → openai_gpt (score High/Med/Low + first-touch draft) → if_else (High?) → hubspot (create) + google_gmail (send) ; else → google_sheets (mark nurture)`

**18. Telegram Support Bot** — RAG-lite support over your FAQ table.
`telegram_trigger → airtable (keyword lookup in FAQ) → openai_gpt (answer from rows, else "not sure") → if_else (confident) → telegram (reply) ; else → slack_message (escalate) → telegram (handed to human)`

**19. GitHub PR AI Code Review** — Auto-review new PRs.
`github_trigger (PR opened) → http_request (fetch diff) → openai_gpt (review) → if_else (issues?) → github (post review comment) ; else → github (LGTM comment)`

**20. Calendar Meeting-Prep Brief** — Brief before each upcoming meeting.
`google_calendar_trigger (event soon) → hubspot/http_request (lookup attendee/company) → openai_gpt (one-page brief) → google_gmail + slack_message`

**21. New Bug Auto-Classifier** — Triage new issues by priority/area.
`linear_trigger (issue created) → openai_gpt (severity + component + suggested owner) → linear (update labels/priority) → slack_message (#eng if P0/P1)`
*(Jira variant: swap `linear_trigger`→`jira_trigger`, `linear`→`jira`.)*

**22. CRM Org Enrichment on Demand** — Enrich a company from a known API and update CRM.
`form (domain/company) → http_request (enrichment API) → openai_gpt (summarize firmographics) → hubspot (update record) → slack_message`

**23. Slack Message → Task Logger** — Turn a flagged Slack message into a tracked task.
`slack_trigger (mention/command) → openai_gpt (extract task + owner + due) → trello (create card) → slack_message (ack with link)`

---

## Category 3 — Finance, Accounting & Insurance (target 20)

| # | Template | Status | Trigger | Integrations |
|---|---|---|---|---|
| 1 | Expense Policy Checker | ✓ EXISTS | form | 2 (Postgres, Slack) |
| 2 | Finance / Compliance Agent | ✓ EXISTS | webhook | 3 (Postgres, Slack, Gmail) |
| 3 | Invoice Approval Triage | ✓ EXISTS | form | 3 (Postgres, Slack, Gmail) |
| 4 | Payment Failure Recovery | ✓ EXISTS | webhook | 2 (Gmail, Slack) |
| 5 | Vendor Due Diligence | ✓ EXISTS | form | 3 (HTTP, Airtable, Slack) |
| 6 | Purchase Order Approval Router | ＋ NEW | form | 3 (Postgres, Slack, Gmail) |
| 7 | Expense Category Auto-Tagger | ＋ NEW | webhook | 2 (Postgres, Slack) |
| 8 | Budget Threshold Monitor | ＋ NEW | schedule | 3 (Postgres, Slack, Gmail) |
| 9 | Duplicate Invoice Detector | ＋ NEW | webhook | 2 (Postgres, Slack) |
| 10 | Vendor Onboarding Risk Scorer | ＋ NEW | form | 3 (HTTP, Airtable, Slack) |
| 11 | Subscription Renewal Reminder | ＋ NEW | schedule | 3 (Airtable, Gmail, Slack) |
| 12 | Payment Reminder Sequence (dunning) | ＋ NEW | schedule | 2 (Airtable, Gmail) |
| 13 | AR Aging Weekly Report | ＋ NEW | schedule | 3 (Postgres, Gmail, Slack) |
| 14 | Fraud Signal Alert | ＋ NEW | webhook | 2 (Postgres, Slack) |
| 15 | Refund Request Triage | ＋ NEW | form | 3 (Postgres, Slack, Gmail) |
| 16 | Insurance Claim Intake Triage | ＋ NEW | form | 3 (Postgres, Slack, Gmail) |
| 17 | Policy Renewal Notifier | ＋ NEW | schedule | 3 (Airtable, Gmail, Slack) |
| 18 | Quote Request Responder | ＋ NEW | form | 2 (HubSpot, Gmail) |
| 19 | Chargeback / Dispute Handler | ＋ NEW | stripe_trigger | 3 (Stripe, Slack, Gmail) |
| 20 | Vendor Payment Approval | ＋ NEW | webhook | 2 (Postgres, Slack) |
| 21 | Tax Deadline Reminder | ＋ NEW | schedule | 2 (Airtable, Slack) |

**Detailed flows (new ones):**

**6. Purchase Order Approval Router** — Route POs by amount/policy.
`form (PO details) → openai_gpt (policy check + risk note) → if_else (amount > limit OR flagged) → postgresql (store) → slack_message (approver) + google_gmail (requester)`

**7. Expense Category Auto-Tagger** — Categorize an expense as it arrives.
`webhook (expense JSON) → openai_gpt (GL category + policy flag) → postgresql (store) → if_else (over budget) → slack_message`
*Note:* expense arrives as structured JSON (no receipt-image OCR).

**8. Budget Threshold Monitor** — Alert when a department crosses budget.
`schedule → postgresql (read ONE department's MTD spend) → if_else (> threshold) → slack_message + google_gmail → postgresql (mark alerted this period)`

**9. Duplicate Invoice Detector** — Catch double-billing.
`webhook (invoice JSON) → postgresql (lookup by vendor+amount+date window) → javascript (compare) → if_else (duplicate) → slack_message`

**10. Vendor Onboarding Risk Scorer** — Score a new vendor before approval.
`form → http_request (enrichment/sanctions API) → openai_gpt (risk summary + score) → airtable (store) → if_else (high) → slack_message`

**11. Subscription Renewal Reminder** — Warn before subscriptions auto-renew.
`schedule → airtable (read ONE renewal due soon) → if_else (days ≤ N) → google_gmail (owner) + slack_message → airtable (mark reminded)`

**12. Payment Reminder Sequence (dunning)** — Escalating overdue-invoice reminders.
`schedule → airtable (read ONE overdue, unreminded-today) → if_else (days bucket) → google_gmail (tone by bucket) → airtable (stamp last-reminded)`

**13. AR Aging Weekly Report** — Leadership receivables summary.
`schedule (weekly) → postgresql (aging query) → openai_gpt (summarize risk + actions) → google_gmail (finance lead) + slack_message`

**14. Fraud Signal Alert** — Flag anomalous transactions in real time.
`webhook (txn JSON) → openai_gpt (anomaly read vs rules in prompt) → if_else (suspicious) → slack_message + postgresql (log)`

**15. Refund Request Triage** — Route refund requests by legitimacy.
`form → openai_gpt (classify legitimacy + reason) → if_else (auto-approvable?) → postgresql (queue) → slack_message (approver) + google_gmail (customer ack)`

**16. Insurance Claim Intake Triage** — Triage inbound claims.
`form (claim details) → openai_gpt (type + urgency + completeness) → if_else (urgent/complete?) → slack_message (adjuster) + google_gmail (claimant ack) → postgresql (store)`

**17. Policy Renewal Notifier** — Notify before policies lapse.
`schedule → airtable (read ONE policy near expiry) → if_else (window) → google_gmail (insured) + slack_message → airtable (mark notified)`

**18. Quote Request Responder** — Fast first response to a quote request.
`form → openai_gpt (draft quote summary + next steps) → google_gmail (send) → hubspot (log opportunity)`

**19. Chargeback / Dispute Handler** — Handle Stripe disputes natively.
`stripe_trigger (charge.dispute.created) → javascript (extract) → openai_gpt (summarize + recommended evidence) → slack_message (#finance) + google_gmail (internal owner)`

**20. Vendor Payment Approval** — Approval gate for outgoing payments.
`webhook (payment request) → openai_gpt (sanity/policy check) → if_else (amount > limit) → slack_message (approver) → postgresql (record decision)`

**21. Tax Deadline Reminder** — Never miss a filing date.
`schedule → airtable (read ONE upcoming deadline) → if_else (window) → slack_message + airtable (mark reminded)`

---

## Category 4 — Healthcare & Clinics (target 20)

> All PHI stays as structured `form`/`webhook` input or DB rows; no document/image parsing.

| # | Template | Status | Trigger | Integrations |
|---|---|---|---|---|
| 1 | Clinic Appointment Reminder | ✓ EXISTS | schedule | 2 (Airtable, Gmail) |
| 2 | Insurance Pre-Authorization Tracker | ✓ EXISTS | schedule | 3 (Airtable, Slack, Gmail) |
| 3 | Lab Report Follow-up | ✓ EXISTS | form | 2 (Slack, Gmail) |
| 4 | Patient Feedback Classifier | ✓ EXISTS | form | 2 (Airtable, Slack) |
| 5 | Patient Intake Triage | ✓ EXISTS | form | 2 (Slack, Gmail) |
| 6 | Appointment No-Show Follow-up | ＋ NEW | schedule | 3 (Airtable, Gmail, Slack) |
| 7 | New Patient Registration Router | ＋ NEW | form | 3 (Airtable, Gmail, Slack) |
| 8 | Prescription Refill Reminder | ＋ NEW | schedule | 2 (Airtable, Gmail) |
| 9 | Symptom Urgency Triage Bot | ＋ NEW | form | 2 (Slack, Gmail) |
| 10 | Patient Satisfaction Survey Sender | ＋ NEW | schedule | 2 (Airtable, Gmail) |
| 11 | Referral Tracking Notifier | ＋ NEW | form | 3 (Airtable, Gmail, Slack) |
| 12 | Insurance Eligibility Pre-Check | ＋ NEW | form | 3 (HTTP, Airtable, Slack) |
| 13 | Appointment Booking Confirmation | ＋ NEW | webhook | 3 (Gmail, Calendar, Slack) |
| 14 | Care-Plan Follow-up Scheduler | ＋ NEW | schedule | 3 (Airtable, Gmail, Slack) |
| 15 | Missed Lab Result Chaser | ＋ NEW | schedule | 3 (Airtable, Gmail, Slack) |
| 16 | Clinic Daily Schedule Digest | ＋ NEW | schedule | 2 (Airtable, Slack) |
| 17 | Telehealth Link Dispatcher | ＋ NEW | schedule | 3 (Airtable, Gmail, Calendar) |
| 18 | Vaccination Due Reminder | ＋ NEW | schedule | 2 (Airtable, Gmail) |
| 19 | Post-Visit Instructions Sender | ＋ NEW | form | 2 (Airtable, Gmail) |
| 20 | Waitlist Fill Notifier | ＋ NEW | schedule | 3 (Airtable, Gmail, Slack) |
| 21 | Patient Complaint Triage | ＋ NEW | form | 3 (Slack, Gmail, Airtable) |

**Detailed flows (new ones):**

**6. Appointment No-Show Follow-up** — Re-engage missed appointments.
`schedule → airtable (read ONE recent no-show, unactioned) → google_gmail (reschedule link) → slack_message (front desk) → airtable (mark followed-up)`

**7. New Patient Registration Router** — Validate + route new registrations.
`form → openai_gpt (validate/flag missing info) → airtable (create) → if_else (complete?) → google_gmail (welcome/portal) ; else → slack_message (staff to complete)`

**8. Prescription Refill Reminder** — Nudge patients due for refills.
`schedule → airtable (read ONE refill due) → if_else (window) → google_gmail (refill reminder) → airtable (mark reminded)`

**9. Symptom Urgency Triage Bot** — Route intake by severity (non-diagnostic).
`form (symptoms/urgency) → openai_gpt (severity classification) → if_else (urgent?) → slack_message (nurse line) ; else → google_gmail (routine self-care + booking)`

**10. Patient Satisfaction Survey Sender** — Post-visit CSAT.
`schedule → airtable (read ONE recent visit, un-surveyed) → google_gmail (survey link) → airtable (mark sent)`

**11. Referral Tracking Notifier** — Keep referrals from stalling.
`form (referral) → airtable (log) → if_else (status) → google_gmail (specialist) + slack_message (coordinator)`

**12. Insurance Eligibility Pre-Check** — Verify coverage before a visit.
`form (patient + plan) → http_request (eligibility API) → openai_gpt (summarize coverage/limits) → airtable (store) → slack_message (billing)`

**13. Appointment Booking Confirmation** — Confirm + calendar a new booking.
`webhook (booking) → google_gmail (confirmation) → google_calendar (create event) → slack_message (front desk)`

**14. Care-Plan Follow-up Scheduler** — Ensure follow-ups happen.
`schedule → airtable (read ONE due follow-up) → google_gmail (patient) → slack_message (care team) → airtable (mark contacted)`

**15. Missed Lab Result Chaser** — Chase pending results.
`schedule → airtable (read ONE pending result) → google_gmail (patient) → slack_message (care team) → airtable (mark chased)`

**16. Clinic Daily Schedule Digest** — Morning huddle summary.
`schedule (morning) → airtable (read today's appointments) → openai_gpt (summarize load + gaps) → slack_message (staff)`

**17. Telehealth Link Dispatcher** — Send join links ahead of virtual visits.
`schedule → airtable (read ONE upcoming virtual visit) → google_gmail (join link) → google_calendar (attach) → airtable (mark sent)`

**18. Vaccination Due Reminder** — Recall patients due for vaccines.
`schedule → airtable (read ONE due) → if_else (window) → google_gmail (recall) → airtable (mark reminded)`

**19. Post-Visit Instructions Sender** — Formatted after-visit summary.
`form (visit notes) → openai_gpt (format plain-language instructions) → google_gmail (patient) → airtable (log)`

**20. Waitlist Fill Notifier** — Offer freed slots to the waitlist.
`schedule → airtable (read ONE waitlist patient + an open slot) → google_gmail (offer) → slack_message (front desk) → airtable (mark offered)`

**21. Patient Complaint Triage** — Route complaints by severity.
`form → openai_gpt (classify severity + theme) → if_else (safety/serious?) → slack_message (manager) ; else → google_gmail (acknowledgement) → airtable (log)`

---

## Summary

| Category | Existing | New proposed | Total in catalog |
|---|---|---|---|
| Business Verification & Compliance | 12 | 9 | 21 |
| Sales, Support & Internal Operations | 14 | 9 | 23 |
| Finance, Accounting & Insurance | 5 | 16 | 21 |
| Healthcare & Clinics | 5 | 16 | 21 |
| **Total** | **36** | **50** | **86** |

**Recurring buildable patterns used throughout (safe to templatize):**
1. **Intake-classify-route:** `form/webhook → openai_gpt (classify) → if_else/switch → notify + store`
2. **Poll-drain reminder:** `schedule → read ONE due/unprocessed record → if_else → notify → mark`
3. **Event-driven action:** `*_trigger → (enrich via http_request) → openai_gpt → app action`
4. **RAG-lite chat:** `chat/telegram/slack_trigger → db/airtable keyword lookup → openai_gpt (answer from rows) → reply/escalate`
5. **Scheduled summary:** `schedule → read set → openai_gpt (summarize) → gmail + slack`

**Next step (when you're ready):** pick any subset and I'll generate the actual node/edge JSON in your
platform's template format (React-Flow `nodes[]` with `data.type`/`data.config`/`data.notes` + `edges[]`),
ready to paste into debug mode or seed via the admin template API.

*Research/spec only — no application code or templates were modified.*
