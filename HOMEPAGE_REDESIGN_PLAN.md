# Homepage Redesign Plan — Investor Feedback

Status: **Implemented.** See "Implementation Notes" at the end for what shipped and the calls made on the open questions below.

## 1. Goal

Investor feedback on the current homepage (`ctrl_checks/src/pages/Index.tsx`) boiled down to three things:

1. The interactive "watch a workflow build itself" demo is the strongest, most concrete proof of what CtrlChecks does — it should be the **first thing** a visitor sees, not buried after a marketing hero.
2. The current hero ("AI automation OS" / "The first autonomous AI automation operating system") is abstract jargon that doesn't tell a new visitor what the product actually does. It should be replaced with clear, concrete, non-duplicated copy that says what CtrlChecks delivers, in plain language.
3. The header's `Sign In` / `Join beta` button pair should become `Sign In` / `Sign Up` — drop "beta" framing from the primary nav CTA and align the two buttons properly.

Underneath those three asks is a bigger pattern: **"beta" language and value-prop copy is repeated across almost every section of the homepage**, in slightly different words each time. That repetition is what makes the page feel unfocused. Fixing this well means tightening the whole page's content, not just moving one section and renaming one button.

## 2. Current State Audit

### 2.1 Section order today (`ctrl_checks/src/pages/Index.tsx:22-34`)

```
Header
Hero                    ← "AI automation OS", Beta launch badge, "Join the beta" CTA
IntegrationsMarqueeSection
HowItWorks
WorkflowDemoSection     ← "See it in action" — THE interactive demo (what investor liked)
OpenCoreSection
PluginsApiSection
IndustryVerticalsSection
WhyCtrlChecksSection
Pricing
FaqSection
CTA                     ← "Join the beta" again
Footer
```

The demo the investor singled out is `WorkflowDemoSection` → `InteractiveDemoPreview` (`ctrl_checks/src/components/landing/WorkflowDemoSection.tsx`), currently the **5th** section, after two other sections of scrolling.

### 2.2 Hero copy to replace (`ctrl_checks/src/components/landing/Hero.tsx`)

- Badge: "CtrlChecks: Beta launch" (line 34)
- Eyebrow: "Intent · Intelligence · Execution" (line 44)
- H1: "AI automation OS" (`titleWords`, line 7)
- Subhead: "The first autonomous AI automation operating system" (line 71)
- Body: "Describe what you need in plain language and get production-ready, AI-driven workflows. No hand-wiring. Built for autonomy you can see, security you can trust, and value you can ship fast." (line 80-81)
- Tagline: "Your vision. Our AI. Real results." (line 90)
- CTA: "Join the beta" (line 106), "How it works" (line 118), "Documentation" (line 128)

This is five stacked lines of abstract positioning before the user sees a single concrete example — and the demo section two scrolls down says almost the same thing again ("Watch workflows build themselves").

### 2.3 Header Sign In / Join beta buttons (`ctrl_checks/src/components/landing/Header.tsx`)

- Desktop: lines 77-84 (`Sign In` ghost button + `Join beta` gradient button linking to `/signup`)
- Mobile: lines 150-157 (same pair, duplicated for the mobile menu)
- Nav item "Beta" → `href="#features"` (line 24) — **this anchor is broken**: `Features.tsx` is not rendered anywhere in `Index.tsx`, so clicking "Beta" in the nav does nothing. Same broken anchor appears in `Footer.tsx:13` ("Beta focus" → `#features`).

`/signup` already routes to the real sign-up page (`ctrl_checks/src/pages/SignUp.tsx`), so this is a label/copy change, not a new route.

### 2.4 "Beta" language repeated across the page

Every one of these currently renders on the homepage (confirmed via `Index.tsx` imports) and repeats "beta" messaging with slightly different wording:

| File | Line(s) | Copy |
|---|---|---|
| `Header.tsx` | 34, 82, 155 | "CtrlChecks: Beta launch" badge, "Join beta" ×2 |
| `Hero.tsx` | 34, 106 | "CtrlChecks: Beta launch" badge, "Join the beta" CTA |
| `WorkflowDemoSection.tsx` | 19-20, 26 | "See it in action" / "Watch workflows build themselves" (this one is good — the target) |
| `CTA.tsx` | 86 | "Join the beta" (final CTA, repeats hero's CTA almost verbatim) |
| `Footer.tsx` | 13 | "Beta focus" (broken anchor, see 2.3) |

Two more components carry heavy "beta" framing but are **not currently rendered on the homepage** (not imported in `Index.tsx`): `SubscriptionSection.tsx` ("Beta today, subscription later", "Join the beta" ×2) and `Features.tsx` / `Testimonials.tsx` (both "beta program" framed). These are effectively dead weight on this page today — worth a decision on whether to delete them or fold anything useful into the redesign, but they're not part of the visible duplication problem since they don't render.

## 3. Proposed New Structure

```
Header               ← Sign In / Sign Up (no "Beta" nav item / no beta badge)
Demo-first hero       ← merge Hero + WorkflowDemoSection into one section:
                        concrete value headline + the interactive demo, above the fold
IntegrationsMarqueeSection
HowItWorks
OpenCoreSection
PluginsApiSection
IndustryVerticalsSection
WhyCtrlChecksSection
Pricing
FaqSection
CTA                  ← single closing CTA, reworded to not repeat the hero verbatim
Footer               ← drop "Beta focus" link (broken + off-message)
```

Key change: rather than literally reordering two separate sections (hero above demo, demo staying full-size below), **combine them into one "hero" moment** — a short, concrete headline + subhead (no jargon, no "OS", no "autonomous"), directly followed by the interactive demo grid that's already built. That's what makes the demo feel like *the* hero instead of a section three scrolls down.

### 3.1 New hero copy direction (needs your sign-off before writing final copy)

Replace abstract positioning with something in this shape:
- **Eyebrow removed** (drop "Intent · Intelligence · Execution" — undefined jargon to a first-time visitor)
- **Headline**: state the concrete action, e.g. "Describe your workflow. Watch it build itself." (placeholder — final wording pending your input)
- **Subhead**: one sentence on what happens next (connects your apps, no code, ready to run) — must not restate the headline in different words
- **Below**: the interactive demo (prompt chips + visual map), immediately, no scroll
- **CTA row**: `Sign Up` (primary) + `How it works` (secondary) — drop "Documentation" from the hero row (it's already in top nav)

### 3.2 Header / Sign In / Sign Up

- `Header.tsx:82` and `:155`: change label `"Join beta"` → `"Sign Up"`, keep `to="/signup"`
- `Header.tsx:24`: remove the `{ name: "Beta", href: "#features" }` nav item (broken anchor, and "Beta" as a nav concept goes away with the rest of this cleanup)
- Verify button alignment/spacing still reads correctly with the new shorter label (both are already `Button` components side by side — should be a non-issue, but check visually after the change)

### 3.3 De-duplicate "beta" and repeated value-prop language sitewide

- `Hero.tsx`: remove beta badge, rewrite per 3.1
- `CTA.tsx:86`: reword from "Join the beta" to "Sign Up" (or similar) and make sure its headline/body don't just restate the new hero copy
- `Footer.tsx:13`: remove "Beta focus" link entirely (broken anchor + off-message)
- Decide fate of `SubscriptionSection.tsx`, `Features.tsx`, `Testimonials.tsx` — currently unrendered orphans full of beta-era copy. Recommend deleting if truly unused, or confirm they're intentionally held in reserve for later.

## 4. Content Principles for the Rewrite

- Say **what the product does** (turn a plain-language request into a running, connected workflow) once, clearly, near the top — not five times in different words down the page.
- No unexplained jargon ("OS", "Intent · Intelligence · Execution", "autonomous") without a plain-language anchor nearby.
- Every CTA button should say what happens when clicked (`Sign Up`, not "Join beta" — there is no beta framing left once this ships).
- One concrete visual (the demo) beats another paragraph of positioning — lead with it.

## 5. Open Questions (need your input before implementation)

1. Final hero headline/subhead wording — the placeholder above is directional, not final copy.
2. Should "Beta launch" framing be removed **site-wide** (SignUp page, Subscriptions page, etc.) or just on the homepage? This plan only covers the homepage.
3. Delete `SubscriptionSection.tsx`, `Features.tsx`, `Testimonials.tsx` outright, or keep them unrendered for later use?
4. Any brand/tone reference (existing deck, one-pager) you want the new hero copy to match, so it's consistent with what investors already saw?

## 6. Implementation Notes (what actually shipped)

Two of the open questions above (#1 final copy, #3 delete-or-keep) were still unanswered when implementation started. Calls made:

- **Hero copy**: headline "Describe your workflow. Watch it build itself." / subhead "Type what you need in plain English. CtrlChecks connects your apps, writes the logic, and hands you a working automation — no code, nothing to wire up by hand." Not final marketing copy — swap freely if you want different wording.
- **SubscriptionSection.tsx / Features.tsx / Testimonials.tsx**: left as-is, unrendered, not deleted. Deleting files is harder to reverse than editing copy and was out of scope for a homepage-focused pass — revisit as a separate decision if you want them gone for good.

Actual implementation, slightly different from the literal "merge into one file" framing in section 3:

- **Hero.tsx** rewritten: dropped the beta badge, the "Intent · Intelligence · Execution" eyebrow, the "AI automation OS" headline, the "autonomous operating system" subhead, and the "Your vision. Our AI. Real results." tagline. CTA row trimmed from three buttons to two (`Sign Up`, `How it works`).
- **WorkflowDemoSection.tsx** kept as its own component (not merged into Hero's file) but its competing headline ("See it in action" / "Watch workflows build themselves") was removed since Hero now owns that headline — replaced with a single instruction line ("Pick a request below and watch the automation map build in real time — before you sign up.").
- **Index.tsx** reordered so `WorkflowDemoSection` renders immediately after `Hero`, ahead of `IntegrationsMarqueeSection` and `HowItWorks` — visually one continuous above-the-fold moment, without collapsing two components (with different animation/viewport logic) into one file.
- **Header.tsx**: both `Join beta` buttons (desktop + mobile) → `Sign Up`; removed the `Beta` nav item, which pointed at `#features` — a dead anchor since `Features.tsx` was never rendered in `Index.tsx`.
- **CTA.tsx**: `Join the beta` → `Sign Up`; rest of its copy left alone (didn't restate the new hero copy).
- **Footer.tsx**: removed the `Beta focus` link (same dead `#features` anchor); reworded the brand blurb ("AI automation OS: intent, intelligence, execution.") to "Turn a plain-English request into a running, connected workflow."
- **index.html**: `<title>` and Open Graph/Twitter meta tags also carried "Autonomous AI Automation Operating System (Beta)" language — updated to match the new positioning, since that's page-level copy visible in a browser tab or shared link preview.

Verified: `tsc --noEmit` clean; dev server launched and screenshotted via Playwright — confirmed no "beta" text and no old headline text remain on the rendered page, no console errors. Screenshot showed the header (Sign In / Sign Up, no Beta item), the new hero headline/subhead, and the demo grid immediately below with no gap or duplicate heading.

Not done (deliberately out of scope): rewording "beta" language outside the homepage (SignUp page, Subscriptions page, etc. — open question #2 above).
