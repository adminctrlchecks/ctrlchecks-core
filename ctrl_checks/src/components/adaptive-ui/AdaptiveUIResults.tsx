import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { GuidedStatusCard } from '@/components/ui/guided-status-card';
import type { GuidedStatusTone } from '@/lib/workflow-guidance';
import type {
  AdaptiveUIResponse,
  ContextualHelpItem,
  SetupGuideItem,
  SetupGuideItemKind,
} from '@/types/adaptive-ui';

const SETUP_GUIDE_TONE: Record<SetupGuideItemKind, GuidedStatusTone> = {
  credential: 'connection',
  input: 'configuration',
  validation: 'attention',
};

const HELP_CONFIDENCE_TONE: Record<ContextualHelpItem['confidence'], GuidedStatusTone> = {
  high: 'success',
  medium: 'configuration',
  low: 'attention',
};

function CapabilitiesSection({ capabilities }: { capabilities: AdaptiveUIResponse['capabilities'] }) {
  if (capabilities.length === 0) return null;

  return (
    <section className="space-y-3">
      <h2 className="text-sm font-semibold text-foreground">Capabilities</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        {capabilities.map((container) => (
          <Card key={container.containerId} className="glass">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">{container.label}</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-1.5">
              {container.candidates.map((candidate) => (
                <Badge
                  key={candidate.nodeType}
                  variant={candidate.hasCredentials ? 'default' : 'outline'}
                  className="text-xs"
                >
                  {candidate.label}
                </Badge>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}

function RecommendedNodesSection({ nodes }: { nodes: AdaptiveUIResponse['recommendedNodes'] }) {
  if (nodes.length === 0) return null;

  return (
    <section className="space-y-3">
      <h2 className="text-sm font-semibold text-foreground">Recommended nodes</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        {nodes.map((node) => (
          <Card key={node.nodeType} className="glass">
            <CardContent className="flex items-start justify-between gap-2 p-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground">{node.label}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{node.reason}</p>
              </div>
              <Badge variant={node.hasCredentials ? 'default' : 'outline'} className="shrink-0 text-xs">
                {node.hasCredentials ? 'Ready' : 'Needs connection'}
              </Badge>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}

function SetupGuideSection({ items }: { items: SetupGuideItem[] }) {
  if (items.length === 0) return null;

  return (
    <section className="space-y-3">
      <h2 className="text-sm font-semibold text-foreground">Setup guide</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        {items.map((item) => (
          <GuidedStatusCard
            key={item.id}
            title={item.label}
            description={item.description || `Status: ${item.status.replace('_', ' ')}`}
            tone={SETUP_GUIDE_TONE[item.kind]}
          />
        ))}
      </div>
    </section>
  );
}

function ContextualHelpSection({ items }: { items: ContextualHelpItem[] }) {
  if (items.length === 0) return null;

  return (
    <section className="space-y-3">
      <h2 className="text-sm font-semibold text-foreground">Suggestions</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        {items.map((item, index) => (
          <GuidedStatusCard
            key={`${item.title}-${index}`}
            title={item.title}
            description={item.tooltip}
            resolution={item.expanded_help || undefined}
            nextSteps={item.suggested_action ? [item.suggested_action] : []}
            tone={HELP_CONFIDENCE_TONE[item.confidence]}
          />
        ))}
      </div>
    </section>
  );
}

export function AdaptiveUIResults({ result }: { result: AdaptiveUIResponse }) {
  const hasAnyContent =
    result.capabilities.length > 0 ||
    result.recommendedNodes.length > 0 ||
    result.setupGuide.length > 0 ||
    result.contextualHelp.length > 0;

  if (!hasAnyContent) return null;

  return (
    <div className="space-y-8">
      <CapabilitiesSection capabilities={result.capabilities} />
      <RecommendedNodesSection nodes={result.recommendedNodes} />
      <SetupGuideSection items={result.setupGuide} />
      <ContextualHelpSection items={result.contextualHelp} />
    </div>
  );
}
