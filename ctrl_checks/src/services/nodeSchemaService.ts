/**
 * Node Schema Service
 *
 * Fetches node definitions from `{itemBackend}/api/node-definitions`, which serializes
 * UnifiedNodeRegistry (same source as execution). Use this for both:
 * - Properties panel (`PropertiesPanel.tsx`) — schema-driven fields + validation
 * - Autonomous wizard (`AutonomousAgentWizard.tsx`) — question generation / parity
 *
 * Legacy `nodeTypes.ts` / `getNodeDefinition` is a fallback when the API is unavailable.
 */

import { ENDPOINTS } from '@/config/endpoints';

export interface NodeDefinition {
  type: string;
  label: string;
  category: string;
  description: string;
  icon?: string;
  inputSchema: Record<string, InputFieldSchema>;
  outputSchema: Record<string, OutputFieldSchema>;
  credentialSchema?: {
    requirements?: Array<{
      provider: string;
      category: string;
      required: boolean;
      description?: string;
      scopes?: string[];
      requiredScopes?: string[];
      credentialTypeId?: string;
      credentialTypeIds?: string[];
      authType?: string;
      label?: string;
      testable?: boolean;
    }>;
    credentialFields?: string[];
  };
  operationContracts?: Array<{
    resource?: string;
    operation: string;
    label: string;
    requiredFields: string[];
    optionalFields: string[];
    credentialProviders: string[];
    outputFields: string[];
    legacyAliases?: string[];
    status: 'implemented' | 'unsupported' | 'deprecated';
  }>;
  operationFieldPolicies?: Array<{
    resource?: string;
    operation: string;
    activeFields: string[];
    requiredFields: string[];
    optionalFields: string[];
    inactiveFields: string[];
    providerDefaultFields: string[];
    credentialFields: string[];
    diagnostics?: string[];
    fields: Record<string, {
      active: boolean;
      required: boolean;
      allowsEmpty: boolean;
      runtimeAiAllowed: boolean;
      buildtimeAiAllowed: boolean;
      providerOwned: boolean;
      credential: boolean;
      reason: string;
    }>;
  }>;
  requiredInputs: string[];
  outgoingPorts: string[];
  incomingPorts: string[];
  isBranching: boolean;
  defaultInputs: Record<string, any>;
  version?: number;
  /** Internal/legacy-only node: renders and executes in existing workflows, but hidden from the palette. */
  hidden?: boolean;
}

export interface InputFieldSchema {
  type: 'string' | 'number' | 'boolean' | 'array' | 'object' | 'json';
  description: string;
  required: boolean;
  default?: any;
  examples?: any[];
  validation?: (value: any) => boolean | string;
  ui?: {
    options?: Array<{ label: string; value: string }>;
    requiredIf?: { field: string; equals?: any; notEquals?: any };
    visibleIf?: { field: string; equals: unknown };
    widget?: 'text' | 'textarea' | 'json' | 'multi_email' | 'date';
    contextHints?: Array<{ whenValue: string; message: string }>;
  };
  /** From UnifiedNodeRegistry — drives "how to get it" guides in the properties panel */
  helpCategory?: string;
  docsUrl?: string;
  exampleValue?: string;
  fillMode?: {
    default: 'manual_static' | 'runtime_ai' | 'buildtime_ai_once';
    supportsRuntimeAI?: boolean;
    supportsBuildtimeAI?: boolean;
  };
  role?: string;
  essentialForExecution?: boolean;
  /** Ownership category — 'credential' fields are managed by the credential system, not user input */
  ownership?: 'credential' | 'structural' | 'value';
}

export interface OutputFieldSchema {
  type: 'string' | 'number' | 'boolean' | 'array' | 'object' | 'json';
  description: string;
}

class NodeSchemaService {
  private cache: Map<string, { data: NodeDefinition[]; timestamp: number }> = new Map();
  private cacheTTL = 5 * 60 * 1000; // 5 minutes
  private fetchPromise: Promise<NodeDefinition[]> | null = null;

  /**
   * Fetch all node schemas from backend
   */
  async fetchAllSchemas(): Promise<NodeDefinition[]> {
    const cacheKey = 'all';
    const cached = this.cache.get(cacheKey);
    
    // Return cached data if still valid
    if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
      return cached.data;
    }

    // If already fetching, return the same promise
    if (this.fetchPromise) {
      return this.fetchPromise;
    }

    // Fetch from backend
    this.fetchPromise = (async () => {
      try {
        const response = await fetch(`${ENDPOINTS.itemBackend}/api/node-definitions`);
        if (!response.ok) {
          throw new Error(`Failed to fetch node definitions: ${response.statusText}`);
        }
        
        const result = await response.json();
        const schemas = result.nodes || [];
        
        // Cache the result
        this.cache.set(cacheKey, {
          data: schemas,
          timestamp: Date.now(),
        });
        
        this.fetchPromise = null;
        return schemas;
      } catch (error) {
        this.fetchPromise = null;
        console.error('[NodeSchemaService] Error fetching schemas:', error);
        
        // Return cached data if available, even if stale
        if (cached) {
          console.warn('[NodeSchemaService] Using stale cache due to fetch error');
          return cached.data;
        }
        throw error;
      }
    })();

    return this.fetchPromise;
  }

  /**
   * Fetch schema for a specific node type
   */
  async fetchSchemaByType(type: string): Promise<NodeDefinition | null> {
    const allSchemas = await this.fetchAllSchemas();
    return allSchemas.find(s => s.type === type) || null;
  }

  /**
   * Fetch schemas for a specific category
   */
  async fetchSchemasByCategory(category: string): Promise<NodeDefinition[]> {
    const allSchemas = await this.fetchAllSchemas();
    return allSchemas.filter(s => s.category === category);
  }

  /**
   * Clear cache (useful after node updates)
   */
  clearCache(): void {
    this.cache.clear();
    this.fetchPromise = null;
  }

  /**
   * Get cached schemas without fetching
   */
  getCachedSchemas(): NodeDefinition[] | null {
    const cached = this.cache.get('all');
    return cached ? cached.data : null;
  }
}

export const nodeSchemaService = new NodeSchemaService();
