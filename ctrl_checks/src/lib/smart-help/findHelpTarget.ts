const PRIMARY_SELECTOR = [
  'button',
  'a[href]',
  'input',
  'textarea',
  'select',
  '[role="button"]',
  '[role="link"]',
  '[role="tab"]',
  '[role="menuitem"]',
  '[role="checkbox"]',
  '[role="switch"]',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

const CONTAINER_SELECTOR = [
  '[data-ai-help]',
  '[class*="card"]',
  '[role="alert"]',
  '[role="status"]',
  'form',
  'nav',
  '[class*="empty-state"]',
  '[data-empty-state]',
].join(', ');

const IGNORE_SELECTOR = '[data-smart-help-ignore]';
const MAX_WALK_DEPTH = 8;

export function findHelpTarget(x: number, y: number): HTMLElement | null {
  if (typeof document === 'undefined') return null;
  const start = document.elementFromPoint(x, y);
  if (!(start instanceof HTMLElement)) return null;
  if (start.closest(IGNORE_SELECTOR)) return null;

  let node: HTMLElement | null = start;
  let container: HTMLElement | null = null;
  let depth = 0;

  while (node && depth < MAX_WALK_DEPTH) {
    if (node.matches(PRIMARY_SELECTOR)) {
      return node;
    }
    if (!container && node.matches(CONTAINER_SELECTOR)) {
      container = node;
    }
    node = node.parentElement;
    depth += 1;
  }

  return container || start;
}
