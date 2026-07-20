# Requirements Document

## Introduction

The home page currently displays integration logos in a horizontal scrolling marquee (three rows scrolling left/right). This feature replaces that with a vertical scrolling marquee: four columns with alternating scroll directions (up, down, up, down). Each logo tile displays the integration icon on the left with the integration name label aligned to the right of it. The animation must be jank-free and performant, using CSS-only transforms to avoid layout thrashing.

## Glossary

- **Marquee_Section**: The `IntegrationsMarqueeSection` React component rendered on the home page.
- **Logo_Column**: A single vertical strip of logo tiles that scrolls continuously in one direction.
- **Logo_Tile**: An individual card containing an integration icon and its text label side by side.
- **Scroll_Track**: The duplicated list of Logo_Tiles that creates the illusion of infinite scroll.
- **Reduced_Motion**: A user OS/browser preference (`prefers-reduced-motion: reduce`) that disables animation.

---

## Requirements

### Requirement 1: Vertical Four-Column Layout

**User Story:** As a visitor, I want to see integration logos arranged in four vertical columns, so that the section feels dynamic and visually distinct from a standard grid.

#### Acceptance Criteria

1. THE Marquee_Section SHALL render exactly four Logo_Columns side by side.
2. THE Marquee_Section SHALL distribute the full integration list evenly across the four Logo_Columns, with any remainder assigned to the earlier columns in order.
3. THE Marquee_Section SHALL constrain the visible area of each Logo_Column so that tiles outside the visible height are clipped and not visible to the user.

---

### Requirement 2: Alternating Scroll Directions

**User Story:** As a visitor, I want columns to alternate between scrolling up and scrolling down, so that the animation feels lively and visually balanced across the full width.

#### Acceptance Criteria

1. THE Logo_Column at position 1 (leftmost) SHALL animate continuously from `translateY(0)` to `translateY(-50%)` (upward).
2. THE Logo_Column at position 2 SHALL animate continuously from `translateY(-50%)` to `translateY(0)` (downward).
3. THE Logo_Column at position 3 SHALL animate continuously from `translateY(0)` to `translateY(-50%)` (upward).
4. THE Logo_Column at position 4 (rightmost) SHALL animate continuously from `translateY(-50%)` to `translateY(0)` (downward).
5. WHEN all four Logo_Columns are rendered, THE Marquee_Section SHALL apply the scroll direction pattern: up, down, up, down from left to right.

---

### Requirement 3: Smooth, Jank-Free Animation

**User Story:** As a visitor, I want the scrolling animation to be perfectly smooth with no visible stutter or jump, so that the page feels polished and professional at a high-end product level.

#### Acceptance Criteria

1. THE Logo_Column SHALL use a CSS `transform: translateY()` animation driven exclusively by a CSS `@keyframes` rule or a `requestAnimationFrame`-free CSS transition, so that animation runs on the compositor thread.
2. THE Scroll_Track SHALL contain each Logo_Column's tile list duplicated exactly twice, so that the seamless loop point is invisible to the user.
3. WHEN the animation reaches the 50% scroll point, THE Logo_Column SHALL reset to the start position without any visible jump or flash.
4. THE Logo_Column SHALL use `will-change: transform` to hint the browser to promote the element to its own compositor layer.
5. THE Logo_Column SHALL set `animation-timing-function: linear` so that velocity is constant throughout the scroll cycle with no easing curves applied at any point.
6. THE Logo_Column SHALL animate at a calm, moderate speed that is neither fast enough to cause visual fatigue nor slow enough to appear static, so that the scroll feels deliberate and professional.
7. THE Marquee_Section SHALL produce zero layout shifts during animation by ensuring no box-model properties change after initial render, so that the Cumulative Layout Shift score contribution from this component is 0.

---

### Requirement 4: Logo Tile Horizontal Layout

**User Story:** As a visitor, I want each logo tile to show the icon on the left and the integration name on the right, perfectly vertically centered, so that the label is easy to read alongside the icon.

#### Acceptance Criteria

1. THE Logo_Tile SHALL render the integration icon and the integration name in a single horizontal row using flexbox with `align-items: center`.
2. THE Logo_Tile SHALL render the integration icon at a fixed size of 40×40 px inside a white rounded container.
3. THE Logo_Tile SHALL render the integration name as a single-line text label to the right of the icon with a consistent left margin.
4. IF the integration name exceeds the available tile width, THEN THE Logo_Tile SHALL truncate the name with an ellipsis and SHALL NOT wrap to a second line.
5. THE Logo_Column SHALL apply a vertical gap of no more than 8px between consecutive Logo_Tiles, so that the column appears dense and compact with no large empty spaces between cards.

---

### Requirement 5: Reduced Motion Accessibility

**User Story:** As a visitor who has enabled reduced motion in their OS settings, I want the logos to be displayed statically, so that I am not exposed to motion that could cause discomfort.

#### Acceptance Criteria

1. WHEN the `prefers-reduced-motion: reduce` media query is active, THE Marquee_Section SHALL render all Logo_Tiles in a static responsive grid with no animation.
2. WHEN the `prefers-reduced-motion: reduce` media query is active, THE Marquee_Section SHALL display all integrations without duplication.

---

### Requirement 6: Performance

**User Story:** As a visitor on a low-powered device, I want the marquee animation to not degrade page performance, so that the rest of the page remains interactive and responsive.

#### Acceptance Criteria

1. THE Logo_Column animation SHALL be implemented using CSS `animation` (not JavaScript `setInterval`, `setTimeout`, or `requestAnimationFrame` loops) so that the browser can optimize rendering independently of the main thread.
2. THE Marquee_Section SHALL NOT trigger layout recalculation (reflow) on each animation frame by avoiding animating `top`, `margin`, `height`, or any box-model property.
3. THE Logo_Tile images SHALL include `loading="lazy"` so that off-screen images are not fetched until needed.
