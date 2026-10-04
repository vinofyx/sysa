import type { Metadata } from 'next';
import Image from 'next/image';
import { Gift, Landmark, Package, QrCode, Target } from 'lucide-react';
import { getLocale, getTranslations } from 'next-intl/server';

import { PageHero } from '@/components/public/page-hero';
import { SectionHeading } from '@/components/public/section-heading';
import { ProgressBar } from '@/components/public/progress-bar';
import { TrustBadge } from '@/components/public/trust-badge';
import { Reveal } from '@/components/public/motion';
import { BankTransferClaimForm } from '@/components/public/bank-transfer-claim-form';
import { CopyableDetail } from '@/components/public/copyable-detail';
import { DonationCheckoutForm } from '@/components/public/donation-checkout-form';
import { UpiDonationCard } from '@/components/public/upi-donation-card';
import { RichContent } from '@/components/public/rich-content';
import { EmptyState } from '@/components/shared/empty-state';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { getAppeals, getDonationCategories, getSiteSettings } from '@/lib/public-api';
import { buildMetadata, localizedDefaultDescription } from '@/lib/seo';
import { stripHtml } from '@/lib/strip-html';
import { cn } from '@/lib/utils';

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const t = await getTranslations('Nav');
  const settings = await getSiteSettings();
  return buildMetadata({
    locale,
    path: '/donate',
    title: `${t('donate')} — ${settings.siteNameEn}`,
    description: localizedDefaultDescription(settings, locale),
  });
}

function currency(value: string | number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(Number(value));
}

export default async function DonatePage() {
  const locale = await getLocale();
  const t = await getTranslations('Nav');
  const tDonate = await getTranslations('Donate');
  const [settings, categories, appeals] = await Promise.all([
    getSiteSettings(),
    getDonationCategories(),
    getAppeals(),
  ]);

  const hasBankDetails = !!(settings.bankAccountNumber && settings.bankIfscCode);

  return (
    <div>
      <PageHero
        title={t('donate')}
        breadcrumb={[{ label: t('home'), href: '/' }, { label: t('donate') }]}
      />

      <div className="mx-auto max-w-[1400px] px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
        <Reveal className="mb-8 flex flex-wrap gap-2.5">
          <TrustBadge variant="registered-ngo" />
          <TrustBadge variant="secure-payment" />
        </Reveal>

        <Reveal className="mb-14 max-w-2xl">
          <h2 className="font-pub-heading text-pub-primary-950 dark:text-pub-neutral-900 text-2xl font-semibold">
            {tDonate('supportSevaHeading')}
          </h2>
          <p className="text-pub-neutral-500 mt-3 text-sm leading-relaxed sm:text-base">
            {tDonate('supportSevaBody')}
          </p>
        </Reveal>

        <section className="mb-20">
          <SectionHeading
            align="left"
            eyebrow={tDonate('categoriesEyebrow')}
            title={tDonate('categoriesHeading')}
            className="mb-12"
          />
          {categories.length === 0 ? (
            <EmptyState icon={Landmark} title={tDonate('categoriesComingSoonTitle')} />
          ) : (
            <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {categories.map((category, index) => {
                const name = locale === 'te' && category.nameTe ? category.nameTe : category.nameEn;
                const description =
                  locale === 'te' && category.descriptionTe
                    ? category.descriptionTe
                    : category.descriptionEn;
                return (
                  <Reveal key={category.id} delay={index * 0.06} className="h-full">
                    <div className="border-pub-neutral-200/70 shadow-pub-md hover:shadow-pub-lg bg-pub-neutral-50 relative flex h-full flex-col overflow-hidden rounded-[var(--radius-pub-card)] border p-6 transition-all duration-500 hover:-translate-y-1">
                      <span className="pub-gradient-gold absolute inset-x-0 top-0 h-1" />
                      <span className="bg-pub-primary-100 text-pub-primary-700 ring-pub-gold-300/40 dark:bg-pub-primary-900/30 dark:text-pub-gold-300 dark:ring-pub-gold-300/20 mb-4 flex size-11 items-center justify-center rounded-full ring-1">
                        <Gift className="size-5" />
                      </span>
                      <p className="font-pub-heading text-pub-primary-950 dark:text-pub-neutral-900 text-lg font-semibold">
                        {name}
                      </p>
                      {description && (
                        <p className="text-pub-neutral-500 mt-2 flex-1 text-sm leading-relaxed">
                          {stripHtml(description)}
                        </p>
                      )}
                    </div>
                  </Reveal>
                );
              })}
            </div>
          )}
        </section>

        {appeals.length > 0 && (
          <section className="mb-20">
            <SectionHeading
              align="left"
              eyebrow={tDonate('appealsEyebrow')}
              title={tDonate('appealsHeading')}
              className="mb-12"
            />
            <div className="grid grid-cols-1 gap-8 sm:grid-cols-2">
              {appeals.map((appeal, index) => {
                const title = locale === 'te' && appeal.titleTe ? appeal.titleTe : appeal.titleEn;
                return (
                  <Reveal key={appeal.id} delay={index * 0.08}>
                    <div className="pub-gradient-emerald relative overflow-hidden rounded-[var(--radius-pub-card)] p-7 text-white shadow-lg">
                      <Target className="text-pub-gold-300/40 absolute -top-3 -right-3 size-24" />
                      <p className="font-pub-heading relative text-lg font-semibold">{title}</p>
                      <div className="relative mt-5">
                        <ProgressBar
                          value={Number(appeal.raisedAmountCache)}
                          max={Number(appeal.targetAmount)}
                        />
                        <div className="mt-2 flex justify-between text-xs text-white/75">
                          <span>
                            {tDonate('raised')}: {currency(appeal.raisedAmountCache)}
                          </span>
                          <span>
                            {tDonate('target')}: {currency(appeal.targetAmount)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </Reveal>
                );
              })}
            </div>
          </section>
        )}

        {categories.length > 0 && (
          <Reveal variant="scale" className="mb-20">
            {/* Target for every site-wide "Donate Now" CTA (header, hero,
                homepage) — scroll-mt-24 keeps it clear of the sticky header
                (h-18 = 72px) when the browser jumps straight to the hash. */}
            <div
              id="online-donation"
              className={cn(
                'mx-auto scroll-mt-24',
                settings.upiId
                  ? 'grid max-w-4xl grid-cols-1 items-start gap-6 sm:grid-cols-2'
                  : 'max-w-xl',
              )}
            >
              <div className="shadow-pub-xl bg-pub-neutral-white rounded-[var(--radius-pub-card)] p-1">
                <DonationCheckoutForm categories={categories} appeals={appeals} />
              </div>
              {settings.upiId && (
                <div className="shadow-pub-xl rounded-[var(--radius-pub-card)] p-1">
                  <UpiDonationCard upiId={settings.upiId} payeeName={settings.siteNameEn} />
                </div>
              )}
            </div>
          </Reveal>
        )}

        <section className="mb-20 grid grid-cols-1 gap-8 lg:grid-cols-2">
          <Reveal>
            <h2 className="font-pub-heading text-pub-primary-950 dark:text-pub-neutral-900 mb-5 flex items-center gap-2.5 text-xl font-semibold">
              <Landmark className="text-pub-gold-700 dark:text-pub-gold-300 size-5" />
              {tDonate('bankDetailsHeading')}
            </h2>
            {hasBankDetails ? (
              <div className="border-pub-neutral-200/70 shadow-pub-md bg-pub-neutral-white flex flex-col rounded-[var(--radius-pub-card)] border p-6 text-sm">
                <p className="text-pub-neutral-500 pb-3">{tDonate('bankDetailsBody')}</p>
                <div className="divide-pub-neutral-200 flex flex-col divide-y">
                  {settings.bankAccountName && (
                    <CopyableDetail
                      label={tDonate('accountName')}
                      value={settings.bankAccountName}
                    />
                  )}
                  {settings.bankName && (
                    <CopyableDetail
                      label={tDonate('bankName')}
                      value={settings.bankName}
                      copy={false}
                    />
                  )}
                  <CopyableDetail
                    label={tDonate('accountNumber')}
                    value={settings.bankAccountNumber!}
                  />
                  <CopyableDetail label={tDonate('ifsc')} value={settings.bankIfscCode!} />
                  {settings.bankBranch && (
                    <CopyableDetail
                      label={tDonate('branch')}
                      value={settings.bankBranch}
                      copy={false}
                    />
                  )}
                  {settings.upiId && (
                    <CopyableDetail label={tDonate('upiIdLabel')} value={settings.upiId} />
                  )}
                </div>
                {settings.upiQrImageUrl && (
                  <div className="mt-4 flex flex-col items-center gap-2">
                    <p className="text-pub-neutral-500 flex items-center gap-1.5 text-xs">
                      <QrCode className="size-3.5" /> {tDonate('upiHeading')}
                    </p>
                    <Image
                      src={settings.upiQrImageUrl}
                      alt={tDonate('upiQrAlt')}
                      width={180}
                      height={180}
                      className="rounded-lg border"
                    />
                  </div>
                )}
                <p className="border-pub-gold-300 bg-pub-gold-100 text-pub-gold-800 dark:text-pub-gold-300 mt-4 rounded-lg border px-3 py-2 text-xs">
                  {tDonate('bankDetailsNotice')}
                </p>
              </div>
            ) : (
              <EmptyState
                icon={Landmark}
                title={tDonate('bankComingSoonTitle')}
                description={tDonate('bankComingSoonDescription')}
              />
            )}
          </Reveal>
          <Reveal variant="slide-left">
            <BankTransferClaimForm categories={categories} />
          </Reveal>
        </section>

        <Reveal as="section" className="mx-auto mb-20 max-w-3xl">
          <h2 className="font-pub-heading text-pub-primary-950 dark:text-pub-neutral-900 mb-5 flex items-center gap-2.5 text-xl font-semibold">
            <Package className="text-pub-gold-700 dark:text-pub-gold-300 size-5" />
            {tDonate('inKindHeading')}
          </h2>
          <div className="border-pub-neutral-200/70 shadow-pub-md bg-pub-neutral-white rounded-[var(--radius-pub-card)] border p-6 text-sm">
            <p className="text-pub-neutral-700">{tDonate('inKindBody')}</p>
            <p className="text-pub-neutral-500 mt-2">{tDonate('inKindSupporting')}</p>
            <ul className="mt-4 grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-2">
              {[
                tDonate('inKindExampleFood'),
                tDonate('inKindExampleClothing'),
                tDonate('inKindExampleEducation'),
                tDonate('inKindExampleEssentials'),
                tDonate('inKindExampleHealthcare'),
                tDonate('inKindExampleGoshala'),
              ].map((item) => (
                <li key={item} className="text-pub-neutral-700 flex items-start gap-2">
                  <span className="bg-pub-gold-500 mt-1.5 size-1.5 shrink-0 rounded-full" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </Reveal>

        <Reveal as="section" className="mx-auto max-w-3xl">
          <h2 className="font-pub-heading text-pub-primary-950 dark:text-pub-neutral-900 mb-5 text-xl font-semibold">
            {tDonate('faqHeading')}
          </h2>
          <Accordion className="border-pub-neutral-200 border-t">
            <AccordionItem value="receipt">
              <AccordionTrigger className="font-pub-heading text-pub-primary-950 dark:text-pub-neutral-900 py-4 text-base font-medium hover:no-underline">
                {tDonate('faqReceiptQuestion')}
              </AccordionTrigger>
              <AccordionContent>
                <RichContent html={`<p>${tDonate('faqReceiptAnswer')}</p>`} />
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="verify-time">
              <AccordionTrigger className="font-pub-heading text-pub-primary-950 dark:text-pub-neutral-900 py-4 text-base font-medium hover:no-underline">
                {tDonate('faqVerifyTimeQuestion')}
              </AccordionTrigger>
              <AccordionContent>
                <RichContent html={`<p>${tDonate('faqVerifyTimeAnswer')}</p>`} />
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="online">
              <AccordionTrigger className="font-pub-heading text-pub-primary-950 dark:text-pub-neutral-900 py-4 text-base font-medium hover:no-underline">
                {tDonate('faqOnlineQuestion')}
              </AccordionTrigger>
              <AccordionContent>
                <RichContent html={`<p>${tDonate('faqOnlineAnswer')}</p>`} />
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="history">
              <AccordionTrigger className="font-pub-heading text-pub-primary-950 dark:text-pub-neutral-900 py-4 text-base font-medium hover:no-underline">
                {tDonate('faqHistoryQuestion')}
              </AccordionTrigger>
              <AccordionContent>
                <RichContent html={`<p>${tDonate('faqHistoryAnswer')}</p>`} />
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </Reveal>
      </div>
    </div>
  );
}
