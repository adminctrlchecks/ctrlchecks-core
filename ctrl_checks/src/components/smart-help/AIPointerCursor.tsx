import { forwardRef } from 'react';

/**
 * Imperatively positioned by SmartHelpLayer on every mousemove via direct
 * style writes (not React state) to avoid re-rendering on pointer movement.
 */
export const AIPointerCursor = forwardRef<HTMLDivElement>(function AIPointerCursor(_props, ref) {
  return (
    <div
      ref={ref}
      data-smart-help-ignore
      aria-hidden="true"
      className="pointer-events-none fixed left-0 top-0 z-[9999] opacity-0"
    >
      <div className="relative h-6 w-6">
        <div className="absolute inset-0 animate-pulse-glow rounded-full bg-primary/40 blur-md" />
        <div className="absolute inset-[7px] rounded-full bg-primary shadow-glow" />
      </div>
    </div>
  );
});
