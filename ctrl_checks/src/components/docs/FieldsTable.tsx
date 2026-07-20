import type { FieldDoc } from '@/docs-content/types';

export function FieldsTable({ fields }: { fields: FieldDoc[] }) {
  if (!fields.length) {
    return <p className="text-sm text-muted-foreground">No configurable input fields.</p>;
  }

  return (
    <div className="overflow-x-auto rounded-md border border-border">
      <table className="w-full min-w-[720px] text-sm">
        <thead className="bg-muted/50 text-left">
          <tr>
            <th className="px-3 py-2 font-medium">Field</th>
            <th className="px-3 py-2 font-medium">Type</th>
            <th className="px-3 py-2 font-medium">Required</th>
            <th className="px-3 py-2 font-medium">Description</th>
            <th className="px-3 py-2 font-medium">Example</th>
          </tr>
        </thead>
        <tbody>
          {fields.map((field) => (
            <tr key={field.internalKey} className="border-t border-border align-top">
              <td className="px-3 py-2 font-medium">
                {field.name}
                {field.required && <span className="ml-1 text-destructive">*</span>}
                <div className="mt-1 font-mono text-xs text-muted-foreground">{field.internalKey}</div>
              </td>
              <td className="px-3 py-2 font-mono text-xs">{field.type}</td>
              <td className="px-3 py-2">{field.required ? 'Yes' : 'No'}</td>
              <td className="px-3 py-2 text-muted-foreground">
                {field.description}
                {field.helpText && (
                  <div className="mt-3 rounded-sm border border-border bg-muted/30 p-3">
                    <div className="mb-1 text-xs font-semibold uppercase text-foreground">
                      How to set
                    </div>
                    <div className="whitespace-pre-line text-xs leading-5 text-muted-foreground">
                      {field.helpText}
                    </div>
                  </div>
                )}
                {field.type === 'password' && (
                  <div className="mt-1 text-xs">Password and token values are masked in the UI.</div>
                )}
                {field.options?.length ? (
                  <div className="mt-1 text-xs">Options: {field.options.join(', ')}</div>
                ) : null}
                {field.notes && (
                  <div className="mt-2 text-xs">{field.notes}</div>
                )}
              </td>
              <td className="px-3 py-2 font-mono text-xs text-muted-foreground">{field.example || '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
