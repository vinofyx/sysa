'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { LogOut, LogOutIcon, Settings, User } from 'lucide-react';
import { toast } from 'sonner';

import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useLogout, useLogoutAllDevices, useMe } from '@/hooks/use-auth';

function initials(name: string): string {
  return name
    .split(' ')
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export function ProfileMenu() {
  const { data: user } = useMe();
  const router = useRouter();
  const logout = useLogout();
  const logoutAll = useLogoutAllDevices();

  if (!user) return null;

  function handleLogout() {
    logout.mutate(undefined, {
      onSuccess: () => router.push('/login'),
    });
  }

  function handleLogoutAll() {
    logoutAll.mutate(undefined, {
      onSuccess: () => {
        toast.success('Logged out of all devices.');
        router.push('/login');
      },
    });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="ghost" className="h-11 gap-2 px-2 lg:h-8">
            <Avatar className="size-7">
              <AvatarFallback className="bg-admin-emerald-500/15 text-admin-emerald-500 text-xs font-semibold">
                {initials(user.name)}
              </AvatarFallback>
            </Avatar>
            <span className="hidden text-sm font-medium sm:inline">{user.name}</span>
          </Button>
        }
      />
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>
          <div className="flex flex-col">
            <span className="text-sm font-medium">{user.name}</span>
            <span className="text-muted-foreground text-xs font-normal">{user.email}</span>
            <span className="text-muted-foreground text-xs font-normal">{user.roleName}</span>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem render={<Link href="/admin/profile" />}>
          <User className="mr-2 size-4" /> Profile
        </DropdownMenuItem>
        <DropdownMenuItem render={<Link href="/admin/settings" />}>
          <Settings className="mr-2 size-4" /> Settings
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleLogout}>
          <LogOut className="mr-2 size-4" /> Log out
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleLogoutAll} variant="destructive">
          <LogOutIcon className="mr-2 size-4" /> Log out all devices
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
