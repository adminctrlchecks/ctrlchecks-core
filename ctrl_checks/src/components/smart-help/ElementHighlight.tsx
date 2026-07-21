import { forwardRef } from 'react';

/**
 * Imperatively positioned by SmartHelpLayer to match the hovered element's
 * bounding rect. Never touches the real element's box model, so it can
 * never shift layout.
 */
export const ElementHighlight = forwardRef<HTMLDivElement>(function ElementHighlight(_props, ref) {
  return (
    <div
      ref={ref}
      data-smart-help-ignore
      aria-hidden="true"
      className="pointer-events-none fixed z-[9997] rounded-md border-2 border-primary/70 bg-primary/5 shadow-glow transition-all duration-150 ease-out"
      style={{ opacity: 0, top: 0, left: 0, width: 0, height: 0 }}
    />
  );
});
