# Deliberately NOT fixed

These are known defects that were left alone because fixing them would mean
guessing at a contract that is currently ambiguous, or because the fix belongs
in the platform rather than in a template.

## Finance / Compliance Agent

**webhook_finance_1 has no auth**

An open POST ingress for financial transactions needs a shared secret or signature check. That is a platform capability (webhook node auth), not a template config change.

## AI Inbox Triage & Auto-Label

**native gmail_trigger version**

The contract currently allows only form, schedule, interval, webhook, chat_trigger, telegram_trigger, manual_trigger, and workflow_trigger. This template ships as a webhook-fed email payload until gmail_trigger is admitted by the gate.

## AI Reply-Draft Assistant

**native gmail_trigger version**

Reworked to webhook intake for the same reason; no Gmail trigger is allowed in templates yet.

## Sheets New-Lead Pipeline

**native google_sheets_trigger version**

Reworked to webhook intake because google_sheets_trigger is outside the gate trigger allowlist.

## Telegram Support Bot

**telegram_trigger and telegram reply version**

Reworked to form/chat-style intake and Slack/Gmail handling because telegram output is outside the verified template palette.

## GitHub PR AI Code Review

**github_trigger and GitHub comment version**

Reworked to webhook plus notification because github_trigger and github action nodes are not in the verified template palette for this gate.

## Calendar Meeting-Prep Brief

**google_calendar_trigger version**

Reworked to form intake because google_calendar_trigger is outside the allowed trigger list and google_calendar is outside the verified palette in this task.

## New Bug Auto-Classifier

**linear_trigger / jira_trigger version**

Reworked to webhook intake and Slack/PostgreSQL output because issue-tracker triggers are outside the allowed trigger list.

## Slack Message to Task Logger

**slack_trigger version**

Reworked to form intake because slack_trigger is not an allowed template trigger yet.

## Chargeback / Dispute Handler

**stripe_trigger / stripe node version**

Reworked to generic webhook intake because stripe_trigger and stripe are blocked by the investor node-status gate.

## Appointment Booking Confirmation

**google_calendar create-event version**

Reworked to Airtable/Gmail/Slack because google_calendar is outside the verified palette for this content pass.

## Telehealth Link Dispatcher

**google_calendar update-event version**

Reworked to Airtable/Gmail/Slack because google_calendar is outside the verified palette for this content pass.

## Multi-Channel Customer Support Agent

**Zendesk ticketing version**

Zendesk remains on the investor blocked list for vendor/account status reasons. This template ships with Airtable ticket history plus HubSpot logging and Slack escalation instead.

## Shopify Email Order Support Agent

**WhatsApp order-reply version**

WhatsApp is blocked by Meta Business verification/app-review status. The scenario is reframed as Shopify email support with Gmail customer notification and Slack follow-up.

## Discord Community FAQ Agent

**native discord_trigger version**

discord_trigger is outside the eight allowed entry-trigger types. This template accepts Discord payloads through webhook intake and keeps Discord only as the reply action.

## RAG Document Q&A Agent

**google_drive_trigger ingestion-side version**

google_drive_trigger is outside the allowed trigger list. The shipped template is the chat query-side agent; Drive ingestion should be a separate scheduled poll workflow if needed.

## Company Policy Chatbot

**slack_trigger version**

slack_trigger is not an allowed template trigger. The workflow uses native Form intake, mirroring the existing Slack Message to Task Logger precedent.

## Lead Qualification & Nurturing Agent

**typeform_trigger version**

typeform_trigger is outside the trigger allowlist, so the workflow uses the native Form trigger.

## Inbound Email Sales Agent

**gmail_trigger version**

gmail_trigger is outside the trigger allowlist. The shipped template follows the existing webhook-fed email payload precedent.

## GitHub Issue to Engineering Triage Agent

**github_trigger plus Jira-write version**

github_trigger is not allowed and direct issue-tracker actions remain outside this content pass. The workflow uses webhook intake, HTTP context, PostgreSQL logging, and Slack notification.

## GitHub PR Review Summary Agent

**github_trigger and GitHub action version**

The existing PR-review precedent uses webhook intake plus HTTP diff fetch and Slack/PostgreSQL outputs instead of GitHub trigger/action nodes; this template mirrors that pattern.

## Invoice Data Extraction Agent

**gmail_trigger plus Xero version**

gmail_trigger is outside the trigger allowlist and Xero is blocked. The workflow accepts email payloads by webhook and ends at Google Sheets plus AP notification.

## Meeting Notes & Action-Item Agent

**per-item Google Tasks creation version**

The runtime does not fan out arrays through downstream nodes. Action items ship as one Google Doc block and Slack recap instead of N Google Tasks writes.

## HR New-Hire Provisioning Agent

**typeform_trigger version**

typeform_trigger is outside the trigger allowlist, so the workflow uses native Form intake.

## Resume Screening Agent

**gmail_trigger version**

gmail_trigger is outside the trigger allowlist. The workflow receives resume payloads by webhook.

## Social Media Repurposing Agent

**Twitter and Instagram publish legs**

Twitter and Instagram are blocked by the investor audit. The workflow keeps LinkedIn publishing and sends X/Instagram drafts to Slack for manual posting.

## Social Post Approval Agent

**Twitter publish leg**

Twitter is blocked. The workflow keeps the verified LinkedIn publishing path and sends the X copy as a Slack-reviewed manual draft.

## Review Site Sentiment Monitoring Agent

**Twitter-only brand sentiment source**

The original source depended entirely on Twitter social listening, but Twitter/Instagram/Facebook are blocked and no verified social-listening source exists. It is replaced with review-site/RSS monitoring.

## Shopify Inventory & Order Assistant

**slack_trigger version**

slack_trigger is not an allowed entry trigger. The workflow uses chat_trigger while keeping the verified Shopify action/tool node.

## Subscription Dunning Recovery Agent

**stripe_trigger plus Chargebee version**

stripe_trigger and Stripe are blocked, and Chargebee is also blocked. The workflow uses generic webhook intake plus a Google Sheets billing-history read.

## Financial Reporting Digest Agent

**Stripe and PayPal provider version**

Stripe and PayPal are both blocked, so the finance digest is sourced from Google Sheets and PostgreSQL instead.
