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
      className="relative overflow-hidden pt-24 pb-12 sm:pt-28 sm:pb-16"
      aria-labelledby="hero-heading"
    >
      <div className={`relative ${SECTION_SHELL}`}>
        <motion.h1
          id="hero-heading"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={titleTransition}
          className="mx-auto max-w-5xl text-center text-4xl font-bold leading-[1.1] tracking-tight sm:text-5xl lg:text-6xl"
        >
          {/* Each sentence owns its line so the headline never breaks mid-clause
              ("Describe your workflow. Watch" / "it build itself."). */}
          <span className="block">Describe your workflow.</span>
          <span className="block text-gradient drop-shadow-sm">Watch it build itself.</span>
        </motion.h1>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...titleTransition, delay: 0.1 }}
          className="mx-auto mt-10 max-w-6xl"
        >
          <InteractiveDemoPreview />
        </motion.div>
      </div>
    </section>
  );
}
