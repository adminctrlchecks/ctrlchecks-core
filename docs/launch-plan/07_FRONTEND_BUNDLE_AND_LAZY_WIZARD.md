# 07 — Frontend Bundle and Lazy Wizard

---

## Current Frontend Route / Component Structure

Evidence: `ctrl_checks/src/App.tsx`

All pages are already wrapped in `React.lazy()`:
```typescript
const Index = lazy(() => import("./pages/Index"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const AIWorkflowBuilder = lazy(() => import("./pages/AIWorkflowBuilder"));
const WorkflowBuilder = lazy(() => import("./pages/WorkflowBuilder"));
// ... all pages lazy-loaded at the route level
```

**Status: ALREADY PRESENT at page level.**

---

## The Gap: AutonomousAgentWizard is NOT Lazy

Evidence: `ctrl_checks/src/components/workflow/AutonomousAgentWizard.tsx` line 928

```typescript
// Normal named export — imported at module load time when WorkflowBuilder loads
export function AutonomousAgentWizard() { ... }
```

`AIWorkflowBuilder.tsx` (or `WorkflowBuilder.tsx`) imports `AutonomousAgentWizard` via:
```typescript
import { AutonomousAgentWizard } from '../components/workflow/AutonomousAgentWizard';
```

This means the 8,000+ line wizard file loads into the bundle the moment any user visits AIWorkflowBuilder — even users who never open the wizard. This file alone is likely 200–500KB+ of JavaScript.

---

## Lazy-Load Strategy for AutonomousAgentWizard

The wizard is a named export. React.lazy requires a default export. Two options:

**Option A (recommended): Re-export as default**

In `AutonomousAgentWizard.tsx`, add at the bottom:
```typescript
export { AutonomousAgentWizard as default };
```

Then in the page that uses it:
```typescript
import React, { lazy, Suspense } from 'react';

const AutonomousAgentWizard = lazy(() => import('../components/workflow/AutonomousAgentWizard'));

// In render:
<Suspense fallback={<WizardLoadingSkeleton />}>
  <AutonomousAgentWizard {...props} />
</Suspense>
```

**Option B: Wrapper module**

Create `ctrl_checks/src/components/workflow/AutonomousAgentWizardLazy.ts`:
```typescript
export { AutonomousAgentWizard as default } from './AutonomousAgentWizard';
```

Then lazy-load the wrapper. This keeps the original file unchanged.

---

## Loading Skeleton

Create `ctrl_checks/src/components/workflow/WizardLoadingSkeleton.tsx`:
```tsx
export function WizardLoadingSkeleton() {
  return (
    <div className="flex flex-col items-center justify-center h-64 gap-4">
      <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      <p className="text-sm text-muted-foreground">Loading workflow builder...</p>
    </div>
  );
}
```

---

## Error Boundary for Lazy Load Failure

Create `ctrl_checks/src/components/workflow/WizardErrorBoundary.tsx`:
```tsx
import { Component, ReactNode } from 'react';

interface State { hasError: boolean; }

export class WizardErrorBoundary extends Component<{ children: ReactNode }, State> {
  state = { hasError: false };
  
  static getDerivedStateFromError() { return { hasError: true }; }
  
  render() {
    if (this.state.hasError) {
      return (
        <div className="p-4 border border-destructive rounded">
          <p>Failed to load the workflow builder. Please refresh the page.</p>
          <button onClick={() => this.setState({ hasError: false })}>Try Again</button>
        </div>
      );
    }
    return this.props.children;
  }
}
```

---

## Bundle-Size Budget

Add to `ctrl_checks/package.json`:
```json
{
  "scripts": {
    "build:analyze": "vite build --mode production && npx source-map-explorer dist/assets/*.js",
    "size-check": "npx bundlesize"
  },
  "bundlesize": [
    { "path": "dist/assets/index-*.js", "maxSize": "150 kB" },
    { "path": "dist/assets/AutonomousAgentWizard-*.js", "maxSize": "600 kB" }
  ]
}
```

Install bundlesize:
```bash
cd ctrl_checks && npm install --save-dev bundlesize
```

---

## Frontend Files to Modify

| File | Change |
|---|---|
| `ctrl_checks/src/components/workflow/AutonomousAgentWizard.tsx` | Add `export { AutonomousAgentWizard as default }` at bottom |
| `ctrl_checks/src/pages/AIWorkflowBuilder.tsx` | Replace static import with `React.lazy` + Suspense |
| `ctrl_checks/src/pages/WorkflowBuilder.tsx` | Same if it also imports the wizard |
| `ctrl_checks/package.json` | Add `size-check` and `build:analyze` scripts + bundlesize config |

---

## Frontend Files to Create

| File | Purpose |
|---|---|
| `ctrl_checks/src/components/workflow/WizardLoadingSkeleton.tsx` | Loading state shown during wizard chunk download |
| `ctrl_checks/src/components/workflow/WizardErrorBoundary.tsx` | Catch dynamic import failures |

---

## Verification Steps

```bash
# 1. Build production bundle
cd ctrl_checks && npm run build

# 2. Check that wizard chunk is separate
ls dist/assets/ | grep -i wizard
# Should show: AutonomousAgentWizard-[hash].js

# 3. Check that main bundle does not contain wizard content
npx source-map-explorer dist/assets/index-*.js
# AutonomousAgentWizard should NOT appear in index chunk

# 4. Run size check
npm run size-check
```

---

## Tests to Add

File: `ctrl_checks/src/__tests__/lazyWizard.test.tsx`

```
✓ Visiting /workflows/new does NOT load AutonomousAgentWizard chunk immediately
✓ Clicking "Create with AI" loads wizard chunk (WizardLoadingSkeleton shown briefly)
✓ Wizard renders correctly after chunk loads
✓ If dynamic import fails, WizardErrorBoundary shows recovery UI
✓ Bundle size script fails if wizard chunk exceeds 600KB
✓ Main index chunk does not contain "AutonomousAgentWizard" string
```

---

## Large Dependencies to Identify

Run bundle analysis after build to identify other large dependencies:
```bash
npm run build:analyze
```

Common suspects in this codebase:
- `@xyflow/react` — workflow canvas (necessary, cannot lazy-load easily)
- `@aws-amplify/auth` — auth (necessary at startup)
- Any charting library if present

For `@xyflow/react`: It is required by `WorkflowCanvas.tsx` which is always visible on the builder page. Lazy-loading the page (already done) is the best available option.
