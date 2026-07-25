import { Prisma } from '@prisma/client';
import { Request, Response } from 'express';
import { z } from 'zod';
import { getPrismaClient } from '../core/database/prisma-client';
import { logger } from '../core/logger';
import { AuthenticatedRequest } from '../core/middleware/subscription-auth';

const scriptStepSchema = z.object({
  id: z.string().trim().min(1),
  type: z.enum(['node', 'edge']),
  delayMs: z.number().int().min(0).max(3000),
  node: z
    .object({
      label: z.string().trim().min(1),
      icon: z.string().trim().min(1),
      category: z.string().trim().min(1),
      position: z.object({
        x: z.number(),
        y: z.number(),
      }),
    })
    .optional(),
  edge: z
    .object({
      source: z.string().trim().min(1),
      target: z.string().trim().min(1),
      sourceHandle: z.string().trim().optional(),
      label: z.string().trim().optional(),
    })
    .optional(),
});

const scriptSchema = z.object({
  steps: z.array(scriptStepSchema).min(1),
});

const scenarioInputSchema = z.object({
  label: z.string().trim().min(1).max(200),
  sortOrder: z.number().int().min(0).max(999),
  isActive: z.boolean(),
  script: scriptSchema,
});

const scenarioUpdateSchema = scenarioInputSchema.partial();

function parseScenarioId(value: string | undefined) {
  const parsed = z.string().uuid().safeParse(value);
  return parsed.success ? parsed.data : null;
}

export default async function adminLandingDemoHandler(req: Request, res: Response) {
  const prisma = getPrismaClient();
  const method = req.method;
  const scenarioId = req.params.id;

  try {
    if (method === 'GET' && !scenarioId) {
      const scenarios = await prisma.landingDemoScenario.findMany({
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      });

      return res.json({ scenarios });
    }

    if (method === 'GET' && scenarioId) {
      const id = parseScenarioId(scenarioId);
      if (!id) return res.status(400).json({ error: 'Invalid scenario id' });

      const scenario = await prisma.landingDemoScenario.findUnique({ where: { id } });
      if (!scenario) return res.status(404).json({ error: 'Scenario not found' });

      return res.json({ scenario });
    }

    if (method === 'POST') {
      const parsed = scenarioInputSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: 'Invalid scenario', details: parsed.error.flatten() });
      }

      const userId = (req as AuthenticatedRequest).user?.id;
      const scenario = await prisma.landingDemoScenario.create({
        data: {
          label: parsed.data.label,
          sortOrder: parsed.data.sortOrder,
          isActive: parsed.data.isActive,
          script: parsed.data.script as Prisma.InputJsonValue,
          createdBy: userId || null,
        },
      });

      return res.status(201).json({ scenario });
    }

    if ((method === 'PUT' || method === 'PATCH') && scenarioId) {
      const id = parseScenarioId(scenarioId);
      if (!id) return res.status(400).json({ error: 'Invalid scenario id' });

      const parsed = scenarioUpdateSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: 'Invalid scenario', details: parsed.error.flatten() });
      }

      const data: Prisma.LandingDemoScenarioUpdateInput = {};
      if (parsed.data.label !== undefined) data.label = parsed.data.label;
      if (parsed.data.sortOrder !== undefined) data.sortOrder = parsed.data.sortOrder;
      if (parsed.data.isActive !== undefined) data.isActive = parsed.data.isActive;
      if (parsed.data.script !== undefined) data.script = parsed.data.script as Prisma.InputJsonValue;

      const scenario = await prisma.landingDemoScenario.update({
        where: { id },
        data,
      });

      return res.json({ scenario });
    }

    if (method === 'DELETE' && scenarioId) {
      const id = parseScenarioId(scenarioId);
      if (!id) return res.status(400).json({ error: 'Invalid scenario id' });

      await prisma.landingDemoScenario.delete({ where: { id } });
      return res.json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    logger.error('[AdminLandingDemo] Request failed:', error);
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      return res.status(404).json({ error: 'Scenario not found' });
    }
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Landing demo admin request failed',
    });
  }
}
