import { Link } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { landingViewport, springBouncy, springSoft } from "@/components/landing/landing-motion";
import { SECTION_SHELL } from "@/components/landing/landing-layout";

export function CTA() {
  const reduceMotion = useReducedMotion();

  return (
    <section className="py-8 sm:py-10" aria-labelledby="cta-heading">
      <div className={SECTION_SHELL}>
        <motion.div
          initial={{ opacity: 0, y: 28, scale: 0.98 }}
          whileInView={{ opacity: 1, y: 0, scale: 1 }}
          viewport={landingViewport}
          transition={reduceMotion ? { duration: 0.5 } : springBouncy}
          className="relative overflow-hidden rounded-lg border border-primary/10 p-8 shadow-[0_22px_60px_-34px_hsl(var(--primary)/0.65)] gradient-primary sm:p-10 lg:p-12"
        >
          <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-white/55" aria-hidden />

          <div className="relative mx-auto max-w-3xl text-center">
            <motion.h2
              id="cta-heading"
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={landingViewport}
              transition={reduceMotion ? { duration: 0.4, delay: 0.05 } : { ...springSoft, delay: 0.08 }}
              className="text-2xl font-bold tracking-tight text-white sm:text-3xl lg:text-4xl"
            >
              Your vision. Running in minutes.
            </motion.h2>

            <motion.p
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={landingViewport}
              transition={reduceMotion ? { duration: 0.35, delay: 0.12 } : { ...springSoft, delay: 0.14 }}
              className="mt-4 text-base text-white/85 sm:text-lg"
            >
              One platform for AI-driven workflows, intelligent agents, and the integrations your team already uses.
            </motion.p>

            <motion.p
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={landingViewport}
              transition={reduceMotion ? { duration: 0.35, delay: 0.16 } : { ...springSoft, delay: 0.18 }}
              className="mt-4 text-base font-semibold text-white sm:text-lg"
            >
              From a single prompt to production-ready automation.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={landingViewport}
              transition={reduceMotion ? { duration: 0.4, delay: 0.18 } : { ...springSoft, delay: 0.22 }}
              className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row"
            >
              <motion.div {...(reduceMotion ? {} : { whileHover: { scale: 1.04 }, whileTap: { scale: 0.98 } })}>
                <Button size="lg" asChild className="bg-white text-primary shadow-lg hover:bg-white/90">
                  <Link to="/signup">
                    Sign Up
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </motion.div>
              <motion.div {...(reduceMotion ? {} : { whileHover: { scale: 1.03 }, whileTap: { scale: 0.98 } })}>
                <Button
                  size="lg"
                  variant="outline"
                  asChild
                  className="border-white/30 bg-transparent text-white hover:bg-white/10"
                >
                  <Link to="/signin">Sign in</Link>
                </Button>
              </motion.div>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
