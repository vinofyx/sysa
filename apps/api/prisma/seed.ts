/**
 * Prisma seed script — reference/verified data + one bootstrap account.
 *
 * Seeds:
 *   1. Full RBAC permission catalogue + 10-role set (Phase 4/5 instruction —
 *      supersedes the simpler 4-role matrix in documentation/10-Roles-and-Permissions.md
 *      for actual implementation; see DEVELOPMENT_PROGRESS.md)
 *   2. Donation categories with verified pricing (docs/PROJECT_CONTEXT.md §5),
 *      plus 4 additional categories sourced from Webpage.docx's "How You Can
 *      Help" section (see WEBSITE_CONTENT_AUDIT.md / WEBSITE_CONTENT_COMPLETION_REPORT.md)
 *   3. The full, correct 27-member committee roster (docs/PROJECT_CONTEXT.md §6 —
 *      sourced from COMMITTEE MEMBERS LIST.docx, not the incomplete 25-member
 *      brochure subset flagged in docs/DOCUMENT_ANALYSIS.md), with mobile
 *      numbers added from Webpage.docx (resolves the two-number conflict
 *      flagged in docs/DOCUMENT_ANALYSIS.md "Open Conflicts" §2/§3)
 *   4. The Ashram's verified programs as Activities (docs/PROJECT_CONTEXT.md §4)
 *   5. The About page content block (About Us / Vision / Mission / Founder
 *      Details), sourced verbatim from Webpage.docx — see
 *      WEBSITE_CONTENT_COMPLETION_REPORT.md
 *   6. A default SiteSettings singleton row (only verified fields populated)
 *   7. One bootstrap Super Admin account
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
  // Sourced verbatim from Webpage.docx's "How You Can Help: Next Steps" section —
  // see WEBSITE_CONTENT_AUDIT.md §7. Do not alter without client confirmation.
  {
    code: 'MEMBERSHIP',
    nameEn: 'Become a Registered Member',
    nameTe: null,
    descriptionEn:
      'Join our core network of over 100 changemakers. Monthly Support: contribute ₹3,000/- every month to sustain an inmate’s food and medicine. Quarterly/Annual Support: pool your contributions to fund seasonal medical camps or maintenance. Life Membership: make a legacy contribution of ₹1 Lakh or above to help us expand our infrastructure.',
    hasPresetTiers: true,
  },
  {
    code: 'SPONSOR_A_MEAL',
    nameEn: 'Sponsor a Special Day',
    nameTe: null,
    descriptionEn:
      'Celebrate your milestones—birthdays, weddings, anniversaries, or the memory of a loved one—by bringing joy to our residents. Sponsor a Meal: fund a single breakfast, lunch, or a full day of nutritious meals for all 40 residents. Anniversary/Memory Puja: request a day of prayers and specialized sweets distributed in honor of your family.',
    hasPresetTiers: false,
  },
  {
    code: 'ADOPT_A_STUDENT',
    nameEn: 'Adopt a Student',
    nameTe: null,
    descriptionEn:
      'Fully sponsor the annual school or college tuition fees for a verified, brilliant student from an impoverished background—ensuring that financial constraints never halt a child’s higher education.',
    hasPresetTiers: false,
  },
  {
    code: 'EMERGENCY_MEDICAL_FUND',
    nameEn: 'Emergency Medical Corpus',
    nameTe: null,
    descriptionEn:
      'Contribute directly to our medical relief fund so we can rapidly deploy financial aid to rural villagers facing critical accidents or health crises—serving as a lifeline during healthcare emergencies for impoverished outsiders.',
    hasPresetTiers: false,
  },
];

// Verified 27-member roster — docs/PROJECT_CONTEXT.md §6 (COMMITTEE MEMBERS LIST.docx),
// authoritative over the incomplete 25-member brochure photo grid. Mobile numbers
// were originally omitted (two conflicted between source documents — see
// docs/DOCUMENT_ANALYSIS.md "Open Conflicts" §2/§3) but are now sourced from
// Webpage.docx (the client-designated primary content source, see
// WEBSITE_CONTENT_AUDIT.md §2), which matches the committee-list numbers and
// resolves the conflict.
const COMMITTEE_MEMBERS = [
  { name: 'D. Ashok', designation: 'President', mobile: '9014826354' },
  { name: 'G. Appala Raju', designation: 'Vice President-I', mobile: '9490111797' },
  { name: 'A. Sudhakara Rao', designation: 'Vice President-II', mobile: '9490484819' },
  { name: 'J. Yanadi Setty', designation: 'General Secretary', mobile: '9440440213' },
  { name: 'SSG Vittal', designation: 'Joint Secretary-I', mobile: '9490148789' },
  {
    name: 'K. Rajender Kumar Reddy',
    designation: 'Joint Secretary-II',
    mobile: '6303383071',
  },
  { name: 'S. Mahesh', designation: 'Organizing Secretary-I', mobile: '9440000694' },
  { name: 'P. Vijaya Kumar', designation: 'Organizing Secretary-II', mobile: '9849555393' },
  { name: 'A. Raja Sekhar', designation: 'Organizing Secretary-III', mobile: '9948081757' },
  {
    name: 'Smt. M. Padma Sarma',
    designation: 'Organizing Secretary-IV',
    mobile: '9440000229',
  },
  { name: 'V. Appa Rao', designation: 'Organizing Secretary-V', mobile: '9490746272' },
  { name: 'K. Vidyasagar Reddy', designation: 'Treasurer', mobile: '9494941636' },
  { name: 'C.V.V.R. Hanuman', designation: 'Asst. Treasurer', mobile: '9490100066' },
  { name: 'K. Ramchand', designation: 'Advisor-I', mobile: '9490777979' },
  { name: 'N. Koteswara Rao', designation: 'Advisor-II', mobile: '9440053858' },
  { name: 'Dr. G. Nageswara Rao', designation: 'Advisor-III', mobile: '9866146095' },
  { name: 'Jaya Kumar', designation: 'Advisor-IV', mobile: '8985970242' },
  { name: 'K. Yeshwanth Kumar', designation: 'Executive Member-1', mobile: '9490282424' },
  { name: 'N. Sasanka Kumar', designation: 'Executive Member-2', mobile: '9440000578' },
  { name: 'N. Rajendra Prasad', designation: 'Executive Member-3', mobile: '9490190155' },
  { name: 'A. Koteswara Rao', designation: 'Executive Member-4', mobile: '7382311911' },
  { name: 'S. Narasimha Rao', designation: 'Executive Member-5', mobile: '9490129919' },
  { name: 'B. Rajeswara Rao', designation: 'Executive Member-6', mobile: '9440000550' },
  { name: 'Reddy Setty Prakasam', designation: 'Executive Member-7', mobile: '9849102590' },
  { name: 'M. Jayanta Kumar', designation: 'Executive Member-8', mobile: '9440400154' },
  { name: 'B. Narayana', designation: 'Executive Member-9', mobile: '8247884380' },
  { name: 'Nagendraiah', designation: 'Executive Member-10', mobile: '9440351480' },
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
        data: { displayOrder, mobile: member.mobile },
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
      // Exact tagline text — Webpage.docx (see WEBSITE_CONTENT_AUDIT.md §1 item 4).
      taglineEn: '“Maanava Saevayae Madhava Saeva “- “Service to Humanity is Service to God”',
      // Logo image embedded in Webpage.docx, saved to apps/web/public/logo.png —
      // see WEBSITE_CONTENT_AUDIT.md §1 item 2.
      logoUrl: '/logo.png',
      // Verified — docs/PROJECT_CONTEXT.md §1. Phone/email/hours are pending
      // client confirmation (documentation/16-Assumptions-and-Dependencies.md
      // D-11) and intentionally left blank rather than guessed.
      contactAddressEn: 'H.No.17-25/5/1/A, Sai Ram Nagar, Uppal, Hyderabad – 39, Telangana',
      copyrightText: `© ${new Date().getFullYear()} Sai Yadadri Seva Ashram. All rights reserved.`,
    },
  });

  console.log('Seeding About page content (Webpage.docx)...');
  // Sourced verbatim from Webpage.docx — see WEBSITE_CONTENT_AUDIT.md items 5, 9,
  // 10, 11. `historyEn`/`treasurerMessageEn` are intentionally left out: the
  // document's own "HISTORY" and "TREASURERS MESSAGE" rows have no body text,
  // so there is nothing to seed without fabricating content.
  const ABOUT_BLOCKS_EN: Record<string, string> = {
    aboutEn: `
<p>Sai Yadadri Seva Ashramam Driven by the sacred philosophy "Service to Humanity is Service to God," Sai Yadadri Seva Ashramam is a registered social service organisation dedicated to restoring dignity, health, and hope to the most vulnerable sections of society. Our core mission is to provide an absolute haven—ensuring free shelter, nutritious food, and comprehensive medical care—to destitute senior citizens, orphans, physically challenged individuals, and mentally ill people.</p>
<h3>Our Journey &amp; Genesis</h3>
<p>The seeds of our mission were sown in 2019 by Sri Debbadi Ashok, a visionary BSNL Executive who was already running a successful old age home in Sai Lingi Village, Adilabad District. Seeking to expand this vital safety net, he partnered with a compassionate group of like-minded BSNL employees (both working and retired) and civic-minded citizens to establish the Hyderabad chapter.</p>
<p>What began with a handful of visionary founders has blossomed into a robust, transparent network of over more than 100 dedicated members working in unison for social good.</p>
<h3>Our Sanctuary</h3>
<p>Since February 2020, our Free Old Age Home has been operating at its full capacity of 40 permanent residents. The facility is located in a peaceful environment at Pedakonduru Village, Choutuppal Mandal (Yadadri Bhuvanagiri District). This sanctuary thrives inside a generous building donated by the benevolent couple, Smt. &amp; Sri Mayreddi Satyanarayana Reddy &amp; Janakamma.</p>
<h3>Beyond the Shelter: Our Pillars of Service</h3>
<p>While our residential home remains our cornerstone, our vision extends deeply into community empowerment through three distinct pillars:</p>
<ul>
<li><strong>Holistic Residential Care:</strong> Providing a safe, clean, and affectionate environment where senior citizens and disabled individuals receive 24/7 care, standard medical monitoring, and balanced meals completely free of cost.</li>
<li><strong>Empowering the Next Generation:</strong> Breaking the cycle of poverty by identifying bright, underprivileged students and completely sponsoring their school or college fees, ensuring that financial constraints never halt a child's higher education.</li>
<li><strong>Emergency Medical Relief:</strong> Serving as a lifeline during healthcare crises. We step in with immediate financial and logistical aid for impoverished outsiders facing sudden medical emergencies—such as our recent critical outreach supporting Sri Venkatesam from Ravanpalli Village.</li>
</ul>
<h3>Sustainability &amp; Transparency</h3>
<p>Our operations are fueled purely by the spirit of collective giving. The initial setup was funded by our core founders who contributed lump sums of ₹1 Lakh and above. Today, our daily operations run seamlessly due to the structured, transparent contributions of our members, who donate on a flexible monthly, quarterly, or annual basis.</p>
<h3>How You Can Help: Next Steps</h3>
<p>We cannot do this alone. Your kindness can secure a safe tomorrow for someone in deep distress. Explore the ways you can seamlessly connect with us and support our mission today:</p>
<h4>1. Become a Registered Member</h4>
<p>Join our core network of over 100 changemakers. You can support our daily operational expenses by choosing a subscription structure that fits your comfort:</p>
<ul>
<li><strong>Monthly Support:</strong> Contribute ₹3,000/- every month to sustain an inmate's food and medicine.</li>
<li><strong>Quarterly/Annual Support:</strong> Pool your contributions to fund seasonal medical camps or maintenance.</li>
<li><strong>Life Membership:</strong> Make a legacy contribution of ₹1 Lakh or above to help us expand our infrastructure.</li>
</ul>
<h4>2. Sponsor a Special Day</h4>
<p>Celebrate your milestones—birthdays, weddings, anniversaries, or the memory of a loved one—by bringing joy to our residents:</p>
<ul>
<li><strong>Sponsor a Meal:</strong> Fund a single breakfast, lunch, or a full day of nutritious meals for all 40 residents.</li>
<li><strong>Anniversary/Memory Puja:</strong> Request a day of prayers and specialized sweets distributed in honor of your family.</li>
</ul>
<h4>3. Support Education &amp; Emergency Medical Funds</h4>
<p>Direct your generosity towards targeted community relief outside the ashram boundaries:</p>
<ul>
<li><strong>Adopt a Student:</strong> Fully sponsor the annual school or college tuition fees for a verified, brilliant student from an impoverished background.</li>
<li><strong>Emergency Medical Corpus:</strong> Contribute directly to our medical relief fund so we can rapidly deploy financial aid to rural villagers facing critical accidents or health crises.</li>
</ul>
<h4>4. Visit Us &amp; Volunteer</h4>
<p>We welcome individuals, families, and corporate groups to visit our Pedakonduru Village campus. Spend quality time interacting with the senior citizens, helping out at our Gaushala, or organizing an entertainment/cultural program for the residents. Your time and presence mean the world to them.</p>
`.trim(),
    visionEn: `
<h3>Senior Citizen Care &amp; Support</h3>
<p>To cultivate a society where every senior citizen lives with absolute dignity, vibrant health, and a deep sense of belonging, transforming their golden years from simple survival into active, celebrated community leadership.</p>
<h3>Transformative Education &amp; Learning</h3>
<p>To democratize lifelong learning, dismantling educational barriers so that individuals of all ages can unlock their full intellectual potential and achieve sustainable career mobility.</p>
<h3>Medical Support &amp; Preventive Health</h3>
<p>To build a resilient community where healthcare is a universal right, empowering individuals to break free from the cycle of medical poverty through proactive, compassionate care.</p>
`.trim(),
    missionEn: `
<h3>Senior Citizen Care &amp; Support</h3>
<ul>
<li>Create structured, daily community touch points to completely eliminate loneliness and depression among aging populations.</li>
<li>Deliver localized home-care systems that ensure elders remain self-sufficient and safe in their own living spaces.</li>
<li>Launch active storytelling and mentorship forums to systematically transfer generational wisdom from elders to youth.</li>
</ul>
<h3>Transformative Education &amp; Learning</h3>
<p>To dismantling educational barriers so that individuals can unlock their full intellectual potential and achieve sustainable career mobility.</p>
<h3>🏥 Pillar 3: Medical Support</h3>
<p>Extending medical support to the Senior Citizens and Rural Population by establishing Health Care Centers, Conducting Medical Camps, Providing Free Medicines to the needy and referring the chronic cases to the Corporate Sector for their timely help.</p>
`.trim(),
    founderBioEn: `
<ul>
<li>Sri Debbadi Ashok, Founder President.</li>
<li>Sri Appalaraju, Vice President.</li>
<li>Sri J. Yanadi Setty, General Secretary.</li>
<li>Sri K. Vidya Sagar Reddy, Treasurer.</li>
<li>Sri S. Mahesh, Organizing Secretary.</li>
</ul>
`.trim(),
  };

  const existingAboutContent = await prisma.pageContent.findUnique({
    where: { pageKey: 'about' },
  });
  if (!existingAboutContent) {
    await prisma.pageContent.create({
      data: { pageKey: 'about', blocksEn: ABOUT_BLOCKS_EN },
    });
  }

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
