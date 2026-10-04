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
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { publicApiClient } from '@/lib/public-api';
import { isStaticExport } from '@/lib/static-mode';
import { StaticContactForm } from '@/components/public/static-contact-form';

interface ApiErrorBody {
  error: { code: string; message: string };
}

function buildSchema(tForms: (key: string) => string) {
  return z.object({
    name: z.string().min(1, tForms('requiredError')).max(150),
    email: z.string().email(tForms('emailInvalidError')),
    phone: z.string().max(20).optional().or(z.literal('')),
    message: z.string().min(1, tForms('requiredError')).max(2000),
  });
}

type FormValues = z.infer<ReturnType<typeof buildSchema>>;

export function ContactForm() {
  const t = useTranslations('Contact');
  const tForms = useTranslations('Forms');
  const tCommon = useTranslations('Common');
  const [submitted, setSubmitted] = React.useState(false);
  const schema = React.useMemo(() => buildSchema(tForms), [tForms]);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', email: '', phone: '', message: '' },
  });

  const mutation = useMutation<void, AxiosError<ApiErrorBody>, FormValues>({
    mutationFn: async (values) => {
      await publicApiClient.post('/contact', { ...values, phone: values.phone || undefined });
    },
    onSuccess: () => setSubmitted(true),
  });

  // Static export has no reachable SYSA backend for `/contact` — see the
  // matching comment in volunteer-form.tsx; `StaticContactForm` is fully
  // self-contained (own fields, validation, submission, success/error).
  if (isStaticExport) {
    return <StaticContactForm />;
  }

  if (submitted) {
    return (
      <div className="border-pub-primary-100 bg-pub-primary-100 flex flex-col items-center gap-3 rounded-xl border p-10 text-center">
        <CheckCircle2 className="text-pub-primary-700 size-10" />
        <p className="text-pub-primary-900 text-sm font-medium">{tForms('successTitle')}</p>
      </div>
    );
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit((values) => mutation.mutate(values))}
        className="flex flex-col gap-4"
      >
        <h3 className="font-pub-heading text-pub-primary-900 dark:text-pub-neutral-900 text-base font-semibold">
          {t('formHeading')}
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{tForms('name')}</FormLabel>
                <FormControl>
                  <Input {...field} placeholder={tForms('namePlaceholder')} />
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
                <FormLabel>{tForms('phone')}</FormLabel>
                <FormControl>
                  <Input {...field} placeholder={tForms('phonePlaceholder')} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{tForms('email')}</FormLabel>
              <FormControl>
                <Input type="email" {...field} placeholder={tForms('emailPlaceholder')} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="message"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{tForms('message')}</FormLabel>
              <FormControl>
                <Textarea {...field} rows={5} placeholder={tForms('messagePlaceholder')} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button
          type="submit"
          disabled={mutation.isPending}
          className="bg-pub-primary-700 hover:bg-pub-primary-500 w-fit"
        >
          {mutation.isPending && <Loader2 className="animate-spin" />}
          {mutation.isPending ? tForms('submitting') : tCommon('submit')}
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
