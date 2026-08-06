import { motion, useReducedMotion } from "framer-motion";
import {
  cardHoverTap,
  landingViewport,
  springSoft,
} from "@/components/landing/landing-motion";
import { SECTION_SHELL } from "@/components/landing/landing-layout";

/** Slide 9 — platform capabilities for builders (embedding lives in Plugins & APIs). */
const blocks = [
  { title: "Automation engine", item: "Reliable cloud infrastructure for workflows that keep running after setup" },
  { title: "Builder toolkit", item: "Controls for teams that want to inspect, edit, and extend workflow logic" },
  { title: "Ready-made connectors", item: "Pre-built connections for the tools your business already depends on" },
  { title: "Agent blueprints", item: "AI agent templates for support, operations, data cleanup, and approvals" },
];

const developerPath = [
  "Use it as a simple automation app, or connect it deeper through APIs and internal systems.",
  "Keep workflow steps visible so operators, admins, and engineers can understand what changed.",
  "Launch practical AI workflows for support, sales, finance, operations, and product teams.",
];

export function OpenCoreSection() {
  const reduceMotion = useReducedMotion();

  return (
    <section id="developer-platform" className="scroll-mt-24 py-8 sm:py-10" aria-labelledby="developer-platform-heading">
      <div className={SECTION_SHELL}>
        {/* Heading + narrative on the left, capability blocks on the right. A
            centred heading over a short bullet list left a tall empty gap under
            the text while the cards ran on beside it. */}
        <div className="grid items-center gap-6 lg:grid-cols-2 lg:gap-10">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={landingViewport}
            transition={reduceMotion ? { duration: 0.45 } : springSoft}
            className="text-center lg:text-left"
          >
            <h2
              id="developer-platform-heading"
              className="text-2xl font-bold tracking-tight sm:text-3xl lg:text-4xl"
            >
              Simple for teams.{" "}
              <span className="text-gradient">Powerful for builders.</span>
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
              CtrlChecks starts with plain English, then gives technical teams the structure, controls, and connectors needed to run real business workflows.
            </p>

            <ul className="mt-5 space-y-3 text-left text-sm leading-relaxed text-muted-foreground sm:text-base">
              {developerPath.map((line, i) => (
                <motion.li
                  key={line}
                  initial={{ opacity: 0, x: -10 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={landingViewport}
                  transition={
                    reduceMotion ? { duration: 0.3, delay: i * 0.05 } : { ...springSoft, delay: i * 0.07 }
                  }
                  className="flex gap-3"
                >
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" aria-hidden />
                  <span>{line}</span>
                </motion.li>
              ))}
            </ul>
          </motion.div>

          <div className="grid gap-3 sm:grid-cols-2">
            {blocks.map((b, index) => (
              <motion.div
                key={b.title}
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={landingViewport}
                transition={
                  reduceMotion
                    ? { duration: 0.35, delay: index * 0.05 }
                    : { ...springSoft, delay: index * 0.08 }
                }
                {...(reduceMotion ? {} : cardHoverTap)}
                className="h-full rounded-lg border border-border/50 bg-background/20 p-5 shadow-[0_14px_34px_-30px_hsl(var(--foreground)/0.45)] backdrop-blur-md transition-colors hover:border-primary/30 dark:border-white/10 dark:bg-white/5"
              >
                <h3 className="text-lg font-semibold">{b.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{b.item}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
