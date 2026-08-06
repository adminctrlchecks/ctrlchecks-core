/** Named industries plus one benefit line each. */
export type IndustryVertical = {
  id: string;
  name: string;
  benefit: string;
};

export const LANDING_INDUSTRY_VERTICALS: IndustryVertical[] = [
  {
    id: "financial",
    name: "Finance and compliance",
    benefit: "Automate approval, reporting, and exception workflows with clear audit paths.",
  },
  {
    id: "healthcare",
    name: "Healthcare and life sciences",
    benefit: "Connect systems and documents while keeping every step traceable.",
  },
  {
    id: "retail",
    name: "Retail and logistics",
    benefit: "Respond faster across operations, vendors, and customer touchpoints.",
  },
  {
    id: "technology",
    name: "Technology and SaaS",
    benefit: "Ship product-embedded automation through APIs and integrations without rebuilding an engine.",
  },
];
