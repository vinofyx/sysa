'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useResetPassword } from '@/hooks/use-auth';
import type { ApiErrorBody } from '@/lib/api-client';

// Mirrors apps/api/src/config/constants.ts PASSWORD_COMPLEXITY_REGEX/PASSWORD_MIN_LENGTH —
// kept in sync manually since the two apps intentionally don't share a runtime dependency.
const passwordPolicyMessage =
  'At least 12 characters, including one uppercase letter, one lowercase letter, one number, and one special character.';
const passwordComplexityRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).+$/;

const resetPasswordSchema = z
  .object({
    newPassword: z
      .string()
      .min(12, passwordPolicyMessage)
      .regex(passwordComplexityRegex, passwordPolicyMessage),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type ResetPasswordValues = z.infer<typeof resetPasswordSchema>;

export default function ResetPasswordPage() {
  const { token } = useParams<{ token: string }>();
  const router = useRouter();
  const resetPassword = useResetPassword();

  const form = useForm<ResetPasswordValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { newPassword: '', confirmPassword: '' },
  });

  function onSubmit(values: ResetPasswordValues) {
    resetPassword.mutate(
      { token, newPassword: values.newPassword },
      {
        onSuccess: () => {
          toast.success('Password reset. Please sign in.');
          router.push('/login');
        },
        onError: (error) => {
          const body = error.response?.data as ApiErrorBody | undefined;
          toast.error(body?.error.message ?? 'This reset link is invalid or has expired.');
        },
      },
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Reset your password</CardTitle>
        <CardDescription>Choose a new password for your account.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
            <FormField
              control={form.control}
              name="newPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>New password</FormLabel>
                  <FormControl>
                    <Input type="password" autoComplete="new-password" {...field} />
                  </FormControl>
                  <FormDescription>{passwordPolicyMessage}</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Confirm new password</FormLabel>
                  <FormControl>
                    <Input type="password" autoComplete="new-password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full" disabled={resetPassword.isPending}>
              {resetPassword.isPending ? 'Resetting…' : 'Reset password'}
            </Button>
            <Link
              href="/login"
              className="text-muted-foreground block text-center text-sm hover:underline"
            >
              Back to sign in
            </Link>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
