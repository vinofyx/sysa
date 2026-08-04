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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { publicApiClient } from '@/lib/public-api';
import type { DonationCategory } from '@/types/public';

interface ApiErrorBody {
  error: { code: string; message: string };
}

const schema = z.object({
  donorName: z.string().min(1, 'Required').max(150),
  donorEmail: z.string().email('Valid email required').optional().or(z.literal('')),
  donorPhone: z.string().max(20).optional().or(z.literal('')),
  categoryId: z.string().min(1, 'Required'),
  amount: z.coerce.number().positive('Must be greater than 0'),
  bankReferenceUtr: z.string().max(100).optional().or(z.literal('')),
});

type FormValues = z.infer<typeof schema>;

export function BankTransferClaimForm({
  categories,
  defaultCategoryId,
}: {
  categories: DonationCategory[];
  defaultCategoryId?: string;
}) {
  const t = useTranslations('Donate');
  const tForms = useTranslations('Forms');
  const [submitted, setSubmitted] = React.useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      donorName: '',
      donorEmail: '',
      donorPhone: '',
      categoryId: defaultCategoryId ?? '',
      amount: 0,
      bankReferenceUtr: '',
    },
  });

  const mutation = useMutation<void, AxiosError<ApiErrorBody>, FormValues>({
    mutationFn: async (values) => {
      await publicApiClient.post('/bank-transfers/public', {
        ...values,
        donorEmail: values.donorEmail || undefined,
        donorPhone: values.donorPhone || undefined,
        bankReferenceUtr: values.bankReferenceUtr || undefined,
      });
    },
    onSuccess: () => setSubmitted(true),
  });

  if (submitted) {
    return (
      <div className="border-pub-primary-100 bg-pub-primary-100 flex flex-col items-center gap-2 rounded-xl border p-6 text-center">
        <CheckCircle2 className="text-pub-primary-700 size-8" />
        <p className="text-pub-primary-900 text-sm font-medium">
          Thank you — our Finance team will verify this and email your receipt.
        </p>
      </div>
    );
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit((values) => mutation.mutate(values))}
        className="border-pub-neutral-200 flex flex-col gap-4 rounded-xl border bg-white p-6"
      >
        <h3 className="font-pub-heading text-pub-primary-900 text-base font-semibold">
          {t('claimTransfer')}
        </h3>
        <p className="text-pub-neutral-500 text-xs">{t('claimTransferBody')}</p>
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="donorName"
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
            name="amount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Amount (₹)</FormLabel>
                <FormControl>
                  <Input type="number" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="donorEmail"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{tForms('email')} (optional)</FormLabel>
                <FormControl>
                  <Input type="email" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="donorPhone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{tForms('phone')}</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <FormField
          control={form.control}
          name="categoryId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('categoriesHeading')}</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.nameEn}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="bankReferenceUtr"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Bank reference / UTR number (optional)</FormLabel>
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
          className="bg-pub-primary-700 hover:bg-pub-primary-500 w-fit"
        >
          {mutation.isPending && <Loader2 className="animate-spin" />}
          {mutation.isPending ? tForms('submitting') : t('claimTransfer')}
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
