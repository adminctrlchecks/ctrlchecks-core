-- Template Library v2 — step 1: take the two dangerous templates out of the
-- gallery immediately, before the rest of the work lands.
--
--  * Cross-Platform Sync Engine    — its snapshot state never persisted, so every
--                                    poll re-pushed every client record to HubSpot
--                                    and Google Sheets. Every 15 minutes. Forever.
--  * Internal Knowledge / Ops Agent — its if_else condition parses to a permanent
--                                    false, so it never reads the knowledge base
--                                    and Slack-pages the knowledge team for every
--                                    question. Tagged "production-ready".
--
-- Reversible: set is_active = true again after step 2 is applied and verified.

BEGIN;

UPDATE templates
SET is_active = false, updated_at = now()
WHERE name IN ('Cross-Platform Sync Engine', 'Internal Knowledge / Ops Agent');

-- Expect: 2
SELECT count(*) AS deactivated
FROM templates
WHERE name IN ('Cross-Platform Sync Engine', 'Internal Knowledge / Ops Agent')
  AND is_active = false;

COMMIT;
