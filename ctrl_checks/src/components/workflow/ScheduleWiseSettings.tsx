import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown } from 'lucide-react';
import { InputGuideLink } from './InputGuideLink';
import { useState, useEffect, useRef, useCallback } from 'react';
import { awsClient } from '@/integrations/aws/client';
import { getBackendUrl } from '@/lib/api/getBackendUrl';

interface ScheduleWiseNodeParams {
  operation?: 'getSchedules' | 'createAppointment' | 'updateAppointment' | 'deleteAppointment';
  credentialId?: string;
  dateFrom?: string;
  dateTo?: string;
  patientId?: string;
  staffId?: string;
  limit?: number;
  startDateTime?: string;
  endDateTime?: string;
  serviceType?: string;
  notes?: string;
  appointmentId?: string;
  status?: string;
  hardDelete?: boolean;
  timeoutSec?: number;
  retries?: number;
  outputFormat?: 'json' | 'raw';
  mockMode?: boolean;
}

interface ScheduleWiseSettingsProps {
  config: Partial<ScheduleWiseNodeParams>;
  onConfigChange: (config: Partial<ScheduleWiseNodeParams>) => void;
  nodeId: string;
  workflowId: string;
}

interface Credential {
  id: string;
  name?: string;
  provider: string;
}

// Common workflow expression variables for autocomplete
const EXPRESSION_SUGGESTIONS = [
  '$json.id',
  '$json.data',
  '$json.patientId',
  '$json.staffId',
  '$json.appointmentId',
  '$json.startDateTime',
  '$json.endDateTime',
  '$json.startDate',
  '$json.endDate',
  '$json.status',
  '$json.notes',
  '$json.serviceType',
];

interface ExpressionInputProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  error?: string;
}

function ExpressionInput({ id, value, onChange, placeholder, error }: ExpressionInputProps) {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    onChange(newValue);
    setShowSuggestions(newValue.startsWith('{{'));
  };

  const handleSuggestionClick = (suggestion: string) => {
    onChange(`{{${suggestion}}}`);
    setShowSuggestions(false);
  };

  // Close suggestions on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredSuggestions = value.startsWith('{{')
    ? EXPRESSION_SUGGESTIONS.filter((s) =>
        s.toLowerCase().includes(value.replace('{{', '').replace('}}', '').toLowerCase())
      )
    : EXPRESSION_SUGGESTIONS;

  return (
    <div ref={containerRef} className="relative">
      <Input
        id={id}
        value={value}
        onChange={handleChange}
        onFocus={() => value.startsWith('{{') && setShowSuggestions(true)}
        placeholder={placeholder}
        className={error ? 'border-destructive' : ''}
      />
      {showSuggestions && filteredSuggestions.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-md shadow-md max-h-48 overflow-y-auto">
          <div className="px-2 py-1 text-xs text-muted-foreground border-b">
            Available workflow variables
          </div>
          {filteredSuggestions.map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              className="w-full text-left px-3 py-1.5 text-xs font-mono hover:bg-accent hover:text-accent-foreground"
              onMouseDown={(e) => {
                e.preventDefault();
                handleSuggestionClick(suggestion);
              }}
            >
              {`{{${suggestion}}}`}
            </button>
          ))}
        </div>
      )}
      {error && <p className="text-xs text-destructive mt-1">{error}</p>}
    </div>
  );
}

export default function ScheduleWiseSettings({
  config,
  onConfigChange,
  nodeId,
  workflowId,
}: ScheduleWiseSettingsProps) {
  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [loadingCredentials, setLoadingCredentials] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [touchedFields, setTouchedFields] = useState<Set<string>>(new Set());

  const fetchCredentials = useCallback(async () => {
    if (!workflowId) return;

    setLoadingCredentials(true);
    try {
      const token = (await awsClient.auth.getSession()).data.session?.access_token;
      if (!token) throw new Error('No authentication token');

      const response = await fetch(
        `${getBackendUrl()}/api/credentials/list?workflowId=${encodeURIComponent(workflowId)}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (!response.ok) throw new Error('Failed to load ScheduleWise credentials');

      const data = await response.json();
      const scheduleWiseCredentials = (data.credentials || [])
        .filter((cred: any) => String(cred.key || '').toLowerCase() === 'schedulewise')
        .map((cred: any) => ({
          id: String(cred.key),
          name: cred.metadata?.name || 'ScheduleWise',
          provider: String(cred.key),
        }));

      setCredentials(scheduleWiseCredentials);
    } catch (error) {
      console.error('[ScheduleWiseSettings] Error fetching credentials:', error);
    } finally {
      setLoadingCredentials(false);
    }
  }, [workflowId]);

  // Fetch credentials on mount and when the PropertiesPanel realtime bridge observes changes.
  useEffect(() => {
    fetchCredentials();
    window.addEventListener('connections-realtime-changed', fetchCredentials);
    return () => {
      window.removeEventListener('connections-realtime-changed', fetchCredentials);
    };
  }, [fetchCredentials]);

  const updateConfig = (key: string, value: unknown) => {
    const newConfig = { ...config, [key]: value };
    onConfigChange(newConfig);

    // Mark field as touched and re-validate
    const newTouched = new Set(touchedFields).add(key);
    setTouchedFields(newTouched);
    validateConfig(newConfig, newTouched);
  };

  const validateConfig = (cfg: Partial<ScheduleWiseNodeParams>, touched: Set<string>): boolean => {
    const errors: Record<string, string> = {};
    const op = cfg.operation;

    if (touched.has('credentialId') && !cfg.credentialId) {
      errors.credentialId = 'Credentials are required';
    }
    if (touched.has('operation') && !op) {
      errors.operation = 'Operation is required';
    }

    if (op === 'createAppointment') {
      if (touched.has('startDateTime') && !cfg.startDateTime) errors.startDateTime = 'Start date/time is required';
      if (touched.has('endDateTime') && !cfg.endDateTime) errors.endDateTime = 'End date/time is required';
      if (touched.has('patientId') && !cfg.patientId) errors.patientId = 'Patient ID is required';
      if (touched.has('staffId') && !cfg.staffId) errors.staffId = 'Staff ID is required';
    }
    if (op === 'updateAppointment' || op === 'deleteAppointment') {
      if (touched.has('appointmentId') && !cfg.appointmentId) errors.appointmentId = 'Appointment ID is required';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const operation = config.operation || 'getSchedules';

  return (
    <div className="space-y-4">
      {/* Credential Selector — first field */}
      <div className="space-y-2">
        <div className="flex min-w-0 max-w-full items-center justify-between gap-2">
          <Label htmlFor="credentialId" className="min-w-0 break-words">
            ScheduleWise Credentials <span className="text-destructive">*</span>
          </Label>
          <InputGuideLink
            fieldKey="credentialId"
            fieldLabel="ScheduleWise Credentials"
            fieldType="select"
            nodeType="schedulewise"
            helpCategory="credential_select"
            className="mt-0"
          />
        </div>
        <Select
          value={config.credentialId || ''}
          onValueChange={(value) => updateConfig('credentialId', value)}
          disabled={loadingCredentials}
        >
          <SelectTrigger
            id="credentialId"
            className={validationErrors.credentialId ? 'border-destructive' : ''}
          >
            <SelectValue
              placeholder={loadingCredentials ? 'Loading...' : 'Select credentials'}
            />
          </SelectTrigger>
          <SelectContent>
            {credentials.length === 0 && !loadingCredentials && (
              <SelectItem value="__none__" disabled>
                No credentials found
              </SelectItem>
            )}
            {credentials.map((cred) => (
              <SelectItem key={cred.id} value={cred.id}>
                {cred.name || cred.id}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {validationErrors.credentialId && (
          <p className="text-xs text-destructive">{validationErrors.credentialId}</p>
        )}
      </div>

      {/* Operation */}
      <div className="space-y-2">
        <div className="flex min-w-0 max-w-full items-center justify-between gap-2">
          <Label htmlFor="operation" className="min-w-0 break-words">
            Operation <span className="text-destructive">*</span>
          </Label>
          <InputGuideLink
            fieldKey="operation"
            fieldLabel="Operation"
            fieldType="select"
            nodeType="schedulewise"
            helpCategory="operation_select"
            className="mt-0"
          />
        </div>
        <Select
          value={operation}
          onValueChange={(value) => updateConfig('operation', value)}
        >
          <SelectTrigger
            id="operation"
            className={validationErrors.operation ? 'border-destructive' : ''}
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="getSchedules">Get Schedules</SelectItem>
            <SelectItem value="createAppointment">Create Appointment</SelectItem>
            <SelectItem value="updateAppointment">Update Appointment</SelectItem>
            <SelectItem value="deleteAppointment">Delete Appointment</SelectItem>
          </SelectContent>
        </Select>
        {validationErrors.operation && (
          <p className="text-xs text-destructive">{validationErrors.operation}</p>
        )}
      </div>

      {/* getSchedules fields */}
      {operation === 'getSchedules' && (
        <>
          <div className="space-y-2">
            <Label htmlFor="dateFrom">Date From</Label>
            <ExpressionInput
              id="dateFrom"
              value={config.dateFrom || ''}
              onChange={(v) => updateConfig('dateFrom', v)}
              placeholder="2024-01-01 or {{$json.startDate}}"
            />
            <p className="text-xs text-muted-foreground">ISO 8601 date string</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="dateTo">Date To</Label>
            <ExpressionInput
              id="dateTo"
              value={config.dateTo || ''}
              onChange={(v) => updateConfig('dateTo', v)}
              placeholder="2024-12-31 or {{$json.endDate}}"
            />
            <p className="text-xs text-muted-foreground">ISO 8601 date string</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="patientId">Patient ID</Label>
            <ExpressionInput
              id="patientId"
              value={config.patientId || ''}
              onChange={(v) => updateConfig('patientId', v)}
              placeholder="patient-123 or {{$json.patientId}}"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="staffId">Staff ID</Label>
            <ExpressionInput
              id="staffId"
              value={config.staffId || ''}
              onChange={(v) => updateConfig('staffId', v)}
              placeholder="staff-456 or {{$json.staffId}}"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="limit">Limit</Label>
            <Input
              id="limit"
              type="number"
              value={config.limit ?? ''}
              onChange={(e) =>
                updateConfig('limit', e.target.value ? parseInt(e.target.value) : undefined)
              }
              placeholder="50"
            />
            <p className="text-xs text-muted-foreground">Maximum number of results to return</p>
          </div>
        </>
      )}

      {/* createAppointment fields */}
      {operation === 'createAppointment' && (
        <>
          <div className="space-y-2">
            <Label htmlFor="startDateTime">
              Start Date/Time <span className="text-destructive">*</span>
            </Label>
            <ExpressionInput
              id="startDateTime"
              value={config.startDateTime || ''}
              onChange={(v) => updateConfig('startDateTime', v)}
              placeholder="2024-01-15T09:00:00Z or {{$json.startDateTime}}"
              error={validationErrors.startDateTime}
            />
            <p className="text-xs text-muted-foreground">ISO 8601 datetime string</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="endDateTime">
              End Date/Time <span className="text-destructive">*</span>
            </Label>
            <ExpressionInput
              id="endDateTime"
              value={config.endDateTime || ''}
              onChange={(v) => updateConfig('endDateTime', v)}
              placeholder="2024-01-15T10:00:00Z or {{$json.endDateTime}}"
              error={validationErrors.endDateTime}
            />
            <p className="text-xs text-muted-foreground">ISO 8601 datetime string</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="patientId">
              Patient ID <span className="text-destructive">*</span>
            </Label>
            <ExpressionInput
              id="patientId"
              value={config.patientId || ''}
              onChange={(v) => updateConfig('patientId', v)}
              placeholder="patient-123 or {{$json.patientId}}"
              error={validationErrors.patientId}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="staffId">
              Staff ID <span className="text-destructive">*</span>
            </Label>
            <ExpressionInput
              id="staffId"
              value={config.staffId || ''}
              onChange={(v) => updateConfig('staffId', v)}
              placeholder="staff-456 or {{$json.staffId}}"
              error={validationErrors.staffId}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="serviceType">Service Type</Label>
            <ExpressionInput
              id="serviceType"
              value={config.serviceType || ''}
              onChange={(v) => updateConfig('serviceType', v)}
              placeholder="consultation or {{$json.serviceType}}"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={config.notes || ''}
              onChange={(e) => updateConfig('notes', e.target.value)}
              placeholder="Additional notes or {{$json.notes}}"
              rows={3}
            />
          </div>
        </>
      )}

      {/* updateAppointment fields */}
      {operation === 'updateAppointment' && (
        <>
          <div className="space-y-2">
            <Label htmlFor="appointmentId">
              Appointment ID <span className="text-destructive">*</span>
            </Label>
            <ExpressionInput
              id="appointmentId"
              value={config.appointmentId || ''}
              onChange={(v) => updateConfig('appointmentId', v)}
              placeholder="appt-789 or {{$json.appointmentId}}"
              error={validationErrors.appointmentId}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="startDateTime">Start Date/Time</Label>
            <ExpressionInput
              id="startDateTime"
              value={config.startDateTime || ''}
              onChange={(v) => updateConfig('startDateTime', v)}
              placeholder="2024-01-15T09:00:00Z or {{$json.startDateTime}}"
            />
            <p className="text-xs text-muted-foreground">ISO 8601 datetime string</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="endDateTime">End Date/Time</Label>
            <ExpressionInput
              id="endDateTime"
              value={config.endDateTime || ''}
              onChange={(v) => updateConfig('endDateTime', v)}
              placeholder="2024-01-15T10:00:00Z or {{$json.endDateTime}}"
            />
            <p className="text-xs text-muted-foreground">ISO 8601 datetime string</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="staffId">Staff ID</Label>
            <ExpressionInput
              id="staffId"
              value={config.staffId || ''}
              onChange={(v) => updateConfig('staffId', v)}
              placeholder="staff-456 or {{$json.staffId}}"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <ExpressionInput
              id="status"
              value={config.status || ''}
              onChange={(v) => updateConfig('status', v)}
              placeholder="confirmed, cancelled, etc."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={config.notes || ''}
              onChange={(e) => updateConfig('notes', e.target.value)}
              placeholder="Additional notes or {{$json.notes}}"
              rows={3}
            />
          </div>
        </>
      )}

      {/* deleteAppointment fields */}
      {operation === 'deleteAppointment' && (
        <>
          <div className="space-y-2">
            <Label htmlFor="appointmentId">
              Appointment ID <span className="text-destructive">*</span>
            </Label>
            <ExpressionInput
              id="appointmentId"
              value={config.appointmentId || ''}
              onChange={(v) => updateConfig('appointmentId', v)}
              placeholder="appt-789 or {{$json.appointmentId}}"
              error={validationErrors.appointmentId}
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="hardDelete">Hard Delete</Label>
              <Switch
                id="hardDelete"
                checked={config.hardDelete || false}
                onCheckedChange={(checked) => updateConfig('hardDelete', checked)}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Permanently delete the appointment (cannot be recovered)
            </p>
          </div>
        </>
      )}

      {/* Advanced collapsible section */}
      <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
        <CollapsibleTrigger className="flex items-center justify-between w-full py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
          <span>Advanced</span>
          <ChevronDown
            className={`h-4 w-4 transition-transform duration-200 ${advancedOpen ? 'rotate-180' : ''}`}
          />
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label htmlFor="timeoutSec">Timeout (seconds)</Label>
            <Input
              id="timeoutSec"
              type="number"
              value={config.timeoutSec ?? ''}
              onChange={(e) =>
                updateConfig('timeoutSec', e.target.value ? parseInt(e.target.value) : undefined)
              }
              placeholder="30"
            />
            <p className="text-xs text-muted-foreground">Request timeout in seconds (default: 30)</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="retries">Retries</Label>
            <Input
              id="retries"
              type="number"
              value={config.retries ?? ''}
              onChange={(e) =>
                updateConfig('retries', e.target.value ? parseInt(e.target.value) : undefined)
              }
              placeholder="0"
            />
            <p className="text-xs text-muted-foreground">
              Retry attempts on 5xx/network errors (default: 0)
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="outputFormat">Output Format</Label>
            <Select
              value={config.outputFormat || 'json'}
              onValueChange={(value) => updateConfig('outputFormat', value)}
            >
              <SelectTrigger id="outputFormat">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="json">JSON</SelectItem>
                <SelectItem value="raw">Raw</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="mockMode">Mock Mode</Label>
              <Switch
                id="mockMode"
                checked={config.mockMode || false}
                onCheckedChange={(checked) => updateConfig('mockMode', checked)}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Return synthetic data without calling the API (for testing)
            </p>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
