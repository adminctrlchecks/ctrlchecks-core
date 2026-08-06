import { motion, useReducedMotion } from "framer-motion";
import { CheckCircle2 } from "lucide-react";
import {
  cardHoverTap,
  landingViewport,
  springBouncy,
  springSoft,
} from "@/components/landing/landing-motion";
import { LANDING_COMPARISON_SUMMARY, LANDING_MARKET_BRIDGE } from "@/components/landing/landing-content";
import { SECTION_PROSE, SECTION_SHELL } from "@/components/landing/landing-layout";

const wins = [
  "Workflows that build themselves from a single prompt",
  "Automation that detects and recovers from errors on its own",
  "A flexible, extensible platform that grows with your needs",
  "Works with any AI model, not locked to one provider",
  "Enterprise-grade security and reliability, built in from day one",
];

export function WhyCtrlChecksSection() {
  const reduceMotion = useReducedMotion();

  return (
    <section id="why-ctrlchecks" className="scroll-mt-24 py-8 sm:py-10" aria-labelledby="why-heading">
      <div className={SECTION_SHELL}>
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={landingViewport}
          transition={reduceMotion ? { duration: 0.45 } : springSoft}
          className={SECTION_PROSE}
        >
          <h2 id="why-heading" className="text-2xl font-bold tracking-tight sm:text-3xl lg:text-4xl">
            Why teams choose <span className="text-gradient">CtrlChecks</span>
          </h2>
          <p className="mt-3 text-base font-semibold text-foreground sm:text-lg">{LANDING_MARKET_BRIDGE}</p>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground sm:text-base">
            Compared with Zapier, Make, and n8n: {LANDING_COMPARISON_SUMMARY}
          </p>
        </motion.div>

        <div className="mt-8 grid items-stretch gap-3 lg:grid-cols-3">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={landingViewport}
            transition={reduceMotion ? { duration: 0.4 } : springSoft}
            {...(reduceMotion ? {} : cardHoverTap)}
            className="flex flex-col justify-center rounded-lg border border-border/50 bg-background/20 p-5 text-center shadow-[0_14px_34px_-30px_hsl(var(--foreground)/0.45)] backdrop-blur-md transition-colors hover:border-primary/30 dark:border-white/10 dark:bg-white/5"
          >
            <h3 className="text-lg font-semibold">Traditional automation</h3>
            <p className="mt-2 text-sm font-medium text-muted-foreground">Zapier, Make, n8n</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 22, scale: 0.98 }}
            whileInView={{ opacity: 1, y: 0, scale: 1 }}
            viewport={landingViewport}
            transition={reduceMotion ? { duration: 0.45, delay: 0.08 } : { ...springBouncy, delay: 0.12 }}
            whileHover={reduceMotion ? undefined : { scale: 1.01, transition: springSoft }}
            className="flex flex-col justify-center rounded-lg border-2 border-primary/35 bg-primary/10 p-5 text-center shadow-[0_18px_42px_-28px_hsl(var(--primary)/0.45)] sm:p-6"
          >
            <p className="text-sm font-semibold uppercase tracking-wide text-primary">CtrlChecks</p>
            <p className="mt-2 text-lg font-bold sm:text-xl">
              Plain-language setup with visible workflow logic and production-ready controls.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={landingViewport}
            transition={reduceMotion ? { duration: 0.4, delay: 0.06 } : { ...springSoft, delay: 0.1 }}
            {...(reduceMotion ? {} : cardHoverTap)}
            className="flex flex-col justify-center rounded-lg border border-border/50 bg-background/20 p-5 text-center shadow-[0_14px_34px_-30px_hsl(var(--foreground)/0.45)] backdrop-blur-md transition-colors hover:border-primary/30 dark:border-white/10 dark:bg-white/5"
          >
            <h3 className="text-lg font-semibold">AI agent frameworks</h3>
            <p className="mt-2 text-sm font-medium text-muted-foreground">LangGraph, AutoGen, CrewAI</p>
          </motion.div>
        </div>

        <p className="mx-auto mt-8 max-w-2xl text-center text-lg font-semibold text-foreground">
          What makes CtrlChecks different
        </p>
        <ul className="mt-4 flex flex-wrap justify-center gap-3">
          {wins.map((line, index) => (
            <motion.li
              key={line}
              initial={{ opacity: 0, x: -16 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={landingViewport}
              transition={
                reduceMotion ? { duration: 0.3, delay: index * 0.05 } : { ...springSoft, delay: index * 0.06 }
              }
              {...(reduceMotion ? {} : cardHoverTap)}
              className="flex w-full items-center gap-3 rounded-lg border border-border/50 bg-background/20 px-5 py-4 shadow-[0_14px_34px_-30px_hsl(var(--foreground)/0.45)] backdrop-blur-md transition-colors hover:border-primary/30 dark:border-white/10 dark:bg-white/5 sm:w-[calc(50%-0.375rem)] lg:w-[calc(33.333%-0.5rem)]"
            >
              <CheckCircle2 className="h-5 w-5 shrink-0 text-success" aria-hidden />
              <span className="font-medium">{line}</span>
            </motion.li>
          ))}
        </ul>
      </div>
    </section>
  );
}
