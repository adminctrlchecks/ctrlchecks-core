-- Template Library v2 - step 1: historical safety step.
-- Earlier drafts used this step to temporarily hide unsafe templates before the
-- corrected graphs were applied. The current migration inserts/updates the full
-- corrected 36-template library directly, so this step intentionally does not
-- change live data.

BEGIN;

SELECT 0 AS deactivated;

COMMIT;
