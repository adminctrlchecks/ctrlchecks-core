import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Check, Crown, Shield, Sparkles, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
import { SECTION_PROSE, SECTION_SHELL } from "@/components/landing/landing-layout";

const plans = [
  {
    id: "free",
    name: "Free",
    icon: Shield,
    price: "Rs. 0",
    period: "forever",
    description: "Try CtrlChecks and validate a real workflow.",
    features: ["2 workflows", "Basic integrations", "Community support"],
    cta: "Get Started Free",
    popular: false,
    color: "border-border/50",
  },
  {
    id: "pro",
    name: "Pro",
    icon: Zap,
    price: "Rs. 1",
    period: "/month",
    description: "For creators and teams scaling automation.",
    features: ["20 workflows", "Advanced integrations", "Priority support", "Faster workflow runs"],
    cta: "Upgrade to Pro",
    popular: true,
    color: "border-primary/45 shadow-[0_20px_48px_-28px_hsl(var(--primary)/0.55)]",
  },
  {
    id: "enterprise",
    name: "Enterprise",
    icon: Crown,
    price: "Rs. 1",
    period: "/month",
    description: "For governance, onboarding, and higher usage.",
    features: ["999 workflows", "SSO and enterprise controls", "Dedicated support", "Custom onboarding"],
    cta: "Go Enterprise",
    popular: false,
    color: "border-amber-500/45",
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
    <section id="pricing" className="scroll-mt-24 py-8 sm:py-10" aria-labelledby="pricing-heading">
      <div className={SECTION_SHELL}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className={SECTION_PROSE}
        >
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/5 px-3 py-1 text-xs font-medium text-primary">
            <Sparkles className="h-3.5 w-3.5" />
            Starter to enterprise plans
          </div>
          <h2 id="pricing-heading" className="mt-4 text-2xl font-bold tracking-tight sm:text-3xl lg:text-4xl">
            Pick your <span className="text-gradient">automation growth plan</span>
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
            Start free, then upgrade when your team needs more workflows, integrations, and controls.
          </p>
          <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
            <Sparkles className="h-3 w-3" />
            Special launch pricing: Rs. 1/month for paid plans
          </div>
        </motion.div>

        <div className="mt-8 grid gap-3 lg:grid-cols-3">
          {plans.map((plan, index) => {
            const Icon = plan.icon;
            return (
              <motion.div
                key={plan.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.08 }}
                className={cn(
                  "relative flex flex-col rounded-lg border bg-background/20 p-5 shadow-[0_14px_34px_-30px_hsl(var(--foreground)/0.45)] backdrop-blur-md dark:bg-white/5",
                  plan.color
                )}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="inline-flex items-center gap-1 rounded-full gradient-primary px-3 py-1 text-xs font-medium text-primary-foreground">
                      <Sparkles className="h-3.5 w-3.5" />
                      Most Popular
                    </span>
                  </div>
                )}

                <div className="text-center">
                  <div
                    className={cn(
                      "mb-3 inline-flex h-9 w-9 items-center justify-center rounded-lg",
                      plan.name === "Enterprise"
                        ? "bg-amber-100 text-amber-600 dark:bg-amber-900/30"
                        : plan.name === "Pro"
                          ? "bg-primary/10 text-primary"
                          : "bg-muted text-muted-foreground"
                    )}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="text-xl font-semibold">{plan.name}</h3>
                  <div className="mt-3 flex items-baseline justify-center gap-1">
                    <span className="text-3xl font-bold">{plan.price}</span>
                    <span className="text-sm text-muted-foreground">{plan.period}</span>
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{plan.description}</p>
                </div>

                <ul className="mt-6 flex-1 space-y-3">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-3">
                      <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10">
                        <Check className="h-3 w-3 text-primary" />
                      </div>
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>

                <div className="mt-6">
                  <Button
                    className={cn("w-full", plan.popular ? "gradient-primary text-primary-foreground hover:opacity-90" : "")}
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

        <p className="mt-5 text-center text-xs text-muted-foreground">
          Secure payments via Razorpay. Cancel anytime. No hidden fees.
        </p>
      </div>
    </section>
  );
}
