import clsx from 'clsx';
import { Badge } from './shadcn-badge';

export default function PageHeader({ title, description, icon: Icon, badge, className, action, ...props }) {
  return (
    <header className={clsx('space-y-4 mb-6', className)} {...props}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          {Icon && (
            <div className="flex items-center justify-center rounded-lg bg-zinc-100 dark:bg-zinc-900 p-2.5 text-zinc-900 dark:text-zinc-100 shrink-0">
              <Icon className="h-5 w-5" />
            </div>
          )}
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100 truncate">
              {title}
            </h1>
            {badge && (
              <div className="mt-1.5">
                <Badge variant="secondary" className="text-xs">
                  {badge}
                </Badge>
              </div>
            )}
          </div>
        </div>
        {action && (
          <div className="flex items-center shrink-0">
            {action}
          </div>
        )}
      </div>
      {description && (
        <p className="text-sm text-zinc-500 dark:text-zinc-400 max-w-3xl leading-relaxed">
          {description}
        </p>
      )}
    </header>
  );
}