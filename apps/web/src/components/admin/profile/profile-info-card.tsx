'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useProfile, useUpdateProfile } from '@/hooks/use-profile';
import type { ApiErrorBody } from '@/lib/api-client';

const profileSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(120),
});

type ProfileValues = z.infer<typeof profileSchema>;

export function ProfileInfoCard() {
  const { data: profile, isLoading } = useProfile();
  const updateProfile = useUpdateProfile();

  const form = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: { name: '' },
  });

  useEffect(() => {
    if (profile) form.reset({ name: profile.name });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile]);

  function onSubmit(values: ProfileValues) {
    updateProfile.mutate(values, {
      onSuccess: () => toast.success('Profile updated.'),
      onError: (error) => {
        const body = error.response?.data as ApiErrorBody | undefined;
        toast.error(body?.error.message ?? 'Failed to update profile.');
      },
    });
  }

  if (isLoading || !profile) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Profile</CardTitle>
        <CardDescription>Your account details.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full name</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid gap-1.5">
              <span className="text-sm font-medium">Email</span>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground text-sm">{profile.email}</span>
                <Badge variant={profile.emailVerified ? 'default' : 'secondary'}>
                  {profile.emailVerified ? 'Verified' : 'Unverified'}
                </Badge>
              </div>
            </div>

            <div className="grid gap-1.5">
              <span className="text-sm font-medium">Role</span>
              <span className="text-muted-foreground text-sm">{profile.roleName}</span>
            </div>

            <Button type="submit" disabled={updateProfile.isPending}>
              {updateProfile.isPending ? 'Saving…' : 'Save changes'}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
