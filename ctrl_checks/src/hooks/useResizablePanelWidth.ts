import { useCallback, useEffect, useRef, useState } from 'react';

interface Options {
  /** localStorage key the chosen width is remembered under. */
  storageKey: string;
  /** Starting width as a fraction of the window, used when nothing is stored. */
  defaultFraction: number;
  /** Never narrower than this, in px. */
  minWidth: number;
  /** Never wider than this fraction of the window — keeps the canvas usable. */
  maxFraction: number;
}

/**
 * Width state for a right-hand panel the user can drag to resize.
 *
 * The handle sits on the panel's LEFT edge, so width is measured from the pointer to the
 * right side of the window. The value is clamped on every change and re-clamped when the
 * window resizes, so a panel sized on a wide monitor cannot swallow a narrow one.
 */
export function useResizablePanelWidth({
  storageKey,
  defaultFraction,
  minWidth,
  maxFraction,
}: Options) {
  const clamp = useCallback(
    (w: number) => {
      const max = Math.max(minWidth, window.innerWidth * maxFraction);
      return Math.min(Math.max(w, minWidth), max);
    },
    [minWidth, maxFraction],
  );

  const [width, setWidth] = useState<number>(() => {
    try {
      const stored = Number(window.localStorage.getItem(storageKey));
      if (Number.isFinite(stored) && stored > 0) return stored;
    } catch {
      // localStorage can throw in private browsing / blocked-cookie contexts.
    }
    return window.innerWidth * defaultFraction;
  });
  const [isResizing, setIsResizing] = useState(false);

  const widthRef = useRef(width);
  useEffect(() => {
    widthRef.current = width;
  }, [width]);

  // Clamp once on mount (a stored width may not fit this window) and on every resize.
  useEffect(() => {
    const apply = () => setWidth((w) => clamp(w));
    apply();
    window.addEventListener('resize', apply);
    return () => window.removeEventListener('resize', apply);
  }, [clamp]);

  const persist = useCallback(
    (value: number) => {
      try {
        window.localStorage.setItem(storageKey, String(Math.round(value)));
      } catch {
        // Non-fatal: the width still applies for this session.
      }
    },
    [storageKey],
  );

  const startResize = useCallback(
    (event: React.PointerEvent) => {
      event.preventDefault();
      setIsResizing(true);

      const onMove = (e: PointerEvent) => setWidth(clamp(window.innerWidth - e.clientX));
      const onUp = () => {
        setIsResizing(false);
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp);
        persist(widthRef.current);
      };

      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
    },
    [clamp, persist],
  );

  /** Keyboard resizing, so the handle is not mouse-only. */
  const nudge = useCallback(
    (deltaPx: number) => {
      setWidth((w) => {
        const next = clamp(w + deltaPx);
        persist(next);
        return next;
      });
    },
    [clamp, persist],
  );

  // While dragging, stop the pointer from selecting page text and keep the resize cursor
  // even when it strays off the 4px handle.
  useEffect(() => {
    if (!isResizing) return;
    const { body } = document;
    const prevSelect = body.style.userSelect;
    const prevCursor = body.style.cursor;
    body.style.userSelect = 'none';
    body.style.cursor = 'col-resize';
    return () => {
      body.style.userSelect = prevSelect;
      body.style.cursor = prevCursor;
    };
  }, [isResizing]);

  return { width, isResizing, startResize, nudge };
}
