import { AppBrand } from '@/components/brand/AppBrand';
import { NavLink } from '@/components/NavLink';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/lib/auth';
import { useRole } from '@/hooks/useRole';
import { useTheme } from '@/hooks/useTheme';
import { cn } from '@/lib/utils';
import { Moon, Sun, Shield, UserCircle, LogOut, User, Zap, Search } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { USER_PRIMARY_NAV } from './nav-config';

export interface AppChromeHeaderProps {
  className?: string;
  endSlot?: React.ReactNode;
  showThemeToggle?: boolean;
}

export function AppChromeHeader({
  className,
  endSlot,
  showThemeToggle = true,
}: AppChromeHeaderProps) {
  const { user, signOut } = useAuth();
  const { canAccessAdmin } = useRole();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <header className={cn('sticky top-0 z-50 border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/85', className)}>
      <div className="container mx-auto flex flex-wrap items-center justify-between gap-3 px-4 py-3">
        <AppBrand context="app" />

        <nav
          className="order-3 flex w-full flex-wrap items-center justify-center gap-1 sm:order-none sm:flex-1 sm:justify-center lg:w-auto"
          aria-label="Main"
        >
          {USER_PRIMARY_NAV.map(({ title, path, icon: Icon }) => (
            <NavLink
              key={path}
              to={path}
              className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
              activeClassName="bg-muted text-primary"
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="hidden sm:inline">{title}</span>
            </NavLink>
          ))}
          {canAccessAdmin && (
            <NavLink
              to="/admin/dashboard"
              className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
              activeClassName="bg-muted text-primary"
            >
              <Shield className="h-4 w-4 shrink-0" />
              <span className="hidden sm:inline">Admin</span>
            </NavLink>
          )}
        </nav>

        <div className="flex items-center gap-2 sm:gap-3">
          {endSlot}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/search')}
            className="rounded-full"
            title="Search"
          >
            <Search className="h-5 w-5" />
          </Button>
          {showThemeToggle && (
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              className="rounded-full"
              title={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
            >
              {theme === 'light' ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
            </Button>
          )}
          {user?.email && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="flex items-center gap-1.5 rounded-md px-2 py-1 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                  title="Account menu"
                >
                  <UserCircle className="h-4 w-4 shrink-0" />
                  <span className="hidden max-w-[160px] truncate xl:inline">{user.email}</span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <div className="px-2 py-1.5">
                  <p className="text-xs font-medium truncate">{user.email}</p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to="/profile" className="flex items-center gap-2 cursor-pointer">
                    <User className="h-4 w-4" />
                    My Account
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/subscriptions" className="flex items-center gap-2 cursor-pointer">
                    <Zap className="h-4 w-4" />
                    Subscription
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleSignOut}
                  className="flex items-center gap-2 text-destructive focus:text-destructive cursor-pointer"
                >
                  <LogOut className="h-4 w-4" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    </header>
  );
}
