import { motion, useReducedMotion } from "framer-motion";
import { Building2 } from "lucide-react";
import { cardHoverTap, landingViewport, springSoft } from "@/components/landing/landing-motion";
import { LANDING_INDUSTRY_VERTICALS } from "@/components/landing/landing-verticals";
import { SECTION_PROSE, SECTION_SHELL } from "@/components/landing/landing-layout";

export function IndustryVerticalsSection() {
  const reduceMotion = useReducedMotion();

  return (
    <section id="verticals" className="scroll-mt-24 py-8 sm:py-10" aria-labelledby="verticals-heading">
      <div className={SECTION_SHELL}>
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={landingViewport}
          transition={reduceMotion ? { duration: 0.45 } : springSoft}
          className={SECTION_PROSE}
        >
          <h2 id="verticals-heading" className="text-2xl font-bold tracking-tight sm:text-3xl lg:text-4xl">
            Built for teams across <span className="text-gradient">real business functions</span>
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
            Start with a plain request, connect the right integrations, and keep the workflow visible for every team.
          </p>
        </motion.div>

        <ul className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {LANDING_INDUSTRY_VERTICALS.map((v, index) => (
            <motion.li
              key={v.id}
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={landingViewport}
              transition={
                reduceMotion ? { duration: 0.35, delay: index * 0.05 } : { ...springSoft, delay: index * 0.08 }
              }
              {...(reduceMotion ? {} : cardHoverTap)}
              className="flex h-full gap-3 rounded-lg border border-border/50 bg-background/20 p-4 shadow-[0_14px_34px_-30px_hsl(var(--foreground)/0.45)] backdrop-blur-md transition-colors hover:border-primary/30 dark:border-white/10 dark:bg-white/5"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-primary/30 bg-primary/10 text-primary">
                <Building2 className="h-5 w-5" aria-hidden />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">{v.name}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{v.benefit}</p>
              </div>
            </motion.li>
          ))}
        </ul>
      </div>
    </section>
  );
}
