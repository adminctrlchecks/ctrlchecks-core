import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Check, Sparkles, Zap, Shield, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
import { SECTION_SHELL } from "@/components/landing/landing-layout";

const plans = [
  {
    id: "free",
    name: "Free",
    icon: Shield,
    price: "₹0",
    period: "forever",
    description: "Try the product and validate your flow.",
    features: [
      "2 workflows",
      "Community support",
      "Basic integrations",
    ],
    cta: "Get Started Free",
    popular: false,
    color: "border-border",
  },
  {
    id: "pro",
    name: "Pro",
    icon: Zap,
    price: "₹1",
    period: "/month",
    description: "For creators and teams scaling automation.",
    features: [
      "20 workflows",
      "Priority support",
      "Advanced integrations",
      "Faster workflow runs",
    ],
    cta: "Upgrade to Pro",
    popular: true,
    color: "border-primary shadow-xl shadow-primary/10",
  },
  {
    id: "enterprise",
    name: "Enterprise",
    icon: Crown,
    price: "₹1",
    period: "/month",
    description: "Enterprise-level usage and governance.",
    features: [
      "999 workflows",
      "Dedicated support",
      "SSO and enterprise controls",
      "Custom onboarding",
    ],
    cta: "Go Enterprise",
    popular: false,
    color: "border-amber-500/50",
  },
] as const;

export function Pricing() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleCta = (planId: string) => {
    if (planId === "free") {
      navigate(user ? "/dashboard" : "/signup");
    } else {
      navigate(user ? "/subscriptions" : "/signup");
    }
  };

  return (
    <section id="pricing" className="py-12 sm:py-16" aria-labelledby="pricing-heading">
      <div className={SECTION_SHELL}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mx-auto max-w-2xl text-center"
        >
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/5 px-4 py-1 text-sm font-medium text-primary">
            <Sparkles className="h-4 w-4" />
            Starter to enterprise plans
          </div>
          <h2
            id="pricing-heading"
            className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl"
          >
            Pick your <span className="text-gradient">automation growth plan</span>
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Start free, then upgrade as your team needs more workflows.
          </p>
          <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-amber-100 dark:bg-amber-900/30 px-3 py-1 text-xs font-medium text-amber-700 dark:text-amber-400">
            <Sparkles className="h-3 w-3" />
            Special launch pricing — ₹1/month for all paid plans
          </div>
        </motion.div>

        <div className="mt-16 grid gap-8 lg:grid-cols-3">
          {plans.map((plan, index) => {
            const Icon = plan.icon;
            return (
              <motion.div
                key={plan.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className={cn(
                  "relative rounded-2xl border bg-card p-8 flex flex-col",
                  plan.color
                )}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <span className="inline-flex items-center gap-1 rounded-full gradient-primary px-4 py-1 text-sm font-medium text-primary-foreground">
                      <Sparkles className="h-4 w-4" />
                      Most Popular
                    </span>
                  </div>
                )}

                <div className="text-center">
                  <div className={cn(
                    "inline-flex items-center justify-center w-10 h-10 rounded-xl mb-3",
                    plan.name === "Enterprise" ? "bg-amber-100 dark:bg-amber-900/30 text-amber-600" :
                    plan.name === "Pro" ? "bg-primary/10 text-primary" :
                    "bg-muted text-muted-foreground"
                  )}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="text-xl font-semibold">{plan.name}</h3>
                  <div className="mt-3 flex items-baseline justify-center gap-1">
                    <span className="text-4xl font-bold">{plan.price}</span>
                    <span className="text-muted-foreground text-sm">{plan.period}</span>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">{plan.description}</p>
                </div>

                <ul className="mt-8 space-y-3 flex-1">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-3">
                      <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10">
                        <Check className="h-3 w-3 text-primary" />
                      </div>
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>

                <div className="mt-8">
                  <Button
                    className={cn(
                      "w-full",
                      plan.popular ? "gradient-primary text-primary-foreground hover:opacity-90" : ""
                    )}
                    variant={plan.popular ? "default" : "outline"}
                    onClick={() => handleCta(plan.id)}
                  >
                    {plan.cta}
                  </Button>
                </div>
              </motion.div>
            );
          })}
        </div>

        <p className="mt-8 text-center text-xs text-muted-foreground">
          Secure payments via Razorpay · Cancel anytime · No hidden fees
        </p>
      </div>
    </section>
  );
}
