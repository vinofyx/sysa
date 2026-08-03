/**
 * Prisma seed script — reference/verified data + one bootstrap account.
 *
 * Seeds:
 *   1. Full RBAC permission catalogue + 10-role set (Phase 4/5 instruction —
 *      supersedes the simpler 4-role matrix in documentation/10-Roles-and-Permissions.md
 *      for actual implementation; see DEVELOPMENT_PROGRESS.md)
 *   2. Donation categories with verified pricing (docs/PROJECT_CONTEXT.md §5)
 *   3. The full, correct 27-member committee roster (docs/PROJECT_CONTEXT.md §6 —
 *      sourced from COMMITTEE MEMBERS LIST.docx, not the incomplete 25-member
 *      brochure subset flagged in docs/DOCUMENT_ANALYSIS.md)
 *   4. The Ashram's verified programs as Activities (docs/PROJECT_CONTEXT.md §4)
 *   5. A default SiteSettings singleton row (only verified fields populated)
 *   6. One bootstrap Super Admin account
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
  // News (blog-style posts)
  'news:view',
  'news:manage',
  // Events (dedicated module: categories, registrations, attendance)
  'events:view',
  'events:manage',
  'event_categories:view',
  'event_categories:manage',
  'event_registrations:view',
  'event_registrations:manage',
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
  'donations:manage',
  // Donors
  'donors:view',
  'donors:manage_recognition',
  // Appeals / campaigns
  'appeals:view',
  'appeals:manage',
  // Bank transfer claim verification
  'bank_transfers:view',
  'bank_transfers:manage',
  // Volunteers
  'volunteers:view',
  'volunteers:manage_status',
  'volunteer_assignments:view',
  'volunteer_assignments:manage',
  // Document repository
  'documents:view',
  'documents:upload',
  'documents:publish',
  // Reporting
  'reports:generate',
  // Homepage / marketing content
  'testimonials:view',
  'testimonials:manage',
  'banners:view',
  'banners:manage',
  'navigation:view',
  'navigation:manage',
  'social_links:view',
  'social_links:manage',
  'activities:view',
  'activities:manage',
  // System — users, roles, permissions, audit, settings
  'users:view',
  'users:manage',
  'roles:view',
  'roles:manage',
  'permissions:view',
  'audit:view',
  'settings:view',
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
    'news:view',
    'news:manage',
    'testimonials:view',
    'testimonials:manage',
    'banners:view',
    'banners:manage',
    'navigation:view',
    'navigation:manage',
    'social_links:view',
    'social_links:manage',
    'activities:view',
    'activities:manage',
    'documents:view',
  ],

  'Donation Manager': [
    'donations:view',
    'donations:create_manual',
    'donations:flag_refund',
    'donations:manage',
    'donors:view',
    'donors:manage_recognition',
    'appeals:view',
    'appeals:manage',
    'bank_transfers:view',
    'bank_transfers:manage',
    'reports:generate',
  ],

  'Volunteer Manager': [
    'volunteers:view',
    'volunteers:manage_status',
    'volunteer_assignments:view',
    'volunteer_assignments:manage',
    'reports:generate',
  ],

  'Event Manager': [
    'events:view',
    'events:manage',
    'event_categories:view',
    'event_categories:manage',
    'event_registrations:view',
    'event_registrations:manage',
    'content:view',
  ],

  'Gallery Manager': ['gallery:view', 'gallery:manage'],

  'Report Manager': [
    'reports:generate',
    'donations:view',
    'volunteers:view',
    'documents:view',
    'content:view',
    'events:view',
  ],

  'Finance Manager': [
    'donations:view',
    'donations:export',
    'bank_transfers:view',
    'documents:view',
    'documents:upload',
    'documents:publish',
    'reports:generate',
  ],

  Viewer: [
    'content:view',
    'news:view',
    'events:view',
    'gallery:view',
    'committee:view',
    'donations:view',
    'donors:view',
    'appeals:view',
    'volunteers:view',
    'documents:view',
    'testimonials:view',
    'banners:view',
    'activities:view',
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

// Verified 27-member roster — docs/PROJECT_CONTEXT.md §6 (COMMITTEE MEMBERS LIST.docx),
// authoritative over the incomplete 25-member brochure photo grid. Phone numbers are
// intentionally NOT stored (the schema has no phone field) — two of the numbers
// conflict between source documents (docs/DOCUMENT_ANALYSIS.md), so omitting them
// entirely avoids publishing an unverified number.
const COMMITTEE_MEMBERS = [
  { name: 'D. Ashok', designation: 'President' },
  { name: 'G. Appala Raju', designation: 'Vice President-I' },
  { name: 'A. Sudhakara Rao', designation: 'Vice President-II' },
  { name: 'J. Yanadi Setty', designation: 'General Secretary' },
  { name: 'SSG Vittal', designation: 'Joint Secretary-I' },
  { name: 'K. Rajender Kumar Reddy', designation: 'Joint Secretary-II' },
  { name: 'S. Mahesh', designation: 'Organizing Secretary-I' },
  { name: 'P. Vijaya Kumar', designation: 'Organizing Secretary-II' },
  { name: 'A. Raja Sekhar', designation: 'Organizing Secretary-III' },
  { name: 'Smt. M. Padma Sarma', designation: 'Organizing Secretary-IV' },
  { name: 'V. Appa Rao', designation: 'Organizing Secretary-V' },
  { name: 'K. Vidyasagar Reddy', designation: 'Treasurer' },
  { name: 'C.V.V.R. Hanuman', designation: 'Asst. Treasurer' },
  { name: 'K. Ramchand', designation: 'Advisor-I' },
  { name: 'N. Koteswara Rao', designation: 'Advisor-II' },
  { name: 'Dr. G. Nageswara Rao', designation: 'Advisor-III' },
  { name: 'Jaya Kumar', designation: 'Advisor-IV' },
  { name: 'K. Yeshwanth Kumar', designation: 'Executive Member-1' },
  { name: 'N. Sasanka Kumar', designation: 'Executive Member-2' },
  { name: 'N. Rajendra Prasad', designation: 'Executive Member-3' },
  { name: 'A. Koteswara Rao', designation: 'Executive Member-4' },
  { name: 'S. Narasimha Rao', designation: 'Executive Member-5' },
  { name: 'B. Rajeswara Rao', designation: 'Executive Member-6' },
  { name: 'Reddy Setty Prakasam', designation: 'Executive Member-7' },
  { name: 'M. Jayanta Kumar', designation: 'Executive Member-8' },
  { name: 'B. Narayana', designation: 'Executive Member-9' },
  { name: 'Nagendraiah', designation: 'Executive Member-10' },
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
  const categoryIdByCode: Record<string, string> = {};
  for (const category of DONATION_CATEGORIES) {
    const saved = await prisma.donationCategory.upsert({
      where: { code: category.code },
      update: {},
      create: category,
    });
    categoryIdByCode[category.code] = saved.id;
  }

  console.log('Seeding committee roster (27 members)...');
  for (const [index, member] of COMMITTEE_MEMBERS.entries()) {
    const displayOrder = index + 1;
    const existing = await prisma.committeeMember.findFirst({
      where: { name: member.name, designation: member.designation },
    });
    if (existing) {
      await prisma.committeeMember.update({
        where: { id: existing.id },
        data: { displayOrder },
      });
    } else {
      await prisma.committeeMember.create({
        data: { ...member, displayOrder },
      });
    }
  }

  console.log('Seeding Ashram activities/programs...');
  const ACTIVITIES = [
    {
      slug: 'vanaprasthasramam',
      titleEn: 'Vanaprasthasramam (Old Age Home)',
      descriptionEn:
        'A residential Old Age Home at Peddakonduru Village, Choutuppal Mandal, Yadadri Bhuvanagiri District, run in association with the Indian Red Cross Society since 2000, currently housing 40 residents.',
      linkedCategoryCode: 'OLD_AGE_HOME',
      displayOrder: 1,
    },
    {
      slug: 'annaprasadam',
      titleEn: 'Annaprasadam',
      descriptionEn:
        'Sponsored meal programs for residents, funded by public donations tied to personal and family occasions.',
      linkedCategoryCode: 'ANNAPRASADAM',
      displayOrder: 2,
    },
    {
      slug: 'goshala',
      titleEn: 'Goshala / Goseva',
      descriptionEn:
        'Maintenance of a cow shelter — 10 cows and 10 calves — on 2 acres of dedicated fodder-cultivation land.',
      linkedCategoryCode: 'GOSHALA',
      displayOrder: 3,
    },
    {
      slug: 'education',
      titleEn: 'Education (Vidya Daanam)',
      descriptionEn:
        'Adoption of primary schools, supply of study materials, tuition support, and funding of Vidya Volunteers.',
      linkedCategoryCode: null,
      displayOrder: 4,
    },
    {
      slug: 'medical-support',
      titleEn: 'Medical Support',
      descriptionEn:
        'Medical camps, eye camps, cataract-surgery funding, and financial aid for chronic-illness patients.',
      linkedCategoryCode: null,
      displayOrder: 5,
    },
    {
      slug: 'daily-sevas',
      titleEn: 'Daily Sevas',
      descriptionEn:
        'Prayer, meditation, yoga, bhajans, games, and walking — the residents’ daily routine.',
      linkedCategoryCode: null,
      displayOrder: 6,
    },
    {
      slug: 'wellness-centre',
      titleEn: 'Wellness Centre & Infrastructure',
      descriptionEn:
        'CCTV coverage, solar power, pure drinking water, hot water, physical fitness center, and full medical facility.',
      linkedCategoryCode: null,
      displayOrder: 7,
    },
  ];

  for (const activity of ACTIVITIES) {
    const { linkedCategoryCode, ...rest } = activity;
    await prisma.activity.upsert({
      where: { slug: activity.slug },
      update: {},
      create: {
        ...rest,
        linkedCategoryId: linkedCategoryCode ? categoryIdByCode[linkedCategoryCode] : null,
      },
    });
  }

  console.log('Seeding default site settings...');
  await prisma.siteSettings.upsert({
    where: { id: 'default' },
    update: {},
    create: {
      id: 'default',
      siteNameEn: 'Sai Yadadri Seva Ashram',
      taglineEn: 'Service to Human is Service to God',
      // Verified — docs/PROJECT_CONTEXT.md §1. Phone/email/hours are pending
      // client confirmation (documentation/16-Assumptions-and-Dependencies.md
      // D-11) and intentionally left blank rather than guessed.
      contactAddressEn: 'H.No.17-25/5/1/A, Sai Ram Nagar, Uppal, Hyderabad – 39, Telangana',
      copyrightText: `© ${new Date().getFullYear()} Sai Yadadri Seva Ashram. All rights reserved.`,
    },
  });

  console.log('Seeding bootstrap Super Admin account...');
  const superAdminEmail = process.env.SEED_SUPER_ADMIN_EMAIL || 'superadmin@sysaindia.org';
  const superAdminPassword = process.env.SEED_SUPER_ADMIN_PASSWORD || 'ChangeMe!12345';

  const existingAdmin = await prisma.adminUser.findUnique({ where: { email: superAdminEmail } });
  if (!existingAdmin) {
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
