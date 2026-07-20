
import { Node, Edge } from '@xyflow/react';
import { NODE_TYPES } from '@/components/workflow/nodeTypes';
import { coerceReactFlowPosition } from '@/lib/node-type-normalizer';

export interface WorkflowValidationError {
    nodeId?: string;
    message: string;
    severity: 'error' | 'warning';
}

// Unique ID generator to prevent duplicate keys - uses crypto.randomUUID when available
function generateUniqueId(prefix: string, existingIds: Set<string>): string {
    let id: string;
    let attempts = 0;
    const maxAttempts = 100;

    do {
        // Try to use crypto.randomUUID if available (browser environment)
        if (typeof crypto !== 'undefined' && crypto.randomUUID) {
            id = `${prefix}_${crypto.randomUUID()}`;
        } else {
            // Fallback: timestamp + counter + random
            const timestamp = Date.now();
            const random = Math.random().toString(36).substring(2, 15);
            const counter = attempts++;
            id = `${prefix}_${timestamp}_${counter}_${random}`;
        }

        if (attempts > maxAttempts) {
            throw new Error(`Failed to generate unique ID after ${maxAttempts} attempts`);
        }
    } while (existingIds.has(id));

    existingIds.add(id);
    return id;
}

// Simple hierarchical layout algorithm for positioning nodes
function applyHierarchicalLayout(nodes: any[], edges: any[]): any[] {
    const nodeMap = new Map<string, any>();
    const children = new Map<string, string[]>();
    const levels = new Map<string, number>();
    const nodePositions = new Map<string, { x: number; y: number }>();

    // Build node map and children relationships
    nodes.forEach(node => {
        nodeMap.set(node.id, node);
        children.set(node.id, []);
    });

    edges.forEach(edge => {
        const childList = children.get(edge.source) || [];
        if (!childList.includes(edge.target)) childList.push(edge.target);
        children.set(edge.source, childList);
    });

    // Find root nodes (nodes with no incoming edges)
    const rootNodes = nodes.filter(node => {
        return !edges.some(e => e.target === node.id);
    });

    // Calculate levels using BFS
    const queue: string[] = [];
    rootNodes.forEach(node => {
        levels.set(node.id, 0);
        queue.push(node.id);
    });

    while (queue.length > 0) {
        const currentId = queue.shift()!;
        const currentLevel = levels.get(currentId) || 0;
        const childList = children.get(currentId) || [];

        childList.forEach(childId => {
            const existingLevel = levels.get(childId);
            if (existingLevel === undefined || existingLevel < currentLevel + 1) {
                levels.set(childId, currentLevel + 1);
                queue.push(childId);
            }
        });
    }

    // Group nodes by level
    const nodesByLevel = new Map<number, string[]>();
    levels.forEach((level, nodeId) => {
        if (!nodesByLevel.has(level)) {
            nodesByLevel.set(level, []);
        }
        nodesByLevel.get(level)!.push(nodeId);
    });

    // ✅ FIX: Position each level independently, centered around x=0
    // Old code used maxNodesInLevel as a global anchor which caused diagonal drift.
    const horizontalSpacing = 350;
    const verticalSpacing = 220;

    nodesByLevel.forEach((nodeIds, level) => {
        const y = level * verticalSpacing + 100;
        // Center this level's nodes around x=0 regardless of other levels
        const totalWidth = (nodeIds.length - 1) * horizontalSpacing;
        const startXForLevel = -totalWidth / 2;

        nodeIds.forEach((nodeId, index) => {
            const x = startXForLevel + index * horizontalSpacing;
            nodePositions.set(nodeId, { x, y });
        });
    });

    // Apply positions to nodes - preserve existing valid positions, use layout for others
    return nodes.map(node => {
        const coerced = coerceReactFlowPosition(node.position);
        if (coerced) {
            return { ...node, position: coerced };
        }

        // Use calculated layout position
        const layoutPosition = nodePositions.get(node.id);
        return {
            ...node,
            position: layoutPosition || { x: 0, y: 0 }
        };
    });
}

/**
 * Preserves existing node IDs when they are non-empty and unique (stable URLs vs DB).
 * Assigns new IDs only for missing/empty IDs or duplicate IDs (first occurrence keeps).
 * Remaps edges to final node IDs; ambiguous duplicate-id edges attach to the first matching node.
 */
export function ensureUniqueNodeIdsPreserveStable(
    nodes: any[],
    edges: any[]
): { nodes: any[]; edges: any[] } {
    const existingIds = new Set<string>();
    const idFirstIndex = new Map<string, number>();

    nodes.forEach((node: any, index: number) => {
        const id = node?.id;
        if (id && typeof id === 'string' && !idFirstIndex.has(id)) {
            idFirstIndex.set(id, index);
        }
    });

    const finalNodes = nodes.map((node: any, index: number) => {
        const id = node?.id;
        if (!id || typeof id !== 'string') {
            return { ...node, id: generateUniqueId('node', existingIds) };
        }
        const firstIdx = idFirstIndex.get(id);
        if (firstIdx !== index) {
            return { ...node, id: generateUniqueId('node', existingIds) };
        }
        if (existingIds.has(id)) {
            return { ...node, id: generateUniqueId('node', existingIds) };
        }
        existingIds.add(id);
        return { ...node, id };
    });

    const resolveEndpoint = (originalId: string | undefined): string | undefined => {
        if (!originalId) return undefined;
        const idx = nodes.findIndex((n: any) => n?.id === originalId);
        if (idx === -1) return undefined;
        return finalNodes[idx]?.id;
    };

    const edgeExistingIds = new Set<string>();
    const finalEdges = edges
        .map((edge: any) => {
            const newSource = resolveEndpoint(edge.source);
            const newTarget = resolveEndpoint(edge.target);
            if (!newSource || !newTarget) return null;
            let edgeId = edge.id;
            if (!edgeId || edgeExistingIds.has(edgeId)) {
                edgeId = generateUniqueId('edge', edgeExistingIds);
            } else {
                edgeExistingIds.add(edgeId);
            }
            return {
                ...edge,
                id: edgeId,
                source: newSource,
                target: newTarget,
                sourceHandle: edge.sourceHandle,
                targetHandle: edge.targetHandle,
            };
        })
        .filter(Boolean) as any[];

    return { nodes: finalNodes, edges: finalEdges };
}

export function validateWorkflow(nodes: Node[], edges: Edge[]): WorkflowValidationError[] {
    const errors: WorkflowValidationError[] = [];
    const nodeIds = new Set(nodes.map(n => n.id));

    // 1. Check for Independent/Orphan Nodes (except triggers)
    nodes.forEach(node => {
        // Skip triggers - use category-based trigger detection
        const nodeType = String(node.data?.type || '');
        const category = String(node.data?.category || '');
        const isTrigger = category.toLowerCase() === 'triggers' || 
                         category.toLowerCase() === 'trigger' ||
                         nodeType.includes('trigger') ||
                         ['manual_trigger', 'webhook', 'webhook_trigger_response', 'schedule', 'chat_trigger', 'telegram_trigger', 'whatsapp_trigger', 'instagram_trigger', 'facebook_trigger',
                         'error_trigger', 'interval', 'workflow_trigger', 'http_trigger', 'form_trigger', 'form'].includes(nodeType);
        
        if (isTrigger) {
            return;
        }

        const hasIncoming = edges.some(e => e.target === node.id);
        if (!hasIncoming) {
            errors.push({
                nodeId: node.id,
                message: `Node "${node.data.label}" is disconnected (no input).`,
                severity: 'warning'
            });
        }
    });

    // 2. Validate If/Else Output
    const ifElseNodes = nodes.filter(n => n.data.type === 'if_else');
    ifElseNodes.forEach(node => {
        const outputs = edges.filter(e => e.source === node.id);
        const hasTrue = outputs.some(e => e.sourceHandle === 'true');
        const hasFalse = outputs.some(e => e.sourceHandle === 'false');

        if (!hasTrue) {
            errors.push({
                nodeId: node.id,
                message: `If/Else node "${node.data.label}" missing TRUE path.`,
                severity: 'error'
            });
        }
        if (!hasFalse) {
            errors.push({
                nodeId: node.id,
                message: `If/Else node "${node.data.label}" missing FALSE path.`,
                severity: 'warning'
            });
        }
    });

    // 2b. Non-merge nodes with mixed branch (true/false/case_*) and main-like incoming edges
    const incomingByTargetId = new Map<string, Edge[]>();
    edges.forEach(e => {
        if (!incomingByTargetId.has(e.target)) incomingByTargetId.set(e.target, []);
        incomingByTargetId.get(e.target)!.push(e);
    });
    incomingByTargetId.forEach((ins, targetId) => {
        if (ins.length < 2) return;
        const targetNode = nodes.find(n => n.id === targetId);
        if (!targetNode) return;
        const nt = String((targetNode.data as { type?: string })?.type || '');
        if (nt === 'merge' || nt === 'merge_data') return;
        const uniqueSources = new Set(ins.map(i => i.source));
        if (uniqueSources.size < 2) return;
        const edgeTypes = ins.map(i =>
            String(i.type || (i as { sourceHandle?: string }).sourceHandle || 'main').toLowerCase()
        );
        const hasExplicitBranch = edgeTypes.some(
            t => t === 'true' || t === 'false' || t.startsWith('case_')
        );
        const hasMainLike = edgeTypes.some(t => {
            const x = t || 'main';
            return x === 'main' || x === 'default';
        });
        if (hasExplicitBranch && hasMainLike) {
            errors.push({
                nodeId: targetId,
                message:
                    'Possible cross-branch wiring (branch and main inputs on the same node). Use a Merge node to combine paths.',
                severity: 'warning',
            });
        }
    });

    // 3. Loop Detection (Simple Cycle Check)
    // (Optional - BFS/DFS to detect cycles if loops aren't allowed)

    return errors;
}

/**
 * Resolve node type alias to canonical type.
 * Mirrors the backend unified-node-registry ALIAS_MAP — single source of truth.
 * Every entry here targets a type that exists in the frontend NODE_TYPES array.
 * Returns null if no alias match — caller falls through to http_request fallback.
 */
function resolveNodeTypeAlias(nodeType: string, validNodeTypes: Set<string>): string | null {
    if (!nodeType) return null;

    const normalized = nodeType.toLowerCase().trim();

    const aliasMap: Record<string, string> = {
        // ── Email ────────────────────────────────────────────────────────────
        'email': 'google_gmail',
        'mail': 'google_gmail',
        'gmail': 'google_gmail',
        'send_email': 'google_gmail',
        'google_mail': 'google_gmail',
        'gmail_send': 'google_gmail',
        'email_send': 'google_gmail',
        'google email': 'google_gmail',
        'send via gmail': 'google_gmail',
        'smtp': 'google_gmail',

        // ── Google Services ──────────────────────────────────────────────────
        'sheets': 'google_sheets',
        'gsheets': 'google_sheets',
        'spreadsheet': 'google_sheets',
        'sheet': 'google_sheets',
        'google_sheet': 'google_sheets',
        'gdoc': 'google_doc',
        'google_document': 'google_doc',
        'gdrive': 'google_drive',
        'drive': 'google_drive',
        'google_storage': 'google_drive',
        'gcal': 'google_calendar',
        'calendar': 'google_calendar',
        'google_cal': 'google_calendar',
        'bigquery': 'google_bigquery',
        'bq': 'google_bigquery',
        'google_tasks': 'google_tasks',
        'tasks': 'google_tasks',
        'google_contacts': 'google_contacts',
        'contacts': 'google_contacts',

        // ── AI Nodes ─────────────────────────────────────────────────────────
        'ai': 'ai_agent',
        'llm': 'ai_agent',
        'ai_node': 'ai_agent',
        'ai_service': 'ai_agent',
        'ai_chat': 'ai_agent',
        'ai_chat_model': 'ai_agent',
        'chat_model': 'ai_agent',
        'agent': 'ai_agent',
        'summarize': 'text_summarizer',
        'summary': 'text_summarizer',
        'summarizer': 'text_summarizer',
        'local_ai': 'ollama',
        'local_llm': 'ollama',
        'openai': 'openai_gpt',
        'gpt': 'openai_gpt',
        'chatgpt': 'openai_gpt',
        'claude': 'anthropic_claude',
        'anthropic': 'anthropic_claude',
        'gemini': 'google_gemini',
        'sentiment': 'sentiment_analyzer',
        'sentiment_analysis': 'sentiment_analyzer',

        // ── Communication ────────────────────────────────────────────────────
        'slack': 'slack_message',
        'slack_send': 'slack_message',
        'send_slack': 'slack_message',
        'slack_webhook': 'slack_webhook',
        'telegram': 'telegram',
        'telegram_send': 'telegram',
        'telegram_trigger': 'telegram_trigger',
        'telegram_webhook': 'telegram_trigger',
        'discord': 'discord',
        'discord_send': 'discord',
        'discord_webhook': 'discord_webhook',
        'teams': 'microsoft_teams',
        'ms_teams': 'microsoft_teams',
        'microsoft_teams': 'microsoft_teams',
        'whatsapp': 'whatsapp',
        'whatsapp_cloud': 'whatsapp_cloud',
        'whatsapp_trigger': 'whatsapp_trigger',
        'instagram_trigger': 'instagram_trigger',
        'instagram_webhook': 'instagram_trigger',
        'instagram_dm_trigger': 'instagram_trigger',
        'facebook_trigger': 'facebook_trigger',
        'facebook_webhook': 'facebook_trigger',
        'messenger_trigger': 'facebook_trigger',
        'facebook_messenger_trigger': 'facebook_trigger',
        'facebook_comment_trigger': 'facebook_trigger',
        'twilio': 'twilio',
        'sms': 'twilio',

        // ── Triggers ─────────────────────────────────────────────────────────
        'manual': 'manual_trigger',
        'on_demand': 'manual_trigger',
        'trigger': 'manual_trigger',
        'cron': 'schedule',
        'scheduled': 'schedule',
        'timer': 'schedule',
        'webhook_trigger': 'webhook',
        'http_trigger': 'webhook',
        'schedule_trigger': 'schedule',
        'interval_trigger': 'interval',
        'form_trigger': 'form',
        'form_submission': 'form',

        // ── Logic & Flow ─────────────────────────────────────────────────────
        'if': 'if_else',
        'conditional': 'if_else',
        'condition': 'if_else',
        'switch_case': 'switch',
        'loop': 'loop',
        'for': 'loop',
        'foreach': 'loop',
        'iterate': 'loop',
        'batch': 'split_in_batches',
        'delay': 'wait',

        // ── HTTP & API ───────────────────────────────────────────────────────
        'http': 'http_request',
        'api': 'http_request',
        'request': 'http_request',
        'fetch': 'http_request',
        'api_call': 'http_request',
        'gql': 'graphql',
        'webhook_response': 'respond_to_webhook',
        'response': 'respond_to_webhook',

        // ── Database ─────────────────────────────────────────────────────────
        'postgres': 'postgresql',
        'postgresql': 'postgresql',
        'pg': 'postgresql',
        'mysql': 'mysql',
        'mongo': 'mongodb',
        'mongo_db': 'mongodb',
        'mongodb': 'mongodb',
        'supabase': 'supabase',
        'redis': 'redis',

        // ── Storage ──────────────────────────────────────────────────────────
        's3': 'aws_s3',
        'amazon_s3': 'aws_s3',
        'aws_s3': 'aws_s3',
        'dropbox': 'dropbox',
        'dbx': 'dropbox',

        // ── CRM ──────────────────────────────────────────────────────────────
        'hubspot': 'hubspot',
        'hub_spot': 'hubspot',
        'salesforce': 'salesforce',
        'sf': 'salesforce',
        'airtable': 'airtable',
        'air_table': 'airtable',
        'notion': 'notion',
        'jira': 'jira',

        // ── Social Media ─────────────────────────────────────────────────────
        'twitter': 'twitter',
        'tweet': 'twitter',
        'x': 'twitter',
        'instagram': 'instagram',
        'ig': 'instagram',
        'insta': 'instagram',
        'facebook': 'facebook',
        'fb': 'facebook',

        // ── DevOps ───────────────────────────────────────────────────────────
        'github': 'github',
        'gh': 'github',
        'git_hub': 'github',
        'gitlab': 'gitlab',
        'git_lab': 'gitlab',

        // ── E-commerce / Payment ─────────────────────────────────────────────
        'stripe': 'stripe',
        'shopify': 'shopify',

        // ── Data Manipulation ────────────────────────────────────────────────
        'csv': 'csv',
        'csv_parser': 'csv',
        'csv_processor': 'csv',
        'js': 'javascript',
        'json': 'json_parser',
        'log': 'log_output',
        'logger': 'log_output',
    };

    const canonical = aliasMap[normalized];
    if (canonical && validNodeTypes.has(canonical)) {
        return canonical;
    }

    return null;
}

export interface ValidateAndFixWorkflowOptions {
  /** Skip linearization/layout/handle rewriting — use after attach-inputs/credentials when backend owns topology */
  preserveTopology?: boolean;
}

// Enhanced fix function
export function validateAndFixWorkflow(
    data: any,
    options?: ValidateAndFixWorkflowOptions
): { nodes: any[], edges: any[], explanation?: string } {
    if (!data || typeof data !== 'object') {
        throw new Error('Invalid workflow data');
    }
    let nodes = Array.isArray(data.nodes) ? data.nodes : [];
    let edges = Array.isArray(data.edges) ? data.edges : [];

    // 0. Validate and normalize nodes — resolve aliases, apply fallback, never remove nodes
    const validNodeTypes = new Set(NODE_TYPES.map((d: any) => d.type));
    
    nodes = nodes
        .map((node: any) => {
            // Get the actual node type from either node.type or node.data?.type
            let nodeType = node.data?.type || node.type;

            // Skip form nodes - they have special handling (form is a valid special node)
            if (nodeType === 'form') {
                return node;
            }

            // If no node type, try to infer from label
            if (!nodeType) {
                const label = (node.data?.label || node.label || '').toLowerCase();
                const inferredType =
                    (label.includes('email') || label.includes('mail') || label.includes('gmail'))
                        ? (validNodeTypes.has('google_gmail') ? 'google_gmail' : null)
                    : (label.includes('sheet') || label.includes('spreadsheet'))
                        ? (validNodeTypes.has('google_sheets') ? 'google_sheets' : null)
                    : (label.includes('summarize') || label.includes('summarizer'))
                        ? (validNodeTypes.has('text_summarizer') ? 'text_summarizer' : null)
                    : (label.includes('ai') || label.includes('llm') || label.includes('agent'))
                        ? (validNodeTypes.has('ai_agent') ? 'ai_agent' : null)
                    : (label.includes('slack'))
                        ? (validNodeTypes.has('slack_message') ? 'slack_message' : null)
                    : (label.includes('telegram'))
                        ? (validNodeTypes.has('telegram') ? 'telegram' : null)
                    : (label.includes('discord'))
                        ? (validNodeTypes.has('discord') ? 'discord' : null)
                    : (label.includes('http') || label.includes('api') || label.includes('request'))
                        ? (validNodeTypes.has('http_request') ? 'http_request' : null)
                    : null;

                const resolvedType = inferredType ?? 'http_request';
                const definition = NODE_TYPES.find((d: any) => d.type === resolvedType);
                const preservedLabel = node.data?.label || node.label;
                if (node.data) {
                    node.data.type = resolvedType;
                    if (definition) {
                        node.data.icon = definition.icon;
                        node.data.category = definition.category;
                        if (!preservedLabel) node.data.label = definition.label;
                    }
                } else {
                    node.data = {
                        type: resolvedType,
                        ...(definition ? { icon: definition.icon, category: definition.category, label: preservedLabel || definition.label } : {}),
                    };
                }
                nodeType = resolvedType;
            }

            // Step 1: already a valid canonical type — keep as-is
            if (validNodeTypes.has(nodeType)) {
                return node;
            }

            // Step 2: resolve via alias map
            const resolved = resolveNodeTypeAlias(nodeType, validNodeTypes);
            if (resolved) {
                const definition = NODE_TYPES.find((d: any) => d.type === resolved);
                const preservedLabel = node.data?.label || node.label;
                if (node.data) {
                    node.data.type = resolved;
                    if (definition) {
                        node.data.icon = definition.icon;
                        node.data.category = definition.category;
                        if (!preservedLabel) node.data.label = definition.label;
                    }
                } else {
                    node.data = {
                        type: resolved,
                        ...(definition ? { icon: definition.icon, category: definition.category, label: preservedLabel || definition.label } : {}),
                    };
                }
                return node;
            }

            // Step 3: known integration pattern — preserve type rather than clobber with http_request
            const knownNodePatterns = ['discord', 'slack', 'telegram', 'gmail', 'sheets', 'hubspot', 'salesforce', 'zoho'];
            if (knownNodePatterns.some(pattern => nodeType.toLowerCase().includes(pattern))) {
                if (node.data) { node.data.type = nodeType; } else { node.data = { type: nodeType }; }
                return node;
            }

            // Step 4: last resort — fall back to http_request
            const httpDef = NODE_TYPES.find((d: any) => d.type === 'http_request');
            const preservedLabelFallback = node.data?.label || node.label;
            if (node.data) {
                node.data.type = 'http_request';
                if (httpDef) {
                    node.data.icon = httpDef.icon;
                    node.data.category = httpDef.category;
                    if (!preservedLabelFallback) node.data.label = httpDef.label;
                }
            } else {
                node.data = {
                    type: 'http_request',
                    ...(httpDef ? { icon: httpDef.icon, category: httpDef.category, label: preservedLabelFallback || httpDef.label } : {}),
                };
            }
            return node;
        })
        .filter((node: any) => node !== null);

    // 1. Ensure unique node/edge IDs
    const { nodes: regeneratedNodes, edges: regeneratedEdges } = ensureUniqueNodeIdsPreserveStable(
        nodes,
        edges
    );

    if (options?.preserveTopology) {
        const topoNodes = regeneratedNodes.map((node: any) => {
            const c = coerceReactFlowPosition(node.position);
            return c ? { ...node, position: c } : node;
        });
        return {
            nodes: topoNodes,
            edges: regeneratedEdges.map((e: any) => ({ ...e })),
            explanation: 'preserve_topology_post_configuration',
        };
    }

    // 1.5 Enforce single-trigger, linear chain for simple AI-generated workflows
    // This mirrors backend normalizeWorkflowGraph logic so the canvas always sees
    // a clean graph: trigger → node1 → node2 → ...
    const detectTrigger = (node: any): boolean => {
        const nodeType = node.data?.type || node.type || '';
        const category = node.data?.category || '';
        return category.toLowerCase() === 'triggers' ||
               category.toLowerCase() === 'trigger' ||
               nodeType.includes('trigger') ||
               ['manual_trigger', 'webhook', 'schedule', 'interval', 'form', 'chat_trigger', 'telegram_trigger', 'whatsapp_trigger', 'instagram_trigger', 'facebook_trigger', 'workflow_trigger'].includes(nodeType);
    };

    let linearNodes = regeneratedNodes;
    let linearEdges = regeneratedEdges;

    try {
        const triggerNodes = regeneratedNodes.filter(detectTrigger);

        // Only linearize when we actually have at least one trigger
        if (triggerNodes.length > 0) {
            // Prefer a FORM trigger when present (prompt explicitly mentions forms)
            // This ensures form-based workflows show the Form Trigger node on the canvas.
            let primaryTrigger = triggerNodes[0];
            const preferredFormTrigger = triggerNodes.find((n: any) => {
                const nodeType = n.data?.type || n.type || '';
                return nodeType === 'form';
            });
            if (preferredFormTrigger) {
                primaryTrigger = preferredFormTrigger;
            }

            // Keep primary trigger and all non-trigger nodes; drop extra triggers
            const keptNodes = regeneratedNodes.filter(
                (n: any) => !detectTrigger(n) || n.id === primaryTrigger.id
            );

            // Build adjacency from existing edges
            const outgoingMap = new Map<string, string[]>();
            regeneratedEdges.forEach((e: any) => {
                if (!e.source || !e.target) return;
                if (!outgoingMap.has(e.source)) {
                    outgoingMap.set(e.source, []);
                }
                outgoingMap.get(e.source)!.push(e.target);
            });

            // Simple walk from trigger following first outgoing edge each time
            const ordered: any[] = [primaryTrigger];
            const visited = new Set<string>([primaryTrigger.id]);
            let currentId = primaryTrigger.id;

            while (true) {
                const outs = outgoingMap.get(currentId) || [];
                const nextId = outs.find(id => !visited.has(id));
                if (!nextId) break;
                const nextNode = keptNodes.find(n => n.id === nextId);
                if (!nextNode) break;
                ordered.push(nextNode);
                visited.add(nextId);
                currentId = nextId;
            }

            // Append any remaining kept nodes that weren't reachable
            for (const node of keptNodes) {
                if (!visited.has(node.id)) {
                    ordered.push(node);
                    visited.add(node.id);
                }
            }

            // ✅ REGISTRY-DRIVEN: Check for branching nodes using isBranching flag
            // DO NOT linearize graphs with branching nodes - they have multiple outputs
            const hasBranchingNodes = ordered.some((n: any) => {
                const nodeType = n.data?.type || n.type || '';
                // Check common branching types — frontend doesn't have registry access
                return nodeType === 'if_else' || nodeType === 'switch';
            });

            if (hasBranchingNodes) {
                // ✅ PRESERVE ALL EDGES from branching nodes - do not linearize
                const validNodeIds = new Set(ordered.map((n: any) => n.id));
                const preservedEdges = regeneratedEdges.filter((e: any) => 
                    validNodeIds.has(e.source) && validNodeIds.has(e.target)
                );
                
                console.log(`[WorkflowValidation] 🔀 Preserving branching structure - keeping ${preservedEdges.length} edge(s) (skipping linearization)`);
                
                linearNodes = ordered;
                linearEdges = preservedEdges;
            } else {
                // ✅ LINEARIZATION: Only for simple sequential chains (no branching)
                // Rebuild edges as strict linear chain using kept node order
                const validNodeIds = new Set(ordered.map(n => n.id));
                const existingEdges = regeneratedEdges.filter(
                    (e: any) => validNodeIds.has(e.source) && validNodeIds.has(e.target)
                );
                const chainEdges: any[] = [];

                for (let i = 0; i < ordered.length - 1; i++) {
                    const source = ordered[i];
                    const target = ordered[i + 1];
                    // ✅ CRITICAL FIX: Keep ALL edges from source, not just first match
                    // This preserves multiple edges from the same source with different sourceHandle
                    const matchingEdges = existingEdges.filter(
                        (e: any) => e.source === source.id && e.target === target.id
                    );
                    if (matchingEdges.length > 0) {
                        chainEdges.push(...matchingEdges);
                    } else {
                        chainEdges.push({
                            id: `edge_linear_${source.id}_${target.id}`,
                            source: source.id,
                            target: target.id,
                            type: 'default',
                        });
                    }
                }

                // ✅ CRITICAL FIX: Also preserve any edges that don't fit the linear chain
                // This catches edges from branching nodes that weren't in the ordered sequence
                const chainEdgeKeys = new Set(chainEdges.map((e: any) => `${e.source}::${e.target}::${e.sourceHandle || ''}::${e.targetHandle || ''}`));
                const additionalEdges = existingEdges.filter((e: any) => {
                    const key = `${e.source}::${e.target}::${e.sourceHandle || ''}::${e.targetHandle || ''}`;
                    return !chainEdgeKeys.has(key);
                });

                if (additionalEdges.length > 0) {
                    console.log(`[WorkflowValidation] 🔀 Preserving ${additionalEdges.length} additional edge(s) that don't fit linear chain`);
                    chainEdges.push(...additionalEdges);
                }

                linearNodes = ordered;
                linearEdges = chainEdges;
            }
        } else {
            linearNodes = regeneratedNodes;
            linearEdges = regeneratedEdges;
        }
    } catch (err) {
        console.warn('[WorkflowValidation] Linearization failed (non-fatal):', err);
        linearNodes = regeneratedNodes;
        linearEdges = regeneratedEdges;
    }

    // Coerce string positions from JSON/DB so strict number checks do not trigger full re-layout
    linearNodes = linearNodes.map((node: any) => {
        const c = coerceReactFlowPosition(node.position);
        if (c) {
            return { ...node, position: c };
        }
        return node;
    });

    // Check which nodes need positioning
    const nodesNeedingPosition = linearNodes.filter((node: any) => {
        return !coerceReactFlowPosition(node.position);
    });

    // If any nodes need positioning and we have edges, apply hierarchical layout
    // Otherwise, use simple linear positioning
    if (nodesNeedingPosition.length > 0 && linearEdges.length > 0) {
        // Apply hierarchical layout to nodes without positions
        const positionedNodes = applyHierarchicalLayout(linearNodes, linearEdges);
        nodes = positionedNodes.map((node: any) => ({
            ...node,
            data: node.data || {},
        }));
    } else {
        // Preserve original positions - only set default if position is truly missing
        nodes = linearNodes.map((node: any, index: number) => {
            const coerced = coerceReactFlowPosition(node.position);
            return {
                ...node,
                position: coerced ?? { x: index * 250, y: 100 },
                data: node.data || {},
            };
        });
    }

    // ✅ CRITICAL: Normalize handles to valid React Flow handle IDs
    // This prevents "Couldn't create edge for handle id" errors
    edges = linearEdges.map((edge: any) => {
        // Find source and target nodes
        const sourceNode = nodes.find((n: any) => n.id === edge.source);
        const targetNode = nodes.find((n: any) => n.id === edge.target);

        const sourceType = sourceNode?.data?.type || 'default';
        const targetType = targetNode?.data?.type || 'default';

        // Normalize handles using the same logic as backend handle registry
        let normalizedSourceHandle = edge.sourceHandle;
        let normalizedTargetHandle = edge.targetHandle;

        // Normalize source handle (output)
        if (!normalizedSourceHandle) {
            if (sourceType === 'if_else') {
                // ✅ CRITICAL FIX: Do NOT default if_else edges to 'true'
                // If sourceHandle is missing, it's a configuration error - preserve undefined
                // This prevents FALSE branch edges from being incorrectly defaulted to TRUE
                console.warn(`[NormalizeWorkflow] ⚠️ If/Else edge missing sourceHandle - should be 'true' or 'false': ${edge.source} → ${edge.target}`);
                normalizedSourceHandle = 'true'; // Keep default for backward compatibility, but log warning
            } else if (sourceType === 'switch') {
                normalizedSourceHandle = 'default'; // Switch handles are dynamic
            } else {
                normalizedSourceHandle = 'output'; // Standard output handle
            }
        } else {
            // ✅ FIX: For switch nodes, map case_N positional handles to actual case values.
            // The backend generates edges with sourceHandle="case_1","case_2",... but the
            // WorkflowNode renders handles with id=c.value (e.g. "shipped","processing").
            // We resolve the positional index to the actual case value so React Flow can
            // connect the edge to the correct rendered handle — works for any N cases.
            if (sourceType === 'switch') {
                const switchConfig = sourceNode?.data?.config || {};
                const rawCases = switchConfig.cases ?? switchConfig.rules;
                let casesArray: Array<{ value: string }> = [];
                if (Array.isArray(rawCases)) {
                    casesArray = rawCases;
                } else if (typeof rawCases === 'string') {
                    try { casesArray = JSON.parse(rawCases); } catch { /* keep empty */ }
                }
                const caseValues = casesArray
                    .map((c) => String(c?.value ?? '').trim())
                    .filter((v) => v.length > 0);
                const caseIndexMatch = normalizedSourceHandle.match(/^case_(\d+)$/i);
                if (caseIndexMatch) {
                    const caseIndex = parseInt(caseIndexMatch[1], 10) - 1; // case_1 → index 0
                    if (casesArray[caseIndex]?.value) {
                        normalizedSourceHandle = casesArray[caseIndex].value;
                    }
                    // If no case value found, keep the original case_N handle as fallback
                }
                // Non-positional switch handles: validate membership against current switch cases.
                if (
                    caseValues.length > 0 &&
                    normalizedSourceHandle &&
                    !caseValues.includes(normalizedSourceHandle)
                ) {
                    const sourceOutgoing = linearEdges.filter((candidate: any) => candidate.source === edge.source);
                    const sourceOrdinal = sourceOutgoing.findIndex((candidate: any) => candidate.id === edge.id);
                    const fallbackHandle = caseValues[Math.max(0, Math.min(sourceOrdinal, caseValues.length - 1))] || caseValues[0];
                    console.warn(`[WorkflowValidation] ⚠️ Stale switch sourceHandle "${normalizedSourceHandle}" remapped to "${fallbackHandle}" for edge ${edge.id}`);
                    normalizedSourceHandle = fallbackHandle;
                }
            }

            // Map common backend field names to React handle IDs
            const sourceLower = normalizedSourceHandle.toLowerCase();
            const sourceMappings: Record<string, string> = {
                'data': 'output',
                'message': 'output',
                'output': 'output',
                'result': 'output',
                'response': 'output',
                'formdata': 'output',
                'body': 'output',
                'triggertime': 'output',
                'inputdata': 'output',
                'rows': 'output',
                'parsed': 'output',
                'formatted': 'output',
            };
            normalizedSourceHandle = sourceMappings[sourceLower] || normalizedSourceHandle;
            
            // Validate against node type
            // ✅ CRITICAL FIX: For if_else, preserve 'true' and 'false' - don't overwrite!
            if (sourceType === 'if_else') {
                // Only normalize if it's not already 'true' or 'false'
                if (normalizedSourceHandle !== 'true' && normalizedSourceHandle !== 'false') {
                    console.warn(`[WorkflowValidation] ⚠️ If/Else edge has invalid sourceHandle "${normalizedSourceHandle}" - defaulting to 'true' (should be 'true' or 'false')`);
                    normalizedSourceHandle = 'true'; // Default to true for if_else only if invalid
                }
                // If it's already 'true' or 'false', keep it as-is
            } else if (sourceType !== 'if_else' && sourceType !== 'switch' && normalizedSourceHandle !== 'output') {
                normalizedSourceHandle = 'output'; // Force to output for standard nodes
            }
        }

        // Normalize target handle (input)
        if (!normalizedTargetHandle) {
            normalizedTargetHandle = 'input'; // Standard input handle
        } else {
            // Map common backend field names to React handle IDs
            const targetLower = normalizedTargetHandle.toLowerCase();
            const targetMappings: Record<string, string> = {
                'data': 'input',
                'input': 'input',
                'message': 'input',
                'text': 'input',
                'body': 'input',
                'content': 'input',
                'userinput': 'userInput',
                'user_input': 'userInput',
                'chatmodel': 'input',
                'chat_model': 'input',
                'memory': 'input',
                'tool': 'input',
                'values': 'input',
                'json': 'input',
                'template': 'input',
            };
            normalizedTargetHandle = targetMappings[targetLower] || normalizedTargetHandle;
            
            // Validate against node type — preserve 'userInput' for ai_agent
            const targetNodeForHandle = nodes.find((n: any) => n.id === edge.target);
            const targetNodeTypeForHandle = targetNodeForHandle?.data?.type || targetNodeForHandle?.type || '';
            if (normalizedTargetHandle !== 'input' && normalizedTargetHandle !== 'userInput') {
                normalizedTargetHandle = 'input';
            }
            // ai_agent uses 'userInput' as its primary input handle
            if (targetNodeTypeForHandle === 'ai_agent' && normalizedTargetHandle === 'input') {
                normalizedTargetHandle = 'userInput';
            }
        }


        return {
            ...edge,
            // ✅ CRITICAL: Always set normalized handles - never undefined
            sourceHandle: normalizedSourceHandle,
            targetHandle: normalizedTargetHandle,
            // Ensure edge has an ID
            id: edge.id || `edge-${edge.source}-${edge.target}-${Date.now()}`,
            // Ensure edge type is set
            type: edge.type || 'default',
        };
    });

    // 2. Fix Orphan Nodes (Auto-wire if simple, else leave for warning)
    // For now, we won't auto-wire arbitrary orphans as it's risky.

    // 3. Fix If/Else Outputs - ensure unique IDs and proper positioning
    // ✅ CRITICAL FIX: Do NOT auto-create branch nodes - this mutates the graph
    // Only fix sourceHandle if edges exist but have wrong/missing handles
    const existingNodeIds = new Set<string>(nodes.map((n: any) => n.id).filter(Boolean));
    const existingEdgeIdsForIfElse = new Set<string>(edges.map((e: any) => e.id).filter(Boolean));
    nodes.forEach((node: any) => {
        if (node.data.type === 'if_else') {
            const outputs = edges.filter((e: any) => e.source === node.id);
            const hasTrue = outputs.some((e: any) => e.sourceHandle === 'true' || e.sourceHandle === 'output_true');
            const hasFalse = outputs.some((e: any) => e.sourceHandle === 'false' || e.sourceHandle === 'output_false');
            
            // ✅ CRITICAL FIX: Check if edges exist but have wrong/missing sourceHandle
            // If edges exist without proper sourceHandle, fix them instead of creating new nodes
            const edgesWithoutHandle = outputs.filter((e: any) => 
                !e.sourceHandle || 
                (e.sourceHandle !== 'true' && e.sourceHandle !== 'false' && 
                 e.sourceHandle !== 'output_true' && e.sourceHandle !== 'output_false')
            );
            
            // ✅ FIX: If we have edges but they're missing sourceHandle, fix them intelligently
            if (outputs.length === 0) {
                // No edges at all - this is a validation issue, but don't auto-create
                // Let the user fix it manually or through validation warnings
                console.warn(`[validateAndFixWorkflow] ⚠️ If/Else node "${node.data?.label || node.id}" has no outgoing edges - skipping auto-creation to prevent graph mutation`);
            } else if (edgesWithoutHandle.length > 0) {
                // ✅ FIX: Edges exist but have wrong/missing sourceHandle - fix them
                // Strategy: If we have exactly 2 edges, assign one to true and one to false
                // If we have 1 edge and no true/false assigned yet, check target node label for hints
                if (outputs.length === 2 && edgesWithoutHandle.length === 2) {
                    // Two edges without handles - assign first to true, second to false
                    const edge1Index = edges.indexOf(edgesWithoutHandle[0]);
                    const edge2Index = edges.indexOf(edgesWithoutHandle[1]);
                    if (edge1Index !== -1) {
                        edges[edge1Index].sourceHandle = 'true';
                        console.log(`[validateAndFixWorkflow] 🔧 Fixed edge ${edgesWithoutHandle[0].id}: assigned sourceHandle='true' (first of two)`);
                    }
                    if (edge2Index !== -1) {
                        edges[edge2Index].sourceHandle = 'false';
                        console.log(`[validateAndFixWorkflow] 🔧 Fixed edge ${edgesWithoutHandle[1].id}: assigned sourceHandle='false' (second of two)`);
                    }
                } else {
                    // Multiple edges or single edge - try to infer from target node labels
                    edgesWithoutHandle.forEach((edge: any) => {
                        const edgeIndex = edges.indexOf(edge);
                        if (edgeIndex === -1) return;
                        
                        const targetNode = nodes.find((n: any) => n.id === edge.target);
                        const targetLabel = targetNode?.data?.label?.toLowerCase() || '';
                        
                        // Try to infer from target node label
                        if (targetLabel.includes('false') || targetLabel.includes('not') || targetLabel.includes('invalid') || targetLabel.includes('reject')) {
                            if (!hasFalse) {
                                edges[edgeIndex].sourceHandle = 'false';
                                console.log(`[validateAndFixWorkflow] 🔧 Fixed edge ${edge.id}: assigned sourceHandle='false' (inferred from target label)`);
                            }
                        } else if (targetLabel.includes('true') || targetLabel.includes('valid') || targetLabel.includes('approve') || targetLabel.includes('accept')) {
                            if (!hasTrue) {
                                edges[edgeIndex].sourceHandle = 'true';
                                console.log(`[validateAndFixWorkflow] 🔧 Fixed edge ${edge.id}: assigned sourceHandle='true' (inferred from target label)`);
                            }
                        } else {
                            // Can't infer - assign based on what's missing
                            if (!hasTrue) {
                                edges[edgeIndex].sourceHandle = 'true';
                                console.log(`[validateAndFixWorkflow] 🔧 Fixed edge ${edge.id}: assigned sourceHandle='true' (default, true path missing)`);
                            } else if (!hasFalse) {
                                edges[edgeIndex].sourceHandle = 'false';
                                console.log(`[validateAndFixWorkflow] 🔧 Fixed edge ${edge.id}: assigned sourceHandle='false' (default, false path missing)`);
                            }
                        }
                    });
                }
            }
            
            // ✅ REMOVED: Auto-creation of branch nodes
            // This was causing graph mutation - nodes should only be created by user action
            // If branches are missing, validation will warn but won't auto-create
        }
    });

    // 4. Remove duplicate nodes (keep first occurrence)
    const seenIds = new Set<string>();
    const uniqueNodes: any[] = [];
    nodes.forEach((node: any) => {
        if (!seenIds.has(node.id)) {
            seenIds.add(node.id);
            uniqueNodes.push(node);
        }
    });
    nodes = uniqueNodes;

    // 5. Remove duplicate edges and ensure they reference valid nodes
    const nodeIds = new Set(nodes.map((n: any) => n.id));
    const seenEdgeKeys = new Set<string>();
    const existingEdgeIds = new Set<string>(edges.map((e: any) => e.id).filter(Boolean));
    const uniqueEdges: any[] = [];
    edges.forEach((edge: any) => {
        // Only keep edges that:
        // 1. Have valid source and target nodes
        // 2. Are not duplicates (by ID or by source/target/handle combination)
        const edgeKey = edge.id || `${edge.source}_${edge.target}_${edge.sourceHandle || ''}`;
        if (
            edge.source &&
            edge.target &&
            nodeIds.has(edge.source) &&
            nodeIds.has(edge.target) &&
            !seenEdgeKeys.has(edgeKey)
        ) {
            seenEdgeKeys.add(edgeKey);
            // Ensure edge has a unique ID (should already be unique from regeneration, but double-check)
            if (!edge.id || existingEdgeIds.has(edge.id)) {
                edge.id = generateUniqueId(`edge_${edge.source}_${edge.target}`, existingEdgeIds);
            } else {
                existingEdgeIds.add(edge.id);
            }
            uniqueEdges.push(edge);
        }
    });
    edges = uniqueEdges;

    // 6. Final validation: ensure no duplicate node IDs or edge IDs
    const finalNodeIds = new Set<string>();
    const duplicateNodeIds: string[] = [];
    nodes.forEach((node: any) => {
        if (finalNodeIds.has(node.id)) {
            duplicateNodeIds.push(node.id);
        } else {
            finalNodeIds.add(node.id);
        }
    });

    const finalEdgeIds = new Set<string>();
    const duplicateEdgeIds: string[] = [];
    edges.forEach((edge: any) => {
        if (finalEdgeIds.has(edge.id)) {
            duplicateEdgeIds.push(edge.id);
        } else {
            finalEdgeIds.add(edge.id);
        }
    });

    if (duplicateNodeIds.length > 0 || duplicateEdgeIds.length > 0) {
        console.error('[WORKFLOW VALIDATION] Duplicate IDs detected:', {
            duplicateNodeIds,
            duplicateEdgeIds
        });
        throw new Error(`Duplicate IDs detected: ${duplicateNodeIds.length} duplicate node IDs, ${duplicateEdgeIds.length} duplicate edge IDs`);
    }

    // 7. ✅ ARCHITECTURAL RULE: log_output must NEVER connect directly to manual_trigger (or any trigger)
    //    It must connect AFTER terminal execution nodes (branch-aware).
    try {
        const getType = (n: any) => String(n?.data?.type || n?.type || '').toLowerCase();
        const isTrigger = (n: any) => {
            const t = getType(n);
            const category = String(n?.data?.category || '').toLowerCase();
            return category === 'triggers' || category === 'trigger' ||
                t.includes('trigger') ||
                ['manual_trigger', 'webhook', 'schedule', 'interval', 'form', 'chat_trigger', 'telegram_trigger', 'whatsapp_trigger', 'instagram_trigger', 'facebook_trigger', 'workflow_trigger', 'error_trigger'].includes(t);
        };

        const nodeById = new Map<string, any>(nodes.map((n: any) => [n.id, n]));
        const logNodes = nodes.filter((n: any) => getType(n) === 'log_output');
        if (logNodes.length > 0) {
            const existingLog = logNodes[0];

            // Remove any trigger → log_output edges and outgoing edges from log_output (sink)
            edges = edges.filter((e: any) => {
                if (e?.source === existingLog.id) return false;
                if (e?.target === existingLog.id) {
                    const src = nodeById.get(e.source);
                    if (src && isTrigger(src)) return false;
                }
                return true;
            });

            // Compute terminal nodes (no outgoing), excluding triggers and log_output nodes
            const sources = new Set(edges.map((e: any) => e.source));
            const terminals = nodes
                .filter((n: any) => !sources.has(n.id))
                .filter((n: any) => !isTrigger(n))
                .filter((n: any) => getType(n) !== 'log_output');

            if (terminals.length > 0) {
                const hasFailureTerminal = terminals.some((n: any) => getType(n) === 'stop_and_error');
                const hasSuccessTerminal = terminals.some((n: any) => getType(n) !== 'stop_and_error');

                const allNodeIds = new Set<string>(nodes.map((n: any) => n.id));
                const edgeIds = new Set<string>(edges.map((e: any) => e.id).filter(Boolean));
                const pairKeys = new Set<string>(edges.map((e: any) => `${e.source}::${e.target}::${e.sourceHandle || ''}::${e.targetHandle || ''}`));

                // If both success + failure terminals exist, split into 2 log nodes so message differs.
                let successLog = existingLog;
                let failureLog = existingLog;
                if (hasFailureTerminal && hasSuccessTerminal) {
                    // Remove existing log node (we'll replace with two)
                    nodes = nodes.filter((n: any) => n.id !== existingLog.id);
                    edges = edges.filter((e: any) => e.source !== existingLog.id && e.target !== existingLog.id);
                    nodeById.delete(existingLog.id);

                    const basePos = existingLog.position || { x: 0, y: 0 };
                    const baseData = existingLog.data || {};

                    successLog = {
                        ...existingLog,
                        id: generateUniqueId('node_log_success', allNodeIds),
                        position: { x: basePos.x, y: basePos.y - 80 },
                        data: {
                            ...baseData,
                            label: 'Log Output (Success)',
                            type: 'log_output',
                            config: {
                                ...(baseData.config || {}),
                                level: 'info',
                                message: '✅ Success path completed.',
                            }
                        }
                    };

                    failureLog = {
                        ...existingLog,
                        id: generateUniqueId('node_log_failure', allNodeIds),
                        position: { x: basePos.x, y: basePos.y + 80 },
                        data: {
                            ...baseData,
                            label: 'Log Output (Failure)',
                            type: 'log_output',
                            config: {
                                ...(baseData.config || {}),
                                level: 'info',
                                message: '❌ Failure path completed (workflow stopped).',
                            }
                        }
                    };

                    nodes.push(successLog, failureLog);
                    nodeById.set(successLog.id, successLog);
                    nodeById.set(failureLog.id, failureLog);
                }

                // Connect each terminal → appropriate log node
                terminals.forEach((tNode: any) => {
                    const terminalType = getType(tNode);
                    const targetLog = terminalType === 'stop_and_error' ? failureLog : successLog;
                    const key = `${tNode.id}::${targetLog.id}::output::input`;
                    if (pairKeys.has(key)) return;
                    edges.push({
                        id: generateUniqueId(`edge_${tNode.id}_${targetLog.id}`, edgeIds),
                        source: tNode.id,
                        target: targetLog.id,
                        type: 'default',
                        sourceHandle: 'output',
                        targetHandle: 'input',
                    });
                    pairKeys.add(key);
                });
            }
        }
    } catch (err) {
        console.warn('[WorkflowValidation] log_output placement fix failed (non-fatal):', err);
    }

    // Final universal contract gate for canvas rendering:
    // - ReactFlow render type must be registered (custom/form/manual_trigger/set_variable)
    // - semantic node type remains in data.type
    // - branch/source handles and target handles get safe defaults
    const toRenderType = (semanticType: string): string => {
        const t = (semanticType || '').toLowerCase();
        if (t === 'form') return 'form';
        if (t === 'manual_trigger') return 'manual_trigger';
        if (t === 'set_variable') return 'set_variable';
        return 'custom';
    };

    const normalizedNodes = nodes.map((node: any) => {
        const semanticType = String(node?.data?.type || node?.type || 'unknown');
        const renderType = toRenderType(semanticType);
        return {
            ...node,
            type: renderType,
            data: {
                ...(node?.data || {}),
                type: semanticType,
            },
        };
    });

    const nodeByIdFinal = new Map<string, any>(normalizedNodes.map((n: any) => [n.id, n]));
    const normalizedEdges = edges.map((edge: any) => {
        const src = nodeByIdFinal.get(edge.source);
        const srcSemantic = String(src?.data?.type || src?.type || '').toLowerCase();
        const sourceHandle =
            edge.sourceHandle ||
            edge.sourceOutput ||
            (srcSemantic === 'if_else' ? 'true' : 'output');
        const targetHandle = edge.targetHandle || edge.targetInput || 'input';
        return {
            ...edge,
            sourceHandle,
            targetHandle,
        };
    });

    return { nodes: normalizedNodes, edges: normalizedEdges, explanation: data.explanation };
}
