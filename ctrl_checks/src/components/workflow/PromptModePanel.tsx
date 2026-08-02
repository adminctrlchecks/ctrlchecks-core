import { useEffect, useState } from 'react';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { cn } from '@/lib/utils';
import AIEditorPanel from './AIEditorPanel';
import ExecutionConsole from './ExecutionConsole';

type PromptPanelTab = 'ai-editor' | 'execution-logs';

/**
 * Prompt mode's right column. Mirrors the Properties / AI Editor toggle that PropertiesPanel
 * uses in Expert mode: one segmented control, and whichever tab is selected gets the whole
 * column rather than the two surfaces splitting it and both ending up cramped.
 *
 * The AI Editor stays mounted (hidden) when the logs tab is active so the conversation and any
 * pending preview survive tab switches — same reason PropertiesPanel keeps it mounted.
 */
interface PromptModePanelProps {
  /**
   * Mirrors `consoleExpanded` — the same signal WorkflowBuilder already raises when a run
   * starts and the console should come forward. In Expert mode that opens the bottom bar;
   * here it brings the logs tab to the front. The user can still switch back manually.
   */
  revealLogs?: boolean;
}

export default function PromptModePanel({ revealLogs = false }: PromptModePanelProps) {
  const [tab, setTab] = useState<PromptPanelTab>('ai-editor');

  useEffect(() => {
    if (revealLogs) setTab('execution-logs');
  }, [revealLogs]);

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
      {/* Header with the same segmented toggle used by PropertiesPanel */}
      <div className="shrink-0 px-4 py-3 border-b border-border/40 flex min-w-0 max-w-full items-center justify-between gap-3 overflow-hidden">
        <ToggleGroup
          type="single"
          value={tab}
          onValueChange={(value) => value && setTab(value as PromptPanelTab)}
          className="min-w-0 flex-1 justify-start overflow-hidden"
        >
          <ToggleGroupItem
            value="ai-editor"
            aria-label="AI Editor"
            className={cn(
              "h-7 min-w-0 shrink truncate px-3 text-xs font-medium border-0",
              "data-[state=on]:bg-muted/60 data-[state=on]:text-foreground",
              "data-[state=off]:text-muted-foreground/70",
              "hover:bg-muted/40 transition-colors duration-150",
              "rounded-sm"
            )}
          >
            AI Editor
          </ToggleGroupItem>
          <ToggleGroupItem
            value="execution-logs"
            aria-label="Execution Logs"
            className={cn(
              "h-7 min-w-0 shrink truncate px-3 text-xs font-medium border-0",
              "data-[state=on]:bg-muted/60 data-[state=on]:text-foreground",
              "data-[state=off]:text-muted-foreground/70",
              "hover:bg-muted/40 transition-colors duration-150",
              "rounded-sm"
            )}
          >
            Execution Logs
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      <AIEditorPanel
        isActive={tab === 'ai-editor'}
        className={cn(tab !== 'ai-editor' && 'hidden')}
      />

      {tab === 'execution-logs' && (
        <ExecutionConsole
          isExpanded
          onToggle={() => undefined}
          orientation="vertical"
          collapsible={false}
          collapseLogsByDefault
        />
      )}
    </div>
  );
}
