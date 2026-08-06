import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { getBackendUrl } from "@/lib/api/getBackendUrl";
import { awsClient } from "@/integrations/aws/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { AppChromeHeader } from "@/components/layout/AppChromeHeader";
import { Progress } from "@/components/ui/progress";
import {
  Check, Zap, Crown, Loader2, AlertCircle,
  CreditCard, Shield, RefreshCw, User,
} from "lucide-react";

interface Plan {
  id: string;
  name: "Free" | "Pro" | "Enterprise";
  workflowLimit: number;
  price: number;
  features: string[];
  displayPrice: string;
  popular: boolean;
  developmentMode: boolean;
}

interface CurrentSubscription {
  planName: string;
  status: string;
  workflowLimit: number;
  workflowsUsed: number;
}

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void };
  }
}

const PLAN_META = {
  Free: {
    icon: Shield,
    gradient: "from-slate-500 to-slate-600",
    badge: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
    border: "border-border",
    ring: "",
  },
  Pro: {
    icon: Zap,
    gradient: "from-indigo-500 to-violet-600",
    badge: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300",
    border: "border-primary",
    ring: "ring-2 ring-primary/20",
  },
  Enterprise: {
    icon: Crown,
    gradient: "from-amber-500 to-orange-500",
    badge: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
    border: "border-amber-500",
    ring: "ring-2 ring-amber-500/20",
  },
};

export default function Subscriptions() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [plans, setPlans] = useState<Plan[]>([]);
  const [currentSub, setCurrentSub] = useState<CurrentSubscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [userName, setUserName] = useState<string>("");
  /** Admin-controlled: when on, plans are not enforced and nothing is for sale. */
  const [unlimitedMode, setUnlimitedMode] = useState(false);

  // Load Razorpay script once
  useEffect(() => {
    if (document.querySelector('script[src="https://checkout.razorpay.com/v1/checkout.js"]')) {
      return;
    }

    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.async = true;
    document.body.appendChild(s);
  }, []);

  useEffect(() => {
    loadPlans();
    if (user) {
      loadCurrentSub();
      // Derive display name from email
      const name = user.user_metadata?.full_name ||
                   user.email?.split("@")[0] || "User";
      setUserName(name);
    }
  }, [user]);

  const loadPlans = async () => {
    try {
      const res = await fetch(`${getBackendUrl()}/api/subscriptions/plans`);
      if (!res.ok) throw new Error("Failed to load plans");
      const data = await res.json();
      setPlans(data.plans || []);
      setUnlimitedMode(Boolean(data.unlimitedModeEnabled));
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const loadCurrentSub = async () => {
    try {
      const token = (await awsClient.auth.getSession()).data.session?.access_token;
      if (!token) return;
      const res = await fetch(`${getBackendUrl()}/api/subscriptions/current`, {
        cache: "no-store",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const data = await res.json();
      setCurrentSub(data.subscription);
    } catch { /* silent */ }
  };

  const handleUpgrade = async (plan: Plan) => {
    if (!user) { navigate("/signin"); return; }
    if (plan.name === "Free") return;

    setProcessing(plan.name);
    try {
      if (!window.Razorpay) {
        throw new Error("Payment checkout is still loading. Please try again in a moment.");
      }

      const token = (await awsClient.auth.getSession()).data.session?.access_token;
      if (!token) throw new Error("Not authenticated");

      const orderRes = await fetch(`${getBackendUrl()}/api/payments/razorpay/create-order`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ planName: plan.name }),
      });

      if (!orderRes.ok) {
        const e = await orderRes.json();
        throw new Error(e.message || "Failed to create order");
      }

      const orderData = await orderRes.json();

      const rzpOptions = {
        key: orderData.razorpayKeyId,
        amount: orderData.order.amount,
        currency: orderData.order.currency,
        name: "CtrlChecks",
        description: `${plan.name} Plan - adds ${plan.workflowLimit} workflows`,
        order_id: orderData.order.id,
        prefill: {
          name: userName,
          email: user.email,
        },
        notes: { planName: plan.name, userId: user.id },
        theme: { color: "#6366f1" },
        handler: async (response: any) => {
          try {
            const verifyRes = await fetch(`${getBackendUrl()}/api/payments/razorpay/verify`, {
              method: "POST",
              headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
              body: JSON.stringify({
                orderId: response.razorpay_order_id,
                paymentId: response.razorpay_payment_id,
                signature: response.razorpay_signature,
              }),
            });

            if (!verifyRes.ok) {
              const e = await verifyRes.json();
              throw new Error(e.message || "Verification failed");
            }

            toast({
              title: "Workflow quota added",
              description: `${plan.name} added ${plan.workflowLimit} workflows to your account.`,
            });
            await loadCurrentSub();
          } catch (e: any) {
            toast({ title: "Verification Failed", description: e.message, variant: "destructive" });
          } finally {
            setProcessing(null);
          }
        },
        modal: { ondismiss: () => setProcessing(null) },
      };

      const checkout = new window.Razorpay({
        ...rzpOptions,
        payment_failed: (response: any) => {
          const message = response?.error?.description || "Payment failed before verification.";
          toast({ title: "Payment Failed", description: message, variant: "destructive" });
          setProcessing(null);
        },
      });

      checkout.open();
    } catch (e: any) {
      toast({ title: "Payment Error", description: e.message, variant: "destructive" });
      setProcessing(null);
    }
  };

  const isCurrent = (name: string) =>
    currentSub?.planName === name || (!currentSub && name === "Free");

  const usedPct = currentSub
    ? Math.min(100, Math.round((currentSub.workflowsUsed / currentSub.workflowLimit) * 100))
    : 0;

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <AppChromeHeader />
        <div className="flex items-center justify-center h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <AppChromeHeader />

      <main className="container mx-auto px-4 py-10 max-w-5xl">

        {/* Page header */}
        <div className="text-center mb-10">
          <h1 className="mb-2 text-3xl font-bold tracking-tight">
            {unlimitedMode ? "Unlimited access" : "Subscription Plans"}
          </h1>
          <p className="text-muted-foreground">
            {unlimitedMode
              ? "Every user can build freely while plan enforcement is switched off."
              : "Choose the plan that fits your workflow needs"}
          </p>

          {/* User identity pill */}
          {user && (
            <div className="mt-4 inline-flex items-center gap-2 rounded-full border bg-card px-4 py-1.5 text-sm shadow-sm">
              <User className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="font-medium">{userName}</span>
              <span className="text-muted-foreground">·</span>
              <span className="text-muted-foreground text-xs">{user.email}</span>
            </div>
          )}

          {/* Current plan + usage — meaningless while unlimited access is on */}
          {currentSub && !unlimitedMode && (
            <div className="mt-4 inline-flex flex-col items-center gap-2">
              <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary">
                <Check className="h-3.5 w-3.5" />
                Active plan: <strong>{currentSub.planName}</strong>
                &nbsp;·&nbsp;
                {currentSub.workflowsUsed}/{currentSub.workflowLimit} workflows used
              </div>
              <div className="w-48">
                <Progress
                  value={usedPct}
                  className={`h-1.5 ${usedPct >= 90 ? "[&>div]:bg-red-500" : usedPct >= 70 ? "[&>div]:bg-amber-500" : "[&>div]:bg-primary"}`}
                />
              </div>
            </div>
          )}

          {/* Dev mode badge */}
          {plans[0]?.developmentMode && !unlimitedMode && (
            <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-amber-100 dark:bg-amber-900/30 px-3 py-1 text-xs font-medium text-amber-700 dark:text-amber-400">
              <AlertCircle className="h-3 w-3" />
              Test mode — ₹1 pricing active
            </div>
          )}
        </div>

        {error && (
          <div className="mb-6 flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
            <Button variant="ghost" size="sm" onClick={loadPlans} className="ml-auto h-7">
              <RefreshCw className="h-3.5 w-3.5 mr-1" /> Retry
            </Button>
          </div>
        )}

        {/* Unlimited access replaces the pricing grid entirely */}
        {unlimitedMode ? (
          <div className="rounded-2xl border border-primary/30 bg-primary/5 p-8 text-center shadow-[0_18px_48px_-34px_hsl(var(--primary)/0.5)]">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <Check className="h-6 w-6 text-primary" />
            </div>
            <h2 className="text-xl font-semibold">Unlimited access is active</h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
              Every feature is currently open to all accounts — you can build and run as many
              workflows as you like. There is nothing to buy and no plan to choose right now.
            </p>
            <Button className="mt-6" onClick={() => navigate("/dashboard")}>
              Back to dashboard
            </Button>
          </div>
        ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((plan) => {
            const meta = PLAN_META[plan.name];
            const Icon = meta.icon;
            const active = isCurrent(plan.name);
            const busy = processing === plan.name;

            return (
              <div
                key={plan.id}
                className={`relative flex flex-col rounded-2xl border bg-card p-6 transition-all duration-200 ${meta.border} ${meta.ring}`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
                    <Badge className="bg-primary text-primary-foreground px-3 text-xs font-semibold shadow">
                      Most Popular
                    </Badge>
                  </div>
                )}

                {/* Plan icon + name */}
                <div className="flex items-center justify-between mb-4">
                  <div className={`flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br ${meta.gradient} text-white shadow-sm`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  {active && (
                    <Badge variant="outline" className="text-xs border-green-500 text-green-600">
                      Current
                    </Badge>
                  )}
                </div>

                <h3 className="text-xl font-bold">{plan.name}</h3>

                {/* Price */}
                <div className="mt-2 mb-1">
                  <span className="text-4xl font-extrabold">{plan.displayPrice}</span>
                  {plan.price > 0 && (
                    <span className="text-sm text-muted-foreground ml-1">/month</span>
                  )}
                </div>

                {plan.developmentMode && plan.price > 0 && (
                  <p className="text-xs text-amber-600 dark:text-amber-400 mb-2">
                    ₹1 test price — live pricing applies in production
                  </p>
                )}

                <p className="text-sm text-muted-foreground mb-4">
                  {plan.name === "Free" ? (
                    <>
                      <span className="font-semibold text-foreground">{plan.workflowLimit}</span> workflows included
                    </>
                  ) : (
                    <>
                      Adds <span className="font-semibold text-foreground">{plan.workflowLimit}</span> workflows
                    </>
                  )}
                </p>

                {/* Features */}
                <ul className="space-y-2 flex-1 mb-6">
                  {plan.features.map((f, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm">
                      <Check className="h-3.5 w-3.5 text-green-500 shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                {plan.name === "Free" ? (
                  <Button variant="outline" disabled className="w-full">
                    {active ? (
                      <><Check className="mr-2 h-4 w-4" /> Current Plan</>
                    ) : (
                      <>Free Plan</>
                    )}
                  </Button>
                ) : (
                  <Button
                    className="w-full"
                    onClick={() => handleUpgrade(plan)}
                    disabled={busy || !!processing}
                  >
                    {busy ? (
                      <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing...</>
                    ) : (
                      <><CreditCard className="mr-2 h-4 w-4" /> {active ? `Add ${plan.workflowLimit} workflows` : `Add ${plan.workflowLimit} workflows`}</>
                    )}
                  </Button>
                )}
              </div>
            );
          })}
        </div>
        )}

        {!unlimitedMode && (
          <p className="text-center text-xs text-muted-foreground mt-8">
            Secure payments via Razorpay · Cancel anytime · No hidden fees
          </p>
        )}
      </main>
    </div>
  );
}
