import { Check, CircleDot, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type SaveState = 'unsaved' | 'saving' | 'saved';

function resolveSaveState(isDirty: boolean, isSaving: boolean): SaveState {
  if (isSaving) return 'saving';
  return isDirty ? 'unsaved' : 'saved';
}

interface SaveStateButtonProps {
  onSave: () => void | Promise<boolean | void>;
  isDirty: boolean;
  isSaving: boolean;
  className?: string;
}

/**
 * Single control that both reports save state and performs the save.
 * Replaces the old "Save button + separate Unsaved badge" pair.
 *
 * State is never communicated by colour alone — icon and label change too.
 */
export default function SaveStateButton({
  onSave,
  isDirty,
  isSaving,
  className,
}: SaveStateButtonProps) {
  const state = resolveSaveState(isDirty, isSaving);

  const appearance: Record<SaveState, string> = {
    unsaved:
      'border-amber-500/60 text-amber-600 hover:bg-amber-500/10 hover:text-amber-700 dark:text-amber-400 dark:hover:text-amber-300',
    saving: 'text-muted-foreground',
    saved: 'text-muted-foreground',
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={onSave}
      disabled={state !== 'unsaved'}
      aria-live="polite"
      title={state === 'unsaved' ? 'Save changes' : state === 'saving' ? 'Saving…' : 'All changes saved'}
      data-save-state={state}
      className={cn('disabled:opacity-100', appearance[state], className)}
    >
      {state === 'saving' ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : state === 'unsaved' ? (
        <CircleDot className="mr-2 h-4 w-4" />
      ) : (
        <Check className="mr-2 h-4 w-4" />
      )}
      {state === 'saving' ? 'Saving…' : state === 'unsaved' ? 'Unsaved' : 'Saved'}
      {state === 'unsaved' && <span className="sr-only"> — click to save changes</span>}
    </Button>
  );
}
