import { Request, Response } from 'express';
import crypto from 'crypto';
import { geminiOrchestrator } from '../services/ai/gemini-orchestrator';
import { getCacheRedisClient } from '../middleware/redisGetCache';

interface AIHelpPageContext {
  productName?: string;
  route?: string;
  pageTitle?: string;
  sectionName?: string | null;
}

interface AIHelpElementContext {
  label?: string | null;
  type?: string;
  nearbyText?: string | null;
  placeholder?: string | null;
  buttonText?: string | null;
  currentValue?: string | null;
  validationState?: 'valid' | 'invalid' | 'unknown';
  errorText?: string | null;
  emptyStateText?: string | null;
}

interface AIHelpUserContext {
  role?: string | null;
  plan?: string | null;
  deviceType?: string;
  recentActions?: string[];
}

interface AIHelpTriggerContext {
  kind?: string;
  hoverDurationMs?: number;
  timeOnScreenMs?: number;
  repeatedAttemptCount?: number;
}

interface AIHelpRequest {
  context?: {
    page?: AIHelpPageContext;
    element?: AIHelpElementContext;
    user?: AIHelpUserContext;
    trigger?: AIHelpTriggerContext;
  };
}

interface AIHelpTip {
  title: string;
  tooltip: string;
  expanded_help: string;
  suggested_action: string;
  confidence: 'high' | 'medium' | 'low';
}

const CACHE_TTL_SECONDS = 600; // 10 minutes — tips are keyed by element identity, not instance

function deterministicTip(req: AIHelpRequest): AIHelpTip {
  const el = req.context?.element || {};
  const name = el.label || el.buttonText || el.type || 'this';

  if (el.errorText) {
    return {
      title: 'This needs a fix',
      tooltip: el.errorText.slice(0, 120),
      expanded_help: `${name} isn't valid yet — update it to match the expected format.`,
      suggested_action: 'Correct the highlighted field and try again.',
      confidence: 'low',
    };
  }

  if (el.emptyStateText) {
    return {
      title: 'Nothing here yet',
      tooltip: el.emptyStateText.slice(0, 120),
      expanded_help: 'This area fills in once there is data or you take the first action.',
      suggested_action: 'Use the button here to get started.',
      confidence: 'low',
    };
  }

  if (el.placeholder || (el.type || '').includes('input') || el.type === 'text area' || el.type === 'select') {
    return {
      title: String(name),
      tooltip: el.placeholder || `Enter a value for ${name}.`,
      expanded_help: 'Fields like this are used to configure what happens next.',
      suggested_action: 'Fill in a value that fits this field.',
      confidence: 'low',
    };
  }

  if (el.buttonText) {
    return {
      title: el.buttonText,
      tooltip: `Click to ${el.buttonText.toLowerCase()}.`,
      expanded_help: el.nearbyText || 'This action moves you to the next step.',
      suggested_action: `Click "${el.buttonText}" when you're ready.`,
      confidence: 'low',
    };
  }

  return {
    title: String(name),
    tooltip: el.nearbyText || 'This is part of the current screen.',
    expanded_help: 'Hover or click nearby controls for more specific guidance.',
    suggested_action: 'Explore the highlighted controls on this screen.',
    confidence: 'low',
  };
}

const FIXED_PROMPT_HEADER = `You are a contextual help layer inside a digital product.
Replace generic tutorials and static tooltips with short, screen-aware guidance.
You receive a JSON context object. Use only what is provided. Do not ask for missing info. If something is unknown, make the safest useful assumption.
Generate help for the exact element or state the user is focused on.

Return only valid JSON:
{ "title": "Short title", "tooltip": "Under 20 words", "expanded_help": "Under 40 words", "suggested_action": "One short next action", "confidence": "high | medium | low" }

Rules:
- Be specific to the current screen and situation.
- Do not sound like documentation. Do not mention AI.
- Match the user's level: plain language for beginners, direct and efficient for advanced.
- If the user made an error, explain the fix. If they are hesitating, reduce friction.

Context: `;

function buildPrompt(context: AIHelpRequest['context']): string {
  return `${FIXED_PROMPT_HEADER}${JSON.stringify(context ?? {})}`;
}

export default async function aiHelpHandler(req: Request, res: Response): Promise<void> {
  const body = req.body as AIHelpRequest;
  const fallback = deterministicTip(body);

  const identityKey = [
    body.context?.page?.route,
    body.context?.element?.type,
    body.context?.element?.label || body.context?.element?.buttonText,
    body.context?.trigger?.kind,
  ].join('|');
  const contextHash = crypto.createHash('sha256').update(identityKey).digest('hex').slice(0, 16);
  const cacheKey = `ai-help:${contextHash}`;

  try {
    const redis = await getCacheRedisClient(process.env.REDIS_URL || 'redis://localhost:6379');
    if (redis) {
      const cached = await redis.get(cacheKey);
      if (cached) {
        res.json(JSON.parse(cached));
        return;
      }
    }

    const prompt = buildPrompt(body.context);
    const raw = await geminiOrchestrator.processRequest(
      'text-completion',
      { prompt },
      {
        temperature: 0.4,
        max_tokens: 220,
        cache: false,
        structuredOutput: { mimeType: 'application/json' },
      }
    );

    let parsed: AIHelpTip | null = null;
    try {
      const text = typeof raw === 'string' ? raw : raw?.text || raw?.content || JSON.stringify(raw);
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const candidate = JSON.parse(jsonMatch[0]) as Partial<AIHelpTip>;
        if (candidate.title && candidate.tooltip && candidate.suggested_action) {
          parsed = {
            title: candidate.title,
            tooltip: candidate.tooltip,
            expanded_help: candidate.expanded_help || fallback.expanded_help,
            suggested_action: candidate.suggested_action,
            confidence: candidate.confidence || 'medium',
          };
        }
      }
    } catch {
      // JSON parse failed — use fallback
    }

    const result = parsed || fallback;

    if (parsed && redis) {
      await redis.setEx(cacheKey, CACHE_TTL_SECONDS, JSON.stringify(result));
    }

    res.json(result);
  } catch {
    res.json(fallback);
  }
}
