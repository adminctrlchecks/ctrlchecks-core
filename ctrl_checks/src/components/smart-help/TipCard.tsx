import { useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import { X, Sparkles } from 'lucide-react';
import { useSmartHelpStore, type AnchorRect } from '@/stores/smartHelpStore';

const GAP = 14;
const MARGIN = 12;
const CARD_WIDTH = 300;

type Placement = 'bottom' | 'top' | 'right' | 'left';

interface PositionResult {
  placement: Placement;
  top: number;
  left: number;
  arrowOffset: number;
}

function rectForPlacement(
  placement: Placement,
  anchor: AnchorRect,
  cardW: number,
  cardH: number,
): { top: number; left: number } {
  const centerX = anchor.left + anchor.width / 2;
  const centerY = anchor.top + anchor.height / 2;

  switch (placement) {
    case 'bottom':
      return { top: anchor.top + anchor.height + GAP, left: centerX - cardW / 2 };
    case 'top':
      return { top: anchor.top - GAP - cardH, left: centerX - cardW / 2 };
    case 'right':
      return { top: centerY - cardH / 2, left: anchor.left + anchor.width + GAP };
    case 'left':
      return { top: centerY - cardH / 2, left: anchor.left - GAP - cardW };
  }
}

function fits(rect: { top: number; left: number }, cardW: number, cardH: number, vw: number, vh: number): boolean {
  return (
    rect.top >= MARGIN &&
    rect.left >= MARGIN &&
    rect.top + cardH <= vh - MARGIN &&
    rect.left + cardW <= vw - MARGIN
  );
}

function computePosition(anchor: AnchorRect, cardW: number, cardH: number): PositionResult {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const order: Placement[] = ['bottom', 'top', 'right', 'left'];

  let chosen: Placement = 'bottom';
  let rect = rectForPlacement('bottom', anchor, cardW, cardH);

  for (const placement of order) {
    const candidate = rectForPlacement(placement, anchor, cardW, cardH);
    if (fits(candidate, cardW, cardH, vw, vh)) {
      chosen = placement;
      rect = candidate;
      break;
    }
  }

  const clampedLeft = Math.min(Math.max(rect.left, MARGIN), vw - cardW - MARGIN);
  const clampedTop = Math.min(Math.max(rect.top, MARGIN), vh - cardH - MARGIN);

  const anchorCenterX = anchor.left + anchor.width / 2;
  const anchorCenterY = anchor.top + anchor.height / 2;
  const arrowOffset =
    chosen === 'bottom' || chosen === 'top'
      ? Math.min(Math.max(anchorCenterX - clampedLeft, 20), cardW - 20)
      : Math.min(Math.max(anchorCenterY - clampedTop, 20), cardH - 20);

  return { placement: chosen, top: clampedTop, left: clampedLeft, arrowOffset };
}

const ARROW_SIZE = 8;

function arrowStyleFor(placement: Placement, offset: number): CSSProperties {
  const base: CSSProperties = {
    position: 'absolute',
    backgroundColor: 'hsl(var(--card))',
  };

  switch (placement) {
    case 'bottom':
      return {
        ...base,
        top: -ARROW_SIZE / 2,
        left: offset,
        width: ARROW_SIZE,
        height: ARROW_SIZE,
        clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)',
      };
    case 'top':
      return {
        ...base,
        bottom: -ARROW_SIZE / 2,
        left: offset,
        width: ARROW_SIZE,
        height: ARROW_SIZE,
        clipPath: 'polygon(50% 100%, 0% 0%, 100% 0%)',
      };
    case 'right':
      return {
        ...base,
        left: -ARROW_SIZE / 2,
        top: offset,
        width: ARROW_SIZE,
        height: ARROW_SIZE,
        clipPath: 'polygon(0% 50%, 100% 0%, 100% 100%)',
      };
    case 'left':
      return {
        ...base,
        right: -ARROW_SIZE / 2,
        top: offset,
        width: ARROW_SIZE,
        height: ARROW_SIZE,
        clipPath: 'polygon(100% 50%, 0% 0%, 0% 100%)',
      };
  }
}

export function TipCard() {
  const { tip, tipStatus, anchorRect, pinned, clearTip } = useSmartHelpStore();
  const cardRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<PositionResult | null>(null);

  useLayoutEffect(() => {
    if (!anchorRect || !cardRef.current) {
      setPosition(null);
      return;
    }
    const { height } = cardRef.current.getBoundingClientRect();
    setPosition(computePosition(anchorRect, CARD_WIDTH, height));
  }, [anchorRect, tip, tipStatus]);

  if (!anchorRect || (!tip && tipStatus !== 'loading')) return null;

  const placement = position?.placement ?? 'bottom';

  return (
    <div
      ref={cardRef}
      data-smart-help-ignore
      role="dialog"
      aria-label="Contextual help"
      className="glass fixed z-[9998] animate-scale-in rounded-lg shadow-xl"
      style={{
        width: CARD_WIDTH,
        top: position?.top ?? -9999,
        left: position?.left ?? -9999,
        visibility: position ? 'visible' : 'hidden',
      }}
    >
      <div style={arrowStyleFor(placement, position?.arrowOffset ?? 20)} />

      <div className="flex items-start gap-2 p-3">
        <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Sparkles className="h-3.5 w-3.5" />
        </div>

        <div className="min-w-0 flex-1">
          {tipStatus === 'loading' ? (
            <p className="text-sm text-muted-foreground">Generating help…</p>
          ) : tip ? (
            <>
              <p className="text-sm font-semibold text-foreground">{tip.title}</p>
              <p className="mt-1 text-sm text-muted-foreground">{tip.tooltip}</p>
              {tip.expanded_help && (
                <p className="mt-1.5 text-xs text-muted-foreground/80">{tip.expanded_help}</p>
              )}
              {tip.suggested_action && (
                <p className="mt-2 text-xs font-medium text-primary">→ {tip.suggested_action}</p>
              )}
            </>
          ) : null}
        </div>

        {pinned && (
          <button
            type="button"
            onClick={clearTip}
            className="shrink-0 rounded-full p-0.5 text-muted-foreground/60 hover:bg-muted hover:text-foreground"
            aria-label="Dismiss tip"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}
