import { motion, useReducedMotion } from "framer-motion";
import { InteractiveDemoPreview } from "@/components/landing/InteractiveDemoPreview";
import { landingViewport, springSoft } from "@/components/landing/landing-motion";

export function WorkflowDemoSection() {
  const reduceMotion = useReducedMotion();

  return (
    <section id="demo" className="py-12 sm:py-16" aria-labelledby="demo-heading">
      <div className="container mx-auto max-w-7xl px-5 sm:px-8 lg:px-10">
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={landingViewport}
          transition={reduceMotion ? { duration: 0.35 } : springSoft}
          id="demo-heading"
          className="mx-auto max-w-2xl text-center text-base text-muted-foreground"
        >
          Pick a request below and watch the automation map build in real time — before you sign up.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={landingViewport}
          transition={reduceMotion ? { duration: 0.4, delay: 0.08 } : { ...springSoft, delay: 0.12 }}
          className="mx-auto mt-8 max-w-5xl"
        >
          <InteractiveDemoPreview />
        </motion.div>
      </div>
    </section>
  );
}
