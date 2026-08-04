'use client';

import * as React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useMutation } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { z } from 'zod';
import { Loader2, ShieldCheck } from 'lucide-react';
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
import { useRouter } from '@/i18n/navigation';
import { useRazorpayScript } from '@/hooks/use-razorpay-script';
import { initiateDonation, verifyDonationPayment } from '@/lib/public-api';
import { cn } from '@/lib/utils';
import type { Appeal, DonationCategory } from '@/types/public';
import '@/types/razorpay';

interface ApiErrorBody {
  error: { code: string; message: string };
}

const PRESET_AMOUNTS = [500, 1000, 2500, 5000];

const schema = z.object({
  donorName: z.string().min(1, 'Required').max(150),
  donorEmail: z.string().email('Valid email required'),
  donorPhone: z.string().max(20).optional().or(z.literal('')),
  panNumber: z.string().max(10).optional().or(z.literal('')),
  categoryId: z.string().min(1, 'Required'),
  amount: z.coerce.number().positive('Must be greater than 0'),
});

type FormValues = z.infer<typeof schema>;

export function DonationCheckoutForm({
  categories,
  appeals,
  defaultCategoryId,
  defaultAppealId,
}: {
  categories: DonationCategory[];
  appeals: Appeal[];
  defaultCategoryId?: string;
  defaultAppealId?: string;
}) {
  const t = useTranslations('Donate');
  const tForms = useTranslations('Forms');
  const router = useRouter();
  const razorpayReady = useRazorpayScript();
  const [selectedAppealId, setSelectedAppealId] = React.useState(defaultAppealId ?? '');

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      donorName: '',
      donorEmail: '',
      donorPhone: '',
      panNumber: '',
      categoryId: defaultCategoryId ?? categories[0]?.id ?? '',
      amount: PRESET_AMOUNTS[1],
    },
  });

  const mutation = useMutation<void, AxiosError<ApiErrorBody>, FormValues>({
    mutationFn: async (values) => {
      const idempotencyKey =
        typeof crypto !== 'undefined' && 'randomUUID' in crypto
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

      const session = await initiateDonation({
        donorName: values.donorName,
        donorEmail: values.donorEmail,
        donorPhone: values.donorPhone || undefined,
        panNumber: values.panNumber || undefined,
        categoryId: values.categoryId,
        appealId: selectedAppealId || undefined,
        amount: values.amount,
        idempotencyKey,
      });

      if (!window.Razorpay) {
        throw new Error('Payment gateway is still loading. Please try again in a moment.');
      }

      const razorpay = new window.Razorpay({
        key: session.keyId,
        amount: Math.round(session.amount * 100),
        currency: session.currency,
        name: 'Sai Yadadri Seva Ashram',
        description: t('categoriesHeading'),
        order_id: session.razorpayOrderId,
        prefill: {
          name: values.donorName,
          email: values.donorEmail,
          contact: values.donorPhone || undefined,
        },
        theme: { color: '#1B6B3F' },
        // Verified here, client-side, immediately after Checkout returns —
        // rather than passing the raw order/payment/signature triple through
        // a URL (browser history, referrer headers, server logs) to a
        // separate page. Only the donation id + the already-designed-to-be-
        // shareable status token move on to the next page.
        handler: (response) => {
          verifyDonationPayment({
            donationId: session.donationId,
            razorpayOrderId: response.razorpay_order_id,
            razorpayPaymentId: response.razorpay_payment_id,
            razorpaySignature: response.razorpay_signature,
          })
            .then(() => {
              router.push(
                `/donate/success?donationId=${session.donationId}&token=${session.statusToken}`,
              );
            })
            .catch(() => {
              router.push(
                `/donate/failure?donationId=${session.donationId}&token=${session.statusToken}`,
              );
            });
        },
        modal: {
          ondismiss: () => {
            router.push(
              `/donate/failure?donationId=${session.donationId}&token=${session.statusToken}`,
            );
          },
        },
      });
      razorpay.open();
    },
  });

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit((values) => mutation.mutate(values))}
        className="border-pub-neutral-200 flex flex-col gap-4 rounded-xl border bg-white p-6"
      >
        <h3 className="font-pub-heading text-pub-primary-900 flex items-center gap-2 text-base font-semibold">
          <ShieldCheck className="text-pub-primary-700 size-5" /> {t('onlineHeading')}
        </h3>
        <p className="text-pub-neutral-500 text-xs">{t('onlineBody')}</p>

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

        {appeals.length > 0 && (
          <div>
            <label className="text-sm font-medium">{t('appealsHeading')} (optional)</label>
            <Select
              value={selectedAppealId || 'none'}
              onValueChange={(v) => setSelectedAppealId(v === 'none' ? '' : (v ?? ''))}
            >
              <SelectTrigger className="mt-1.5 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">General donation</SelectItem>
                {appeals.map((appeal) => (
                  <SelectItem key={appeal.id} value={appeal.id}>
                    {appeal.titleEn}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <FormField
          control={form.control}
          name="amount"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('customAmount')} (₹)</FormLabel>
              <div className="mb-2 flex flex-wrap gap-2">
                {PRESET_AMOUNTS.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => field.onChange(preset)}
                    className={cn(
                      'rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors',
                      Number(field.value) === preset
                        ? 'border-pub-primary-700 bg-pub-primary-700 text-white'
                        : 'border-pub-neutral-200 hover:bg-pub-neutral-100',
                    )}
                  >
                    ₹{preset.toLocaleString('en-IN')}
                  </button>
                ))}
              </div>
              <FormControl>
                <Input type="number" min={1} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

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
            name="donorEmail"
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
        </div>
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="donorPhone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{tForms('phone')} (optional)</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="panNumber"
            render={({ field }) => (
              <FormItem>
                <FormLabel>PAN (optional)</FormLabel>
                <FormControl>
                  <Input {...field} className="uppercase" maxLength={10} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <Button
          type="submit"
          disabled={mutation.isPending || !razorpayReady}
          className="bg-pub-primary-700 hover:bg-pub-primary-500 w-full"
        >
          {mutation.isPending && <Loader2 className="animate-spin" />}
          {mutation.isPending ? tForms('submitting') : t('payNow')}
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
