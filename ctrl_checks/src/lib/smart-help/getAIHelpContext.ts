import type {
  AIHelpContext,
  AIHelpUserOverrides,
  DeviceType,
  HelpTrigger,
  ValidationState,
} from './types';
import { getRecentActions, getRepeatedAttemptCount, getTimeOnScreenMs } from './interactionTracker';

const PRODUCT_NAME = 'CtrlChecks';
const MAX_TEXT_LENGTH = 160;

function truncate(text: string | null | undefined, max = MAX_TEXT_LENGTH): string | null {
  if (!text) return null;
  const trimmed = text.trim().replace(/\s+/g, ' ');
  if (!trimmed) return null;
  return trimmed.length > max ? `${trimmed.slice(0, max - 1)}…` : trimmed;
}

function getAccessibleLabel(el: HTMLElement): string | null {
  const ariaLabel = el.getAttribute('aria-label');
  if (ariaLabel) return truncate(ariaLabel);

  const labelledBy = el.getAttribute('aria-labelledby');
  if (labelledBy) {
    const labelEl = document.getElementById(labelledBy);
    if (labelEl?.textContent) return truncate(labelEl.textContent);
  }

  if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement) {
    if (el.id) {
      const labelEl = document.querySelector(`label[for="${CSS.escape(el.id)}"]`);
      if (labelEl?.textContent) return truncate(labelEl.textContent);
    }
    const wrappingLabel = el.closest('label');
    if (wrappingLabel?.textContent) return truncate(wrappingLabel.textContent);
  }

  const title = el.getAttribute('title');
  if (title) return truncate(title);

  return null;
}

function describeElementType(el: HTMLElement): string {
  const tag = el.tagName.toLowerCase();
  const role = el.getAttribute('role');
  if (role) return role;

  if (tag === 'input') {
    return `${(el as HTMLInputElement).type || 'text'} input`;
  }
  if (tag === 'textarea') return 'text area';
  if (tag === 'select') return 'select';
  if (tag === 'button') return 'button';
  if (tag === 'a') return 'link';
  if (tag === 'form') return 'form';
  if (tag === 'nav') return 'navigation';
  if (el.className && /card/i.test(el.className)) return 'card';
  if (el.className && /empty-state/i.test(el.className)) return 'empty state';
  return tag;
}

function getNearbyText(el: HTMLElement): string | null {
  const parent = el.parentElement;
  if (!parent) return null;
  const ownText = el.textContent?.trim() || '';
  const siblingText = Array.from(parent.children)
    .filter((child) => child !== el)
    .map((child) => child.textContent?.trim() || '')
    .filter(Boolean)
    .join(' ');
  const combined = [ownText, siblingText].filter(Boolean).join(' — ');
  return truncate(combined);
}

function getCurrentValue(el: HTMLElement): string | null {
  if (el instanceof HTMLInputElement) {
    if (el.type === 'password') return el.value ? '(hidden)' : null;
    if (el.type === 'checkbox' || el.type === 'radio') return String(el.checked);
    return truncate(el.value, 80);
  }
  if (el instanceof HTMLTextAreaElement) return truncate(el.value, 80);
  if (el instanceof HTMLSelectElement) return truncate(el.selectedOptions[0]?.textContent, 80);
  return null;
}

function getValidationState(el: HTMLElement): ValidationState {
  const ariaInvalid = el.getAttribute('aria-invalid');
  if (ariaInvalid === 'true') return 'invalid';
  if ('checkValidity' in el && typeof (el as HTMLInputElement).checkValidity === 'function') {
    const input = el as HTMLInputElement;
    if (input.willValidate) {
      return input.checkValidity() ? 'valid' : 'invalid';
    }
  }
  return 'unknown';
}

function getErrorText(el: HTMLElement): string | null {
  const describedBy = el.getAttribute('aria-describedby');
  if (describedBy) {
    const describedEl = document.getElementById(describedBy);
    if (describedEl?.textContent) return truncate(describedEl.textContent);
  }

  const container = el.closest('[data-field], .form-item, .space-y-2') || el.parentElement;
  const errorEl = container?.querySelector('[role="alert"], .text-destructive, [data-error]');
  if (errorEl?.textContent) return truncate(errorEl.textContent);

  if (el.matches('[role="alert"]')) return truncate(el.textContent);

  return null;
}

function getEmptyStateText(el: HTMLElement): string | null {
  const emptyEl = el.matches('[class*="empty-state"], [data-empty-state]')
    ? el
    : el.closest('[class*="empty-state"], [data-empty-state]');
  if (emptyEl?.textContent) return truncate(emptyEl.textContent, 200);
  return null;
}

function getSectionName(el: HTMLElement): string | null {
  let node: Element | null = el;
  while (node) {
    const heading = node.matches('h1, h2, h3, [data-section-name]')
      ? node
      : node.querySelector?.(':scope > h1, :scope > h2, :scope > h3, :scope > [data-section-name]');
    if (heading?.textContent) return truncate(heading.textContent, 60);
    node = node.previousElementSibling || node.parentElement;
  }
  return null;
}

function getDeviceType(): DeviceType {
  if (typeof window === 'undefined') return 'desktop';
  const width = window.innerWidth;
  if (width < 640) return 'mobile';
  if (width < 1024) return 'tablet';
  return 'desktop';
}

export function getAIHelpContext(
  element: HTMLElement,
  trigger: HelpTrigger = 'hover',
  overrides?: AIHelpUserOverrides & { hoverDurationMs?: number },
): AIHelpContext {
  const buttonOrLink = element.closest('button, a, [role="button"]') as HTMLElement | null;

  return {
    page: {
      productName: PRODUCT_NAME,
      route: typeof window !== 'undefined' ? window.location.pathname : '',
      pageTitle: typeof document !== 'undefined' ? document.title : '',
      sectionName: getSectionName(element),
    },
    element: {
      label: getAccessibleLabel(element),
      type: describeElementType(element),
      nearbyText: getNearbyText(element),
      placeholder: element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement
        ? element.placeholder || null
        : null,
      buttonText: buttonOrLink ? truncate(buttonOrLink.textContent) : null,
      currentValue: getCurrentValue(element),
      validationState: getValidationState(element),
      errorText: getErrorText(element),
      emptyStateText: getEmptyStateText(element),
    },
    user: {
      role: overrides?.role ?? null,
      plan: overrides?.plan ?? null,
      deviceType: getDeviceType(),
      recentActions: getRecentActions(),
    },
    trigger: {
      kind: trigger,
      hoverDurationMs: overrides?.hoverDurationMs ?? 0,
      timeOnScreenMs: getTimeOnScreenMs(),
      repeatedAttemptCount: getRepeatedAttemptCount(element),
    },
  };
}
