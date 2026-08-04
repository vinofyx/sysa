import type { Metadata } from 'next';
import Image from 'next/image';
import { Landmark, QrCode } from 'lucide-react';
import { getLocale, getTranslations } from 'next-intl/server';

import { PageHero } from '@/components/public/page-hero';
import { ProgressBar } from '@/components/public/progress-bar';
import { TrustBadge } from '@/components/public/trust-badge';
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

      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="mb-10 flex flex-wrap gap-2">
          <TrustBadge variant="registered-ngo" />
          <TrustBadge variant="secure-payment" />
        </div>

        <section className="mb-14">
          <h2 className="font-pub-heading text-pub-primary-900 mb-4 text-xl font-semibold">
            {tDonate('categoriesHeading')}
          </h2>
          {categories.length === 0 ? (
            <EmptyState icon={Landmark} title="Coming soon" />
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {categories.map((category) => {
                const name = locale === 'te' && category.nameTe ? category.nameTe : category.nameEn;
                const description =
                  locale === 'te' && category.descriptionTe
                    ? category.descriptionTe
                    : category.descriptionEn;
                return (
                  <div
                    key={category.id}
                    className="border-pub-neutral-200 rounded-xl border bg-white p-5"
                  >
                    <p className="font-pub-heading text-pub-primary-900 text-sm font-semibold">
                      {name}
                    </p>
                    {description && (
                      <p className="text-pub-neutral-500 mt-1.5 text-sm">
                        {description.replace(/<[^>]+>/g, '')}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {appeals.length > 0 && (
          <section className="mb-14">
            <h2 className="font-pub-heading text-pub-primary-900 mb-4 text-xl font-semibold">
              {tDonate('appealsHeading')}
            </h2>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              {appeals.map((appeal) => {
                const title = locale === 'te' && appeal.titleTe ? appeal.titleTe : appeal.titleEn;
                return (
                  <div
                    key={appeal.id}
                    className="border-pub-neutral-200 rounded-xl border bg-white p-5"
                  >
                    <p className="font-pub-heading text-pub-primary-900 text-sm font-semibold">
                      {title}
                    </p>
                    <div className="mt-3">
                      <ProgressBar
                        value={Number(appeal.raisedAmountCache)}
                        max={Number(appeal.targetAmount)}
                      />
                      <div className="text-pub-neutral-500 mt-1.5 flex justify-between text-xs">
                        <span>
                          {tDonate('raised')}: {currency(appeal.raisedAmountCache)}
                        </span>
                        <span>
                          {tDonate('target')}: {currency(appeal.targetAmount)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {categories.length > 0 && (
          <section className="mx-auto mb-14 max-w-xl">
            <DonationCheckoutForm categories={categories} appeals={appeals} />
          </section>
        )}

        <section className="mb-14 grid grid-cols-1 gap-8 lg:grid-cols-2">
          <div>
            <h2 className="font-pub-heading text-pub-primary-900 mb-4 text-xl font-semibold">
              {tDonate('bankDetailsHeading')}
            </h2>
            {hasBankDetails ? (
              <div className="border-pub-neutral-200 flex flex-col gap-2 rounded-xl border bg-white p-5 text-sm">
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
                    <span className="text-pub-neutral-500">UPI ID: </span>
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
                      unoptimized
                      className="rounded-lg border"
                    />
                  </div>
                )}
              </div>
            ) : (
              <EmptyState
                icon={Landmark}
                title="Coming soon"
                description="Contact us for bank transfer details."
              />
            )}
          </div>
          <BankTransferClaimForm categories={categories} />
        </section>

        <section>
          <h2 className="font-pub-heading text-pub-primary-900 mb-4 text-xl font-semibold">
            {tDonate('faqHeading')}
          </h2>
          <Accordion>
            <AccordionItem value="receipt">
              <AccordionTrigger>Will I receive a donation receipt?</AccordionTrigger>
              <AccordionContent>
                <RichContent html="<p>Yes — once your bank transfer or UPI payment is verified, a receipt is generated and emailed to you automatically.</p>" />
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="verify-time">
              <AccordionTrigger>How long does verification take?</AccordionTrigger>
              <AccordionContent>
                <RichContent html="<p>Our Finance team typically verifies bank transfer claims within a few working days of submission.</p>" />
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="online">
              <AccordionTrigger>Can I donate online with a card?</AccordionTrigger>
              <AccordionContent>
                <RichContent html="<p>Yes — use the “Donate Online” form above to pay securely by UPI, card, or net banking via Razorpay. If you'd rather transfer directly, the bank/UPI details and confirmation form below are also available.</p>" />
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="history">
              <AccordionTrigger>Can I view my past donations?</AccordionTrigger>
              <AccordionContent>
                <RichContent
                  html={`<p>Yes — visit the <a href="/donate/history">Donation History</a> page and log in with the email you donated with to receive a one-time code.</p>`}
                />
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </section>
      </div>
    </div>
  );
}
