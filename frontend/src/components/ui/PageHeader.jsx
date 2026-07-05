import clsx from 'clsx';
import { Badge } from './shadcn-badge';

export default function PageHeader({ title, description, icon: Icon, badge, className, action, ...props }) {
  return (
    <header className={clsx('space-y-4', className)} {...props}>
      {action && (
        <div className="flex justify-end">
          {action}
        </div>
      )}
      <div className="flex items-center gap-3">
        <div className="rounded-full bg-slate-100 p-2 text-slate-900">
          {Icon && <Icon className="h-6 w-6" />}
        </div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">{title}</h1>
          {badge && <Badge className="ml-2 mt-1">{badge}</Badge>}
        </div>
      </div>
      {description && <p className="text-sm text-slate-500">{description}</p>}
    </header>
  );
}