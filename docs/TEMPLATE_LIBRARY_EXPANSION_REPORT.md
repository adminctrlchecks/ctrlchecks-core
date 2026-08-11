# Template Library Expansion Report

Date: 2026-08-11

## Summary

Expanded the generated template library from 36 to 86 active template JSON sources under `ctrl_checks/templates/src/`.

The 50 added templates are authored in `ctrl_checks/templates/apply-fixes.cjs`, emitted through the generator, and inserted/updated by `ctrl_checks/sql_migrations/templates_v2/02_apply_templates_v2.sql`. No execution engine, resolver, node registry, or product runtime code was changed.

## Added By Category

| Category | Existing | Added | Total |
|---|---:|---:|---:|
| Business Verification & Compliance | 12 | 9 | 21 |
| Sales, Support & Internal Operations | 14 | 9 | 23 |
| Finance, Accounting & Insurance | 5 | 16 | 21 |
| Healthcare & Clinics | 5 | 16 | 21 |
| Total | 36 | 50 | 86 |

## Trigger Reworks

The catalog includes several native push-trigger variants that are not allowed by the current CI gate. Those use cases were kept, but reworked to allowed triggers:

- Gmail-triggered inbox triage and reply drafting now use `webhook` payload intake.
- Google Sheets new-lead intake now uses `webhook` payload intake.
- GitHub PR review now uses `webhook` plus `http_request` for the diff and Slack/Gmail notification.
- Calendar meeting prep now uses a `form` intake instead of Calendar trigger/node operations.
- Linear/Jira bug classification now uses `webhook` intake and PostgreSQL/Slack output.
- Slack-message task logging now uses `form` intake.
- Stripe dispute handling now uses generic `webhook` intake and avoids Stripe nodes.
- Healthcare booking and telehealth templates avoid Google Calendar actions until that node is admitted to this content palette.

## Deferred To Phase 2

Native event-trigger versions are listed in `ctrl_checks/templates/DEFERRED.md`. Phase 2 requires verifying the relevant trigger/action nodes, updating the gate allowlists, and updating `docs/NODE_STATUS_INVESTOR_ANALYSIS.md` rather than silently shipping unverified nodes.

## Validation

Passed:

```text
cd worker
npx jest src/core/registry/__tests__/template-library-contract.test.ts
```

Result: 1 test suite passed, 1,377 assertions passed across 86 templates.

## MongoDB Showcase Update

Added MongoDB document-store usage to five workflows where variable event payloads fit a document database:

- `Support Ticket Triage`: archives the full ticket request and AI classification to `support_ticket_events`.
- `Patient Intake Triage`: archives structured intake and triage output to `patient_intake_events`.
- `Vendor Due Diligence`: archives a vendor risk dossier to `vendor_risk_dossiers`.
- `AI Inbox Triage & Auto-Label`: archives inbound email triage events to `inbox_triage_events`.
- `Insurance Claim Intake Triage`: archives claim intake packets to `claim_intake_events`.

MongoDB configs use `insertOne` with declared `collection` and `document` fields only. Connection strings, usernames, passwords, and database credentials remain credential-owned and are not stored in template config.
