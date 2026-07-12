import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ChevronRight, ChevronDown, Loader2, Database, ArrowRightCircle } from 'lucide-react';
import {
  fetchSupabaseTablesForConnection,
  fetchSupabaseTablePreview,
  SupabaseTablePreview,
} from '@/lib/api/databaseExplorer';

interface SupabaseTableSelectProps {
  value: string;
  onChange: (value: string) => void;
  /** Saved Connection id from node.data.connectionRefs['supabase_api_key'], if linked */
  connectionId?: string;
}

function formatCell(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

/**
 * Supabase Table field with a "Browse Tables" helper. Lets the user see real
 * table names and sample rows before typing a filter/query by hand.
 */
export default function SupabaseTableSelect({ value, onChange, connectionId }: SupabaseTableSelectProps) {
  const [open, setOpen] = useState(false);
  const [tables, setTables] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [expanded, setExpanded] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [previewCache, setPreviewCache] = useState<Record<string, SupabaseTablePreview>>({});

  const openBrowser = async () => {
    setOpen(true);
    if (tables.length > 0 || loading || !connectionId) return;
    setLoading(true);
    setError(null);
    try {
      const result = await fetchSupabaseTablesForConnection(connectionId);
      setTables(result);
    } catch (err: any) {
      setError(err.message || 'Could not load tables');
    } finally {
      setLoading(false);
    }
  };

  const pickTable = (name: string) => {
    onChange(name);
    setOpen(false);
  };

  const toggleTable = async (name: string) => {
    if (expanded === name) {
      setExpanded(null);
      return;
    }
    setExpanded(name);
    if (previewCache[name] || !connectionId) return;
    setPreviewLoading(true);
    setPreviewError(null);
    try {
      const preview = await fetchSupabaseTablePreview(connectionId, name);
      setPreviewCache((prev) => ({ ...prev, [name]: preview }));
    } catch (err: any) {
      setPreviewError(err.message || 'Could not load preview');
    } finally {
      setPreviewLoading(false);
    }
  };

  const activePreview = expanded ? previewCache[expanded] : undefined;

  return (
    <div className="space-y-1.5">
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="my_table"
        className="h-8 text-xs font-mono border-border/60"
      />
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7 px-2 text-[11px] gap-1"
            onClick={openBrowser}
            disabled={!connectionId}
            title={connectionId ? 'Browse tables in the connected Supabase project' : 'Connect a Supabase account first'}
          >
            <Database className="h-3 w-3" />
            Browse Tables
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-1.5" align="start">
          {loading && (
            <div className="flex items-center gap-2 px-2 py-1.5 text-xs text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" /> Loading tables…
            </div>
          )}
          {error && <p className="px-2 py-1.5 text-[11px] text-destructive">{error}</p>}
          {!loading && !error && tables.length === 0 && (
            <p className="px-2 py-1.5 text-[11px] text-muted-foreground">No tables found</p>
          )}
          {!loading && (
            <div className="max-h-96 overflow-y-auto space-y-0.5">
              {tables.map((name) => {
                const isExpanded = expanded === name;
                return (
                  <div key={name} className="rounded border border-transparent has-[button:hover]:border-border/40">
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => toggleTable(name)}
                        className="flex flex-1 items-center gap-1.5 rounded px-2 py-1.5 text-left text-xs hover:bg-muted/60"
                      >
                        {isExpanded ? (
                          <ChevronDown className="h-3 w-3 shrink-0 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground" />
                        )}
                        {name}
                      </button>
                      <button
                        type="button"
                        onClick={() => pickTable(name)}
                        title={`Use table "${name}"`}
                        className="mr-1 shrink-0 rounded p-1 text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                      >
                        <ArrowRightCircle className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    {isExpanded && (
                      <div className="px-2 pb-2">
                        {previewLoading && !previewCache[name] && (
                          <div className="flex items-center gap-2 px-1 py-1.5 text-[11px] text-muted-foreground">
                            <Loader2 className="h-3 w-3 animate-spin" /> Loading preview…
                          </div>
                        )}
                        {previewError && !previewCache[name] && (
                          <p className="px-1 py-1.5 text-[11px] text-destructive">{previewError}</p>
                        )}
                        {activePreview && (
                          <>
                            {activePreview.rows.length === 0 ? (
                              <p className="px-1 py-1.5 text-[11px] text-muted-foreground">Table is empty</p>
                            ) : (
                              <div className="overflow-x-auto rounded border border-border/50">
                                <table className="w-full text-[10px]">
                                  <thead>
                                    <tr className="border-b border-border/50 bg-muted/40">
                                      {activePreview.columns.map((col) => (
                                        <th key={col} className="whitespace-nowrap px-1.5 py-1 text-left font-medium text-muted-foreground">
                                          {col}
                                        </th>
                                      ))}
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {activePreview.rows.map((row, i) => (
                                      <tr key={i} className="border-b border-border/30 last:border-0">
                                        {activePreview.columns.map((col) => (
                                          <td key={col} className="max-w-[140px] truncate whitespace-nowrap px-1.5 py-1">
                                            {row[col] === undefined ? (
                                              <span className="text-muted-foreground/40">—</span>
                                            ) : row[col] === null ? (
                                              <span className="text-muted-foreground/60">null</span>
                                            ) : (
                                              formatCell(row[col])
                                            )}
                                          </td>
                                        ))}
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            )}
                            <div className="mt-1.5">
                              <Button
                                type="button"
                                variant="secondary"
                                size="sm"
                                className="h-6 w-full px-2 text-[10px]"
                                onClick={() => pickTable(name)}
                              >
                                Use this table
                              </Button>
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </PopoverContent>
      </Popover>
    </div>
  );
}
