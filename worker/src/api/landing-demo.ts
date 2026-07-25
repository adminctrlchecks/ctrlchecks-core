import { Request, Response } from 'express';
import { z } from 'zod';
import { getPrismaClient } from '../core/database/prisma-client';
import { logger } from '../core/logger';

const landingDemoEventSchema = z.object({
  scenarioId: z.string().uuid(),
  sessionId: z.string().trim().min(8).max(128),
  eventType: z.enum(['view', 'pill_click', 'animation_complete', 'cta_click']),
  referrer: z.string().trim().max(2048).optional().nullable(),
});

export async function listLandingDemoScenarios(_req: Request, res: Response) {
  try {
    const prisma = getPrismaClient();
    const scenarios = await prisma.landingDemoScenario.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      select: {
        id: true,
        label: true,
        sortOrder: true,
        isActive: true,
        script: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    res.setHeader('Cache-Control', 'public, max-age=60');
    return res.json({ scenarios });
  } catch (error) {
    logger.error('[LandingDemo] Failed to list scenarios:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to fetch landing demo scenarios',
    });
  }
}

export async function recordLandingDemoEvent(req: Request, res: Response) {
  const parsed = landingDemoEventSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: 'Invalid landing demo event',
      details: parsed.error.flatten(),
    });
  }

  const { scenarioId, sessionId, eventType, referrer } = parsed.data;

  try {
    const prisma = getPrismaClient();
    const scenario = await prisma.landingDemoScenario.findUnique({
      where: { id: scenarioId },
      select: { id: true },
    });

    if (!scenario) {
      return res.status(404).json({ error: 'Scenario not found' });
    }

    await prisma.landingDemoEvent.create({
      data: {
        scenarioId,
        sessionId,
        eventType,
        referrer: referrer || null,
      },
    });

    return res.status(204).send();
  } catch (error) {
    logger.error('[LandingDemo] Failed to record event:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to record landing demo event',
    });
  }
}
