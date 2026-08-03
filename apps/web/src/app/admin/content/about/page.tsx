'use client';

import * as React from 'react';
import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

import { PageHeader } from '@/components/admin/page-header';
import { RichTextEditor } from '@/components/admin/rich-text-editor';
import { AutosaveIndicator, type AutosaveStatus } from '@/components/admin/autosave-indicator';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { usePageContent, useUpdatePageContent } from '@/hooks/use-page-content';
import { useHasPermission } from '@/hooks/use-permission';
import { useDebouncedValue } from '@/hooks/use-debounced-value';

interface AboutBlocks {
  historyEn: string;
  visionEn: string;
  missionEn: string;
  founderBioEn: string;
  treasurerMessageEn: string;
}

const SECTIONS: { key: keyof AboutBlocks; label: string; helper: string }[] = [
  { key: 'historyEn', label: 'History', helper: "The Ashram's founding story and history." },
  { key: 'visionEn', label: 'Vision', helper: 'The long-term vision statement.' },
  { key: 'missionEn', label: 'Mission', helper: "The Ashram's mission statement." },
  { key: 'founderBioEn', label: 'Founder', helper: "The founder's biography." },
  {
    key: 'treasurerMessageEn',
    label: 'Treasurer Message',
    helper: "A message from the Ashram's treasurer.",
  },
];

function parseBlocks(blocksEn: Record<string, unknown>): AboutBlocks {
  const get = (key: string) => (typeof blocksEn[key] === 'string' ? (blocksEn[key] as string) : '');
  return {
    historyEn: get('historyEn'),
    visionEn: get('visionEn'),
    missionEn: get('missionEn'),
    founderBioEn: get('founderBioEn'),
    treasurerMessageEn: get('treasurerMessageEn'),
  };
}

function AboutEditor() {
  const searchParams = useSearchParams();
  const initialSection = searchParams.get('section');
  const canEdit = useHasPermission('content:edit');
  const { data, isLoading } = usePageContent('about');
  const updateMutation = useUpdatePageContent('about');

  const [blocks, setBlocks] = React.useState<AboutBlocks>({
    historyEn: '',
    visionEn: '',
    missionEn: '',
    founderBioEn: '',
    treasurerMessageEn: '',
  });
  const [status, setStatus] = React.useState<AutosaveStatus>('idle');
  const hydrated = React.useRef(false);

  React.useEffect(() => {
    if (data && !hydrated.current) {
      setBlocks(parseBlocks(data.blocksEn));
      hydrated.current = true;
    }
  }, [data]);

  const debouncedBlocks = useDebouncedValue(blocks, 1200);

  React.useEffect(() => {
    if (!hydrated.current) return;
    setStatus('saving');
    updateMutation.mutate(
      { blocksEn: debouncedBlocks as unknown as Record<string, unknown> },
      {
        onSuccess: () => setStatus('saved'),
        onError: () => setStatus('error'),
      },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedBlocks]);

  const defaultTab = SECTIONS.some((s) => s.key === initialSection)
    ? initialSection!
    : SECTIONS[0].key;

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl">
      <PageHeader
        title="About Ashram"
        description="History, Vision, Mission, Founder, and Treasurer's Message."
        breadcrumb={[{ label: 'Dashboard', href: '/admin' }, { label: 'About' }]}
        action={<AutosaveIndicator status={status} />}
      />

      <Tabs defaultValue={defaultTab}>
        <TabsList className="mb-4">
          {SECTIONS.map((section) => (
            <TabsTrigger key={section.key} value={section.key}>
              {section.label}
            </TabsTrigger>
          ))}
        </TabsList>
        {SECTIONS.map((section) => (
          <TabsContent key={section.key} value={section.key}>
            <Card>
              <CardContent className="pt-1">
                <p className="text-muted-foreground mb-3 text-sm">{section.helper}</p>
                <RichTextEditor
                  value={blocks[section.key]}
                  onChange={(html) => setBlocks((prev) => ({ ...prev, [section.key]: html }))}
                  placeholder={`Write the ${section.label.toLowerCase()} content…`}
                  disabled={!canEdit}
                />
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

export default function AboutContentPage() {
  return (
    <Suspense fallback={<Skeleton className="h-64 w-full max-w-3xl" />}>
      <AboutEditor />
    </Suspense>
  );
}
