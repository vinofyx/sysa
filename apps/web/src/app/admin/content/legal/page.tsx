'use client';

import * as React from 'react';

import { PageHeader } from '@/components/admin/page-header';
import { RichTextEditor } from '@/components/admin/rich-text-editor';
import { AutosaveIndicator, type AutosaveStatus } from '@/components/admin/autosave-indicator';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { usePageContent, useUpdatePageContent, type PageKey } from '@/hooks/use-page-content';
import { useHasPermission } from '@/hooks/use-permission';
import { useDebouncedValue } from '@/hooks/use-debounced-value';

const PAGES: { key: PageKey; label: string }[] = [
  { key: 'privacy-policy', label: 'Privacy Policy' },
  { key: 'terms-conditions', label: 'Terms & Conditions' },
  { key: 'refund-policy', label: 'Refund Policy' },
  { key: 'disclaimer', label: 'Disclaimer' },
];

function LegalPageEditor({ pageKey }: { pageKey: PageKey }) {
  const canEdit = useHasPermission('content:edit');
  const { data, isLoading } = usePageContent(pageKey);
  const updateMutation = useUpdatePageContent(pageKey);

  const [bodyEn, setBodyEn] = React.useState('');
  const [status, setStatus] = React.useState<AutosaveStatus>('idle');
  const hydrated = React.useRef(false);

  React.useEffect(() => {
    if (data && !hydrated.current) {
      setBodyEn(typeof data.blocksEn.bodyEn === 'string' ? (data.blocksEn.bodyEn as string) : '');
      hydrated.current = true;
    }
  }, [data]);

  const debouncedBody = useDebouncedValue(bodyEn, 1200);

  React.useEffect(() => {
    if (!hydrated.current) return;
    setStatus('saving');
    updateMutation.mutate(
      { blocksEn: { bodyEn: debouncedBody } },
      {
        onSuccess: () => setStatus('saved'),
        onError: () => setStatus('error'),
      },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedBody]);

  if (isLoading) return <Skeleton className="h-64 w-full" />;

  return (
    <Card>
      <CardContent className="flex flex-col gap-3 pt-1">
        <div className="flex justify-end">
          <AutosaveIndicator status={status} />
        </div>
        <RichTextEditor
          value={bodyEn}
          onChange={setBodyEn}
          disabled={!canEdit}
          placeholder="Write the policy text…"
        />
      </CardContent>
    </Card>
  );
}

export default function LegalPagesAdmin() {
  return (
    <div>
      <PageHeader
        title="Legal Pages"
        description="Privacy Policy, Terms & Conditions, Refund Policy, and Disclaimer shown on the public site."
        breadcrumb={[{ label: 'Dashboard', href: '/admin' }, { label: 'Legal Pages' }]}
      />
      <div className="max-w-3xl">
        <Tabs defaultValue={PAGES[0].key}>
          <TabsList className="mb-4">
            {PAGES.map((page) => (
              <TabsTrigger key={page.key} value={page.key}>
                {page.label}
              </TabsTrigger>
            ))}
          </TabsList>
          {PAGES.map((page) => (
            <TabsContent key={page.key} value={page.key}>
              <LegalPageEditor pageKey={page.key} />
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </div>
  );
}
