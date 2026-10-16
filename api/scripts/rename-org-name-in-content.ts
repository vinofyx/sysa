/**
 * Replaces "Sai Yadadri Seva Ashramam" with "Sai Yadadri Seva Ashram" in the
 * database's website CONTENT (activities, events, news, page blocks, …) — the
 * copies seeded before the name was made consistent in api/prisma/seed.ts.
 *
 *   npx tsx scripts/rename-org-name-in-content.ts            # report only
 *   npx tsx scripts/rename-org-name-in-content.ts --apply    # write changes
 *
 * Report-only unless --apply is passed. Never touches history or records:
 * audit logs, donations, donors, receipts, payments, sessions, tokens,
 * registrations and volunteer records are excluded. Only the exact phrase is
 * replaced; nothing else in a row changes. Prints counts only (no content).
 */
import { config as loadDotenv } from 'dotenv';

loadDotenv({ path: '.env' });
loadDotenv({ path: '.env.local', override: true });

const OLD = 'Sai Yadadri Seva Ashramam';
const NEW = 'Sai Yadadri Seva Ashram';

/** Tables that hold records or history, never site content. */
const EXCLUDED = [
  /^_prisma/,
  /^audit_log$/,
  /^admin_user/,
  /^session/,
  /token/,
  /^donation(?!_category)/,
  /^donor/,
  /^receipt/,
  /^payment/,
  /^bank_transfer/,
  /^event_registration/,
  /^volunteer/,
  /^permission/,
  /^role/,
];

async function main(): Promise<void> {
  const apply = process.argv.includes('--apply');
  const { prisma } = await import('../src/lib/prisma');

  const columns = await prisma.$queryRawUnsafe<Array<{ TABLE_NAME: string; COLUMN_NAME: string }>>(
    `SELECT TABLE_NAME, COLUMN_NAME FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND DATA_TYPE IN ('varchar', 'char', 'text', 'mediumtext', 'longtext', 'json')`,
  );
  const targets = columns.filter(({ TABLE_NAME }) => !EXCLUDED.some((re) => re.test(TABLE_NAME)));

  let total = 0;
  for (const { TABLE_NAME: table, COLUMN_NAME: column } of targets) {
    const [{ n }] = await prisma.$queryRawUnsafe<Array<{ n: bigint }>>(
      `SELECT COUNT(*) AS n FROM \`${table}\` WHERE \`${column}\` LIKE ?`,
      `%${OLD}%`,
    );
    const count = Number(n);
    if (count === 0) continue;
    total += count;
    if (apply) {
      const updated = await prisma.$executeRawUnsafe(
        `UPDATE \`${table}\` SET \`${column}\` = REPLACE(\`${column}\`, ?, ?) WHERE \`${column}\` LIKE ?`,
        OLD,
        NEW,
        `%${OLD}%`,
      );
      console.log(`${table}.${column}: updated ${updated} row(s)`);
    } else {
      console.log(`${table}.${column}: ${count} row(s) would change`);
    }
  }

  console.log(
    total === 0
      ? 'Nothing to change.'
      : apply
        ? `Done: ${total} row(s) updated.`
        : `${total} row(s) would change. Re-run with --apply to write them.`,
  );
  await prisma.$disconnect();
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
