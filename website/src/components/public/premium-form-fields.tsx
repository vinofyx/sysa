'use client';

import * as React from 'react';
import { AlertCircle, CheckCircle2, ChevronDown, Loader2 } from 'lucide-react';

import { cn } from '@/lib/utils';

/**
 * Shared premium-styled form primitives for the static-export Volunteer and
 * Contact forms (`static-volunteer-form.tsx`, `static-contact-form.tsx`).
 * Neither `components/ui/input.tsx`/`textarea.tsx`/`select.tsx` nor
 * `components/ui/card.tsx` use the public site's `pub-*`/gold design
 * language — they're shadcn/admin-panel primitives (generic gray focus
 * rings, `bg-card`/`border-input` tokens) — so this file exists specifically
 * to give these two forms the premium ivory/charcoal + gold-accent look the
 * rest of the public site already has, without touching those shared admin
 * components other pages/the admin CMS still depend on.
 */

export function PremiumFormCard({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'mx-auto w-full max-w-[720px] rounded-[18px] border bg-[#FFFCF6] p-6 shadow-[0_15px_40px_rgba(18,58,40,0.08)] sm:p-8',
        'border-[rgba(18,58,40,0.10)] dark:border-[rgba(199,154,50,0.25)] dark:bg-[#0D2920] dark:shadow-[0_15px_40px_rgba(0,0,0,0.25)]',
        className,
      )}
    >
      {children}
    </div>
  );
}

export function PremiumLabel({
  htmlFor,
  required,
  children,
}: {
  htmlFor: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label
      htmlFor={htmlFor}
      className="mb-1.5 block text-sm font-semibold text-[#173A29] dark:text-[#F5F3EA]"
    >
      {children}
      {required && (
        <span className="ml-0.5 text-[#B3432F] dark:text-[#e8a08f]" aria-hidden="true">
          *
        </span>
      )}
    </label>
  );
}

const fieldBase =
  'h-[50px] w-full rounded-[11px] border bg-white px-4 text-[15px] text-[#173A29] placeholder:text-[#173A29]/40 transition-colors duration-200 outline-none ' +
  'border-[#D8DDD7] focus:border-[#C79A32] focus:ring-2 focus:ring-[#C79A32]/25 ' +
  'dark:bg-[#102E24] dark:text-[#F5F3EA] dark:placeholder:text-[#F5F3EA]/35 dark:border-white/[0.14] dark:focus:border-[#C79A32] ' +
  'aria-invalid:border-[#B3432F] aria-invalid:focus:ring-[#B3432F]/20';

export const PremiumInput = React.forwardRef<HTMLInputElement, React.ComponentProps<'input'>>(
  function PremiumInput({ className, ...props }, ref) {
    return <input ref={ref} className={cn(fieldBase, className)} {...props} />;
  },
);

export const PremiumTextarea = React.forwardRef<
  HTMLTextAreaElement,
  React.ComponentProps<'textarea'>
>(function PremiumTextarea({ className, ...props }, ref) {
  return (
    <textarea
      ref={ref}
      className={cn(fieldBase, 'h-auto min-h-[120px] resize-y py-3', className)}
      {...props}
    />
  );
});

export const PremiumSelect = React.forwardRef<
  HTMLSelectElement,
  React.ComponentProps<'select'> & { placeholder?: string }
>(function PremiumSelect({ className, placeholder, children, ...props }, ref) {
  return (
    <div className="relative">
      <select
        ref={ref}
        className={cn(fieldBase, 'appearance-none pr-10', className)}
        defaultValue=""
        {...props}
      >
        <option value="" disabled>
          {placeholder}
        </option>
        {children}
      </select>
      <ChevronDown
        className="pointer-events-none absolute top-1/2 right-3.5 size-4 -translate-y-1/2 text-[#173A29]/50 dark:text-[#F5F3EA]/50"
        aria-hidden="true"
      />
    </div>
  );
});

export function PremiumFieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p
      id={id}
      role="alert"
      className="mt-1.5 text-xs font-medium text-[#B3432F] dark:text-[#e8a08f]"
    >
      {message}
    </p>
  );
}

export function PremiumSubmitButton({
  pending,
  pendingText,
  children,
}: {
  pending: boolean;
  pendingText: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="submit"
      disabled={pending}
      className={cn(
        'inline-flex h-[48px] w-full items-center justify-center gap-2 rounded-full bg-[#C79A32] px-7 text-sm font-semibold text-[#102A1D] transition-all duration-200 sm:w-auto',
        'hover:-translate-y-px hover:bg-[#B88924] hover:shadow-[0_8px_20px_rgba(199,154,50,0.25)]',
        'active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0 disabled:hover:shadow-none',
      )}
    >
      {pending && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
      {pending ? pendingText : children}
    </button>
  );
}

export function PremiumStatusBanner({
  tone,
  title,
  message,
}: {
  tone: 'success' | 'error';
  title: string;
  message: string;
}) {
  const isSuccess = tone === 'success';
  return (
    <div
      role={isSuccess ? 'status' : 'alert'}
      className={cn(
        'flex items-start gap-3 rounded-2xl border p-5',
        isSuccess
          ? 'border-[#0f5132]/15 bg-[#EAF5EE] text-[#123A28] dark:border-[#e8c77a]/20 dark:bg-[#123126] dark:text-[#F5F3EA]'
          : 'border-[#B3432F]/25 bg-[#FDEEEA] text-[#7a2e1f] dark:border-[#e8a08f]/25 dark:bg-[#3a1f1a] dark:text-[#f0b8a8]',
      )}
    >
      {isSuccess ? (
        <CheckCircle2
          className="mt-0.5 size-5 shrink-0 text-[#0f5132] dark:text-[#e8c77a]"
          aria-hidden="true"
        />
      ) : (
        <AlertCircle
          className="mt-0.5 size-5 shrink-0 text-[#B3432F] dark:text-[#f0b8a8]"
          aria-hidden="true"
        />
      )}
      <div>
        <p className="text-sm font-semibold">{title}</p>
        <p className="mt-1 text-sm leading-relaxed opacity-90">{message}</p>
      </div>
    </div>
  );
}

/** Bot trap: real users never see or fill this field (visually hidden and
 * pulled out of tab order), but simple spam bots that blindly fill every
 * input will populate it — the submit handler checks it and silently drops
 * the submission instead of forwarding it. */
export function Honeypot() {
  return (
    <div className="absolute -left-[9999px] h-px w-px overflow-hidden" aria-hidden="true">
      <label htmlFor="_gotcha">Leave this field empty</label>
      <input type="text" id="_gotcha" name="_gotcha" tabIndex={-1} autoComplete="off" />
    </div>
  );
}
