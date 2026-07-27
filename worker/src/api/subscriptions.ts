import { Request, Response } from 'express';
import { subscriptionService } from '../services/subscription-service';
import { AuthenticatedRequest } from '../core/middleware/subscription-auth';
import { getDbClient } from '../core/database/aws-db-client';
import { queryAsService } from '../core/database/db-pool';
import { geminiWalletService } from '../services/ai/gemini-wallet-service';
import { getUnlimitedMode, isUnlimitedModeEnabled, setUnlimitedMode } from '../services/system-settings-service';
import { config } from '../core/config';
import { logger } from '../core/logger';

async function ensureUserExists(userId: string, email: string): Promise<void> {
  const db = getDbClient();
  await db
    .from('users')
    .upsert({ id: userId, email, updated_at: new Date().toISOString() }, { onConflict: 'id' });
}

/**
 * GET /api/subscriptions/current
 */
export async function getCurrentSubscription(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized', code: 'AUTH_REQUIRED' });
    }

    // Auto-create user row if missing
    await ensureUserExists(req.user.id, req.user.email);

    await subscriptionService.ensureFreeSubscription(req.user.id);

    const subscription = await subscriptionService.getUserSubscription(req.user.id);
    const usage = await subscriptionService.getSubscriptionUsage(req.user.id);
    const wallet = await geminiWalletService.getState(req.user.id).catch(() => null);
    const subscriptionFrozen = Boolean(wallet?.subscriptionFrozen);
    const walletNeedsAttention = Boolean(wallet?.enabled && wallet.hasKey && ['invalid', 'quota_exceeded', 'error'].includes(wallet.status));
    const unlimitedModeEnabled = await isUnlimitedModeEnabled();

    if (!subscription) {
      return res.status(404).json({
        error: 'Subscription Not Found',
        message: 'No subscription found for user',
        code: 'SUBSCRIPTION_NOT_FOUND'
      });
    }

    return res.json({
      success: true,
      subscription: {
        id: subscription.id,
        planName: subscription.planName,
        status: subscription.status,
        workflowLimit: subscription.workflowLimit,
        workflowsUsed: usage.workflowsUsed,
        startedAt: subscription.startedAt,
        expiresAt: subscription.expiresAt,
        cancelledAt: subscription.cancelledAt,
        autoRenew: subscription.autoRenew
      },
      usage: {
        workflowsUsed: usage.workflowsUsed,
        workflowLimit: usage.workflowLimit,
        remainingWorkflows: usage.remainingWorkflows,
        utilizationPercentage: usage.utilizationPercentage,
        canCreateWorkflow: unlimitedModeEnabled || subscriptionFrozen || usage.remainingWorkflows > 0
      },
      unlimitedModeEnabled,
      billingMode: unlimitedModeEnabled ? 'unlimited' : subscriptionFrozen ? 'gemini_wallet' : 'subscription',
      subscriptionFrozen,
      walletStatus: wallet?.status || 'empty',
      freezeMessage: subscriptionFrozen
        ? 'Your Gemini API key wallet is active. Subscription workflow quota is frozen while your key is used.'
        : walletNeedsAttention
          ? (wallet?.lastErrorMessage || 'Your Gemini API key wallet needs attention. Replace the key or turn off wallet mode and choose a plan.')
          : null,
    });
  } catch (error: any) {
    logger.error('[SubscriptionAPI] getCurrentSubscription error:', error);
    return res.status(500).json({
      error: 'Subscription Fetch Error',
      message: error?.message || 'Failed to fetch current subscription',
      code: 'SUBSCRIPTION_FETCH_ERROR'
    });
  }
}

/**
 * POST /api/subscriptions/cancel
 */
export async function cancelSubscription(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized', code: 'AUTH_REQUIRED' });
    }

    const { reason } = req.body;
    const result = await subscriptionService.cancelSubscription(req.user.id, reason);

    if (!result.success) {
      return res.status(400).json({
        error: 'Cancellation Failed',
        message: result.error || 'Failed to cancel subscription',
        code: result.code || 'CANCEL_FAILED'
      });
    }

    return res.json({
      success: true,
      message: 'Subscription cancelled successfully',
      subscription: result.subscription
        ? {
            id: result.subscription.id,
            planName: result.subscription.planName,
            status: result.subscription.status,
            workflowLimit: result.subscription.workflowLimit
          }
        : null
    });
  } catch (error: any) {
    logger.error('[SubscriptionAPI] cancelSubscription error:', error);
    return res.status(500).json({
      error: 'Cancellation Error',
      message: error?.message || 'Failed to cancel subscription',
      code: 'CANCEL_ERROR'
    });
  }
}

/**
 * GET /api/subscriptions/history
 */
export async function getSubscriptionHistory(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized', code: 'AUTH_REQUIRED' });
    }

    const limit = parseInt((req.query.limit as string) || '50', 10);
    const db = getDbClient();

    const { data: history, error } = await db
      .from('subscription_history')
      .select(`
        id,
        action,
        notes,
        created_at,
        from_plan:from_plan_id(name),
        to_plan:to_plan_id(name),
        payment:payment_id(razorpay_payment_id, amount_inr)
      `)
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      throw new Error(`Failed to fetch subscription history: ${error.message}`);
    }

    return res.json({
      success: true,
      history: (history || []).map((item: any) => ({
        id: item.id,
        action: item.action,
        fromPlan: item.from_plan?.name || null,
        toPlan: item.to_plan?.name || null,
        paymentId: item.payment?.razorpay_payment_id || null,
        amount: item.payment?.amount_inr ? item.payment.amount_inr / 100 : null,
        notes: item.notes,
        createdAt: item.created_at
      }))
    });
  } catch (error: any) {
    logger.error('[SubscriptionAPI] getSubscriptionHistory error:', error);
    return res.status(500).json({
      error: 'History Fetch Error',
      message: error?.message || 'Failed to fetch subscription history',
      code: 'HISTORY_FETCH_ERROR'
    });
  }
}

/**
 * GET /api/subscriptions/usage
 */
export async function getSubscriptionUsage(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized', code: 'AUTH_REQUIRED' });
    }

    const usage = await subscriptionService.getSubscriptionUsage(req.user.id);

    return res.json({
      success: true,
      usage: {
        workflowsUsed: usage.workflowsUsed,
        workflowLimit: usage.workflowLimit,
        remainingWorkflows: usage.remainingWorkflows,
        utilizationPercentage: usage.utilizationPercentage,
        canCreateWorkflow: usage.remainingWorkflows > 0,
        upgradeRequired: usage.remainingWorkflows === 0
      }
    });
  } catch (error: any) {
    logger.error('[SubscriptionAPI] getSubscriptionUsage error:', error);
    return res.status(500).json({
      error: 'Usage Fetch Error',
      message: error?.message || 'Failed to fetch subscription usage',
      code: 'USAGE_FETCH_ERROR'
    });
  }
}

/**
 * POST /api/subscriptions/upgrade  (admin or payment-verified upgrade)
 */
export async function upgradeSubscription(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized', code: 'AUTH_REQUIRED' });
    }

    const { planName, paymentId } = req.body;

    if (!planName) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'planName is required',
        code: 'MISSING_PLAN_NAME'
      });
    }

    const plan = await subscriptionService.getPlanByName(planName);
    if (!plan) {
      return res.status(400).json({
        error: 'Invalid Plan',
        message: `Plan '${planName}' not found`,
        code: 'INVALID_PLAN'
      });
    }

    if (plan.name !== 'Free' && !paymentId) {
      return res.status(400).json({
        error: 'Payment Required',
        message: 'paymentId is required for paid plans',
        code: 'PAYMENT_REQUIRED'
      });
    }

    const result = await subscriptionService.upgradeSubscription(req.user.id, planName, paymentId);

    if (!result.success) {
      return res.status(400).json({
        error: 'Upgrade Failed',
        message: result.error || 'Failed to upgrade subscription',
        code: result.code || 'UPGRADE_FAILED'
      });
    }

    return res.json({
      success: true,
      message: `Successfully upgraded to ${planName} plan`,
      subscription: result.subscription
        ? {
            id: result.subscription.id,
            planName: result.subscription.planName,
            status: result.subscription.status,
            workflowLimit: result.subscription.workflowLimit,
            workflowsUsed: result.subscription.workflowsUsed
          }
        : null
    });
  } catch (error: any) {
    logger.error('[SubscriptionAPI] upgradeSubscription error:', error);
    return res.status(500).json({
      error: 'Upgrade Error',
      message: error?.message || 'Failed to upgrade subscription',
      code: 'UPGRADE_ERROR'
    });
  }
}

/**
 * GET /api/admin/subscriptions/users  (admin only)
 */
export async function adminGetUsers(req: AuthenticatedRequest, res: Response) {
  try {
    const page = parseInt((req.query.page as string) || '1', 10);
    const limit = parseInt((req.query.limit as string) || '50', 10);
    const search = (req.query.search as string) || '';
    const offset = (page - 1) * limit;
    const safeLimit = Math.max(1, Math.min(limit, 100));
    const safeOffset = Math.max(0, offset);
    const searchPattern = `%${search}%`;

    const users = await queryAsService(
      `SELECT
         u.id,
         u.email,
         u.workflow_count,
         u.created_at,
         s.id AS subscription_id,
         s.status AS subscription_status,
         s.started_at AS subscription_started_at,
         s.expires_at AS subscription_expires_at,
         sp.name AS plan_name,
         sp.workflow_limit AS plan_workflow_limit,
         w.enabled AS wallet_enabled,
         w.status AS wallet_status,
         w.last_used_at AS wallet_last_used_at
       FROM users u
       LEFT JOIN subscriptions s
         ON s.id = u.subscription_id
       LEFT JOIN subscription_plans sp
         ON sp.id = s.plan_id
       LEFT JOIN user_ai_wallet_settings w
         ON w.user_id = u.id::text AND w.provider = 'gemini'
       WHERE ($1 = '' OR u.email ILIKE $2)
       ORDER BY u.created_at DESC
       LIMIT $3
       OFFSET $4`,
      [search, searchPattern, safeLimit, safeOffset]
    );

    const totalRows = await queryAsService<{ count: string }>(
      `SELECT COUNT(*)::text AS count
       FROM users u
       WHERE ($1 = '' OR u.email ILIKE $2)`,
      [search, searchPattern]
    );
    const total = parseInt(totalRows[0]?.count || '0', 10);

    return res.json({
      success: true,
      users: (users || []).map((user: any) => ({
        id: user.id,
        email: user.email,
        workflowCount: user.workflow_count,
        createdAt: user.created_at,
        subscription: user.subscription_id
          ? {
              id: user.subscription_id,
              planName: user.plan_name || 'Free',
              workflowLimit: user.plan_workflow_limit || 2,
              status: user.subscription_status,
              startedAt: user.subscription_started_at,
              expiresAt: user.subscription_expires_at
            }
          : null
        ,
        wallet: {
          enabled: Boolean(user.wallet_enabled),
          status: user.wallet_status || 'empty',
          lastUsedAt: user.wallet_last_used_at || null
        }
      })),
      pagination: {
        page,
        limit: safeLimit,
        total,
        totalPages: Math.ceil(total / safeLimit)
      }
    });
  } catch (error: any) {
    logger.error('[SubscriptionAPI] adminGetUsers error:', error);
    return res.status(500).json({
      error: 'Admin Users Fetch Error',
      message: error?.message || 'Failed to fetch users',
      code: 'ADMIN_USERS_FETCH_ERROR'
    });
  }
}

/**
 * POST /api/admin/subscriptions/upgrade/:userId  (admin only)
 */
export async function adminUpgradeUser(req: AuthenticatedRequest, res: Response) {
  try {
    const { userId } = req.params;
    const { planName, notes } = req.body;

    if (!planName) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'planName is required',
        code: 'MISSING_PLAN_NAME'
      });
    }

    const result = await subscriptionService.upgradeSubscription(userId, planName);

    if (!result.success) {
      return res.status(400).json({
        error: 'Admin Upgrade Failed',
        message: result.error || 'Failed to upgrade user subscription',
        code: result.code || 'ADMIN_UPGRADE_FAILED'
      });
    }

    // Log admin action
    const db = getDbClient();
    await db.from('admin_actions').insert({
      admin_user_id: req.user!.id,
      target_user_id: userId,
      action: 'subscription_upgrade',
      details: { planName, notes: notes || 'Admin upgrade', subscriptionId: result.subscription?.id },
      ip_address: req.ip,
      user_agent: req.get('User-Agent')
    });

    return res.json({
      success: true,
      message: `Successfully upgraded user to ${planName} plan`,
      subscription: result.subscription
    });
  } catch (error: any) {
    logger.error('[SubscriptionAPI] adminUpgradeUser error:', error);
    return res.status(500).json({
      error: 'Admin Upgrade Error',
      message: error?.message || 'Failed to upgrade user subscription',
      code: 'ADMIN_UPGRADE_ERROR'
    });
  }
}

// ─── Admin: system-wide unlimited mode ───────────────────────────────────────

async function logAdminAction(
  req: AuthenticatedRequest,
  action: string,
  details: Record<string, any>,
  targetUserId: string | null = null
): Promise<void> {
  try {
    const db = getDbClient();
    await db.from('admin_actions').insert({
      admin_user_id: req.user!.id,
      target_user_id: targetUserId,
      action,
      details,
      ip_address: req.ip,
      user_agent: req.get('User-Agent')
    });
  } catch (error: any) {
    // Audit logging must never block the action itself.
    logger.error(`[SubscriptionAPI] Failed to log admin action '${action}':`, error);
  }
}

/**
 * GET /api/admin/settings/unlimited-mode  (admin only)
 */
export async function adminGetUnlimitedMode(req: AuthenticatedRequest, res: Response) {
  try {
    const setting = await getUnlimitedMode();
    return res.json({ success: true, unlimitedMode: setting });
  } catch (error: any) {
    logger.error('[SubscriptionAPI] adminGetUnlimitedMode error:', error);
    return res.status(500).json({
      error: 'Unlimited Mode Fetch Error',
      message: error?.message || 'Failed to read unlimited mode setting',
      code: 'UNLIMITED_MODE_FETCH_ERROR'
    });
  }
}

/**
 * PUT /api/admin/settings/unlimited-mode  (admin only)
 * Body: { enabled: boolean }
 */
export async function adminSetUnlimitedMode(req: AuthenticatedRequest, res: Response) {
  try {
    const { enabled } = req.body ?? {};

    if (typeof enabled !== 'boolean') {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'enabled must be a boolean',
        code: 'INVALID_ENABLED_FLAG'
      });
    }

    const setting = await setUnlimitedMode(enabled, req.user!.id);
    await logAdminAction(req, 'unlimited_mode_toggled', { enabled });

    logger.warn(`[SubscriptionAPI] Unlimited mode ${enabled ? 'ENABLED' : 'DISABLED'} by admin ${req.user!.id}`);

    return res.json({
      success: true,
      message: enabled
        ? 'Unlimited access is now active for every user. Subscription limits are bypassed.'
        : 'Unlimited access is off. Subscription plans and limits are enforced again.',
      unlimitedMode: setting
    });
  } catch (error: any) {
    logger.error('[SubscriptionAPI] adminSetUnlimitedMode error:', error);
    return res.status(500).json({
      error: 'Unlimited Mode Update Error',
      message: error?.message || 'Failed to update unlimited mode setting',
      code: 'UNLIMITED_MODE_UPDATE_ERROR'
    });
  }
}

// ─── Admin: subscription plan management ─────────────────────────────────────

function mapAdminPlanRow(row: any) {
  return {
    id: row.id,
    name: row.name,
    workflowLimit: Number(row.workflow_limit),
    // price_inr is stored in paise; expose both so the UI can edit whole rupees.
    priceInr: Number(row.price_inr),
    priceRupees: Number(row.price_inr) / 100,
    features: Array.isArray(row.features) ? row.features : (row.features ? JSON.parse(row.features) : []),
    isActive: Boolean(row.is_active),
    updatedAt: row.updated_at || null
  };
}

/**
 * GET /api/admin/subscriptions/plans  (admin only)
 * Unlike the public endpoint this returns inactive plans too.
 */
export async function adminGetPlans(req: AuthenticatedRequest, res: Response) {
  try {
    const rows = await queryAsService(
      `SELECT id, name, workflow_limit, price_inr, features, is_active, updated_at
       FROM public.subscription_plans
       ORDER BY workflow_limit ASC`
    );

    return res.json({
      success: true,
      plans: (rows || []).map(mapAdminPlanRow),
      // When DEVELOPMENT_PRICING is on the worker overrides paid-plan prices to
      // ₹1 at read time, so edited prices will not show on the pricing page.
      developmentPricing: Boolean(config.developmentPricing),
      unlimitedModeEnabled: await isUnlimitedModeEnabled()
    });
  } catch (error: any) {
    logger.error('[SubscriptionAPI] adminGetPlans error:', error);
    return res.status(500).json({
      error: 'Admin Plans Fetch Error',
      message: error?.message || 'Failed to fetch subscription plans',
      code: 'ADMIN_PLANS_FETCH_ERROR'
    });
  }
}

/**
 * PATCH /api/admin/subscriptions/plans/:id  (admin only)
 * Body: { workflowLimit?, priceRupees?, features?, isActive? }
 *
 * `name` is intentionally immutable — the value is constrained by a DB CHECK
 * and assumed to be one of Free/Pro/Enterprise by tier resolution and pricing
 * lookups elsewhere in the worker.
 */
export async function adminUpdatePlan(req: AuthenticatedRequest, res: Response) {
  try {
    const { id } = req.params;
    const { workflowLimit, priceRupees, features, isActive, name } = req.body ?? {};

    if (name !== undefined) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Plan name is immutable and cannot be changed',
        code: 'PLAN_NAME_IMMUTABLE'
      });
    }

    const existingRows = await queryAsService(
      `SELECT id, name, workflow_limit, price_inr, features, is_active, updated_at
       FROM public.subscription_plans
       WHERE id = $1
       LIMIT 1`,
      [id]
    );
    const existing = existingRows[0];

    if (!existing) {
      return res.status(404).json({
        error: 'Plan Not Found',
        message: `No subscription plan with id '${id}'`,
        code: 'PLAN_NOT_FOUND'
      });
    }

    const updates: string[] = [];
    const params: any[] = [id];

    if (workflowLimit !== undefined) {
      const limit = Number(workflowLimit);
      if (!Number.isInteger(limit) || limit < 0) {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'workflowLimit must be a non-negative integer',
          code: 'INVALID_WORKFLOW_LIMIT'
        });
      }
      params.push(limit);
      updates.push(`workflow_limit = $${params.length}`);
    }

    if (priceRupees !== undefined) {
      const rupees = Number(priceRupees);
      if (!Number.isFinite(rupees) || rupees < 0) {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'priceRupees must be a non-negative number',
          code: 'INVALID_PRICE'
        });
      }
      params.push(Math.round(rupees * 100));
      updates.push(`price_inr = $${params.length}`);
    }

    if (features !== undefined) {
      if (!Array.isArray(features) || features.some((f: any) => typeof f !== 'string')) {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'features must be an array of strings',
          code: 'INVALID_FEATURES'
        });
      }
      params.push(JSON.stringify(features));
      updates.push(`features = $${params.length}::jsonb`);
    }

    if (isActive !== undefined) {
      if (typeof isActive !== 'boolean') {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'isActive must be a boolean',
          code: 'INVALID_IS_ACTIVE'
        });
      }
      if (existing.name === 'Free' && isActive === false) {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'The Free plan cannot be deactivated — it is the baseline allowance for every user',
          code: 'FREE_PLAN_REQUIRED'
        });
      }
      params.push(isActive);
      updates.push(`is_active = $${params.length}`);
    }

    if (updates.length === 0) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'No editable fields supplied',
        code: 'NO_PLAN_UPDATES'
      });
    }

    const updatedRows = await queryAsService(
      `UPDATE public.subscription_plans
       SET ${updates.join(', ')}, updated_at = NOW()
       WHERE id = $1
       RETURNING id, name, workflow_limit, price_inr, features, is_active, updated_at`,
      params
    );

    // Plans are cached in-process for 5 minutes — drop it so the edit is live.
    subscriptionService.clearCache();

    const updated = mapAdminPlanRow(updatedRows[0]);

    await logAdminAction(req, 'subscription_plan_updated', {
      planId: id,
      planName: existing.name,
      before: mapAdminPlanRow(existing),
      after: updated
    });

    return res.json({ success: true, plan: updated });
  } catch (error: any) {
    logger.error('[SubscriptionAPI] adminUpdatePlan error:', error);
    return res.status(500).json({
      error: 'Admin Plan Update Error',
      message: error?.message || 'Failed to update subscription plan',
      code: 'ADMIN_PLAN_UPDATE_ERROR'
    });
  }
}
