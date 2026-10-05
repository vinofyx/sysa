'use client';

import * as React from 'react';
import Link from 'next/link';

import { PageHeader } from '@/components/admin/page-header';
import { RichTextEditor } from '@/components/admin/rich-text-editor';
import { AutosaveIndicator, type AutosaveStatus } from '@/components/admin/autosave-indicator';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { usePageContent, useUpdatePageContent } from '@/hooks/use-page-content';
import { useHasPermission } from '@/hooks/use-permission';
import { useDebouncedValue } from '@/hooks/use-debounced-value';

function parseIntro(blocksEn: Record<string, unknown>): string {
  return typeof blocksEn.introEn === 'string' ? blocksEn.introEn : '';
}

export default function ContactContentPage() {
  const canEdit = useHasPermission('content:edit');
  const { data, isLoading } = usePageContent('contact');
  const updateMutation = useUpdatePageContent('contact');

  const [introEn, setIntroEn] = React.useState('');
  const [status, setStatus] = React.useState<AutosaveStatus>('idle');
  const hydrated = React.useRef(false);

  React.useEffect(() => {
    if (data && !hydrated.current) {
      setIntroEn(parseIntro(data.blocksEn));
      hydrated.current = true;
    }
  }, [data]);

  const debouncedIntro = useDebouncedValue(introEn, 1200);

  React.useEffect(() => {
    if (!hydrated.current) return;
    setStatus('saving');
    updateMutation.mutate(
      { blocksEn: { introEn: debouncedIntro } },
      {
        onSuccess: () => setStatus('saved'),
        onError: () => setStatus('error'),
      },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedIntro]);

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl">
      <PageHeader
        title="Contact Page Content"
        description="Intro text shown on the Contact page."
        breadcrumb={[{ label: 'Dashboard', href: '/admin' }, { label: 'Contact' }]}
        action={<AutosaveIndicator status={status} />}
      />

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Intro message</CardTitle>
          <CardDescription>
            Shown above the contact form and address details on the public Contact page.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RichTextEditor
            value={introEn}
            onChange={setIntroEn}
            placeholder="We'd love to hear from you…"
            disabled={!canEdit}
          />
        </CardContent>
      </Card>

      <Card className="border-dashed">
        <CardHeader>
          <CardTitle className="text-muted-foreground text-sm font-medium">
            Address, phone, email, and map details
          </CardTitle>
          <CardDescription>
            These structured contact fields live in Website Settings, since they&rsquo;re shared
            with the site footer and SEO defaults, not just the Contact page.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" size="sm" render={<Link href="/admin/settings?tab=website" />}>
            Go to Website Settings
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
