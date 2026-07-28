/**
 * Capability Stage UI Component
 *
 * Displays all Capability_Containers simultaneously and collects exactly one
 * Node_Selection per container before enabling Continue.
 *
 * Layout: a sticky left-hand checklist (per-container status + why it's needed)
 * next to a right-hand pane with the actual candidate cards, so the user never
 * has to scroll back up to see overall selection progress.
 *
 * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 8.6
 */

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, ArrowLeft, ArrowRight, Wifi, WifiOff, AlertCircle, Info } from 'lucide-react';
import { motion } from 'framer-motion';
import { NODE_LAYMAN_DESCRIPTIONS } from './nodeLaymanDescriptions';
import { NodeConnectPopover } from './NodeConnectPopover';
import {
  fetchCapabilityConnectionReadiness,
  type CapabilityConnectionReadiness,
} from '@/lib/api/capabilityConnectionReadiness';
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
  onComplete: (selections: NodeSelectionMap) => void;
  onBack?: () => void;
  validationIssue?: CapabilitySelectionValidationResult | null;
  initialSelections?: NodeSelectionMap;
}

function containerAnchorId(containerId: string) {
  return `capability-container-${containerId}`;
}

function scrollToContainer(containerId: string) {
  document.getElementById(containerAnchorId(containerId))?.scrollIntoView({
    behavior: 'smooth',
    block: 'start',
  });
}

// ─── Credential Badge ─────────────────────────────────────────────────────────

/**
 * Connection state for a candidate.
 *
 * When connected, this is inert — there is nothing to do. When not connected it becomes
 * an actionable connect affordance naming the service, so the user resolves it exactly
 * where they choose the node rather than in a separate step (§2.4).
 */
function CredentialBadge({
  candidate,
  connectionState,
  onConnected,
}: {
  candidate: CandidateNode;
  connectionState: CandidateConnectionState;
  onConnected: () => void;
}) {
  if (connectionState.connected) {
    return (
      <Badge
        variant="secondary"
        className="gap-1 bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800"
      >
        <Wifi className="h-3 w-3" />
        Connected
      </Badge>
    );
  }

  const provider = connectionState.provider ?? candidate.credentialProviders?.[0];
  if (!provider) {
    // Requirement exists but no provider resolved — show state without a dead action.
    return (
      <Badge variant="outline" className="gap-1 text-muted-foreground">
        <WifiOff className="h-3 w-3" />
        Not connected
      </Badge>
    );
  }

  return (
    <NodeConnectPopover
      provider={provider}
      serviceLabel={connectionState.providerLabel ?? candidate.label}
      credentialTypeId={connectionState.credentialTypeId}
      onConnected={onConnected}
    />
  );
}

// ─── Candidate Option ─────────────────────────────────────────────────────────

/** Merged view of the cheap badge check and the authoritative readiness answer. */
interface CandidateConnectionState {
  connected: boolean;
  provider?: string;
  providerLabel?: string;
  credentialTypeId?: string;
}

interface CandidateOptionProps {
  candidate: CandidateNode;
  isSelected: boolean;
  onSelect: () => void;
  connectionState: CandidateConnectionState;
  onConnected: () => void;
}

function CandidateOption({
  candidate,
  isSelected,
  onSelect,
  connectionState,
  onConnected,
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
            <CredentialBadge
              candidate={candidate}
              connectionState={connectionState}
              onConnected={onConnected}
            />
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">{candidate.description}</p>
          {laymanDescription && (
            <p className="text-xs text-foreground/60 leading-relaxed italic">
              {laymanDescription}
            </p>
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
  connectionStateFor: (candidate: CandidateNode) => CandidateConnectionState;
  onConnected: () => void;
}

function ContainerCard({
  container,
  selectedNodeType,
  onSelect,
  index,
  connectionStateFor,
  onConnected,
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
              connectionState={connectionStateFor(candidate)}
              onConnected={onConnected}
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

  const selectedNodeTypes = Object.values(selections).filter(Boolean).sort();
  const selectedNodeTypesKey = selectedNodeTypes.join('|');

  useEffect(() => {
    if (!selectedNodeTypesKey) {
      setReadiness(null);
      return;
    }
    let cancelled = false;
    setReadinessLoading(true);
    fetchCapabilityConnectionReadiness(selectedNodeTypesKey.split('|'))
      .then((result) => {
        if (!cancelled) setReadiness(result);
      })
      .finally(() => {
        if (!cancelled) setReadinessLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedNodeTypesKey, connectionNonce]);

  const readinessByNodeType = new Map(
    (readiness?.nodes ?? []).map((node) => [node.nodeType, node]),
  );

  function connectionStateFor(candidate: CandidateNode): CandidateConnectionState {
    const authoritative = readinessByNodeType.get(candidate.nodeType);
    if (authoritative) {
      return {
        connected: authoritative.connected,
        provider: authoritative.provider,
        providerLabel: authoritative.providerLabel,
        credentialTypeId: authoritative.credentialTypeId,
      };
    }
    // Not selected (or readiness still loading): fall back to the cheap grouper check.
    return {
      connected: candidate.hasCredentials,
      provider: candidate.credentialProviders?.[0],
      providerLabel: candidate.label,
    };
  }

  // §2.4.4 — Continue gates on every *selected* node being connected. Unselected
  // candidates are irrelevant: the user is not made to connect Gmail because it was
  // offered alongside Slack.
  const unconnectedSelected = selectedNodeTypes.filter((nodeType) => {
    const authoritative = readinessByNodeType.get(nodeType);
    if (authoritative) return !authoritative.connected;
    // Before readiness resolves, fall back to the candidate badge.
    const candidate = containers
      .flatMap((container) => container.candidates)
      .find((c) => c.nodeType === nodeType);
    return candidate ? !candidate.hasCredentials : false;
  });

  const unconnectedLabels = unconnectedSelected.map((nodeType) => {
    const authoritative = readinessByNodeType.get(nodeType);
    if (authoritative?.providerLabel) return authoritative.providerLabel;
    const candidate = containers
      .flatMap((container) => container.candidates)
      .find((c) => c.nodeType === nodeType);
    return candidate?.label ?? nodeType;
  });

  const connectionsSatisfied = unconnectedSelected.length === 0;
  const isComplete = selectionsComplete && connectionsSatisfied && !readinessLoading;
  const isTriggerRequired = validation.code === 'MISSING_TRIGGER_SELECTION';
  const missingIntentSteps = validation.missingIntentSteps;
  const statusTitle = validationIssue?.title || validation.title;
  const statusMessage = validationIssue?.message || validation.message;

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
  function handleContinue() {
    if (isComplete) {
      onComplete(selections);
    }
  }

  // Req 3.1 — render containers in useCaseUnit.orderIndex order
  return (
    <div className="w-full flex flex-col gap-4 pb-24">
      {/* Header */}
      <div className="space-y-1">
        <h2 className="text-xl font-semibold">Choose your integrations</h2>
        <p className="text-sm text-muted-foreground">
          Select the integrations you need for your workflow.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 items-start lg:grid-cols-[320px_1fr]">
        {/* Left: sticky status checklist */}
        <div className="space-y-3 lg:sticky lg:top-6">
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
                    {unconnectedLabels.join(', ')} — connect from the badge on the step.
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

        {/* Right: candidate cards */}
        <div className="min-w-0 space-y-4">
          {sortedContainers.map((container, index) => (
            <ContainerCard
              key={container.containerId}
              container={container}
              selectedNodeType={selections[container.containerId]}
              onSelect={(nodeType) => handleSelect(container.containerId, nodeType)}
              index={index}
              connectionStateFor={connectionStateFor}
              onConnected={() => setConnectionNonce((n) => n + 1)}
            />
          ))}
        </div>
      </div>

      {/* Sticky action bar — always visible at bottom of viewport */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm border-t px-4 py-3 flex gap-3">
        {/* Req 3.8 — Go Back calls onBack with no state change */}
        {onBack && (
          <Button variant="outline" onClick={onBack} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Go Back
          </Button>
        )}

        {/* Req 3.4, 3.6 — disabled until isComplete */}
        <Button
          onClick={handleContinue}
          disabled={!isComplete}
          className="ml-auto gap-2"
        >
          Continue
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
