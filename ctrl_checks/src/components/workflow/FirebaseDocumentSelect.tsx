import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Loader2, FileText, ArrowRightCircle } from 'lucide-react';
import { fetchFirebaseCollectionPreview } from '@/lib/api/databaseExplorer';

interface FirebaseDocumentSelectProps {
  value: string;
  onChange: (value: string) => void;
  /** Saved Connection id from node.data.connectionRefs['firebase_credentials'], if linked */
  connectionId?: string;
  /** Currently configured Collection field value on the same node */
  collection?: string;
  /**
   * 'id'   -> picking a document fills the field with its document id (Document ID field)
   * 'data' -> picking a document fills the field with its data as pretty JSON (Data / Filter fields)
   */
  pickField: 'id' | 'data';
  placeholder?: string;
}

function summarize(doc: Record<string, unknown>): string {
  const entries = Object.entries(doc).filter(([key]) => key !== 'id');
  if (entries.length === 0) return '(empty document)';
  return entries
    .slice(0, 2)
    .map(([key, val]) => `${key}: ${typeof val === 'object' ? JSON.stringify(val) : String(val)}`)
    .join(', ');
}

/**
 * Firestore document helper for Document ID / Data / Filter fields. Fetches a
 * sample of real documents from the already-selected collection so the user
 * can pick a real id or use a real document's shape as a starting template,
 * instead of guessing field names blind.
 */
export default function FirebaseDocumentSelect({
  value,
  onChange,
  connectionId,
  collection,
  pickField,
  placeholder,
}: FirebaseDocumentSelectProps) {
  const [open, setOpen] = useState(false);
  const [docs, setDocs] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canBrowse = Boolean(connectionId && collection);

  const openBrowser = async () => {
    setOpen(true);
    if (docs.length > 0 || loading || !canBrowse) return;
    setLoading(true);
    setError(null);
    try {
      const preview = await fetchFirebaseCollectionPreview(connectionId!, collection!);
      setDocs(preview.rows);
    } catch (err: any) {
      setError(err.message || 'Could not load documents');
    } finally {
      setLoading(false);
    }
  };

  const pickDocument = (doc: Record<string, unknown>) => {
    if (pickField === 'id') {
      onChange(String(doc.id ?? ''));
    } else {
      const { id, ...rest } = doc;
      onChange(JSON.stringify(rest, null, 2));
    }
    setOpen(false);
  };

  const Field = pickField === 'id' ? Input : Textarea;

  return (
    <div className="space-y-1.5">
      <Field
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={pickField === 'id' ? 'h-8 text-xs font-mono border-border/60' : 'text-xs font-mono border-border/60 min-h-[80px]'}
      />
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7 px-2 text-[11px] gap-1"
            onClick={openBrowser}
            disabled={!canBrowse}
            title={
              !connectionId
                ? 'Connect a Firebase account first'
                : !collection
                ? 'Set the Collection field first'
                : 'Browse documents in the selected collection'
            }
          >
            <FileText className="h-3 w-3" />
            Browse Documents
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-1.5" align="start">
          {loading && (
            <div className="flex items-center gap-2 px-2 py-1.5 text-xs text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" /> Loading documents…
            </div>
          )}
          {error && <p className="px-2 py-1.5 text-[11px] text-destructive">{error}</p>}
          {!loading && !error && docs.length === 0 && (
            <p className="px-2 py-1.5 text-[11px] text-muted-foreground">No documents found in "{collection}"</p>
          )}
          {!loading && docs.length > 0 && (
            <div className="max-h-96 overflow-y-auto space-y-0.5">
              {docs.map((doc) => (
                <button
                  key={String(doc.id)}
                  type="button"
                  onClick={() => pickDocument(doc)}
                  className="flex w-full items-start gap-1.5 rounded px-2 py-1.5 text-left text-xs hover:bg-muted/60"
                >
                  <ArrowRightCircle className="mt-0.5 h-3 w-3 shrink-0 text-muted-foreground" />
                  <span className="min-w-0">
                    <span className="block font-mono text-[11px]">{String(doc.id)}</span>
                    <span className="block truncate text-[10px] text-muted-foreground">{summarize(doc)}</span>
                  </span>
                </button>
              ))}
            </div>
          )}
        </PopoverContent>
      </Popover>
    </div>
  );
}
