/**
 * Shared node-icon resolver.
 *
 * `nodeTypes.ts` stores each node's icon as a lucide component *name* (`icon: 'Play'`), so
 * something has to turn that string back into a component. Four separate `iconMap` copies
 * already do this (`NodeLibrary.tsx`, `PropertiesPanel.tsx`, `WorkflowNode.tsx`,
 * `ExecutionLogBlock.tsx`), each with a slightly different subset — a node whose icon is
 * missing from one silently renders the fallback there but not elsewhere.
 *
 * This is the one resolver new code should use. The existing four are left alone
 * deliberately: consolidating them touches the canvas, the properties panel and the
 * execution log, which is well outside the change that introduced this file.
 *
 * The map is explicit rather than `import * as Icons from 'lucide-react'` because a
 * namespace import defeats tree-shaking and would pull the entire icon set into the bundle.
 * It covers every icon name currently referenced by `NODE_TYPES`; anything unrecognised
 * falls back to `Box` rather than throwing, so an unmapped name degrades to a generic icon.
 */

import type { ComponentType } from 'react';
import {
  Activity, AlarmClock, AlertCircle, ArrowLeft, ArrowUpDown, BarChart, Bell, Bot, Box,
  Braces, Brain, Building2, Calculator, Calendar, CheckCircle, CheckCircle2, CheckSquare,
  Clock, Cloud, Code, Code2, Combine, CornerDownLeft, CreditCard, Database, DatabaseZap,
  DollarSign, Edit, Edit3, Facebook, FileCheck, FileOutput, FileText, Filter, Folder,
  FolderOpen, Gem, GitBranch, GitMerge, Globe, Hash, Headphones, Heart, Image, Instagram,
  Key, Layers, Link, List, ListChecks, Lock, Mail, MessageCircle, MessageSquare, Play,
  RefreshCw, Repeat, Rss, Send, Shield, ShieldAlert, ShoppingCart, Sparkles, Table, Tag,
  Target, Terminal, Timer, TrendingUp, Type, Users, Variable, Video, Webhook, XCircle, Zap,
} from 'lucide-react';
import { NODE_TYPES } from './nodeTypes';

export type NodeIconComponent = ComponentType<{ className?: string }>;

const NODE_ICONS: Record<string, NodeIconComponent> = {
  Activity, AlarmClock, AlertCircle, ArrowLeft, ArrowUpDown, BarChart, Bell, Bot, Box,
  Braces, Brain, Building2, Calculator, Calendar, CheckCircle, CheckCircle2, CheckSquare,
  Clock, Cloud, Code, Code2, Combine, CornerDownLeft, CreditCard, Database, DatabaseZap,
  DollarSign, Edit, Edit3, Facebook, FileCheck, FileOutput, FileText, Filter, Folder,
  FolderOpen, Gem, GitBranch, GitMerge, Globe, Hash, Headphones, Heart, Image, Instagram,
  Key, Layers, Link, List, ListChecks, Lock, Mail, MessageCircle, MessageSquare, Play,
  RefreshCw, Repeat, Rss, Send, Shield, ShieldAlert, ShoppingCart, Sparkles, Table, Tag,
  Target, Terminal, Timer, TrendingUp, Type, Users, Variable, Video, Webhook, XCircle, Zap,
};

/** Resolve a lucide icon *name* to its component. Unknown names fall back to `Box`. */
export function iconByName(iconName: string | undefined | null): NodeIconComponent {
  if (!iconName) return Box;
  return NODE_ICONS[iconName] ?? Box;
}

/**
 * Resolve a node *type* (e.g. `google_sheets`) to its icon component.
 *
 * Node types absent from the frontend catalogue — the backend registry is authoritative for
 * execution and carries more types than `nodeTypes.ts` does — fall back to `Box` rather than
 * rendering nothing.
 *
 * Uses a direct lookup rather than `getNodeDefinition()`, which filters by
 * `BACKEND_SUPPORTED_NODE_TYPES`: that gate is about whether a node can be *placed*, and
 * applying it here would strip the icon off nodes that still need to render.
 */
export function iconForNodeType(nodeType: string | undefined | null): NodeIconComponent {
  if (!nodeType) return Box;
  const definition = NODE_TYPES.find((node) => node.type === nodeType);
  return iconByName(definition?.icon);
}
