/**
 * Makes each pane of the field-ownership step its own scrollport on wide screens.
 *
 * Copied from `CapabilityStage.tsx`'s `COLUMN_SCROLL` (plan RC-7 says to reuse that
 * solution, not re-derive it). Repeated here rather than imported because the two stages
 * share a layout pattern, not a dependency — importing would couple them so that editing
 * one screen's scrolling silently changes the other's.
 *
 * Height comes from the parent flex chain — the wizard hands this step the whole content
 * area — never from a `calc(100vh - …)` guess. Both `calc()` and `min-h` floors were tried
 * on the node-selection screen and both failed; that file's comments record why.
 *
 * `min-h-0` is what lets a flex child shrink below its content height; without it the pane
 * grows to fit and pushes the scroll back up to the page, which is the defect this fixes.
 *
 * `overflow-x-hidden` is not redundant: per spec `overflow-y: auto` makes a `visible`
 * x-axis compute to `auto`, so a pane would sprout a horizontal scrollbar the moment its
 * content overflowed by one pixel — and these panes hold long field values and templates.
 */
export const PANE_SCROLL =
    'lg:h-full lg:min-h-0 lg:overflow-y-auto lg:overflow-x-hidden lg:pr-2';
