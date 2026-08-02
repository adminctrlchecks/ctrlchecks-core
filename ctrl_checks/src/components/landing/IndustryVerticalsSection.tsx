import { motion, useReducedMotion } from "framer-motion";
import { Building2 } from "lucide-react";
import { cardHoverTap, landingViewport, springSoft } from "@/components/landing/landing-motion";
import { LANDING_INDUSTRY_VERTICALS } from "@/components/landing/landing-verticals";
import { SECTION_PROSE, SECTION_SHELL } from "@/components/landing/landing-layout";

export function IndustryVerticalsSection() {
  const reduceMotion = useReducedMotion();

  return (
    <section id="verticals" className="py-12 sm:py-16" aria-labelledby="verticals-heading">
      <div className={SECTION_SHELL}>
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={landingViewport}
          transition={reduceMotion ? { duration: 0.45 } : springSoft}
          className={SECTION_PROSE}
        >
          <h2
            id="verticals-heading"
            className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl"
          >
            Trusted across <span className="text-gradient">every industry</span>
          </h2>
          <p className="mt-4 text-muted-foreground">
            One powerful platform, shaped to the needs of your sector. The same AI engine — delivering outcomes that matter to your business.
          </p>
        </motion.div>

        <ul className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
              className="flex h-full gap-4 rounded-2xl border border-border/50 bg-background/10 p-5 shadow-none backdrop-blur-md transition-colors hover:border-primary/30 dark:border-white/10 dark:bg-white/5 sm:p-6"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-primary/30 bg-primary/10 text-primary">
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
