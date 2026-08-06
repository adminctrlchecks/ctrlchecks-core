/**
 * Homepage FAQ — professional Q&A with technical answers (aligned with UI: canvas, nodes, run, credentials).
 * Vendor-neutral AI messaging; no LLM provider names on the marketing surface.
 */

export type LandingFaqItem = {
  id: string;
  question: string;
  answer: string;
};

export type LandingFaqGroup = {
  id: string;
  title: string;
  items: LandingFaqItem[];
};

export const LANDING_FAQ_INTRO = {
  title: "Questions teams ask before using CtrlChecks",
  lede:
    "Simple answers for business users, with enough technical detail for engineering and operations teams.",
  /** Matches labels in WorkflowBuilder (Node Library, Properties panel) and Executions. */
  uiAlignmentLine:
    "In the product: workflow canvas, Node Library, Properties panel, and Executions for history and run detail.",
};

export const LANDING_FAQ_GROUPS: LandingFaqGroup[] = [
  {
    id: "architecture",
    title: "Architecture and authoring",
    items: [
      {
        id: "faq-1",
        question: "What structural model do CtrlChecks workflows use?",
        answer:
          "Each workflow is a directed acyclic graph (DAG): exactly one trigger node starts execution; downstream nodes run in topological order along defined edges. The graph must be fully connected from trigger to outputs. Cycles and orphaned nodes are rejected as structural contract errors before a run. What you author on the canvas is the canonical definition of that DAG.",
      },
      {
        id: "faq-2",
        question: "How should I compose workflows in the visual editor?",
        answer:
          "Default to a linear chain: trigger first, then steps in execution order, with one main input per non-merge node unless you introduce explicit branching. Each node is configured against its schema in the Properties panel. Structural validation applies to the whole graph. Field-level validation alone is not sufficient for a correct automation.",
      },
      {
        id: "faq-3",
        question: "How does the runtime execute a single workflow run?",
        answer:
          "The engine traverses the DAG from the trigger, executing one active path at a time. Node outputs are passed to successors according to edge semantics; IF/SWITCH-style nodes select a single branch per evaluation. Per-node status, logs, and failures are surfaced under Executions and in run detail so operators can attribute errors to a specific step.",
      },
      {
        id: "faq-4",
        question: "What is the relationship between AI-assisted authoring and the saved workflow?",
        answer:
          "Assistive generation proposes node types and ordering; those proposals are hydrated from the unified node registry and compiled into the same validated DAG you would build manually. The persisted source of truth is the graph after compilation and validation, not raw model output. Inference endpoints and API keys are server-side configuration only and are not treated as a customer-facing product differentiator.",
      },
      {
        id: "faq-5",
        question: "How are external systems and APIs integrated?",
        answer:
          "Third-party capabilities appear as typed nodes with declared credential requirements, inputs, and outputs. The worker resolves configuration (including cross-node template references), validates against the registry, and dispatches execution through shared orchestration paths rather than ad-hoc per-vendor branches in the client. Use the Node Library in the editor for the current integration surface area.",
      },
    ],
  },
  {
    id: "operations",
    title: "Execution, reliability, and security",
    items: [
      {
        id: "faq-6",
        question: "What is the failure and error-handling behavior during a run?",
        answer:
          "When a node encounters an error (validation, connector failure, or upstream API fault) the run stops at that node with an attributable error context suitable for remediation. Retry, compensation, or alerting are modeled explicitly in the workflow (for example via additional nodes or policies) where your deployment supports them, rather than as hidden client-side behavior.",
      },
      {
        id: "faq-7",
        question: "Where do credentials and sensitive configuration reside?",
        answer:
          "Secrets and service credentials are bound to the worker and backing services; the browser does not retain provider API keys for automation connectors. Node definitions declare required credential categories so preflight checks can block runs that lack least-privilege access. AI-generated graphs undergo the same structural and permission constraints as manually authored workflows.",
      },
    ],
  },
  {
    id: "positioning",
    title: "Platform positioning",
    items: [
      {
        id: "faq-8",
        question: "Which teams and use cases is the platform aimed at?",
        answer:
          "Organizations that need governed, reviewable automation: platform engineering, operations, and business technologists who require execution history, explicit graphs, and schema-driven validation suitable for production change control. Not one-off scripts without lineage or shared contracts.",
      },
      {
        id: "faq-9",
        question: "How does this compare to imperative scripts or general-purpose chat assistants?",
        answer:
          "Imperative scripts are difficult to audit and standardize at scale. Chat-centric tools rarely persist a validated DAG with deterministic execution semantics. CtrlChecks combines a visual graph, registry-backed node contracts, worker-side execution, and separation between the SPA and data tier, aligned with how enterprise automation is operated and observed.",
      },
      {
        id: "faq-10",
        question: "Is selection of a language-model provider the primary value proposition?",
        answer:
          "No. Primary value is dependable workflow orchestration: validated structure, integration contracts, and observable runs. Language models may accelerate authoring; which model or endpoint is deployed is an operational decision configured on the server and is not positioned as the headline capability.",
      },
    ],
  },
];
