/**
 * Prisma seed script — reference data + one bootstrap account (no business/content data).
 *
 * Seeds:
 *   1. Full RBAC permission catalogue + 10-role set (Phase 4 instruction — supersedes
 *      the simpler 4-role matrix in documentation/10-Roles-and-Permissions.md for actual
 *      implementation; see DEVELOPMENT_PROGRESS.md for the reconciliation note)
 *   2. Donation categories with verified pricing (docs/PROJECT_CONTEXT.md §5)
 *   3. One bootstrap Super Admin account, so the platform is loggable-into on a fresh
 *      database. Credentials come from SEED_SUPER_ADMIN_EMAIL/SEED_SUPER_ADMIN_PASSWORD
 *      env vars (dev-only fallback defaults below) — change/rotate before production use.
 *
 * Run via: npm run prisma:seed --workspace=apps/api
 */
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const PERMISSIONS = [
  // Content (Home/About/Activities/Appeals/Contact static content)
  'content:view',
  'content:edit',
  'content:publish',
  // Events & News
  'events:view',
  'events:manage',
  // Gallery
  'gallery:view',
  'gallery:manage',
  // Committee roster
  'committee:view',
  'committee:manage',
  // Donations
  'donations:view',
  'donations:create_manual',
  'donations:flag_refund',
  'donations:export',
  // Donors
  'donors:view',
  'donors:manage_recognition',
  // Appeals / campaigns
  'appeals:view',
  'appeals:manage',
  // Volunteers
  'volunteers:view',
  'volunteers:manage_status',
  // Document repository
  'documents:view',
  'documents:upload',
  'documents:publish',
  // Reporting
  'reports:generate',
  // System — users, roles, permissions, audit, settings
  'users:view',
  'users:manage',
  'roles:view',
  'roles:manage',
  'permissions:view',
  'audit:view',
  'settings:manage',
] as const;

const ROLE_PERMISSIONS: Record<string, readonly string[]> = {
  'Super Admin': PERMISSIONS,

  Admin: PERMISSIONS.filter(
    (p) => !['users:manage', 'roles:manage', 'settings:manage', 'audit:view'].includes(p),
  ),

  'Content Manager': [
    'content:view',
    'content:edit',
    'content:publish',
    'committee:view',
    'committee:manage',
    'documents:view',
  ],

  'Donation Manager': [
    'donations:view',
    'donations:create_manual',
    'donations:flag_refund',
    'donors:view',
    'donors:manage_recognition',
    'appeals:view',
    'appeals:manage',
    'reports:generate',
  ],

  'Volunteer Manager': ['volunteers:view', 'volunteers:manage_status', 'reports:generate'],

  'Event Manager': ['events:view', 'events:manage', 'content:view'],

  'Gallery Manager': ['gallery:view', 'gallery:manage'],

  'Report Manager': [
    'reports:generate',
    'donations:view',
    'volunteers:view',
    'documents:view',
    'content:view',
  ],

  'Finance Manager': [
    'donations:view',
    'donations:export',
    'documents:view',
    'documents:upload',
    'documents:publish',
    'reports:generate',
  ],

  Viewer: [
    'content:view',
    'events:view',
    'gallery:view',
    'committee:view',
    'donations:view',
    'donors:view',
    'appeals:view',
    'volunteers:view',
    'documents:view',
  ],
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
  const roleIdByName: Record<string, string> = {};
  for (const [roleName, permissionCodes] of Object.entries(ROLE_PERMISSIONS)) {
    const role = await prisma.role.upsert({
      where: { name: roleName },
      update: {},
      create: { name: roleName },
    });
    roleIdByName[roleName] = role.id;

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

  console.log('Seeding bootstrap Super Admin account...');
  const superAdminEmail = process.env.SEED_SUPER_ADMIN_EMAIL || 'superadmin@sysaindia.org';
  const superAdminPassword = process.env.SEED_SUPER_ADMIN_PASSWORD || 'ChangeMe!12345';

  const existing = await prisma.adminUser.findUnique({ where: { email: superAdminEmail } });
  if (!existing) {
    const passwordHash = await bcrypt.hash(superAdminPassword, 12);
    await prisma.adminUser.create({
      data: {
        name: 'Super Admin',
        email: superAdminEmail,
        passwordHash,
        roleId: roleIdByName['Super Admin'],
        active: true,
        // Pre-verified so the bootstrap account is immediately usable without a
        // configured SMTP provider — see apps/api/README.md for the production caveat.
        emailVerified: true,
        emailVerifiedAt: new Date(),
        passwordChangedAt: new Date(),
      },
    });
    console.log(`  Created bootstrap Super Admin: ${superAdminEmail}`);
    if (!process.env.SEED_SUPER_ADMIN_PASSWORD) {
      console.warn(
        '  ⚠️  Using the DEFAULT dev-only password. Set SEED_SUPER_ADMIN_PASSWORD before seeding ' +
          'a real environment, and change the password on first login regardless.',
      );
    }
  } else {
    console.log(`  Super Admin ${superAdminEmail} already exists — skipping.`);
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
