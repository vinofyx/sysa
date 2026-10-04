'use client';

import * as React from 'react';

import { PageHeader } from '@/components/admin/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { usePermissionsCatalogue } from '@/hooks/use-roles';

export default function PermissionsPage() {
  const { data: permissions, isLoading } = usePermissionsCatalogue();

  const grouped = React.useMemo(() => {
    const groups = new Map<string, { id: string; code: string; description: string | null }[]>();
    for (const permission of permissions ?? []) {
      const [group] = permission.code.split(':');
      const list = groups.get(group) ?? [];
      list.push(permission);
      groups.set(group, list);
    }
    return Array.from(groups.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [permissions]);

  return (
    <div>
      <PageHeader
        title="Permissions"
        description="Read-only catalogue of every permission code in the system. Assign permissions to roles from the Roles page."
        breadcrumb={[{ label: 'Dashboard', href: '/admin' }, { label: 'Permissions' }]}
      />

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-40 w-full" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {grouped.map(([group, perms]) => (
            <Card key={group}>
              <CardHeader>
                <CardTitle className="text-sm font-semibold tracking-wide capitalize uppercase">
                  {group.replace(/_/g, ' ')}
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-2">
                {perms.map((permission) => (
                  <div key={permission.id} className="flex flex-col gap-0.5">
                    <Badge variant="outline" className="w-fit font-mono text-xs">
                      {permission.code}
                    </Badge>
                    {permission.description && (
                      <p className="text-muted-foreground text-xs">{permission.description}</p>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
