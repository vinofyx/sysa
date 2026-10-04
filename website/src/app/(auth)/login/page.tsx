'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

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
import { useLogin, useResendVerification } from '@/hooks/use-auth';
import type { ApiErrorBody } from '@/lib/api-client';

const loginSchema = z.object({
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

type LoginValues = z.infer<typeof loginSchema>;

// `useSearchParams()` (below, to read `?redirect=`) opts this page out of static
// prerendering unless wrapped in Suspense — see
// https://nextjs.org/docs/messages/missing-suspense-with-csr-bailout
export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const login = useLogin();
  const resendVerification = useResendVerification();

  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const unverifiedEmail = form.getValues('email');

  function onSubmit(values: LoginValues) {
    login.mutate(values, {
      onSuccess: () => {
        const redirectTo = searchParams.get('redirect') || '/admin';
        router.push(redirectTo);
      },
      onError: (error) => {
        const body = error.response?.data as ApiErrorBody | undefined;
        toast.error(body?.error.message ?? 'Login failed. Please try again.');
      },
    });
  }

  const isUnverified =
    login.error?.response?.data?.error.code === 'FORBIDDEN' &&
    login.error.response.data.error.message.toLowerCase().includes('verify');

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sign in</CardTitle>
        <CardDescription>Use your admin account to access the dashboard.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      autoComplete="email"
                      placeholder="you@example.org"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center justify-between">
                    <FormLabel>Password</FormLabel>
                    <Link
                      href="/forgot-password"
                      className="text-muted-foreground text-xs hover:underline"
                    >
                      Forgot password?
                    </Link>
                  </div>
                  <FormControl>
                    <Input type="password" autoComplete="current-password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {isUnverified && (
              <div className="bg-warning/10 text-foreground rounded-md border p-3 text-sm">
                Please verify your email before logging in.{' '}
                <button
                  type="button"
                  className="font-medium underline"
                  disabled={resendVerification.isPending}
                  onClick={() =>
                    resendVerification.mutate(
                      { email: unverifiedEmail },
                      {
                        onSuccess: () =>
                          toast.success(
                            'If that account exists, a verification email has been sent.',
                          ),
                      },
                    )
                  }
                >
                  Resend verification email
                </button>
              </div>
            )}

            <Button type="submit" className="w-full" disabled={login.isPending}>
              {login.isPending ? 'Signing in…' : 'Sign in'}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
