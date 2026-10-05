'use client';

import * as React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useTranslations } from 'next-intl';
import { z } from 'zod';

import { CONTACT_FORM_ENDPOINT } from '@/lib/form-config';
import {
  Honeypot,
  PremiumFieldError,
  PremiumFormCard,
  PremiumInput,
  PremiumLabel,
  PremiumStatusBanner,
  PremiumSubmitButton,
  PremiumTextarea,
} from '@/components/public/premium-form-fields';

const INDIAN_PHONE_REGEX = /^(?:\+91[-\s]?|0)?[6-9]\d{9}$/;

type Status = 'idle' | 'submitting' | 'success' | 'error';

/** Name/target pairing for the hidden iframe-transport form below — must
 * match exactly, since that's how the browser knows where to route the
 * native POST's response (which this component never reads). */
const IFRAME_NAME = 'contactSubmissionFrame';

/** Safety-net timeout in case the transport iframe's `load` event never
 * fires (e.g. blocked by an extension) — see the matching constant in
 * static-volunteer-form.tsx for why a short fixed delay is unsafe here:
 * it would unmount the iframe (aborting the in-flight POST) before a
 * slower round trip actually completes. */
const FALLBACK_DELAY_MS = 15000;

/**
 * The static-export replacement for the "backend unavailable" placeholder
 * on `/contact/` — a fully working form that submits to the client's
 * Google Apps Script Web App (see `lib/form-config.ts`), which appends
 * rows to their "Contact Form" Google Sheet. Field set adds `subject` (not
 * present on the live-backend `ContactForm`) per the brief for this
 * static-hosting-specific form.
 *
 * Submission deliberately does NOT use fetch(): the Apps Script /exec
 * response has no CORS headers, so fetch() can never read a status/JSON
 * body from it (confirmed against the sibling volunteer endpoint — same
 * Apps Script platform, same constraint). Instead, validated values are
 * copied into a hidden native `<form>` that POSTs into a hidden `<iframe>`,
 * matching `static-volunteer-form.tsx` exactly — see that file's doc
 * comment for the full rationale.
 */
export function StaticContactForm() {
  const t = useTranslations('Contact.staticForm');
  const tContact = useTranslations('Contact');
  const [status, setStatus] = React.useState<Status>('idle');
  const transportFormRef = React.useRef<HTMLFormElement>(null);
  const fullNameFieldRef = React.useRef<HTMLInputElement>(null);
  const emailFieldRef = React.useRef<HTMLInputElement>(null);
  const phoneFieldRef = React.useRef<HTMLInputElement>(null);
  const subjectFieldRef = React.useRef<HTMLInputElement>(null);
  const messageFieldRef = React.useRef<HTMLInputElement>(null);
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
      .regex(INDIAN_PHONE_REGEX, t('phoneInvalidError'))
      .optional()
      .or(z.literal('')),
    subject: z.string().trim().min(1, t('subjectError')),
    message: z.string().trim().min(10, t('messageError')),
  });

  type FormValues = z.infer<typeof schema>;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { fullName: '', email: '', phone: '', subject: '', message: '' },
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

    const honeypot = (event?.target as HTMLFormElement | undefined)?._gotcha?.value;
    if (honeypot) return; // Silently drop bot submissions — no error shown either way.

    if (!CONTACT_FORM_ENDPOINT) {
      if (process.env.NODE_ENV === 'development') {
        console.warn(
          '[StaticContactForm] NEXT_PUBLIC_CONTACT_FORM_ENDPOINT is not set — see lib/form-config.ts. Submissions will show the normal error state until it is configured.',
        );
      }
      setStatus('error');
      return;
    }

    setStatus('submitting');
    try {
      // Apps Script parameter names (fullName/email/phone/subject/message)
      // are fixed by the deployed script — see lib/form-config.ts for why
      // this goes through a hidden form+iframe instead of fetch().
      if (!fullNameFieldRef.current) throw new Error('Transport form is not mounted');
      fullNameFieldRef.current.value = values.fullName;
      emailFieldRef.current!.value = values.email;
      phoneFieldRef.current!.value = values.phone || '';
      subjectFieldRef.current!.value = values.subject;
      messageFieldRef.current!.value = values.message;

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
      <h3 className="font-pub-heading text-pub-primary-900 dark:text-pub-neutral-900 mb-6 text-lg font-semibold sm:text-xl">
        {tContact('formHeading')}
      </h3>

      {/* Iframe-transport POST target — a separate native form, since the
          visible RHF-controlled form below can't be nested inside another
          form. Never read from (cross-origin body is inaccessible); its
          `load` event firing is only used as a completion signal — see
          `completeSubmission` above. The initial (blank) mount also fires
          `load`, but `hasSubmittedRef` guards against that counting. */}
      <iframe
        title="Contact form submission target"
        name={IFRAME_NAME}
        onLoad={completeSubmission}
        className="hidden"
        aria-hidden="true"
        tabIndex={-1}
      />
      <form
        ref={transportFormRef}
        action={CONTACT_FORM_ENDPOINT ?? undefined}
        method="POST"
        target={IFRAME_NAME}
        encType="application/x-www-form-urlencoded"
        className="hidden"
        aria-hidden="true"
      >
        <input ref={fullNameFieldRef} type="hidden" name="fullName" />
        <input ref={emailFieldRef} type="hidden" name="email" />
        <input ref={phoneFieldRef} type="hidden" name="phone" />
        <input ref={subjectFieldRef} type="hidden" name="subject" />
        <input ref={messageFieldRef} type="hidden" name="message" />
      </form>

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-5">
        <Honeypot />

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div>
            <PremiumLabel htmlFor="c-fullName" required>
              {t('fullNameLabel')}
            </PremiumLabel>
            <PremiumInput
              id="c-fullName"
              autoComplete="name"
              placeholder={t('fullNamePlaceholder')}
              aria-invalid={!!errors.fullName}
              aria-describedby={errors.fullName ? 'c-fullName-error' : undefined}
              {...register('fullName')}
            />
            <PremiumFieldError id="c-fullName-error" message={errors.fullName?.message} />
          </div>

          <div>
            <PremiumLabel htmlFor="c-email" required>
              {t('emailLabel')}
            </PremiumLabel>
            <PremiumInput
              id="c-email"
              type="email"
              autoComplete="email"
              placeholder={t('emailPlaceholder')}
              aria-invalid={!!errors.email}
              aria-describedby={errors.email ? 'c-email-error' : undefined}
              {...register('email')}
            />
            <PremiumFieldError id="c-email-error" message={errors.email?.message} />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div>
            <PremiumLabel htmlFor="c-phone">{t('phoneLabel')}</PremiumLabel>
            <PremiumInput
              id="c-phone"
              type="tel"
              autoComplete="tel"
              placeholder={t('phonePlaceholder')}
              aria-invalid={!!errors.phone}
              aria-describedby={errors.phone ? 'c-phone-error' : undefined}
              {...register('phone')}
            />
            <PremiumFieldError id="c-phone-error" message={errors.phone?.message} />
          </div>

          <div>
            <PremiumLabel htmlFor="c-subject" required>
              {t('subjectLabel')}
            </PremiumLabel>
            <PremiumInput
              id="c-subject"
              placeholder={t('subjectPlaceholder')}
              aria-invalid={!!errors.subject}
              aria-describedby={errors.subject ? 'c-subject-error' : undefined}
              {...register('subject')}
            />
            <PremiumFieldError id="c-subject-error" message={errors.subject?.message} />
          </div>
        </div>

        <div>
          <PremiumLabel htmlFor="c-message" required>
            {t('messageLabel')}
          </PremiumLabel>
          <PremiumTextarea
            id="c-message"
            placeholder={t('messagePlaceholder')}
            rows={5}
            aria-invalid={!!errors.message}
            aria-describedby={errors.message ? 'c-message-error' : undefined}
            {...register('message')}
          />
          <PremiumFieldError id="c-message-error" message={errors.message?.message} />
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
