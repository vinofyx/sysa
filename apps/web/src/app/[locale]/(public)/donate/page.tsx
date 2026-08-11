import type { Metadata } from 'next';
import Image from 'next/image';
import { Gift, Landmark, QrCode, Target } from 'lucide-react';
import { getLocale, getTranslations } from 'next-intl/server';

import { PageHero } from '@/components/public/page-hero';
import { SectionHeading } from '@/components/public/section-heading';
import { ProgressBar } from '@/components/public/progress-bar';
import { TrustBadge } from '@/components/public/trust-badge';
import { Reveal } from '@/components/public/motion';
import { BankTransferClaimForm } from '@/components/public/bank-transfer-claim-form';
import { DonationCheckoutForm } from '@/components/public/donation-checkout-form';
import { RichContent } from '@/components/public/rich-content';
import { EmptyState } from '@/components/admin/empty-state';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { getAppeals, getDonationCategories, getSiteSettings } from '@/lib/public-api';
import { buildMetadata } from '@/lib/seo';

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const t = await getTranslations('Nav');
  const settings = await getSiteSettings();
  return buildMetadata({
    locale,
    path: '/donate',
    title: `${t('donate')} — ${settings.siteNameEn}`,
    description: settings.defaultMetaDescription ?? settings.taglineEn ?? settings.siteNameEn,
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
        <Reveal className="mb-14 flex flex-wrap gap-2.5">
          <TrustBadge variant="registered-ngo" />
          <TrustBadge variant="secure-payment" />
        </Reveal>

        <section className="mb-20">
          <SectionHeading
            align="left"
            eyebrow="Give with purpose"
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
                    <div className="border-pub-neutral-200/70 shadow-pub-md hover:shadow-pub-lg relative flex h-full flex-col overflow-hidden rounded-[var(--radius-pub-card)] border bg-white p-6 transition-all duration-500 hover:-translate-y-1.5">
                      <span className="pub-gradient-gold absolute inset-x-0 top-0 h-1" />
                      <span className="bg-pub-primary-100 text-pub-primary-700 mb-4 flex size-11 items-center justify-center rounded-full">
                        <Gift className="size-5" />
                      </span>
                      <p className="font-pub-heading text-pub-primary-950 text-lg font-semibold">
                        {name}
                      </p>
                      {description && (
                        <p className="text-pub-neutral-500 mt-2 flex-1 text-sm leading-relaxed">
                          {description.replace(/<[^>]+>/g, '')}
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
              eyebrow="Active appeals"
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
          <Reveal variant="scale" className="mx-auto mb-20 max-w-xl">
            <div className="shadow-pub-xl rounded-[var(--radius-pub-card)] bg-white p-1">
              <DonationCheckoutForm categories={categories} appeals={appeals} />
            </div>
          </Reveal>
        )}

        <section className="mb-20 grid grid-cols-1 gap-8 lg:grid-cols-2">
          <Reveal>
            <h2 className="font-pub-heading text-pub-primary-950 mb-5 text-xl font-semibold">
              {tDonate('bankDetailsHeading')}
            </h2>
            {hasBankDetails ? (
              <div className="border-pub-neutral-200/70 shadow-pub-md flex flex-col gap-2.5 rounded-[var(--radius-pub-card)] border bg-white p-6 text-sm">
                {settings.bankAccountName && (
                  <p>
                    <span className="text-pub-neutral-500">{tDonate('accountName')}: </span>
                    {settings.bankAccountName}
                  </p>
                )}
                <p>
                  <span className="text-pub-neutral-500">{tDonate('accountNumber')}: </span>
                  {settings.bankAccountNumber}
                </p>
                <p>
                  <span className="text-pub-neutral-500">{tDonate('ifsc')}: </span>
                  {settings.bankIfscCode}
                </p>
                {settings.bankName && (
                  <p>
                    <span className="text-pub-neutral-500">{tDonate('bankName')}: </span>
                    {settings.bankName}
                  </p>
                )}
                {settings.bankBranch && (
                  <p>
                    <span className="text-pub-neutral-500">{tDonate('branch')}: </span>
                    {settings.bankBranch}
                  </p>
                )}
                {settings.upiId && (
                  <p className="pt-2">
                    <span className="text-pub-neutral-500">{tDonate('upiIdLabel')}: </span>
                    {settings.upiId}
                  </p>
                )}
                {settings.upiQrImageUrl && (
                  <div className="mt-2 flex flex-col items-center gap-2">
                    <p className="text-pub-neutral-500 flex items-center gap-1.5 text-xs">
                      <QrCode className="size-3.5" /> {tDonate('upiHeading')}
                    </p>
                    <Image
                      src={settings.upiQrImageUrl}
                      alt="UPI QR code"
                      width={180}
                      height={180}
                      className="rounded-lg border"
                    />
                  </div>
                )}
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

        <Reveal as="section">
          <h2 className="font-pub-heading text-pub-primary-950 mb-5 text-xl font-semibold">
            {tDonate('faqHeading')}
          </h2>
          <Accordion>
            <AccordionItem value="receipt">
              <AccordionTrigger>{tDonate('faqReceiptQuestion')}</AccordionTrigger>
              <AccordionContent>
                <RichContent html={`<p>${tDonate('faqReceiptAnswer')}</p>`} />
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="verify-time">
              <AccordionTrigger>{tDonate('faqVerifyTimeQuestion')}</AccordionTrigger>
              <AccordionContent>
                <RichContent html={`<p>${tDonate('faqVerifyTimeAnswer')}</p>`} />
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="online">
              <AccordionTrigger>{tDonate('faqOnlineQuestion')}</AccordionTrigger>
              <AccordionContent>
                <RichContent html={`<p>${tDonate('faqOnlineAnswer')}</p>`} />
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="history">
              <AccordionTrigger>{tDonate('faqHistoryQuestion')}</AccordionTrigger>
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
