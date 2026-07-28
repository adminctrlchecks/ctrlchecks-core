import { Link } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { springSnappy } from "@/components/landing/landing-motion";

export function Hero() {
  const reduceMotion = useReducedMotion();
  const titleTransition = reduceMotion
    ? { duration: 0.35, ease: [0.22, 1, 0.36, 1] as const }
    : springSnappy;

  return (
    <section className="relative overflow-hidden pt-32 pb-12 sm:pt-40 sm:pb-16">
      <div className="container relative mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={titleTransition}
            className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl"
          >
            Describe your workflow.{" "}
            <span className="text-gradient drop-shadow-sm">Watch it build itself.</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...titleTransition, delay: 0.1 }}
            className="mt-6 text-base leading-relaxed text-muted-foreground sm:text-lg"
          >
            Type what you need in plain English. CtrlChecks connects your apps, writes the logic,
            and hands you a working automation — no code, nothing to wire up by hand.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...titleTransition, delay: 0.18 }}
            className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row"
          >
            <motion.div {...(reduceMotion ? {} : { whileHover: { scale: 1.03 }, whileTap: { scale: 0.98 } })}>
              <Button
                size="lg"
                asChild
                className="gradient-primary text-primary-foreground shadow-glow hover:brightness-[1.03]"
              >
                <Link to="/signup">
                  Sign Up
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </motion.div>
            <motion.div {...(reduceMotion ? {} : { whileHover: { scale: 1.02 }, whileTap: { scale: 0.98 } })}>
              <Button
                size="lg"
                variant="outline"
                asChild
                className="border-border/80 bg-transparent shadow-none hover:bg-accent/15 dark:hover:bg-accent/10"
              >
                <a href="#how-it-works">How it works</a>
              </Button>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
