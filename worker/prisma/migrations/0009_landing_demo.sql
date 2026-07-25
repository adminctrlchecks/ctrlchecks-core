-- Migration 0009: Public landing interactive demo preview
-- Creates admin-editable visual demo scenarios and anonymous event telemetry.
-- down:
-- DROP TABLE IF EXISTS landing_demo_events;
-- DROP TABLE IF EXISTS landing_demo_scenarios;
-- DROP FUNCTION IF EXISTS set_landing_demo_scenarios_updated_at();

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS landing_demo_scenarios (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label         text NOT NULL,
  sort_order    int NOT NULL DEFAULT 0,
  is_active     boolean NOT NULL DEFAULT true,
  script        jsonb NOT NULL,
  created_by    uuid,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS landing_demo_events (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scenario_id   uuid REFERENCES landing_demo_scenarios(id),
  session_id    text NOT NULL,
  event_type    text NOT NULL,
  referrer      text,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_landing_demo_scenarios_active_sort
  ON landing_demo_scenarios(is_active, sort_order);

CREATE INDEX IF NOT EXISTS idx_landing_demo_events_scenario
  ON landing_demo_events(scenario_id);

CREATE INDEX IF NOT EXISTS idx_landing_demo_events_created
  ON landing_demo_events(created_at);

CREATE OR REPLACE FUNCTION set_landing_demo_scenarios_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_landing_demo_scenarios_updated_at ON landing_demo_scenarios;

CREATE TRIGGER trg_landing_demo_scenarios_updated_at
BEFORE UPDATE ON landing_demo_scenarios
FOR EACH ROW
EXECUTE FUNCTION set_landing_demo_scenarios_updated_at();

INSERT INTO landing_demo_scenarios (id, label, sort_order, is_active, script)
VALUES
(
  '11111111-1111-4111-8111-111111111111',
  'Notify our team on Slack when Stripe payment fails',
  0,
  true,
  $json$
  {
    "steps": [
      { "type": "node", "id": "n1", "delayMs": 200, "node": { "label": "Payment Failed", "icon": "stripe", "category": "trigger", "position": { "x": 70, "y": 160 } } },
      { "type": "node", "id": "n2", "delayMs": 650, "node": { "label": "Notify Slack", "icon": "slack", "category": "communication", "position": { "x": 520, "y": 160 } } },
      { "type": "edge", "id": "e1", "delayMs": 950, "edge": { "source": "n1", "target": "n2" } }
    ]
  }
  $json$::jsonb
),
(
  '22222222-2222-4222-8222-222222222222',
  'Create Jira ticket from Gmail',
  1,
  true,
  $json$
  {
    "steps": [
      { "type": "node", "id": "n1", "delayMs": 200, "node": { "label": "New Email", "icon": "gmail", "category": "trigger", "position": { "x": 70, "y": 160 } } },
      { "type": "node", "id": "n2", "delayMs": 650, "node": { "label": "Create Jira Issue", "icon": "jira", "category": "productivity", "position": { "x": 520, "y": 160 } } },
      { "type": "edge", "id": "e1", "delayMs": 950, "edge": { "source": "n1", "target": "n2" } }
    ]
  }
  $json$::jsonb
),
(
  '33333333-3333-4333-8333-333333333333',
  'Sync Notion database every day',
  2,
  true,
  $json$
  {
    "steps": [
      { "type": "node", "id": "n1", "delayMs": 200, "node": { "label": "Every Day", "icon": "schedule", "category": "trigger", "position": { "x": 70, "y": 160 } } },
      { "type": "node", "id": "n2", "delayMs": 650, "node": { "label": "Sync Notion DB", "icon": "notion", "category": "data", "position": { "x": 520, "y": 160 } } },
      { "type": "edge", "id": "e1", "delayMs": 950, "edge": { "source": "n1", "target": "n2" } }
    ]
  }
  $json$::jsonb
),
(
  '44444444-4444-4444-8444-444444444444',
  'Summarize form replies with AI and log them',
  3,
  true,
  $json$
  {
    "steps": [
      { "type": "node", "id": "n1", "delayMs": 200, "node": { "label": "New Form Reply", "icon": "form", "category": "trigger", "position": { "x": 45, "y": 160 } } },
      { "type": "node", "id": "n2", "delayMs": 650, "node": { "label": "AI Summary", "icon": "ai", "category": "ai", "position": { "x": 315, "y": 160 } } },
      { "type": "edge", "id": "e1", "delayMs": 900, "edge": { "source": "n1", "target": "n2" } },
      { "type": "node", "id": "n3", "delayMs": 1150, "node": { "label": "Log to Sheets", "icon": "google_sheets", "category": "data", "position": { "x": 585, "y": 160 } } },
      { "type": "edge", "id": "e2", "delayMs": 1400, "edge": { "source": "n2", "target": "n3" } }
    ]
  }
  $json$::jsonb
),
(
  '55555555-5555-4555-8555-555555555555',
  'Alert on negative mentions, ignore the rest',
  4,
  true,
  $json$
  {
    "steps": [
      { "type": "node", "id": "n1", "delayMs": 200, "node": { "label": "New Mention", "icon": "twitter", "category": "trigger", "position": { "x": 45, "y": 160 } } },
      { "type": "node", "id": "n2", "delayMs": 650, "node": { "label": "Negative?", "icon": "if_else", "category": "logic", "position": { "x": 315, "y": 160 } } },
      { "type": "edge", "id": "e1", "delayMs": 900, "edge": { "source": "n1", "target": "n2" } },
      { "type": "node", "id": "n3", "delayMs": 1150, "node": { "label": "Alert Discord", "icon": "discord", "category": "communication", "position": { "x": 585, "y": 70 } } },
      { "type": "edge", "id": "e2", "delayMs": 1400, "edge": { "source": "n2", "target": "n3", "sourceHandle": "true", "label": "Negative" } },
      { "type": "node", "id": "n4", "delayMs": 1550, "node": { "label": "Ignore", "icon": "x", "category": "logic", "position": { "x": 585, "y": 250 } } },
      { "type": "edge", "id": "e3", "delayMs": 1800, "edge": { "source": "n2", "target": "n4", "sourceHandle": "false", "label": "Neutral" } }
    ]
  }
  $json$::jsonb
),
(
  '66666666-6666-4666-8666-666666666666',
  'Enrich new GitHub issues before emailing the team',
  5,
  true,
  $json$
  {
    "steps": [
      { "type": "node", "id": "n1", "delayMs": 200, "node": { "label": "Issue Webhook", "icon": "webhook", "category": "trigger", "position": { "x": 45, "y": 160 } } },
      { "type": "node", "id": "n2", "delayMs": 650, "node": { "label": "HTTP Enrich", "icon": "http", "category": "api", "position": { "x": 315, "y": 160 } } },
      { "type": "edge", "id": "e1", "delayMs": 900, "edge": { "source": "n1", "target": "n2" } },
      { "type": "node", "id": "n3", "delayMs": 1150, "node": { "label": "Email Team", "icon": "email", "category": "communication", "position": { "x": 585, "y": 160 } } },
      { "type": "edge", "id": "e2", "delayMs": 1400, "edge": { "source": "n2", "target": "n3" } }
    ]
  }
  $json$::jsonb
)
ON CONFLICT (id) DO UPDATE SET
  label = EXCLUDED.label,
  sort_order = EXCLUDED.sort_order,
  is_active = EXCLUDED.is_active,
  script = EXCLUDED.script;
