import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  Clock,
  ChevronUp,
  ChevronDown,
  AlertCircle,
  Check,
  ChevronsUpDown,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { InputGuideLink } from './InputGuideLink';

export interface ScheduleTriggerProps {
  defaultCron?: string;
  defaultTimezone?: string;
  onChange?: (schedule: { cronExpression: string; timezone: string }) => void;
  className?: string;
}

interface TimezoneOption {
  value: string; // IANA timezone code
  label: string; // Friendly display name
  offset: string;
}

// Mapping of IANA timezones to friendly names
const TIMEZONE_FRIENDLY_NAMES: Record<string, string> = {
  'UTC': 'UTC (Coordinated Universal Time)',
  'Asia/Kolkata': 'Indian Standard Time (IST)',
  'America/New_York': 'Eastern Time (US)',
  'America/Chicago': 'Central Time (US)',
  'America/Denver': 'Mountain Time (US)',
  'America/Los_Angeles': 'Pacific Time (US)',
  'Europe/London': 'London (GMT/BST)',
  'Europe/Paris': 'Paris (CET/CEST)',
  'Europe/Berlin': 'Berlin (CET/CEST)',
  'Asia/Tokyo': 'Tokyo (JST)',
  'Asia/Shanghai': 'Shanghai (CST)',
  'Asia/Singapore': 'Singapore (SGT)',
  'Australia/Sydney': 'Sydney (AEDT/AEST)',
  'Australia/Melbourne': 'Melbourne (AEDT/AEST)',
  'Asia/Dubai': 'Dubai (GST)',
  'America/Mexico_City': 'Mexico City (CST)',
  'America/Sao_Paulo': 'São Paulo (BRT)',
  'America/Toronto': 'Toronto (EST/EDT)',
  'America/Vancouver': 'Vancouver (PST/PDT)',
  'Europe/Madrid': 'Madrid (CET/CEST)',
  'Europe/Rome': 'Rome (CET/CEST)',
  'Europe/Amsterdam': 'Amsterdam (CET/CEST)',
  'Asia/Hong_Kong': 'Hong Kong (HKT)',
  'Asia/Seoul': 'Seoul (KST)',
  'Asia/Bangkok': 'Bangkok (ICT)',
  'Asia/Jakarta': 'Jakarta (WIB)',
  'Asia/Manila': 'Manila (PHT)',
  'Pacific/Auckland': 'Auckland (NZST/NZDT)',
  'America/Buenos_Aires': 'Buenos Aires (ART)',
  'Africa/Cairo': 'Cairo (EET)',
  'Africa/Johannesburg': 'Johannesburg (SAST)',
  'America/Caracas': 'Caracas (VET)',
};

// Get UTC offset for a timezone
const getTimezoneOffset = (timezone: string): string => {
  try {
    const now = new Date();
    // Try shortOffset first
    const formatter = new Intl.DateTimeFormat('en', {
      timeZone: timezone,
      timeZoneName: 'shortOffset',
    });
    const parts = formatter.formatToParts(now);
    const offsetPart = parts.find((part) => part.type === 'timeZoneName');
    
    if (offsetPart?.value) {
      return offsetPart.value;
    }
    
    // Fallback: calculate offset manually
    const utcDate = new Date(now.toLocaleString('en-US', { timeZone: 'UTC' }));
    const tzDate = new Date(now.toLocaleString('en-US', { timeZone: timezone }));
    const offsetMs = tzDate.getTime() - utcDate.getTime();
    const offsetHours = Math.floor(offsetMs / (1000 * 60 * 60));
    const offsetMinutes = Math.abs(Math.floor((offsetMs % (1000 * 60 * 60)) / (1000 * 60)));
    
    if (offsetHours === 0 && offsetMinutes === 0) {
      return 'GMT';
    }
    
    const sign = offsetHours >= 0 ? '+' : '-';
    const absHours = Math.abs(offsetHours);
    if (offsetMinutes === 0) {
      return `GMT${sign}${absHours}`;
    }
    return `GMT${sign}${absHours}:${offsetMinutes.toString().padStart(2, '0')}`;
  } catch {
    return '';
  }
};

// Get friendly name for a timezone
const getFriendlyTimezoneName = (ianaCode: string): string => {
  return TIMEZONE_FRIENDLY_NAMES[ianaCode] || ianaCode;
};

// Get all timezones with friendly names
const getAllTimezones = (): TimezoneOption[] => {
  // Start with common timezones that have friendly names
  const commonTimezones = [
    'UTC',
    'Asia/Kolkata',
    'America/New_York',
    'America/Chicago',
    'America/Denver',
    'America/Los_Angeles',
    'Europe/London',
    'Europe/Paris',
    'Europe/Berlin',
    'Asia/Tokyo',
    'Asia/Shanghai',
    'Asia/Singapore',
    'Australia/Sydney',
    'Australia/Melbourne',
    'Asia/Dubai',
    'America/Mexico_City',
    'America/Sao_Paulo',
    'America/Toronto',
    'America/Vancouver',
    'Europe/Madrid',
    'Europe/Rome',
    'Europe/Amsterdam',
    'Asia/Hong_Kong',
    'Asia/Seoul',
    'Asia/Bangkok',
    'Asia/Jakarta',
    'Asia/Manila',
    'Pacific/Auckland',
    'America/Buenos_Aires',
    'Africa/Cairo',
    'Africa/Johannesburg',
    'America/Caracas',
  ];

  // Get all IANA timezones if available
  let allIanaTimezones: string[] = [];
  try {
    if (typeof Intl !== 'undefined' && 'supportedValuesOf' in Intl) {
      // TypeScript doesn't know about supportedValuesOf, so we use type assertion
      allIanaTimezones = (Intl as any).supportedValuesOf('timeZone');
    }
  } catch {
    // Fallback to common timezones
  }

  // Combine common timezones (prioritized) with all IANA timezones
  const timezoneSet = new Set<string>();
  
  // Add common timezones first (they'll appear at the top)
  commonTimezones.forEach(tz => timezoneSet.add(tz));
  
  // Add all other IANA timezones
  if (allIanaTimezones.length > 0) {
    allIanaTimezones.forEach(tz => timezoneSet.add(tz));
  } else {
    // Fallback: just use common timezones
    commonTimezones.forEach(tz => timezoneSet.add(tz));
  }

  // Convert to array and create options
  return Array.from(timezoneSet).map((tz) => ({
    value: tz,
    label: getFriendlyTimezoneName(tz),
    offset: getTimezoneOffset(tz),
  }));
};

// Validate cron expression
const validateCronExpression = (cron: string): { valid: boolean; error?: string } => {
  if (!cron || cron.trim() === '') {
    return { valid: false, error: 'Cron expression is required' };
  }

  const parts = cron.trim().split(/\s+/);
  
  // Support both 5-field and 6-field cron (with seconds)
  if (parts.length !== 5 && parts.length !== 6) {
    return { valid: false, error: 'Cron expression must have 5 or 6 fields' };
  }

  // If 6 fields, validate seconds field
  if (parts.length === 6) {
    const seconds = parts[0];
    if (!/^(\*|([0-5]?[0-9])(-([0-5]?[0-9]))?(\/([0-5]?[0-9]))?)(,(\*|([0-5]?[0-9])(-([0-5]?[0-9]))?(\/([0-5]?[0-9]))?))*$/.test(seconds)) {
      return { valid: false, error: 'Invalid seconds field in cron expression' };
    }
  }

  const fields = parts.length === 6 ? parts.slice(1) : parts;
  const [minute, hour, dayOfMonth, month, dayOfWeek] = fields;

  // Validate minute (0-59)
  if (!/^(\*|([0-5]?[0-9])(-([0-5]?[0-9]))?(\/([0-5]?[0-9]))?)(,(\*|([0-5]?[0-9])(-([0-5]?[0-9]))?(\/([0-5]?[0-9]))?))*$/.test(minute)) {
    return { valid: false, error: 'Invalid minute field (0-59)' };
  }

  // Validate hour (0-23)
  if (!/^(\*|([01]?[0-9]|2[0-3])(-([01]?[0-9]|2[0-3]))?(\/([01]?[0-9]|2[0-3]))?)(,(\*|([01]?[0-9]|2[0-3])(-([01]?[0-9]|2[0-3]))?(\/([01]?[0-9]|2[0-3]))?))*$/.test(hour)) {
    return { valid: false, error: 'Invalid hour field (0-23)' };
  }

  // Validate day of month (1-31)
  if (!/^(\*|([12]?[0-9]|3[01])(-([12]?[0-9]|3[01]))?(\/([12]?[0-9]|3[01]))?)(,(\*|([12]?[0-9]|3[01])(-([12]?[0-9]|3[01]))?(\/([12]?[0-9]|3[01]))?))*$/.test(dayOfMonth)) {
    return { valid: false, error: 'Invalid day of month field (1-31)' };
  }

  // Validate month (1-12)
  if (!/^(\*|([1-9]|1[0-2])(-([1-9]|1[0-2]))?(\/([1-9]|1[0-2]))?)(,(\*|([1-9]|1[0-2])(-([1-9]|1[0-2]))?(\/([1-9]|1[0-2]))?))*$/.test(month)) {
    return { valid: false, error: 'Invalid month field (1-12)' };
  }

  // Validate day of week (0-7, where 0 and 7 are Sunday)
  if (!/^(\*|([0-7])(-([0-7]))?(\/([0-7]))?)(,(\*|([0-7])(-([0-7]))?(\/([0-7]))?))*$/.test(dayOfWeek)) {
    return { valid: false, error: 'Invalid day of week field (0-7)' };
  }

  return { valid: true };
};

// Parse cron to extract hour and minute (for daily schedules)
const parseCronToTime = (cron: string): { hour: number; minute: number } | null => {
  const parts = cron.trim().split(/\s+/);
  if (parts.length !== 5 && parts.length !== 6) return null;

  const fields = parts.length === 6 ? parts.slice(1) : parts;
  const [minute, hour, dayOfMonth, month, dayOfWeek] = fields;

  // Only parse if it's a daily schedule (* * * *)
  if (dayOfMonth !== '*' || month !== '*' || dayOfWeek !== '*') return null;

  // Check if hour and minute are simple numbers (not ranges or wildcards)
  const hourMatch = hour.match(/^(\d+)$/);
  const minuteMatch = minute.match(/^(\d+)$/);

  if (!hourMatch || !minuteMatch) return null;

  const parsedHour = parseInt(hourMatch[1], 10);
  const parsedMinute = parseInt(minuteMatch[1], 10);

  if (parsedHour < 0 || parsedHour > 23 || parsedMinute < 0 || parsedMinute > 59) {
    return null;
  }

  return { hour: parsedHour, minute: parsedMinute };
};

// Generate cron from hour and minute
const generateCronFromTime = (hour: number, minute: number): string => {
  return `${minute} ${hour} * * *`;
};

// Cron examples for help modal
const cronExamples = [
  { expression: '* * * * *', description: 'Every minute' },
  { expression: '0 * * * *', description: 'Every hour (at minute 0)' },
  { expression: '*/15 * * * *', description: 'Every 15 minutes' },
  { expression: '0 9 * * *', description: 'Daily at 9:00 AM' },
  { expression: '0 14 * * *', description: 'Daily at 2:00 PM' },
  { expression: '30 8 * * *', description: 'Daily at 8:30 AM' },
  { expression: '0 9 * * 1', description: 'Every Monday at 9:00 AM' },
  { expression: '0 0 * * 0', description: 'Every Sunday at midnight' },
  { expression: '0 9 1 * *', description: 'First day of every month at 9:00 AM' },
  { expression: '0 */6 * * *', description: 'Every 6 hours' },
  { expression: '0 9-17 * * 1-5', description: 'Every hour from 9 AM to 5 PM, Monday to Friday' },
];

export const ScheduleTrigger: React.FC<ScheduleTriggerProps> = ({
  defaultCron = '0 9 * * *',
  defaultTimezone = 'Asia/Kolkata',
  onChange,
  className,
}) => {
  // Initialize state from props (use props directly, not defaults)
  const [cronExpression, setCronExpression] = useState<string>(defaultCron || '0 9 * * *');
  const [timezone, setTimezone] = useState<string>(defaultTimezone || 'Asia/Kolkata');
  const [hour, setHour] = useState<number>(9);
  const [minute, setMinute] = useState<number>(0);
  const [cronError, setCronError] = useState<string | undefined>();
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const scheduleHelp = {
    timezone: 'What this field is: The timezone used to decide when the schedule runs.\nHow to choose it: Pick the timezone where the business process should happen, not necessarily your computer timezone.\nExample: Asia/Kolkata runs at Indian local time. America/New_York runs at New York local time.',
    dailyTime: 'What this field is: The daily time picker updates the cron expression for a simple once-per-day schedule.\nHow to fill it: Use Hour from 0 to 23 and Minute from 0 to 59.\nExample: 09:30 means 9:30 AM in the selected timezone.',
    hour: 'What this field is: The hour of the day for the schedule.\nFormat: Use 24-hour time from 0 to 23.\nExample: 9 means 9 AM, 14 means 2 PM.',
    minute: 'What this field is: The minute within the selected hour.\nFormat: Use a number from 0 to 59.\nExample: 30 means half past the hour.',
  };
  const [isTimezoneOpen, setIsTimezoneOpen] = useState(false);
  const [isManualCronEdit, setIsManualCronEdit] = useState(false);

  const allTimezones = useMemo(() => getAllTimezones(), []);
  
  // Use refs to track previous values and prevent infinite loops
  const prevCronRef = useRef<string>(defaultCron || '0 9 * * *');
  const prevTimezoneRef = useRef<string>(defaultTimezone || 'Asia/Kolkata');
  const onChangeRef = useRef(onChange);
  const updateSourceRef = useRef<'user' | 'props' | null>(null);
  const isInitialMountRef = useRef(true);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Update ref when onChange changes
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  // Filter timezones based on search (for Command component, we'll use the value which includes label)
  const filteredTimezones = useMemo(() => {
    return allTimezones;
  }, [allTimezones]);

  // Initialize from props on mount
  useEffect(() => {
    if (isInitialMountRef.current) {
      const initialCron = defaultCron || '0 9 * * *';
      const initialTimezone = defaultTimezone || 'Asia/Kolkata';
      
      // Parse cron to get hour/minute
      const parsed = parseCronToTime(initialCron);
      if (parsed) {
        setHour(parsed.hour);
        setMinute(parsed.minute);
      } else {
        // If not a daily schedule, try to extract hour/minute from first two fields anyway
        const parts = initialCron.trim().split(/\s+/);
        if (parts.length >= 2) {
          const minutePart = parts[0];
          const hourPart = parts[1];
          const minuteMatch = minutePart.match(/^(\d+)$/);
          const hourMatch = hourPart.match(/^(\d+)$/);
          if (minuteMatch && hourMatch) {
            const h = parseInt(hourMatch[1], 10);
            const m = parseInt(minuteMatch[1], 10);
            if (h >= 0 && h <= 23 && m >= 0 && m <= 59) {
              setHour(h);
              setMinute(m);
            }
          }
        }
      }
      
      setCronExpression(initialCron);
      setTimezone(initialTimezone);
      prevCronRef.current = initialCron;
      prevTimezoneRef.current = initialTimezone;
      isInitialMountRef.current = false;
    }
  }, []); // Only run once on mount

  // Sync with props when they change externally (but only if we didn't just update them ourselves)
  useEffect(() => {
    // Skip on initial mount (handled above)
    if (isInitialMountRef.current) return;
    
    const newCron = defaultCron || '0 9 * * *';
    const newTimezone = defaultTimezone || 'Asia/Kolkata';
    
    // Only sync if props actually changed and we didn't just update them
    if (newCron !== prevCronRef.current && newCron !== cronExpression) {
      updateSourceRef.current = 'props';
      const parsed = parseCronToTime(newCron);
      if (parsed) {
        setHour(parsed.hour);
        setMinute(parsed.minute);
        setIsManualCronEdit(false); // Reset flag when syncing from props
      } else {
        // Try to extract hour/minute even for non-daily schedules
        const parts = newCron.trim().split(/\s+/);
        if (parts.length >= 2) {
          const minutePart = parts[0];
          const hourPart = parts[1];
          const minuteMatch = minutePart.match(/^(\d+)$/);
          const hourMatch = hourPart.match(/^(\d+)$/);
          if (minuteMatch && hourMatch) {
            const h = parseInt(hourMatch[1], 10);
            const m = parseInt(minuteMatch[1], 10);
            if (h >= 0 && h <= 23 && m >= 0 && m <= 59) {
              setHour(h);
              setMinute(m);
            }
          }
        }
      }
      setCronExpression(newCron);
      prevCronRef.current = newCron;
    }
  }, [defaultCron]); // Only depend on defaultCron, not cronExpression
  
  useEffect(() => {
    // Skip on initial mount
    if (isInitialMountRef.current) return;
    
    const newTimezone = defaultTimezone || 'Asia/Kolkata';
    if (newTimezone !== prevTimezoneRef.current && newTimezone !== timezone) {
      updateSourceRef.current = 'props';
      setTimezone(newTimezone);
      prevTimezoneRef.current = newTimezone;
    }
  }, [defaultTimezone]); // Only depend on defaultTimezone, not timezone

  // Validate cron expression
  useEffect(() => {
    const validation = validateCronExpression(cronExpression);
    setCronError(validation.error);
  }, [cronExpression]);

  // Generate cron from time selection (only if not manually editing)
  const handleTimeChange = useCallback(
    (newHour: number, newMinute: number) => {
      updateSourceRef.current = 'user';
      setHour(newHour);
      setMinute(newMinute);
      // Reset manual edit flag when user uses time picker
      setIsManualCronEdit(false);
      const newCron = generateCronFromTime(newHour, newMinute);
      setCronExpression(newCron);
    },
    []
  );

  // Handle hour change
  const handleHourChange = useCallback(
    (newHour: number) => {
      handleTimeChange(newHour, minute);
    },
    [minute, handleTimeChange]
  );

  // Handle minute change
  const handleMinuteChange = useCallback(
    (newMinute: number) => {
      handleTimeChange(hour, newMinute);
    },
    [hour, handleTimeChange]
  );

  // Handle manual cron input
  const handleCronChange = useCallback((value: string) => {
    updateSourceRef.current = 'user';
    setCronExpression(value);
    setIsManualCronEdit(true);

    // Try to parse and update time if it's a simple daily schedule
    const parsed = parseCronToTime(value);
    if (parsed) {
      setHour(parsed.hour);
      setMinute(parsed.minute);
    } else {
      // Try to extract hour/minute even for non-daily schedules
      const parts = value.trim().split(/\s+/);
      if (parts.length >= 2) {
        const minutePart = parts[0];
        const hourPart = parts[1];
        const minuteMatch = minutePart.match(/^(\d+)$/);
        const hourMatch = hourPart.match(/^(\d+)$/);
        if (minuteMatch && hourMatch) {
          const h = parseInt(hourMatch[1], 10);
          const m = parseInt(minuteMatch[1], 10);
          if (h >= 0 && h <= 23 && m >= 0 && m <= 59) {
            setHour(h);
            setMinute(m);
          }
        }
      }
    }
  }, []);

  // Handle timezone change
  const handleTimezoneChange = useCallback((value: string) => {
    updateSourceRef.current = 'user';
    setTimezone(value);
  }, []);

  // Notify parent of changes (debounced, only when values actually change and not during prop sync)
  useEffect(() => {
    // Don't call onChange if we're syncing from props
    if (updateSourceRef.current === 'props') {
      updateSourceRef.current = null;
      return;
    }
    
    // Don't call onChange on initial mount
    if (isInitialMountRef.current) {
      return;
    }
    
    // Only call onChange if values actually changed and there's no error
    const cronChanged = prevCronRef.current !== cronExpression;
    const timezoneChanged = prevTimezoneRef.current !== timezone;
    
    if ((cronChanged || timezoneChanged) && !cronError && onChangeRef.current) {
      // Clear existing debounce timer
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      
      // Debounce onChange to avoid too many updates
      debounceTimerRef.current = setTimeout(() => {
        prevCronRef.current = cronExpression;
        prevTimezoneRef.current = timezone;
        if (onChangeRef.current) {
          onChangeRef.current({ cronExpression, timezone });
        }
        updateSourceRef.current = null;
      }, 300); // 300ms debounce
    }
    
    // Cleanup on unmount
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [cronExpression, timezone, cronError]);

  // Format timezone display
  const formatTimezoneLabel = (tz: TimezoneOption): string => {
    // For friendly names, show: "Friendly Name (Offset)"
    // For IANA codes without friendly names, show: "IANA Code (Offset)"
    if (tz.offset) {
      return `${tz.label} (${tz.offset})`;
    }
    return tz.label;
  };

  // Get current time in selected timezone
  const getCurrentTimeInTimezone = (): string => {
    try {
      const now = new Date();
      const formatter = new Intl.DateTimeFormat('en', {
        timeZone: timezone,
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      });
      return formatter.format(now);
    } catch {
      return '';
    }
  };

  return (
    <div className={cn('space-y-4', className)}>
        {/* Cron Expression Input */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Label htmlFor="cron-expression" className="text-sm font-medium">
              Cron expression
            </Label>
            <Dialog open={isHelpOpen} onOpenChange={setIsHelpOpen}>
              <DialogTrigger asChild>
                <button
                  type="button"
                  className="text-xs text-muted-foreground hover:text-foreground underline focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 rounded"
                  aria-label="How to write Cron?"
                >
                  How to write Cron?
                </button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Cron Expression Guide</DialogTitle>
                  <DialogDescription>
                    Learn how to write cron expressions for scheduling tasks
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div>
                    <h3 className="font-semibold mb-2">Cron Format</h3>
                    <p className="text-sm text-muted-foreground mb-2">
                      A cron expression consists of 5 fields separated by spaces:
                    </p>
                    <div className="bg-muted p-3 rounded-md font-mono text-sm">
                      <div className="grid grid-cols-5 gap-2 mb-2">
                        <div className="text-center">
                          <div className="font-semibold">Minute</div>
                          <div className="text-xs text-muted-foreground">0-59</div>
                        </div>
                        <div className="text-center">
                          <div className="font-semibold">Hour</div>
                          <div className="text-xs text-muted-foreground">0-23</div>
                        </div>
                        <div className="text-center">
                          <div className="font-semibold">Day</div>
                          <div className="text-xs text-muted-foreground">1-31</div>
                        </div>
                        <div className="text-center">
                          <div className="font-semibold">Month</div>
                          <div className="text-xs text-muted-foreground">1-12</div>
                        </div>
                        <div className="text-center">
                          <div className="font-semibold">Weekday</div>
                          <div className="text-xs text-muted-foreground">0-7</div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div>
                    <h3 className="font-semibold mb-2">Special Characters</h3>
                    <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                      <li>
                        <code className="bg-muted px-1 py-0.5 rounded">*</code> - Matches any value
                      </li>
                      <li>
                        <code className="bg-muted px-1 py-0.5 rounded">,</code> - Separates multiple values
                      </li>
                      <li>
                        <code className="bg-muted px-1 py-0.5 rounded">-</code> - Defines a range
                      </li>
                      <li>
                        <code className="bg-muted px-1 py-0.5 rounded">/</code> - Defines a step value
                      </li>
                    </ul>
                  </div>
                  <div>
                    <h3 className="font-semibold mb-2">Common Examples</h3>
                    <div className="space-y-2">
                      {cronExamples.map((example, idx) => (
                        <div
                          key={idx}
                          className="flex items-start gap-3 p-2 rounded-md hover:bg-muted/50"
                        >
                          <code className="font-mono text-sm bg-muted px-2 py-1 rounded flex-shrink-0 min-w-[120px]">
                            {example.expression}
                          </code>
                          <span className="text-sm text-muted-foreground">{example.description}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          <div className="relative">
            <Input
              id="cron-expression"
              type="text"
              value={cronExpression}
              onChange={(e) => handleCronChange(e.target.value)}
              placeholder="e.g., 0 9 * * *"
              className={cn(
                'font-mono',
                cronError && 'border-destructive focus-visible:ring-destructive'
              )}
              aria-label="Cron expression"
              aria-invalid={!!cronError}
              aria-describedby={cronError ? 'cron-error' : undefined}
            />
            {cronError && (
              <div
                id="cron-error"
                className="flex items-center gap-1 mt-1 text-sm text-destructive"
                role="alert"
              >
                <AlertCircle className="h-4 w-4" />
                <span>{cronError}</span>
              </div>
            )}
          </div>
        </div>

        {/* Timezone Dropdown */}
        <div className="space-y-2">
          <div className="flex min-w-0 max-w-full items-center justify-between gap-2">
            <Label htmlFor="timezone-select" className="min-w-0 break-words text-sm font-medium">
              Timezone
            </Label>
            <InputGuideLink
              fieldKey="timezone"
              fieldLabel="Timezone"
              fieldType="select"
              nodeType="schedule"
              helpText={scheduleHelp.timezone}
              className="mt-0"
            />
          </div>
          <Popover open={isTimezoneOpen} onOpenChange={setIsTimezoneOpen}>
            <PopoverTrigger asChild>
              <Button
                id="timezone-select"
                variant="outline"
                role="combobox"
                aria-expanded={isTimezoneOpen}
                aria-label="Select timezone"
                className="w-full justify-between"
              >
                {formatTimezoneLabel(
                  allTimezones.find((tz) => tz.value === timezone) || {
                    value: timezone,
                    label: getFriendlyTimezoneName(timezone),
                    offset: getTimezoneOffset(timezone),
                  }
                )}
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[min(400px,90vw)] p-0" align="start">
              <Command>
                <CommandInput placeholder="Search timezone..." />
                <CommandList>
                  <CommandEmpty>No timezone found.</CommandEmpty>
                  <CommandGroup>
                    {filteredTimezones.map((tz) => {
                      const displayLabel = formatTimezoneLabel(tz);
                      // Include both IANA code and friendly name in search value for better searchability
                      return (
                        <CommandItem
                          key={tz.value}
                          value={`${tz.value} ${tz.label} ${displayLabel}`}
                          onSelect={() => {
                            handleTimezoneChange(tz.value);
                            setIsTimezoneOpen(false);
                          }}
                        >
                          <Check
                            className={cn(
                              'mr-2 h-4 w-4',
                              timezone === tz.value ? 'opacity-100' : 'opacity-0'
                            )}
                          />
                          {displayLabel}
                        </CommandItem>
                      );
                    })}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
          {getCurrentTimeInTimezone() && (
            <p className="text-xs text-muted-foreground">
              Current time in {timezone}: {getCurrentTimeInTimezone()}
            </p>
          )}
          {!getCurrentTimeInTimezone() && timezone && (
            <p className="text-xs text-muted-foreground">
              Timezone: {timezone}
            </p>
          )}
        </div>

        {/* 24-Hour Digital Clock Picker */}
        <div className="space-y-2">
          <div className="flex min-w-0 max-w-full items-center justify-between gap-2">
            <Label className="min-w-0 break-words text-sm font-medium">Pick a time (daily schedule)</Label>
            <InputGuideLink
              fieldKey="dailyTime"
              fieldLabel="Pick a time"
              fieldType="time"
              nodeType="schedule"
              helpText={scheduleHelp.dailyTime}
              className="mt-0"
            />
          </div>
          {/* flex-wrap: the HH:MM steppers + live preview don't fit side by side in narrow
              hosts (320–360px panel) — the preview wraps below instead of clipping */}
          <div className="flex min-w-0 max-w-full flex-wrap items-center justify-center gap-2 p-3 border rounded-lg bg-muted/30">
            {/* Hour Selector */}
            <div className="flex flex-col items-center gap-2">
              <div className="flex items-center gap-1">
                <Label htmlFor="hour-input" className="text-xs text-muted-foreground">
                  Hour
                </Label>
                <InputGuideLink
                  fieldKey="hour"
                  fieldLabel="Hour"
                  fieldType="number"
                  nodeType="schedule"
                  helpText={scheduleHelp.hour}
                  className="mt-0"
                />
              </div>
              <div className="flex flex-col items-center gap-1">
                <button
                  type="button"
                  onClick={() => handleHourChange((hour + 1) % 24)}
                  className="p-1 rounded hover:bg-accent focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  aria-label="Increase hour"
                >
                  <ChevronUp className="h-4 w-4" />
                </button>
                <Input
                  id="hour-input"
                  type="number"
                  min="0"
                  max="23"
                  value={hour.toString().padStart(2, '0')}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10);
                    if (!isNaN(val) && val >= 0 && val <= 23) {
                      handleHourChange(val);
                    }
                  }}
                  className="w-16 text-center font-mono text-lg font-semibold"
                  aria-label="Hour"
                />
                <button
                  type="button"
                  onClick={() => handleHourChange((hour - 1 + 24) % 24)}
                  className="p-1 rounded hover:bg-accent focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  aria-label="Decrease hour"
                >
                  <ChevronDown className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Separator */}
            <div className="flex items-center">
              <span className="text-2xl font-bold">:</span>
            </div>

            {/* Minute Selector */}
            <div className="flex flex-col items-center gap-2">
              <div className="flex items-center gap-1">
                <Label htmlFor="minute-input" className="text-xs text-muted-foreground">
                  Minute
                </Label>
                <InputGuideLink
                  fieldKey="minute"
                  fieldLabel="Minute"
                  fieldType="number"
                  nodeType="schedule"
                  helpText={scheduleHelp.minute}
                  className="mt-0"
                />
              </div>
              <div className="flex flex-col items-center gap-1">
                <button
                  type="button"
                  onClick={() => handleMinuteChange((minute + 1) % 60)}
                  className="p-1 rounded hover:bg-accent focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  aria-label="Increase minute"
                >
                  <ChevronUp className="h-4 w-4" />
                </button>
                <Input
                  id="minute-input"
                  type="number"
                  min="0"
                  max="59"
                  value={minute.toString().padStart(2, '0')}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10);
                    if (!isNaN(val) && val >= 0 && val <= 59) {
                      handleMinuteChange(val);
                    }
                  }}
                  className="w-16 text-center font-mono text-lg font-semibold"
                  aria-label="Minute"
                />
                <button
                  type="button"
                  onClick={() => handleMinuteChange((minute - 1 + 60) % 60)}
                  className="p-1 rounded hover:bg-accent focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  aria-label="Decrease minute"
                >
                  <ChevronDown className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Digital Display */}
            <div className="flex-1 flex items-center justify-center">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-muted-foreground" />
                <span className="text-2xl font-mono font-bold">
                  {hour.toString().padStart(2, '0')}:{minute.toString().padStart(2, '0')}
                </span>
              </div>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            {isManualCronEdit 
              ? 'Cron expression is manually edited. Use time picker to switch back to daily schedule.'
              : 'Changing the time above will automatically update the cron expression to run daily at this time.'}
          </p>
        </div>
      </div>
  );
};

export default ScheduleTrigger;
