import { useCallback, useEffect, useRef } from 'react';
import { useRole } from '@/hooks/useRole';
import { useSmartHelpStore, type AnchorRect } from '@/stores/smartHelpStore';
import { getAIHelpContext } from '@/lib/smart-help/getAIHelpContext';
import { buildFallbackTip } from '@/lib/smart-help/fallbackTip';
import { findHelpTarget } from '@/lib/smart-help/findHelpTarget';
import { startInteractionTracking } from '@/lib/smart-help/interactionTracker';
import { fetchAIHelpTip } from '@/lib/api/smartHelpAPI';
import type { AIHelpContext, HelpTrigger } from '@/lib/smart-help/types';
import { AIHelpToggleButton } from './AIHelpToggleButton';
import { AIPointerCursor } from './AIPointerCursor';
import { ElementHighlight } from './ElementHighlight';
import { TipCard } from './TipCard';

const HOVER_DWELL_MS = 450;

function rectFromElement(el: HTMLElement): AnchorRect {
  const rect = el.getBoundingClientRect();
  return { top: rect.top, left: rect.left, width: rect.width, height: rect.height };
}

function buildCacheKey(context: AIHelpContext): string {
  return [
    context.page.route,
    context.element.type,
    context.element.label || context.element.buttonText || '',
    context.trigger.kind,
  ].join('|');
}

function resolveTriggerKind(context: AIHelpContext, base: HelpTrigger): HelpTrigger {
  if (context.element.validationState === 'invalid' || context.element.errorText) return 'error';
  if (context.trigger.repeatedAttemptCount >= 2) return 'repeated_failed_attempt';
  return base;
}

export function SmartHelpLayer() {
  const active = useSmartHelpStore((state) => state.active);
  const { role } = useRole();

  const cursorRef = useRef<HTMLDivElement>(null);
  const highlightRef = useRef<HTMLDivElement>(null);
  const hoveredElRef = useRef<HTMLElement | null>(null);
  const dwellTimerRef = useRef<number | null>(null);
  const dwellStartRef = useRef(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    startInteractionTracking();
  }, []);

  const generateTip = useCallback(
    async (element: HTMLElement, trigger: HelpTrigger, hoverDurationMs = 0) => {
      const anchor = rectFromElement(element);
      const context = getAIHelpContext(element, trigger, { role, plan: null, hoverDurationMs });
      context.trigger.kind = resolveTriggerKind(context, trigger);

      const cacheKey = buildCacheKey(context);
      const pinned = trigger === 'click';
      const store = useSmartHelpStore.getState();

      const cached = store.getCached(cacheKey);
      if (cached) {
        store.setAnchor(anchor, pinned);
        store.setTip(cached, 'success');
        return;
      }

      store.setAnchor(anchor, pinned);
      store.setTip(null, 'loading');

      try {
        const tip = await fetchAIHelpTip(context);
        store.setCached(cacheKey, tip);
        if (useSmartHelpStore.getState().active) {
          store.setTip(tip, 'success');
        }
      } catch {
        const fallback = buildFallbackTip(context);
        if (useSmartHelpStore.getState().active) {
          store.setTip(fallback, 'error');
        }
      }
    },
    [role],
  );

  const handleMouseMove = useCallback(
    (event: MouseEvent) => {
      if (rafRef.current) return;
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = null;
        const { clientX: x, clientY: y } = event;

        if (cursorRef.current) {
          cursorRef.current.style.opacity = '1';
          cursorRef.current.style.transform = `translate3d(${x - 12}px, ${y - 12}px, 0)`;
        }

        const target = findHelpTarget(x, y);
        if (target === hoveredElRef.current) return;
        hoveredElRef.current = target;

        if (dwellTimerRef.current) {
          window.clearTimeout(dwellTimerRef.current);
          dwellTimerRef.current = null;
        }

        if (!target) {
          if (highlightRef.current) highlightRef.current.style.opacity = '0';
          return;
        }

        const rect = target.getBoundingClientRect();
        if (highlightRef.current) {
          highlightRef.current.style.opacity = '1';
          highlightRef.current.style.top = `${rect.top}px`;
          highlightRef.current.style.left = `${rect.left}px`;
          highlightRef.current.style.width = `${rect.width}px`;
          highlightRef.current.style.height = `${rect.height}px`;
        }

        dwellStartRef.current = Date.now();
        dwellTimerRef.current = window.setTimeout(() => {
          if (hoveredElRef.current === target) {
            generateTip(target, 'hover', Date.now() - dwellStartRef.current);
          }
        }, HOVER_DWELL_MS);
      });
    },
    [generateTip],
  );

  const handleClick = useCallback(
    (event: MouseEvent) => {
      const eventTarget = event.target as HTMLElement | null;
      if (eventTarget?.closest('[data-smart-help-ignore]')) return;

      event.preventDefault();
      event.stopPropagation();

      const target = findHelpTarget(event.clientX, event.clientY);
      if (!target) return;

      if (dwellTimerRef.current) {
        window.clearTimeout(dwellTimerRef.current);
        dwellTimerRef.current = null;
      }
      generateTip(target, 'click');
    },
    [generateTip],
  );

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      useSmartHelpStore.getState().deactivate();
    }
  }, []);

  const handleViewportChange = useCallback(() => {
    useSmartHelpStore.getState().clearTip();
    hoveredElRef.current = null;
    if (highlightRef.current) highlightRef.current.style.opacity = '0';
  }, []);

  useEffect(() => {
    if (!active) return undefined;

    const cursorEl = cursorRef.current;
    const highlightEl = highlightRef.current;

    document.documentElement.classList.add('smart-help-active');
    document.addEventListener('mousemove', handleMouseMove, { passive: true });
    document.addEventListener('click', handleClick, { capture: true });
    document.addEventListener('keydown', handleKeyDown);
    window.addEventListener('scroll', handleViewportChange, { passive: true, capture: true });
    window.addEventListener('resize', handleViewportChange);

    return () => {
      document.documentElement.classList.remove('smart-help-active');
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('click', handleClick, true);
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('scroll', handleViewportChange, true);
      window.removeEventListener('resize', handleViewportChange);

      if (dwellTimerRef.current) window.clearTimeout(dwellTimerRef.current);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      dwellTimerRef.current = null;
      rafRef.current = null;
      hoveredElRef.current = null;
      if (cursorEl) cursorEl.style.opacity = '0';
      if (highlightEl) highlightEl.style.opacity = '0';
    };
  }, [active, handleMouseMove, handleClick, handleKeyDown, handleViewportChange]);

  return (
    <>
      <AIHelpToggleButton />
      {active && (
        <>
          <ElementHighlight ref={highlightRef} />
          <AIPointerCursor ref={cursorRef} />
          <TipCard />
        </>
      )}
    </>
  );
}
