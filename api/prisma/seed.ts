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
 *   7. The header/footer navigation menu (upsert-on-fixed-id, matching the
 *      verified data already captured in website/src/content/site.ts's
 *      static-export snapshot — CMS-managed thereafter, never re-seeded
 *      once an admin edits it)
 *   8. One bootstrap Super Admin account
 *
 * Run via: npm run prisma:seed --workspace=api
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
  {
    code: 'MONTHLY_CONTRIBUTION',
    nameEn: 'Monthly Contribution',
    nameTe: null,
    descriptionEn:
      'A recurring monthly seva contribution — support the Ashram’s ongoing work with a fixed amount every month, either paid manually each time or authorized as an automatic recurring payment.',
    hasPresetTiers: true,
  },
];

// Verified 27-member roster — docs/PROJECT_CONTEXT.md §6 (COMMITTEE MEMBERS LIST.docx),
// authoritative over the incomplete 25-member brochure photo grid. Mobile numbers
// were originally omitted (two conflicted between source documents — see
// docs/DOCUMENT_ANALYSIS.md "Open Conflicts" §2/§3) but are now sourced from
// Webpage.docx (the client-designated primary content source, see
// WEBSITE_CONTENT_AUDIT.md §2), which matches the committee-list numbers and
// resolves the conflict.
// `photoUrl` points at the real committee headshots in
// `website/public/images/real/committee-*.jpg` (Nagendraiah's file is a
// `.png` — the source image was mislabeled `.jpg` and was renamed to match
// its real format).
const COMMITTEE_MEMBERS = [
  {
    name: 'D. Ashok',
    designation: 'President',
    mobile: '9014826354',
    photoUrl: '/images/real/committee-d-ashok.jpg',
  },
  {
    name: 'G. Appala Raju',
    designation: 'Vice President-I',
    mobile: '9490111797',
    photoUrl: '/images/real/committee-g-appala-raju.jpg',
  },
  {
    name: 'A. Sudhakara Rao',
    designation: 'Vice President-II',
    mobile: '9490484819',
    photoUrl: '/images/real/committee-a-sudhakara-rao.jpg',
  },
  {
    name: 'J. Yanadi Setty',
    designation: 'General Secretary',
    mobile: '9440440213',
    photoUrl: '/images/real/committee-j-yanadi-setty.jpg',
  },
  {
    name: 'SSG Vittal',
    designation: 'Joint Secretary-I',
    mobile: '9490148789',
    photoUrl: '/images/real/committee-ssg-vithal.jpg',
  },
  {
    name: 'K. Rajender Kumar Reddy',
    designation: 'Joint Secretary-II',
    mobile: '6303383071',
    photoUrl: '/images/real/committee-k-rajender-kumar-reddy.jpg',
  },
  {
    name: 'S. Mahesh',
    designation: 'Organizing Secretary-I',
    mobile: '9440000694',
    photoUrl: '/images/real/committee-s-mahesh.jpg',
  },
  {
    name: 'P. Vijaya Kumar',
    designation: 'Organizing Secretary-II',
    mobile: '9849555393',
    photoUrl: '/images/real/committee-p-vijaya-kumar.jpg',
  },
  {
    name: 'A. Raja Sekhar',
    designation: 'Organizing Secretary-III',
    mobile: '9948081757',
    photoUrl: '/images/real/committee-a-raja-sekhar.jpg',
  },
  {
    name: 'Smt. M. Padma Sarma',
    designation: 'Organizing Secretary-IV',
    mobile: '9440000229',
    photoUrl: '/images/real/committee-smt-m-padma-sarma.jpg',
  },
  {
    name: 'V. Appa Rao',
    designation: 'Organizing Secretary-V',
    mobile: '9490746272',
    photoUrl: '/images/real/committee-v-appa-rao.jpg',
  },
  {
    name: 'K. Vidyasagar Reddy',
    designation: 'Treasurer',
    mobile: '9494941636',
    photoUrl: '/images/real/committee-k-vidyasagar-reddy.jpg',
  },
  {
    name: 'C.V.V.R. Hanuman',
    designation: 'Asst. Treasurer',
    mobile: '9490100066',
    photoUrl: '/images/real/committee-c-v-v-r-hanuman.jpg',
  },
  {
    name: 'K. Ramchand',
    designation: 'Advisor-I',
    mobile: '9490777979',
    photoUrl: '/images/real/committee-k-ramchand.jpg',
  },
  {
    name: 'N. Koteswara Rao',
    designation: 'Advisor-II',
    mobile: '9440053858',
    photoUrl: '/images/real/committee-n-koteswara-rao.jpg',
  },
  {
    name: 'Dr. G. Nageswara Rao',
    designation: 'Advisor-III',
    mobile: '9866146095',
    photoUrl: '/images/real/committee-dr-g-nageswara-rao.jpg',
  },
  {
    name: 'Jaya Kumar',
    designation: 'Advisor-IV',
    mobile: '8985970242',
    photoUrl: '/images/real/committee-jaya-kumar.jpg',
  },
  {
    name: 'K. Yeshwanth Kumar',
    designation: 'Executive Member-1',
    mobile: '9490282424',
    photoUrl: '/images/real/committee-k-yeshwanth-kumar.jpg',
  },
  {
    name: 'N. Sasanka Kumar',
    designation: 'Executive Member-2',
    mobile: '9440000578',
    photoUrl: '/images/real/committee-n-sasanka-kumar.jpg',
  },
  {
    name: 'N. Rajendra Prasad',
    designation: 'Executive Member-3',
    mobile: '9490190155',
    photoUrl: '/images/real/committee-n-rajendra-prasad.jpg',
  },
  {
    name: 'A. Koteswara Rao',
    designation: 'Executive Member-4',
    mobile: '7382311911',
    photoUrl: '/images/real/committee-a-koteswara-rao.jpg',
  },
  {
    name: 'S. Narasimha Rao',
    designation: 'Executive Member-5',
    mobile: '9490129919',
    photoUrl: '/images/real/committee-s-narasimha-rao.jpg',
  },
  {
    name: 'B. Rajeswara Rao',
    designation: 'Executive Member-6',
    mobile: '9440000550',
    photoUrl: '/images/real/committee-b-rajeswara-rao.jpg',
  },
  {
    name: 'Reddy Setty Prakasam',
    designation: 'Executive Member-7',
    mobile: '9849102590',
    photoUrl: '/images/real/committee-reddy-setty-prakasam.jpg',
  },
  {
    name: 'M. Jayanta Kumar',
    designation: 'Executive Member-8',
    mobile: '9440400154',
    photoUrl: '/images/real/committee-m-jayanta-kumar.jpg',
  },
  {
    name: 'B. Narayana',
    designation: 'Executive Member-9',
    mobile: '8247884380',
    photoUrl: '/images/real/committee-b-narayana.jpg',
  },
  {
    name: 'M. Nagendraiah',
    designation: 'Executive Member-10',
    mobile: '9440351480',
    photoUrl: '/images/real/committee-m-nagendraiah.png',
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
        data: { displayOrder, mobile: member.mobile, photoUrl: member.photoUrl ?? null },
      });
    } else {
      await prisma.committeeMember.create({
        data: { ...member, displayOrder },
      });
    }
  }

  console.log('Seeding Ashram activities/programs...');
  // Descriptions sourced from docs/PROJECT_CONTEXT.md §4 ("Facilities & Programs"),
  // itself traced to the client's brochure PDF (docs/SAI YADADRI SEVA
  // ASHRAM_Broucher_26-08-2025.pdf, see docs/DOCUMENT_ANALYSIS.md §1) and
  // confirmed already-verified (not invented) in WEBSITE_CONTENT_AUDIT.md §1
  // item 14. Pricing tiers folded into annaprasadam/goshala are the same
  // verified figures already seeded on the linked DonationCategory rows below
  // (ANNAPRASADAM/GOSHALA) — duplicated here in plain prose since the public
  // Activity→DonationCategory type intentionally omits the category's own
  // descriptionEn (see website/src/types/public.ts `DonationCategoryRef`).
  //
  // vanaprasthasramam previously said "...since 2000" — that year conflicts
  // with the About page's "Since February 2020, our free Old Age Home has
  // operated at full capacity" (ABOUT_BLOCKS_EN.aboutEn/historyEn above,
  // itself sourced from Webpage.docx). Both are independently verified client
  // documents describing what may be two different things (the property's
  // 2000 founding by the donor couple Sri Mayreddi Satyanarayana Reddy & Smt.
  // Janakamma — see docs/PROJECT_CONTEXT.md §4 — vs. the Ashram's free-care
  // operation reaching full capacity in 2020), but this was never reconciled
  // by the client. Per explicit instruction: do not guess which is correct —
  // the year is omitted entirely below; only the undisputed Indian Red Cross
  // Society association (verified independently, no year attached) is kept.
  // CONTENT REQUIRES VERIFICATION: confirm the correct operating-since year
  // with the organization before publishing one.
  const ACTIVITIES = [
    {
      slug: 'vanaprasthasramam',
      titleEn: 'Vanaprasthasramam (Old Age Home)',
      iconOrImageUrl: '/images/real/residents-activities.jpg',
      descriptionEn: `
<p>Vanaprasthasramam is the residential Old Age Home of Sai Yadadri Seva Ashramam, located at Peddakonduru Village, Choutuppal Mandal, Yadadri Bhuvanagiri District. The home is run in association with the Indian Red Cross Society and currently supports 40 residents, providing them with a safe and caring residential environment.</p>
<h2>A Home Built on Care, Companionship and Respect</h2>
<p>Vanaprasthasramam strives to provide poor elderly people with a supportive environment where their everyday needs are cared for with dignity and compassion. The home brings together essential residential care, nourishment, companionship and wellbeing support, helping residents experience a sense of belonging and community.</p>
<h2>Supporting Everyday Life with Care</h2>
<p>The Ashram provides essential support to help residents live with comfort, dignity and a sense of community.</p>
<ul>
<li><strong>Residential Accommodation:</strong> A dedicated residential environment where residents can live with care and support.</li>
<li><strong>Nutritious Meals:</strong> Regular nutritious meals to support the everyday wellbeing of residents.</li>
<li><strong>Daily Care &amp; Support:</strong> Day-to-day care and assistance focused on the needs and wellbeing of residents.</li>
<li><strong>Companionship &amp; Community:</strong> Opportunities for residents to interact, spend time together and experience a sense of belonging.</li>
<li><strong>Health &amp; Wellbeing Support:</strong> Support focused on maintaining the health, wellbeing and quality of everyday life of residents.</li>
</ul>
<h2>A Meaningful Daily Routine</h2>
<p>Life at Vanaprasthasramam is shaped around a simple and meaningful daily routine. Residents take part in prayer, meditation, yoga, bhajans, games and morning and evening walks. These activities encourage positive engagement, companionship and a sense of purpose in everyday life.</p>
<h2>A Community of 40 Residents</h2>
<p>The home currently supports 40 residents. Beyond providing accommodation, Vanaprasthasramam seeks to create an environment where residents can spend their days with companionship, care and dignity.</p>
<h2>Your Support Helps Us Continue This Seva</h2>
<p>Your support can help Sai Yadadri Seva Ashramam continue providing care, nourishment, companionship and wellbeing support to the residents of Vanaprasthasramam. Every contribution becomes a meaningful part of this service.</p>
<p><em>At Vanaprasthasramam, care is expressed through everyday acts of kindness, companionship and service.</em></p>
`.trim(),
      linkedCategoryCode: 'OLD_AGE_HOME',
      displayOrder: 1,
    },
    {
      slug: 'annaprasadam',
      titleEn: 'Annaprasadam',
      iconOrImageUrl: '/images/real/annaprasadam-hall.jpg',
      descriptionEn: `
<p><em>Sharing Food. Sharing Care. Serving with Love.</em></p>
<p>Annaprasadam is a simple and meaningful way to serve the residents of Sai Yadadri Seva Ashramam. Individuals and families can sponsor nutritious meals on birthdays, anniversaries, memorial days and other special family occasions, turning personal moments into opportunities for selfless service.</p>
<h2>A Meal Offered with Love</h2>
<p>At Sai Yadadri Seva Ashramam, Annaprasadam represents more than providing a meal. It is an expression of care, dignity and togetherness. Through the support of individuals and families, meals are sponsored for the residents of the Ashram, creating a meaningful connection between special occasions and the spirit of seva.</p>
<h2>How You Can Sponsor</h2>
<p>You can dedicate a meal in honour of a special occasion or loved one and make your celebration a meaningful act of service.</p>
<ul>
<li><strong>Lunch Sponsorship — ₹3,000:</strong> Sponsor lunch for the residents of the Ashram as an act of care and seva.</li>
<li><strong>Full Day Meal Sponsorship — ₹5,000:</strong> Sponsor the day's meals for the residents and turn a special occasion into a complete day of service.</li>
<li><strong>Life Membership — ₹51,000:</strong> A life membership that allows you to sponsor two occasions each year for life.</li>
</ul>
<h2>Make Your Special Day Meaningful</h2>
<p>Celebrate your important moments by sharing them with the residents of the Ashram.</p>
<ul>
<li>Birthdays</li>
<li>Wedding Anniversaries</li>
<li>Memorial Days</li>
<li>Family Occasions</li>
<li>Other Special Days</li>
</ul>
<h2>Why Annaprasadam Matters</h2>
<p>A nutritious meal is more than food — it is an expression of care, dignity and community. Annaprasadam brings donors and residents together through a simple, heartfelt act of service and allows special occasions to become moments of sharing and compassion.</p>
<h2>Share a Meal. Share Your Blessings.</h2>
<p>Your support helps us continue providing meals to the residents of Sai Yadadri Seva Ashramam. Make your next special occasion an opportunity to serve, share and bring warmth to someone else's day.</p>
`.trim(),
      linkedCategoryCode: 'ANNAPRASADAM',
      displayOrder: 2,
    },
    {
      slug: 'goshala',
      titleEn: 'Goshala / Goseva',
      iconOrImageUrl: '/images/real/goshala-goseva.jpg',
      descriptionEn: `
<p><em>Serving with Compassion. Caring with Devotion.</em></p>
<p>Sai Yadadri Seva Ashramam maintains a dedicated cow shelter caring for 10 cows and 10 calves, supported by approximately 2 acres of land dedicated to fodder cultivation (Gograsam).</p>
<h2>A Dedicated Space for Goseva</h2>
<p>The Ashram's Goshala provides a dedicated space for the care and well-being of its cows and calves. The Goshala is supported by approximately 2 acres of land used for fodder (Gograsam) cultivation, helping provide the resources needed for their daily care.</p>
<h2>What Goseva Involves</h2>
<p>Goseva is expressed through consistent daily care, responsible maintenance and the cultivation of fodder for the animals.</p>
<ul>
<li><strong>Daily Feeding &amp; Care:</strong> Providing regular food and attentive daily care for the cows and calves.</li>
<li><strong>Shelter Maintenance:</strong> Maintaining a clean, safe and suitable shelter for the animals.</li>
<li><strong>Fodder Cultivation:</strong> Cultivating fodder on approximately 2 acres of dedicated land for Gograsam.</li>
<li><strong>Clean &amp; Safe Surroundings:</strong> Keeping the Goshala surroundings clean and safe for the animals.</li>
</ul>
<h2>Visit and Participate</h2>
<p>Members of the public are welcome to visit the Goshala, take part in Goseva or offer Gograsam directly. Your participation can become a simple and meaningful expression of service.</p>
<h2>Milk &amp; Goshala By-products</h2>
<p>The milk and by-products from the Goshala are utilized for the Ashram's needs and service activities, as part of a self-sustaining approach to caring for the community.</p>
<h2>Support Our Goshala</h2>
<p>Donations are gratefully accepted for the maintenance and welfare of the Ashram's Goshala. Contributions help support the care, feeding and day-to-day needs of the cows through the following options.</p>
<ul>
<li><strong>Daily Goseva — ₹516:</strong> Support the daily care of the cows and calves.</li>
<li><strong>Monthly Goseva — ₹5,116:</strong> Provide regular monthly support towards Goshala care.</li>
<li><strong>Monthly Goseva — ₹11,116:</strong> Provide enhanced monthly support towards the continued care and maintenance of the Goshala.</li>
</ul>
<h2>Support Goseva</h2>
<p>Your support helps Sai Yadadri Seva Ashramam continue the daily care, shelter maintenance and fodder cultivation that sustain the Goshala. Offer your support and become part of this ongoing seva.</p>
`.trim(),
      linkedCategoryCode: 'GOSHALA',
      displayOrder: 3,
    },
    {
      slug: 'education',
      titleEn: 'Education (Vidya Daanam)',
      iconOrImageUrl: '/images/real/education-outreach.jpg',
      descriptionEn: `
<p><em>Supporting Learning. Creating Opportunities.</em></p>
<p>Sai Yadadri Seva Ashramam supports education through school support, study materials, tuition assistance and Vidya Volunteers, helping reduce the financial barriers that can prevent children and students from accessing learning opportunities.</p>
<h2>Education as a Path to Opportunity</h2>
<p>The Ashram believes that financial circumstances should not become a barrier to learning. Through education-focused initiatives, the Ashram supports students and schools with learning materials, academic assistance and targeted financial support.</p>
<h2>Our Education Initiatives</h2>
<ul>
<li><strong>Primary School Support:</strong> Supporting primary schools with resources that help create better learning opportunities for children.</li>
<li><strong>Learning Materials:</strong> Providing essential educational materials such as books, school bags and stationery to students who need support.</li>
<li><strong>Subject-Based Tuition:</strong> Retired professional members contribute their knowledge by providing tuition in subjects such as Mathematics and Science to senior students.</li>
<li><strong>Higher Education Support:</strong> Providing tuition-fee support to students from underprivileged backgrounds who are pursuing higher education.</li>
<li><strong>Vidya Volunteer Support:</strong> Funding Vidya Volunteers who contribute their time and teaching support at schools that are under-staffed.</li>
</ul>
<h2>Become a Vidya Volunteer</h2>
<p>Education is strengthened when people share their knowledge, time and skills. If you have the willingness, knowledge or skills to support learning, consider contributing as a Vidya Volunteer and help students receive additional academic support.</p>
<h2>Adopt a Student</h2>
<p>Your support can help provide educational assistance to students from underprivileged backgrounds and contribute towards reducing the financial barriers to their education.</p>
<h2>Give the Gift of Education</h2>
<p>Every contribution towards education can help create access to learning opportunities. Support Vidya Daanam and help us continue this work.</p>
`.trim(),
      linkedCategoryCode: 'ADOPT_A_STUDENT',
      displayOrder: 4,
    },
    {
      slug: 'medical-support',
      titleEn: 'Medical Support',
      iconOrImageUrl: '/images/real/medical-camp.jpg',
      descriptionEn: `
<p><em>Extending Care When It Matters Most.</em></p>
<p>Sai Yadadri Seva Ashramam extends support to people facing healthcare challenges through medical camps, eye-testing camps, financial assistance for chronic illness, and support for essential medicines and medical infrastructure.</p>
<h2>Care, Compassion and Practical Support</h2>
<p>Healthcare needs can place a significant financial and emotional burden on vulnerable individuals and families. Through its medical support initiatives, the Ashram seeks to provide practical assistance to people who may otherwise struggle to meet essential healthcare needs.</p>
<h2>Our Medical Support Initiatives</h2>
<ul>
<li><strong>Medical Camps:</strong> Organising medical camps to extend basic healthcare support to people who need it.</li>
<li><strong>Eye-Testing Camps:</strong> Supporting eye-testing camps to help people access basic eye-care services.</li>
<li><strong>Animal Husbandry Camps:</strong> Supporting animal husbandry camps as part of the Ashram's broader community service initiatives.</li>
<li><strong>Cataract-Surgery Assistance:</strong> Providing assistance towards cataract surgery where support is needed.</li>
<li><strong>Chronic-Illness Assistance:</strong> Providing financial assistance to people facing the ongoing challenges associated with chronic illness.</li>
<li><strong>Medicines &amp; Medical Infrastructure:</strong> Supporting essential medicines and medical infrastructure for people and communities in need.</li>
</ul>
<h2>Community Health Support</h2>
<p>Healthcare needs can place a significant burden on vulnerable families, especially when essential treatment, medicines or medical support become difficult to afford. These initiatives are intended to provide practical assistance and help people facing urgent or ongoing healthcare challenges.</p>
<h2>Emergency Medical Corpus</h2>
<p>The Emergency Medical Corpus enables the Ashram to extend targeted financial support towards urgent medical needs and healthcare challenges faced by people in need.</p>
<h2>Help Us Continue This Seva</h2>
<p>Your support helps Sai Yadadri Seva Ashramam continue providing medical assistance, essential medicines and community health support to people facing healthcare challenges.</p>
`.trim(),
      linkedCategoryCode: 'EMERGENCY_MEDICAL_FUND',
      displayOrder: 5,
    },
    {
      slug: 'daily-sevas',
      titleEn: 'Daily Sevas',
      iconOrImageUrl: '/images/real/dailyseva.png',
      descriptionEn: `
<p><em>A Daily Rhythm of Prayer, Care and Togetherness.</em></p>
<p>Life at Sai Yadadri Seva Ashramam includes daily activities that support the physical, emotional and spiritual wellbeing of residents. These simple routines bring structure, companionship, recreation and opportunities for devotion into everyday life.</p>
<h2>Life at the Ashram</h2>
<p>The Ashram is more than a residence. It is a community where everyday moments are shared through prayer, reflection, recreation and companionship. Our daily routine encourages residents to remain engaged, connected and supported while creating a peaceful rhythm of life.</p>
<h2>Our Daily Routine</h2>
<p>Each activity contributes to a balanced and meaningful daily routine for the residents.</p>
<ul>
<li><strong>Prayer:</strong> Time for spiritual reflection, devotion and quiet connection with the Divine.</li>
<li><strong>Meditation:</strong> Encouraging moments of calm, reflection and inner wellbeing.</li>
<li><strong>Yoga:</strong> A part of the daily routine that supports movement and physical wellbeing.</li>
<li><strong>Bhajans:</strong> Devotional singing that brings residents together through prayer and community participation.</li>
<li><strong>Games:</strong> Recreation and social interaction that bring moments of enjoyment and togetherness.</li>
<li><strong>Walking:</strong> Morning and evening walks form part of the residents' regular daily routine.</li>
</ul>
<h2>A Community, Not Just a Residence</h2>
<p>These everyday activities help create a sense of routine, companionship and belonging for residents. From beginning the day with prayer to sharing time through bhajans, games and walks, each activity becomes part of a community built around care and togetherness.</p>
<h2>Seva in Everyday Life</h2>
<p>At Sai Yadadri Seva Ashramam, daily life is guided by the spirit of Maanava Sevaaye Madhava Seva — Service to Humanity is Service to God. Prayer, devotion, companionship and care come together as part of the Ashram's continuing journey of seva.</p>
<h2>Every Day, A Little More Together</h2>
<p>A meaningful routine is built through simple moments shared with others. Your support helps us continue this work and nurture a community where care, devotion and companionship remain part of everyday life.</p>
`.trim(),
      linkedCategoryCode: null,
      displayOrder: 6,
    },
    {
      slug: 'wellness-centre',
      titleEn: 'Wellness Centre & Infrastructure',
      iconOrImageUrl: '/images/real/fitness-room.jpg',
      descriptionEn: `
<p><em>Creating a Safe, Supportive and Comfortable Environment.</em></p>
<p>A caring environment also depends on safe, reliable infrastructure. The facilities at Sai Yadadri Seva Ashramam are intended to support the daily needs, comfort and wellbeing of residents.</p>
<h2>Wellness Centre Activities</h2>
<p>The Ashram's Wellness Centre provides opportunities for people to focus on physical well-being, healthy living and holistic wellness through supportive and community-oriented activities.</p>
<h2>A Place Designed for Everyday Wellbeing</h2>
<p>The Ashram seeks to provide residents with an environment where essential needs are supported and everyday life can be lived with greater comfort and dignity. From basic utilities to spaces for physical activity and meditation, the available facilities form an important part of the Ashram's residential care.</p>
<h2>Our Facilities</h2>
<p>The Ashram's infrastructure includes essential facilities that support the daily lives and wellbeing of residents.</p>
<ul>
<li><strong>CCTV Coverage:</strong> CCTV coverage forms part of the Ashram's infrastructure and supports the residential environment.</li>
<li><strong>Solar Power:</strong> Solar power is part of the Ashram's infrastructure and supports its everyday energy needs.</li>
<li><strong>Pure Drinking Water:</strong> Access to pure drinking water supports an essential daily need for residents.</li>
<li><strong>Hot Water:</strong> Hot water facilities are available to support the everyday needs of residents.</li>
<li><strong>Physical Fitness Centre:</strong> A dedicated physical fitness centre provides space for residents to engage in physical activity.</li>
<li><strong>Meditation Space:</strong> A dedicated meditation space provides an environment for quiet reflection and spiritual practice.</li>
<li><strong>Television Access:</strong> Television access is available on each floor, providing residents with opportunities for recreation and engagement.</li>
<li><strong>Health-Related Support:</strong> Health-related support forms part of the Ashram's broader care activities for residents.</li>
</ul>
<h2>Supporting Body, Mind and Everyday Life</h2>
<p>The Ashram's facilities are intended to support different aspects of residential life — from essential daily requirements to opportunities for physical activity, quiet reflection and recreation. Together, these facilities contribute to an environment focused on care, comfort and dignity.</p>
<h2>Help Us Strengthen Our Facilities</h2>
<p>Maintaining a caring residential environment requires ongoing attention to essential infrastructure and facilities. Donations and community support help the Ashram maintain and improve the resources needed to provide residents with a safe and comfortable environment.</p>
<h2>A Better Environment for Everyday Life</h2>
<p>Every facility, whether essential or supportive, contributes to creating a place where residents can feel cared for and comfortable. Your support helps us continue this work.</p>
`.trim(),
      linkedCategoryCode: null,
      displayOrder: 7,
    },
    {
      slug: 'awareness-programmes',
      titleEn: 'Awareness Programmes',
      iconOrImageUrl: '/images/illustrations/awareness-programmes.jpg',
      descriptionEn: `
<p><em>Sharing Knowledge. Supporting Well-being.</em></p>
<p>Awareness programmes are conducted for inmates and beneficiaries of the Ashram on important areas including health, spirituality, yoga and holistic well-being.</p>
<h2>What Our Awareness Programmes Cover</h2>
<ul>
<li><strong>Health Awareness:</strong> Sessions to help residents and beneficiaries understand and look after their everyday health needs.</li>
<li><strong>Spiritual Awareness:</strong> Opportunities for reflection and learning rooted in the Ashram's spiritual values.</li>
<li><strong>Yoga &amp; Wellness:</strong> Guidance on yoga and wellness practices that support physical and mental well-being.</li>
<li><strong>Healthy Living:</strong> Practical guidance on habits that support a healthier, more balanced everyday life.</li>
<li><strong>Personal Well-being:</strong> Support focused on the emotional and personal well-being of residents and beneficiaries.</li>
<li><strong>Positive &amp; Purposeful Living:</strong> Encouragement towards a positive, purposeful and dignified way of life.</li>
</ul>
<h2>Learning as an Act of Care</h2>
<p>By bringing knowledge and guidance directly to those in our care, these programmes seek to support not only physical health but also emotional and spiritual well-being.</p>
<h2>Help Us Continue This Seva</h2>
<p>Your support helps Sai Yadadri Seva Ashramam continue conducting awareness programmes for the residents and beneficiaries who rely on our care.</p>
`.trim(),
      linkedCategoryCode: null,
      displayOrder: 8,
    },
    {
      slug: 'spiritual-tours',
      titleEn: 'Spiritual Tours',
      iconOrImageUrl: '/images/illustrations/spiritual-tours.jpg',
      descriptionEn: `
<p><em>Journeys of Devotion and Fellowship.</em></p>
<p>Spiritual tours are conducted to provide devotees and members with opportunities for spiritual reflection, devotion, fellowship and meaningful experiences.</p>
<h2>A Shared Journey of Devotion</h2>
<p>These tours bring devotees, members and volunteers together, allowing the spirit of community and seva to extend beyond the Ashram's daily activities and into shared moments of faith.</p>
<h2>Why Spiritual Tours Matter</h2>
<p>Spiritual tours offer a space for quiet reflection, renewed devotion and fellowship among those who share the Ashram's values, strengthening the sense of community that sustains its wider service.</p>
<h2>Help Us Continue This Seva</h2>
<p>Your support helps Sai Yadadri Seva Ashramam continue organising spiritual tours that bring devotion, reflection and fellowship to our community.</p>
`.trim(),
      linkedCategoryCode: null,
      displayOrder: 9,
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
      // Logo image embedded in Webpage.docx, saved to website/public/logo.png —
      // see WEBSITE_CONTENT_AUDIT.md §1 item 2.
      logoUrl: '/logo.png',
      // Verified — docs/PROJECT_CONTEXT.md §1. Phone/email/hours are pending
      // client confirmation (documentation/16-Assumptions-and-Dependencies.md
      // D-11) and intentionally left blank rather than guessed.
      contactAddressEn: 'H.No.17-25/5/1/A, Sai Ram Nagar, Uppal, Hyderabad – 39, Telangana',
      copyrightText: `© ${new Date().getFullYear()} Sai Yadadri Seva Ashram. All rights reserved.`,
      upiId: 'sysashram@sbi',
    },
  });

  console.log('Seeding navigation menu (header/footer)...');
  // CMS-managed content (admin edits via /admin/content/navigation), so this
  // is upsert-on-fixed-id — same pattern as ACTIVITIES/DONATION_CATEGORIES
  // above — never touching a row that already exists (whether it was created
  // by an earlier seed run or hand-edited by an admin afterward). The exact
  // same fixed ids/labels/urls as the verified production data already
  // captured in website/src/content/site.ts's `navigation` snapshot, so a
  // freshly seeded database renders identically to the static export instead
  // of showing an empty header/footer.
  const NAVIGATION_ITEMS: {
    id: string;
    labelEn: string;
    labelTe: string;
    url: string;
    location: 'header' | 'footer';
    displayOrder: number;
  }[] = [
    {
      id: '93786f61-0261-41d1-b645-7ebeef7d8c6a',
      labelEn: 'Home',
      labelTe: 'హోమ్',
      url: '/',
      location: 'header',
      displayOrder: 1,
    },
    {
      id: 'f7f420f1-f9e6-4d4d-a314-a9b7bfe136dd',
      labelEn: 'About',
      labelTe: 'మా గురించి',
      url: '/about',
      location: 'header',
      displayOrder: 2,
    },
    {
      id: '231cf066-f8eb-4769-89fc-b74f55d541d4',
      labelEn: 'Activities',
      labelTe: 'కార్యక్రమాలు',
      url: '/activities',
      location: 'header',
      displayOrder: 3,
    },
    {
      id: '0abaf24c-3cb9-44fe-89d9-1592c1be02e6',
      labelEn: 'Events',
      labelTe: 'ఈవెంట్‌లు',
      url: '/events',
      location: 'header',
      displayOrder: 4,
    },
    {
      id: '30530529-2a3a-4c5a-ae22-abdfc7147965',
      labelEn: 'News',
      labelTe: 'వార్తలు',
      url: '/news',
      location: 'header',
      displayOrder: 5,
    },
    {
      id: '483e1790-936f-4fc0-a20a-310935f94995',
      labelEn: 'Gallery',
      labelTe: 'గ్యాలరీ',
      url: '/gallery',
      location: 'header',
      displayOrder: 6,
    },
    {
      id: '0e9a3b07-af0d-4d97-9bd0-d395407ffa21',
      labelEn: 'Contact',
      labelTe: 'సంప్రదించండి',
      url: '/contact',
      location: 'header',
      displayOrder: 7,
    },
    {
      id: '599074e6-e565-412f-bbce-ce73471891c6',
      labelEn: 'About Us',
      labelTe: 'మా గురించి',
      url: '/about',
      location: 'footer',
      displayOrder: 1,
    },
    {
      id: 'fe15c58b-71fd-486a-982f-68d5912b6441',
      labelEn: 'Activities',
      labelTe: 'కార్యక్రమాలు',
      url: '/activities',
      location: 'footer',
      displayOrder: 2,
    },
    {
      id: 'f4f0a49e-3b8d-4347-b18a-2c03489af9be',
      labelEn: 'Volunteer',
      labelTe: 'వాలంటీర్',
      url: '/volunteer',
      location: 'footer',
      displayOrder: 3,
    },
    {
      id: '28b06719-df19-44ba-a30b-b69cdb172f99',
      labelEn: 'Testimonials',
      labelTe: 'అభిప్రాయాలు',
      url: '/testimonials',
      location: 'footer',
      displayOrder: 4,
    },
    {
      id: 'c3b1d0e8-e206-4d1d-a77a-e133360a316d',
      labelEn: 'Contact',
      labelTe: 'సంప్రదించండి',
      url: '/contact',
      location: 'footer',
      displayOrder: 5,
    },
  ];
  for (const item of NAVIGATION_ITEMS) {
    await prisma.navigationMenuItem.upsert({
      where: { id: item.id },
      update: {},
      create: { ...item, parentId: null, active: true },
    });
  }

  console.log('Seeding About page content (Webpage.docx)...');
  // Sourced from Webpage.docx (see WEBSITE_CONTENT_AUDIT.md items 5, 9, 10, 11),
  // rewritten for concision/consistency but with every fact (names, dates,
  // places, rupee amounts) preserved exactly. `historyEn` is built entirely
  // from facts already stated in `aboutEn` below (the founding narrative used
  // to be duplicated inline here; it now lives on its own History page
  // instead). `treasurerMessageEn` was later supplied directly by the client
  // (signed by Sri K. Vidya Sagar Reddy, Treasurer) — the About page's
  // earlier bespoke "message coming soon" placeholder (about/treasurer/page.tsx)
  // now only appears if this field is ever cleared again.
  const ABOUT_BLOCKS_EN: Record<string, string> = {
    aboutEn: `
<p><em>Maanava Sevaaye Madhava Seva</em><br>Service to Humanity is Service to God</p>
<p>Sai Yadadri Seva Ashramam is a registered social service organisation committed to serving vulnerable and underserved sections of society with compassion, dignity and care.</p>
<p>Guided by the belief that serving humanity is a form of serving God, the Ashram works to create a safe and supportive environment for poor elderly people and others in need. Our work focuses on providing essential care, nourishment, health support and opportunities for a life of dignity and belonging.</p>
<h2>Our Journey</h2>
<p>The journey of Sai Yadadri Seva Ashramam began in 2019 under the vision and leadership of Sri Debbadi Ashok, a BSNL Executive who was already involved in running an old age home at Sai Lingi Village in Adilabad District.</p>
<p>With a desire to extend this service to more people, he joined hands with like-minded BSNL employees, including serving and retired employees, along with socially conscious citizens. Together, they worked towards building a wider platform for compassionate community service and established the Hyderabad chapter.</p>
<p>What began as an initiative driven by a small group of committed individuals has grown into a network of more than 100 members united by a shared commitment to social service.</p>
<h2>Our Home</h2>
<p>At the heart of Sai Yadadri Seva Ashramam is our Free Old Age Home at Pedakonduru Village, Choutuppal Mandal, Yadadri Bhuvanagiri District.</p>
<p>Since February 2020, the home has been operating at a capacity of 40 permanent residents. It provides a peaceful and supportive environment where poor elderly people can receive care, nourishment, companionship and essential support.</p>
<p>The facility operates from a building generously donated by Respected Donor Sri Mayreddi Satyanarayana Reddy Garu and Smt. Janakamma Garu. Their contribution has provided a strong foundation for the Ashram's continued service to poor elderly people.</p>
<h2>Our Approach to Service</h2>
<p>Our residential home is the cornerstone of our work, but our commitment to service extends beyond its walls.</p>
<p>We believe meaningful social service requires compassion, responsibility and sustained community participation. Our efforts therefore extend across elderly care, education, healthcare assistance, nourishment and other forms of community support.</p>
<p>Through the collective efforts of our members, donors, volunteers and well-wishers, we strive to respond to genuine needs while creating an environment where people can experience dignity, care and hope.</p>
<h2>Our Core Values</h2>
<ul>
<li><strong>Compassion:</strong> We believe every individual deserves to be treated with kindness, respect and understanding.</li>
<li><strong>Dignity:</strong> We work to ensure that those we serve are treated with dignity and given an environment where they can live with self-respect.</li>
<li><strong>Service:</strong> We believe meaningful change comes through consistent acts of service and collective responsibility.</li>
<li><strong>Community:</strong> Our work is strengthened by the participation of members, donors, volunteers and socially conscious individuals who come together for a common purpose.</li>
<li><strong>Transparency:</strong> We value responsible and transparent participation so that collective contributions can be directed towards meaningful service.</li>
</ul>
<h2>Our Vision</h2>
<p>To build a compassionate society where poor elderly people and vulnerable individuals can live with dignity, care, security and a sense of belonging, while communities come together to support education, healthcare and social wellbeing.</p>
<h2>Our Mission</h2>
<p>To translate the principle of "Maanava Sevaaye Madhava Seva" into meaningful action by providing care and support to poor elderly people and extending assistance through nourishment, education, healthcare and community-oriented service initiatives.</p>
<h2>Our Community</h2>
<p>Sai Yadadri Seva Ashramam is strengthened by a growing community of members, donors, volunteers and well-wishers.</p>
<p>Their collective support helps sustain the Ashram's ongoing activities and enables the organisation to continue responding to the needs of people who require care and assistance.</p>
<p>Together, we seek to build more than a place of shelter — we seek to create a community founded on compassion, dignity and service.</p>
<h2>A Shared Commitment</h2>
<p>The journey of Sai Yadadri Seva Ashramam continues through the people who believe that even a small act of kindness can create meaningful change.</p>
<p>With the continued support of our members, donors, volunteers and well-wishers, we remain committed to serving with compassion and strengthening the lives of those who need support.</p>
<p><em>Maanava Sevaaye Madhava Seva.</em><br>Service to Humanity is Service to God.</p>
`.trim(),
    historyEn: `
<h2>A Journey Rooted in Seva</h2>
<p><em>Maanava Sevaaye Madhava Seva</em><br>Service to Humanity is Service to God</p>
<p>The history of Sai Yadadri Seva Ashramam is a story of faith expressed through service. What began with a desire to care for those who needed support has grown into a continuing journey of compassion, collective responsibility and devotion.</p>
<p>At the heart of this journey is the belief that spirituality is not limited to prayer or worship. It is also expressed through caring for another person, sharing food, offering support in times of need and creating a place where every individual is treated with dignity.</p>
<h2>The Beginning</h2>
<p>The seeds of the Ashram's service journey were sown in 2019 under the vision and leadership of Sri Debbadi Ashok, a BSNL Executive who was already involved in running an old age home at Sai Lingi Village in Adilabad District.</p>
<p>With a desire to extend this spirit of service further, Sri Debbadi Ashok joined hands with like-minded BSNL employees, including serving and retired employees, as well as socially conscious citizens.</p>
<p>Together, they envisioned an organisation where people could come together not simply as donors or volunteers, but as a community united by a shared purpose — to serve humanity with compassion and devotion.</p>
<p>This vision became the foundation for the establishment of the Hyderabad chapter of Sai Yadadri Seva Ashramam.</p>
<h2>From a Vision to a Community</h2>
<p>The early journey was driven by a small group of people who believed that meaningful social change begins with individual responsibility.</p>
<p>The founding members contributed their resources, time and commitment to establish a sustainable foundation for the Ashram's work. Their collective effort gradually brought together a wider circle of people who shared the same values.</p>
<p>Over time, this community grew into a network of more than 100 members, united by the desire to support the Ashram and its service activities.</p>
<p>The growth of the Ashram has therefore never been only about buildings or facilities. Its greatest strength has been the growing community of people who believe in seva.</p>
<h2>2019 — The Vision Takes Shape</h2>
<p>2019 marked an important beginning in the Ashram's journey.</p>
<p>The vision of creating a stronger and wider support system for vulnerable people began taking shape through the efforts of Sri Debbadi Ashok, fellow BSNL employees and socially conscious citizens.</p>
<p>The founding vision was simple yet profound:</p>
<p><em>To create a place where care, dignity and compassion could become a part of everyday life.</em></p>
<h2>2020 — The Old Age Home</h2>
<p>A significant milestone came in February 2020, when the Free Old Age Home began operating at Pedakonduru Village, Choutuppal Mandal, Yadadri Bhuvanagiri District.</p>
<p>The Ashram became a place where poor elderly people could find shelter, nourishment, companionship and essential support in a peaceful environment.</p>
<p>The facility was made possible through the generosity of Respected Donor Sri Mayreddi Satyanarayana Reddy Garu and Smt. Janakamma Garu, who donated the building for the Ashram's service.</p>
<p>Their contribution became an important part of the Ashram's history and helped provide a lasting foundation for its residential care.</p>
<h2>A Home Built on Dignity</h2>
<p>The Free Old Age Home has a capacity of 40 permanent residents.</p>
<p>But the purpose of the home extends beyond providing a roof over someone's head.</p>
<p>It seeks to create an environment where residents can experience:</p>
<ul>
<li>Safety</li>
<li>Nourishment</li>
<li>Companionship</li>
<li>Care</li>
<li>Spiritual wellbeing</li>
<li>Daily engagement</li>
<li>Dignity and respect</li>
</ul>
<p>Prayer, meditation, yoga, bhajans, games and walking form part of the daily rhythm of life at the Ashram.</p>
<p>In this way, the Ashram strives to make the home a place of belonging rather than simply a place of residence.</p>
<h2>The Journey Expands</h2>
<p>As the Ashram developed, its understanding of seva expanded beyond residential care.</p>
<p>The organisation began supporting other areas where assistance could make a meaningful difference, including:</p>
<h3>Annaprasadam</h3>
<p>Sharing nutritious food became an important expression of seva. Individuals and families can also associate their special occasions with the Ashram through meal sponsorship.</p>
<h3>Education</h3>
<p>The Ashram extended its service towards education by supporting students through educational resources, tuition assistance and related initiatives.</p>
<h3>Medical Support</h3>
<p>Medical camps, eye camps, cataract-surgery assistance and support for people facing chronic illness became part of the organisation's wider service efforts.</p>
<h3>Goseva</h3>
<p>The Ashram's Goshala became another expression of compassion, with care extended to cows and calves and dedicated land used for fodder cultivation.</p>
<h3>Daily Seva</h3>
<p>Prayer, meditation, yoga, bhajans, games and walking contribute to the physical, emotional and spiritual wellbeing of residents.</p>
<h2>Growing Through Collective Giving</h2>
<p>The Ashram's journey has been sustained by the collective contribution of its community.</p>
<p>The initial foundation was supported by the founding members, who contributed significant personal resources towards establishing the organisation.</p>
<p>As the Ashram grew, members, donors, volunteers and well-wishers continued to contribute according to their ability and commitment.</p>
<p>This spirit of collective giving remains central to the Ashram's journey.</p>
<p>The strength of Sai Yadadri Seva Ashramam is therefore not measured only by its facilities or activities, but by the people who continue to stand behind its mission.</p>
<h2>A Spiritual Journey Through Service</h2>
<p>The Ashram's journey is deeply connected to the principle:</p>
<p><em>Maanava Sevaaye Madhava Seva<br>Service to Humanity is Service to God.</em></p>
<p>For the Ashram, seva is a form of spiritual practice.</p>
<p>A meal offered with love, time spent with an elderly resident, support given to a student, assistance offered during a medical crisis or care extended to an animal can all become expressions of devotion.</p>
<p>This understanding gives the Ashram's work its spiritual character.</p>
<p>The journey is not simply about providing services. It is about recognising the dignity of every life and responding with compassion.</p>
<h2>The People Behind the Journey</h2>
<p>Every milestone in the Ashram's history has been made possible through people.</p>
<p>From the founders who gave the first direction, to members who contribute regularly, donors who support specific needs, volunteers who give their time and well-wishers who continue to encourage the organisation — the Ashram's history belongs to a collective community.</p>
<p>Their contribution has helped transform an initial vision into an ongoing movement of service.</p>
<h2>The Journey Continues</h2>
<p>The story of Sai Yadadri Seva Ashramam is still being written.</p>
<p>From its beginnings in 2019, to the establishment of the Free Old Age Home in February 2020, and the continuing expansion of its service initiatives, the Ashram has grown through faith, commitment and collective effort.</p>
<p>Its journey continues with the same foundational belief:</p>
<p><em>When we serve another human being with compassion, we are serving something divine.</em></p>
<p>The future of the Ashram rests on continuing this spirit of seva — strengthening care for poor elderly people, supporting education and healthcare, nurturing community participation and creating opportunities for more people to experience the joy of service.</p>
<h2>A Journey of Seva, A Journey of Hope</h2>
<p>Sai Yadadri Seva Ashramam began with a vision.<br>It grew through collective faith.<br>It was strengthened through generosity.<br>And it continues through seva.</p>
<p>As the Ashram moves forward, its purpose remains unchanged:</p>
<p><strong>To serve with compassion.<br>To care with dignity.<br>To give with devotion.</strong></p>
<p><em>Maanava Sevaaye Madhava Seva.<br>Service to Humanity is Service to God.</em></p>
`.trim(),
    visionEn: `
<h2>A Life of Dignity. A Community of Compassion. A Journey of Seva.</h2>
<p><em>Maanava Sevaaye Madhava Seva</em><br>Service to Humanity is Service to God</p>
<p>The vision of Sai Yadadri Seva Ashramam is to build a compassionate society where every person, especially those who are vulnerable or in need, can live with dignity, care, security and hope.</p>
<p>We believe that true spirituality is expressed not only through prayer and devotion, but also through selfless service. Every act of kindness, every meal shared, every helping hand extended and every life supported is an opportunity to experience the divine through seva.</p>
<h2>Our Core Purpose</h2>
<p>At the heart of our vision is a simple purpose:</p>
<p><em>To serve people with compassion, protect their dignity and create an environment where no one feels forgotten or alone.</em></p>
<p>Through the Ashram's work, we seek to provide meaningful support to poor elderly people and extend our spirit of service towards education, healthcare, nourishment and other genuine community needs.</p>
<p>Our goal is not merely to provide temporary assistance. We aspire to create lasting support systems that help individuals experience a greater sense of security, belonging and wellbeing.</p>
<h2>Our Long-Term Vision</h2>
<p>We envision Sai Yadadri Seva Ashramam growing into a sustainable centre of seva, compassion and spiritual community.</p>
<p>In the years ahead, we aspire to:</p>
<ul>
<li>Strengthen the care and wellbeing provided to poor elderly people.</li>
<li>Create a peaceful environment where residents can live with dignity and companionship.</li>
<li>Extend meaningful support to children and students who face financial barriers to education.</li>
<li>Assist individuals and families facing genuine medical and humanitarian difficulties.</li>
<li>Encourage nourishment and food-based service as an expression of compassion.</li>
<li>Promote care and responsibility towards animals through Goseva.</li>
<li>Create more opportunities for individuals, families, organisations and devotees to participate in seva.</li>
<li>Build a stronger community where service becomes a shared responsibility rather than an occasional act.</li>
</ul>
<h2>Guided by Seva</h2>
<p>Our vision is rooted in Maanava Sevaaye Madhava Seva — the belief that serving humanity is serving God.</p>
<p>We see seva as a path of spiritual growth.</p>
<p>When we care for an elderly person, we practise compassion.</p>
<p>When we help a student continue their education, we nurture hope.</p>
<p>When we support someone facing a medical crisis, we stand beside them during a difficult moment.</p>
<p>When we share food, we recognise the dignity and basic needs of another human being.</p>
<p>When we care for animals, we extend compassion beyond ourselves.</p>
<p>Every such act becomes part of a larger journey of devotion.</p>
<h2>Our Guiding Values</h2>
<h3>Compassion</h3>
<p>We believe every individual deserves kindness, understanding and care, regardless of their circumstances.</p>
<h3>Dignity</h3>
<p>Our service begins with respect. We strive to ensure that those we serve are treated as individuals with dignity, identity and self-worth.</p>
<h3>Selfless Service</h3>
<p>We encourage service without expectation of personal recognition or reward. The value of seva lies in the intention behind it.</p>
<h3>Faith</h3>
<p>Our spiritual foundation inspires us to remain committed to service even when challenges arise.</p>
<h3>Community</h3>
<p>We believe lasting social impact is created when people come together. Members, devotees, donors, volunteers and well-wishers all have an important role in the Ashram's journey.</p>
<h3>Responsibility</h3>
<p>Service requires consistency and accountability. We seek to use the support entrusted to us responsibly for genuine needs.</p>
<h3>Inclusiveness</h3>
<p>We aspire to create an environment where people feel welcomed, respected and valued.</p>
<h2>A Vision Beyond the Ashram</h2>
<p>Our vision does not end at the boundaries of the Ashram campus.</p>
<p>The needs of society are diverse, and meaningful service must reach wherever genuine need exists.</p>
<p>Through education support, medical assistance, nourishment, community initiatives and other service activities, we seek to extend the spirit of compassion beyond our residential home.</p>
<p>In doing so, we hope to encourage a culture where people look beyond themselves and recognise the responsibility we share towards one another.</p>
<h2>A Place of Care and Belonging</h2>
<p>We envision the Ashram as more than a place that provides shelter.</p>
<p>We want it to remain a place of belonging — where poor elderly people can experience companionship, where devotees can participate in meaningful seva, where volunteers can share their time and abilities, and where visitors can discover the joy of giving.</p>
<p>A peaceful environment, caring relationships and spiritual practices can help create a community where service becomes part of everyday life.</p>
<h2>Our Commitment to Devotees and the Community</h2>
<p>Sai Yadadri Seva Ashramam seeks to create meaningful opportunities for devotees and well-wishers to participate in seva according to their ability and interest.</p>
<p>Some may offer financial support.</p>
<p>Some may give their time.</p>
<p>Some may share their skills.</p>
<p>Some may simply spend time with the residents and bring companionship and joy.</p>
<p>Every sincere contribution has value.</p>
<p>Our vision is to bring these individual acts of kindness together into a collective force for social good.</p>
<h2>Building a Sustainable Future</h2>
<p>A meaningful vision must be sustained over time.</p>
<p>We therefore aspire to build an organisation that can continue its service for generations through responsible participation, committed members, volunteers, donors and well-wishers.</p>
<p>The future we envision is one where the Ashram's service remains grounded in its original values while responding thoughtfully to the changing needs of society.</p>
<p>Growth, for us, is not simply about becoming larger.</p>
<p>Growth means being able to serve more people, serve them better and preserve the spirit of compassion that began this journey.</p>
<h2>Our Promise</h2>
<p>As Sai Yadadri Seva Ashramam moves forward, our fundamental purpose remains unchanged:</p>
<p><strong>To serve with compassion.<br>To care with dignity.<br>To give with humility.<br>To grow through seva.</strong></p>
<p>We remain committed to creating a future where vulnerable individuals receive support, poor elderly people experience dignity and belonging, devotees find meaningful opportunities for service, and communities come together for the greater good.</p>
<p><em>Maanava Sevaaye Madhava Seva<br>Service to Humanity is Service to God.</em></p>
`.trim(),
    missionEn: `
<h2>Serving Humanity. Nurturing Spirituality. Walking the Path of Seva.</h2>
<p><em>Maanava Sevaaye Madhava Seva</em><br>Service to Humanity is Service to God</p>
<p>The mission of Sai Yadadri Seva Ashramam is to bring spiritual values into everyday life through selfless service, compassion and devotion.</p>
<p>We believe that spirituality is not separate from society. True devotion is reflected in how we treat those around us, how we respond to suffering and how willingly we offer our time, resources and abilities for the wellbeing of others.</p>
<p>Through seva, we seek to create a community where devotion inspires service and service deepens devotion.</p>
<h2>Our Spiritual Mission</h2>
<p>At the heart of the Ashram's mission is the pursuit of a life guided by faith, compassion, humility and selfless service.</p>
<p>We strive to provide devotees with an environment where spiritual values can be experienced through prayer, meditation, bhajans, satsang, seva and meaningful participation in community welfare.</p>
<p>Our aim is not only to encourage spiritual practices, but to help devotees carry those values into their daily lives.</p>
<p>A prayer offered with devotion becomes deeper when it is followed by an act of compassion.</p>
<h2>Service to Humanity</h2>
<p>Our mission is rooted in the belief that every human being deserves dignity, care and respect.</p>
<p>Through our service activities, we seek to support people who are vulnerable or facing difficult circumstances, particularly poor elderly people and those who require assistance with essential needs.</p>
<p>Our service extends through areas such as:</p>
<ul>
<li>Care and support for poor elderly people</li>
<li>Nourishment and Annaprasadam</li>
<li>Educational assistance</li>
<li>Medical and emergency support</li>
<li>Goseva and care for animals</li>
<li>Community-oriented welfare initiatives</li>
</ul>
<p>Each initiative represents the same underlying purpose — to respond to genuine need with compassion and responsibility.</p>
<h2>Preserving Sanatana Dharma</h2>
<p>Sai Yadadri Seva Ashramam seeks to preserve and promote the timeless values of Sanatana Dharma through spiritual practice, righteous living, compassion and seva.</p>
<p>We believe that Sanatana Dharma is not merely a tradition to be preserved in words. Its principles can be kept alive through the way we live, serve and treat others.</p>
<p>Values such as:</p>
<ul>
<li><strong>Dharma</strong> — living with righteousness and responsibility</li>
<li><strong>Seva</strong> — serving others without selfish expectation</li>
<li><strong>Daya</strong> — showing compassion towards all living beings</li>
<li><strong>Satya</strong> — valuing truth and integrity</li>
<li><strong>Bhakti</strong> — developing devotion and surrender to the Divine</li>
</ul>
<p>form an important part of the spiritual foundation that guides our service.</p>
<p>Our mission is to encourage these values not only within the Ashram, but also among devotees, families and the wider community.</p>
<h2>Spiritual Growth Through Seva</h2>
<p>We believe that spiritual growth can happen through service.</p>
<p>When we serve an elderly person, we learn patience.</p>
<p>When we share food, we learn gratitude.</p>
<p>When we support someone in difficulty, we learn compassion.</p>
<p>When we give without expecting recognition, we learn humility.</p>
<p>When we serve together as a community, we experience unity.</p>
<p>In this way, seva becomes more than an activity. It becomes a path of inner transformation.</p>
<p>The Ashram encourages devotees to discover this connection between Bhakti and Seva — devotion expressed through action.</p>
<h2>Guiding Devotees on the Path of Compassion</h2>
<p>Our mission includes creating opportunities for devotees to experience the joy and fulfilment of selfless service.</p>
<p>Every person may contribute differently.</p>
<p>Some may offer their time.</p>
<p>Some may offer their skills.</p>
<p>Some may support a service initiative.</p>
<p>Some may participate in prayer, bhajans or spiritual activities.</p>
<p>Others may simply spend time with residents and offer companionship.</p>
<p>What matters is the spirit with which the service is offered.</p>
<p>We seek to encourage devotees to move from "What can I receive?" towards "What can I give?"</p>
<h2>Welfare of the Community</h2>
<p>The Ashram's mission extends beyond its residential home.</p>
<p>We believe a spiritual institution should remain connected to the needs of the society around it.</p>
<p>Through education support, healthcare assistance, nourishment and other community-oriented initiatives, we seek to respond wherever genuine need arises.</p>
<p>Our intention is to contribute towards a society where people care for one another and where compassion becomes a shared responsibility.</p>
<h2>Compassion for All Living Beings</h2>
<p>Our understanding of seva extends beyond human welfare.</p>
<p>Through Goseva, the Ashram seeks to nurture compassion and responsibility towards animals.</p>
<p>Caring for animals reminds us of an important spiritual principle — that compassion should not be limited by boundaries.</p>
<p>Every living being deserves care and kindness.</p>
<h2>Building a Community of Seva</h2>
<p>We believe that meaningful service becomes stronger when people come together.</p>
<p>The Ashram brings together devotees, members, volunteers, donors and well-wishers who share a common desire to contribute towards social and spiritual wellbeing.</p>
<p>Our mission is to nurture this community and provide meaningful opportunities for people to participate in seva according to their abilities and circumstances.</p>
<p>Together, individual acts of kindness can become a sustained movement of service.</p>
<h2>Living the Values We Teach</h2>
<p>Our mission is not simply to speak about compassion, spirituality or service.</p>
<p>It is to live these values.</p>
<p>We strive to create an environment where:</p>
<ul>
<li>Devotion leads to compassion.</li>
<li>Compassion leads to service.</li>
<li>Service leads to humility.</li>
<li>Humility strengthens spiritual growth.</li>
<li>Spiritual growth inspires greater service.</li>
</ul>
<p>This creates a continuous journey where Bhakti and Seva strengthen one another.</p>
<h2>Our Commitment</h2>
<p>Sai Yadadri Seva Ashramam remains committed to pursuing its mission with faith, humility, compassion and responsibility.</p>
<p>We seek to preserve the spiritual values that guide our organisation while responding meaningfully to the changing needs of society.</p>
<p>Our mission is not measured only by the number of people we serve.</p>
<p>It is also measured by the lives touched, the hope restored, the compassion awakened and the devotees inspired to walk the path of selfless service.</p>
<h2>Our Mission in One Thought</h2>
<p>To nurture spiritual growth through devotion and seva, preserve the timeless values of Sanatana Dharma, serve humanity with compassion, support community welfare and inspire devotees to recognise the Divine through selfless service.</p>
<p><em>Maanava Sevaaye Madhava Seva<br>Service to Humanity is Service to God.</em></p>
`.trim(),
    founderBioEn: `
<h2>Sri Debbadi Ashok</h2>
<h3>Founder President, Sai Yadadri Seva Ashram</h3>
<p><em>A lifelong journey dedicated to social service, rural development, education, welfare of poor elderly people and community empowerment.</em></p>
<p>Sri Debbadi Ashok is a social-service leader whose lifelong commitment to helping poor elderly people, the needy, rural communities and young people has shaped his journey of service. Born in 1960 in Thamsi Village, Adilabad District, to Smt. Suseela and Sri Gundaiah, he completed his schooling in Sai Lingi Village and his Intermediate and Degree education in Adilabad. He began his professional career as a Junior Engineer in the Department of Telecommunications (DoT). From an early age, he developed a strong interest in social service.</p>
<h2>A Journey of Seva</h2>
<ul>
<li><strong>1960</strong> — Early Life</li>
<li><strong>2000</strong> — Beginning of Organised Social Service</li>
<li><strong>2000–2008</strong> — Rural Community Development</li>
<li><strong>2018</strong> — Full-Time Commitment to Seva</li>
<li><strong>2019</strong> — Sai Yadadri Seva Ashram</li>
<li><strong>2020</strong> — Vanaprasthasramam</li>
</ul>
<h2>A Journey Rooted in Social Service</h2>
<p>While still in service, Sri Debbadi Ashok began his organised social-service journey in 2000 by establishing the Sri Shirdi Sai Seva Society in Sai Lingi Village, Adilabad, with the aim of helping poor and needy people and improving living conditions in the village and surrounding communities.</p>
<p>His early service vision centred on Gudi-Badi-Tadi-Vodi — Temple, School, Water and Shelter — as essential elements for the development and welfare of rural communities.</p>
<h2>Building Communities Through Service</h2>
<p>Between 2000 and 2008, working together with local people, Sri Debbadi Ashok contributed to the development of a Sai Baba Temple, a school, bore wells and an Old Age Home providing free food, accommodation and medical facilities. He also contributed to the construction of 600 toilets in Thamsi Village and 200 percolation pits aimed at improving groundwater levels.</p>
<ul>
<li>Established 100 water purification plants in villages across Adilabad District in association with Balvikas Organization.</li>
<li>Created infrastructure of approximately 5,000 square feet to support rural youth in pursuing self-employment.</li>
<li>Helped rural youth access the infrastructure and required bank-loan support for self-employment opportunities.</li>
</ul>
<h2>Empowering Rural Youth Through Skills</h2>
<p>Sri Debbadi Ashok established a Skill Development Training Centre in Adilabad to help rural youth develop practical skills and become self-reliant. Training initiatives included Computers, Fashion Designing, Driving, Tailoring, Maggam Works, Motor Mechanism and other vocational areas.</p>
<p>He also worked in association with Sri Ramanandateertha Rural Training Institute, Pochampalli, to extend skill-development and vocational training opportunities to rural youth in Adilabad and Nirmal districts.</p>
<h2>A Full-Time Commitment to Seva</h2>
<p>In 2018, Sri Debbadi Ashok took Voluntary Retirement from BSNL in order to dedicate himself fully to social service. In 2019, together with retired BSNL employees and other interested individuals, he helped establish Sai Yadadri Seva Ashram to extend his service activities to Hyderabad and surrounding areas.</p>
<p>In 2020, an Old Age Home named Vanaprasthasramam was started at Peddakonduru Village, Choutuppal Mandal, Bhongir District. The facility provides free accommodation, food and medical support to poor elderly people and physically challenged persons in need.</p>
<h2>Serving Poor Elderly People and the Physically Challenged</h2>
<p>Vanaprasthasramam at Peddakonduru was established as an extension of Sri Debbadi Ashok's commitment to caring for poor elderly people and others in need. The home provides free accommodation, food and medical facilities and is supported through donations and contributions from generous individuals and members.</p>
<p>A G+2 building of approximately 4,500 square feet was also initiated at Peddakonduru to expand accommodation capacity. The project received donations from members of society along with government support, with the completed first floor brought into use.</p>
<h2>Supporting Education and Young Minds</h2>
<p>Sri Debbadi Ashok has also extended his service into the field of education. Members associated with Sai Yadadri Seva Ashram, including retired professionals, formed a group to support educational development and adopted Zilla Parishad High School, Uppal. Special classes were conducted for students of Classes 9 and 10 to strengthen academic skills, along with computer education.</p>
<ul>
<li>Providing notebooks, school bags, pens, pencils and other educational materials to economically disadvantaged students.</li>
<li>Supporting educational activities at schools in Attapur and Champapet.</li>
<li>Supporting teaching requirements through a Vidya Volunteer initiative where additional teaching support was needed.</li>
<li>Helping students improve their academic skills and access better educational opportunities.</li>
</ul>
<h2>Service to Physically Challenged Persons</h2>
<p>At Vanaprasthasramam in Peddakonduru, service camps have been organised for physically challenged persons, including the distribution of grocery items, bed sheets and general medicines. Similar support has also been extended to physically challenged persons at Sai Vruddhasramam in Sai Lingi.</p>
<p>The service initiatives also include providing groceries, medicines and other essential materials to individuals facing severe physical challenges and requiring continued support.</p>
<h2>Medical Care for Poor Elderly People</h2>
<p>Recognising the importance of healthcare for elderly residents in Old Age Homes, Sri Debbadi Ashok has remained connected with social organisations and supported the organisation of medical camps at the Peddakonduru and Sai Lingi Old Age Homes. These initiatives include periodic health check-ups and support with medicines for elderly residents.</p>
<h2>A Vision for a Healthy and Self-Reliant Society</h2>
<p>Sri Debbadi Ashok's vision is that every person in society should be able to lead a happy and healthy life. He believes that individuals should give equal importance to family, profession and society, use their available time meaningfully, develop spiritual values and contribute to helping others.</p>
<p>From 2000 to 2018, he dedicated 25 percent of his salary towards social activities, and from 2018 onwards he has dedicated 50 percent of his pension towards social service.</p>
<p>A major part of his vision is to ensure that rural youth receive opportunities and support comparable to those available in urban areas and are empowered to become self-reliant.</p>
<h2>Recognition for Service</h2>
<p>Sri Debbadi Ashok has received recognition for his social-service contributions, including the Dr. APJ Abdul Kalam State Level Award and Ambedkar Seva Purashkar. He has also been felicitated by various organisations for his service contributions.</p>
<ul>
<li>Executive Member of Atmeeya Nilayam Old Age Home at Pochampad, Nirmal District.</li>
<li>Adviser to Goleti Ashram, Asifabad District.</li>
<li>Director of Jala Vikasa Federation for purified water plants in four districts.</li>
<li>Director of an organisation associated with eye, organ and body donation awareness.</li>
</ul>
<h2>A Life Dedicated to Seva</h2>
<p>The journey of Sri Debbadi Ashok reflects a sustained commitment to social responsibility, rural development, education, healthcare, welfare of poor elderly people and support for people in need. His work is rooted in the belief that meaningful social change becomes possible when individuals dedicate their time, resources and experience towards the welfare of others.</p>
<h2>A Legacy of Service</h2>
<ul>
<li>100 Water Purification Plants</li>
<li>600 Toilets</li>
<li>200 Percolation Pits</li>
<li>Rural Skill Development</li>
<li>Education Support</li>
<li>Welfare of Poor Elderly People</li>
<li>Medical Camps</li>
<li>Support for Physically Challenged Persons</li>
</ul>
<h2>A Continuing Commitment</h2>
<p>Sri Debbadi Ashok has expressed his commitment to continue serving society throughout his life and encourages others to come forward and participate in social service.</p>
<p>His journey continues to inspire the belief that service becomes stronger when individuals and communities come together with compassion, responsibility and a willingness to help others.</p>
<h2>Sri Kommidi Vidya Sagar Reddy</h2>
<h3>Treasurer, Sai Yadadri Seva Ashram</h3>
<img src="/images/real/committee-k-vidyasagar-reddy.jpg" alt="Sri Kommidi Vidya Sagar Reddy">
<h2>Personal Profile</h2>
<p>Sri Kommidi Vidya Sagar Reddy is a socially committed individual with a strong spirit of community service. He holds M.Sc. and MBA qualifications and served as an Assistant General Manager (AGM) at BSNL before taking Voluntary Retirement (VRS).</p>
<p>He actively participates in social-service and educational initiatives. As a motivational speaker and mathematics teacher, he uses his knowledge and experience to guide and inspire students and young people.</p>
<p>Currently, Sri Kommidi Vidya Sagar Reddy serves as the Treasurer of Sai Yadadri Seva Ashram, Peddakonduru, contributing his support to the Ashram's service and welfare initiatives.</p>
<p>He also continues to be associated with the Lions Club and the Indian Red Cross Society, participating in humanitarian and social-service activities.</p>
<p>With his dedication to education, inspiration, social welfare and voluntary service, Sri Kommidi Vidya Sagar Reddy continues to contribute to the welfare of society.</p>
<ul>
<li>M.Sc. and MBA qualifications</li>
<li>Former Assistant General Manager (AGM), BSNL</li>
<li>Motivational Speaker</li>
<li>Mathematics Teacher</li>
<li>Treasurer, Sai Yadadri Seva Ashram, Peddakonduru</li>
<li>Member of Lions Club</li>
<li>Member of Indian Red Cross Society</li>
</ul>
<h2>A Vision Rooted in Seva</h2>
<p>The founding vision of Sai Yadadri Seva Ashramam is based on a simple but powerful belief:</p>
<p><em>True devotion finds expression through service.</em></p>
<p>For Sri Debbadi Ashok and the Ashram community, seva is not merely an activity. It is a way of living one's spiritual values.</p>
<p>The Ashram seeks to provide opportunities for people to transform their faith into action — through caring for poor elderly people, supporting those in need, participating in community welfare and contributing towards a compassionate society.</p>
<p>This vision continues to guide the Ashram's work today.</p>
<h2>The Leadership Team</h2>
<p>The journey of Sai Yadadri Seva Ashramam has been strengthened by the collective dedication of its founding members and volunteers.</p>
<p>Since its establishment in 2019, the leadership team has worked together to uphold the Ashram's spiritual and social mission and to build a community based on service, devotion and responsibility.</p>
<h3>Sri Appalaraju</h3>
<img src="/images/real/committee-g-appala-raju.jpg" alt="Sri Appalaraju">
<p><strong>Vice President</strong> — Supports the leadership and continued development of the Ashram's service initiatives.</p>
<h3>Sri J. Yanadi Setty</h3>
<img src="/images/real/committee-j-yanadi-setty.jpg" alt="Sri J. Yanadi Setty">
<p><strong>General Secretary</strong> — Contributes to the organisation and coordination of the Ashram's activities and community initiatives.</p>
<h3>Sri S. Mahesh</h3>
<img src="/images/real/committee-s-mahesh.jpg" alt="Sri S. Mahesh">
<p><strong>Organising Secretary</strong></p>
<p>Sri S. Mahesh is a distinguished retired Assistant General Manager of BSNL, with an illustrious service of 36 years and 3 months in the Department of Telecommunications and BSNL. He served in various important assignments in India and abroad and was honoured with the prestigious Sanchar Sree Award in 1989.</p>
<p>After taking VRS in 2020, he dedicated himself to social service. As the Organising Secretary of Sai Yadadri Seva Ashram, Peddakondur, he has been serving elderly residents with compassion and commitment since its establishment in 2020.</p>
<p>He is presently serving as the Circle Secretary of AIRBSNLEWA, Telangana Circle, a volunteer for CGHS beneficiaries, and the General Secretary of Gokul Enclave Colony, Hyderabad.</p>
<p>A committed social worker and compassionate humanitarian, Sri S. Mahesh continues to inspire society through his selfless service.</p>
<h2>Leadership Through Collective Responsibility</h2>
<p>The Ashram's journey is not the work of one individual alone.</p>
<p>It has been shaped by the collective efforts of its leadership team, founding members, volunteers, devotees, donors and well-wishers.</p>
<p>Together, they strive to preserve the values on which the Ashram was founded:</p>
<ul>
<li><strong>Devotion</strong> — keeping spiritual values at the heart of service.</li>
<li><strong>Compassion</strong> — responding to the needs of others with kindness.</li>
<li><strong>Integrity</strong> — carrying out responsibilities with sincerity and accountability.</li>
<li><strong>Selfless Service</strong> — giving time, resources and effort for the welfare of others.</li>
<li><strong>Collective Responsibility</strong> — recognising that meaningful service becomes stronger when people work together.</li>
</ul>
<h2>Continuing the Founding Vision</h2>
<p>The leadership of Sai Yadadri Seva Ashramam remains committed to carrying forward the vision with which the organisation began in 2019.</p>
<p>As the Ashram continues its journey, the founding principle remains unchanged:</p>
<p><em>Maanava Sevaaye Madhava Seva.<br>Service to Humanity is Service to God.</em></p>
<p>The Founder and Leadership Team continue to guide the Ashram towards a future where spirituality inspires service, service strengthens community, and compassion becomes a way of life.</p>
`.trim(),
    treasurerMessageEn: `
<h2>Sri Kommidi Vidya Sagar Reddy</h2>
<h3>Treasurer, Sai Yadadri Seva Ashram</h3>
<p><em>Supports the responsible financial administration of the Ashram and contributes to its service, welfare and community initiatives.</em></p>
<h2>Personal Introduction</h2>
<p>Sri Kommidi Vidya Sagar Reddy is a socially committed individual with a strong passion for education, motivation and community service. He holds M.Sc. and MBA qualifications and served Bharat Sanchar Nigam Limited (BSNL) in the position of Assistant General Manager (AGM) before taking Voluntary Retirement (VRS).</p>
<h2>Education &amp; Professional Background</h2>
<p>With a strong academic and professional background, Sri Kommidi Vidya Sagar Reddy actively participates in social service and educational initiatives. As a motivational speaker and mathematics teacher, he shares his knowledge, experience and practical insights to guide, encourage and inspire students and young people.</p>
<h2>Role in Sai Yadadri Seva Ashram</h2>
<p>Sri Kommidi Vidya Sagar Reddy currently serves as the Treasurer of Sai Yadadri Seva Ashram, Peddakonduru, where he contributes to the Ashram's service, welfare and community development initiatives. Through his involvement, he supports the Ashram's commitment to serving people in need and strengthening its social welfare activities.</p>
<h2>Social Service</h2>
<p>In addition to his responsibilities at Sai Yadadri Seva Ashram, he continues to contribute to humanitarian and community service activities as a member of the Lions Club and the Indian Red Cross Society.</p>
<h2>Commitment</h2>
<p>With a deep commitment to education, motivation, social welfare and voluntary service, Sri Kommidi Vidya Sagar Reddy continues to dedicate his knowledge, experience and time towards making a meaningful contribution to society. His work reflects his belief in empowering individuals through education, inspiring young people through guidance and supporting communities through selfless service.</p>
<h2>Contact</h2>
<p>Mobile: <a href="tel:9490600600">9490600600</a></p>
<p>Email: <a href="mailto:kvsreddybsnl@gmail.com">kvsreddybsnl@gmail.com</a></p>
`.trim(),
  };

  const existingAboutContent = await prisma.pageContent.findUnique({
    where: { pageKey: 'about' },
  });
  if (!existingAboutContent) {
    await prisma.pageContent.create({
      // `blocksEn` is `String @db.LongText` (see schema.prisma), not a native
      // JSON column — every other write path (page-content.service.ts)
      // JSON.stringify()s before writing; this one just needs the same.
      data: { pageKey: 'about', blocksEn: JSON.stringify(ABOUT_BLOCKS_EN) },
    });
  }

  // Real, already-published Ashram content — not invented for this seed.
  // These are the exact same records captured from the live production API
  // on 2026-08-11 for the Hostinger static-export snapshot
  // (website/src/content/events.ts / news.ts / gallery.ts), reused here
  // verbatim (same ids, same text, same real /images/real/*.jpg photos) so
  // any environment seeded from scratch — including this one — shows the
  // organization's actual content instead of sitting empty. Fixed ids +
  // `update: {}` (create-if-missing) match every other seed block in this
  // file: safe to re-run, never overwrites a later admin edit.
  console.log(
    'Seeding Events, News, and Gallery (real content, from the static-export snapshot)...',
  );

  await prisma.event.upsert({
    where: { id: '8f0c5c9f-b4a4-461a-af5e-c784ec9581d5' },
    update: {},
    create: {
      id: '8f0c5c9f-b4a4-461a-af5e-c784ec9581d5',
      titleEn: 'Free Health Check-up Camp',
      titleTe: 'ఉచిత ఆరోగ్య పరీక్ష శిబిరం',
      descriptionEn:
        "<p><em>Care, Compassion and Community Wellbeing</em></p>\n<p>Sai Yadadri Seva Ashramam is organising a free general health check-up camp for elderly residents and members of the local community. The camp is supported by volunteer doctors and nurses who are coming together in the spirit of seva to provide general health check-up support.</p>\n<h2>About the Health Check-up Camp</h2>\n<p>The health check-up camp is intended to provide general health check-up support to elderly residents and people from the surrounding community. Volunteer doctors and nurses will contribute their time and professional support as part of this community-oriented seva initiative.</p>\n<h2>Serving Through Healthcare Seva</h2>\n<p>Access to basic healthcare support can be especially valuable for elderly people and members of communities who may face challenges in seeking regular health check-ups. Through initiatives such as this camp, Sai Yadadri Seva Ashramam seeks to encourage community participation and extend the spirit of compassionate service.</p>\n<h2>A Step Towards Community Wellbeing</h2>\n<p>This initiative reflects the Ashram's belief that service to society is an expression of devotion. By bringing healthcare professionals and the community together, the camp creates an opportunity to serve with compassion and care.</p>\n<h2>Be Part of the Seva</h2>\n<p>Community initiatives become stronger when people come together. We welcome the support and participation of those who wish to contribute to the Ashram's continuing journey of service.</p>",
      descriptionTe:
        'వాలంటీర్ వైద్యులు మరియు నర్సుల సహకారంతో వృద్ధ నివాసితులు మరియు స్థానిక సమాజం కోసం నిర్వహించే ఉచిత సాధారణ ఆరోగ్య పరీక్ష శిబిరం.',
      slug: 'free-health-checkup-camp',
      startDate: new Date('2026-08-27T06:28:13.922Z'),
      location: 'Sai Yadadri Seva Ashram, Uppal, Hyderabad',
      featuredImageUrl: '/images/real/medical-camp.jpg',
      status: 'published',
      metaTitleEn: 'Free Health Check-up Camp | Sai Yadadri Seva Ashramam',
      metaDescriptionEn:
        'Join the Free Health Check-up Camp on 27 August 2026 at Sai Yadadri Seva Ashram, Uppal, Hyderabad, supporting elderly residents and the local community through volunteer healthcare seva.',
    },
  });

  await prisma.event.upsert({
    where: { id: 'cd0e8a2e-ce77-4116-a657-8d5b8ffe98e7' },
    update: {},
    create: {
      id: 'cd0e8a2e-ce77-4116-a657-8d5b8ffe98e7',
      titleEn: 'Annual Annaprasadam Day',
      titleTe: 'వార్షిక అన్నప్రసాదం దినోత్సవం',
      descriptionEn:
        '<p><em>A Day of Sharing, Service and Togetherness</em></p>\n<p>Sai Yadadri Seva Ashramam invites devotees, families, members and well-wishers to come together for our Annual Annaprasadam Day. The occasion brings the community together to serve nutritious meals to Ashram residents and visiting devotees in the spirit of selfless service.</p>\n<h2>About Annual Annaprasadam Day</h2>\n<p>Annaprasadam is an important expression of seva at Sai Yadadri Seva Ashramam. This annual community meal-sponsorship day provides an opportunity for people to come together, offer food with devotion and share a meaningful occasion with the residents and visiting devotees of the Ashram.</p>\n<h2>Sharing Food, Sharing Blessings</h2>\n<p>A meal offered with love can become a simple yet meaningful act of service. Annaprasadam brings people together through the joy of sharing, creating an atmosphere of community, gratitude and togetherness.</p>\n<h2>Join Us in Seva</h2>\n<p>Devotees, families, members and well-wishers are welcome to participate in this special day of Annaprasadam seva. Whether through sponsoring meals, volunteering time or simply joining the community, every sincere contribution adds to the spirit of the occasion.</p>\n<h2>Be Part of Annaprasadam Seva</h2>\n<p>Come together with the Ashram community to share food, offer your service and make this Annual Annaprasadam Day a meaningful celebration of compassion and togetherness.</p>',
      descriptionTe:
        'మా వార్షిక సామూహిక భోజన స్పాన్సర్‌షిప్ దినోత్సవం — నివాసితులకు మరియు సందర్శించే భక్తులకు అన్నప్రసాదం వడ్డించడంలో మాతో చేరండి.',
      slug: 'annual-annaprasadam-day',
      startDate: new Date('2026-09-20T06:28:13.929Z'),
      location: 'Sai Yadadri Seva Ashram, Uppal, Hyderabad',
      featuredImageUrl: '/images/real/annaprasadam-hall.jpg',
      status: 'published',
      metaTitleEn: 'Annual Annaprasadam Day | Sai Yadadri Seva Ashramam',
      metaDescriptionEn:
        'Join Sai Yadadri Seva Ashramam on Sunday, 20 September 2026 for Annual Annaprasadam Day at Uppal, Hyderabad, and participate in a meaningful community meal-sponsorship seva.',
    },
  });

  await prisma.eventNewsPost.upsert({
    where: { id: 'e92f6b6c-b176-4795-9540-afe17f3dcce4' },
    update: {},
    create: {
      id: 'e92f6b6c-b176-4795-9540-afe17f3dcce4',
      type: 'news',
      titleEn: 'District Collector Visits Sai Yadadri Seva Ashram',
      bodyEn: `<p><em>Collector calls for improved facilities and continued care for elderly residents.</em></p>
<p>On Thursday, 20 August 2026, Sai Yadadri Seva Ashram at Peddakondur, Yadadri Bhuvanagiri District, received a visit from District Collector Sri Anurag Jayanti, highlighting the importance of continued care, support and improved facilities for elderly residents.</p>
<h2>A Visit Focused on Elderly Care</h2>
<p>The visit brought attention to the needs of elderly residents at Sai Yadadri Seva Ashram and the importance of maintaining and strengthening the facilities that support their daily wellbeing.</p>
<h2>Focus on Better Facilities</h2>
<p>During the visit, attention was drawn to the need for improved facilities for elderly residents. The interaction highlighted the importance of providing a safe, supportive and comfortable environment for those living at the Ashram.</p>
<h2>Recognition of Community Service</h2>
<p>The visit also reflects the growing recognition of the Ashram's work in serving elderly residents and supporting the wider community through care and service.</p>
<h2>Continuing the Commitment to Seva</h2>
<p>Sai Yadadri Seva Ashram remains committed to caring for its residents and strengthening the facilities and services that contribute to their dignity, comfort and wellbeing.</p>
<h2>Featured in the Press</h2>
<p>The visit was covered by Andhra Prabha, Nalgonda edition, published on 21 August 2026 (Page 7), reporting on the District Collector's call for improved facilities for elderly residents.</p>
<img src="/images/real/collector-visit-andhra-prabha-clipping.jpg" alt="Andhra Prabha newspaper coverage of the District Collector's visit to Sai Yadadri Seva Ashram, Nalgonda edition, 21 August 2026, Page 7" />
<p><em>Maanava Sevaaye Madhava Seva — Service to Humanity is Service to God.</em></p>
<p>The Ashram continues its journey of service with compassion, dignity and a commitment to the wellbeing of elderly residents and the wider community.</p>`,
      slug: 'district-collector-visits-sai-yadadri-seva-ashram',
      publishedAt: new Date('2026-08-21T00:00:00.000Z'),
      status: 'published',
      featuredImageUrl: '/images/real/collector-visit-ashram-bulletin.jpg',
      category: 'News & Media',
      tags: JSON.stringify([
        'District Collector',
        'Elderly Care',
        'Pedakondur',
        'Community Service',
        'Sai Yadadri Seva Ashram',
      ]),
      metaTitleEn: 'District Collector Visits Sai Yadadri Seva Ashram | Sai Yadadri Seva Ashramam',
      metaDescriptionEn:
        "Read about the District Collector's visit to Sai Yadadri Seva Ashram and the focus on improving facilities and care for elderly residents, as covered by Andhra Prabha.",
    },
  });

  const GALLERY_ALBUMS: {
    id: string;
    nameEn: string;
    nameTe: string;
    category: string;
    displayOrder: number;
    items: {
      id: string;
      mediaUrl: string;
      altTextEn: string;
      altTextTe: string;
      displayOrder: number;
    }[];
  }[] = [
    {
      id: 'dfe15736-9b08-4b05-adc1-f36859922367',
      nameEn: 'Ashram Life',
      nameTe: 'ఆశ్రమ జీవితం',
      category: 'General',
      displayOrder: 1,
      items: [
        {
          id: 'd485ad86-a564-435c-ac6c-f4e0fcdfb4bd',
          mediaUrl: '/images/real/ashram-building.jpg',
          altTextEn: 'The Ashram building',
          altTextTe: 'ఆశ్రమ భవనం',
          displayOrder: 1,
        },
        {
          id: '5c69a79b-c629-41d5-98f7-25189e4dc198',
          mediaUrl: '/images/real/founders.jpg',
          altTextEn: 'Founders of Vanaprasthasramam',
          altTextTe: 'వానప్రస్థాశ్రమం స్థాపకులు',
          displayOrder: 2,
        },
        {
          id: '41d823c9-d800-4778-92a1-b921a77821c3',
          mediaUrl: '/images/real/groundbreaking-ceremony.jpg',
          altTextEn: 'Foundation-laying ceremony for the new building',
          altTextTe: 'కొత్త భవనానికి పునాది వేసే కార్యక్రమం',
          displayOrder: 3,
        },
        {
          id: '4d3d2770-317f-4e23-8648-9c605832c211',
          mediaUrl: '/images/real/annaprasadam-hall.jpg',
          altTextEn: 'Annaprasadam dining hall',
          altTextTe: 'అన్నప్రసాదం భోజనశాల',
          displayOrder: 4,
        },
        {
          id: '2de705fe-a6f1-4a2a-bba0-a10c8d84ec56',
          mediaUrl: '/images/real/goshala-cows.jpg',
          altTextEn: 'Cows at the Goshala',
          altTextTe: 'గోశాలలో ఆవులు',
          displayOrder: 5,
        },
        {
          id: '6a1dd15f-7c15-4748-9830-093750f8e52b',
          mediaUrl: '/images/real/goshala-goseva.jpg',
          altTextEn: 'Devotees performing Goseva',
          altTextTe: 'గోసేవ చేస్తున్న భక్తులు',
          displayOrder: 6,
        },
        {
          id: 'b4c0b12f-ae29-4b8e-9e2d-0d638a0c05ec',
          mediaUrl: '/images/real/residents-activities.jpg',
          altTextEn: 'Residents playing carrom in the evening',
          altTextTe: 'సాయంత్రం క్యారమ్ ఆడుతున్న నివాసితులు',
          displayOrder: 7,
        },
        {
          id: '73bc0efa-b425-4a30-87c0-f6d33103611c',
          mediaUrl: '/images/real/fitness-room.jpg',
          altTextEn: 'Physical fitness activities at the wellness centre',
          altTextTe: 'వెల్‌నెస్ కేంద్రంలో ఫిజికల్ ఫిట్‌నెస్ కార్యక్రమాలు',
          displayOrder: 8,
        },
        {
          id: 'cd4b95fb-34a3-446f-ae9f-d424311829aa',
          mediaUrl: '/images/real/education-outreach.jpg',
          altTextEn: 'Education outreach with local students',
          altTextTe: 'స్థానిక విద్యార్థులతో విద్యా కార్యక్రమం',
          displayOrder: 9,
        },
        {
          id: '390eeab0-10fe-455c-bc8e-8e407906eafd',
          mediaUrl: '/images/real/medical-camp.jpg',
          altTextEn: 'Medical camp for residents',
          altTextTe: 'నివాసితుల కోసం వైద్య శిబిరం',
          displayOrder: 10,
        },
      ],
    },
    {
      id: 'c23a7dc4-cce0-4563-934b-cf124c215837',
      nameEn: 'Community Programs & Recognition',
      nameTe: 'సామాజిక కార్యక్రమాలు & గుర్తింపు',
      category: 'Events',
      displayOrder: 2,
      items: [
        {
          id: 'c0c25c6a-3a07-42ab-9f9c-5fe780b488a2',
          mediaUrl: '/images/real/quadrant-sponsorship-briefing.jpg',
          altTextEn: 'Quadrant IT Services team briefing at the skill development centre launch',
          altTextTe:
            'నైపుణ్యాభివృద్ధి కేంద్రం ప్రారంభోత్సవంలో క్వాడ్రంట్ ఐటీ సర్వీసెస్ బృందం సమావేశం',
          displayOrder: 1,
        },
        {
          id: '54995487-7988-4621-8fd3-acbb23bf5cce',
          mediaUrl: '/images/real/quadrant-sponsorship-office-1.jpg',
          altTextEn: 'Quadrant IT Services office during the sponsorship event',
          altTextTe: 'స్పాన్సర్‌షిప్ కార్యక్రమంలో క్వాడ్రంట్ ఐటీ సర్వీసెస్ కార్యాలయం',
          displayOrder: 2,
        },
        {
          id: 'f9cf6c1f-83ba-4315-a572-4577821bc909',
          mediaUrl: '/images/real/quadrant-sponsorship-office-2.jpg',
          altTextEn: 'Quadrant IT Services office during the sponsorship event',
          altTextTe: 'స్పాన్సర్‌షిప్ కార్యక్రమంలో క్వాడ్రంట్ ఐటీ సర్వీసెస్ కార్యాలయం',
          displayOrder: 3,
        },
        {
          id: '27bd6c80-f41d-41b5-b4d3-86d714b66771',
          mediaUrl: '/images/real/quadrant-sponsorship-office-3.jpg',
          altTextEn: 'Attendees applauding at the Quadrant IT Services sponsorship event',
          altTextTe:
            'క్వాడ్రంట్ ఐటీ సర్వీసెస్ స్పాన్సర్‌షిప్ కార్యక్రమంలో హాజరైనవారు కరతాళధ్వనులు చేస్తున్న దృశ్యం',
          displayOrder: 4,
        },
        {
          id: '4c8760f7-0b4a-464d-8e07-a1d4444dd67a',
          mediaUrl: '/images/real/physiotherapy-centre-inauguration.jpg',
          altTextEn: 'Physiotherapy centre inauguration at the Ashram, with the District Collector',
          altTextTe: 'జిల్లా కలెక్టర్ సమక్షంలో ఆశ్రమంలో ఫిజియోథెరపీ కేంద్రం ప్రారంభోత్సవం',
          displayOrder: 5,
        },
        {
          id: '4d16cc79-4c2d-48ac-a2ca-3a5710492aab',
          mediaUrl: '/images/real/sai-swasthya-wellness-centre-signage.jpg',
          altTextEn: 'Sai Swasthya Wellness Centre signage at the Ashram',
          altTextTe: 'ఆశ్రమంలో సాయి స్వాస్థ్య వెల్‌నెస్ సెంటర్ బోర్డు',
          displayOrder: 6,
        },
        {
          id: '0464aa3e-092d-420e-a643-2691d9b2cf92',
          mediaUrl: '/images/real/committee-new-body-2026.jpg',
          altTextEn: 'The newly elected managing committee',
          altTextTe: 'కొత్తగా ఎన్నికైన నిర్వహణ కమిటీ',
          displayOrder: 8,
        },
        {
          id: '78df350e-b97c-4806-a079-8a108762bba8',
          mediaUrl: '/images/real/committee-event-2026-07-27-1.jpg',
          altTextEn: 'Committee members honouring residents at an Ashram event',
          altTextTe: 'ఆశ్రమ కార్యక్రమంలో నివాసితులను సత్కరిస్తున్న కమిటీ సభ్యులు',
          displayOrder: 9,
        },
        {
          id: '805145ac-d49d-4768-9058-b7ec2d32136b',
          mediaUrl: '/images/real/committee-event-2026-07-27-2.jpg',
          altTextEn: 'Committee members honouring residents at an Ashram event',
          altTextTe: 'ఆశ్రమ కార్యక్రమంలో నివాసితులను సత్కరిస్తున్న కమిటీ సభ్యులు',
          displayOrder: 10,
        },
        {
          id: '2fc589bf-c610-4a33-ae29-40104c87a957',
          mediaUrl: '/images/real/school-outreach-students-outdoor.jpg',
          altTextEn: 'Students at a school outreach programme',
          altTextTe: 'పాఠశాల విద్యా కార్యక్రమంలో విద్యార్థులు',
          displayOrder: 11,
        },
        {
          id: '159c72de-8816-47ef-b732-58ff03726f9c',
          mediaUrl: '/images/real/school-outreach-auditorium.jpg',
          altTextEn: 'Students representing the Ashram at a community event',
          altTextTe: 'సామాజిక కార్యక్రమంలో ఆశ్రమానికి ప్రాతినిధ్యం వహిస్తున్న విద్యార్థులు',
          displayOrder: 12,
        },
        {
          id: '16d05b2e-9a92-4d8d-95ee-3ee8756a4dbb',
          mediaUrl: '/images/real/school-computer-lab.jpg',
          altTextEn: "Students in a computer lab supported by the Ashram's education programme",
          altTextTe: 'ఆశ్రమం విద్యా కార్యక్రమం మద్దతుతో కంప్యూటర్ ల్యాబ్‌లో విద్యార్థులు',
          displayOrder: 13,
        },
        {
          id: '85f20c2f-ee4c-4eb4-b399-77cc8ba9ce6f',
          mediaUrl: '/images/real/skill-development-classroom.jpg',
          altTextEn: 'A skill development training session',
          altTextTe: 'నైపుణ్యాభివృద్ధి శిక్షణ తరగతి',
          displayOrder: 14,
        },
        {
          id: '48d42053-9a07-4832-8fc5-78a6bbf1eb72',
          mediaUrl: '/images/real/goshala-cows-2.jpg',
          altTextEn: 'Cows and calves at the Goshala',
          altTextTe: 'గోశాలలో ఆవులు మరియు దూడలు',
          displayOrder: 15,
        },
      ],
    },
  ];

  for (const album of GALLERY_ALBUMS) {
    await prisma.galleryAlbum.upsert({
      where: { id: album.id },
      update: {},
      create: {
        id: album.id,
        nameEn: album.nameEn,
        nameTe: album.nameTe,
        category: album.category,
        displayOrder: album.displayOrder,
      },
    });
    for (const item of album.items) {
      await prisma.galleryItem.upsert({
        where: { id: item.id },
        update: {},
        create: {
          id: item.id,
          albumId: album.id,
          mediaType: 'image',
          mediaUrl: item.mediaUrl,
          altTextEn: item.altTextEn,
          altTextTe: item.altTextTe,
          displayOrder: item.displayOrder,
        },
      });
    }
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
        // configured SMTP provider — see api/README.md for the production caveat.
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
