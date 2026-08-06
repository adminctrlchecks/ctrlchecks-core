import { motion, useReducedMotion } from "framer-motion";
import { InteractiveDemoPreview } from "@/components/landing/InteractiveDemoPreview";
import { SECTION_SHELL } from "@/components/landing/landing-layout";
import { springSnappy } from "@/components/landing/landing-motion";

/**
 * First screen: headline straight into the live demo — example prompt, the
 * selectable prompts, then the workflow drawing itself. No explanatory
 * paragraph and no CTA row above the proof; the header keeps Sign Up reachable
 * and the demo carries its own CTA underneath the canvas.
 */
export function Hero() {
  const reduceMotion = useReducedMotion();
  const titleTransition = reduceMotion
    ? { duration: 0.35, ease: [0.22, 1, 0.36, 1] as const }
    : springSnappy;

  return (
    <section
      id="demo"
      className="relative overflow-hidden pt-20 pb-8 sm:pt-24 sm:pb-10"
      aria-labelledby="hero-heading"
    >
      <div className={`relative ${SECTION_SHELL}`}>
        <motion.h1
          id="hero-heading"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={titleTransition}
          className="mx-auto max-w-5xl text-center text-3xl font-bold leading-[1.08] tracking-tight sm:text-4xl lg:text-5xl"
        >
          {/* Each sentence owns its line so the headline never breaks mid-clause
              ("Describe your workflow. Watch" / "it build itself."). */}
          <span className="block">Describe your workflow.</span>
          <span className="block text-gradient drop-shadow-sm">Watch it build itself.</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...titleTransition, delay: 0.06 }}
          className="mx-auto mt-3 max-w-3xl text-center text-sm leading-relaxed text-muted-foreground sm:text-base"
        >
          Tell CtrlChecks the outcome. It connects the right apps, creates the steps, and shows the logic as it runs.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...titleTransition, delay: 0.1 }}
          className="mx-auto mt-6 max-w-6xl sm:mt-7"
        >
          <InteractiveDemoPreview />
        </motion.div>
      </div>
    </section>
  );
}
