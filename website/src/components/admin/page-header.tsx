import type { BreadcrumbItem } from '@/components/shared/breadcrumb';
import { Breadcrumb } from '@/components/shared/breadcrumb';

interface PageHeaderProps {
  title: string;
  description?: string;
  breadcrumb?: BreadcrumbItem[];
  action?: React.ReactNode;
}

export function PageHeader({ title, description, breadcrumb, action }: PageHeaderProps) {
  return (
    <div className="mb-6 flex flex-col gap-2">
      {breadcrumb && <Breadcrumb items={breadcrumb} />}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          {description && <p className="text-muted-foreground text-sm">{description}</p>}
        </div>
        {action && <div className="flex items-center gap-2">{action}</div>}
      </div>
    </div>
  );
}
