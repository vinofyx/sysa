/**
 * Minimal, dependency-free CSV serializer for admin "Export" actions
 * (Donations, Volunteers, etc.) — small enough result sets (single admin
 * exports, not bulk-data pipelines) that a full CSV library is unwarranted.
 */
export function toCsv<T extends Record<string, unknown>>(rows: T[], columns: (keyof T)[]): string {
  const escape = (value: unknown): string => {
    if (value === null || value === undefined) return '';
    const str = value instanceof Date ? value.toISOString() : String(value);
    if (/[",\n]/.test(str)) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const header = columns.map((c) => escape(String(c))).join(',');
  const body = rows.map((row) => columns.map((c) => escape(row[c])).join(',')).join('\n');
  return `${header}\n${body}`;
}
