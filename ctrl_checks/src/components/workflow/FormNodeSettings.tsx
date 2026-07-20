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
  allowMultipleSubmissions: boolean;
  requireAuthentication: boolean;
  captcha: boolean;
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
    formTitle: 'What this field is: The heading people see at the top of the public form.\nWhy it matters: It confirms they opened the right form.\nWhen to fill it: Before sharing the form URL.\nWhat to enter: A short name such as Support Request, Request a Demo, Vendor Onboarding, or Employee Equipment Request.\nWhere the value comes from: Your form purpose.\nHow to use it later: Later nodes usually map answers like {{$json.customer_email}}.\nAccepted format: Plain text.\nReal workplace example: Support Request for a form that creates a helpdesk ticket.\nIf it is empty or wrong: Submitters may be confused.\nCommon mistake: Using internal automation wording instead of submitter-friendly wording.',
    formDescription: 'What this field is: Optional helper text under the form title.\nWhy it matters: It tells submitters what to prepare and what happens next.\nWhen to fill it: Use it when the title alone is not enough.\nWhat to enter: One to three friendly instruction sentences.\nWhere the value comes from: Your team process.\nHow to use it later: It is display text only; later nodes use answers like {{$json.data.message}}.\nAccepted format: Plain text.\nReal workplace example: Tell us what happened and support will reply within one business day.\nIf it is empty or wrong: Users may leave out needed details.\nCommon mistake: Adding private internal notes that submitters can see.',
    fields: 'What this section is: The questions people answer on the form.\nWhy it matters: These become the data later workflow nodes can use.\nWhen to fill it: Add at least one field before sharing the form.\nWhat to enter: One field per answer you need, with a label, internal name, type, and required setting.\nWhere the value comes from: Your intake process.\nHow to use it later: Map answers such as {{$json.email}}, {{$json.data.email}}, or {{$json.files}}.\nAccepted format: Use Add Field, or JSON with name, label, type, required, placeholder, and options.\nReal workplace example: customer_email, issue_category, order_number, and message for a support form.\nIf it is empty or wrong: Later nodes may not find the data they need.\nCommon mistake: Renaming internal names after mapping downstream nodes.',
    fieldLabel: 'What this field is: The visible question text for one answer.\nWhy it matters: Clear labels produce cleaner submissions.\nWhen to fill it: For every field.\nWhat to enter: Work Email, Order Number, Company Name, or How can we help?\nWhere the value comes from: Use words submitters understand.\nHow to use it later: Later nodes map the internal name, such as {{$json.work_email}}, not the label.\nAccepted format: Plain text.\nReal workplace example: Order Number tells customers to enter ORD-1048.\nIf it is empty or wrong: Users may answer incorrectly.\nCommon mistake: Writing customer_email instead of Customer Email.',
    fieldType: 'What this field is: The kind of answer the form collects.\nWhy it matters: It controls validation and the input control.\nWhen to fill it: For every field.\nWhat to enter: text for short answers, email for email addresses, number for numeric values, tel for phone numbers, url for links, date for dates, textarea for long messages, select for a dropdown, checkbox for yes/no, radio for one visible choice, or file for uploads.\nWhere the value comes from: Pick it from the answer format.\nHow to use it later: Values appear under the internal name, such as {{$json.phone_number}}.\nAccepted format: text, email, number, tel, url, date, textarea, select, checkbox, radio, or file.\nReal workplace example: select for Department so routing values stay consistent.\nIf it is empty or wrong: Data may be rejected or messy.\nCommon mistake: Using text when email, number, url, or date validation would help.',
    internalName: 'What this field is: The stable key used in workflow output.\nWhy it matters: Later nodes use it in mappings.\nWhen to fill it: Review it before connecting downstream nodes.\nWhat to enter: Lowercase letters, numbers, and underscores such as customer_email or issue_category.\nWhere the value comes from: The editor can generate it from the label; make it clear and stable.\nHow to use it later: Use {{$json.customer_email}} or {{$json.data.customer_email}}.\nAccepted format: lowercase_with_underscores.\nReal workplace example: issue_category routes requests to Billing or Technical.\nIf it is empty or wrong: Later mappings can fail.\nCommon mistake: Renaming it after downstream nodes already use it.',
    placeholder: 'What this field is: Light example text inside an empty field.\nWhy it matters: It shows the expected format without adding more instructions.\nWhen to fill it: Use it for text-like fields when an example helps.\nWhat to enter: Fake examples such as alex@example.com, ORD-1048, or https://example.com.\nWhere the value comes from: The format your team expects.\nHow to use it later: Placeholder text is not submitted; later nodes use the actual answer like {{$json.order_number}}.\nAccepted format: Plain text, never real customer data.\nReal workplace example: ORD-1048 for Order Number.\nIf it is empty or wrong: Answers may be inconsistent.\nCommon mistake: Treating the placeholder as a submitted default value.',
    options: 'What this field is: Allowed choices for select and radio fields.\nWhy it matters: Fixed choices make routing and reporting reliable.\nWhen to fill it: When the field type is select or radio.\nWhat to enter: Comma-separated choices or label:value pairs.\nWhere the value comes from: Approved departments, categories, statuses, or request types.\nHow to use it later: Branch on {{$json.issue_category}} equals billing or technical.\nAccepted format: Billing, Technical, Sales or Billing Team:billing.\nReal workplace example: Billing Team:billing, Technical Support:technical, Sales:sales.\nIf it is empty or wrong: Submitters may have no useful choices.\nCommon mistake: Changing option values without updating Switch or If/Else nodes.',
    required: 'What this field is: Whether the submitter must answer this question.\nWhy it matters: It prevents missing values later nodes need.\nWhen to fill it: Turn it on only for essential answers.\nWhat to enter: true/on for mandatory answers, false/off for optional ones.\nWhere the value comes from: Your minimum intake requirement.\nHow to use it later: Required answers make mappings like {{$json.customer_email}} safer.\nAccepted format: true or false.\nReal workplace example: true for Work Email on a demo request form.\nIf it is empty or wrong: Too many required fields reduce completion; too few can break the workflow.\nCommon mistake: Marking every question required.',
    submitButtonText: 'What this field is: The action label on the submit button.\nWhy it matters: It tells users what clicking will do.\nWhen to fill it: Change it when Submit is too generic.\nWhat to enter: Send Request, Submit Ticket, Register, Request Demo, or Send Feedback.\nWhere the value comes from: The submitter goal.\nHow to use it later: This is display text only; later nodes use submitted answers like {{$json.email}}.\nAccepted format: Short plain text.\nReal workplace example: Submit Ticket for a support form.\nIf it is empty or wrong: Users may be unsure what happens next.\nCommon mistake: Using vague wording like OK.',
    successMessage: 'What this field is: The confirmation after a successful submission.\nWhy it matters: It prevents duplicate submissions and explains the next step.\nWhen to fill it: Before sharing the form.\nWhat to enter: Confirm receipt and set follow-up expectations.\nWhere the value comes from: Your team response process.\nHow to use it later: Later nodes can send separate follow-ups using {{$json.customer_email}}.\nAccepted format: Plain text.\nReal workplace example: Thanks, we received your request. A specialist will email you within one business day.\nIf it is empty or wrong: Submitters may submit again or contact the team separately.\nCommon mistake: Promising a response time your team cannot meet.',
    redirectUrl: 'What this field is: Optional page users see after submitting.\nWhy it matters: It can send them to next steps, a thank-you page, or onboarding.\nWhen to fill it: Only when submitters should leave the form page.\nWhat to enter: A full HTTPS URL, or leave blank to show the success message.\nWhere the value comes from: A page controlled by your company or team.\nHow to use it later: It changes the user experience only; later nodes still use {{$json.data.email}}.\nAccepted format: A full URL beginning with https://.\nReal workplace example: https://example.com/event/next-steps.\nIf it is empty or wrong: Users stay on the form page or hit a broken link.\nCommon mistake: Using an internal admin URL.',
    allowMultipleSubmissions: 'What this field is: Whether the same person can submit more than once.\nWhy it matters: Some processes are repeatable and some are one-time.\nWhen to fill it: Review it before sharing the form.\nWhat to enter: true for support, feedback, expenses, or maintenance requests; false for applications, votes, RSVPs, or eligibility checks.\nWhere the value comes from: Your business rule.\nHow to use it later: You can still check duplicates with {{$json.employee_id}} or {{$json.customer_email}}.\nAccepted format: true or false.\nReal workplace example: true for IT help requests.\nIf it is empty or wrong: Valid repeats may be blocked or duplicates may appear.\nCommon mistake: Turning it off for customer support.',
    requireAuthentication: 'What this field is: Whether submitters must sign in.\nWhy it matters: It ties submissions to known users for protected processes.\nWhen to fill it: Turn it on for internal or sensitive forms; leave it off for public forms.\nWhat to enter: true to require sign-in, false for public access.\nWhere the value comes from: Your access policy.\nHow to use it later: Later nodes may use submitter identity with {{$json.data}}.\nAccepted format: true or false.\nReal workplace example: true for employee equipment requests.\nIf it is empty or wrong: Public users may be blocked or internal forms may accept anonymous submissions.\nCommon mistake: Enabling it on a marketing lead form.',
    captcha: 'What this field is: A spam-prevention check before submission.\nWhy it matters: It helps stop automated spam from creating workflow runs.\nWhen to fill it: Turn it on for public forms unknown users can reach.\nWhat to enter: true to require CAPTCHA, false for trusted internal forms.\nWhere the value comes from: The form spam risk.\nHow to use it later: CAPTCHA only controls whether the workflow starts; later nodes receive successful answers like {{$json.message}}.\nAccepted format: true or false.\nReal workplace example: true for a public contact form that creates CRM leads.\nIf it is empty or wrong: Spam may create runs or trusted users may face friction.\nCommon mistake: Using CAPTCHA instead of also validating required fields.',
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

      {/* Form Behavior */}
      <div className="space-y-3">
        <Label className="min-w-0 break-words">Form Behavior</Label>

        <div className="flex items-center justify-between gap-2 rounded-md border p-3">
          <div className="flex items-center gap-2 min-w-0">
            <Label htmlFor="allowMultipleSubmissions" className="cursor-pointer min-w-0 break-words">
              Allow Multiple Submissions
            </Label>
            <InputGuideLink
              fieldKey="allowMultipleSubmissions"
              fieldLabel="Allow Multiple Submissions"
              fieldType="boolean"
              nodeType="form"
              helpText={formHelp.allowMultipleSubmissions}
              className="mt-0"
            />
          </div>
          <Switch
            id="allowMultipleSubmissions"
            checked={config.allowMultipleSubmissions}
            onCheckedChange={(checked) => handleConfigFieldChange('allowMultipleSubmissions', checked)}
          />
        </div>

        <div className="flex items-center justify-between gap-2 rounded-md border p-3">
          <div className="flex items-center gap-2 min-w-0">
            <Label htmlFor="requireAuthentication" className="cursor-pointer min-w-0 break-words">
              Require Authentication
            </Label>
            <InputGuideLink
              fieldKey="requireAuthentication"
              fieldLabel="Require Authentication"
              fieldType="boolean"
              nodeType="form"
              helpText={formHelp.requireAuthentication}
              className="mt-0"
            />
          </div>
          <Switch
            id="requireAuthentication"
            checked={config.requireAuthentication}
            onCheckedChange={(checked) => handleConfigFieldChange('requireAuthentication', checked)}
          />
        </div>

        <div className="flex items-center justify-between gap-2 rounded-md border p-3">
          <div className="flex items-center gap-2 min-w-0">
            <Label htmlFor="captcha" className="cursor-pointer min-w-0 break-words">
              Enable CAPTCHA
            </Label>
            <InputGuideLink
              fieldKey="captcha"
              fieldLabel="Enable CAPTCHA"
              fieldType="boolean"
              nodeType="form"
              helpText={formHelp.captcha}
              className="mt-0"
            />
          </div>
          <Switch
            id="captcha"
            checked={config.captcha}
            onCheckedChange={(checked) => handleConfigFieldChange('captcha', checked)}
          />
        </div>
      </div>
    </div>
  );
}

