import { useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Plus, X } from 'lucide-react';
import { InputGuideLink } from './InputGuideLink';
import { normalizeFormFieldIdentity } from '@/lib/formFieldIdentity';
import { cn } from '@/lib/utils';

interface FormField {
  id: string;
  label: string;
  name: string;
  type: 'text' | 'email' | 'number' | 'textarea' | 'select' | 'checkbox' | 'radio' | 'tel' | 'url' | 'date' | 'file';
  required: boolean;
  options?: Array<{ label: string; value: string }>;
  placeholder?: string;
  defaultValue?: string;
}

interface FormConfig {
  formTitle: string;
  formDescription: string;
  fields: FormField[];
  submitButtonText: string;
  successMessage: string;
  redirectUrl: string;
}

interface FormNodeSettingsProps {
  config: FormConfig;
  onConfigChange: (config: FormConfig) => void;
}

function FormGuideLabel({
  htmlFor,
  label,
  fieldKey,
  fieldType = 'text',
  helpText,
  className,
}: {
  htmlFor?: string;
  label: string;
  fieldKey: string;
  fieldType?: string;
  helpText: string;
  className?: string;
}) {
  return (
    // min-w-0 on both sides: the label wraps, the guide link truncates — the row never
    // exceeds its container (flex children otherwise refuse to shrink below content width)
    <div className="flex min-w-0 max-w-full items-center justify-between gap-2">
      <Label htmlFor={htmlFor} className={cn('min-w-0 break-words', className)}>{label}</Label>
      <InputGuideLink
        fieldKey={fieldKey}
        fieldLabel={label}
        fieldType={fieldType}
        nodeType="form"
        helpText={helpText}
        className="mt-0"
      />
    </div>
  );
}

export default function FormNodeSettings({ config, onConfigChange }: FormNodeSettingsProps) {
  const labelToName = (label: string): string => {
    return label
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');
  };

  const handleAddField = useCallback(() => {
    const newField = normalizeFormFieldIdentity({
      id: `field_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      label: 'New Field',
      key: 'new_field',
      name: 'new_field',
      type: 'text',
      required: false,
      placeholder: '',
    }, new Set(config.fields.map((f: any) => String(f.key || f.name || '')))) as FormField;

    onConfigChange({
      ...config,
      fields: [...config.fields, newField],
    });
  }, [config, onConfigChange]);

  const handleRemoveField = useCallback((fieldId: string) => {
    onConfigChange({
      ...config,
      fields: config.fields.filter((f, i) => (f.id || f.key || f.name || `field-${i}`) !== fieldId),
    });
  }, [config, onConfigChange]);

  const handleFieldChange = useCallback((fieldId: string, key: keyof FormField, value: any) => {
    const updatedFields = config.fields.map((field, i) => {
      const stableId = field.id || field.key || field.name || `field-${i}`;
      if (stableId === fieldId) {
        const updated = { ...field, [key]: value } as Record<string, unknown>;
        if (key === 'label') {
          const normalized = normalizeFormFieldIdentity(
            { ...updated, key: updated.key || updated.name || labelToName(String(value)) },
            new Set(
              config.fields
                .filter((f, idx) => (f.id || f.key || f.name || `field-${idx}`) !== fieldId)
                .map((f: any) => String(f.key || f.name || ''))
            )
          ) as any;
          updated.name = normalized.name;
          (updated as any).key = normalized.key;
          updated.label = normalized.label;
        } else if (key === 'name') {
          const normalized = normalizeFormFieldIdentity(
            { ...updated, key: value, name: value },
            new Set(
              config.fields
                .filter((f, idx) => (f.id || f.key || f.name || `field-${idx}`) !== fieldId)
                .map((f: any) => String(f.key || f.name || ''))
            )
          ) as any;
          updated.name = normalized.name;
          (updated as any).key = normalized.key;
        }
        return updated as FormField;
      }
      return field;
    });

    onConfigChange({
      ...config,
      fields: updatedFields,
    });
  }, [config, onConfigChange]);

  const handleConfigFieldChange = useCallback((key: keyof FormConfig, value: any) => {
    onConfigChange({
      ...config,
      [key]: value,
    });
  }, [config, onConfigChange]);

  const fieldTypes = [
    { value: 'text', label: 'Text' },
    { value: 'email', label: 'Email' },
    { value: 'number', label: 'Number' },
    { value: 'tel', label: 'Phone' },
    { value: 'url', label: 'URL' },
    { value: 'date', label: 'Date' },
    { value: 'textarea', label: 'Textarea' },
    { value: 'select', label: 'Select' },
    { value: 'checkbox', label: 'Checkbox' },
    { value: 'radio', label: 'Radio' },
    { value: 'file', label: 'File' },
  ];

  const formHelp = {
    formTitle: 'What this field is: The title shown at the top of the public form.\nHow to fill it: Use a short name that tells users what they are submitting.\nExample: Customer Feedback Form.',
    formDescription: 'What this field is: Optional helper text shown below the form title.\nHow to fill it: Explain what the form is for or what users should prepare.\nExample: Tell us what happened and we will contact you within one business day.',
    fields: 'What this section is: These are the questions users will answer on the form.\nHow to fill it: Add one field per question, choose the right type, and mark only truly necessary questions as required.\nExample: Name, Email, Phone, Message.',
    fieldLabel: 'What this field is: The question or label shown to the person filling the form.\nHow to fill it: Write it in plain language.\nExample: Email Address.',
    fieldType: 'What this field is: The kind of answer the form should collect.\nHow to choose it: Use Email for email addresses, Phone for phone numbers, Select/Radio for fixed choices, and Textarea for long answers.',
    internalName: 'What this field is: The machine-friendly key used in workflow output after the form is submitted.\nHow to fill it: Use lowercase letters, numbers, and underscores.\nExample: customer_email. Later nodes can use {{$json.customer_email}}.',
    placeholder: 'What this field is: Light example text shown inside the empty form field.\nHow to fill it: Show users the expected format without putting real data there.\nExample: alice@example.com.',
    options: 'What this field is: The allowed choices for a Select or Radio field.\nHow to fill it: Type choices separated by commas.\nExample: New, In Progress, Done.',
    required: 'What this field is: Controls whether the user must answer this question before submitting.\nHow to choose it: Turn it on only for information the workflow cannot run without.',
    submitButtonText: 'What this field is: The text on the button users click to submit the form.\nHow to fill it: Use a clear action.\nExample: Send Request or Submit.',
    successMessage: 'What this field is: The message shown after the form is submitted successfully.\nHow to fill it: Confirm what happened and what comes next.\nExample: Thank you. We received your request.',
    redirectUrl: 'What this field is: Optional web page users are sent to after submitting.\nHow to fill it: Paste a full HTTPS URL, or leave empty to show the success message on the same page.\nExample: https://example.com/thank-you.',
  };

  return (
    <div className="min-w-0 max-w-full space-y-6">
      {/* Form Title */}
      <div className="space-y-2">
        <FormGuideLabel htmlFor="formTitle" label="Form Title" fieldKey="formTitle" helpText={formHelp.formTitle} />
        <Input
          id="formTitle"
          value={config.formTitle}
          onChange={(e) => handleConfigFieldChange('formTitle', e.target.value)}
          placeholder="Form Submission"
        />
      </div>

      {/* Form Description */}
      <div className="space-y-2">
        <FormGuideLabel htmlFor="formDescription" label="Description (Optional)" fieldKey="formDescription" fieldType="textarea" helpText={formHelp.formDescription} />
        <Textarea
          id="formDescription"
          value={config.formDescription}
          onChange={(e) => handleConfigFieldChange('formDescription', e.target.value)}
          placeholder="Optional description"
          rows={2}
        />
      </div>

      {/* Form Fields */}
      <div className="space-y-4">
        <div className="flex min-w-0 max-w-full items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <Label className="min-w-0 break-words">Form Fields</Label>
            <InputGuideLink
              fieldKey="fields"
              fieldLabel="Form Fields"
              fieldType="json"
              nodeType="form"
              helpText={formHelp.fields}
              className="mt-0"
            />
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleAddField}
            className="h-8 shrink-0"
          >
            <Plus className="h-3 w-3 mr-1" />
            Add Field
          </Button>
        </div>

        <div className="space-y-4 border rounded-lg p-4 bg-muted/30">
          {config.fields.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No fields yet. Click "Add Field" to get started.
            </p>
          ) : (
            config.fields.map((field, index) => {
              const fieldKey = field.id || field.key || field.name || `field-${index}`;
              return (
              <div key={fieldKey} className="min-w-0 max-w-full space-y-3 p-3 border rounded-md bg-background">
                <div className="flex min-w-0 max-w-full items-start justify-between gap-2">
                  <div className="min-w-0 flex-1 space-y-3">
                    <div className="grid min-w-0 max-w-full grid-cols-2 gap-2">
                      <div className="min-w-0 space-y-1">
                        <FormGuideLabel htmlFor={`label-${fieldKey}`} label="Label" fieldKey="fieldLabel" helpText={formHelp.fieldLabel} className="text-xs" />
                        <Input
                          id={`label-${fieldKey}`}
                          value={field.label}
                          onChange={(e) => handleFieldChange(fieldKey, 'label', e.target.value)}
                          placeholder="Field Label"
                          className="h-8 text-sm"
                        />
                      </div>
                      <div className="min-w-0 space-y-1">
                        <FormGuideLabel htmlFor={`type-${fieldKey}`} label="Type" fieldKey="fieldType" fieldType="select" helpText={formHelp.fieldType} className="text-xs" />
                        <Select
                          value={field.type}
                          onValueChange={(value) => handleFieldChange(fieldKey, 'type', value)}
                        >
                          <SelectTrigger id={`type-${fieldKey}`} className="h-8 text-sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {fieldTypes.map((type) => (
                              <SelectItem key={type.value} value={type.value}>
                                {type.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-1">
                        <FormGuideLabel htmlFor={`name-${fieldKey}`} label="Internal Name" fieldKey="internalName" helpText={formHelp.internalName} className="text-xs" />
                        <Input
                        id={`name-${fieldKey}`}
                        value={field.name ?? field.key ?? field.id ?? ''}
                        onChange={(e) => handleFieldChange(fieldKey, 'name', e.target.value)}
                        placeholder="field_name"
                        className="h-8 text-sm font-mono"
                      />
                    </div>

                    {(field.type === 'text' || field.type === 'email' || field.type === 'number' || field.type === 'textarea') && (
                      <div className="space-y-1">
                        <FormGuideLabel htmlFor={`placeholder-${fieldKey}`} label="Placeholder" fieldKey="placeholder" helpText={formHelp.placeholder} className="text-xs" />
                        <Input
                          id={`placeholder-${fieldKey}`}
                          value={field.placeholder || ''}
                          onChange={(e) => handleFieldChange(fieldKey, 'placeholder', e.target.value)}
                          placeholder="Enter placeholder text"
                          className="h-8 text-sm"
                        />
                      </div>
                    )}

                    {(field.type === 'select' || field.type === 'radio') && (
                      <div className="space-y-1">
                        <FormGuideLabel htmlFor={`options-${field.id}`} label="Options (comma-separated)" fieldKey="options" helpText={formHelp.options} className="text-xs" />
                        <Input
                          id={`options-${field.id}`}
                          value={field.options?.map(opt => typeof opt === 'string' ? opt : `${opt.label}:${opt.value}`).join(', ') || ''}
                          onChange={(e) => {
                            const options = e.target.value.split(',').map(opt => {
                              const trimmed = opt.trim();
                              if (trimmed.includes(':')) {
                                const [label, value] = trimmed.split(':').map(s => s.trim());
                                return { label, value: value || label };
                              }
                              return { label: trimmed, value: trimmed };
                            }).filter(opt => opt.label);
                            handleFieldChange(fieldKey, 'options', options);
                          }}
                          placeholder="Option 1, Option 2, Option 3"
                          className="h-8 text-sm"
                        />
                      </div>
                    )}

                    <div className="flex items-center gap-2">
                      <Switch
                        checked={field.required}
                        onCheckedChange={(checked) => handleFieldChange(fieldKey, 'required', checked)}
                        id={`required-${fieldKey}`}
                      />
                      <Label htmlFor={`required-${fieldKey}`} className="text-xs cursor-pointer">
                        Required
                      </Label>
                      <InputGuideLink
                        fieldKey="required"
                        fieldLabel="Required"
                        fieldType="boolean"
                        nodeType="form"
                        helpText={formHelp.required}
                        className="mt-0"
                      />
                    </div>
                  </div>

                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveField(fieldKey)}
                    className="h-8 w-8 shrink-0 text-destructive hover:text-destructive"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            );
            })
          )}
        </div>
      </div>

      {/* Submit Button Text */}
      <div className="space-y-2">
        <FormGuideLabel htmlFor="submitButtonText" label="Submit Button Text" fieldKey="submitButtonText" helpText={formHelp.submitButtonText} />
        <Input
          id="submitButtonText"
          value={config.submitButtonText}
          onChange={(e) => handleConfigFieldChange('submitButtonText', e.target.value)}
          placeholder="Submit"
        />
      </div>

      {/* Success Message */}
      <div className="space-y-2">
        <FormGuideLabel htmlFor="successMessage" label="Success Message" fieldKey="successMessage" fieldType="textarea" helpText={formHelp.successMessage} />
        <Textarea
          id="successMessage"
          value={config.successMessage}
          onChange={(e) => handleConfigFieldChange('successMessage', e.target.value)}
          placeholder="Thank you for your submission!"
          rows={2}
        />
      </div>

      {/* Redirect URL */}
      <div className="space-y-2">
        <div className="flex min-w-0 max-w-full items-center justify-between gap-2">
          <Label htmlFor="redirectUrl" className="min-w-0 break-words">Redirect URL (Optional)</Label>
          <InputGuideLink
            fieldKey="redirectUrl"
            fieldLabel="Redirect URL"
            fieldType="url"
            nodeType="form"
            helpText={formHelp.redirectUrl}
            className="mt-0"
          />
        </div>
        <Input
          id="redirectUrl"
          value={config.redirectUrl}
          onChange={(e) => handleConfigFieldChange('redirectUrl', e.target.value)}
          placeholder="https://example.com/thank-you"
        />
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs text-muted-foreground">
            Leave empty to show success message on the same page
          </p>
        </div>
      </div>
    </div>
  );
}

