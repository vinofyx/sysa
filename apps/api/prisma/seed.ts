/**
 * Prisma seed script — reference data only (no business/feature data).
 *
 * Seeds:
 *   1. RBAC roles + permissions catalogue (documentation/10-Roles-and-Permissions.md)
 *   2. Donation categories with verified pricing (docs/PROJECT_CONTEXT.md §5)
 *
 * Run via: npm run prisma:seed --workspace=apps/api
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const PERMISSIONS = [
  'content:view',
  'content:edit',
  'content:publish',
  'donations:view',
  'donations:create_manual',
  'donations:flag_refund',
  'donations:export',
  'donors:view',
  'donors:manage_recognition',
  'volunteers:view',
  'volunteers:manage_status',
  'gallery:manage',
  'events:manage',
  'committee:manage',
  'documents:view',
  'documents:upload',
  'documents:publish',
  'reports:generate',
  'users:manage',
  'audit:view',
  'settings:manage',
] as const;

const ROLE_PERMISSIONS: Record<string, readonly string[]> = {
  'Super Admin': PERMISSIONS,
  'Content Admin': [
    'content:view',
    'content:edit',
    'content:publish',
    'donors:view',
    'gallery:manage',
    'events:manage',
    'committee:manage',
    'documents:view',
  ],
  'Finance Admin': [
    'content:view',
    'donations:view',
    'donations:create_manual',
    'donations:flag_refund',
    'donations:export',
    'donors:view',
    'donors:manage_recognition',
    'documents:view',
    'documents:upload',
    'documents:publish',
    'reports:generate',
  ],
  'Volunteer Coordinator': ['volunteers:view', 'volunteers:manage_status', 'reports:generate'],
};

// Verified pricing — docs/PROJECT_CONTEXT.md §5. Do not alter without client confirmation.
const DONATION_CATEGORIES = [
  {
    code: 'ANNAPRASADAM',
    nameEn: 'Annaprasadam',
    nameTe: null,
    descriptionEn:
      'Sponsor meals for residents — Lunch (₹3,000), Full Day (₹5,000), or Life Membership (₹51,000, two occasions/year for life).',
    hasPresetTiers: true,
  },
  {
    code: 'GOSHALA',
    nameEn: 'Goshala / Goseva',
    nameTe: null,
    descriptionEn:
      'Support the Goshala (10 cows, 10 calves, 2 acres of fodder land) — Daily (₹516), Monthly (₹5,116 or ₹11,116).',
    hasPresetTiers: true,
  },
  {
    code: 'OLD_AGE_HOME',
    nameEn: 'Old Age Home (General)',
    nameTe: null,
    descriptionEn: 'General support for the Vanaprasthasramam Old Age Home.',
    hasPresetTiers: false,
  },
  {
    code: 'BUILDING_FUND',
    nameEn: 'Building Fund',
    nameTe: null,
    descriptionEn:
      'Support the new G+2 building expansion (estimated ₹2.25 Crore, adds capacity for 50 more residents).',
    hasPresetTiers: false,
  },
  {
    code: 'GENERAL_DONATION',
    nameEn: 'General Donation',
    nameTe: null,
    descriptionEn: 'Unrestricted general donation to support the Ashram’s mission.',
    hasPresetTiers: false,
  },
];

async function main() {
  console.log('Seeding permissions...');
  for (const code of PERMISSIONS) {
    await prisma.permission.upsert({
      where: { code },
      update: {},
      create: { code },
    });
  }

  console.log('Seeding roles + role-permission mappings...');
  for (const [roleName, permissionCodes] of Object.entries(ROLE_PERMISSIONS)) {
    const role = await prisma.role.upsert({
      where: { name: roleName },
      update: {},
      create: { name: roleName },
    });

    const permissions = await prisma.permission.findMany({
      where: { code: { in: [...permissionCodes] } },
    });

    await prisma.rolePermission.deleteMany({ where: { roleId: role.id } });
    await prisma.rolePermission.createMany({
      data: permissions.map((p) => ({ roleId: role.id, permissionId: p.id })),
      skipDuplicates: true,
    });
  }

  console.log('Seeding donation categories...');
  for (const category of DONATION_CATEGORIES) {
    await prisma.donationCategory.upsert({
      where: { code: category.code },
      update: {},
      create: category,
    });
  }

  console.log('✅ Seed complete.');
}

main()
  .catch((error) => {
    console.error('❌ Seed failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
