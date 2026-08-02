import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, LayoutTemplate } from "lucide-react";
import { getActiveTemplates } from "@/lib/api/templates";
import { SECTION_SHELL, SECTION_PROSE } from "@/components/landing/landing-layout";
import { cardHoverTap, landingViewport, springSoft } from "@/components/landing/landing-motion";

const MAX_CARDS = 8;

type ShowcaseTemplate = {
  id: string;
  name: string;
  description?: string | null;
  category?: string | null;
  difficulty?: string | null;
};

/**
 * Real templates from the live catalogue (public GET /api/templates), not
 * hand-written marketing copy — so the section stays accurate as the catalogue
 * changes. Renders nothing if the catalogue is empty or unreachable.
 */
export function TemplateShowcaseSection() {
  const reduceMotion = useReducedMotion();
  const { data: templates = [], isError } = useQuery({
    queryKey: ["landing-templates"],
    queryFn: getActiveTemplates,
    staleTime: 5 * 60_000,
    retry: 1,
  });

  const cards: ShowcaseTemplate[] = templates.slice(0, MAX_CARDS);

  if (isError || cards.length === 0) return null;

  return (
    <section id="templates" className="py-12 sm:py-16" aria-labelledby="templates-heading">
      <div className={SECTION_SHELL}>
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={landingViewport}
          transition={reduceMotion ? { duration: 0.45 } : springSoft}
          className={SECTION_PROSE}
        >
          <h2
            id="templates-heading"
            className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl"
          >
            Or start from a <span className="text-gradient">ready-made workflow</span>
          </h2>
          <p className="mt-4 text-muted-foreground">
            Prebuilt automations you can copy into your workspace and run — then edit them in
            plain English like anything else you build here.
          </p>
        </motion.div>

        <ul className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {cards.map((template, index) => (
            <motion.li
              key={template.id}
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={landingViewport}
              transition={
                reduceMotion
                  ? { duration: 0.3, delay: Math.min(index, 4) * 0.04 }
                  : { ...springSoft, delay: Math.min(index, 4) * 0.06 }
              }
              {...(reduceMotion ? {} : cardHoverTap)}
              className="flex h-full flex-col rounded-2xl border border-border/50 bg-background/10 p-5 shadow-none backdrop-blur-md transition-colors hover:border-primary/30 dark:border-white/10 dark:bg-white/5"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-primary/30 bg-primary/10 text-primary">
                <LayoutTemplate className="h-4 w-4" aria-hidden />
              </div>
              <h3 className="mt-4 font-semibold leading-snug text-foreground">{template.name}</h3>
              {/* flex-1 on the description pushes every card's category chip to
                  the same baseline, whatever the description length. */}
              <p className="mt-2 line-clamp-3 flex-1 text-sm leading-relaxed text-muted-foreground">
                {template.description}
              </p>
              {template.category && (
                <span className="mt-4 inline-flex w-fit rounded-full border border-border/50 px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                  {template.category}
                </span>
              )}
            </motion.li>
          ))}
        </ul>

        <div className="mt-10 flex justify-center">
          <Link
            to="/templates"
            className="inline-flex items-center gap-2 rounded-full border border-border/60 px-5 py-2.5 text-sm font-semibold text-foreground transition-colors hover:border-primary/50 hover:bg-primary/10"
          >
            Browse all templates
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </div>
      </div>
    </section>
  );
}
