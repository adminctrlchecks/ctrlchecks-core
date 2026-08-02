import { motion, useReducedMotion } from "framer-motion";
import { FileText, Plug } from "lucide-react";
import {
  cardHoverTap,
  landingViewport,
  springSoft,
} from "@/components/landing/landing-motion";
import { SECTION_PROSE, SECTION_SHELL } from "@/components/landing/landing-layout";

/** Slide 10 — product embedding & document-backed workflows (distinct from the developer platform path). */
const tags = ["CRMs", "ERPs", "SaaS platforms", "Enterprise tools"];

const rows = [
  { title: "Scales with your business" },
  { title: "Simple integration APIs" },
  { title: "Plug-and-play connectors" },
  { title: "Enterprise-ready" },
];

export function PluginsApiSection() {
  const reduceMotion = useReducedMotion();

  return (
    <section
      id="plugins-api"
      className="py-12 sm:py-16"
      aria-labelledby="plugins-heading"
    >
      <div className={SECTION_SHELL}>
        <div className={SECTION_PROSE}>
          <motion.h2
            id="plugins-heading"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={landingViewport}
            transition={reduceMotion ? { duration: 0.4 } : springSoft}
            className="text-3xl font-bold tracking-tight sm:text-4xl"
          >
            Connect &amp; extend{" "}
            <span className="text-gradient">anything</span>
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={landingViewport}
            transition={reduceMotion ? { duration: 0.35, delay: 0.05 } : { ...springSoft, delay: 0.06 }}
            className="mt-3 text-lg font-medium text-primary"
          >
            AI-powered automation embedded in the tools your team already uses
          </motion.p>
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={landingViewport}
            transition={reduceMotion ? { duration: 0.35, delay: 0.1 } : { ...springSoft, delay: 0.12 }}
            className="mt-4 text-muted-foreground"
          >
            Bring CtrlChecks intelligence into your existing products — so your CRM, ERP, or internal tools can trigger workflows, process documents, and hand off tasks to AI agents, all without a separate interface.
          </motion.p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={landingViewport}
          transition={reduceMotion ? { duration: 0.35, delay: 0.12 } : { ...springSoft, delay: 0.14 }}
          className="mx-auto mt-8 flex max-w-3xl items-start gap-3 rounded-2xl border border-border/50 bg-background/10 p-4 text-left text-sm text-muted-foreground backdrop-blur-md dark:border-white/10 dark:bg-white/5 sm:p-5"
        >
          <FileText className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden />
          <p>
            <span className="font-medium text-foreground">Your data, already in the workflow.</span>{" "}
            Connect the systems where your records and files already live. AI agents work behind the scenes — no new screens, no disruption to how your team operates.
          </p>
        </motion.div>

        <motion.ul
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={landingViewport}
          className="mx-auto mt-8 flex max-w-2xl flex-wrap justify-center gap-2"
        >
          {tags.map((tag, i) => (
            <motion.li
              key={tag}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={landingViewport}
              transition={
                reduceMotion
                  ? { duration: 0.25, delay: i * 0.04 }
                  : { ...springSoft, delay: i * 0.06 }
              }
              whileHover={reduceMotion ? undefined : { y: -4, scale: 1.04 }}
              className="rounded-full border border-border/50 bg-background/10 px-4 py-2 text-sm font-medium shadow-none backdrop-blur-md dark:border-white/10 dark:bg-white/5"
            >
              {tag}
            </motion.li>
          ))}
        </motion.ul>

        <motion.p
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={landingViewport}
          transition={reduceMotion ? { duration: 0.4, delay: 0.15 } : { ...springSoft, delay: 0.2 }}
          className="mx-auto mt-8 max-w-2xl text-center text-sm leading-relaxed text-muted-foreground"
        >
          Workflows that run themselves · AI agents that take action · Automation that never stops ·
          Intelligence that gets smarter over time
        </motion.p>

        <div className="mt-12 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {rows.map((row, i) => (
            <motion.div
              key={row.title}
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={landingViewport}
              transition={
                reduceMotion
                  ? { duration: 0.3, delay: i * 0.05 }
                  : { ...springSoft, delay: i * 0.08 }
              }
              {...(reduceMotion ? {} : cardHoverTap)}
              className="flex h-full items-center gap-3 rounded-2xl border border-border/50 bg-background/10 px-5 py-4 shadow-none backdrop-blur-md dark:border-white/10 dark:bg-white/5"
            >
              <Plug className="h-5 w-5 shrink-0 text-primary" aria-hidden />
              <span className="font-medium">{row.title}</span>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
