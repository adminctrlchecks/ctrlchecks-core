/**
 * Adaptive UI Engine — Help Generator
 *
 * Calls Gemini with the exact fixed runtime prompt. The model is only ever
 * asked to produce the generative slice of the envelope — `contextualHelp`
 * and `fallback` — never the structural fields (capabilities/recommended
 * Nodes/setupGuide/missingItems), which are always the deterministic,
 * already-computed values from existing services. This is what makes
 * "never invent nodes/credentials" enforceable even if the model
 * hallucinates: whatever it returns outside the allowed slice is discarded.
 */

import { geminiOrchestrator } from '../ai/gemini-orchestrator';
import { logger } from '../../core/logger';
import { parseGeneratedSlice } from './schema';
import type {
  AdaptiveUIFallback,
  CapabilityContainerSummary,
  ContextualHelpItem,
  RecommendedNodeItem,
  SetupGuideItem,
} from './types';

const FIXED_PROMPT_HEADER = `You are an adaptive UI engine inside a digital product.

Generate a personalized UI from the user's intent, the available product data, and the allowed UI format.

Return only valid JSON.

Context:
`;

const UI_OUTPUT_RULES = JSON.stringify({
  contextualHelp: '0-3 items: { title, tooltip (<20 words), expanded_help (<40 words), suggested_action, confidence }',
  fallback: 'null unless the provided data is insufficient to help; otherwise { reason, message }',
});

const PROMPT_RULES = `

Rules:

- Use only the provided product data.
- Match the user's intent to the most relevant available content.
- Follow the predefined UI format.
- Do not redesign the product.
- Keep the result concise.
- If product data is large use only the relevant subset.
- If there is insufficient data return a helpful fallback state.
- Only return the fields described in "Allowed UI format" — nothing else.
`;

function buildPrompt(context: unknown, intent: string): string {
  return `${FIXED_PROMPT_HEADER}${JSON.stringify(context)}

User intent:
${intent}

Allowed UI format:
${UI_OUTPUT_RULES}
${PROMPT_RULES}`;
}

function deterministicFallbackHelp(
  setupGuide: SetupGuideItem[],
  recommendedNodes: RecommendedNodeItem[],
): ContextualHelpItem[] {
  if (setupGuide.length > 0) {
    const first = setupGuide[0];
    return [
      {
        title: first.label,
        tooltip: first.description || `This needs attention before your workflow can run.`,
        expanded_help: 'Setup items are listed in priority order — start with this one.',
        suggested_action: first.actionRoute ? `Go to ${first.actionRoute}` : `Open ${first.nodeLabel || 'the node'}`,
        confidence: 'medium',
      },
    ];
  }

  if (recommendedNodes.length > 0) {
    const top = recommendedNodes[0];
    return [
      {
        title: top.label,
        tooltip: top.reason,
        expanded_help: 'This is the highest-ranked match for what you described.',
        suggested_action: `Add "${top.label}" to your workflow`,
        confidence: 'low',
      },
    ];
  }

  return [];
}

export interface GenerateHelpParams {
  intent: string;
  capabilitiesSummary: CapabilityContainerSummary[];
  recommendedNodes: RecommendedNodeItem[];
  setupGuide: SetupGuideItem[];
  role: string;
  subscriptionPlan: string;
}

export async function generateContextualHelp(
  params: GenerateHelpParams,
): Promise<{ contextualHelp: ContextualHelpItem[]; fallback: AdaptiveUIFallback | null }> {
  const { intent, capabilitiesSummary, recommendedNodes, setupGuide, role, subscriptionPlan } = params;

  const context = {
    intent,
    capabilities: capabilitiesSummary,
    recommendedNodes: recommendedNodes.slice(0, 5),
    setupGuide: setupGuide.slice(0, 5),
    user: { role, subscriptionPlan },
  };

  try {
    const prompt = buildPrompt(context, intent);
    const raw = await geminiOrchestrator.processRequest(
      'text-completion',
      { prompt },
      { temperature: 0.4, max_tokens: 260, cache: false, structuredOutput: { mimeType: 'application/json' } },
    );

    const text = typeof raw === 'string' ? raw : raw?.text || raw?.content || JSON.stringify(raw);
    const jsonMatch = typeof text === 'string' ? text.match(/\{[\s\S]*\}/) : null;
    if (!jsonMatch) throw new Error('No JSON object in model response');

    const candidate = JSON.parse(jsonMatch[0]);
    const parsed = parseGeneratedSlice(candidate);
    if (!parsed) throw new Error('Model response failed schema validation');

    return parsed;
  } catch (error) {
    logger.warn('[AdaptiveUI] Help generation failed, using deterministic fallback:', error);
    return {
      contextualHelp: deterministicFallbackHelp(setupGuide, recommendedNodes),
      fallback: null,
    };
  }
}
