import {
  type LucideIcon,
  LayoutDashboard,
  LayoutTemplate,
  GitBranch,
  Play,
  Link2,
  BookOpen,
  User,
  Shield,
  Users,
  ArrowLeft,
  CreditCard,
  Sparkles,
} from 'lucide-react';

export interface UserNavItem {
  title: string;
  path: string;
  icon: LucideIcon;
}

export const USER_PRIMARY_NAV: UserNavItem[] = [
  { title: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
  { title: 'Templates', path: '/templates', icon: LayoutTemplate },
  { title: 'Workflows', path: '/workflows', icon: GitBranch },
  { title: 'Executions', path: '/executions', icon: Play },
  { title: 'Connections', path: '/connections', icon: Link2 },
  { title: 'Adaptive UI', path: '/adaptive-ui', icon: Sparkles },
  { title: 'Documentation', path: '/docs', icon: BookOpen },
];

export interface AdminNavItem {
  title: string;
  path: string;
  icon: LucideIcon;
}

export const ADMIN_SECTION_NAV: AdminNavItem[] = [
  { title: 'Admin home', path: '/admin/dashboard', icon: Shield },
  { title: 'Templates', path: '/admin/templates', icon: LayoutTemplate },
  { title: 'Users', path: '/admin/users', icon: Users },
  { title: 'Subscriptions', path: '/admin/subscriptions', icon: CreditCard },
  { title: 'Documentation', path: '/docs', icon: BookOpen },
];

export const ADMIN_BACK_TO_APP = {
  title: 'Back to app',
  path: '/dashboard',
  icon: ArrowLeft,
} as const;
