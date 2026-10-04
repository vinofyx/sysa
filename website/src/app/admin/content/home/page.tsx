'use client';

import * as React from 'react';
import { Plus, Trash2 } from 'lucide-react';

import { PageHeader } from '@/components/admin/page-header';
import { RichTextEditor } from '@/components/admin/rich-text-editor';
import { AutosaveIndicator, type AutosaveStatus } from '@/components/admin/autosave-indicator';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { usePageContent, useUpdatePageContent } from '@/hooks/use-page-content';
import { useHasPermission } from '@/hooks/use-permission';
import { useDebouncedValue } from '@/hooks/use-debounced-value';

interface ImpactStat {
  valueEn: string;
  labelEn: string;
}

interface HomeBlocks {
  welcomeMessageEn: string;
  impactStats: ImpactStat[];
}

function parseBlocks(blocksEn: Record<string, unknown>): HomeBlocks {
  return {
    welcomeMessageEn:
      typeof blocksEn.welcomeMessageEn === 'string' ? blocksEn.welcomeMessageEn : '',
    impactStats: Array.isArray(blocksEn.impactStats) ? (blocksEn.impactStats as ImpactStat[]) : [],
  };
}

export default function HomeContentPage() {
  const canEdit = useHasPermission('content:edit');
  const { data, isLoading } = usePageContent('home');
  const updateMutation = useUpdatePageContent('home');

  const [blocks, setBlocks] = React.useState<HomeBlocks>({ welcomeMessageEn: '', impactStats: [] });
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

  function updateStat(index: number, field: keyof ImpactStat, value: string) {
    setBlocks((prev) => ({
      ...prev,
      impactStats: prev.impactStats.map((stat, i) =>
        i === index ? { ...stat, [field]: value } : stat,
      ),
    }));
  }

  function addStat() {
    setBlocks((prev) => ({
      ...prev,
      impactStats: [...prev.impactStats, { valueEn: '', labelEn: '' }],
    }));
  }

  function removeStat(index: number) {
    setBlocks((prev) => ({ ...prev, impactStats: prev.impactStats.filter((_, i) => i !== index) }));
  }

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
        title="Home Page Content"
        description="Welcome message and impact stats shown on the homepage."
        breadcrumb={[{ label: 'Dashboard', href: '/admin' }, { label: 'Home Content' }]}
        action={<AutosaveIndicator status={status} />}
      />

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Welcome message</CardTitle>
          <CardDescription>
            Shown at the top of the homepage, below the hero banners.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RichTextEditor
            value={blocks.welcomeMessageEn}
            onChange={(html) => setBlocks((prev) => ({ ...prev, welcomeMessageEn: html }))}
            placeholder="Write a short welcome message…"
            disabled={!canEdit}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Impact stats</CardTitle>
          <CardDescription>
            Numbers highlighted on the homepage (e.g. &ldquo;500+ Meals served daily&rdquo;).
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {blocks.impactStats.map((stat, index) => (
            <div key={index} className="flex items-center gap-2">
              <Input
                value={stat.valueEn}
                onChange={(event) => updateStat(index, 'valueEn', event.target.value)}
                placeholder="500+"
                className="w-28"
                disabled={!canEdit}
              />
              <Input
                value={stat.labelEn}
                onChange={(event) => updateStat(index, 'labelEn', event.target.value)}
                placeholder="Meals served daily"
                disabled={!canEdit}
              />
              {canEdit && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => removeStat(index)}
                  aria-label="Remove stat"
                >
                  <Trash2 />
                </Button>
              )}
            </div>
          ))}
          {canEdit && (
            <Button type="button" variant="outline" size="sm" className="w-fit" onClick={addStat}>
              <Plus /> Add stat
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
