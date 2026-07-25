/**
 * Admin API Client
 * Admin-only template operations
 */

import { awsClient } from '@/integrations/aws/client';
import type { Database } from '@/integrations/aws/types';
import { ENDPOINTS } from '@/config/endpoints';

type Template = Database['public']['Tables']['templates']['Row'];
type TemplateInsert = Database['public']['Tables']['templates']['Insert'];
type TemplateUpdate = Database['public']['Tables']['templates']['Update'];
type AppRole = Database['public']['Enums']['app_role'];

const ADMIN_API_BASE = `${ENDPOINTS.itemBackend}/admin-templates`;
const ADMIN_USERS_API_BASE = `${ENDPOINTS.itemBackend}/admin-users`;
const ADMIN_LANDING_DEMO_API_BASE = `${ENDPOINTS.itemBackend}/api/admin-landing-demo`;

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  status: 'active' | 'pending' | 'disabled';
  /** Auth ban (admin suspension); user cannot sign in until reinstated */
  suspended: boolean;
  role: AppRole;
}

export interface AdminUserWorkflowSummary {
  id: string;
  title: string;
  /** Number of workflow executions (runs) */
  workflowRuns: number;
  /** LLM calls recorded during workflow build/configure */
  aiBuildCalls: number;
  tokensUsedToBuild: number;
  status: 'active' | 'inactive';
  /** @deprecated Same as workflowRuns */
  apiCalls?: number;
}

export interface AdminUserDetails extends AdminUser {
  subscriptionTaken: boolean;
  firstSignInAt: string | null;
  lastSignInAt: string | null;
  totalWorkflowsBuilt: number;
  workflows: AdminUserWorkflowSummary[];
}

export interface LandingDemoNode {
  label: string;
  icon: string;
  category: string;
  position: {
    x: number;
    y: number;
  };
}

export interface LandingDemoEdge {
  source: string;
  target: string;
  sourceHandle?: string;
  label?: string;
}

export interface LandingDemoStep {
  id: string;
  type: 'node' | 'edge';
  delayMs: number;
  node?: LandingDemoNode;
  edge?: LandingDemoEdge;
}

export interface LandingDemoScript {
  steps: LandingDemoStep[];
}

export interface LandingDemoScenario {
  id: string;
  label: string;
  sortOrder: number;
  isActive: boolean;
  script: LandingDemoScript;
  createdBy?: string | null;
  createdAt: string;
  updatedAt: string;
}

export type LandingDemoScenarioInput = Pick<LandingDemoScenario, 'label' | 'sortOrder' | 'isActive' | 'script'>;

function normalizeAdminUser(raw: Partial<AdminUser> & { id: string }): AdminUser {
  return {
    id: raw.id,
    name: raw.name ?? '',
    email: raw.email ?? '',
    status: raw.status ?? 'active',
    suspended: Boolean(raw.suspended),
    role: raw.role ?? 'user',
  };
}

/**
 * Get auth session token
 */
async function getAuthToken(): Promise<string> {
  try {
    const { data: { session }, error } = await awsClient.auth.getSession();
  
    if (error || !session) {
      throw new Error('Not authenticated');
    }
  
    return session.access_token;
  } catch (error) {
    console.error('Error getting auth token:', error);
    throw error;
  }
}

/**
 * List all templates (admin only - includes inactive)
 */
export async function getAllTemplates(): Promise<Template[]> {
  const token = await getAuthToken();
  
  const response = await fetch(ADMIN_API_BASE, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch templates');
  }

  const data = await response.json();
  return data.templates || [];
}

/**
 * Get single template (admin only)
 */
export async function getTemplateById(templateId: string): Promise<Template> {
  const token = await getAuthToken();
  
  const response = await fetch(`${ADMIN_API_BASE}/${templateId}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch template');
  }

  const data = await response.json();
  return data.template;
}

/**
 * Create new template (admin only)
 */
export async function createTemplate(template: Omit<TemplateInsert, 'id' | 'created_at' | 'version' | 'use_count'>): Promise<Template> {
  const token = await getAuthToken();
  
  const response = await fetch(ADMIN_API_BASE, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(template),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to create template');
  }

  const data = await response.json();
  return data.template;
}

/**
 * Update template (admin only - auto-increments version)
 */
export async function updateTemplate(templateId: string, updates: Partial<TemplateUpdate>): Promise<Template> {
  const token = await getAuthToken();
  
  const response = await fetch(`${ADMIN_API_BASE}/${templateId}`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(updates),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to update template');
  }

  const data = await response.json();
  return data.template;
}

/**
 * Toggle template active status (admin only)
 */
export async function toggleTemplateActive(templateId: string, isActive: boolean): Promise<Template> {
  const token = await getAuthToken();
  
  const response = await fetch(`${ADMIN_API_BASE}/${templateId}`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ is_active: isActive }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to update template');
  }

  const data = await response.json();
  return data.template;
}

/**
 * Delete template (admin only - soft delete if workflows use it)
 */
export async function deleteTemplate(templateId: string): Promise<{ message: string }> {
  const token = await getAuthToken();
  
  const response = await fetch(`${ADMIN_API_BASE}/${templateId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to delete template');
  }

  return response.json();
}

/**
 * List all users with status and role (admin only)
 */
export async function getAllUsers(): Promise<AdminUser[]> {
  const token = await getAuthToken();

  const response = await fetch(ADMIN_USERS_API_BASE, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch users');
  }

  const data = await response.json();
  const users = (data.users || []) as Partial<AdminUser>[];
  return users.map((u) => normalizeAdminUser(u as AdminUser));
}

/**
 * Update a user's role (admin only)
 */
export async function updateUserRole(userId: string, role: AppRole): Promise<{ success: boolean; role: AppRole }> {
  const token = await getAuthToken();

  const response = await fetch(`${ADMIN_USERS_API_BASE}/${userId}`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ role }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to update user role');
  }

  return response.json();
}

/**
 * Delete a user (admin only)
 */
export async function deleteUser(userId: string): Promise<{ success: boolean }> {
  const token = await getAuthToken();

  const response = await fetch(`${ADMIN_USERS_API_BASE}/${userId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to delete user');
  }

  return response.json();
}

/**
 * Suspend (ban) or reinstate a user at the auth provider. Suspended users cannot sign in.
 */
export async function setUserSuspended(
  userId: string,
  suspended: boolean
): Promise<{ success: boolean; suspended: boolean }> {
  const token = await getAuthToken();

  const response = await fetch(`${ADMIN_USERS_API_BASE}/${userId}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ suspended }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || 'Failed to update suspension');
  }

  return response.json();
}

/**
 * Get a single user's details with workflow stats (admin only)
 */
export async function getUserDetails(userId: string): Promise<AdminUserDetails> {
  const token = await getAuthToken();

  const response = await fetch(`${ADMIN_USERS_API_BASE}/${userId}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch user details');
  }

  const data = await response.json();
  const u = data.user as AdminUserDetails;
  return {
    ...normalizeAdminUser(u),
    subscriptionTaken: u.subscriptionTaken,
    firstSignInAt: u.firstSignInAt,
    lastSignInAt: u.lastSignInAt,
    totalWorkflowsBuilt: u.totalWorkflowsBuilt,
    workflows: u.workflows ?? [],
  };
}

export async function getLandingDemoScenarios(): Promise<LandingDemoScenario[]> {
  const token = await getAuthToken();

  const response = await fetch(ADMIN_LANDING_DEMO_API_BASE, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch landing demo scenarios');
  }

  const data = await response.json();
  return data.scenarios || [];
}

export async function getLandingDemoScenario(id: string): Promise<LandingDemoScenario> {
  const token = await getAuthToken();

  const response = await fetch(`${ADMIN_LANDING_DEMO_API_BASE}/${id}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch landing demo scenario');
  }

  const data = await response.json();
  return data.scenario;
}

export async function createLandingDemoScenario(input: LandingDemoScenarioInput): Promise<LandingDemoScenario> {
  const token = await getAuthToken();

  const response = await fetch(ADMIN_LANDING_DEMO_API_BASE, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to create landing demo scenario');
  }

  const data = await response.json();
  return data.scenario;
}

export async function updateLandingDemoScenario(
  id: string,
  input: Partial<LandingDemoScenarioInput>
): Promise<LandingDemoScenario> {
  const token = await getAuthToken();

  const response = await fetch(`${ADMIN_LANDING_DEMO_API_BASE}/${id}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to update landing demo scenario');
  }

  const data = await response.json();
  return data.scenario;
}

export async function deleteLandingDemoScenario(id: string): Promise<{ success: boolean }> {
  const token = await getAuthToken();

  const response = await fetch(`${ADMIN_LANDING_DEMO_API_BASE}/${id}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to delete landing demo scenario');
  }

  return response.json();
}
