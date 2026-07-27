import { lazy, Suspense } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, CreditCard, Hammer, Loader2 } from 'lucide-react';
import { AppBrand } from '@/components/brand/AppBrand';
import { WizardLoadingSkeleton } from '@/components/workflow/WizardLoadingSkeleton';
import { WizardErrorBoundary } from '@/components/workflow/WizardErrorBoundary';
import { useSubscriptionUsage } from '@/components/workflow/WorkflowCreationOptions';
import { Button } from '@/components/ui/button';

const AutonomousAgentWizard = lazy(() => import('@/components/workflow/AutonomousAgentWizard'));

export default function AIWorkflowBuilder() {
  const { usage, loading, outOfWorkflows } = useSubscriptionUsage();

  if (loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (usage && outOfWorkflows) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col bg-background">
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-card px-4">
          <AppBrand context="app" size="sm" />
          <Button variant="ghost" size="sm" asChild>
            <Link to="/dashboard">Close</Link>
          </Button>
        </header>

        <main className="flex flex-1 items-center justify-center px-4 py-8">
          <section className="w-full max-w-lg rounded-lg border border-destructive/30 bg-card p-6 shadow-sm">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
              <AlertCircle className="h-6 w-6 text-destructive" />
            </div>
            <h1 className="text-xl font-semibold">Upgrade Plan</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              You have used {usage.workflowsUsed} of {usage.workflowLimit} workflows on {usage.planName}. Upgrade to generate another workflow with AI.
            </p>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <Button asChild>
                <Link to="/subscriptions">
                  <CreditCard className="mr-2 h-4 w-4" />
                  Upgrade Plan
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <Link to="/workflow/new">
                  <Hammer className="mr-2 h-4 w-4" />
                  Manual Builder
                </Link>
              </Button>
            </div>
          </section>
        </main>
      </div>
    );
  }

  return (
    <WizardErrorBoundary>
      <Suspense fallback={<WizardLoadingSkeleton />}>
        <AutonomousAgentWizard />
      </Suspense>
    </WizardErrorBoundary>
  );
}
