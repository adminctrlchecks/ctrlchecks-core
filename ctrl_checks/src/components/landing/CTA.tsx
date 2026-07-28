import { Link } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { landingViewport, springBouncy, springSoft } from "@/components/landing/landing-motion";

/** Slides 14–15 — deck copy. */
export function CTA() {
  const reduceMotion = useReducedMotion();

  return (
    <section className="py-12 sm:py-16" aria-labelledby="cta-heading">
      <div className="container mx-auto max-w-7xl px-5 sm:px-8 lg:px-10">
        <motion.div
          initial={{ opacity: 0, y: 28, scale: 0.98 }}
          whileInView={{ opacity: 1, y: 0, scale: 1 }}
          viewport={landingViewport}
          transition={reduceMotion ? { duration: 0.5 } : springBouncy}
          className="relative overflow-hidden rounded-2xl border border-primary/10 shadow-xl shadow-primary/10 gradient-primary p-10 sm:p-16 lg:p-20"
        >
          {!reduceMotion && (
            <>
              <motion.div
                className="absolute -top-20 -right-20 h-80 w-80 rounded-full bg-white/20 blur-3xl"
                aria-hidden
                animate={{ scale: [1, 1.15, 1], opacity: [0.15, 0.28, 0.15] }}
                transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
              />
              <motion.div
                className="absolute -bottom-20 -left-20 h-80 w-80 rounded-full bg-white/20 blur-3xl"
                aria-hidden
                animate={{ scale: [1, 1.1, 1], opacity: [0.12, 0.22, 0.12] }}
                transition={{ duration: 12, repeat: Infinity, ease: "easeInOut", delay: 1 }}
              />
            </>
          )}
          {reduceMotion && (
            <div className="absolute inset-0 opacity-20" aria-hidden>
              <div className="absolute -top-20 -right-20 h-80 w-80 rounded-full bg-white/20 blur-3xl" />
              <div className="absolute -bottom-20 -left-20 h-80 w-80 rounded-full bg-white/20 blur-3xl" />
            </div>
          )}

          <div className="relative mx-auto max-w-2xl text-center">
            <motion.h2
              id="cta-heading"
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={landingViewport}
              transition={reduceMotion ? { duration: 0.4, delay: 0.05 } : { ...springSoft, delay: 0.08 }}
              className="text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-5xl"
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
              One platform for AI-driven workflows, intelligent agents, and all your integrations — wherever you run it.
            </motion.p>

            <motion.p
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={landingViewport}
              transition={reduceMotion ? { duration: 0.35, delay: 0.16 } : { ...springSoft, delay: 0.18 }}
              className="mt-5 text-lg font-semibold text-white sm:text-xl"
            >
              From a single prompt to production — instantly.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={landingViewport}
              transition={reduceMotion ? { duration: 0.4, delay: 0.18 } : { ...springSoft, delay: 0.22 }}
              className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row"
            >
              <motion.div {...(reduceMotion ? {} : { whileHover: { scale: 1.04 }, whileTap: { scale: 0.98 } })}>
                <Button size="lg" asChild className="bg-white text-primary hover:bg-white/90 shadow-lg">
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
