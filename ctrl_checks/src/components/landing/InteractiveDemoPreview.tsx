import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import {
  Bot,
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  Code2,
  CreditCard,
  Database,
  GitBranch,
  Globe2,
  Mail,
  MessageSquare,
  Split,
  Table2,
  Webhook,
  X,
} from 'lucide-react';
import { ENDPOINTS } from '@/config/endpoints';
import type { LandingDemoEdge, LandingDemoNode, LandingDemoScenario } from '@/lib/api/admin';

// Coordinate space the stored scenarios author their node positions in.
// Never change these — projectNodes() normalizes against them.
const LOGICAL_STAGE_WIDTH = 720;
const LOGICAL_STAGE_HEIGHT = 380;
const LOGICAL_NODE_WIDTH = 142;
const LOGICAL_NODE_HEIGHT = 64;

// Render stage. Wider and proportionally shorter than the logical space so the
// canvas can span the hero without becoming tall enough to push the CTA far
// below the fold.
const DESKTOP_STAGE = {
  width: 1120,
  height: 320,
  nodeWidth: 200,
  nodeHeight: 68,
};
const COMPACT_STAGE = {
  width: 440,
  height: 300,
  nodeWidth: 142,
  nodeHeight: LOGICAL_NODE_HEIGHT,
};
const STAGE_GUTTER = 8;
const SESSION_STORAGE_KEY = 'ctrlchecks_landing_demo_session';
const AUTO_ADVANCE_DELAY_MS = 2200;
const AUTO_ADVANCE_ANIMATION_BUFFER_MS = 700;

const iconMap = {
  ai: Bot,
  discord: MessageSquare,
  email: Mail,
  form: Table2,
  gmail: Mail,
  google_sheets: Table2,
  http: Globe2,
  if_else: Split,
  jira: GitBranch,
  notion: Database,
  schedule: CalendarClock,
  slack: MessageSquare,
  stripe: CreditCard,
  twitter: MessageSquare,
  webhook: Webhook,
  x: X,
} as const;

const categoryStyles: Record<string, string> = {
  ai: 'border-fuchsia-300/70 bg-fuchsia-50 text-fuchsia-950 dark:border-fuchsia-500/40 dark:bg-fuchsia-950/30 dark:text-fuchsia-50',
  api: 'border-sky-300/70 bg-sky-50 text-sky-950 dark:border-sky-500/40 dark:bg-sky-950/30 dark:text-sky-50',
  communication: 'border-emerald-300/70 bg-emerald-50 text-emerald-950 dark:border-emerald-500/40 dark:bg-emerald-950/30 dark:text-emerald-50',
  data: 'border-amber-300/70 bg-amber-50 text-amber-950 dark:border-amber-500/40 dark:bg-amber-950/30 dark:text-amber-50',
  logic: 'border-rose-300/70 bg-rose-50 text-rose-950 dark:border-rose-500/40 dark:bg-rose-950/30 dark:text-rose-50',
  productivity: 'border-indigo-300/70 bg-indigo-50 text-indigo-950 dark:border-indigo-500/40 dark:bg-indigo-950/30 dark:text-indigo-50',
  trigger: 'border-cyan-300/70 bg-cyan-50 text-cyan-950 dark:border-cyan-500/40 dark:bg-cyan-950/30 dark:text-cyan-50',
};

async function fetchLandingDemoScenarios(): Promise<LandingDemoScenario[]> {
  const response = await fetch(`${ENDPOINTS.itemBackend}/api/landing-demo/scenarios`);
  if (!response.ok) {
    throw new Error('Failed to load landing demo scenarios');
  }

  const data = await response.json();
  return data.scenarios || [];
}

function getLandingDemoSessionId() {
  try {
    const existing = window.localStorage.getItem(SESSION_STORAGE_KEY);
    if (existing) return existing;

    const next =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `demo_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    window.localStorage.setItem(SESSION_STORAGE_KEY, next);
    return next;
  } catch {
    return `demo_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  }
}

function recordLandingDemoEvent(
  scenarioId: string,
  eventType: 'view' | 'pill_click' | 'animation_complete' | 'cta_click'
) {
  const url = `${ENDPOINTS.itemBackend}/api/landing-demo/events`;
  const body = JSON.stringify({
    scenarioId,
    sessionId: getLandingDemoSessionId(),
    eventType,
    referrer: document.referrer || window.location.href,
  });

  if ('sendBeacon' in navigator) {
    navigator.sendBeacon(url, new Blob([body], { type: 'application/json' }));
    return;
  }

  fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
    keepalive: true,
  }).catch(() => {});
}

function splitScript(script: LandingDemoScenario['script']) {
  const nodes = new Map<string, LandingDemoNode & { id: string; delayMs: number }>();
  const edges: Array<LandingDemoEdge & { id: string; delayMs: number }> = [];

  for (const step of script.steps) {
    if (step.type === 'node' && step.node) {
      nodes.set(step.id, { id: step.id, delayMs: step.delayMs, ...step.node });
    }
    if (step.type === 'edge' && step.edge) {
      edges.push({ id: step.id, delayMs: step.delayMs, ...step.edge });
    }
  }

  return { nodes: [...nodes.values()], edges };
}

type StageMetrics = typeof DESKTOP_STAGE;
type DemoNodeVisual = LandingDemoNode & { id: string; delayMs: number };

function getScenarioRuntimeMs(scenario: LandingDemoScenario, reduceMotion: boolean) {
  if (reduceMotion) return 0;
  return Math.max(...scenario.script.steps.map((step) => step.delayMs), 0) + AUTO_ADVANCE_ANIMATION_BUFFER_MS;
}

function projectNodes(nodes: DemoNodeVisual[], stage: StageMetrics) {
  const maxLogicalX = LOGICAL_STAGE_WIDTH - LOGICAL_NODE_WIDTH;
  const maxLogicalY = LOGICAL_STAGE_HEIGHT - LOGICAL_NODE_HEIGHT;
  const maxStageX = stage.width - stage.nodeWidth - STAGE_GUTTER;
  const maxStageY = stage.height - stage.nodeHeight - STAGE_GUTTER;

  return nodes.map((node) => ({
    ...node,
    position: {
      x: Math.max(STAGE_GUTTER, Math.min(maxStageX, (node.position.x / maxLogicalX) * maxStageX)),
      y: Math.max(STAGE_GUTTER, Math.min(maxStageY, (node.position.y / maxLogicalY) * maxStageY)),
    },
  }));
}

function edgePath(edge: LandingDemoEdge, nodeMap: Map<string, DemoNodeVisual>, stage: StageMetrics) {
  const source = nodeMap.get(edge.source);
  const target = nodeMap.get(edge.target);
  if (!source || !target) return null;

  const sourceY =
    source.position.y +
    stage.nodeHeight / 2 +
    (edge.sourceHandle === 'true' ? -14 : edge.sourceHandle === 'false' ? 14 : 0);
  const targetY = target.position.y + stage.nodeHeight / 2;
  const sourceX = source.position.x + stage.nodeWidth;
  const targetX = target.position.x;
  const midX = sourceX + (targetX - sourceX) / 2;

  return {
    d: `M ${sourceX} ${sourceY} C ${midX} ${sourceY}, ${midX} ${targetY}, ${targetX} ${targetY}`,
    labelX: midX,
    labelY: sourceY + (targetY - sourceY) / 2,
  };
}

function DemoNode({
  node,
  stage,
  reduceMotion,
  onAnimationComplete,
}: {
  node: DemoNodeVisual;
  stage: StageMetrics;
  reduceMotion: boolean;
  onAnimationComplete?: () => void;
}) {
  const Icon = iconMap[node.icon as keyof typeof iconMap] || Code2;
  const className = categoryStyles[node.category] || categoryStyles.trigger;
  const delay = reduceMotion ? 0 : node.delayMs / 1000;
  const duration = reduceMotion ? 0 : 0.26;

  return (
    <motion.div
      layoutId={`landing-demo-node-${node.id}`}
      initial={reduceMotion ? false : { opacity: 0, scale: 0.94, y: 8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.94, y: -6 }}
      transition={{ duration, delay, ease: 'easeOut' }}
      onAnimationComplete={onAnimationComplete}
      className={`absolute flex items-center gap-2 rounded-lg border px-2.5 py-3 shadow-sm backdrop-blur sm:gap-3 sm:px-3 ${className}`}
      style={{
        left: `${(node.position.x / stage.width) * 100}%`,
        top: `${(node.position.y / stage.height) * 100}%`,
        width: `${(stage.nodeWidth / stage.width) * 100}%`,
        minHeight: stage.nodeHeight,
      }}
    >
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-background/70 sm:h-8 sm:w-8">
        <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" aria-hidden />
      </span>
      <span className="min-w-0 text-xs font-semibold leading-tight sm:text-sm">{node.label}</span>
    </motion.div>
  );
}

function AnimatedDiagram({
  scenario,
  stage,
  direction,
  reduceMotion,
  onAnimationSettled,
}: {
  scenario: LandingDemoScenario;
  stage: StageMetrics;
  direction: number;
  reduceMotion: boolean;
  onAnimationSettled: (scenarioId: string) => void;
}) {
  const { nodes: scriptNodes, edges } = useMemo(() => splitScript(scenario.script), [scenario.script]);
  const nodes = useMemo(() => projectNodes(scriptNodes, stage), [scriptNodes, stage]);
  const nodeMap = useMemo(() => new Map(nodes.map((node) => [node.id, node])), [nodes]);
  const lastStepDelay = Math.max(...scenario.script.steps.map((step) => step.delayMs), 0);
  const nodeByLastDelay = nodes.find((node) => node.delayMs === lastStepDelay);
  const edgeByLastDelay = edges.find((edge) => edge.delayMs === lastStepDelay);

  function handleStepComplete(delayMs: number) {
    if (delayMs === lastStepDelay) {
      onAnimationSettled(scenario.id);
    }
  }

  return (
    <motion.div
      key={scenario.id}
      className="absolute inset-0"
      custom={direction}
      initial={reduceMotion ? false : { opacity: 0, x: direction >= 0 ? 28 : -28 }}
      animate={{ opacity: 1, x: 0 }}
      exit={reduceMotion ? { opacity: 0 } : { opacity: 0, x: direction >= 0 ? -28 : 28 }}
      transition={{ duration: reduceMotion ? 0 : 0.22, ease: 'easeOut' }}
    >
      <svg className="absolute inset-0 h-full w-full" viewBox={`0 0 ${stage.width} ${stage.height}`} aria-hidden>
        <defs>
          <marker id="landing-demo-arrow" markerHeight="8" markerWidth="8" orient="auto" refX="7" refY="4">
            <path d="M 0 0 L 8 4 L 0 8 z" className="fill-foreground/45" />
          </marker>
        </defs>
        {edges.map((edge) => {
          const path = edgePath(edge, nodeMap, stage);
          if (!path) return null;
          const delay = reduceMotion ? 0 : edge.delayMs / 1000;
          const duration = reduceMotion ? 0 : 0.42;
          const isLastEdge = edgeByLastDelay?.id === edge.id && !nodeByLastDelay;

          return (
            <g key={edge.id}>
              <motion.path
                d={path.d}
                fill="none"
                className="stroke-foreground/45"
                strokeLinecap="round"
                strokeWidth="2.5"
                markerEnd="url(#landing-demo-arrow)"
                initial={reduceMotion ? false : { pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 1 }}
                exit={{ opacity: 0, pathLength: reduceMotion ? 1 : 0 }}
                transition={{ duration, delay, ease: 'easeInOut' }}
                onAnimationComplete={() => {
                  if (isLastEdge) handleStepComplete(edge.delayMs);
                }}
              />
              {edge.label && stage.width >= 600 ? (
                <motion.text
                  x={path.labelX}
                  y={path.labelY - 8}
                  textAnchor="middle"
                  className="fill-muted-foreground text-[12px] font-medium"
                  initial={reduceMotion ? false : { opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: reduceMotion ? 0 : 0.16, delay: reduceMotion ? 0 : delay + 0.18 }}
                >
                  {edge.label}
                </motion.text>
              ) : null}
            </g>
          );
        })}
      </svg>
      {nodes.map((node) => (
        <DemoNode
          key={node.id}
          node={node}
          stage={stage}
          reduceMotion={reduceMotion}
          onAnimationComplete={() => {
            if (nodeByLastDelay?.id === node.id) handleStepComplete(node.delayMs);
          }}
        />
      ))}
    </motion.div>
  );
}

function DemoStage({
  scenario,
  stage,
  direction,
  reduceMotion,
  onAnimationSettled,
}: {
  scenario: LandingDemoScenario;
  stage: StageMetrics;
  direction: number;
  reduceMotion: boolean;
  onAnimationSettled: (scenarioId: string) => void;
}) {
  return (
    <div
      className="relative w-full overflow-hidden rounded-xl border border-border/70 bg-background/85 shadow-lg"
      style={{ aspectRatio: `${stage.width} / ${stage.height}` }}
    >
      <div className="absolute inset-0 bg-[linear-gradient(to_right,hsl(var(--border)/0.35)_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--border)/0.35)_1px,transparent_1px)] bg-[size:36px_36px]" />
      <AnimatePresence mode="wait" initial={false}>
        <AnimatedDiagram
          key={scenario.id}
          scenario={scenario}
          stage={stage}
          direction={direction}
          reduceMotion={reduceMotion}
          onAnimationSettled={onAnimationSettled}
        />
      </AnimatePresence>
    </div>
  );
}

/**
 * Shows the prompt for the scenario currently on the canvas.
 *
 * This used to cycle through every prompt on its own 3s timer, independent of
 * the selected chip — so the card could read "Alert on negative mentions" while
 * the canvas drew the Stripe → Slack flow. It is now driven by the active
 * scenario so prompt, chip, and diagram always agree.
 */
function ActivePrompt({
  prompt,
  direction,
  reduceMotion,
}: {
  prompt: string;
  direction: number;
  reduceMotion: boolean;
}) {
  return (
    <div className="min-w-0 flex-1 rounded-xl border border-border/70 bg-background/85 px-4 py-3 text-left shadow-sm sm:px-5">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Example prompt</p>
      <AnimatePresence mode="wait" initial={false} custom={direction}>
        <motion.p
          key={prompt}
          custom={direction}
          initial={reduceMotion ? false : { opacity: 0, x: direction >= 0 ? 24 : -24 }}
          animate={{ opacity: 1, x: 0 }}
          exit={reduceMotion ? { opacity: 0 } : { opacity: 0, x: direction >= 0 ? -24 : 24 }}
          transition={{ duration: reduceMotion ? 0 : 0.2, ease: 'easeOut' }}
          className="mt-1 min-h-6 text-sm font-medium leading-snug text-foreground sm:text-base"
        >
          {prompt}
        </motion.p>
      </AnimatePresence>
    </div>
  );
}

function CarouselArrow({
  direction,
  onClick,
}: {
  direction: 'previous' | 'next';
  onClick: () => void;
}) {
  const Icon = direction === 'previous' ? ChevronLeft : ChevronRight;

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border/70 bg-background/85 text-foreground shadow-sm transition-colors hover:border-primary/50 hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      aria-label={direction === 'previous' ? 'Previous workflow' : 'Next workflow'}
    >
      <Icon className="h-4 w-4" aria-hidden />
    </button>
  );
}

function useCompactStage() {
  const [isCompact, setIsCompact] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 640px)');
    const update = () => setIsCompact(mediaQuery.matches);
    update();
    mediaQuery.addEventListener('change', update);
    return () => mediaQuery.removeEventListener('change', update);
  }, []);

  return isCompact;
}

export function InteractiveDemoPreview() {
  const reduceMotion = useReducedMotion();
  const isCompact = useCompactStage();
  const stage = isCompact ? COMPACT_STAGE : DESKTOP_STAGE;
  const { data: scenarios = [], isLoading, error } = useQuery({
    queryKey: ['landing-demo-scenarios'],
    queryFn: fetchLandingDemoScenarios,
    staleTime: 60_000,
  });
  const [activeId, setActiveId] = useState<string | null>(null);
  const [direction, setDirection] = useState(1);
  const [playback, setPlayback] = useState<{ phase: 'idle' | 'animating' | 'settled'; scenarioId: string | null }>({
    phase: 'idle',
    scenarioId: null,
  });
  const completedAnimationRef = useRef<string | null>(null);
  const autoplayTimerRef = useRef<ReturnType<typeof window.setTimeout> | null>(null);

  useEffect(() => {
    if (!activeId && scenarios.length > 0) {
      setActiveId(scenarios[0].id);
    }
  }, [activeId, scenarios]);

  const activeIndex = Math.max(
    0,
    scenarios.findIndex((scenario) => scenario.id === activeId)
  );
  const activeScenario = scenarios[activeIndex] || scenarios[0];

  const clearAutoplayTimer = useCallback(() => {
    if (autoplayTimerRef.current) {
      window.clearTimeout(autoplayTimerRef.current);
      autoplayTimerRef.current = null;
    }
  }, []);

  const activateScenario = useCallback(
    (nextIndex: number, nextDirection: number, source: 'auto' | 'manual') => {
      if (scenarios.length === 0) return;
      const normalizedIndex = (nextIndex + scenarios.length) % scenarios.length;
      const nextScenario = scenarios[normalizedIndex];
      if (!nextScenario || nextScenario.id === activeScenario?.id) return;

      clearAutoplayTimer();
      setDirection(nextDirection);
      setPlayback({ phase: 'animating', scenarioId: nextScenario.id });
      setActiveId(nextScenario.id);
      if (source === 'manual') {
        recordLandingDemoEvent(nextScenario.id, 'pill_click');
      }
    },
    [activeScenario?.id, clearAutoplayTimer, scenarios]
  );

  const goToNextScenario = useCallback(
    (source: 'auto' | 'manual' = 'auto') => activateScenario(activeIndex + 1, 1, source),
    [activeIndex, activateScenario]
  );

  const goToPreviousScenario = useCallback(
    () => activateScenario(activeIndex - 1, -1, 'manual'),
    [activeIndex, activateScenario]
  );

  useEffect(() => {
    if (!activeScenario) return;
    clearAutoplayTimer();
    completedAnimationRef.current = reduceMotion ? activeScenario.id : null;
    setPlayback({ phase: reduceMotion ? 'settled' : 'animating', scenarioId: activeScenario.id });
    recordLandingDemoEvent(activeScenario.id, 'view');
    if (reduceMotion) {
      recordLandingDemoEvent(activeScenario.id, 'animation_complete');
    }
  }, [activeScenario, clearAutoplayTimer, reduceMotion]);

  useEffect(() => {
    if (!activeScenario || scenarios.length <= 1) return;

    clearAutoplayTimer();
    autoplayTimerRef.current = window.setTimeout(() => {
      goToNextScenario('auto');
    }, getScenarioRuntimeMs(activeScenario, Boolean(reduceMotion)) + AUTO_ADVANCE_DELAY_MS);

    return clearAutoplayTimer;
  }, [activeScenario, clearAutoplayTimer, goToNextScenario, reduceMotion, scenarios.length]);

  useEffect(() => clearAutoplayTimer, [clearAutoplayTimer]);

  function handleAnimationSettled(scenarioId: string) {
    if (activeScenario?.id !== scenarioId) return;
    if (completedAnimationRef.current === scenarioId) return;
    completedAnimationRef.current = scenarioId;
    setPlayback({ phase: 'settled', scenarioId });
    recordLandingDemoEvent(scenarioId, 'animation_complete');
  }

  if (isLoading) {
    return (
      <div className="rounded-xl border border-border/70 bg-background/80 p-8 text-center text-sm text-muted-foreground">
        Loading demo...
      </div>
    );
  }

  if (error || !activeScenario) {
    return (
      <div className="rounded-xl border border-border/70 bg-background/80 p-8 text-center text-sm text-muted-foreground">
        Demo examples are temporarily unavailable.
      </div>
    );
  }

  return (
    <div className="space-y-3 sm:space-y-4">
      <div className="mx-auto flex max-w-3xl items-center gap-2 sm:gap-3">
        <CarouselArrow direction="previous" onClick={goToPreviousScenario} />
        <ActivePrompt
          prompt={activeScenario.label}
          direction={direction}
          reduceMotion={Boolean(reduceMotion)}
        />
        <CarouselArrow direction="next" onClick={() => goToNextScenario('manual')} />
      </div>
      <div className="flex justify-center gap-1.5" aria-hidden>
        {scenarios.map((scenario) => (
          <span
            key={scenario.id}
            className={`h-1.5 rounded-full transition-all ${
              scenario.id === activeScenario.id
                ? 'w-7 bg-primary'
                : 'w-1.5 bg-muted-foreground/30'
            }`}
          />
        ))}
      </div>
      <DemoStage
        scenario={activeScenario}
        stage={stage}
        direction={direction}
        reduceMotion={Boolean(reduceMotion)}
        onAnimationSettled={handleAnimationSettled}
      />
      <div className="flex justify-center">
        <a
          href="/signup"
          onClick={() => recordLandingDemoEvent(activeScenario.id, 'cta_click')}
          className="inline-flex items-center rounded-full bg-foreground px-5 py-2.5 text-sm font-semibold text-background shadow-sm transition-colors hover:bg-foreground/90"
        >
          Sign up to build your own
        </a>
      </div>
    </div>
  );
}
