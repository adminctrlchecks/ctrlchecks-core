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
