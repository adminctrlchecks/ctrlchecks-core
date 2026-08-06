# Deliberately NOT fixed

These are known defects that were left alone because fixing them would mean
guessing at a contract that is currently ambiguous, or because the fix belongs
in the platform rather than in a template.

## Finance / Compliance Agent

**webhook_finance_1 has no auth**

An open POST ingress for financial transactions needs a shared secret or signature check. That is a platform capability (webhook node auth), not a template config change.
