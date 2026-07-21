const RECENT_ACTIONS_LIMIT = 5;
const REPEAT_WINDOW_MS = 15_000;

const recentActions: string[] = [];
const elementAttempts = new Map<string, { count: number; lastAt: number }>();

let listening = false;
const pageLoadedAt = Date.now();

function describeTarget(target: EventTarget | null): string | null {
  if (!(target instanceof HTMLElement)) return null;
  const el = target.closest('button, a, input, textarea, select, [role="button"]') as HTMLElement | null;
  if (!el) return null;
  const label =
    el.getAttribute('aria-label') ||
    (el as HTMLInputElement).placeholder ||
    el.textContent?.trim().slice(0, 40) ||
    el.tagName.toLowerCase();
  return `${el.tagName.toLowerCase()}:${label}`;
}

function recordAction(description: string) {
  recentActions.push(description);
  if (recentActions.length > RECENT_ACTIONS_LIMIT) {
    recentActions.shift();
  }
}

function elementKey(el: HTMLElement): string {
  return el.getAttribute('data-ai-help-id') || el.id || `${el.tagName}:${el.className}`.slice(0, 80);
}

function handleClick(event: MouseEvent) {
  const description = describeTarget(event.target);
  if (description) recordAction(description);

  if (event.target instanceof HTMLElement) {
    const el = event.target.closest('button, a, input, textarea, select, [role="button"]') as HTMLElement | null;
    if (el) {
      const key = elementKey(el);
      const now = Date.now();
      const existing = elementAttempts.get(key);
      if (existing && now - existing.lastAt < REPEAT_WINDOW_MS) {
        elementAttempts.set(key, { count: existing.count + 1, lastAt: now });
      } else {
        elementAttempts.set(key, { count: 1, lastAt: now });
      }
    }
  }
}

function handleInvalid(event: Event) {
  const description = describeTarget(event.target);
  if (description) recordAction(`invalid:${description}`);
}

export function startInteractionTracking(): void {
  if (listening || typeof document === 'undefined') return;
  listening = true;
  document.addEventListener('click', handleClick, { capture: true, passive: true });
  document.addEventListener('invalid', handleInvalid, { capture: true, passive: true });
}

export function getRecentActions(): string[] {
  return [...recentActions];
}

export function getRepeatedAttemptCount(element: HTMLElement | null): number {
  if (!element) return 0;
  const key = elementKey(element);
  const entry = elementAttempts.get(key);
  if (!entry || Date.now() - entry.lastAt > REPEAT_WINDOW_MS) return 0;
  return entry.count;
}

export function getTimeOnScreenMs(): number {
  return Date.now() - pageLoadedAt;
}
