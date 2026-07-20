# Integration Nodes Production Checklist

Scope: Calendly, Linear, Notion, Trello, Typeform.

## Audit Findings

- Frontend node library: all five are present in the picker. Typeform had duplicate `formId`; Linear/Trello operation names did not match backend execution; Calendly/Typeform/Linear/Trello were asking for secrets as required node fields.
- Backend execution: Notion was comprehensive and OAuth-backed. Typeform and Calendly had basic execution but weak credential resolution/output envelopes. Linear/Trello had switch cases but operation aliases and several promised Trello operations were missing.
- Registry overrides: Notion, Calendly, and Typeform had overrides. Linear and Trello did not.
- Credential UI: Notion and Typeform had credential definitions. Linear, Trello, Calendly definitions existed, but connector catalog entries were missing for Linear/Trello/Calendly; Typeform was incorrectly marked coming soon.
- OAuth/API handling: Notion OAuth is implemented. Linear OAuth registry exists, but the production path is Linear API key. Trello uses API key + token. Calendly and Typeform use personal access tokens.
- DB/migrations: no new tables needed; existing `connections`, `unified_credentials`, and Notion OAuth token storage cover these providers.
- Docs/guidance: Calendly, Notion, Typeform docs existed; Linear/Trello docs/search entries were missing.
- Logos/assets: Notion logo existed; expected `/icons/nodes/*` assets were missing for this scope.
- Tests/build: focused tests and type/build verification must pass after implementation.

## Completed TODO

- [x] Align Linear operations across UI, AI node library, operation contracts, and backend aliases.
- [x] Align Trello operations and field names across UI, AI node library, operation contracts, and backend aliases.
- [x] Remove duplicate Typeform `formId` field.
- [x] Make API keys/tokens optional node-level fallbacks and prefer saved Connections.
- [x] Add missing connector catalog entries for Calendly, Linear, and Trello.
- [x] Allow Typeform connection creation by removing the coming-soon gate.
- [x] Add saved-connection credential resolution for Calendly, Linear, Trello, and harden Typeform.
- [x] Normalize Calendly and Typeform outputs to include `success`, `operation`, and `data`.
- [x] Add Linear `get_issue`, `get_teams`, `list_issues`, `create_issue`, and `update_issue` execution.
- [x] Add Trello `get_boards`, `get_lists`, `list_cards`, `get_card`, `create_card`, `update_card`, `move_card`, `delete_card`, `add_label`, and `add_checklist` execution.
- [x] Add registry execute overrides for Linear and Trello.
- [x] Add local node/integration SVG assets for all five providers.
- [x] Add Linear and Trello docs/search/manifest entries.
- [x] Update connection readiness to treat active saved API-key connections as ready when no OAuth scopes are required.

## Verification TODO

- [x] Run worker type-check/tests.
  - `worker`: `npm run type-check`
  - `worker`: `npx jest src/services/connectors/__tests__/connector-registry.test.ts src/services/__tests__/credential-scope-registry.test.ts src/services/__tests__/workflow-connection-readiness.test.ts src/core/registry/__tests__/registry-frontend-parity.test.ts src/core/registry/__tests__/production-integration-nodes.test.ts --runInBand --no-coverage --passWithNoTests --silent`
- [x] Run credential-service type-check.
  - `services/credential-service`: `npm run type-check`
- [x] Run frontend build/tests.
  - `ctrl_checks`: `npm run build`
  - `ctrl_checks`: `npx vitest run src/lib/__tests__/integrationLogos.test.ts src/__tests__/typeform-node-types.test.ts src/__tests__/production-integration-node-types.test.ts src/hooks/__tests__/useWorkflowConnectionStatus.test.ts src/components/connections/__tests__/connectionAvailability.test.ts src/components/workflow/__tests__/guideGenerator.registry.test.ts`
- [ ] Manually smoke each node with real credentials in Connections.
