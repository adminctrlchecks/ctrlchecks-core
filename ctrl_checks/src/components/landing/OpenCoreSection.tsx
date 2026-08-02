import { motion, useReducedMotion } from "framer-motion";
import {
  cardHoverTap,
  landingViewport,
  springSoft,
} from "@/components/landing/landing-motion";
import { SECTION_SHELL } from "@/components/landing/landing-layout";

/** Slide 9 — platform capabilities for builders (embedding lives in Plugins & APIs). */
const blocks = [
  { title: "Automation engine", item: "Reliable cloud infrastructure that runs your workflows at any scale" },
  { title: "Builder toolkit", item: "Everything you need to create, extend, and customize the platform" },
  { title: "Ready-made connectors", item: "Pre-built connections for the tools and systems your team already uses" },
  { title: "Agent blueprints", item: "Pre-built AI agent templates to launch powerful automations in minutes" },
];

const developerPath = [
  "Run fully in the cloud or on your own servers. Your data stays under your control.",
  "Connect your existing tools and expand what the platform can do — without starting from scratch.",
  "Launch custom AI workflows and internal automations in days, not months.",
];

export function OpenCoreSection() {
  const reduceMotion = useReducedMotion();

  return (
    <section id="developer-platform" className="py-12 sm:py-16" aria-labelledby="developer-platform-heading">
      <div className={SECTION_SHELL}>
        {/* Heading + narrative on the left, capability blocks on the right. A
            centred heading over a short bullet list left a tall empty gap under
            the text while the cards ran on beside it. */}
        <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={landingViewport}
            transition={reduceMotion ? { duration: 0.45 } : springSoft}
            className="text-center lg:text-left"
          >
            <h2
              id="developer-platform-heading"
              className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl"
            >
              What you can{" "}
              <span className="text-gradient">build with CtrlChecks</span>
            </h2>
            <p className="mt-4 text-muted-foreground">
              The automation engine, ready-made connectors, and AI agent blueprints that let any
              team build powerful workflows on CtrlChecks cloud — and ship them fast.
            </p>

            <ul className="mt-8 space-y-4 text-left text-sm leading-relaxed text-muted-foreground sm:text-base">
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

          <div className="grid gap-4 sm:grid-cols-2">
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
                className="h-full rounded-2xl border border-border/50 bg-background/10 p-6 shadow-none backdrop-blur-md transition-colors hover:border-primary/30 dark:border-white/10 dark:bg-white/5"
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
