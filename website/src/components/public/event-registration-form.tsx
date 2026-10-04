'use client';

import * as React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useMutation } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { z } from 'zod';
import { CheckCircle2, Loader2 } from 'lucide-react';
import type { AxiosError } from 'axios';

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { publicApiClient } from '@/lib/public-api';
import { isStaticExport } from '@/lib/static-mode';
import { StaticFormUnavailable } from '@/components/public/static-form-unavailable';

interface ApiErrorBody {
  error: { code: string; message: string };
}

function buildSchema(tForms: (key: string) => string) {
  return z.object({
    name: z.string().min(1, tForms('requiredError')).max(150),
    email: z.string().email(tForms('emailInvalidError')),
    phone: z.string().max(20).optional().or(z.literal('')),
  });
}

type FormValues = z.infer<ReturnType<typeof buildSchema>>;

export function EventRegistrationForm({
  eventId,
  capacityFull,
}: {
  eventId: string;
  capacityFull: boolean;
}) {
  const t = useTranslations('Events');
  const tForms = useTranslations('Forms');
  const [submitted, setSubmitted] = React.useState(false);
  const schema = React.useMemo(() => buildSchema(tForms), [tForms]);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', email: '', phone: '' },
  });

  const mutation = useMutation<void, AxiosError<ApiErrorBody>, FormValues>({
    mutationFn: async (values) => {
      await publicApiClient.post('/event-registrations/public', {
        ...values,
        eventId,
        phone: values.phone || undefined,
      });
    },
    onSuccess: () => setSubmitted(true),
  });

  if (submitted) {
    return (
      <div className="border-pub-primary-100 bg-pub-primary-100 flex flex-col items-center gap-2 rounded-xl border p-6 text-center">
        <CheckCircle2 className="text-pub-primary-700 size-8" />
        <p className="text-pub-primary-900 text-sm font-medium">{t('successMessage')}</p>
      </div>
    );
  }

  if (isStaticExport) {
    return (
      <StaticFormUnavailable
        title={t('registerForEvent')}
        message={t('formUnavailable')}
        cta={{ label: t('contactUsCta'), href: '/contact' }}
      />
    );
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit((values) => mutation.mutate(values))}
        className="border-pub-neutral-200 bg-pub-neutral-white flex flex-col gap-4 rounded-xl border p-6"
      >
        <h3 className="font-pub-heading text-pub-primary-900 dark:text-pub-neutral-900 text-base font-semibold">
          {t('registerForEvent')}
        </h3>
        {capacityFull && <p className="text-pub-gold-700 text-xs">{t('capacityFull')}</p>}
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{tForms('name')}</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{tForms('email')}</FormLabel>
              <FormControl>
                <Input type="email" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="phone"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{tForms('phone')} </FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button
          type="submit"
          disabled={mutation.isPending}
          className="bg-pub-primary-700 hover:bg-pub-primary-500"
        >
          {mutation.isPending && <Loader2 className="animate-spin" />}
          {mutation.isPending ? tForms('submitting') : t('registerForEvent')}
        </Button>
        {mutation.isError && (
          <p className="text-pub-error text-sm">
            {mutation.error.response?.data?.error?.message ?? tForms('errorTitle')}
          </p>
        )}
      </form>
    </Form>
  );
}
