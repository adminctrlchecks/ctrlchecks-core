import { motion, useReducedMotion } from "framer-motion";
import { InteractiveDemoPreview } from "@/components/landing/InteractiveDemoPreview";
import { landingViewport, springSoft } from "@/components/landing/landing-motion";

export function WorkflowDemoSection() {
  const reduceMotion = useReducedMotion();

  return (
    <section id="demo" className="py-12 sm:py-16" aria-labelledby="demo-heading">
      <div className="container mx-auto max-w-7xl px-5 sm:px-8 lg:px-10">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={landingViewport}
          transition={reduceMotion ? { duration: 0.45 } : springSoft}
          className="mx-auto max-w-3xl text-center"
        >
          <p className="text-sm font-semibold uppercase tracking-wider text-primary">
            See it in action
          </p>
          <h2
            id="demo-heading"
            className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl"
          >
            Watch workflows{" "}
            <span className="text-gradient">build themselves</span>
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Pick a common request and watch a visual automation map appear before signup.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={landingViewport}
          transition={reduceMotion ? { duration: 0.4, delay: 0.08 } : { ...springSoft, delay: 0.12 }}
          className="mx-auto mt-12 max-w-5xl"
        >
          <InteractiveDemoPreview />
        </motion.div>
      </div>
    </section>
  );
}
