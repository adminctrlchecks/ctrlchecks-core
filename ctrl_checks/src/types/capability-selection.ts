/**
 * Frontend-facing type contracts for the Capability-Based Node Selection Flow.
 *
 * This file mirrors only the shapes needed by the UI — it does not include
 * backend-only error/result types or pipeline internals.
 *
 * Requirements: 2.8, 4.3
 */

// ─── Use-Case Unit ────────────────────────────────────────────────────────────

export interface UseCaseUnit {
  unitId: string;
  label: string;
  semanticRole: 'trigger' | 'data_source' | 'communication' | 'transformation' | 'output' | 'logic';
  description: string;
  orderIndex: number;
}

// ─── Candidate Node ───────────────────────────────────────────────────────────

export interface CandidateNode {
  nodeType: string;
  label: string;
  description: string;
  credentialRequirements: string[];
  /**
   * Providers this node needs, so the UI can name the service on a connect action
   * ("Google Sheets — connect"). Mirrors CandidateNode in the worker's capability-types.ts.
   */
  credentialProviders?: string[];
  /**
   * Provider-level vault check: true only when EVERY requirement is present. Cheap and
   * not scope-aware — the authoritative answer comes from
   * POST /api/capability-selection/connection-readiness for selected nodes only.
   */
  hasCredentials: boolean;
}

// ─── Capability Container ─────────────────────────────────────────────────────

export interface CapabilityContainer {
  containerId: string;
  label: string;
  useCaseUnit: UseCaseUnit;
  candidates: CandidateNode[];
}

// ─── Node Selection Map ───────────────────────────────────────────────────────

/** containerId → selected nodeType */
export type NodeSelectionMap = Record<string, string>;
