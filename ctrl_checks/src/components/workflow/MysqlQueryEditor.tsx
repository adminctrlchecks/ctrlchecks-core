import { useState } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ChevronRight, ChevronDown, Loader2, Table2, ArrowRightCircle } from 'lucide-react';
import { fetchMysqlTablesForConnection, fetchMysqlTablePreview, MysqlTablePreview } from '@/lib/api/databaseExplorer';

interface MysqlQueryEditorProps {
  value: string;
  onChange: (value: string) => void;
  /** Saved Connection id from node.data.connectionRefs['mysql_connection'], if linked */
  connectionId?: string;
}

/**
 * MySQL Query field with a "Browse Tables" helper. The MySQL node has no
 * separate database/table fields — it's raw SQL against whichever database
 * the linked connection points to — so this lists tables and, on request,
 * previews a few sample rows so the user can see real column names/values
 * before writing the query.
 */
export default function MysqlQueryEditor({ value, onChange, connectionId }: MysqlQueryEditorProps) {
  const [open, setOpen] = useState(false);
  const [tables, setTables] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [expandedTable, setExpandedTable] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [previewCache, setPreviewCache] = useState<Record<string, MysqlTablePreview>>({});

  const openBrowser = async () => {
    setOpen(true);
    if (tables.length > 0 || loading || !connectionId) return;
    setLoading(true);
    setError(null);
    try {
      const result = await fetchMysqlTablesForConnection(connectionId);
      setTables(result);
    } catch (err: any) {
      setError(err.message || 'Could not load tables');
    } finally {
      setLoading(false);
    }
  };

  const insertTable = (table: string) => {
    onChange(`SELECT * FROM \`${table}\``);
    setOpen(false);
  };

  const insertColumns = (table: string, columns: string[]) => {
    const columnList = columns.map((c) => `\`${c}\``).join(', ');
    onChange(`SELECT ${columnList} FROM \`${table}\``);
    setOpen(false);
  };

  const toggleTable = async (table: string) => {
    if (expandedTable === table) {
      setExpandedTable(null);
      return;
    }
    setExpandedTable(table);
    if (previewCache[table] || !connectionId) return;
    setPreviewLoading(true);
    setPreviewError(null);
    try {
      const preview = await fetchMysqlTablePreview(connectionId, table);
      setPreviewCache((prev) => ({ ...prev, [table]: preview }));
    } catch (err: any) {
      setPreviewError(err.message || 'Could not load preview');
    } finally {
      setPreviewLoading(false);
    }
  };

  const activePreview = expandedTable ? previewCache[expandedTable] : undefined;

  return (
    <div className="space-y-1.5">
      <Textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="SELECT * FROM users WHERE id = ?"
        className="min-h-[80px] text-xs font-mono border-border/60 focus-visible:ring-1 focus-visible:ring-ring/50"
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
            title={connectionId ? 'Browse tables in the connected database' : 'Connect a MySQL account first'}
          >
            <Table2 className="h-3 w-3" />
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
              {tables.map((table) => {
                const isExpanded = expandedTable === table;
                return (
                  <div key={table} className="rounded border border-transparent has-[button:hover]:border-border/40">
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => toggleTable(table)}
                        className="flex flex-1 items-center gap-1.5 rounded px-2 py-1.5 text-left text-xs hover:bg-muted/60"
                      >
                        {isExpanded ? (
                          <ChevronDown className="h-3 w-3 shrink-0 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground" />
                        )}
                        {table}
                      </button>
                      <button
                        type="button"
                        onClick={() => insertTable(table)}
                        title={`Insert SELECT * FROM ${table}`}
                        className="mr-1 shrink-0 rounded p-1 text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                      >
                        <ArrowRightCircle className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    {isExpanded && (
                      <div className="px-2 pb-2">
                        {previewLoading && !previewCache[table] && (
                          <div className="flex items-center gap-2 px-1 py-1.5 text-[11px] text-muted-foreground">
                            <Loader2 className="h-3 w-3 animate-spin" /> Loading preview…
                          </div>
                        )}
                        {previewError && !previewCache[table] && (
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
                                          <td key={col} className="max-w-[120px] truncate whitespace-nowrap px-1.5 py-1">
                                            {row[col] === null || row[col] === undefined ? (
                                              <span className="text-muted-foreground/60">null</span>
                                            ) : (
                                              String(row[col])
                                            )}
                                          </td>
                                        ))}
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            )}
                            <div className="mt-1.5 flex gap-1.5">
                              <Button
                                type="button"
                                variant="secondary"
                                size="sm"
                                className="h-6 flex-1 px-2 text-[10px]"
                                onClick={() => insertTable(table)}
                              >
                                Insert SELECT *
                              </Button>
                              {activePreview.columns.length > 0 && (
                                <Button
                                  type="button"
                                  variant="secondary"
                                  size="sm"
                                  className="h-6 flex-1 px-2 text-[10px]"
                                  onClick={() => insertColumns(table, activePreview.columns)}
                                >
                                  Insert with columns
                                </Button>
                              )}
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
