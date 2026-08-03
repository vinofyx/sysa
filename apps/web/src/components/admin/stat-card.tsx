import type { LucideIcon } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

interface StatCardProps {
  label: string;
  value?: string | number;
  icon: LucideIcon;
  isLoading?: boolean;
  comingSoon?: boolean;
}

/** A single KPI tile — see design/09-Admin-Modules.md §4 "KPI Tile Row". */
export function StatCard({ label, value, icon: Icon, isLoading, comingSoon }: StatCardProps) {
  return (
    <Card className={comingSoon ? 'opacity-60' : undefined}>
      <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
        <CardTitle className="text-muted-foreground text-sm font-medium">{label}</CardTitle>
        <Icon className="text-muted-foreground size-4" />
      </CardHeader>
      <CardContent>
        {comingSoon ? (
          <Badge variant="secondary">Coming soon</Badge>
        ) : isLoading ? (
          <Skeleton className="h-8 w-16" />
        ) : (
          <p className="text-2xl font-semibold tracking-tight">{value}</p>
        )}
      </CardContent>
    </Card>
  );
}
