/**
 * General-purpose role -> permission model, generalizing the pattern already
 * used for the AI editor (see core/types/ai-editor-auth.ts, which stays as
 * the AI-editor-specific instance of this same idea).
 */
import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/subscription-auth';

export type AppRole = 'admin' | 'moderator' | 'user';

export type Permission =
  | 'credential:write'
  | 'credential:delete'
  | 'admin:users:write'
  | 'admin:users:delete'
  | 'admin:audit:view'
  | 'admin:security:view';

const ALL_PERMISSIONS: Permission[] = [
  'credential:write',
  'credential:delete',
  'admin:users:write',
  'admin:users:delete',
  'admin:audit:view',
  'admin:security:view',
];

const ROLE_PERMISSIONS: Record<AppRole, Set<Permission>> = {
  admin: new Set(ALL_PERMISSIONS),
  moderator: new Set(['credential:write', 'admin:audit:view', 'admin:security:view']),
  user: new Set(['credential:write']),
};

export function permissionsForRole(role: AppRole | string | null | undefined): Set<Permission> {
  const r = (role as AppRole) || 'user';
  return ROLE_PERMISSIONS[r] || ROLE_PERMISSIONS.user;
}

export function hasPermission(role: AppRole | string | null | undefined, permission: Permission): boolean {
  return permissionsForRole(role).has(permission);
}

/** Express middleware gating a route on a single permission. */
export function requirePermission(permission: Permission) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required',
        code: 'AUTH_REQUIRED',
      });
    }

    if (!hasPermission(req.user.role, permission)) {
      return res.status(403).json({
        error: 'Forbidden',
        message: `This action requires the '${permission}' permission`,
        code: 'INSUFFICIENT_PERMISSION',
        requiredPermission: permission,
        currentRole: req.user.role || 'user',
      });
    }

    next();
  };
}
