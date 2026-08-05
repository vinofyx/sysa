import type { PageContent } from '@/types/public';

export interface AboutBlocks {
  aboutEn: string;
  aboutTe?: string;
  historyEn: string;
  historyTe?: string;
  visionEn: string;
  visionTe?: string;
  missionEn: string;
  missionTe?: string;
  founderBioEn: string;
  founderBioTe?: string;
  treasurerMessageEn: string;
  treasurerMessageTe?: string;
}

/** Mirrors the shape the admin About editor (`app/admin/content/about`)
 * saves into `PageContent.blocksEn`/`blocksTe` — one record, six sections. */
export function parseAboutBlocks(content: PageContent): AboutBlocks {
  const en = content.blocksEn as Record<string, unknown>;
  const te = (content.blocksTe ?? {}) as Record<string, unknown>;
  const str = (obj: Record<string, unknown>, key: string) =>
    typeof obj[key] === 'string' ? (obj[key] as string) : '';

  return {
    aboutEn: str(en, 'aboutEn'),
    aboutTe: str(te, 'aboutEn') || undefined,
    historyEn: str(en, 'historyEn'),
    historyTe: str(te, 'historyEn') || undefined,
    visionEn: str(en, 'visionEn'),
    visionTe: str(te, 'visionEn') || undefined,
    missionEn: str(en, 'missionEn'),
    missionTe: str(te, 'missionEn') || undefined,
    founderBioEn: str(en, 'founderBioEn'),
    founderBioTe: str(te, 'founderBioEn') || undefined,
    treasurerMessageEn: str(en, 'treasurerMessageEn'),
    treasurerMessageTe: str(te, 'treasurerMessageEn') || undefined,
  };
}
