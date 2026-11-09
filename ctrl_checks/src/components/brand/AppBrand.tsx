import { useState } from 'react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

const LOGO_PRIMARY = '/favicon.ico';
const LOGO_FALLBACK = '/brand/logo.svg';

export type AppBrandContext = 'app' | 'admin' | 'marketing';

export interface AppBrandProps {
  context?: AppBrandContext;
  size?: 'default' | 'sm' | 'minimal';
  className?: string;
}

export function AppBrand({
  context = 'app',
  size = 'default',
  className,
}: AppBrandProps) {
  const [src, setSrc] = useState(LOGO_PRIMARY);
  const to =
    context === 'admin' ? '/admin/dashboard' : context === 'marketing' ? '/' : '/dashboard';

  const imgWrap = cn(
    'flex shrink-0 items-center justify-center overflow-hidden',
    size === 'sm' && 'h-7 w-7',
    size === 'minimal' && 'h-8 w-8',
    size === 'default' && 'h-9 w-9'
  );

  const titleClass = cn(
    'font-bold tracking-tight text-foreground',
    size === 'sm' && 'text-base',
    size === 'default' && 'text-xl'
  );

  return (
    <Link to={to} className={cn('flex min-w-0 items-center gap-2', className)}>
      <div className={imgWrap}>
        <img
          src={src}
          alt=""
          width={36}
          height={36}
          className="h-full w-full object-contain"
          onError={() => setSrc(LOGO_FALLBACK)}
        />
      </div>
      {size !== 'minimal' && (
        <div className="flex min-w-0 flex-col leading-tight">
          <span className={titleClass}>CtrlChecks</span>
        </div>
      )}
    </Link>
  );
}
