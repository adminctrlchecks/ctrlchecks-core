import { useMemo, useState, useEffect, useRef } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { cn } from '@/lib/utils';
import { ChevronRight, ChevronDown, Copy, Check } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { GuidedStatusCard } from '@/components/ui/guided-status-card';
import { mapWorkflowIssueToGuidance, type GuidedStatusContent } from '@/lib/workflow-guidance';
import { getAIGuidance } from '@/lib/ai-error-guidance';
import type { DebugNodeError, StructuredDebugError } from '@/stores/debugStore';

interface JsonKey {
  path: string;
  key: string;
  value: unknown;
  level: number;
}

interface JsonKeyItemProps {
  jsonKey: JsonKey;
  onCopy?: (path: string) => void;
  copiedPath: string | null;
}

function JsonKeyItem({ jsonKey, onCopy, copiedPath }: JsonKeyItemProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `output-${jsonKey.path}`,
    data: {
      path: jsonKey.path,
      value: jsonKey.value,
    },
  });

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
      }
    : undefined;

  const valueType = typeof jsonKey.value;
  const isPrimitive = valueType !== 'object' || jsonKey.value === null;
  const [isExpanded, setIsExpanded] = useState(true);
  const isCopied = copiedPath === jsonKey.path;

  const displayValue = useMemo(() => {
    if (jsonKey.value === null) return 'null';
    if (jsonKey.value === undefined) return 'undefined';
    if (typeof jsonKey.value === 'string') {
      const str = jsonKey.value as string;
      return str.length > 50 ? `"${str.substring(0, 50)}..."` : `"${str}"`;
    }
    if (typeof jsonKey.value === 'object') {
      if (Array.isArray(jsonKey.value)) {
        return `[${jsonKey.value.length} items]`;
      }
      return `{${Object.keys(jsonKey.value).length} keys}`;
    }
    return String(jsonKey.value);
  }, [jsonKey.value]);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'group relative',
        isDragging && 'opacity-50 z-50'
      )}
    >
      <div
        className={cn(
          'flex items-center gap-2 py-1.5 px-2 rounded-md cursor-grab active:cursor-grabbing',
          'hover:bg-muted/60 transition-colors',
          'border border-transparent hover:border-border',
          jsonKey.level > 0 && 'ml-4'
        )}
        {...listeners}
        {...attributes}
      >
        {!isPrimitive && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(!isExpanded);
            }}
            className="h-4 w-4 flex items-center justify-center hover:bg-muted rounded"
          >
            {isExpanded ? (
              <ChevronDown className="h-3 w-3" />
            ) : (
              <ChevronRight className="h-3 w-3" />
            )}
          </button>
        )}
        {isPrimitive && <div className="w-4" />}
        
        <span className="text-sm font-mono text-foreground/90 flex-1 min-w-0">
          <span className="text-muted-foreground">{jsonKey.key}</span>
          {!isPrimitive && (
            <span className="text-muted-foreground/60 ml-1">
              {Array.isArray(jsonKey.value) ? '[]' : '{}'}
            </span>
          )}
        </span>
        
        {isPrimitive && (
          <span className="text-xs text-muted-foreground/70 font-mono truncate max-w-[200px]">
            {displayValue}
          </span>
        )}

        {onCopy && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onCopy(jsonKey.path);
            }}
            className={cn(
              'h-6 w-6 flex items-center justify-center rounded opacity-0 group-hover:opacity-100 transition-opacity',
              'hover:bg-muted',
              isCopied && 'opacity-100 text-green-500'
            )}
            title="Copy path"
          >
            {isCopied ? (
              <Check className="h-3.5 w-3.5" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
          </button>
        )}
      </div>
    </div>
  );
}

interface OutputPanelProps {
  outputData: unknown;
  executionTime?: number;
  status?: 'idle' | 'running' | 'success' | 'error';
  error?: DebugNodeError;
  nodeId?: string | null;
  nodeType?: string;
  preferredView?: 'tree' | 'json' | 'table' | 'schema';
  onViewChange?: (view: 'tree' | 'json' | 'table' | 'schema') => void;
}

function isStructuredDebugError(error: DebugNodeError | undefined): error is StructuredDebugError {
  return Boolean(error && typeof error === 'object' && !Array.isArray(error));
}

function getStructuredErrorMessage(error: StructuredDebugError): string {
  return (
    (typeof error.message === 'string' && error.message) ||
    (typeof error.error === 'string' && error.error) ||
    'Execution failed'
  );
}

function shouldFetchAIGuidance(error: StructuredDebugError): boolean {
  const statusCode = typeof error.status === 'number' ? error.status : 0;
  return error.success === false || statusCode >= 500;
}

function formatTechnicalDetails(error: StructuredDebugError): string {
  try {
    return JSON.stringify(error, null, 2);
  } catch {
    return getStructuredErrorMessage(error);
  }
}

export default function OutputPanel({
  outputData,
  executionTime,
  status = 'idle',
  error,
  nodeId,
  nodeType,
  preferredView,
  onViewChange,
}: OutputPanelProps) {
  const { toast } = useToast();
  const [copiedPath, setCopiedPath] = useState<string | null>(null);
  const [aiGuidance, setAiGuidance] = useState<GuidedStatusContent | null>(null);
  const [guidanceLoading, setGuidanceLoading] = useState(false);
  const structuredError = isStructuredDebugError(error) ? error : null;
  const needsAIGuidance = Boolean(structuredError && shouldFetchAIGuidance(structuredError));
  const staticGuidance = useMemo(
    () => (structuredError ? mapWorkflowIssueToGuidance(structuredError) : null),
    [structuredError]
  );
  // 'attention' is the tone `mapWorkflowIssueToGuidance` reserves exclusively for its generic,
  // unclassified catch-all. Any other tone means the error text was actually recognized (a
  // provider rejection like Slack not_in_channel, a readiness/missing-field issue, an auth
  // issue, etc.) — that precise classification must win over a generic AI-fetched guidance.
  const staticGuidanceHasDetails = Boolean(staticGuidance) && staticGuidance!.tone !== 'attention';
  const guidedError = staticGuidanceHasDetails
    ? staticGuidance
    : needsAIGuidance
      ? aiGuidance
      : staticGuidance;
  const isGuidanceLoading = needsAIGuidance && !staticGuidanceHasDetails && (guidanceLoading || !guidedError);
  const technicalDetails = structuredError ? formatTechnicalDetails(structuredError) : '';

  useEffect(() => {
    // Skip the network round-trip entirely once the static classifier already produced a
    // specific answer — it will be shown in preference to aiGuidance regardless.
    if (!structuredError || !needsAIGuidance || staticGuidanceHasDetails) {
      setAiGuidance(null);
      setGuidanceLoading(false);
      return;
    }

    let cancelled = false;
    setAiGuidance(null);
    setGuidanceLoading(true);

    getAIGuidance(
      {
        code: typeof structuredError.code === 'string' ? structuredError.code : undefined,
        message: getStructuredErrorMessage(structuredError),
        hint: typeof structuredError.hint === 'string' ? structuredError.hint : undefined,
        details: structuredError.details,
      },
      { nodeType }
    )
      .then((guidance) => {
        if (!cancelled) setAiGuidance(guidance);
      })
      .finally(() => {
        if (!cancelled) setGuidanceLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [structuredError, needsAIGuidance, nodeType]);
  
  // Match Node-RED style debugging: default to raw JSON, with Tree/Table/Schema
  // available when the user explicitly wants another projection.
  const getDefaultView = (_data: unknown): 'tree' | 'json' | 'table' | 'schema' => {
    return 'json';
  };
  
  // PERMANENT FIX: Use preferredView from store if available, otherwise calculate default
  // This ensures view preference persists across ALL re-renders, remounts, and tab switches
  const getInitialView = (): 'tree' | 'json' | 'table' | 'schema' => {
    // 1. Use stored preference if available (user has set it before)
    if (preferredView) return preferredView;
    // 2. Otherwise, calculate default based on data structure
    return getDefaultView(outputData);
  };
  
  const [view, setView] = useState<'tree' | 'json' | 'table' | 'schema'>(getInitialView);
  
  // Track if we've initialized to avoid resetting on re-renders
  const initializedRef = useRef<boolean>(false);
  
  // Initialize view only once when component first mounts or when new data appears
  useEffect(() => {
    const hasData = outputData !== null && outputData !== undefined;
    
    // Only auto-set default view if:
    // 1. We haven't initialized yet AND data exists
    // 2. OR user hasn't set a preference yet (preferredView is undefined)
    if (hasData && !initializedRef.current && !preferredView) {
      const defaultView = getDefaultView(outputData);
      setView(defaultView);
      initializedRef.current = true;
    } else if (preferredView) {
      // If user has a stored preference, always use it (even on remount)
      setView(preferredView);
      initializedRef.current = true;
    }
  }, [outputData, preferredView]);
  
  // Handler for manual view changes - PERMANENTLY save to store
  const handleViewChange = (newView: string) => {
    const viewValue = newView as 'tree' | 'json' | 'table' | 'schema';
    setView(viewValue);
    // PERMANENTLY save to store - this persists across everything
    if (onViewChange) {
      onViewChange(viewValue);
    }
  };

  const safeJsonString = useMemo(() => {
    if (outputData === undefined) return '';
    
    // Handle string outputs that might contain malformed object representations
    if (typeof outputData === 'string') {
      // Check if string contains "[object Object]" - indicates improper stringification
      if (outputData.includes('[object Object]')) {
        // Try to extract original data from input if available
        // For now, show a helpful message
        return JSON.stringify({
          _warning: 'Output contains "[object Object]" - this usually means objects were converted to strings incorrectly',
          _raw_output: outputData,
          _suggestion: 'Check the node configuration - it should use JSON.stringify() for objects/arrays',
        }, null, 2);
      }
      // If it's a valid JSON string, try to parse and pretty-print it
      try {
        const parsed = JSON.parse(outputData);
        return JSON.stringify(parsed, null, 2);
      } catch {
        // Not valid JSON, return as-is (quoted string)
        return JSON.stringify(outputData, null, 2);
      }
    }
    
    try {
      return JSON.stringify(outputData, null, 2);
    } catch {
      return '"[Unserializable output]"';
    }
  }, [outputData]);

  // UNIVERSAL Table Model - works for ANY node output structure
  const tableModel = useMemo(() => {
    // Helper: Try to parse JSON string if output is a string
    const tryParseJson = (data: unknown): unknown => {
      if (typeof data === 'string') {
        try {
          const parsed = JSON.parse(data);
          return parsed;
        } catch {
          // Not valid JSON, return original
          return data;
        }
      }
      return data;
    };

    const arrayRowsToObjects = (
      rows: unknown[],
      headers?: unknown
    ): Array<Record<string, unknown>> | null => {
      if (!rows.every(Array.isArray)) return null;
      const headerList = Array.isArray(headers) && headers.every((h) => typeof h === 'string')
        ? headers as string[]
        : [];
      return rows.map((row, rowIndex) => {
        const values = row as unknown[];
        return values.reduce<Record<string, unknown>>((acc, value, index) => {
          acc[headerList[index] || `column_${index + 1}`] = value;
          return acc;
        }, { _row: rowIndex + 1 });
      });
    };

    const extractArrayProperty = (obj: Record<string, unknown>): Array<Record<string, unknown>> | null => {
      const arrayProps = ['items', 'data', 'results', 'rows', 'records', 'list', 'array', 'output', 'values'];
      for (const prop of arrayProps) {
        if (!Array.isArray(obj[prop])) continue;
        const arr = obj[prop] as unknown[];
        const objects = arr.filter((item) => item && typeof item === 'object' && !Array.isArray(item));
        if (objects.length > 0) return objects as Array<Record<string, unknown>>;
        const mappedRows = arrayRowsToObjects(arr, obj.headers);
        if (mappedRows && mappedRows.length > 0) return mappedRows;
      }
      return null;
    };

    // Helper: Extract array of objects from various output shapes
    const extractTableData = (data: unknown): Array<Record<string, unknown>> | null => {
      // Case 1: Direct array
      if (Array.isArray(data)) {
        const objects = data.filter((item) => item && typeof item === 'object' && !Array.isArray(item));
        if (data.length === 1 && objects.length === 1) {
          const nested = extractArrayProperty(objects[0] as Record<string, unknown>);
          if (nested) return nested;
        }
        if (objects.length > 0) return objects as Array<Record<string, unknown>>;
        return arrayRowsToObjects(data);
      }

      // Case 2: Object with common array properties
      if (data && typeof data === 'object') {
        const obj = data as Record<string, unknown>;
        const nested = extractArrayProperty(obj);
        if (nested) return nested;

        // Case 3: Object itself might be a single row (convert to array)
        const keys = Object.keys(obj);
        if (keys.length > 0 && !keys.some(k => typeof obj[k] === 'object' && obj[k] !== null && !Array.isArray(obj[k]))) {
          // Single object - wrap in array
          return [obj];
        }
      }

      // Case 4: Try parsing if it's a string
      const parsed = tryParseJson(data);
      if (parsed !== data) {
        return extractTableData(parsed);
      }

      return null;
    };

    const tableData = extractTableData(outputData);
    if (!tableData || tableData.length === 0) return null;

    // Limit to 100 rows for performance
    const limited = tableData.slice(0, 100);
    
    // Collect all unique column names from all rows
    const allColumns = new Set<string>();
    limited.forEach((row) => {
      Object.keys(row).forEach((key) => allColumns.add(key));
    });

    const columns = Array.from(allColumns).sort();

    return {
      rows: limited,
      columns,
      total: tableData.length,
    };
  }, [outputData]);

  // UNIVERSAL Schema Inference - works for ANY node output structure
  const inferredSchema = useMemo(() => {
    type Schema =
      | { type: 'null' }
      | { type: 'string' }
      | { type: 'number' }
      | { type: 'boolean' }
      | { type: 'array'; items: Schema; minItems?: number; maxItems?: number }
      | { type: 'object'; properties: Record<string, Schema>; required?: string[] };

    // Track visited objects to prevent circular reference issues
    const visited = new WeakSet();

    const infer = (v: unknown, depth: number = 0, path: string = 'root'): Schema => {
      // Prevent infinite recursion
      if (depth > 5) {
        return { type: 'string' }; // Fallback to string for deep nesting
      }

      // Handle null/undefined
      if (v === null || v === undefined) {
        return { type: 'null' };
      }

      // Handle primitives
      const t = typeof v;
      if (t === 'string') {
        const str = v as string;
        // Try to detect if it's a JSON string
        if (str.length > 0 && (str.startsWith('{') || str.startsWith('['))) {
          try {
            const parsed = JSON.parse(str);
            return infer(parsed, depth + 1, `${path}.parsed`);
          } catch {
            // Not valid JSON, treat as string
          }
        }
        return { type: 'string' };
      }
      if (t === 'number') {
        // Check if it's an integer or float
        return Number.isInteger(v) ? { type: 'number' } : { type: 'number' };
      }
      if (t === 'boolean') {
        return { type: 'boolean' };
      }

      // Handle arrays
      if (Array.isArray(v)) {
        if (v.length === 0) {
          return { type: 'array', items: { type: 'null' }, minItems: 0, maxItems: 0 };
        }

        // Sample up to 50 items for schema inference
        const sample = v.slice(0, 50);
        const itemSchemas = sample.map((x, idx) => infer(x, depth + 1, `${path}[${idx}]`));

        // Merge schemas: if all items have same type, use that; otherwise use union
        const uniqueTypes = new Set(itemSchemas.map(s => s.type));
        
        if (uniqueTypes.size === 1) {
          // All items have same type
          const firstSchema = itemSchemas[0];
          return {
            type: 'array',
            items: firstSchema,
            minItems: v.length,
            maxItems: v.length,
          };
        } else {
          // Mixed types - prefer object/array over primitives
          const objectSchema = itemSchemas.find(s => s.type === 'object');
          const arraySchema = itemSchemas.find(s => s.type === 'array');
          const merged = objectSchema || arraySchema || itemSchemas[0] || { type: 'null' as const };
          
          return {
            type: 'array',
            items: merged,
            minItems: v.length,
            maxItems: v.length,
          };
        }
      }

      // Handle objects
      if (t === 'object' && v !== null && !Array.isArray(v)) {
        // Check for circular references (WeakSet only works with objects)
        if (visited.has(v as object)) {
          return { type: 'object', properties: {} };
        }
        visited.add(v as object);

        try {
          const obj = v as Record<string, unknown>;
          const keys = Object.keys(obj);
          
          if (keys.length === 0) {
            visited.delete(v as object);
            return { type: 'object', properties: {} };
          }

          // Limit to 100 properties for performance
          const limitedKeys = keys.slice(0, 100);
          const props: Record<string, Schema> = {};
          const required: string[] = [];

          limitedKeys.forEach((k) => {
            try {
              props[k] = infer(obj[k], depth + 1, `${path}.${k}`);
              // Consider required if value is not null/undefined
              if (obj[k] !== null && obj[k] !== undefined) {
                required.push(k);
              }
            } catch (err) {
              // Skip properties that cause errors (circular refs, etc.)
              props[k] = { type: 'string' };
            }
          });

          visited.delete(v as object);

          return {
            type: 'object',
            properties: props,
            required: required.length > 0 ? required : undefined,
          };
        } catch (err) {
          // Fallback for objects that can't be processed
          visited.delete(v as object);
          return { type: 'object', properties: {} };
        }
      }

      // Fallback
      return { type: 'string' };
    };

    try {
      return infer(outputData);
    } catch (err) {
      // Ultimate fallback
      return { type: 'string' };
    }
  }, [outputData]);

  // Flatten JSON object into draggable keys
  // For Google Sheets and similar nodes, prioritize showing 'items' over raw 'values'
  const jsonKeys = useMemo(() => {
    if (!outputData) return [];

    // If output has both 'items' (transformed) and 'values' (raw), prioritize 'items' in Tree view
    let dataToTraverse = outputData;
    if (outputData && typeof outputData === 'object' && !Array.isArray(outputData)) {
      const obj = outputData as Record<string, unknown>;
      // If we have 'items' (array of objects), show a simplified view focusing on items
      if (Array.isArray(obj.items) && obj.items.length > 0) {
        const firstItem = obj.items[0];
        // Only prioritize if items are objects (not arrays)
        if (firstItem && typeof firstItem === 'object' && !Array.isArray(firstItem)) {
          // Create a simplified object that prioritizes items
          dataToTraverse = {
            items: obj.items,
            ...(obj.range ? { range: obj.range } : {}),
            ...(obj.headers ? { headers: obj.headers } : {}),
            // Include values but mark it as secondary (only if it exists and is different)
            ...(obj.values && JSON.stringify(obj.values) !== JSON.stringify(obj.items) 
              ? { _raw_values: obj.values } 
              : {}),
          };
        }
      }
    }

    const keys: JsonKey[] = [];

    function traverse(obj: unknown, prefix: string = '', level: number = 0) {
      const keyFromPrefix = (p: string, fallback: string) => {
        if (!p) return fallback;
        const lastDot = p.lastIndexOf('.');
        const last = lastDot >= 0 ? p.slice(lastDot + 1) : p;
        return last;
      };

      if (obj === null || obj === undefined) {
        keys.push({ path: prefix || 'null', key: keyFromPrefix(prefix, 'null'), value: obj, level });
        return;
      }

      if (Array.isArray(obj)) {
        if (obj.length === 0) {
          keys.push({ path: prefix || '[]', key: keyFromPrefix(prefix, '[]'), value: obj, level });
          return;
        }

        obj.forEach((item, index) => {
          const itemPath = prefix ? `${prefix}[${index}]` : `[${index}]`;
          // Use full path as key to ensure uniqueness across nested arrays
          const displayKey = prefix ? `[${index}]` : `[${index}]`;
          keys.push({
            path: itemPath,
            key: displayKey,
            value: item,
            level,
          });
          // Only recurse if item is an object or array (not primitive)
          if (typeof item === 'object' && item !== null) {
            traverse(item, itemPath, level + 1);
          }
        });
        return;
      }

      if (typeof obj === 'object') {
        const objKeys = Object.keys(obj);
        if (objKeys.length === 0) {
          keys.push({ path: prefix || '{}', key: keyFromPrefix(prefix, '{}'), value: obj, level });
          return;
        }

        for (const k of objKeys) {
          const fullPath = prefix ? `${prefix}.${k}` : k;
          const value = (obj as Record<string, unknown>)[k];
          keys.push({ path: fullPath, key: k, value, level });
          // Recurse into both objects and arrays
          if (typeof value === 'object' && value !== null) {
            traverse(value, fullPath, level + 1);
          }
        }
        return;
      }

      // Primitive - don't create duplicate entry if we already added it as an array/object item
      // Only add if prefix is empty (root level primitive) or if it's a property key
      if (!prefix || !prefix.includes('[')) {
        keys.push({ path: prefix || String(obj), key: keyFromPrefix(prefix, String(obj)), value: obj, level });
      }
    }

    traverse(dataToTraverse);
    // Remove any duplicate paths (shouldn't happen, but safety check)
    const seen = new Set<string>();
    return keys.filter((k) => {
      if (seen.has(k.path)) {
        return false;
      }
      seen.add(k.path);
      return true;
    });
  }, [outputData]);

  const handleCopy = (path: string) => {
    navigator.clipboard.writeText(path);
    setCopiedPath(path);
    setTimeout(() => setCopiedPath(null), 2000);
    toast({
      title: 'Copied',
      description: `Path "${path}" copied to clipboard`,
    });
  };

  return (
    <div className="h-full flex flex-col bg-background border-l border-border">
        <div className="px-4 py-3 border-b border-border bg-muted/30">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Output</h3>
              {executionTime !== undefined && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  Executed in {executionTime}ms
                </p>
              )}
            </div>
            {status === 'running' && (
              <div className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
            )}
            {status === 'success' && (
              <div className="h-2 w-2 rounded-full bg-green-500" />
            )}
            {status === 'error' && (
              <div className="h-2 w-2 rounded-full bg-red-500" />
            )}
          </div>

          <div className="mt-3">
            <Tabs value={view} onValueChange={handleViewChange}>
              <TabsList className="h-8">
                <TabsTrigger className="h-7 px-2 text-xs" value="tree">Tree</TabsTrigger>
                <TabsTrigger className="h-7 px-2 text-xs" value="json">JSON</TabsTrigger>
                <TabsTrigger className="h-7 px-2 text-xs" value="table" disabled={!tableModel}>Table</TabsTrigger>
                <TabsTrigger className="h-7 px-2 text-xs" value="schema">Schema</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>
        
        {structuredError && status === 'error' && (
          <div className="px-4 py-3 space-y-3 border-b border-border bg-muted/10">
            {guidedError ? (
              <GuidedStatusCard
                title={guidedError.title}
                description={guidedError.description}
                resolution={guidedError.resolution}
                details={guidedError.details}
                missingItems={guidedError.missingItems}
                nextSteps={guidedError.nextSteps}
                tone={guidedError.tone}
              />
            ) : isGuidanceLoading ? (
              <GuidedStatusCard
                title="Preparing guidance"
                description="Reading the execution error and turning it into the next useful step."
                tone="attention"
              />
            ) : (
              <GuidedStatusCard
                title="Execution needs attention"
                description={getStructuredErrorMessage(structuredError)}
                tone="attention"
              />
            )}
            <details className="rounded-md border border-border/50 bg-background/60 px-3 py-2 text-xs">
              <summary className="cursor-pointer select-none font-medium text-muted-foreground hover:text-foreground">
                Technical details
              </summary>
              <pre className="mt-2 max-h-56 overflow-auto whitespace-pre-wrap break-words font-mono text-[11px] text-muted-foreground">
                {technicalDetails}
              </pre>
            </details>
          </div>
        )}

        {typeof error === 'string' && (
          <div className="px-4 py-3 bg-destructive/10 border-b border-border">
            <p className="text-sm text-destructive font-mono">{error}</p>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-2">
          {!outputData && status === 'idle' ? (
            <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
              No output data. Click "Run Node" to execute.
            </div>
          ) : view === 'json' ? (
            <div className="space-y-2">
              <div className="flex justify-end">
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(safeJsonString);
                    toast({ title: 'Copied', description: 'JSON copied to clipboard' });
                  }}
                  className="text-xs px-2 py-1 rounded border border-border hover:bg-muted transition-colors"
                >
                  Copy JSON
                </button>
              </div>
              <div className="bg-muted/30 border border-border rounded-md p-3 overflow-auto max-h-full">
                <pre className="text-xs font-mono whitespace-pre-wrap break-words text-foreground">
                  {safeJsonString || '(empty)'}
                </pre>
              </div>
            </div>
          ) : view === 'schema' ? (
            <div className="bg-muted/30 border border-border rounded-md p-3 overflow-auto max-h-full">
              <pre className="text-xs font-mono whitespace-pre-wrap break-words text-foreground">
                {JSON.stringify(inferredSchema, null, 2)}
              </pre>
            </div>
          ) : view === 'table' ? (
            tableModel ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between px-1">
                  <div className="text-xs text-muted-foreground">
                    Showing {tableModel.rows.length} of {tableModel.total} {tableModel.total === 1 ? 'row' : 'rows'}
                    {tableModel.total > tableModel.rows.length && ` (first ${tableModel.rows.length} shown)`}
                  </div>
                  {tableModel.total > tableModel.rows.length && (
                    <div className="text-xs text-muted-foreground italic">
                      Use JSON view to see all data
                    </div>
                  )}
                </div>
                <div className="border border-border rounded-md overflow-auto max-h-[600px]">
                  <Table>
                    <TableHeader className="sticky top-0 bg-muted/95 z-10">
                      <TableRow>
                        {tableModel.columns.map((c) => (
                          <TableHead key={c} className="whitespace-nowrap bg-muted/50 font-semibold">
                            {c}
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {tableModel.rows.map((r, idx) => (
                        <TableRow key={idx} className="hover:bg-muted/30">
                          {tableModel.columns.map((c) => {
                            const cellValue = r[c];
                            return (
                              <TableCell key={c} className="align-top max-w-[200px]">
                                <div className="text-xs break-words">
                                  {cellValue === null || cellValue === undefined ? (
                                    <span className="text-muted-foreground italic">(null)</span>
                                  ) : typeof cellValue === 'string' ? (
                                    <span className="whitespace-pre-wrap">{cellValue}</span>
                                  ) : typeof cellValue === 'number' || typeof cellValue === 'boolean' ? (
                                    <span className="font-mono">{String(cellValue)}</span>
                                  ) : Array.isArray(cellValue) ? (
                                    <span className="font-mono text-muted-foreground">
                                      Array({cellValue.length})
                                    </span>
                                  ) : typeof cellValue === 'object' ? (
                                    <span className="font-mono text-muted-foreground">
                                      Object({Object.keys(cellValue).length} keys)
                                    </span>
                                  ) : (
                                    <span className="font-mono text-muted-foreground">
                                      {JSON.stringify(cellValue)}
                                    </span>
                                  )}
                                </div>
                              </TableCell>
                            );
                          })}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-4 space-y-2">
                <div className="text-sm font-medium">Table view not available</div>
                <div className="text-xs text-center max-w-md">
                  {outputData === null || outputData === undefined ? (
                    <span>Output is empty or null</span>
                  ) : typeof outputData === 'string' ? (
                    <span>Output is a string. Table view requires an array of objects or an object with array properties (items, data, results, rows).</span>
                  ) : typeof outputData === 'number' || typeof outputData === 'boolean' ? (
                    <span>Output is a primitive value. Table view requires structured data (arrays or objects).</span>
                  ) : Array.isArray(outputData) ? (
                    <span>Array contains non-object items. Table view requires an array of objects.</span>
                  ) : (
                    <span>Output is an object but doesn't contain a table-compatible array. Try JSON or Tree view.</span>
                  )}
                </div>
                <div className="text-xs text-muted-foreground/70 mt-2">
                  Tip: Use JSON view to see the full output structure
                </div>
              </div>
            )
          ) : jsonKeys.length === 0 ? (
            <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
              Empty output
            </div>
          ) : (
            <div className="space-y-0.5">
              {jsonKeys.map((key, idx) => (
                <JsonKeyItem
                  key={`${key.path}-${idx}`}
                  jsonKey={key}
                  onCopy={handleCopy}
                  copiedPath={copiedPath}
                />
              ))}
            </div>
          )}
        </div>
      </div>
  );
}
