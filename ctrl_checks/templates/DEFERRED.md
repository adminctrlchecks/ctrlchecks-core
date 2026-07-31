# Deliberately NOT fixed

These are known defects that were left alone because fixing them would mean
guessing at a contract that is currently ambiguous, or because the fix belongs
in the platform rather than in a template.

## FAQ Answering Assistant

**whatsapp_reply_client.to = {{input.senderPhone}}**

senderPhone has 0 matches anywhere in the codebase and the chat_trigger output contract is contested (execute-workflow.ts:3052 returns a string; the comment at :20086 claims an object). Needs one live chat execution to settle before a value can be written.

## Verification Co-Pilot Chat

**whatsapp_reply_copilot.to = {{input.senderPhone}}**

blocked on the chat_trigger output contract (see B4). senderPhone exists nowhere in the codebase.

## Document Vault — Smart Search

**whatsapp_reply_search.to = {{input.senderPhone}}**

blocked on the chat_trigger output contract (see B4).

## Finance / Compliance Agent

**webhook_finance_1 has no auth**

An open POST ingress for financial transactions needs a shared secret or signature check. That is a platform capability (webhook node auth), not a template config change.
