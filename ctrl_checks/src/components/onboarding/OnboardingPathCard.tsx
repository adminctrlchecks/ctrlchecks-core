import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, X, RefreshCw, RotateCcw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { useOnboarding } from '@/hooks/useOnboarding';
import type { OnboardingStep } from '@/types/onboarding';

const GOAL_PRESETS = [
  'Automate a repetitive task',
  'Connect two apps together',
  'Get notified about something important',
  'Sync data between tools',
];

const GOAL_MAX_LENGTH = 200;

const PRIORITY_VARIANT: Record<OnboardingStep['priority'], 'default' | 'secondary' | 'outline'> = {
  high: 'default',
  medium: 'secondary',
  low: 'outline',
};

function GoalCapture({ onSubmit, isSubmitting }: { onSubmit: (goal: string) => void; isSubmitting: boolean }) {
  const [customGoal, setCustomGoal] = useState('');
  const [showCustom, setShowCustom] = useState(false);

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium text-foreground">What are you trying to accomplish today?</p>
      <div className="flex flex-wrap gap-1.5">
        {GOAL_PRESETS.map((preset) => (
          <button
            key={preset}
            type="button"
            disabled={isSubmitting}
            onClick={() => onSubmit(preset)}
            className="rounded-full border border-border px-3 py-1.5 text-xs text-foreground transition-colors hover:bg-muted disabled:opacity-50"
          >
            {preset}
          </button>
        ))}
        <button
          type="button"
          disabled={isSubmitting}
          onClick={() => setShowCustom(true)}
          className={cn(
            'rounded-full border px-3 py-1.5 text-xs transition-colors disabled:opacity-50',
            showCustom ? 'border-primary bg-primary/10 text-primary' : 'border-border text-foreground hover:bg-muted',
          )}
        >
          Other
        </button>
      </div>

      {showCustom && (
        <div className="flex items-center gap-2">
          <Input
            value={customGoal}
            onChange={(event) => setCustomGoal(event.target.value.slice(0, GOAL_MAX_LENGTH))}
            placeholder="Describe what you want to do…"
            maxLength={GOAL_MAX_LENGTH}
            disabled={isSubmitting}
            className="h-9 text-sm"
          />
          <span className="shrink-0 text-[11px] text-muted-foreground">
            {customGoal.length}/{GOAL_MAX_LENGTH}
          </span>
          <Button size="sm" disabled={isSubmitting || !customGoal.trim()} onClick={() => onSubmit(customGoal.trim())}>
            Go
          </Button>
        </div>
      )}
    </div>
  );
}

function StepRow({
  step,
  isDone,
  onComplete,
  onSkip,
  disabled,
}: {
  step: OnboardingStep;
  isDone: boolean;
  onComplete: (actionTarget: string) => void;
  onSkip: (actionTarget: string) => void;
  disabled: boolean;
}) {
  const navigate = useNavigate();

  return (
    <div className="flex items-start gap-3 rounded-lg border border-border/60 p-3">
      <Checkbox
        checked={isDone}
        disabled={disabled || isDone}
        onCheckedChange={(checked) => checked && onComplete(step.action_target)}
        className="mt-1"
        aria-label={`Mark "${step.title}" complete`}
      />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className={cn('text-sm font-medium text-foreground', isDone && 'text-muted-foreground line-through')}>
            {step.title}
          </p>
          <Badge variant={PRIORITY_VARIANT[step.priority]} className="text-[10px]">
            {step.priority}
          </Badge>
        </div>
        <p className="mt-0.5 text-xs text-muted-foreground">{step.description}</p>
        {step.why_it_matters && <p className="mt-1 text-xs italic text-muted-foreground/70">{step.why_it_matters}</p>}
      </div>
      {!isDone && (
        <div className="flex shrink-0 items-center gap-1.5">
          <Button size="sm" onClick={() => navigate(step.action_target)} disabled={disabled}>
            {step.action_label}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => onSkip(step.action_target)} disabled={disabled}>
            Skip
          </Button>
        </div>
      )}
    </div>
  );
}

export function OnboardingPathCard() {
  const navigate = useNavigate();
  const {
    isLoadingState,
    isGenerating,
    generateError,
    path,
    needsGoal,
    dismissed,
    completedStepIds,
    skippedStepIds,
    setGoal,
    regenerate,
    retry,
    completeStep,
    skipStep,
    dismiss,
    reset,
  } = useOnboarding();

  if (isLoadingState) {
    return (
      <Card className="mb-8 animate-pulse">
        <CardContent className="space-y-2 p-4">
          <div className="h-4 w-1/3 rounded bg-muted" />
          <div className="h-3 w-2/3 rounded bg-muted" />
        </CardContent>
      </Card>
    );
  }

  if (dismissed) return null;

  const visibleSteps = path?.steps.filter((step) => !skippedStepIds.includes(step.action_target)) ?? [];
  const isStepDone = (step: OnboardingStep) => completedStepIds.includes(step.action_target) || step.status === 'completed';
  const allDone = path && visibleSteps.length > 0 && visibleSteps.every(isStepDone);

  if (allDone) return null;

  return (
    <Card className="mb-8 border-primary/20 bg-primary/[0.02]">
      <CardHeader className="flex flex-row items-start justify-between gap-2 pb-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <CardTitle className="text-base">{needsGoal ? 'Get set up' : path?.welcome_message || 'Get set up'}</CardTitle>
        </div>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={dismiss} aria-label="Dismiss">
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {generateError && (
          <div className="flex items-center justify-between gap-3 rounded-md border border-destructive/30 bg-destructive/5 p-2.5">
            <p className="text-sm text-destructive">Couldn't build your path. Try again.</p>
            <Button size="sm" variant="outline" onClick={retry}>
              <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
              Retry
            </Button>
          </div>
        )}

        {needsGoal ? (
          <GoalCapture onSubmit={setGoal} isSubmitting={isGenerating} />
        ) : isGenerating ? (
          <p className="text-sm text-muted-foreground">Creating your setup…</p>
        ) : path?.fallback_message && visibleSteps.length === 0 ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">{path.fallback_message}</p>
            <Button size="sm" variant="outline" onClick={retry}>
              Try again
            </Button>
          </div>
        ) : path ? (
          <>
            <p className="text-sm text-muted-foreground">{path.summary}</p>
            <div className="space-y-2">
              {visibleSteps.map((step) => (
                <StepRow
                  key={step.action_target}
                  step={step}
                  isDone={isStepDone(step)}
                  onComplete={completeStep}
                  onSkip={skipStep}
                  disabled={isGenerating}
                />
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-2 pt-1">
              {path.primary_cta && (
                <Button size="sm" onClick={() => navigate(path.primary_cta!.action)}>
                  {path.primary_cta.label}
                </Button>
              )}
              <Button size="sm" variant="outline" onClick={regenerate} disabled={isGenerating}>
                <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
                Regenerate
              </Button>
              <Button size="sm" variant="ghost" onClick={reset} disabled={isGenerating}>
                <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                Change goal
              </Button>
            </div>
          </>
        ) : null}
      </CardContent>
    </Card>
  );
}
