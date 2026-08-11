/**
 * Capability Stage UI Component
 *
 * Displays all Capability_Containers simultaneously and collects exactly one
 * Node_Selection per container before enabling Continue.
 *
 * Layout: a left-hand checklist (per-container status + why it's needed) next to a
 * right-hand pane with the actual candidate cards. On wide screens each pane is its
 * own scrollport, so reading down a long candidate list never drags the checklist out
 * of view — and vice versa.
 *
 * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 8.6
 */

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, ArrowLeft, ArrowRight, WifiOff, AlertCircle, Info } from 'lucide-react';
import { motion } from 'framer-motion';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { NODE_LAYMAN_DESCRIPTIONS } from './nodeLaymanDescriptions';
import { NodeConnectionChip, type NodeConnectionStatus } from './NodeConnectionChip';
import { NodeConnectFormDialog } from './NodeConnectFormDialog';
import { NodeCredentialSelector } from '@/components/nodes/NodeCredentialSelector';
import { useNodeConnect } from '@/hooks/useNodeConnect';
import type { CredentialTypeDefinition } from '@/lib/api/connections';
import {
  fetchCapabilityConnectionReadiness,
  type CapabilityConnectionReadiness,
} from '@/lib/api/capabilityConnectionReadiness';
import {
  fetchCapabilityConnectionStatus,
  type CapabilityConnectionStatusNode,
} from '@/lib/api/capabilityConnectionStatus';
import {
  type CapabilitySelectionValidationResult,
  validateCapabilitySelections,
} from '@/lib/capability-selection-validation';
import type {
  CapabilityContainer,
  CandidateNode,
  NodeSelectionMap,
} from '../../types/capability-selection';

// ─── Props ────────────────────────────────────────────────────────────────────

interface CapabilityStageProps {
  containers: CapabilityContainer[];
  onComplete: (
    selections: NodeSelectionMap,
    connectionRefsByContainerId?: Record<string, Record<string, string>>,
  ) => void;
  onBack?: () => void;
  validationIssue?: CapabilitySelectionValidationResult | null;
  initialSelections?: NodeSelectionMap;
}

/** How often to re-ask the connections system while verifying an unconfirmed connect. */
const VERIFY_INTERVAL_MS = 2_500;
/** How long to keep verifying before accepting that the connect really did fail. */
const VERIFY_TIMEOUT_MS = 120_000;

/**
 * Makes each column its own scrollport on wide screens.
 *
 * Height comes from the parent flex chain (the wizard gives this step the whole content
 * area), never from a `calc(100vh - …)` guess — the Intent Context card above this screen
 * is user-content-sized, so any fixed guess is wrong and leaves the page a second scrollbar
 * plus dead space at the bottom.
 *
 * `min-h-0` is what lets a flex child actually shrink below its content height; without it
 * the column grows to fit and pushes the scroll back up to the page.
 *
 * `overflow-x-hidden` is not redundant: per spec, `overflow-y: auto` makes a `visible`
 * x-axis compute to `auto`, so a column would sprout a horizontal scrollbar the moment its
 * content overflowed by a single pixel.
 *
 * Deliberately no `overscroll-contain`. Each column owns its own content, which is the point,
 * but once a column has nothing left to scroll the wheel should carry on into the page and
 * slide the intent card out of the way — containing it there would strand the user at the
 * bottom of a list with the extra screen height still unreachable.
 */
const COLUMN_SCROLL =
  'lg:h-full lg:min-h-0 lg:overflow-y-auto lg:overflow-x-hidden lg:pr-2';

function containerAnchorId(containerId: string) {
  return `capability-container-${containerId}`;
}

/**
 * Jump the right pane to a container. `scrollIntoView` targets the nearest scrollable
 * ancestor, which is now that pane itself on wide screens and the page below `lg` — so
 * clicking a checklist row moves only the candidate list, leaving the checklist put.
 */
function scrollToContainer(containerId: string) {
  document.getElementById(containerAnchorId(containerId))?.scrollIntoView({
    behavior: 'smooth',
    block: 'start',
  });
}

// ─── Candidate Connection State ───────────────────────────────────────────────

/** Merged view of the cheap candidate check and the authoritative readiness answer. */
interface CandidateConnectionState {
  connected: boolean;
  /**
   * Whether this node needs a credential at all. Distinct from `connected`, which is true
   * both for "verified" and for "nothing to verify" — without this a credential-free node
   * like Manual Trigger renders as green "Connected", claiming a link that does not exist.
   */
  credentialRequired: boolean;
  provider?: string;
  providerLabel?: string;
  credentialTypeId?: string;
  status?: string;
  action?: string;
  authType?: string;
  /** Readiness is still in flight for this (selected) node. */
  checking?: boolean;
  /** An OAuth popup is open for this node right now. */
  connecting?: boolean;
}

function chipStatus(state: CandidateConnectionState): NodeConnectionStatus {
  if (state.connecting) return 'connecting';
  if (state.checking) return 'checking';
  if (!state.credentialRequired) return 'not-required';
  if (state.action === 'select_connection') return 'select-connection';
  return state.connected ? 'connected' : 'needs-connection';
}

// ─── Candidate Option ─────────────────────────────────────────────────────────

interface CandidateOptionProps {
  candidate: CandidateNode;
  isSelected: boolean;
  onSelect: () => void;
  connectionState: CandidateConnectionState;
  onConnect: (candidate: CandidateNode, state: CandidateConnectionState) => void;
  selectedConnectionId?: string;
  onConnectionSelect: (connectionId: string) => void;
}

function CandidateOption({
  candidate,
  isSelected,
  onSelect,
  connectionState,
  onConnect,
  selectedConnectionId,
  onConnectionSelect,
}: CandidateOptionProps) {
  const laymanDescription = NODE_LAYMAN_DESCRIPTIONS[candidate.nodeType];
  return (
    // Deliberately a div with button semantics, not a <button>: the connect affordance
    // rendered inside is itself interactive, and a button cannot legally nest one.
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(event) => {
        if (event.target !== event.currentTarget) return;
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onSelect();
        }
      }}
      className={[
        'w-full text-left rounded-lg border p-4 transition-all duration-200 cursor-pointer',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        isSelected
          ? 'border-primary bg-primary/5 dark:bg-primary/10 shadow-sm'
          : 'border-border/60 bg-background hover:border-primary/50 hover:bg-accent/5',
      ].join(' ')}
      aria-pressed={isSelected}
    >
      <div className="flex items-start gap-3">
        {/* Radio indicator */}
        <div
          className={[
            'mt-0.5 h-4 w-4 shrink-0 rounded-full border-2 transition-colors',
            isSelected
              ? 'border-primary bg-primary'
              : 'border-muted-foreground/40',
          ].join(' ')}
          aria-hidden="true"
        >
          {isSelected && (
            <div className="h-full w-full flex items-center justify-center">
              <div className="h-1.5 w-1.5 rounded-full bg-primary-foreground" />
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 space-y-1.5">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <span className="font-medium text-sm leading-tight">{candidate.label}</span>
            <NodeConnectionChip
              status={chipStatus(connectionState)}
              nodeType={candidate.nodeType}
              serviceLabel={connectionState.providerLabel ?? candidate.label}
              provider={connectionState.provider}
              onConnect={() => onConnect(candidate, connectionState)}
            />
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">{candidate.description}</p>
          {laymanDescription && (
            <p className="text-xs text-foreground/60 leading-relaxed italic">
              {laymanDescription}
            </p>
          )}
          {isSelected && connectionState.credentialRequired && (connectionState.provider || candidate.credentialProviders?.[0]) && (
            <div
              className="pt-2"
              onClick={(event) => event.stopPropagation()}
              onKeyDown={(event) => event.stopPropagation()}
            >
              <NodeCredentialSelector
                credentialTypeIds={connectionState.credentialTypeId ? [connectionState.credentialTypeId] : []}
                providers={connectionState.credentialTypeId ? [] : [connectionState.provider || candidate.credentialProviders?.[0]].filter(Boolean)}
                logoProvider={connectionState.provider || candidate.credentialProviders?.[0]}
                value={selectedConnectionId}
                onChange={onConnectionSelect}
                label={`Use saved ${connectionState.providerLabel || connectionState.provider || candidate.label} connection`}
              />
            </div>
          )}
        </div>

        {/* Selected checkmark */}
        {isSelected && (
          <CheckCircle2 className="h-4 w-4 shrink-0 text-primary mt-0.5" aria-hidden="true" />
        )}
      </div>
    </div>
  );
}

// ─── Container Card (right pane) ───────────────────────────────────────────────

interface ContainerCardProps {
  container: CapabilityContainer;
  selectedNodeType: string | undefined;
  onSelect: (nodeType: string) => void;
  index: number;
  connectionStateFor: (candidate: CandidateNode, containerId: string) => CandidateConnectionState;
  onConnect: (
    containerId: string,
    candidate: CandidateNode,
    state: CandidateConnectionState,
  ) => void;
  selectedConnectionIdFor: (containerId: string, candidate: CandidateNode) => string | undefined;
  onConnectionSelect: (
    containerId: string,
    candidate: CandidateNode,
    state: CandidateConnectionState,
    connectionId: string,
  ) => void;
}

function ContainerCard({
  container,
  selectedNodeType,
  onSelect,
  index,
  connectionStateFor,
  onConnect,
  selectedConnectionIdFor,
  onConnectionSelect,
}: ContainerCardProps) {
  return (
    <motion.div
      id={containerAnchorId(container.containerId)}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, duration: 0.3 }}
      className="scroll-mt-6"
    >
      <Card className="border-border/80">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2">
            <div className="space-y-1">
              <CardTitle className="text-base">{container.label}</CardTitle>
              <CardDescription className="text-sm leading-relaxed">
                {container.useCaseUnit.description}
              </CardDescription>
            </div>
            {selectedNodeType && (
              <Badge variant="secondary" className="shrink-0 text-xs">
                Selected
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {container.candidates.map((candidate) => (
            <CandidateOption
              key={candidate.nodeType}
              candidate={candidate}
              isSelected={selectedNodeType === candidate.nodeType}
              onSelect={() => onSelect(candidate.nodeType)}
              connectionState={connectionStateFor(candidate, container.containerId)}
              onConnect={(c, state) => onConnect(container.containerId, c, state)}
              selectedConnectionId={selectedConnectionIdFor(container.containerId, candidate)}
              onConnectionSelect={(connectionId) => onConnectionSelect(
                container.containerId,
                candidate,
                connectionStateFor(candidate, container.containerId),
                connectionId,
              )}
            />
          ))}
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ─── Step Row (left checklist) ─────────────────────────────────────────────────

interface StepRowProps {
  container: CapabilityContainer;
  isSelected: boolean;
  isTriggerRequired: boolean;
  onJump: () => void;
}

function StepRow({ container, isSelected, isTriggerRequired, onJump }: StepRowProps) {
  const isTrigger = container.useCaseUnit.semanticRole === 'trigger';
  const showRequiredState = isTrigger && !isSelected && isTriggerRequired;

  return (
    <button
      type="button"
      onClick={onJump}
      className={[
        'w-full text-left rounded-lg border px-3 py-2.5 transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
        isSelected
          ? 'border-primary/40 bg-primary/5'
          : showRequiredState
            ? 'border-blue-300 bg-blue-50/60 dark:border-blue-900/60 dark:bg-blue-950/20'
            : 'border-border/60 bg-background hover:bg-accent/5',
      ].join(' ')}
    >
      <div className="flex items-start gap-2.5">
        {isSelected ? (
          <CheckCircle2 className="h-4 w-4 shrink-0 text-primary mt-0.5" aria-hidden="true" />
        ) : (
          <div
            className={[
              'mt-0.5 h-4 w-4 shrink-0 rounded-full border-2',
              showRequiredState ? 'border-blue-400' : 'border-muted-foreground/30',
            ].join(' ')}
            aria-hidden="true"
          />
        )}
        <div className="min-w-0 flex-1 space-y-0.5">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-sm font-medium leading-tight">{container.label}</span>
            {isTrigger && (
              <Badge variant="outline" className="h-4 px-1.5 py-0 text-[10px]">
                Trigger
              </Badge>
            )}
          </div>
          <p className="text-xs leading-snug text-muted-foreground">
            {showRequiredState
              ? 'Required — every workflow needs a starting point.'
              : container.useCaseUnit.description}
          </p>
        </div>
      </div>
    </button>
  );
}

// ─── Capability Stage ─────────────────────────────────────────────────────────

export function CapabilityStage({
  containers,
  onComplete,
  onBack,
  validationIssue,
  initialSelections = {},
}: CapabilityStageProps) {
  // Req 2.7 — no pre-selection; all selections are deferred to the user
  const [selections, setSelections] = useState<NodeSelectionMap>(initialSelections);

  // Req 3.4, 3.6 — preserve only valid prior user selections when containers change;
  // never auto-select any node the user has not explicitly chosen
  useEffect(() => {
    setSelections((prev) => {
      const next: NodeSelectionMap = {};
      for (const container of containers) {
        const current = prev[container.containerId];
        if (current && container.candidates.some((candidate) => candidate.nodeType === current)) {
          next[container.containerId] = current;
        }
        // No auto-selection for single-candidate containers — user must choose explicitly
      }
      return next;
    });
  }, [containers]);

  /**
   * Authoritative, scope-aware connection state for the *selected* node types.
   *
   * Deliberately not fetched for every candidate: the backend path behind this can
   * refresh OAuth tokens as a side effect (see the endpoint's own note), so it must
   * only ever run over nodes the user actually picked. Until it resolves, the cheap
   * per-candidate `hasCredentials` from the grouper stage stands in.
   */
  const [readiness, setReadiness] = useState<CapabilityConnectionReadiness | null>(null);
  const [readinessLoading, setReadinessLoading] = useState(false);
  const [connectionNonce, setConnectionNonce] = useState(0);

  /** Presence-only status for every candidate — the base layer under `readiness`. */
  const [connectionStatus, setConnectionStatus] = useState<
    CapabilityConnectionStatusNode[] | null
  >(null);
  const [statusLoading, setStatusLoading] = useState(false);

  /**
   * Connect straight from the chip. OAuth providers open their popup on the click itself —
   * no intermediate panel, because for them a panel would contain nothing but the button
   * that was just clicked. Only providers needing typed input open the form dialog.
   */
  const { connect } = useNodeConnect();
  const [formTarget, setFormTarget] = useState<{
    credentialType: CredentialTypeDefinition | null;
    provider: string;
    serviceLabel: string;
    nodeType: string;
  } | null>(null);
  const [connectError, setConnectError] = useState<string | null>(null);

  /**
   * Which candidate is mid-connect, keyed by container AND node type.
   *
   * Keyed on node type alone, one click lit up every candidate sharing that type — a workflow
   * posting to Slack in two branches showed both chips spinning from a single click.
   */
  const [connectingKey, setConnectingKey] = useState<string | null>(null);

  /**
   * A connect whose outcome the popup could not confirm, now being verified against the
   * connections system. `message` is only shown if verification never succeeds.
   */
  const [pendingVerification, setPendingVerification] = useState<{
    nodeType: string;
    message: string;
  } | null>(null);
  const [selectedConnectionRefs, setSelectedConnectionRefs] = useState<
    Record<string, { connectionId: string; provider: string; credentialTypeId?: string }>
  >({});

  function candidateKey(containerId: string, nodeType: string) {
    return `${containerId}::${nodeType}`;
  }

  function connectionRefsForKey(key: string): Record<string, string> {
    const selected = selectedConnectionRefs[key];
    if (!selected?.connectionId) return {};
    const refs: Record<string, string> = {};
    if (selected.provider) {
      refs[selected.provider] = selected.connectionId;
      refs[`${selected.provider}_connection`] = selected.connectionId;
      refs[`${selected.provider}_oauth2`] = selected.connectionId;
      refs[`${selected.provider}_api_key`] = selected.connectionId;
      refs[`${selected.provider}_token`] = selected.connectionId;
    }
    if (selected.credentialTypeId) refs[selected.credentialTypeId] = selected.connectionId;
    return refs;
  }

  /**
   * Nodes the user connected from their chip during this session, whether or not they are
   * selected. Readiness must be asked about these too, or the chip cannot turn green — see
   * `readinessNodeTypes` below.
   */
  const [connectedNodeTypes, setConnectedNodeTypes] = useState<string[]>([]);

  function markConnected(nodeType: string) {
    setConnectedNodeTypes((prev) => (prev.includes(nodeType) ? prev : [...prev, nodeType]));
    setConnectionNonce((n) => n + 1);
  }

  async function handleConnect(
    containerId: string,
    candidate: CandidateNode,
    state: CandidateConnectionState,
  ) {
    setConnectError(null);
    const serviceLabel = state.providerLabel ?? candidate.label;
    const provider = state.provider ?? '';

    setConnectingKey(candidateKey(containerId, candidate.nodeType));
    let outcome;
    try {
      outcome = await connect({
        nodeType: candidate.nodeType,
        provider: state.provider,
        credentialTypeId: state.credentialTypeId,
      });
    } finally {
      setConnectingKey(null);
    }

    if (outcome.kind === 'connected') {
      markConnected(candidate.nodeType);
      return;
    }
    if (outcome.kind === 'needs-form') {
      setFormTarget({
        credentialType: outcome.credentialType,
        provider,
        serviceLabel,
        nodeType: candidate.nodeType,
      });
      return;
    }
    if (outcome.kind === 'unsupported') {
      // No credential type maps to this provider — still not a dead end: the dialog offers
      // the Connections page.
      setFormTarget({ credentialType: null, provider, serviceLabel, nodeType: candidate.nodeType });
      return;
    }

    // `unverified` — the popup could not confirm the result, which is NOT the same as failing.
    // Ask the connections system directly before telling the user anything went wrong.
    setPendingVerification({ nodeType: candidate.nodeType, message: outcome.message });
  }

  // Req 3.5 — selecting a node replaces any prior selection in that container
  // Clicking an already-selected node deselects it (toggle off)
  // Req 3.8 — no backend call on selection change
  const sortedContainers = [...containers].sort(
    (a, b) => a.useCaseUnit.orderIndex - b.useCaseUnit.orderIndex,
  );
  const selectedCount = Object.keys(selections).length;
  const totalCount = containers.length;
  const validation = validateCapabilitySelections(containers, selections);
  const selectionsComplete =
    totalCount > 0 && validation.valid && validation.invalidSelections.length === 0;

  // Deduplicated: the same node type can be chosen in several containers (a workflow that
  // posts to Slack on two branches). Without this the gate notice read "2 services still need
  // connecting — Slack, Slack".
  const selectedNodeTypes = Array.from(
    new Set(Object.values(selections).filter(Boolean)),
  ).sort();

  /**
   * Node types to ask readiness about: the user's selections, plus any node they connected
   * from its chip.
   *
   * The connected ones have to be included or the chip never turns green. `hasCredentials`
   * is computed server-side when the containers are generated and never changes afterwards,
   * and readiness is the only thing that can revise it — so connecting a node the user has
   * not selected yet would leave it showing "Connect" forever despite the connection having
   * saved successfully.
   *
   * This does not loosen the selected-nodes-only rule. That rule exists because the readiness
   * path can refresh OAuth tokens as a side effect, so it must not sweep the whole candidate
   * catalogue. These are nodes the user just explicitly connected — the narrowest possible
   * addition, and they have this instant completed an OAuth grant for exactly this provider.
   */
  const readinessNodeTypes = Array.from(
    new Set([...selectedNodeTypes, ...connectedNodeTypes]),
  ).sort();
  const readinessNodeTypesKey = readinessNodeTypes.join('|');
  const selectedReadinessNodes = sortedContainers
    .map((container) => {
      const nodeType = selections[container.containerId];
      if (!nodeType) return null;
      const key = candidateKey(container.containerId, nodeType);
      return {
        nodeId: key,
        nodeType,
        connectionRefs: connectionRefsForKey(key),
      };
    })
    .filter(Boolean) as Array<{ nodeId: string; nodeType: string; connectionRefs: Record<string, string> }>;
  const selectedReadinessNodesKey = JSON.stringify(selectedReadinessNodes);

  /**
   * Live connection status for EVERY candidate, fetched before the user touches anything.
   *
   * Without this the chips render from `candidate.hasCredentials`, which the worker computes
   * when the containers are generated and never revises — so a service connected weeks ago
   * still shows "Connect". This endpoint is presence-only (one read, no token resolution or
   * refresh), which is what makes it safe to run across the whole list; the scope-aware
   * readiness answer still runs for selected nodes and overrides it.
   */
  const allCandidateNodeTypes = Array.from(
    new Set(containers.flatMap((container) => container.candidates.map((c) => c.nodeType))),
  ).sort();
  const allCandidateNodeTypesKey = allCandidateNodeTypes.join('|');

  useEffect(() => {
    if (!allCandidateNodeTypesKey) {
      setConnectionStatus(null);
      return;
    }
    let cancelled = false;
    setStatusLoading(true);
    fetchCapabilityConnectionStatus(allCandidateNodeTypesKey.split('|'))
      .then((result) => {
        if (!cancelled) setConnectionStatus(result.nodes);
      })
      .finally(() => {
        if (!cancelled) setStatusLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [allCandidateNodeTypesKey, connectionNonce]);

  const statusByNodeType = new Map(
    (connectionStatus ?? []).map((node) => [node.nodeType, node]),
  );

  /**
   * Poll the connections system for a connect the popup could not confirm.
   *
   * This is what makes connecting work regardless of where the OAuth callback lands: the
   * success message travels on a same-origin channel and is lost whenever the callback
   * completes on another origin, but the saved connection is still visible here.
   *
   * Bounded so a genuinely cancelled connect eventually reports itself rather than polling
   * forever, and cancelled on unmount so it cannot outlive the screen.
   */
  useEffect(() => {
    if (!pendingVerification) return;
    const target = pendingVerification;
    const startedAt = Date.now();
    let cancelled = false;
    let timer: number | undefined;

    async function check() {
      if (cancelled) return;
      const result = await fetchCapabilityConnectionStatus([target.nodeType]);
      if (cancelled) return;

      const node = result.nodes.find((n) => n.nodeType === target.nodeType);
      if (node && (node.connected || !node.credentialRequired)) {
        markConnected(target.nodeType);
        setPendingVerification(null);
        return;
      }
      if (Date.now() - startedAt >= VERIFY_TIMEOUT_MS) {
        // Only now is it fair to call this a failure.
        setConnectError(target.message);
        setPendingVerification(null);
        return;
      }
      timer = window.setTimeout(check, VERIFY_INTERVAL_MS);
    }

    timer = window.setTimeout(check, VERIFY_INTERVAL_MS);
    return () => {
      cancelled = true;
      if (timer !== undefined) window.clearTimeout(timer);
    };
  }, [pendingVerification]);

  /**
   * Re-check whenever the user returns to this tab.
   *
   * Covers connecting anywhere else — the /connections page in another tab, or an OAuth popup
   * whose result never reached us. Coming back to the wizard is the natural moment to reconcile.
   */
  useEffect(() => {
    function refresh() {
      if (document.visibilityState === 'visible') setConnectionNonce((n) => n + 1);
    }
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);
    return () => {
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, []);

  useEffect(() => {
    if (!readinessNodeTypesKey && selectedReadinessNodes.length === 0) {
      setReadiness(null);
      return;
    }
    let cancelled = false;
    setReadinessLoading(true);
    fetchCapabilityConnectionReadiness(
      readinessNodeTypesKey ? readinessNodeTypesKey.split('|') : [],
      undefined,
      selectedReadinessNodes,
    )
      .then((result) => {
        if (!cancelled) setReadiness(result);
      })
      .finally(() => {
        if (!cancelled) setReadinessLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [readinessNodeTypesKey, selectedReadinessNodesKey, connectionNonce]);

  const readinessByNodeType = new Map(
    (readiness?.nodes ?? []).map((node) => [node.nodeType, node]),
  );
  const readinessByNodeId = new Map(
    (readiness?.nodes ?? []).filter((node) => node.nodeId).map((node) => [node.nodeId as string, node]),
  );

  /**
   * Three sources, most authoritative first:
   *
   *   1. readiness      scope-aware, SELECTED nodes only (can refresh tokens — never fanned out)
   *   2. live status    presence-only, every candidate, safe to run across the whole list
   *   3. candidate      computed at container-generation time; correct requiredness, stale connectedness
   */
  function connectionStateFor(
    candidate: CandidateNode,
    containerId: string,
  ): CandidateConnectionState {
    // Only the clicked chip spins — plus whichever node is being verified, since that is still
    // an in-flight connect from the user's point of view.
    const connecting =
      connectingKey === candidateKey(containerId, candidate.nodeType) ||
      pendingVerification?.nodeType === candidate.nodeType;
    const readinessPending =
      readinessNodeTypes.includes(candidate.nodeType) && readinessLoading;

    const authoritative =
      readinessByNodeId.get(candidateKey(containerId, candidate.nodeType)) ||
      readinessByNodeType.get(candidate.nodeType);
    if (authoritative) {
      return {
        connected: authoritative.connected,
        // A worker deployed behind the frontend won't send this field. Infer from the
        // presence of a provider, which readiness only sets for nodes it actually gated.
        credentialRequired: authoritative.credentialRequired ?? Boolean(authoritative.provider),
        provider: authoritative.provider,
        providerLabel: authoritative.providerLabel,
        credentialTypeId: authoritative.credentialTypeId,
        status: authoritative.status,
        action: authoritative.action,
        authType: authoritative.authType,
        connecting,
      };
    }

    const live = statusByNodeType.get(candidate.nodeType);
    if (live) {
      // Note: no `checking` on a refresh. Once a state is known it stays on screen while the
      // next check runs — replacing every chip with a spinner after each connection made the
      // whole list flicker.
      return {
        connected: live.connected,
        credentialRequired: live.credentialRequired,
        provider: live.provider,
        providerLabel: candidate.label,
        checking: readinessPending,
        connecting,
      };
    }

    // `credentialRequirements.length` is NOT usable here — it is empty for google_sheets,
    // airtable and slack_message, which all need a credential, so measuring it rendered them
    // as "No setup needed". The worker sends an explicit answer; fall back to the presence of
    // a provider when talking to a worker that predates the field.
    const credentialRequired =
      candidate.credentialRequired ?? (candidate.credentialProviders?.length ?? 0) > 0;

    // Only wait on the very first status fetch, and only where the answer can still change.
    // A credential-free node is already settled, and flashing "Connect" before flipping to
    // "Connected" a moment later would be worse than a brief, honest "Checking…".
    const awaitingFirstStatus = statusLoading && credentialRequired;

    return {
      connected: candidate.hasCredentials,
      credentialRequired,
      provider: candidate.credentialProviders?.[0],
      providerLabel: candidate.label,
      checking: awaitingFirstStatus || readinessPending,
      connecting,
    };
  }

  // §2.4.4 — Continue gates on every *selected* node being connected. Unselected
  // candidates are irrelevant: the user is not made to connect Gmail because it was
  // offered alongside Slack.
  const selectedEntries = sortedContainers
    .map((container) => {
      const nodeType = selections[container.containerId];
      if (!nodeType) return null;
      const candidate = container.candidates.find((c) => c.nodeType === nodeType);
      return {
        containerId: container.containerId,
        nodeType,
        key: candidateKey(container.containerId, nodeType),
        label: candidate?.label ?? nodeType,
        candidate,
      };
    })
    .filter(Boolean) as Array<{
      containerId: string;
      nodeType: string;
      key: string;
      label: string;
      candidate?: CandidateNode;
    }>;

  const unconnectedSelected = selectedEntries.filter((entry) => {
    const authoritative = readinessByNodeId.get(entry.key) || readinessByNodeType.get(entry.nodeType);
    if (authoritative) return !authoritative.connected;
    // Before readiness resolves, prefer the live presence check over the candidate payload,
    // which was computed at container-generation time and never revised.
    const live = statusByNodeType.get(entry.nodeType);
    if (live) return !live.connected;
    return entry.candidate ? !entry.candidate.hasCredentials : false;
  });

  const unconnectedLabels = unconnectedSelected.map((entry) => {
    const authoritative = readinessByNodeId.get(entry.key) || readinessByNodeType.get(entry.nodeType);
    if (authoritative?.providerLabel) return authoritative.providerLabel;
    return entry.label;
  });

  const connectionsSatisfied = unconnectedSelected.length === 0;
  const isComplete = selectionsComplete && connectionsSatisfied && !readinessLoading;
  const isTriggerRequired = validation.code === 'MISSING_TRIGGER_SELECTION';
  const missingIntentSteps = validation.missingIntentSteps;
  const statusTitle = validationIssue?.title || validation.title;
  const statusMessage = validationIssue?.message || validation.message;

  /**
   * Why Continue is disabled, in the order the user can act on it: finish selecting, wait for
   * the check, then connect what's missing. Null when Continue is enabled.
   */
  const blockedReason: string | null = (() => {
    if (isComplete) return null;
    if (!selectionsComplete) return statusMessage || 'Select a node for every step to continue.';
    if (readinessLoading) return 'Checking connections…';
    if (!connectionsSatisfied) {
      return `Connect all selected nodes first — ${unconnectedLabels.join(', ')}`;
    }
    return 'Finish the remaining steps to continue.';
  })();

  function handleSelect(containerId: string, nodeType: string) {
    setSelections((prev) => {
      if (prev[containerId] === nodeType) {
        const next = { ...prev };
        delete next[containerId];
        return next;
      }
      return { ...prev, [containerId]: nodeType };
    });
  }

  // Req 3.7 — Continue is the only action that triggers downstream processing
  function selectedConnectionIdFor(containerId: string, candidate: CandidateNode): string | undefined {
    return selectedConnectionRefs[candidateKey(containerId, candidate.nodeType)]?.connectionId;
  }

  function handleConnectionSelect(
    containerId: string,
    candidate: CandidateNode,
    state: CandidateConnectionState,
    connectionId: string,
  ) {
    const key = candidateKey(containerId, candidate.nodeType);
    setSelectedConnectionRefs((prev) => ({
      ...prev,
      [key]: {
        connectionId,
        provider: state.provider || candidate.credentialProviders?.[0] || '',
        credentialTypeId: state.credentialTypeId,
      },
    }));
    setConnectionNonce((n) => n + 1);
  }

  function handleContinue() {
    if (isComplete) {
      const connectionRefsByContainerId: Record<string, Record<string, string>> = {};
      for (const entry of selectedEntries) {
        const refs = connectionRefsForKey(entry.key);
        if (Object.keys(refs).length > 0) {
          connectionRefsByContainerId[entry.containerId] = refs;
        }
      }
      onComplete(selections, connectionRefsByContainerId);
    }
  }

  // Req 3.1 — render containers in useCaseUnit.orderIndex order
  return (
    // On wide screens this fills the height the wizard hands it and scrolls nothing itself —
    // only the two columns scroll. Below `lg` the columns stack and the page scrolls. `pb-20`
    // applies at both sizes because the action bar is pinned at both: it is the bar's
    // footprint, not slack, so the columns end just above it rather than under it.
    <div className="w-full flex flex-col gap-4 pb-20 lg:h-full lg:min-h-0">
      {/* Header */}
      <div className="space-y-1 lg:shrink-0">
        <h2 className="text-xl font-semibold">Choose your integrations</h2>
        <p className="text-sm text-muted-foreground">
          Select the integrations you need for your workflow.
        </p>
      </div>

      {/* `lg:flex-1` takes exactly the height left over — no more, no less — so the columns
          fill the screen and the stage never overflows. `lg:min-h-0` is what permits the "no
          more" half: without it a flex child refuses to shrink below its content.

          A `min-h` floor here instead would overflow the root whenever it bound, and an
          overflowing child escapes the root's bottom padding — which is how the last card
          ended up underneath the action bar. Keeping the panes usable is the intent card's
          job (it is clamped upstream), not a floor's. */}
      <div className="grid grid-cols-1 gap-6 items-start lg:grid-cols-[320px_1fr] lg:flex-1 lg:min-h-0 lg:items-stretch">
        {/* Left: status checklist — scrolls on its own, independent of the candidate pane */}
        <div className={['space-y-3', COLUMN_SCROLL].join(' ')} data-testid="capability-steps-pane">
          <div className="space-y-2 rounded-lg border border-border/70 bg-card/50 p-4">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold">Workflow steps</h3>
              <span className="text-xs font-medium text-muted-foreground">
                {selectedCount} of {totalCount} selected
              </span>
            </div>
            {!validation.valid && (
              <div className="flex items-start gap-1.5 rounded-md border border-blue-200 bg-blue-50 px-2.5 py-2 dark:border-blue-900/60 dark:bg-blue-950/30">
                <AlertCircle className="h-3.5 w-3.5 shrink-0 text-blue-600 dark:text-blue-300 mt-0.5" />
                <div>
                  <p className="text-xs font-medium text-blue-950 dark:text-blue-100">{statusTitle}</p>
                  <p className="text-xs text-blue-900/80 dark:text-blue-100/75">{statusMessage}</p>
                </div>
              </div>
            )}
            {/* A failed or cancelled OAuth popup leaves no other trace on screen. */}
            {connectError && (
              <div
                className="flex items-start gap-1.5 rounded-md border border-red-200 bg-red-50 px-2.5 py-2 dark:border-red-900/60 dark:bg-red-950/30"
                data-testid="connect-error"
              >
                <AlertCircle className="h-3.5 w-3.5 shrink-0 text-red-600 dark:text-red-300 mt-0.5" />
                <p className="text-xs text-red-900/90 dark:text-red-100/80">{connectError}</p>
              </div>
            )}
            {/* §2.4.4 — name the specific services still needing a connection */}
            {validation.valid && unconnectedLabels.length > 0 && (
              <div
                className="flex items-start gap-1.5 rounded-md border border-amber-200 bg-amber-50 px-2.5 py-2 dark:border-amber-900/60 dark:bg-amber-950/30"
                data-testid="connection-gate-notice"
              >
                <WifiOff className="h-3.5 w-3.5 shrink-0 text-amber-600 dark:text-amber-300 mt-0.5" />
                <div>
                  <p className="text-xs font-medium text-amber-950 dark:text-amber-100">
                    {unconnectedLabels.length === 1
                      ? 'One service still needs connecting'
                      : `${unconnectedLabels.length} services still need connecting`}
                  </p>
                  <p className="text-xs text-amber-900/80 dark:text-amber-100/75">
                    {unconnectedLabels.join(', ')} — use the Connect button on the step.
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-2">
            {sortedContainers.map((container) => (
              <StepRow
                key={container.containerId}
                container={container}
                isSelected={Boolean(selections[container.containerId])}
                isTriggerRequired={isTriggerRequired}
                onJump={() => scrollToContainer(container.containerId)}
              />
            ))}
          </div>

          {isComplete && missingIntentSteps.length > 0 && (
            <div className="flex items-start gap-1.5 rounded-md border border-amber-200 bg-amber-50 px-2.5 py-2 dark:border-amber-900/60 dark:bg-amber-950/30">
              <Info className="h-3.5 w-3.5 shrink-0 text-amber-600 dark:text-amber-300 mt-0.5" />
              <p className="text-xs text-amber-900/90 dark:text-amber-100/80">
                You can continue, but {missingIntentSteps.length === 1 ? "1 step from your original request isn't" : `${missingIntentSteps.length} steps from your original request aren't`} selected yet.
              </p>
            </div>
          )}
        </div>

        {/* Right: candidate cards — scrolls on its own, independent of the checklist */}
        <div
          className={['min-w-0 space-y-4', COLUMN_SCROLL].join(' ')}
          data-testid="capability-candidates-pane"
        >
          {sortedContainers.map((container, index) => (
            <ContainerCard
              key={container.containerId}
              container={container}
              selectedNodeType={selections[container.containerId]}
              onSelect={(nodeType) => handleSelect(container.containerId, nodeType)}
              index={index}
              connectionStateFor={connectionStateFor}
              onConnect={handleConnect}
              selectedConnectionIdFor={selectedConnectionIdFor}
              onConnectionSelect={handleConnectionSelect}
            />
          ))}
        </div>
      </div>

      {/* Action bar — pinned to the viewport at every size, spanning its full width, so Go
          Back and Continue are reachable without scrolling no matter which pane the user is
          in or how far down the page has gone. The root's `pb-20` reserves its footprint so
          it never covers the last card. Buttons are held to the same `max-w-7xl` as the
          content above, so they line up with the columns instead of drifting to the edges. */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm border-t px-4 py-3">
      <div className="mx-auto flex w-full max-w-7xl gap-3">
        {/* Req 3.8 — Go Back calls onBack with no state change */}
        {onBack && (
          <Button variant="outline" onClick={onBack} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Go Back
          </Button>
        )}

        {/* Req 3.4, 3.6 — disabled until isComplete */}
        <TooltipProvider>
          <Tooltip>
            {/* A disabled button emits no pointer events, so the tooltip must hang off a
                wrapper. tabIndex keeps the explanation reachable by keyboard. */}
            <TooltipTrigger asChild>
              <span className="ml-auto inline-flex" tabIndex={blockedReason ? 0 : -1}>
                <Button
                  onClick={handleContinue}
                  disabled={!isComplete}
                  aria-disabled={!isComplete}
                  title={blockedReason ?? undefined}
                  className="gap-2"
                >
                  Continue
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </span>
            </TooltipTrigger>
            {blockedReason && (
              <TooltipContent side="top" data-testid="continue-blocked-reason">
                {blockedReason}
              </TooltipContent>
            )}
          </Tooltip>
        </TooltipProvider>
      </div>
      </div>

      {/* Only opens for providers that need typed input — OAuth connects from the chip
          itself. Stays in-page either way: the wizard's generated state is React-only, so
          navigating to /connections would discard it. */}
      <NodeConnectFormDialog
        open={formTarget !== null}
        onOpenChange={(open) => {
          if (!open) setFormTarget(null);
        }}
        credentialType={formTarget?.credentialType ?? null}
        provider={formTarget?.provider ?? ''}
        serviceLabel={formTarget?.serviceLabel ?? ''}
        onConnected={() => {
          if (formTarget) markConnected(formTarget.nodeType);
        }}
      />
    </div>
  );
}
