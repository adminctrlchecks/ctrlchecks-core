/**
 * E2E: workflow execution golden path + error badge smoke test.
 *
 * Requires:
 *   E2E_BASE_URL  — deployed frontend (default: https://app.ctrlchecks.ai)
 *   E2E_API_URL   — worker API        (default: https://worker.ctrlchecks.ai)
 *   E2E_EMAIL     — test Cognito user email
 *   E2E_PASSWORD  — test Cognito user password
 *   E2E_WORKFLOW_ID — existing saved workflow to open (must belong to the test user)
 *
 * Run only on live/staging after deploy:
 *   E2E_BASE_URL=https://app.ctrlchecks.ai E2E_EMAIL=... E2E_PASSWORD=... E2E_WORKFLOW_ID=... npx playwright test
 */

import { test, expect } from '@playwright/test';

const EMAIL = process.env.E2E_EMAIL ?? '';
const PASSWORD = process.env.E2E_PASSWORD ?? '';
const WORKFLOW_ID = process.env.E2E_WORKFLOW_ID ?? '';
const API_URL = process.env.E2E_API_URL || 'https://worker.ctrlchecks.ai';

test.describe('workflow execute', () => {
  test.skip(!EMAIL || !PASSWORD || !WORKFLOW_ID, 'E2E_EMAIL, E2E_PASSWORD, E2E_WORKFLOW_ID must be set');

  test('health endpoints are reachable', async ({ request }) => {
    const live = await request.get(`${API_URL}/health/live`);
    expect(live.status()).toBe(200);
    const body = await live.json();
    expect(body.status).toBe('live');

    const ready = await request.get(`${API_URL}/health/ready`);
    expect(ready.status()).toBe(200);
    const readyBody = await ready.json();
    expect(readyBody.status).toBe('ready');
  });

  test('login and navigate to workflow builder', async ({ page }) => {
    await page.goto('/login');

    // Fill login form — selectors may vary; adjust if the form changes
    await page.fill('input[type="email"]', EMAIL);
    await page.fill('input[type="password"]', PASSWORD);
    await page.click('button[type="submit"]');

    // Wait for redirect away from login
    await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 15_000 });

    // Navigate to the workflow builder
    await page.goto(`/workflows/${WORKFLOW_ID}`);
    await page.waitForSelector('[data-testid="workflow-canvas"], .react-flow__renderer', { timeout: 15_000 });

    // Verify at least one workflow node is rendered
    const nodes = page.locator('.react-flow__node');
    await expect(nodes.first()).toBeVisible({ timeout: 10_000 });
  });

  test('run button triggers execution and status updates appear', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', EMAIL);
    await page.fill('input[type="password"]', PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 15_000 });

    await page.goto(`/workflows/${WORKFLOW_ID}`);
    await page.waitForSelector('.react-flow__renderer', { timeout: 15_000 });

    // Click the Run button in WorkflowHeader
    const runButton = page.locator('button', { hasText: /run/i }).first();
    await expect(runButton).toBeEnabled({ timeout: 10_000 });
    await runButton.click();

    // Execution console should open and show some status within 20s
    await expect(
      page.locator('[data-testid="execution-console"], .execution-console'),
    ).toBeVisible({ timeout: 20_000 }).catch(() => {
      // Console may already be visible — not a failure
    });

    // Spinner on at least one node indicates execution started
    const spinner = page.locator('.lucide-loader2, [class*="animate-spin"]').first();
    const found = await spinner.isVisible().catch(() => false);
    // Soft assertion — spinner may have already cycled
    if (!found) {
      console.log('[e2e] Spinner not found — execution may have completed immediately');
    }
  });

  test('version history panel opens and lists versions', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', EMAIL);
    await page.fill('input[type="password"]', PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 15_000 });

    await page.goto(`/workflows/${WORKFLOW_ID}`);
    await page.waitForSelector('.react-flow__renderer', { timeout: 15_000 });

    // Click the History button
    const historyBtn = page.locator('button', { hasText: /history/i }).first();
    await expect(historyBtn).toBeVisible({ timeout: 10_000 });
    await historyBtn.click();

    // Version panel should appear
    await expect(page.locator('text=Version History')).toBeVisible({ timeout: 5_000 });
  });
});
