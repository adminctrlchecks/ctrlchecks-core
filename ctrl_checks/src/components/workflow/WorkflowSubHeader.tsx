import { useState, type ReactNode } from 'react';
import { Input } from '@/components/ui/input';
import { useWorkflowStore } from '@/stores/workflowStore';

interface WorkflowSubHeaderProps {
  /** Rendered on the right of the row — the editor mode switch. */
  children?: ReactNode;
}

/**
 * Second bar under WorkflowHeader. Holds the workflow name (click to edit,
 * shown in full — never truncated) on the left and the mode switch on the right.
 * Action buttons deliberately stay in the top header.
 */
export default function WorkflowSubHeader({ children }: WorkflowSubHeaderProps) {
  const { workflowName, setWorkflowName } = useWorkflowStore();
  const [isEditing, setIsEditing] = useState(false);

  return (
    <div className="flex min-h-[3.25rem] w-full shrink-0 items-center justify-between gap-4 border-b border-border bg-card px-4 py-2">
      <div className="min-w-0 flex-1">
        {isEditing ? (
          <Input
            value={workflowName}
            onChange={(e) => setWorkflowName(e.target.value)}
            onBlur={() => setIsEditing(false)}
            onKeyDown={(e) => e.key === 'Enter' && setIsEditing(false)}
            className="h-9 w-full max-w-2xl text-xl font-semibold"
            aria-label="Workflow name"
            autoFocus
          />
        ) : (
          <button
            onClick={() => setIsEditing(true)}
            className="w-full break-words text-left text-xl font-semibold leading-tight transition-colors hover:text-primary"
            title="Click to rename"
          >
            {workflowName}
          </button>
        )}
      </div>
      {children && <div className="flex shrink-0 items-center gap-2">{children}</div>}
    </div>
  );
}
