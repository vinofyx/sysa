'use client';

import * as React from 'react';
import { useMutation } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Loader2, Mail } from 'lucide-react';
import type { AxiosError } from 'axios';

import { publicApiClient } from '@/lib/public-api';

interface ApiErrorBody {
  error: { code: string; message: string };
}

export function NewsletterForm({ className }: { className?: string }) {
  const t = useTranslations('Home');
  const tCommon = useTranslations('Common');
  const [email, setEmail] = React.useState('');

  const mutation = useMutation<void, AxiosError<ApiErrorBody>, string>({
    mutationFn: async (value) => {
      await publicApiClient.post('/contact/newsletter', { email: value });
    },
    onSuccess: () => {
      toast.success(t('newsletterHeading'));
      setEmail('');
    },
    onError: (error) => {
      toast.error(error.response?.data?.error?.message ?? 'Something went wrong');
    },
  });

  return (
    <form
      className={`flex w-full max-w-sm gap-2 ${className ?? ''}`}
      onSubmit={(event) => {
        event.preventDefault();
        if (email) mutation.mutate(email);
      }}
    >
      <div className="relative flex-1">
        <Mail className="text-pub-neutral-500 pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
        <input
          type="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder={t('newsletterPlaceholder')}
          className="border-pub-neutral-200 focus:border-pub-primary-700 h-10 w-full rounded-lg border bg-white pr-3 pl-9 text-sm text-black outline-none"
        />
      </div>
      <button
        type="submit"
        disabled={mutation.isPending}
        className="bg-pub-primary-700 hover:bg-pub-primary-500 inline-flex h-10 items-center gap-1.5 rounded-lg px-4 text-sm font-medium text-white transition-colors disabled:opacity-50"
      >
        {mutation.isPending && <Loader2 className="size-4 animate-spin" />}
        {tCommon('subscribe')}
      </button>
    </form>
  );
}
