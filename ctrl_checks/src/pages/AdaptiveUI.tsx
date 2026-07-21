/**
 * Adaptive UI Engine — standalone entry point.
 *
 * Personalizes capability suggestions, node recommendations, a setup guide,
 * and short contextual tips from a free-text intent, using the existing
 * capability-selection pipeline, credential/connection readiness, and node
 * registry (via POST /api/adaptive-ui) — no new node/credential system.
 */

import { useState } from 'react';
import { RotateCcw, RefreshCw, Sparkles } from 'lucide-react';
import { AppChromeHeader } from '@/components/layout/AppChromeHeader';
import { WorkflowAuthGate } from '@/components/WorkflowAuthGate';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useAdaptiveUI } from '@/hooks/useAdaptiveUI';
import { AdaptiveUIResults } from '@/components/adaptive-ui/AdaptiveUIResults';

const EXAMPLE_INTENTS = [
  'Notify our team on Slack when Stripe payment fails',
  'Create Jira ticket from Gmail',
  'Sync Notion database every day',
];

function ResultsSkeleton() {
  return (
    <div className="grid gap-3 sm:grid-cols-2" aria-hidden="true">
      {[0, 1, 2, 3].map((key) => (
        <div key={key} className="animate-pulse space-y-2 rounded-lg border border-border/50 bg-card p-4">
          <div className="h-4 w-2/3 rounded bg-muted" />
          <div className="h-3 w-full rounded bg-muted" />
          <div className="h-3 w-4/5 rounded bg-muted" />
        </div>
      ))}
    </div>
  );
}

export default function AdaptiveUI() {
  const [intent, setIntent] = useState('');
  const { data, isLoading, isError, error, generate, regenerate, retry, reset } = useAdaptiveUI();

  const handleGenerate = () => {
    if (!intent.trim()) return;
    generate({ intent: intent.trim() });
  };

  const handleReset = () => {
    setIntent('');
    reset();
  };

  const hasResult = Boolean(data);

  return (
    <div className="min-h-screen bg-background">
      <AppChromeHeader />
      <div className="container mx-auto max-w-4xl space-y-6 p-6">
        <WorkflowAuthGate>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Adaptive UI</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Describe what you want to automate — suggestions are personalized to your connected accounts and
              current plan.
            </p>
          </div>

          <Card>
            <CardContent className="space-y-3 p-4">
              <Textarea
                value={intent}
                onChange={(event) => setIntent(event.target.value)}
                placeholder='e.g. "Notify our team on Slack when Stripe payment fails"'
                rows={3}
                disabled={isLoading}
              />

              <div className="flex flex-wrap gap-1.5">
                {EXAMPLE_INTENTS.map((example) => (
                  <button
                    key={example}
                    type="button"
                    onClick={() => setIntent(example)}
                    disabled={isLoading}
                    className="rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
                  >
                    {example}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2">
                <Button onClick={handleGenerate} disabled={isLoading || !intent.trim()}>
                  <Sparkles className="mr-1.5 h-4 w-4" />
                  {isLoading ? 'Generating…' : 'Generate'}
                </Button>
                {hasResult && (
                  <>
                    <Button variant="outline" onClick={regenerate} disabled={isLoading}>
                      <RefreshCw className="mr-1.5 h-4 w-4" />
                      Regenerate
                    </Button>
                    <Button variant="ghost" onClick={handleReset} disabled={isLoading}>
                      <RotateCcw className="mr-1.5 h-4 w-4" />
                      Reset
                    </Button>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          {isLoading && <ResultsSkeleton />}

          {isError && !isLoading && (
            <Alert variant="destructive">
              <AlertTitle>Couldn't generate suggestions</AlertTitle>
              <AlertDescription className="flex items-center justify-between gap-3">
                <span>{error?.message || 'Something went wrong. Try again.'}</span>
                <Button size="sm" variant="outline" onClick={retry}>
                  Retry
                </Button>
              </AlertDescription>
            </Alert>
          )}

          {!isLoading && !isError && data?.fallback && (
            <Alert>
              <AlertTitle>Not enough to go on yet</AlertTitle>
              <AlertDescription className="flex items-center justify-between gap-3">
                <span>{data.fallback.message}</span>
                <Button size="sm" variant="outline" onClick={retry}>
                  Retry
                </Button>
              </AlertDescription>
            </Alert>
          )}

          {!isLoading && !isError && data && !data.fallback && <AdaptiveUIResults result={data} />}

          {!isLoading && !isError && !data && (
            <p className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
              Enter what you want to automate above, or pick an example, to see personalized suggestions.
            </p>
          )}
        </WorkflowAuthGate>
      </div>
    </div>
  );
}
