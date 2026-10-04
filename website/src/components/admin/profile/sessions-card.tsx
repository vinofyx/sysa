'use client';

import { useRouter } from 'next/navigation';
import { Laptop, LogOut } from 'lucide-react';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { useLogoutAllDevices } from '@/hooks/use-auth';
import { useRevokeSession, useSessions } from '@/hooks/use-profile';

function formatDate(value: string): string {
  return new Date(value).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

/** "Login Session Management" + "Logout from All Devices" — see
 * documentation/06-Use-Cases.md and design/04-Admin-Flows.md. */
export function SessionsCard() {
  const { data: sessions, isLoading } = useSessions();
  const revokeSession = useRevokeSession();
  const logoutAll = useLogoutAllDevices();
  const router = useRouter();

  function handleLogoutAll() {
    logoutAll.mutate(undefined, {
      onSuccess: () => {
        toast.success('Logged out of all devices.');
        router.push('/login');
      },
    });
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle>Active sessions</CardTitle>
          <CardDescription>Devices currently signed in to your account.</CardDescription>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleLogoutAll}
          disabled={logoutAll.isPending}
        >
          <LogOut className="size-4" /> Log out all devices
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading && (
          <>
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
          </>
        )}

        {sessions?.map((session, index) => (
          <div key={session.id}>
            {index > 0 && <Separator className="mb-4" />}
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <Laptop className="text-muted-foreground mt-0.5 size-5 shrink-0" />
                <div className="text-sm">
                  <div className="flex items-center gap-2 font-medium">
                    {session.userAgent ?? 'Unknown device'}
                    {session.current && <Badge>This device</Badge>}
                  </div>
                  <p className="text-muted-foreground">
                    {session.ipAddress ?? 'Unknown IP'} &middot; Last active{' '}
                    {formatDate(session.lastUsedAt)}
                  </p>
                </div>
              </div>
              {!session.current && (
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={revokeSession.isPending}
                  onClick={() => revokeSession.mutate(session.id)}
                >
                  Sign out
                </Button>
              )}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
