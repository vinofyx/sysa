'use client';

import * as React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useTranslations } from 'next-intl';
import { z } from 'zod';

import { VOLUNTEER_FORM_ENDPOINT } from '@/lib/form-config';
import {
  Honeypot,
  PremiumFieldError,
  PremiumFormCard,
  PremiumInput,
  PremiumLabel,
  PremiumSelect,
  PremiumStatusBanner,
  PremiumSubmitButton,
  PremiumTextarea,
} from '@/components/public/premium-form-fields';

/** Loose but real Indian mobile check: optional +91/0 prefix, then a
 * 10-digit number starting 6-9 (the valid first-digit range for Indian
 * mobile numbers) — rejects obvious junk without being so strict it blocks
 * legitimate formatting variations (spaces, hyphens). */
const INDIAN_PHONE_REGEX = /^(?:\+91[-\s]?|0)?[6-9]\d{9}$/;

const VOLUNTEER_AREA_KEYS = [
  'elderlyCare',
  'annaprasadam',
  'education',
  'goshala',
  'events',
  'digital',
  'fundraising',
  'general',
] as const;

const AVAILABILITY_KEYS = ['weekdays', 'weekends', 'both', 'occasional'] as const;

type Status = 'idle' | 'submitting' | 'success' | 'error';

/** Name/target pairing for the hidden iframe-transport form below — must
 * match exactly, since that's how the browser knows where to route the
 * native POST's response (which this component never reads). */
const IFRAME_NAME = 'volunteerSubmissionFrame';

/** Safety-net timeout in case the transport iframe's `load` event never
 * fires (e.g. blocked by an extension). Measured round-trip against the
 * live Apps Script endpoint was ~1.4s, and `doPost` can additionally wait
 * up to 10s on `LockService.waitLock` under concurrent submissions — a
 * short fixed delay here previously unmounted the iframe (and aborted the
 * in-flight POST) before slower submissions had actually completed. The
 * primary success signal is the iframe's `load` event below; this is only
 * the fallback. */
const FALLBACK_DELAY_MS = 15000;

/**
 * The static-export replacement for the "backend unavailable" placeholder
 * on `/volunteer/` — a fully working form that submits to the client's
 * Google Apps Script Web App (see `lib/form-config.ts`), which appends rows
 * to their "Volunteer List" Google Sheet. Field set is intentionally
 * different from `VolunteerForm`'s live-backend version (city/availability
 * instead of a volunteer/internship type toggle + resume upload) per the
 * brief for this static-hosting-specific form.
 *
 * Submission deliberately does NOT use fetch(): confirmed directly against
 * the live endpoint that its /exec response has no CORS headers, so a
 * fetch() call can never read a status or JSON body from it — Chrome
 * reports "blocked by CORS policy: No 'Access-Control-Allow-Origin' header
 * is present" on every attempt, regardless of how the request is shaped.
 * Instead, validated values are copied into a second, hidden native
 * `<form>` (below, outside the visible RHF-controlled one — forms can't
 * nest) that POSTs into a hidden `<iframe>`. A real browser form submission
 * doesn't require reading the cross-origin response at all, so it isn't
 * subject to this restriction; the tradeoff (spelled out in the delay
 * constant above) is that this component genuinely cannot confirm the
 * Apps Script accepted the row — only that the browser sent the request.
 */
export function StaticVolunteerForm() {
  const t = useTranslations('Volunteer.staticForm');
  const [status, setStatus] = React.useState<Status>('idle');
  const transportFormRef = React.useRef<HTMLFormElement>(null);
  const nameFieldRef = React.useRef<HTMLInputElement>(null);
  const emailFieldRef = React.useRef<HTMLInputElement>(null);
  const phoneFieldRef = React.useRef<HTMLInputElement>(null);
  const cityFieldRef = React.useRef<HTMLInputElement>(null);
  const interestFieldRef = React.useRef<HTMLInputElement>(null);
  const availabilityFieldRef = React.useRef<HTMLInputElement>(null);
  const messageFieldRef = React.useRef<HTMLInputElement>(null);
  const websiteFieldRef = React.useRef<HTMLInputElement>(null);
  // Guards the iframe's `load` handler from firing on its initial (blank)
  // mount — only a load that happens after we've actually submitted counts.
  const hasSubmittedRef = React.useRef(false);
  const fallbackTimerRef = React.useRef<number | null>(null);

  React.useEffect(() => {
    return () => {
      if (fallbackTimerRef.current !== null) window.clearTimeout(fallbackTimerRef.current);
    };
  }, []);

  const schema = z.object({
    fullName: z.string().trim().min(2, t('fullNameError')),
    email: z.string().trim().min(1, t('emailRequiredError')).email(t('emailInvalidError')),
    phone: z
      .string()
      .trim()
      .min(1, t('phoneRequiredError'))
      .regex(INDIAN_PHONE_REGEX, t('phoneInvalidError')),
    city: z.string().trim().min(1, t('cityError')),
    volunteerArea: z.string().min(1, t('volunteerAreaError')),
    availability: z.string().min(1, t('availabilityError')),
    message: z.string().trim().max(2000).optional().or(z.literal('')),
  });

  type FormValues = z.infer<typeof schema>;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      fullName: '',
      email: '',
      phone: '',
      city: '',
      volunteerArea: '',
      availability: '',
      message: '',
    },
  });

  // Fires once, whichever comes first: the transport iframe's `load` event
  // (the real submission completing its round trip) or the fallback timer.
  function completeSubmission() {
    if (!hasSubmittedRef.current) return; // Already completed (or never started).
    hasSubmittedRef.current = false;
    if (fallbackTimerRef.current !== null) {
      window.clearTimeout(fallbackTimerRef.current);
      fallbackTimerRef.current = null;
    }
    setStatus('success');
    reset();
  }

  function onSubmit(values: FormValues, event?: React.BaseSyntheticEvent) {
    if (status === 'submitting') return; // Extra guard against double-submit.

    const honeypot = (event?.target as HTMLFormElement | undefined)?._gotcha?.value ?? '';
    if (honeypot) return; // Silently drop bot submissions — no error shown either way.

    if (!VOLUNTEER_FORM_ENDPOINT) {
      if (process.env.NODE_ENV === 'development') {
        console.warn(
          '[StaticVolunteerForm] NEXT_PUBLIC_VOLUNTEER_FORM_ENDPOINT is not set — see lib/form-config.ts. Submissions will show the normal error state until it is configured.',
        );
      }
      setStatus('error');
      return;
    }

    setStatus('submitting');
    try {
      // Apps Script parameter names (name/email/phone/city/interest/
      // availability/message/website) are fixed by the deployed script, not
      // the same as this form's own field names — see lib/form-config.ts
      // for why this goes through a hidden form+iframe instead of fetch().
      if (!nameFieldRef.current) throw new Error('Transport form is not mounted');
      nameFieldRef.current.value = values.fullName;
      emailFieldRef.current!.value = values.email;
      phoneFieldRef.current!.value = values.phone;
      cityFieldRef.current!.value = values.city;
      interestFieldRef.current!.value = values.volunteerArea;
      availabilityFieldRef.current!.value = values.availability;
      messageFieldRef.current!.value = values.message || '';
      websiteFieldRef.current!.value = honeypot;

      hasSubmittedRef.current = true;
      transportFormRef.current!.submit();

      fallbackTimerRef.current = window.setTimeout(completeSubmission, FALLBACK_DELAY_MS);
    } catch {
      // The browser couldn't even initiate the POST (e.g. the transport
      // form somehow isn't mounted) — a genuine client-side failure, not
      // just "can't read the response," so the error state is honest here.
      setStatus('error');
    }
  }

  if (status === 'success') {
    return (
      <PremiumFormCard>
        <PremiumStatusBanner
          tone="success"
          title={t('successTitle')}
          message={t('successMessage')}
        />
      </PremiumFormCard>
    );
  }

  return (
    <PremiumFormCard>
      <div className="mb-6">
        <h2 className="font-pub-heading text-pub-primary-900 dark:text-pub-neutral-900 text-xl font-semibold sm:text-2xl">
          {t('title')}
        </h2>
        <p className="text-pub-neutral-500 mt-1.5 text-sm">{t('subtitle')}</p>
      </div>

      {/* Iframe-transport POST target — a separate native form, since the
          visible RHF-controlled form below can't be nested inside another
          form. Never read from (cross-origin body is inaccessible); its
          `load` event firing is only used as a completion signal — see
          `completeSubmission` above. The initial (blank) mount also fires
          `load`, but `hasSubmittedRef` guards against that counting. */}
      <iframe
        title="Volunteer application submission target"
        name={IFRAME_NAME}
        onLoad={completeSubmission}
        className="hidden"
        aria-hidden="true"
        tabIndex={-1}
      />
      <form
        ref={transportFormRef}
        action={VOLUNTEER_FORM_ENDPOINT ?? undefined}
        method="POST"
        target={IFRAME_NAME}
        encType="application/x-www-form-urlencoded"
        className="hidden"
        aria-hidden="true"
      >
        <input ref={nameFieldRef} type="hidden" name="name" />
        <input ref={emailFieldRef} type="hidden" name="email" />
        <input ref={phoneFieldRef} type="hidden" name="phone" />
        <input ref={cityFieldRef} type="hidden" name="city" />
        <input ref={interestFieldRef} type="hidden" name="interest" />
        <input ref={availabilityFieldRef} type="hidden" name="availability" />
        <input ref={messageFieldRef} type="hidden" name="message" />
        <input ref={websiteFieldRef} type="hidden" name="website" />
      </form>

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-5">
        <Honeypot />

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div>
            <PremiumLabel htmlFor="v-fullName" required>
              {t('fullNameLabel')}
            </PremiumLabel>
            <PremiumInput
              id="v-fullName"
              autoComplete="name"
              placeholder={t('fullNamePlaceholder')}
              aria-invalid={!!errors.fullName}
              aria-describedby={errors.fullName ? 'v-fullName-error' : undefined}
              {...register('fullName')}
            />
            <PremiumFieldError id="v-fullName-error" message={errors.fullName?.message} />
          </div>

          <div>
            <PremiumLabel htmlFor="v-email" required>
              {t('emailLabel')}
            </PremiumLabel>
            <PremiumInput
              id="v-email"
              type="email"
              autoComplete="email"
              placeholder={t('emailPlaceholder')}
              aria-invalid={!!errors.email}
              aria-describedby={errors.email ? 'v-email-error' : undefined}
              {...register('email')}
            />
            <PremiumFieldError id="v-email-error" message={errors.email?.message} />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div>
            <PremiumLabel htmlFor="v-phone" required>
              {t('phoneLabel')}
            </PremiumLabel>
            <PremiumInput
              id="v-phone"
              type="tel"
              autoComplete="tel"
              placeholder={t('phonePlaceholder')}
              aria-invalid={!!errors.phone}
              aria-describedby={errors.phone ? 'v-phone-error' : undefined}
              {...register('phone')}
            />
            <PremiumFieldError id="v-phone-error" message={errors.phone?.message} />
          </div>

          <div>
            <PremiumLabel htmlFor="v-city" required>
              {t('cityLabel')}
            </PremiumLabel>
            <PremiumInput
              id="v-city"
              autoComplete="address-level2"
              placeholder={t('cityPlaceholder')}
              aria-invalid={!!errors.city}
              aria-describedby={errors.city ? 'v-city-error' : undefined}
              {...register('city')}
            />
            <PremiumFieldError id="v-city-error" message={errors.city?.message} />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div>
            <PremiumLabel htmlFor="v-volunteerArea" required>
              {t('volunteerAreaLabel')}
            </PremiumLabel>
            <PremiumSelect
              id="v-volunteerArea"
              placeholder={t('volunteerAreaPlaceholder')}
              aria-invalid={!!errors.volunteerArea}
              aria-describedby={errors.volunteerArea ? 'v-volunteerArea-error' : undefined}
              {...register('volunteerArea')}
            >
              {VOLUNTEER_AREA_KEYS.map((key) => (
                <option key={key} value={key}>
                  {t(`areaOptions.${key}`)}
                </option>
              ))}
            </PremiumSelect>
            <PremiumFieldError id="v-volunteerArea-error" message={errors.volunteerArea?.message} />
          </div>

          <div>
            <PremiumLabel htmlFor="v-availability" required>
              {t('availabilityLabel')}
            </PremiumLabel>
            <PremiumSelect
              id="v-availability"
              placeholder={t('availabilityPlaceholder')}
              aria-invalid={!!errors.availability}
              aria-describedby={errors.availability ? 'v-availability-error' : undefined}
              {...register('availability')}
            >
              {AVAILABILITY_KEYS.map((key) => (
                <option key={key} value={key}>
                  {t(`availabilityOptions.${key}`)}
                </option>
              ))}
            </PremiumSelect>
            <PremiumFieldError id="v-availability-error" message={errors.availability?.message} />
          </div>
        </div>

        <div>
          <PremiumLabel htmlFor="v-message">{t('messageLabel')}</PremiumLabel>
          <PremiumTextarea
            id="v-message"
            placeholder={t('messagePlaceholder')}
            rows={4}
            {...register('message')}
          />
        </div>

        {status === 'error' && (
          <PremiumStatusBanner tone="error" title={t('errorTitle')} message={t('errorMessage')} />
        )}

        <PremiumSubmitButton pending={status === 'submitting'} pendingText={t('submittingButton')}>
          {t('submitButton')}
        </PremiumSubmitButton>
      </form>
    </PremiumFormCard>
  );
}
