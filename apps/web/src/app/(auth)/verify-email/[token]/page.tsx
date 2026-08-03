'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { CheckCircle2, Loader2, XCircle } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useVerifyEmail } from '@/hooks/use-auth';
import type { ApiErrorBody } from '@/lib/api-client';

export default function VerifyEmailPage() {
  const { token } = useParams<{ token: string }>();
  const verifyEmail = useVerifyEmail();
  const hasTriggered = useRef(false);

  useEffect(() => {
    if (hasTriggered.current) return;
    hasTriggered.current = true;
    verifyEmail.mutate({ token });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const errorMessage = (verifyEmail.error?.response?.data as ApiErrorBody | undefined)?.error
    .message;

  return (
    <Card>
      <CardHeader className="items-center text-center">
        {verifyEmail.isPending && (
          <Loader2 className="text-muted-foreground mb-2 size-8 animate-spin" />
        )}
        {verifyEmail.isSuccess && <CheckCircle2 className="mb-2 size-8 text-green-600" />}
        {verifyEmail.isError && <XCircle className="text-destructive mb-2 size-8" />}

        <CardTitle>
          {verifyEmail.isPending && 'Verifying your email…'}
          {verifyEmail.isSuccess && 'Email verified'}
          {verifyEmail.isError && 'Verification failed'}
        </CardTitle>
        <CardDescription>
          {verifyEmail.isSuccess && 'You can now log in to your account.'}
          {verifyEmail.isError &&
            (errorMessage ?? 'This verification link is invalid or has expired.')}
        </CardDescription>
      </CardHeader>
      {!verifyEmail.isPending && (
        <CardContent>
          <Button render={<Link href="/login" />} className="w-full">
            Go to sign in
          </Button>
        </CardContent>
      )}
    </Card>
  );
}
