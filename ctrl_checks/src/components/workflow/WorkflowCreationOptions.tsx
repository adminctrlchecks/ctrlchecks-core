import { useNavigate } from 'react-router-dom';
import { AlertCircle, ArrowRight, CreditCard, Hammer, Loader2, Sparkles } from 'lucide-react';
import { useSubscription } from '@/hooks/useSubscription';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface SubscriptionUsage {
  workflowsUsed: number;
  workflowLimit: number;
  remainingWorkflows: number;
  planName: string;
  unlimitedModeEnabled: boolean;
}

/**
 * Thin adapter over {@link useSubscription} kept for existing callers.
 * `outOfWorkflows` already accounts for system-wide unlimited mode.
 */
export function useSubscriptionUsage() {
  const { subscription, loading, refresh, isOutOfWorkflows, unlimitedModeEnabled } = useSubscription();

  const usage: SubscriptionUsage | null = subscription
    ? {
        workflowsUsed: subscription.workflowsUsed,
        workflowLimit: subscription.workflowLimit,
        remainingWorkflows: subscription.remainingWorkflows,
        planName: subscription.planName,
        unlimitedModeEnabled: subscription.unlimitedModeEnabled,
      }
    : null;

  return { usage, loading, refresh, outOfWorkflows: isOutOfWorkflows, unlimitedModeEnabled };
}

interface WorkflowCreationOptionsProps {
  onNavigate?: () => void;
}

export function WorkflowCreationOptions({ onNavigate }: WorkflowCreationOptionsProps) {
  const navigate = useNavigate();
  const { usage, loading, outOfWorkflows } = useSubscriptionUsage();
  const aiLocked = !!usage && outOfWorkflows;

  const go = (path: string) => {
    onNavigate?.();
    navigate(path);
  };

  return (
    <>
      <div className="text-center mb-6">
        <h1 className="text-2xl font-semibold mb-1.5">Create New Workflow</h1>
        <p className="text-muted-foreground text-sm">
          Choose how you'd like to create your workflow
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <Card className={`transition-shadow border ${aiLocked ? 'border-destructive/30 bg-destructive/5' : 'hover:shadow-md'}`}>
          <CardHeader className="pb-4">
            <div className={`flex items-center justify-center w-12 h-12 rounded-full mb-3 ${aiLocked ? 'bg-destructive/10' : 'bg-primary/10'}`}>
              {aiLocked ? (
                <AlertCircle className="h-5 w-5 text-destructive" />
              ) : (
                <Sparkles className="h-5 w-5 text-primary" />
              )}
            </div>
            <CardTitle className="text-lg font-semibold">Create Using AI</CardTitle>
            <CardDescription className="text-sm mt-1.5">
              {aiLocked
                ? `${usage.workflowsUsed} of ${usage.workflowLimit} workflows used on ${usage.planName}. Upgrade to generate another workflow with AI.`
                : 'Describe your workflow in natural language and let AI generate the workflow structure for you.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              className="w-full gradient-primary text-primary-foreground"
              disabled={loading}
              onClick={() => go(aiLocked ? '/subscriptions' : '/workflow/ai')}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Checking Plan
                </>
              ) : aiLocked ? (
                <>
                  <CreditCard className="mr-2 h-4 w-4" />
                  Upgrade Plan
                </>
              ) : (
                <>
                  Generate with AI
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        <Card className="transition-shadow border hover:shadow-md">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-3">
              <Hammer className="h-5 w-5 text-primary" />
            </div>
            <CardTitle className="text-lg font-semibold">Create Workflow Manually</CardTitle>
            <CardDescription className="text-sm mt-1.5">
              Build your workflow step by step using the visual workflow builder.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              className="w-full gradient-primary text-primary-foreground"
              onClick={() => go('/workflow/new')}
            >
              Start Building
            </Button>
          </CardContent>
        </Card>
      </div>
    </>
  );
}

