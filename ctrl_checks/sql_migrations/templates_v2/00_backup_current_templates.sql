-- Template Library v2 — step 0: backup.
-- 15 of the 20 live templates exist ONLY in this database (no repo file), so
-- this runs before anything else. Nothing below is destructive.

BEGIN;

DROP TABLE IF EXISTS templates_backup_20260823_ai_agent_category;
CREATE TABLE templates_backup_20260823_ai_agent_category AS SELECT * FROM templates;

-- Expect: 550
SELECT count(*) AS backed_up FROM templates_backup_20260823_ai_agent_category;

COMMIT;

-- To restore everything:
--   BEGIN;
--   DELETE FROM templates;
--   INSERT INTO templates SELECT * FROM templates_backup_20260823_ai_agent_category;
--   COMMIT;
