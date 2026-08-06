import { motion, useReducedMotion } from "framer-motion";
import { InteractiveDemoPreview } from "@/components/landing/InteractiveDemoPreview";
import { SECTION_SHELL } from "@/components/landing/landing-layout";
import { springSnappy } from "@/components/landing/landing-motion";

/**
 * First screen: headline straight into the live demo: example prompt, the
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
      className="relative overflow-hidden pt-20 pb-3 sm:pt-20 sm:pb-4"
      aria-labelledby="hero-heading"
    >
      <div className={`relative ${SECTION_SHELL}`}>
        <motion.h1
          id="hero-heading"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={titleTransition}
          className="mx-auto max-w-[1500px] text-center text-3xl font-bold leading-[1.08] tracking-tight sm:text-4xl lg:text-4xl xl:whitespace-nowrap 2xl:text-5xl"
        >
          Describe your workflow and integrations.{" "}
          <span className="text-gradient drop-shadow-sm">Watch it build itself.</span>
        </motion.h1>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...titleTransition, delay: 0.08 }}
          className="mx-auto mt-5 max-w-[1280px] sm:mt-6"
        >
          <InteractiveDemoPreview />
        </motion.div>
      </div>
    </section>
  );
}
