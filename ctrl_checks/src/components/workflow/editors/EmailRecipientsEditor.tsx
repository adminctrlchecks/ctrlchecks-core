import { useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface Recipients {
  to?: string[];
  cc?: string[];
  bcc?: string[];
}

interface EmailRecipientsEditorProps {
  value: Recipients | null | undefined;
  onChange: (v: Recipients) => void;
  disabled?: boolean;
}

function arrayToText(arr: string[] | undefined): string {
  return Array.isArray(arr) ? arr.join(', ') : '';
}

function textToArray(text: string): string[] {
  return text
    .split(/[,;]/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

/**
 * Row-per-field ("To" / "Cc" / "Bcc") editor for the {to,cc,bcc} recipients
 * shape most email-sending nodes (Amazon SES, etc.) expect — avoids asking
 * users to hand-write JSON just to list who an email goes to.
 */
export default function EmailRecipientsEditor({ value, onChange, disabled = false }: EmailRecipientsEditorProps) {
  const [toText, setToText] = useState(arrayToText(value?.to));
  const [ccText, setCcText] = useState(arrayToText(value?.cc));
  const [bccText, setBccText] = useState(arrayToText(value?.bcc));

  useEffect(() => {
    setToText(arrayToText(value?.to));
    setCcText(arrayToText(value?.cc));
    setBccText(arrayToText(value?.bcc));
    // Only resync from upstream value changes (e.g. AI-filled/loaded config), not on every keystroke.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(value)]);

  const pushChange = (nextTo: string, nextCc: string, nextBcc: string) => {
    const recipients: Recipients = {};
    const to = textToArray(nextTo);
    const cc = textToArray(nextCc);
    const bcc = textToArray(nextBcc);
    if (to.length > 0) recipients.to = to;
    if (cc.length > 0) recipients.cc = cc;
    if (bcc.length > 0) recipients.bcc = bcc;
    onChange(recipients);
  };

  return (
    <div className="space-y-2">
      <div className="space-y-1">
        <Label className="text-[11px] text-muted-foreground">To</Label>
        <Input
          value={toText}
          onChange={(e) => {
            setToText(e.target.value);
            pushChange(e.target.value, ccText, bccText);
          }}
          placeholder="alice@example.com, bob@example.com"
          disabled={disabled}
          className="h-8 text-xs border-border/60"
          onFocus={(e) => e.stopPropagation()}
        />
      </div>
      <div className="space-y-1">
        <Label className="text-[11px] text-muted-foreground">Cc (optional)</Label>
        <Input
          value={ccText}
          onChange={(e) => {
            setCcText(e.target.value);
            pushChange(toText, e.target.value, bccText);
          }}
          placeholder="manager@example.com"
          disabled={disabled}
          className="h-8 text-xs border-border/60"
          onFocus={(e) => e.stopPropagation()}
        />
      </div>
      <div className="space-y-1">
        <Label className="text-[11px] text-muted-foreground">Bcc (optional)</Label>
        <Input
          value={bccText}
          onChange={(e) => {
            setBccText(e.target.value);
            pushChange(toText, ccText, e.target.value);
          }}
          placeholder="archive@example.com"
          disabled={disabled}
          className="h-8 text-xs border-border/60"
          onFocus={(e) => e.stopPropagation()}
        />
      </div>
      <p className="text-[11px] text-muted-foreground">
        Separate multiple addresses with commas. You can also type a template like {'{{$json.email}}'}.
      </p>
    </div>
  );
}
