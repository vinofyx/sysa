'use client';

import * as React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useMutation } from '@tanstack/react-query';
import { useLocale, useTranslations } from 'next-intl';
import { z } from 'zod';
import { Loader2, ShieldCheck, Zap } from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
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
import {
  initiateDonation,
  verifyDonationPayment,
  createSubscription,
  verifySubscription,
  ApiRequestError,
} from '@/lib/public-api';
import { cn } from '@/lib/utils';
import type { Appeal, DonationCategory } from '@/types/public';
import '@/types/razorpay';

/**
 * `ApiRequestError.status` is `undefined` only when the request never got a
 * response at all (network down, timeout, DNS failure, CORS) — every real
 * HTTP response, including 5xx, sets it. `0` marks an error thrown locally
 * before any request was made (e.g. the Razorpay script not loaded yet) —
 * its message is already ours and donor-facing, so it's trusted as-is. `429`
 * gets its own message because express-rate-limit's default handler replies
 * with plain text, not this API's `{error:{message}}` envelope, so there is
 * no useful backend message to surface for it. Every other status
 * (400/401/403/404/409/500/...) already carries a specific, donor-facing
 * message from the backend (donation-checkout.service.ts,
 * razorpay-order.service.ts) — trust it instead of re-deciding wording here
 * per status code.
 */
function getDonationErrorMessage(error: ApiRequestError, tForms: (key: string) => string): string {
  if (error.status === 0) return error.message || tForms('errorTitle');
  if (error.status === undefined) return tForms('errorNetwork');
  if (error.status === 429) return tForms('errorRateLimited');
  return error.message || tForms('errorTitle');
}

const PRESET_AMOUNTS = [500, 1000, 2500, 5000];

/** A donation category flagged this way lets the donor choose between a
 * one-time payment (existing Orders flow, unchanged) and an automatic
 * recurring mandate (Razorpay Subscriptions, subscription.service.ts). */
const MONTHLY_CATEGORY_CODE = 'MONTHLY_CONTRIBUTION';

const INDIAN_MOBILE_REGEX = /^[6-9]\d{9}$/;

function buildSchema(tForms: (key: string) => string) {
  return z.object({
    donorName: z.string().min(1, tForms('requiredError')).max(150),
    donorPhone: z.string().regex(INDIAN_MOBILE_REGEX, tForms('mobileInvalidError')),
    donorEmail: z.string().email(tForms('emailInvalidError')).optional().or(z.literal('')),
    // Both PAN and Aadhaar are mandatory (donor/tax reporting requirement).
    panNumber: z.string().regex(/^[A-Z]{5}[0-9]{4}[A-Z]$/, tForms('panInvalidError')),
    aadhaarNumber: z.string().regex(/^\d{12}$/, tForms('aadhaarInvalidError')),
    donorAddress: z.string().max(300).optional().or(z.literal('')),
    donorCity: z.string().max(100).optional().or(z.literal('')),
    donorPincode: z
      .string()
      .regex(/^\d{6}$/, tForms('pincodeInvalidError'))
      .optional()
      .or(z.literal('')),
    donorState: z.string().max(100).optional().or(z.literal('')),
    categoryId: z.string().min(1, tForms('requiredError')),
    amount: z.coerce.number().positive(tForms('positiveAmountError')),
    contributionType: z.enum(['one_time', 'automatic_monthly']),
  });
}

type FormValues = z.infer<ReturnType<typeof buildSchema>>;

/**
 * Mimics the look of Razorpay's own Payment Button (dark navy, bolt icon,
 * "Donate Now" / "Secured by Razorpay") without being that embed — this
 * button opens our own detail dialog below, not an iframe/hosted page, so
 * it needs its own markup rather than <RazorpayDonationButton>.
 */
function RazorpayStyleButton(props: React.ComponentProps<'button'>) {
  return (
    <button
      type="button"
      {...props}
      className={cn(
        'flex items-center gap-2 rounded-md bg-[#0a2540] px-4 py-2.5 text-left transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60',
        props.className,
      )}
    >
      <Zap className="size-4 shrink-0 fill-[#3395ff] text-[#3395ff]" />
      <span className="flex flex-col leading-tight">
        <span className="text-sm font-semibold text-white">Donate Now</span>
        <span className="text-[10px] text-white/60">Secured by Razorpay</span>
      </span>
    </button>
  );
}

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
  const locale = useLocale();
  const router = useRouter();
  const razorpayReady = useRazorpayScript();
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [selectedAppealId, setSelectedAppealId] = React.useState(defaultAppealId ?? '');
  const [subscriptionActivated, setSubscriptionActivated] = React.useState(false);
  const schema = React.useMemo(() => buildSchema(tForms), [tForms]);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      donorName: '',
      donorPhone: '',
      donorEmail: '',
      panNumber: '',
      aadhaarNumber: '',
      donorAddress: '',
      donorCity: '',
      donorPincode: '',
      donorState: '',
      categoryId: defaultCategoryId ?? categories[0]?.id ?? '',
      amount: PRESET_AMOUNTS[1],
      contributionType: 'one_time',
    },
  });

  const selectedCategoryId = form.watch('categoryId');
  const isMonthlyCategory = React.useMemo(
    () => categories.find((c) => c.id === selectedCategoryId)?.code === MONTHLY_CATEGORY_CODE,
    [categories, selectedCategoryId],
  );
  const contributionType = form.watch('contributionType');
  const isAutomaticMonthly = isMonthlyCategory && contributionType === 'automatic_monthly';

  const mutation = useMutation<void, ApiRequestError, FormValues>({
    mutationFn: async (values) => {
      const idempotencyKey =
        typeof crypto !== 'undefined' && 'randomUUID' in crypto
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

      const session = await initiateDonation({
        donorName: values.donorName,
        donorPhone: values.donorPhone,
        donorEmail: values.donorEmail || undefined,
        panNumber: values.panNumber,
        aadhaarNumber: values.aadhaarNumber,
        donorAddress: values.donorAddress || undefined,
        donorCity: values.donorCity || undefined,
        donorPincode: values.donorPincode || undefined,
        donorState: values.donorState || undefined,
        categoryId: values.categoryId,
        appealId: selectedAppealId || undefined,
        amount: values.amount,
        idempotencyKey,
      });

      if (!window.Razorpay) {
        throw new ApiRequestError(
          'Payment gateway is still loading. Please try again in a moment.',
          0,
        );
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
          email: values.donorEmail || undefined,
          contact: values.donorPhone,
        },
        theme: { color: '#1B6B3F' },
        // Verified here, client-side, immediately after Checkout returns —
        // rather than passing the raw order/payment/signature triple through
        // a URL (browser history, referrer headers, server logs) to a
        // separate page. Only the donation id + the already-designed-to-be-
        // shareable status token move on to the next page.
        handler: (response) => {
          if (!('razorpay_order_id' in response)) return;
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
      // Close our own details dialog first so Razorpay's modal (a real
      // Checkout overlay opened via the JS SDK — not an iframe/hosted page)
      // isn't sitting behind it.
      setDialogOpen(false);
      razorpay.open();
    },
  });

  /**
   * MONTHLY_CONTRIBUTION.automatic_monthly — a Razorpay Subscription mandate
   * instead of a one-time order (createSubscription/verifySubscription,
   * separate endpoints from the flow above, which is untouched). Success is
   * shown inline in this same dialog (no navigation) rather than a
   * `/donate/success`-style redirect: no Donation row exists yet at this
   * point — that's only created once the first recurring charge actually
   * lands via the `subscription.charged` webhook, at which point the
   * receipt is emailed/texted automatically.
   */
  const subscriptionMutation = useMutation<void, ApiRequestError, FormValues>({
    mutationFn: async (values) => {
      const session = await createSubscription({
        donorName: values.donorName,
        donorPhone: values.donorPhone,
        donorEmail: values.donorEmail || undefined,
        panNumber: values.panNumber,
        aadhaarNumber: values.aadhaarNumber,
        donorAddress: values.donorAddress || undefined,
        donorCity: values.donorCity || undefined,
        donorPincode: values.donorPincode || undefined,
        donorState: values.donorState || undefined,
        categoryId: values.categoryId,
        amount: values.amount,
      });

      if (!window.Razorpay) {
        throw new ApiRequestError(
          'Payment gateway is still loading. Please try again in a moment.',
          0,
        );
      }

      const razorpay = new window.Razorpay({
        key: session.keyId,
        name: 'Sai Yadadri Seva Ashram',
        description: `Monthly Contribution — ${t('categoriesHeading')}`,
        subscription_id: session.razorpaySubscriptionId,
        prefill: {
          name: values.donorName,
          email: values.donorEmail || undefined,
          contact: values.donorPhone,
        },
        theme: { color: '#1B6B3F' },
        handler: (response) => {
          if (!('razorpay_subscription_id' in response)) return;
          verifySubscription({
            subscriptionRecordId: session.subscriptionRecordId,
            razorpayPaymentId: response.razorpay_payment_id,
            razorpaySubscriptionId: response.razorpay_subscription_id,
            razorpaySignature: response.razorpay_signature,
          })
            .then(() => setSubscriptionActivated(true))
            .catch(() => setSubscriptionActivated(false));
        },
        modal: { ondismiss: () => {} },
      });
      razorpay.open();
    },
  });

  return (
    <>
      <div className="border-pub-neutral-200 bg-pub-neutral-white flex flex-col gap-4 rounded-xl border p-6">
        <h3 className="font-pub-heading text-pub-primary-900 dark:text-pub-neutral-900 flex items-center gap-2 text-base font-semibold">
          <ShieldCheck className="text-pub-primary-700 size-5" /> {t('onlineHeading')}
        </h3>
        <p className="text-pub-neutral-500 text-xs">{t('onlineBody')}</p>
        <p className="text-pub-neutral-500 text-xs">{t('razorpayButtonInstructions')}</p>

        <RazorpayStyleButton onClick={() => setDialogOpen(true)} disabled={!razorpayReady} />
      </div>

      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setSubscriptionActivated(false);
        }}
      >
        <DialogContent className="bg-pub-neutral-white max-w-md">
          {subscriptionActivated ? (
            <>
              <DialogHeader>
                <DialogTitle className="font-pub-heading text-pub-primary-900 dark:text-pub-neutral-900">
                  {t('subscriptionActivatedHeading')}
                </DialogTitle>
                <DialogDescription>{t('subscriptionActivatedBody')}</DialogDescription>
              </DialogHeader>
              <Button
                type="button"
                onClick={() => setDialogOpen(false)}
                className="bg-pub-primary-700 hover:bg-pub-primary-500 w-full"
              >
                {tForms('successTitle')}
              </Button>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle className="font-pub-heading text-pub-primary-900 dark:text-pub-neutral-900">
                  {t('onlineHeading')}
                </DialogTitle>
                <DialogDescription>{t('onlineBody')}</DialogDescription>
              </DialogHeader>

              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit((values) =>
                    isAutomaticMonthly
                      ? subscriptionMutation.mutate(values)
                      : mutation.mutate(values),
                  )}
                  className="flex flex-col gap-4"
                >
                  <FormField
                    control={form.control}
                    name="categoryId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('categoriesHeading')}</FormLabel>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger className="w-full">
                              {/* Base UI's `Select.Value` only knows an option's
                              label once its `Select.Item` has actually
                              mounted (the popup is lazy) — for a value that's
                              pre-selected before the donor ever opens the
                              dropdown (the default category), that leaves the
                              trigger showing the raw `field.value` (a UUID)
                              instead of a name. Passing a formatter function
                              looks the label up directly from `categories`
                              instead of relying on that registry. */}
                              <SelectValue placeholder={tForms('selectCategory')}>
                                {(value: string | null) => {
                                  const selected = categories.find((c) => c.id === value);
                                  if (!selected) return tForms('selectCategory');
                                  return locale === 'te' && selected.nameTe
                                    ? selected.nameTe
                                    : selected.nameEn;
                                }}
                              </SelectValue>
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {categories.map((category) => (
                              <SelectItem key={category.id} value={category.id}>
                                {locale === 'te' && category.nameTe
                                  ? category.nameTe
                                  : category.nameEn}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {isMonthlyCategory && (
                    <FormField
                      control={form.control}
                      name="contributionType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('contributionTypeHeading')}</FormLabel>
                          <div className="grid grid-cols-2 gap-2">
                            <button
                              type="button"
                              onClick={() => field.onChange('one_time')}
                              className={cn(
                                'rounded-lg border px-3 py-2 text-sm font-medium transition-colors',
                                field.value === 'one_time'
                                  ? 'border-pub-primary-700 bg-pub-primary-700 text-white'
                                  : 'border-pub-neutral-200 hover:bg-pub-neutral-100',
                              )}
                            >
                              {t('contributionTypeOneTime')}
                            </button>
                            <button
                              type="button"
                              onClick={() => field.onChange('automatic_monthly')}
                              className={cn(
                                'rounded-lg border px-3 py-2 text-sm font-medium transition-colors',
                                field.value === 'automatic_monthly'
                                  ? 'border-pub-primary-700 bg-pub-primary-700 text-white'
                                  : 'border-pub-neutral-200 hover:bg-pub-neutral-100',
                              )}
                            >
                              {t('contributionTypeAutomatic')}
                            </button>
                          </div>
                          {field.value === 'automatic_monthly' && (
                            <p className="text-pub-neutral-500 text-xs">
                              {t('contributionTypeAutomaticNote')}
                            </p>
                          )}
                        </FormItem>
                      )}
                    />
                  )}

                  {appeals.length > 0 && (
                    <div>
                      <label className="text-sm font-medium">
                        {t('appealsHeading')} ({tForms('optional')})
                      </label>
                      <Select
                        value={selectedAppealId || 'none'}
                        onValueChange={(v) => setSelectedAppealId(v === 'none' ? '' : (v ?? ''))}
                      >
                        <SelectTrigger className="mt-1.5 w-full">
                          <SelectValue>
                            {(value: string | null) => {
                              if (!value || value === 'none') return t('generalDonation');
                              const selected = appeals.find((a) => a.id === value);
                              if (!selected) return t('generalDonation');
                              return locale === 'te' && selected.titleTe
                                ? selected.titleTe
                                : selected.titleEn;
                            }}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">{t('generalDonation')}</SelectItem>
                          {appeals.map((appeal) => (
                            <SelectItem key={appeal.id} value={appeal.id}>
                              {locale === 'te' && appeal.titleTe ? appeal.titleTe : appeal.titleEn}
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
                            <Input {...field} autoComplete="name" />
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
                          <FormLabel>{tForms('mobile')}</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              autoComplete="tel"
                              inputMode="numeric"
                              maxLength={10}
                              placeholder={tForms('mobilePlaceholder')}
                            />
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
                          <FormLabel>
                            {tForms('email')} ({tForms('optional')})
                          </FormLabel>
                          <FormControl>
                            <Input type="email" {...field} autoComplete="email" />
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
                          <FormLabel>PAN</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              className="uppercase"
                              maxLength={10}
                              autoComplete="off"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="aadhaarNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{tForms('aadhaar')}</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              inputMode="numeric"
                              maxLength={12}
                              placeholder={tForms('aadhaarPlaceholder')}
                              autoComplete="off"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <p className="text-pub-neutral-500 -mt-2 text-xs">
                    {tForms('identityRequiredError')}
                  </p>

                  <FormField
                    control={form.control}
                    name="donorAddress"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          {tForms('address')} ({tForms('optional')})
                        </FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            autoComplete="street-address"
                            placeholder={tForms('addressPlaceholder')}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="grid grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name="donorCity"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            {tForms('city')} ({tForms('optional')})
                          </FormLabel>
                          <FormControl>
                            <Input {...field} autoComplete="address-level2" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="donorState"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            {tForms('state')} ({tForms('optional')})
                          </FormLabel>
                          <FormControl>
                            <Input {...field} autoComplete="address-level1" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="donorPincode"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            {tForms('pincode')} ({tForms('optional')})
                          </FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              autoComplete="postal-code"
                              inputMode="numeric"
                              maxLength={6}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <Button
                    type="submit"
                    disabled={
                      mutation.isPending || subscriptionMutation.isPending || !razorpayReady
                    }
                    className="bg-pub-primary-700 hover:bg-pub-primary-500 w-full"
                  >
                    {(mutation.isPending || subscriptionMutation.isPending) && (
                      <Loader2 className="animate-spin" />
                    )}
                    {mutation.isPending || subscriptionMutation.isPending
                      ? tForms('submitting')
                      : isAutomaticMonthly
                        ? t('authorizeMonthlyPayment')
                        : t('payNow')}
                  </Button>
                  {mutation.isError && (
                    <p className="text-pub-error text-sm">
                      {getDonationErrorMessage(mutation.error, tForms)}
                    </p>
                  )}
                  {subscriptionMutation.isError && (
                    <p className="text-pub-error text-sm">
                      {getDonationErrorMessage(subscriptionMutation.error, tForms)}
                    </p>
                  )}
                </form>
              </Form>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
