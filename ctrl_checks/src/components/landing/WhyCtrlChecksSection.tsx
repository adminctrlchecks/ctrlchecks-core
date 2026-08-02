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

/** Slides 11–13 merged. */
const wins = [
  "Workflows that build themselves from a single prompt",
  "Automation that detects and recovers from errors on its own",
  "A flexible, extensible platform that grows with your needs",
  "Works with any AI model — not locked to one provider",
  "Enterprise-grade security and reliability, built in from day one",
];

export function WhyCtrlChecksSection() {
  const reduceMotion = useReducedMotion();

  return (
    <section id="why-ctrlchecks" className="py-12 sm:py-16" aria-labelledby="why-heading">
      <div className={SECTION_SHELL}>
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={landingViewport}
          transition={reduceMotion ? { duration: 0.45 } : springSoft}
          className={SECTION_PROSE}
        >
          <h2
            id="why-heading"
            className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl"
          >
            Why teams choose{" "}
            <span className="text-gradient">CtrlChecks</span>
          </h2>
          <p className="mt-4 text-lg font-semibold text-foreground">{LANDING_MARKET_BRIDGE}</p>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
            Versus Zapier, Make, and n8n: {LANDING_COMPARISON_SUMMARY}
          </p>
        </motion.div>

        {/* One row: the two categories CtrlChecks sits between, with the
            positioning card centred between them rather than stacked below. */}
        <div className="mt-12 grid items-stretch gap-6 lg:grid-cols-3">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={landingViewport}
            transition={reduceMotion ? { duration: 0.4 } : springSoft}
            {...(reduceMotion ? {} : cardHoverTap)}
            className="flex flex-col justify-center rounded-2xl border border-border/50 bg-background/10 p-8 text-center shadow-none backdrop-blur-md transition-colors hover:border-primary/30 dark:border-white/10 dark:bg-white/5"
          >
            <h3 className="text-lg font-semibold">Automation platforms</h3>
            <p className="mt-3 text-sm font-medium text-muted-foreground">Zapier · Make · n8n</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 22, scale: 0.98 }}
            whileInView={{ opacity: 1, y: 0, scale: 1 }}
            viewport={landingViewport}
            transition={reduceMotion ? { duration: 0.45, delay: 0.08 } : { ...springBouncy, delay: 0.12 }}
            whileHover={reduceMotion ? undefined : { scale: 1.01, transition: springSoft }}
            className="flex flex-col justify-center rounded-2xl border-2 border-primary/35 bg-primary/5 p-6 text-center shadow-lg shadow-primary/10 sm:p-8"
          >
            <p className="text-sm font-semibold uppercase tracking-wide text-primary">CtrlChecks</p>
            <p className="mt-2 text-lg font-bold sm:text-xl">
              The AI platform that connects traditional automation with next-generation intelligence.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={landingViewport}
            transition={reduceMotion ? { duration: 0.4, delay: 0.06 } : { ...springSoft, delay: 0.1 }}
            {...(reduceMotion ? {} : cardHoverTap)}
            className="flex flex-col justify-center rounded-2xl border border-border/50 bg-background/10 p-8 text-center shadow-none backdrop-blur-md transition-colors hover:border-primary/30 dark:border-white/10 dark:bg-white/5"
          >
            <h3 className="text-lg font-semibold">AI agent frameworks</h3>
            <p className="mt-3 text-sm font-medium text-muted-foreground">LangGraph · AutoGen · CrewAI</p>
          </motion.div>
        </div>

        <p className="mx-auto mt-16 max-w-2xl text-center text-lg font-semibold text-foreground">
          What makes CtrlChecks different
        </p>
        {/* Flex-wrap, not a grid: there are 5 items, so a 3-column grid leaves a
            ragged half-empty last row. Wrapping centres the remainder instead. */}
        <ul className="mt-8 flex flex-wrap justify-center gap-3">
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
              className="flex w-full items-center gap-3 rounded-2xl border border-border/50 bg-background/10 px-5 py-4 shadow-none backdrop-blur-md transition-colors hover:border-primary/30 dark:border-white/10 dark:bg-white/5 sm:w-[calc(50%-0.375rem)] lg:w-[calc(33.333%-0.5rem)]"
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
