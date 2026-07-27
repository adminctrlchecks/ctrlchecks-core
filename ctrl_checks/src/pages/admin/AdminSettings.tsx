import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AdminChromeHeader } from '@/components/layout/AdminChromeHeader';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from '@/hooks/use-toast';
import {
  getAdminSubscriptionPlans,
  getUnlimitedMode,
  setUnlimitedMode,
  updateSubscriptionPlan,
  type AdminSubscriptionPlan,
} from '@/lib/api/admin';
import { AlertTriangle, Crown, Infinity as InfinityIcon, Loader2, Shield, Zap } from 'lucide-react';

const PLAN_ICON: Record<string, React.ReactNode> = {
  Free: <Shield className="h-3.5 w-3.5" />,
  Pro: <Zap className="h-3.5 w-3.5" />,
  Enterprise: <Crown className="h-3.5 w-3.5" />,
};

/** Per-row draft state so edits are only committed when the admin saves. */
interface PlanDraft {
  priceRupees: string;
  workflowLimit: string;
  features: string;
}

function toDraft(plan: AdminSubscriptionPlan): PlanDraft {
  return {
    priceRupees: String(plan.priceRupees),
    workflowLimit: String(plan.workflowLimit),
    features: plan.features.join('\n'),
  };
}

export default function AdminSettings() {
  const queryClient = useQueryClient();
  const [drafts, setDrafts] = useState<Record<string, PlanDraft>>({});
  const [confirmEnableOpen, setConfirmEnableOpen] = useState(false);

  const unlimitedQuery = useQuery({
    queryKey: ['admin', 'unlimited-mode'],
    queryFn: getUnlimitedMode,
  });

  const plansQuery = useQuery({
    queryKey: ['admin', 'subscription-plans'],
    queryFn: getAdminSubscriptionPlans,
  });

  // Seed drafts whenever plans are (re)loaded so inputs reflect committed state.
  useEffect(() => {
    if (!plansQuery.data) return;
    setDrafts(
      Object.fromEntries(plansQuery.data.plans.map((plan) => [plan.id, toDraft(plan)]))
    );
  }, [plansQuery.data]);

  const unlimitedMutation = useMutation({
    mutationFn: setUnlimitedMode,
    onSuccess: (setting) => {
      queryClient.setQueryData(['admin', 'unlimited-mode'], setting);
      queryClient.invalidateQueries({ queryKey: ['admin', 'subscription-plans'] });
      queryClient.invalidateQueries({ queryKey: ['subscription'] });
      toast({
        title: setting.enabled ? 'Unlimited access is ON' : 'Unlimited access is OFF',
        description: setting.enabled
          ? 'Every user now has unlimited workflows and no plan limits.'
          : 'Subscription plans and limits are being enforced again.',
      });
    },
    onError: (error: Error) => {
      toast({ title: 'Could not update unlimited mode', description: error.message, variant: 'destructive' });
    },
  });

  const planMutation = useMutation({
    mutationFn: ({ planId, updates }: { planId: string; updates: Parameters<typeof updateSubscriptionPlan>[1] }) =>
      updateSubscriptionPlan(planId, updates),
    onSuccess: (plan) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'subscription-plans'] });
      toast({ title: 'Plan updated', description: `${plan.name} plan saved.` });
    },
    onError: (error: Error) => {
      toast({ title: 'Could not update plan', description: error.message, variant: 'destructive' });
    },
  });

  const unlimitedEnabled = Boolean(unlimitedQuery.data?.enabled);
  const togglePending = unlimitedMutation.isPending;

  const handleToggle = (next: boolean) => {
    if (next) {
      setConfirmEnableOpen(true);
      return;
    }
    unlimitedMutation.mutate(false);
  };

  const handleSavePlan = (plan: AdminSubscriptionPlan) => {
    const draft = drafts[plan.id];
    if (!draft) return;

    const priceRupees = Number(draft.priceRupees);
    const workflowLimit = Number(draft.workflowLimit);

    if (!Number.isFinite(priceRupees) || priceRupees < 0) {
      toast({ title: 'Invalid price', description: 'Price must be zero or more.', variant: 'destructive' });
      return;
    }
    if (!Number.isInteger(workflowLimit) || workflowLimit < 0) {
      toast({
        title: 'Invalid workflow limit',
        description: 'Workflow limit must be a whole number, zero or more.',
        variant: 'destructive',
      });
      return;
    }

    planMutation.mutate({
      planId: plan.id,
      updates: {
        priceRupees,
        workflowLimit,
        features: draft.features
          .split('\n')
          .map((line) => line.trim())
          .filter(Boolean),
      },
    });
  };

  const updateDraft = (planId: string, patch: Partial<PlanDraft>) => {
    setDrafts((prev) => ({ ...prev, [planId]: { ...prev[planId], ...patch } }));
  };

  return (
    <div className="min-h-screen bg-background">
      <AdminChromeHeader />
      <main className="container mx-auto max-w-5xl space-y-6 p-6">
        <div>
          <h1 className="text-2xl font-bold">System settings</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Control subscription enforcement and plan pricing for the whole platform.
          </p>
        </div>

        {/* ── Unlimited access toggle ── */}
        <Card className={unlimitedEnabled ? 'border-amber-500/50' : undefined}>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between gap-3 text-base">
              <span className="flex items-center gap-2">
                <InfinityIcon className="h-4 w-4 text-primary" />
                Unlimited access mode
              </span>
              {unlimitedQuery.isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              ) : (
                <Switch
                  checked={unlimitedEnabled}
                  disabled={togglePending || unlimitedQuery.isLoading}
                  onCheckedChange={handleToggle}
                />
              )}
            </CardTitle>
            <CardDescription className="text-xs">
              When ON, every user gets unlimited workflows and all plan limits, paywalls, and tier
              rate limits are bypassed. Use it for demos or temporary free access, then switch it
              back OFF to resume normal billing.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {unlimitedQuery.isError && (
              <p className="text-sm text-destructive">
                Could not load the current setting. Refresh the page to try again.
              </p>
            )}

            {unlimitedEnabled && (
              <div className="flex items-start gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-400">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <p>
                  Unlimited access is live for <strong>every user</strong> right now. Subscription
                  plans are not being enforced and no one will be asked to upgrade.
                </p>
              </div>
            )}

            {unlimitedQuery.data?.updatedAt && (
              <p className="text-xs text-muted-foreground">
                Last changed {new Date(unlimitedQuery.data.updatedAt).toLocaleString()}
              </p>
            )}
          </CardContent>
        </Card>

        {/* ── Plan editor ── */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Subscription plans</CardTitle>
            <CardDescription className="text-xs">
              Edit what each plan costs and includes. Plan names are fixed. Deactivating a plan hides
              it from the pricing page without affecting anyone already on it.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {plansQuery.data?.developmentPricing && (
              <div className="flex items-start gap-2 rounded-md border border-border bg-muted/50 p-3 text-xs text-muted-foreground">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <p>
                  <strong>Test pricing is on</strong> (<code>DEVELOPMENT_PRICING</code>). Paid plans
                  are charged at ₹1 regardless of the prices set here. Turn that environment flag off
                  to charge real prices.
                </p>
              </div>
            )}

            {plansQuery.isLoading ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : plansQuery.isError ? (
              <p className="text-sm text-destructive">Failed to load plans.</p>
            ) : (
              plansQuery.data?.plans.map((plan) => {
                const draft = drafts[plan.id];
                if (!draft) return null;
                const isFree = plan.name === 'Free';
                const saving = planMutation.isPending && planMutation.variables?.planId === plan.id;

                return (
                  <div key={plan.id} className="rounded-lg border p-4">
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          <span className="mr-1">{PLAN_ICON[plan.name]}</span>
                          {plan.name}
                        </Badge>
                        {!plan.isActive && (
                          <Badge variant="outline" className="border-muted text-xs text-muted-foreground">
                            Hidden
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Label htmlFor={`active-${plan.id}`} className="text-xs text-muted-foreground">
                          Offered
                        </Label>
                        <Switch
                          id={`active-${plan.id}`}
                          checked={plan.isActive}
                          disabled={isFree || planMutation.isPending}
                          onCheckedChange={(checked) =>
                            planMutation.mutate({ planId: plan.id, updates: { isActive: checked } })
                          }
                        />
                      </div>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="space-y-1.5">
                        <Label htmlFor={`price-${plan.id}`} className="text-xs">
                          Price (₹)
                        </Label>
                        <Input
                          id={`price-${plan.id}`}
                          type="number"
                          min={0}
                          step="1"
                          value={draft.priceRupees}
                          onChange={(e) => updateDraft(plan.id, { priceRupees: e.target.value })}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor={`limit-${plan.id}`} className="text-xs">
                          Workflow allowance
                        </Label>
                        <Input
                          id={`limit-${plan.id}`}
                          type="number"
                          min={0}
                          step="1"
                          value={draft.workflowLimit}
                          onChange={(e) => updateDraft(plan.id, { workflowLimit: e.target.value })}
                        />
                      </div>
                    </div>

                    <div className="mt-3 space-y-1.5">
                      <Label htmlFor={`features-${plan.id}`} className="text-xs">
                        Features (one per line)
                      </Label>
                      <Textarea
                        id={`features-${plan.id}`}
                        rows={4}
                        value={draft.features}
                        onChange={(e) => updateDraft(plan.id, { features: e.target.value })}
                      />
                    </div>

                    <p className="mt-3 text-xs text-muted-foreground">
                      {isFree
                        ? 'The Free allowance is the baseline for every account — changing it immediately changes what all existing users can create.'
                        : 'Workflow allowance is granted as credits at purchase time, so changes here apply to future purchases only. Existing subscribers keep the allowance they already bought.'}
                    </p>

                    <div className="mt-3 flex justify-end">
                      <Button size="sm" disabled={saving} onClick={() => handleSavePlan(plan)}>
                        {saving && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
                        Save {plan.name}
                      </Button>
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </main>

      <AlertDialog open={confirmEnableOpen} onOpenChange={setConfirmEnableOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Turn on unlimited access for everyone?</AlertDialogTitle>
            <AlertDialogDescription>
              This immediately removes workflow limits, paywalls, and plan-based rate limits for
              every user on the platform — not just demo accounts. Existing subscriptions and
              payments are left untouched, and switching this back off restores normal enforcement.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => unlimitedMutation.mutate(true)}>
              Turn on unlimited access
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
