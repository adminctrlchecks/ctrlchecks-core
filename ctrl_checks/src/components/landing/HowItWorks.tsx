import { motion, useReducedMotion } from "framer-motion";
import { Target, Bot, Rocket } from "lucide-react";
import { landingViewport, springSoft, springSnappy } from "@/components/landing/landing-motion";
import { SECTION_PROSE, SECTION_SHELL } from "@/components/landing/landing-layout";

const steps = [
  {
    number: "1",
    icon: Target,
    title: "Tell it what should happen",
    description: "Use plain language: the trigger, the apps involved, and the result you want.",
  },
  {
    number: "2",
    icon: Bot,
    title: "Review the visible workflow",
    description: "CtrlChecks turns the request into steps, branches, and app actions you can inspect.",
  },
  {
    number: "3",
    icon: Rocket,
    title: "Run, edit, and scale",
    description: "Start quickly, then refine details, credentials, and logic as the workflow grows.",
  },
];

export function HowItWorks() {
  const reduceMotion = useReducedMotion();

  return (
    <section id="how-it-works" className="py-12 sm:py-16" aria-labelledby="how-heading">
      <div className={SECTION_SHELL}>
        <motion.div
          initial={{ opacity: 0, y: 28 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={landingViewport}
          transition={reduceMotion ? { duration: 0.45 } : springSoft}
          className={SECTION_PROSE}
        >
          <h2
            id="how-heading"
            className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl"
          >
            From plain English to{" "}
            <span className="text-gradient">a working automation.</span>
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Business users get a simple starting point. Technical teams still see the structure, data flow, and controls.
          </p>
        </motion.div>

        <div className="mt-16 grid gap-10 lg:grid-cols-3">
          {steps.map((step, index) => (
            <motion.div
              key={step.number}
              initial={{ opacity: 0, y: 32 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={landingViewport}
              transition={
                reduceMotion
                  ? { duration: 0.4, delay: index * 0.08 }
                  : { ...springSnappy, delay: index * 0.12 }
              }
              className="relative"
            >
              {index < steps.length - 1 && (
                <div
                  className="absolute top-12 left-1/2 hidden w-full overflow-hidden lg:block"
                  aria-hidden
                >
                  <motion.div
                    className="h-0.5 w-full origin-left bg-gradient-to-r from-primary/60 to-transparent"
                    initial={{ scaleX: 0 }}
                    whileInView={{ scaleX: 1 }}
                    viewport={{ once: true, margin: "-40px" }}
                    transition={
                      reduceMotion
                        ? { duration: 0.3, delay: 0.2 + index * 0.1 }
                        : { ...springSoft, delay: 0.35 + index * 0.12 }
                    }
                  />
                </div>
              )}

              <div className="relative flex flex-col items-center text-center">
                <motion.div
                  className="relative"
                  whileHover={reduceMotion ? undefined : { y: -4 }}
                  transition={springSoft}
                >
                  <motion.div
                    className="flex h-24 w-24 items-center justify-center rounded-2xl border border-border/50 bg-background/10 shadow-sm backdrop-blur-md dark:border-white/10 dark:bg-white/5"
                    whileHover={
                      reduceMotion
                        ? undefined
                        : {
                            boxShadow: "0 20px 40px -12px hsl(174 60% 51% / 0.25)",
                            borderColor: "hsl(var(--primary) / 0.45)",
                          }
                    }
                    transition={springSoft}
                  >
                    <motion.span
                      whileHover={reduceMotion ? undefined : { scale: 1.08, rotate: [0, -4, 4, 0] }}
                      transition={{ duration: 0.45 }}
                    >
                      <step.icon className="h-10 w-10 text-primary" />
                    </motion.span>
                  </motion.div>
                  <motion.span
                    className="absolute -top-3 -right-3 flex h-8 w-8 items-center justify-center rounded-full gradient-primary text-sm font-bold text-primary-foreground shadow-md"
                    initial={{ scale: 0 }}
                    whileInView={{ scale: 1 }}
                    viewport={{ once: true }}
                    transition={
                      reduceMotion
                        ? { duration: 0.2, delay: 0.15 + index * 0.1 }
                        : { ...springSnappy, delay: 0.25 + index * 0.12 }
                    }
                  >
                    {step.number}
                  </motion.span>
                </motion.div>

                <h3 className="mt-6 text-xl font-semibold">{step.title}</h3>
                <p className="mt-2 text-muted-foreground">{step.description}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
