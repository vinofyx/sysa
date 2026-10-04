/**
 * `CommitteeMember.designation` (types/public.ts) is a single free-text
 * field with no Telugu counterpart in the schema — unlike name/description
 * pairs elsewhere, there's no `designationTe` to read. Rather than add a
 * schema field for it, this translates the small, fixed vocabulary of
 * committee titles actually in use at the display layer only; the
 * underlying CMS data and API contract are untouched. Any title outside
 * this known set (e.g. a custom one an admin adds later) is left as-is.
 */
const BASE_TE: Record<string, string> = {
  President: 'అధ్యక్షుడు',
  'Vice President': 'ఉపాధ్యక్షుడు',
  'General Secretary': 'ప్రధాన కార్యదర్శి',
  'Joint Secretary': 'సంయుక్త కార్యదర్శి',
  'Organizing Secretary': 'నిర్వహణ కార్యదర్శి',
  'Asst. Treasurer': 'సహాయ కోశాధికారి',
  Treasurer: 'కోశాధికారి',
  Advisor: 'సలహాదారు',
  'Executive Member': 'కార్యనిర్వాహక సభ్యుడు',
};

export function translateDesignation(designation: string, locale: string): string {
  if (locale !== 'te') return designation;
  const match = /^(.*?)(-[A-Za-z0-9]+)?$/.exec(designation);
  if (!match) return designation;
  const [, base, suffix] = match;
  const te = BASE_TE[base.trim()];
  return te ? `${te}${suffix ?? ''}` : designation;
}
