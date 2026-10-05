/**
 * Build-time snapshot of live CMS data, captured from the production API on
 * 2026-08-11 for the Hostinger static export (STATIC_EXPORT=true).
 * Site-wide settings, hero banners, testimonials, social links, navigation, and simple page content blocks.
 *
 * The `xxxTe` fields below were `null` in production (no Telugu entered via
 * the CMS yet) and have since been hand-translated directly in this file so
 * the static Telugu export isn't missing this copy. This is a deliberate
 * exception to "not hand-edited": if the extraction script is re-run against
 * the live API before the CMS records themselves get Telugu values, it will
 * overwrite these translations back to null. Re-add them (or, better, enter
 * them in the live CMS first) after any future re-extraction.
 */
import type {
  SiteSettings,
  HeroBanner,
  Testimonial,
  SocialLink,
  NavigationTree,
  PageContent,
  PublicDocument,
} from '@/types/public';

export const siteSettings: SiteSettings = {
  siteNameEn: 'Sai Yadadri Seva Ashram',
  siteNameTe: null,
  taglineEn: '“Maanava Saevayae Madhava Saeva “- “Service to Humanity is Service to God”',
  taglineTe: '“మానవ సేవయే మాధవ సేవ” - “మానవాళికి సేవ చేయడమే భగవంతునికి సేవ చేయడం”',
  logoUrl: '/logo.png',
  faviconUrl: null,
  contactAddressEn: 'H.No.17-25/5/1/A, Sai Ram Nagar, Uppal, Hyderabad – 39, Telangana',
  contactAddressTe: 'ఇంటి నం.17-25/5/1/A, సాయి రామ్ నగర్, ఉప్పల్, హైదరాబాద్ – 39, తెలంగాణ',
  contactPhone: '+91 94901 18877',
  contactEmail: 'sysaorg1@gmail.com',
  contactHoursEn: 'Mon–Sat, 9:00 AM – 6:00 PM',
  whatsappNumber: '+91 94901 18877',
  mapLatitude: null,
  mapLongitude: null,
  defaultMetaTitle: null,
  defaultMetaDescription: null,
  defaultOgImageUrl: null,
  footerTextEn:
    'A registered social service society dedicated to elderly care, community meals, and educational support in Yadadri Bhuvanagiri District.',
  footerTextTe:
    'యాదాద్రి భువనగిరి జిల్లాలో వృద్ధుల సంరక్షణ, సామూహిక భోజనాలు మరియు విద్యా మద్దతుకు అంకితమైన ఒక నమోదిత సామాజిక సేవా సంస్థ.',
  copyrightText: '© 2026 Sai Yadadri Seva Ashram. All rights reserved.',
  maintenanceMode: false,
  bankAccountName: 'Sai Yadadri Seva Ashram',
  bankAccountNumber: '40304687251',
  bankIfscCode: 'SBIN0006557',
  bankName: 'State Bank of India',
  bankBranch: null,
  upiId: 'sysashram@sbi',
  upiQrImageUrl: null,
};

export const heroBanners: HeroBanner[] = [
  {
    id: '860a9d2b-820a-41b8-bf4f-56ba9a1b13d5',
    titleEn: 'Serving Humanity with Compassion, Care & Dignity',
    titleTe: null,
    subtitleEn:
      'Dedicated to caring for poor elderly people and supporting communities through food, education, healthcare assistance, Goseva and compassionate service.',
    subtitleTe: null,
    imageUrl: '/images/real/residents-activities.jpg',
    ctaLabelEn: null,
    ctaLabelTe: null,
    ctaUrl: null,
    displayOrder: 1,
  },
];

export const testimonials: Testimonial[] = [
  {
    id: 'bc6761d2-f706-4272-be9d-739b44efd797',
    authorName: 'Regular Donor',
    authorRole: 'Monthly Annaprasadam Sponsor',
    quoteEn:
      'Knowing exactly where my contribution goes — straight to a meal for a resident — is what keeps me sponsoring every month.',
    quoteTe:
      'నా విరాళం ఎక్కడికి వెళ్తుందో ఖచ్చితంగా తెలుసుకోవడం — నేరుగా ఒక నివాసి భోజనానికి — నన్ను ప్రతి నెలా స్పాన్సర్ చేసేలా ప్రేరేపిస్తుంది.',
    photoUrl: null,
    displayOrder: 1,
  },
  {
    id: 'd6efbf9b-2353-4287-8078-126cbaf2a052',
    authorName: 'Volunteer',
    authorRole: 'Weekend Volunteer, Old Age Home',
    quoteEn:
      'Spending a few hours here every weekend has taught me more about seva than anything else in my life.',
    quoteTe:
      'ప్రతి వారాంతం ఇక్కడ కొన్ని గంటలు గడపడం నా జీవితంలో మరే విషయం కంటే సేవ గురించి ఎక్కువ నేర్పింది.',
    photoUrl: null,
    displayOrder: 2,
  },
  {
    id: 'd21e7062-9944-468d-93cd-83765e87f243',
    authorName: 'Family Member',
    authorRole: 'Relative of an Old Age Home Resident',
    quoteEn:
      'The care and dignity my grandmother receives here gives our whole family peace of mind.',
    quoteTe:
      'నా అమ్మమ్మకు ఇక్కడ లభించే సంరక్షణ మరియు గౌరవం మా కుటుంబం మొత్తానికి మనశ్శాంతినిస్తుంది.',
    photoUrl: null,
    displayOrder: 3,
  },
];

export const socialLinks: SocialLink[] = [
  {
    id: '0ca0b972-1a16-4439-84b6-23ce8bb8b340',
    platform: 'facebook',
    url: 'https://facebook.com/sysaindia',
    displayOrder: 1,
  },
  {
    id: '9b542732-b15d-4f23-be21-1f0692a57950',
    platform: 'instagram',
    url: 'https://instagram.com/sysaindia',
    displayOrder: 2,
  },
  {
    id: '91af1d08-c8a4-4e83-ac1b-02a89ec070a8',
    platform: 'youtube',
    url: 'https://youtube.com/@sysaindia',
    displayOrder: 3,
  },
];

export const navigation: NavigationTree = {
  header: [
    {
      id: '93786f61-0261-41d1-b645-7ebeef7d8c6a',
      labelEn: 'Home',
      labelTe: 'హోమ్',
      url: '/',
      parentId: null,
      displayOrder: 1,
      children: [],
    },
    {
      id: 'f7f420f1-f9e6-4d4d-a314-a9b7bfe136dd',
      labelEn: 'About',
      labelTe: 'మా గురించి',
      url: '/about',
      parentId: null,
      displayOrder: 2,
      children: [],
    },
    {
      id: '231cf066-f8eb-4769-89fc-b74f55d541d4',
      labelEn: 'Activities',
      labelTe: 'కార్యక్రమాలు',
      url: '/activities',
      parentId: null,
      displayOrder: 3,
      children: [],
    },
    {
      id: '0abaf24c-3cb9-44fe-89d9-1592c1be02e6',
      labelEn: 'Events',
      labelTe: 'ఈవెంట్‌లు',
      url: '/events',
      parentId: null,
      displayOrder: 4,
      children: [],
    },
    {
      id: '30530529-2a3a-4c5a-ae22-abdfc7147965',
      labelEn: 'News',
      labelTe: 'వార్తలు',
      url: '/news',
      parentId: null,
      displayOrder: 5,
      children: [],
    },
    {
      id: '483e1790-936f-4fc0-a20a-310935f94995',
      labelEn: 'Gallery',
      labelTe: 'గ్యాలరీ',
      url: '/gallery',
      parentId: null,
      displayOrder: 6,
      children: [],
    },
    {
      id: '0e9a3b07-af0d-4d97-9bd0-d395407ffa21',
      labelEn: 'Contact',
      labelTe: 'సంప్రదించండి',
      url: '/contact',
      parentId: null,
      displayOrder: 7,
      children: [],
    },
  ],
  footer: [
    {
      id: '599074e6-e565-412f-bbce-ce73471891c6',
      labelEn: 'About Us',
      labelTe: 'మా గురించి',
      url: '/about',
      parentId: null,
      displayOrder: 1,
      children: [],
    },
    {
      id: 'fe15c58b-71fd-486a-982f-68d5912b6441',
      labelEn: 'Activities',
      labelTe: 'కార్యక్రమాలు',
      url: '/activities',
      parentId: null,
      displayOrder: 2,
      children: [],
    },
    {
      id: 'f4f0a49e-3b8d-4347-b18a-2c03489af9be',
      labelEn: 'Volunteer',
      labelTe: 'వాలంటీర్',
      url: '/volunteer',
      parentId: null,
      displayOrder: 3,
      children: [],
    },
    {
      id: '28b06719-df19-44ba-a30b-b69cdb172f99',
      labelEn: 'Testimonials',
      labelTe: 'అభిప్రాయాలు',
      url: '/testimonials',
      parentId: null,
      displayOrder: 4,
      children: [],
    },
    {
      id: 'c3b1d0e8-e206-4d1d-a77a-e133360a316d',
      labelEn: 'Contact',
      labelTe: 'సంప్రదించండి',
      url: '/contact',
      parentId: null,
      displayOrder: 5,
      children: [],
    },
  ],
};

export const documents: PublicDocument[] = [];

export const pageContents: Record<string, PageContent> = {
  home: {
    pageKey: 'home',
    blocksEn: {
      impactStats: [
        { valueEn: '40', labelEn: 'Resident Capacity' },
        { valueEn: '100+', labelEn: 'Members' },
        { valueEn: '10', labelEn: 'Cows in Goseva' },
        { valueEn: '10', labelEn: 'Calves in Goseva' },
        { valueEn: '2 Acres', labelEn: 'Fodder Cultivation' },
        { valueEn: '7', labelEn: 'Core Service Areas' },
      ],
      welcomeMessageEn: '',
    },
    blocksTe: null,
    updatedAt: '2026-08-06T14:59:41.074Z',
  },
  about: {
    pageKey: 'about',
    blocksEn: {
      aboutEn:
        '<p><em>Maanava Sevaaye Madhava Seva</em><br>Service to Humanity is Service to God</p>\n<p>Sai Yadadri Seva Ashramam is a registered social service organisation committed to serving vulnerable and underserved sections of society with compassion, dignity and care.</p>\n<p>Guided by the belief that serving humanity is a form of serving God, the Ashram works to create a safe and supportive environment for poor elderly people and others in need. Our work focuses on providing essential care, nourishment, health support and opportunities for a life of dignity and belonging.</p>\n<h2>Our Journey</h2>\n<p>The journey of Sai Yadadri Seva Ashramam began in 2019 under the vision and leadership of Sri Debbadi Ashok, a BSNL Executive who was already involved in running an old age home at Sai Lingi Village in Adilabad District.</p>\n<p>With a desire to extend this service to more people, he joined hands with like-minded BSNL employees, including serving and retired employees, along with socially conscious citizens. Together, they worked towards building a wider platform for compassionate community service and established the Hyderabad chapter.</p>\n<p>What began as an initiative driven by a small group of committed individuals has grown into a network of more than 100 members united by a shared commitment to social service.</p>\n<h2>Our Home</h2>\n<p>At the heart of Sai Yadadri Seva Ashramam is our Free Old Age Home at Pedakonduru Village, Choutuppal Mandal, Yadadri Bhuvanagiri District.</p>\n<p>Since February 2020, the home has been operating at a capacity of 40 permanent residents. It provides a peaceful and supportive environment where poor elderly people can receive care, nourishment, companionship and essential support.</p>\n<p>The facility operates from a building generously donated by Respected Donor Sri Mayreddi Satyanarayana Reddy Garu and Smt. Janakamma Garu. Their contribution has provided a strong foundation for the Ashram\'s continued service to poor elderly people.</p>\n<h2>Our Approach to Service</h2>\n<p>Our residential home is the cornerstone of our work, but our commitment to service extends beyond its walls.</p>\n<p>We believe meaningful social service requires compassion, responsibility and sustained community participation. Our efforts therefore extend across elderly care, education, healthcare assistance, nourishment and other forms of community support.</p>\n<p>Through the collective efforts of our members, donors, volunteers and well-wishers, we strive to respond to genuine needs while creating an environment where people can experience dignity, care and hope.</p>\n<h2>Our Core Values</h2>\n<ul>\n<li><strong>Compassion:</strong> We believe every individual deserves to be treated with kindness, respect and understanding.</li>\n<li><strong>Dignity:</strong> We work to ensure that those we serve are treated with dignity and given an environment where they can live with self-respect.</li>\n<li><strong>Service:</strong> We believe meaningful change comes through consistent acts of service and collective responsibility.</li>\n<li><strong>Community:</strong> Our work is strengthened by the participation of members, donors, volunteers and socially conscious individuals who come together for a common purpose.</li>\n<li><strong>Transparency:</strong> We value responsible and transparent participation so that collective contributions can be directed towards meaningful service.</li>\n</ul>\n<h2>Our Vision</h2>\n<p>To build a compassionate society where poor elderly people and vulnerable individuals can live with dignity, care, security and a sense of belonging, while communities come together to support education, healthcare and social wellbeing.</p>\n<h2>Our Mission</h2>\n<p>To translate the principle of "Maanava Sevaaye Madhava Seva" into meaningful action by providing care and support to poor elderly people and extending assistance through nourishment, education, healthcare and community-oriented service initiatives.</p>\n<h2>Our Community</h2>\n<p>Sai Yadadri Seva Ashramam is strengthened by a growing community of members, donors, volunteers and well-wishers.</p>\n<p>Their collective support helps sustain the Ashram\'s ongoing activities and enables the organisation to continue responding to the needs of people who require care and assistance.</p>\n<p>Together, we seek to build more than a place of shelter — we seek to create a community founded on compassion, dignity and service.</p>\n<h2>A Shared Commitment</h2>\n<p>The journey of Sai Yadadri Seva Ashramam continues through the people who believe that even a small act of kindness can create meaningful change.</p>\n<p>With the continued support of our members, donors, volunteers and well-wishers, we remain committed to serving with compassion and strengthening the lives of those who need support.</p>\n<p><em>Maanava Sevaaye Madhava Seva.</em><br>Service to Humanity is Service to God.</p>',
      visionEn:
        "<h2>A Life of Dignity. A Community of Compassion. A Journey of Seva.</h2>\n<p><em>Maanava Sevaaye Madhava Seva</em><br>Service to Humanity is Service to God</p>\n<p>The vision of Sai Yadadri Seva Ashramam is to build a compassionate society where every person, especially those who are vulnerable or in need, can live with dignity, care, security and hope.</p>\n<p>We believe that true spirituality is expressed not only through prayer and devotion, but also through selfless service. Every act of kindness, every meal shared, every helping hand extended and every life supported is an opportunity to experience the divine through seva.</p>\n<h2>Our Core Purpose</h2>\n<p>At the heart of our vision is a simple purpose:</p>\n<p><em>To serve people with compassion, protect their dignity and create an environment where no one feels forgotten or alone.</em></p>\n<p>Through the Ashram's work, we seek to provide meaningful support to poor elderly people and extend our spirit of service towards education, healthcare, nourishment and other genuine community needs.</p>\n<p>Our goal is not merely to provide temporary assistance. We aspire to create lasting support systems that help individuals experience a greater sense of security, belonging and wellbeing.</p>\n<h2>Our Long-Term Vision</h2>\n<p>We envision Sai Yadadri Seva Ashramam growing into a sustainable centre of seva, compassion and spiritual community.</p>\n<p>In the years ahead, we aspire to:</p>\n<ul>\n<li>Strengthen the care and wellbeing provided to poor elderly people.</li>\n<li>Create a peaceful environment where residents can live with dignity and companionship.</li>\n<li>Extend meaningful support to children and students who face financial barriers to education.</li>\n<li>Assist individuals and families facing genuine medical and humanitarian difficulties.</li>\n<li>Encourage nourishment and food-based service as an expression of compassion.</li>\n<li>Promote care and responsibility towards animals through Goseva.</li>\n<li>Create more opportunities for individuals, families, organisations and devotees to participate in seva.</li>\n<li>Build a stronger community where service becomes a shared responsibility rather than an occasional act.</li>\n</ul>\n<h2>Guided by Seva</h2>\n<p>Our vision is rooted in Maanava Sevaaye Madhava Seva — the belief that serving humanity is serving God.</p>\n<p>We see seva as a path of spiritual growth.</p>\n<p>When we care for an elderly person, we practise compassion.</p>\n<p>When we help a student continue their education, we nurture hope.</p>\n<p>When we support someone facing a medical crisis, we stand beside them during a difficult moment.</p>\n<p>When we share food, we recognise the dignity and basic needs of another human being.</p>\n<p>When we care for animals, we extend compassion beyond ourselves.</p>\n<p>Every such act becomes part of a larger journey of devotion.</p>\n<h2>Our Guiding Values</h2>\n<h3>Compassion</h3>\n<p>We believe every individual deserves kindness, understanding and care, regardless of their circumstances.</p>\n<h3>Dignity</h3>\n<p>Our service begins with respect. We strive to ensure that those we serve are treated as individuals with dignity, identity and self-worth.</p>\n<h3>Selfless Service</h3>\n<p>We encourage service without expectation of personal recognition or reward. The value of seva lies in the intention behind it.</p>\n<h3>Faith</h3>\n<p>Our spiritual foundation inspires us to remain committed to service even when challenges arise.</p>\n<h3>Community</h3>\n<p>We believe lasting social impact is created when people come together. Members, devotees, donors, volunteers and well-wishers all have an important role in the Ashram's journey.</p>\n<h3>Responsibility</h3>\n<p>Service requires consistency and accountability. We seek to use the support entrusted to us responsibly for genuine needs.</p>\n<h3>Inclusiveness</h3>\n<p>We aspire to create an environment where people feel welcomed, respected and valued.</p>\n<h2>A Vision Beyond the Ashram</h2>\n<p>Our vision does not end at the boundaries of the Ashram campus.</p>\n<p>The needs of society are diverse, and meaningful service must reach wherever genuine need exists.</p>\n<p>Through education support, medical assistance, nourishment, community initiatives and other service activities, we seek to extend the spirit of compassion beyond our residential home.</p>\n<p>In doing so, we hope to encourage a culture where people look beyond themselves and recognise the responsibility we share towards one another.</p>\n<h2>A Place of Care and Belonging</h2>\n<p>We envision the Ashram as more than a place that provides shelter.</p>\n<p>We want it to remain a place of belonging — where poor elderly people can experience companionship, where devotees can participate in meaningful seva, where volunteers can share their time and abilities, and where visitors can discover the joy of giving.</p>\n<p>A peaceful environment, caring relationships and spiritual practices can help create a community where service becomes part of everyday life.</p>\n<h2>Our Commitment to Devotees and the Community</h2>\n<p>Sai Yadadri Seva Ashramam seeks to create meaningful opportunities for devotees and well-wishers to participate in seva according to their ability and interest.</p>\n<p>Some may offer financial support.</p>\n<p>Some may give their time.</p>\n<p>Some may share their skills.</p>\n<p>Some may simply spend time with the residents and bring companionship and joy.</p>\n<p>Every sincere contribution has value.</p>\n<p>Our vision is to bring these individual acts of kindness together into a collective force for social good.</p>\n<h2>Building a Sustainable Future</h2>\n<p>A meaningful vision must be sustained over time.</p>\n<p>We therefore aspire to build an organisation that can continue its service for generations through responsible participation, committed members, volunteers, donors and well-wishers.</p>\n<p>The future we envision is one where the Ashram's service remains grounded in its original values while responding thoughtfully to the changing needs of society.</p>\n<p>Growth, for us, is not simply about becoming larger.</p>\n<p>Growth means being able to serve more people, serve them better and preserve the spirit of compassion that began this journey.</p>\n<h2>Our Promise</h2>\n<p>As Sai Yadadri Seva Ashramam moves forward, our fundamental purpose remains unchanged:</p>\n<p><strong>To serve with compassion.<br>To care with dignity.<br>To give with humility.<br>To grow through seva.</strong></p>\n<p>We remain committed to creating a future where vulnerable individuals receive support, poor elderly people experience dignity and belonging, devotees find meaningful opportunities for service, and communities come together for the greater good.</p>\n<p><em>Maanava Sevaaye Madhava Seva<br>Service to Humanity is Service to God.</em></p>",
      historyEn:
        "<h2>A Journey Rooted in Seva</h2>\n<p><em>Maanava Sevaaye Madhava Seva</em><br>Service to Humanity is Service to God</p>\n<p>The history of Sai Yadadri Seva Ashramam is a story of faith expressed through service. What began with a desire to care for those who needed support has grown into a continuing journey of compassion, collective responsibility and devotion.</p>\n<p>At the heart of this journey is the belief that spirituality is not limited to prayer or worship. It is also expressed through caring for another person, sharing food, offering support in times of need and creating a place where every individual is treated with dignity.</p>\n<h2>The Beginning</h2>\n<p>The seeds of the Ashram's service journey were sown in 2019 under the vision and leadership of Sri Debbadi Ashok, a BSNL Executive who was already involved in running an old age home at Sai Lingi Village in Adilabad District.</p>\n<p>With a desire to extend this spirit of service further, Sri Debbadi Ashok joined hands with like-minded BSNL employees, including serving and retired employees, as well as socially conscious citizens.</p>\n<p>Together, they envisioned an organisation where people could come together not simply as donors or volunteers, but as a community united by a shared purpose — to serve humanity with compassion and devotion.</p>\n<p>This vision became the foundation for the establishment of the Hyderabad chapter of Sai Yadadri Seva Ashramam.</p>\n<h2>From a Vision to a Community</h2>\n<p>The early journey was driven by a small group of people who believed that meaningful social change begins with individual responsibility.</p>\n<p>The founding members contributed their resources, time and commitment to establish a sustainable foundation for the Ashram's work. Their collective effort gradually brought together a wider circle of people who shared the same values.</p>\n<p>Over time, this community grew into a network of more than 100 members, united by the desire to support the Ashram and its service activities.</p>\n<p>The growth of the Ashram has therefore never been only about buildings or facilities. Its greatest strength has been the growing community of people who believe in seva.</p>\n<h2>2019 — The Vision Takes Shape</h2>\n<p>2019 marked an important beginning in the Ashram's journey.</p>\n<p>The vision of creating a stronger and wider support system for vulnerable people began taking shape through the efforts of Sri Debbadi Ashok, fellow BSNL employees and socially conscious citizens.</p>\n<p>The founding vision was simple yet profound:</p>\n<p><em>To create a place where care, dignity and compassion could become a part of everyday life.</em></p>\n<h2>2020 — The Old Age Home</h2>\n<p>A significant milestone came in February 2020, when the Free Old Age Home began operating at Pedakonduru Village, Choutuppal Mandal, Yadadri Bhuvanagiri District.</p>\n<p>The Ashram became a place where poor elderly people could find shelter, nourishment, companionship and essential support in a peaceful environment.</p>\n<p>The facility was made possible through the generosity of Respected Donor Sri Mayreddi Satyanarayana Reddy Garu and Smt. Janakamma Garu, who donated the building for the Ashram's service.</p>\n<p>Their contribution became an important part of the Ashram's history and helped provide a lasting foundation for its residential care.</p>\n<h2>A Home Built on Dignity</h2>\n<p>The Free Old Age Home has a capacity of 40 permanent residents.</p>\n<p>But the purpose of the home extends beyond providing a roof over someone's head.</p>\n<p>It seeks to create an environment where residents can experience:</p>\n<ul>\n<li>Safety</li>\n<li>Nourishment</li>\n<li>Companionship</li>\n<li>Care</li>\n<li>Spiritual wellbeing</li>\n<li>Daily engagement</li>\n<li>Dignity and respect</li>\n</ul>\n<p>Prayer, meditation, yoga, bhajans, games and walking form part of the daily rhythm of life at the Ashram.</p>\n<p>In this way, the Ashram strives to make the home a place of belonging rather than simply a place of residence.</p>\n<h2>The Journey Expands</h2>\n<p>As the Ashram developed, its understanding of seva expanded beyond residential care.</p>\n<p>The organisation began supporting other areas where assistance could make a meaningful difference, including:</p>\n<h3>Annaprasadam</h3>\n<p>Sharing nutritious food became an important expression of seva. Individuals and families can also associate their special occasions with the Ashram through meal sponsorship.</p>\n<h3>Education</h3>\n<p>The Ashram extended its service towards education by supporting students through educational resources, tuition assistance and related initiatives.</p>\n<h3>Medical Support</h3>\n<p>Medical camps, eye camps, cataract-surgery assistance and support for people facing chronic illness became part of the organisation's wider service efforts.</p>\n<h3>Goseva</h3>\n<p>The Ashram's Goshala became another expression of compassion, with care extended to cows and calves and dedicated land used for fodder cultivation.</p>\n<h3>Daily Seva</h3>\n<p>Prayer, meditation, yoga, bhajans, games and walking contribute to the physical, emotional and spiritual wellbeing of residents.</p>\n<h2>Growing Through Collective Giving</h2>\n<p>The Ashram's journey has been sustained by the collective contribution of its community.</p>\n<p>The initial foundation was supported by the founding members, who contributed significant personal resources towards establishing the organisation.</p>\n<p>As the Ashram grew, members, donors, volunteers and well-wishers continued to contribute according to their ability and commitment.</p>\n<p>This spirit of collective giving remains central to the Ashram's journey.</p>\n<p>The strength of Sai Yadadri Seva Ashramam is therefore not measured only by its facilities or activities, but by the people who continue to stand behind its mission.</p>\n<h2>A Spiritual Journey Through Service</h2>\n<p>The Ashram's journey is deeply connected to the principle:</p>\n<p><em>Maanava Sevaaye Madhava Seva<br>Service to Humanity is Service to God.</em></p>\n<p>For the Ashram, seva is a form of spiritual practice.</p>\n<p>A meal offered with love, time spent with an elderly resident, support given to a student, assistance offered during a medical crisis or care extended to an animal can all become expressions of devotion.</p>\n<p>This understanding gives the Ashram's work its spiritual character.</p>\n<p>The journey is not simply about providing services. It is about recognising the dignity of every life and responding with compassion.</p>\n<h2>The People Behind the Journey</h2>\n<p>Every milestone in the Ashram's history has been made possible through people.</p>\n<p>From the founders who gave the first direction, to members who contribute regularly, donors who support specific needs, volunteers who give their time and well-wishers who continue to encourage the organisation — the Ashram's history belongs to a collective community.</p>\n<p>Their contribution has helped transform an initial vision into an ongoing movement of service.</p>\n<h2>The Journey Continues</h2>\n<p>The story of Sai Yadadri Seva Ashramam is still being written.</p>\n<p>From its beginnings in 2019, to the establishment of the Free Old Age Home in February 2020, and the continuing expansion of its service initiatives, the Ashram has grown through faith, commitment and collective effort.</p>\n<p>Its journey continues with the same foundational belief:</p>\n<p><em>When we serve another human being with compassion, we are serving something divine.</em></p>\n<p>The future of the Ashram rests on continuing this spirit of seva — strengthening care for poor elderly people, supporting education and healthcare, nurturing community participation and creating opportunities for more people to experience the joy of service.</p>\n<h2>A Journey of Seva, A Journey of Hope</h2>\n<p>Sai Yadadri Seva Ashramam began with a vision.<br>It grew through collective faith.<br>It was strengthened through generosity.<br>And it continues through seva.</p>\n<p>As the Ashram moves forward, its purpose remains unchanged:</p>\n<p><strong>To serve with compassion.<br>To care with dignity.<br>To give with devotion.</strong></p>\n<p><em>Maanava Sevaaye Madhava Seva.<br>Service to Humanity is Service to God.</em></p>",
      missionEn:
        '<h2>Serving Humanity. Nurturing Spirituality. Walking the Path of Seva.</h2>\n<p><em>Maanava Sevaaye Madhava Seva</em><br>Service to Humanity is Service to God</p>\n<p>The mission of Sai Yadadri Seva Ashramam is to bring spiritual values into everyday life through selfless service, compassion and devotion.</p>\n<p>We believe that spirituality is not separate from society. True devotion is reflected in how we treat those around us, how we respond to suffering and how willingly we offer our time, resources and abilities for the wellbeing of others.</p>\n<p>Through seva, we seek to create a community where devotion inspires service and service deepens devotion.</p>\n<h2>Our Spiritual Mission</h2>\n<p>At the heart of the Ashram\'s mission is the pursuit of a life guided by faith, compassion, humility and selfless service.</p>\n<p>We strive to provide devotees with an environment where spiritual values can be experienced through prayer, meditation, bhajans, satsang, seva and meaningful participation in community welfare.</p>\n<p>Our aim is not only to encourage spiritual practices, but to help devotees carry those values into their daily lives.</p>\n<p>A prayer offered with devotion becomes deeper when it is followed by an act of compassion.</p>\n<h2>Service to Humanity</h2>\n<p>Our mission is rooted in the belief that every human being deserves dignity, care and respect.</p>\n<p>Through our service activities, we seek to support people who are vulnerable or facing difficult circumstances, particularly poor elderly people and those who require assistance with essential needs.</p>\n<p>Our service extends through areas such as:</p>\n<ul>\n<li>Care and support for poor elderly people</li>\n<li>Nourishment and Annaprasadam</li>\n<li>Educational assistance</li>\n<li>Medical and emergency support</li>\n<li>Goseva and care for animals</li>\n<li>Community-oriented welfare initiatives</li>\n</ul>\n<p>Each initiative represents the same underlying purpose — to respond to genuine need with compassion and responsibility.</p>\n<h2>Preserving Sanatana Dharma</h2>\n<p>Sai Yadadri Seva Ashramam seeks to preserve and promote the timeless values of Sanatana Dharma through spiritual practice, righteous living, compassion and seva.</p>\n<p>We believe that Sanatana Dharma is not merely a tradition to be preserved in words. Its principles can be kept alive through the way we live, serve and treat others.</p>\n<p>Values such as:</p>\n<ul>\n<li><strong>Dharma</strong> — living with righteousness and responsibility</li>\n<li><strong>Seva</strong> — serving others without selfish expectation</li>\n<li><strong>Daya</strong> — showing compassion towards all living beings</li>\n<li><strong>Satya</strong> — valuing truth and integrity</li>\n<li><strong>Bhakti</strong> — developing devotion and surrender to the Divine</li>\n</ul>\n<p>form an important part of the spiritual foundation that guides our service.</p>\n<p>Our mission is to encourage these values not only within the Ashram, but also among devotees, families and the wider community.</p>\n<h2>Spiritual Growth Through Seva</h2>\n<p>We believe that spiritual growth can happen through service.</p>\n<p>When we serve an elderly person, we learn patience.</p>\n<p>When we share food, we learn gratitude.</p>\n<p>When we support someone in difficulty, we learn compassion.</p>\n<p>When we give without expecting recognition, we learn humility.</p>\n<p>When we serve together as a community, we experience unity.</p>\n<p>In this way, seva becomes more than an activity. It becomes a path of inner transformation.</p>\n<p>The Ashram encourages devotees to discover this connection between Bhakti and Seva — devotion expressed through action.</p>\n<h2>Guiding Devotees on the Path of Compassion</h2>\n<p>Our mission includes creating opportunities for devotees to experience the joy and fulfilment of selfless service.</p>\n<p>Every person may contribute differently.</p>\n<p>Some may offer their time.</p>\n<p>Some may offer their skills.</p>\n<p>Some may support a service initiative.</p>\n<p>Some may participate in prayer, bhajans or spiritual activities.</p>\n<p>Others may simply spend time with residents and offer companionship.</p>\n<p>What matters is the spirit with which the service is offered.</p>\n<p>We seek to encourage devotees to move from "What can I receive?" towards "What can I give?"</p>\n<h2>Welfare of the Community</h2>\n<p>The Ashram\'s mission extends beyond its residential home.</p>\n<p>We believe a spiritual institution should remain connected to the needs of the society around it.</p>\n<p>Through education support, healthcare assistance, nourishment and other community-oriented initiatives, we seek to respond wherever genuine need arises.</p>\n<p>Our intention is to contribute towards a society where people care for one another and where compassion becomes a shared responsibility.</p>\n<h2>Compassion for All Living Beings</h2>\n<p>Our understanding of seva extends beyond human welfare.</p>\n<p>Through Goseva, the Ashram seeks to nurture compassion and responsibility towards animals.</p>\n<p>Caring for animals reminds us of an important spiritual principle — that compassion should not be limited by boundaries.</p>\n<p>Every living being deserves care and kindness.</p>\n<h2>Building a Community of Seva</h2>\n<p>We believe that meaningful service becomes stronger when people come together.</p>\n<p>The Ashram brings together devotees, members, volunteers, donors and well-wishers who share a common desire to contribute towards social and spiritual wellbeing.</p>\n<p>Our mission is to nurture this community and provide meaningful opportunities for people to participate in seva according to their abilities and circumstances.</p>\n<p>Together, individual acts of kindness can become a sustained movement of service.</p>\n<h2>Living the Values We Teach</h2>\n<p>Our mission is not simply to speak about compassion, spirituality or service.</p>\n<p>It is to live these values.</p>\n<p>We strive to create an environment where:</p>\n<ul>\n<li>Devotion leads to compassion.</li>\n<li>Compassion leads to service.</li>\n<li>Service leads to humility.</li>\n<li>Humility strengthens spiritual growth.</li>\n<li>Spiritual growth inspires greater service.</li>\n</ul>\n<p>This creates a continuous journey where Bhakti and Seva strengthen one another.</p>\n<h2>Our Commitment</h2>\n<p>Sai Yadadri Seva Ashramam remains committed to pursuing its mission with faith, humility, compassion and responsibility.</p>\n<p>We seek to preserve the spiritual values that guide our organisation while responding meaningfully to the changing needs of society.</p>\n<p>Our mission is not measured only by the number of people we serve.</p>\n<p>It is also measured by the lives touched, the hope restored, the compassion awakened and the devotees inspired to walk the path of selfless service.</p>\n<h2>Our Mission in One Thought</h2>\n<p>To nurture spiritual growth through devotion and seva, preserve the timeless values of Sanatana Dharma, serve humanity with compassion, support community welfare and inspire devotees to recognise the Divine through selfless service.</p>\n<p><em>Maanava Sevaaye Madhava Seva<br>Service to Humanity is Service to God.</em></p>',
      founderBioEn:
        '<h2>Sri Debbadi Ashok</h2>\n<h3>Founder President, Sai Yadadri Seva Ashram</h3>\n<p><em>A lifelong journey dedicated to social service, rural development, education, welfare of poor elderly people and community empowerment.</em></p>\n<p>Sri Debbadi Ashok is a social-service leader whose lifelong commitment to helping poor elderly people, the needy, rural communities and young people has shaped his journey of service. Born in 1960 in Thamsi Village, Adilabad District, to Smt. Suseela and Sri Gundaiah, he completed his schooling in Sai Lingi Village and his Intermediate and Degree education in Adilabad. He began his professional career as a Junior Engineer in the Department of Telecommunications (DoT). From an early age, he developed a strong interest in social service.</p>\n<h2>A Journey of Seva</h2>\n<ul>\n<li><strong>1960</strong> — Early Life</li>\n<li><strong>2000</strong> — Beginning of Organised Social Service</li>\n<li><strong>2000–2008</strong> — Rural Community Development</li>\n<li><strong>2018</strong> — Full-Time Commitment to Seva</li>\n<li><strong>2019</strong> — Sai Yadadri Seva Ashram</li>\n<li><strong>2020</strong> — Vanaprasthasramam</li>\n</ul>\n<h2>A Journey Rooted in Social Service</h2>\n<p>While still in service, Sri Debbadi Ashok began his organised social-service journey in 2000 by establishing the Sri Shirdi Sai Seva Society in Sai Lingi Village, Adilabad, with the aim of helping poor and needy people and improving living conditions in the village and surrounding communities.</p>\n<p>His early service vision centred on Gudi-Badi-Tadi-Vodi — Temple, School, Water and Shelter — as essential elements for the development and welfare of rural communities.</p>\n<h2>Building Communities Through Service</h2>\n<p>Between 2000 and 2008, working together with local people, Sri Debbadi Ashok contributed to the development of a Sai Baba Temple, a school, bore wells and an Old Age Home providing free food, accommodation and medical facilities. He also contributed to the construction of 600 toilets in Thamsi Village and 200 percolation pits aimed at improving groundwater levels.</p>\n<ul>\n<li>Established 100 water purification plants in villages across Adilabad District in association with Balvikas Organization.</li>\n<li>Created infrastructure of approximately 5,000 square feet to support rural youth in pursuing self-employment.</li>\n<li>Helped rural youth access the infrastructure and required bank-loan support for self-employment opportunities.</li>\n</ul>\n<h2>Empowering Rural Youth Through Skills</h2>\n<p>Sri Debbadi Ashok established a Skill Development Training Centre in Adilabad to help rural youth develop practical skills and become self-reliant. Training initiatives included Computers, Fashion Designing, Driving, Tailoring, Maggam Works, Motor Mechanism and other vocational areas.</p>\n<p>He also worked in association with Sri Ramanandateertha Rural Training Institute, Pochampalli, to extend skill-development and vocational training opportunities to rural youth in Adilabad and Nirmal districts.</p>\n<h2>A Full-Time Commitment to Seva</h2>\n<p>In 2018, Sri Debbadi Ashok took Voluntary Retirement from BSNL in order to dedicate himself fully to social service. In 2019, together with retired BSNL employees and other interested individuals, he helped establish Sai Yadadri Seva Ashram to extend his service activities to Hyderabad and surrounding areas.</p>\n<p>In 2020, an Old Age Home named Vanaprasthasramam was started at Peddakonduru Village, Choutuppal Mandal, Bhongir District. The facility provides free accommodation, food and medical support to poor elderly people and physically challenged persons in need.</p>\n<h2>Serving Poor Elderly People and the Physically Challenged</h2>\n<p>Vanaprasthasramam at Peddakonduru was established as an extension of Sri Debbadi Ashok\'s commitment to caring for poor elderly people and others in need. The home provides free accommodation, food and medical facilities and is supported through donations and contributions from generous individuals and members.</p>\n<p>A G+2 building of approximately 4,500 square feet was also initiated at Peddakonduru to expand accommodation capacity. The project received donations from members of society along with government support, with the completed first floor brought into use.</p>\n<h2>Supporting Education and Young Minds</h2>\n<p>Sri Debbadi Ashok has also extended his service into the field of education. Members associated with Sai Yadadri Seva Ashram, including retired professionals, formed a group to support educational development and adopted Zilla Parishad High School, Uppal. Special classes were conducted for students of Classes 9 and 10 to strengthen academic skills, along with computer education.</p>\n<ul>\n<li>Providing notebooks, school bags, pens, pencils and other educational materials to economically disadvantaged students.</li>\n<li>Supporting educational activities at schools in Attapur and Champapet.</li>\n<li>Supporting teaching requirements through a Vidya Volunteer initiative where additional teaching support was needed.</li>\n<li>Helping students improve their academic skills and access better educational opportunities.</li>\n</ul>\n<h2>Service to Physically Challenged Persons</h2>\n<p>At Vanaprasthasramam in Peddakonduru, service camps have been organised for physically challenged persons, including the distribution of grocery items, bed sheets and general medicines. Similar support has also been extended to physically challenged persons at Sai Vruddhasramam in Sai Lingi.</p>\n<p>The service initiatives also include providing groceries, medicines and other essential materials to individuals facing severe physical challenges and requiring continued support.</p>\n<h2>Medical Care for Poor Elderly People</h2>\n<p>Recognising the importance of healthcare for elderly residents in Old Age Homes, Sri Debbadi Ashok has remained connected with social organisations and supported the organisation of medical camps at the Peddakonduru and Sai Lingi Old Age Homes. These initiatives include periodic health check-ups and support with medicines for elderly residents.</p>\n<h2>A Vision for a Healthy and Self-Reliant Society</h2>\n<p>Sri Debbadi Ashok\'s vision is that every person in society should be able to lead a happy and healthy life. He believes that individuals should give equal importance to family, profession and society, use their available time meaningfully, develop spiritual values and contribute to helping others.</p>\n<p>From 2000 to 2018, he dedicated 25 percent of his salary towards social activities, and from 2018 onwards he has dedicated 50 percent of his pension towards social service.</p>\n<p>A major part of his vision is to ensure that rural youth receive opportunities and support comparable to those available in urban areas and are empowered to become self-reliant.</p>\n<h2>Recognition for Service</h2>\n<p>Sri Debbadi Ashok has received recognition for his social-service contributions, including the Dr. APJ Abdul Kalam State Level Award and Ambedkar Seva Purashkar. He has also been felicitated by various organisations for his service contributions.</p>\n<ul>\n<li>Executive Member of Atmeeya Nilayam Old Age Home at Pochampad, Nirmal District.</li>\n<li>Adviser to Goleti Ashram, Asifabad District.</li>\n<li>Director of Jala Vikasa Federation for purified water plants in four districts.</li>\n<li>Director of an organisation associated with eye, organ and body donation awareness.</li>\n</ul>\n<h2>A Life Dedicated to Seva</h2>\n<p>The journey of Sri Debbadi Ashok reflects a sustained commitment to social responsibility, rural development, education, healthcare, welfare of poor elderly people and support for people in need. His work is rooted in the belief that meaningful social change becomes possible when individuals dedicate their time, resources and experience towards the welfare of others.</p>\n<h2>A Legacy of Service</h2>\n<ul>\n<li>100 Water Purification Plants</li>\n<li>600 Toilets</li>\n<li>200 Percolation Pits</li>\n<li>Rural Skill Development</li>\n<li>Education Support</li>\n<li>Welfare of Poor Elderly People</li>\n<li>Medical Camps</li>\n<li>Support for Physically Challenged Persons</li>\n</ul>\n<h2>A Continuing Commitment</h2>\n<p>Sri Debbadi Ashok has expressed his commitment to continue serving society throughout his life and encourages others to come forward and participate in social service.</p>\n<p>His journey continues to inspire the belief that service becomes stronger when individuals and communities come together with compassion, responsibility and a willingness to help others.</p>\n<h2>Sri Kommidi Vidya Sagar Reddy</h2>\n<h3>Treasurer, Sai Yadadri Seva Ashram</h3>\n<img src="/images/real/committee-k-vidyasagar-reddy.jpg" alt="Sri Kommidi Vidya Sagar Reddy">\n<h2>Personal Profile</h2>\n<p>Sri Kommidi Vidya Sagar Reddy is a socially committed individual with a strong spirit of community service. He holds M.Sc. and MBA qualifications and served as an Assistant General Manager (AGM) at BSNL before taking Voluntary Retirement (VRS).</p>\n<p>He actively participates in social-service and educational initiatives. As a motivational speaker and mathematics teacher, he uses his knowledge and experience to guide and inspire students and young people.</p>\n<p>Currently, Sri Kommidi Vidya Sagar Reddy serves as the Treasurer of Sai Yadadri Seva Ashram, Peddakonduru, contributing his support to the Ashram\'s service and welfare initiatives.</p>\n<p>He also continues to be associated with the Lions Club and the Indian Red Cross Society, participating in humanitarian and social-service activities.</p>\n<p>With his dedication to education, inspiration, social welfare and voluntary service, Sri Kommidi Vidya Sagar Reddy continues to contribute to the welfare of society.</p>\n<ul>\n<li>M.Sc. and MBA qualifications</li>\n<li>Former Assistant General Manager (AGM), BSNL</li>\n<li>Motivational Speaker</li>\n<li>Mathematics Teacher</li>\n<li>Treasurer, Sai Yadadri Seva Ashram, Peddakonduru</li>\n<li>Member of Lions Club</li>\n<li>Member of Indian Red Cross Society</li>\n</ul>\n<h2>A Vision Rooted in Seva</h2>\n<p>The founding vision of Sai Yadadri Seva Ashramam is based on a simple but powerful belief:</p>\n<p><em>True devotion finds expression through service.</em></p>\n<p>For Sri Debbadi Ashok and the Ashram community, seva is not merely an activity. It is a way of living one\'s spiritual values.</p>\n<p>The Ashram seeks to provide opportunities for people to transform their faith into action — through caring for poor elderly people, supporting those in need, participating in community welfare and contributing towards a compassionate society.</p>\n<p>This vision continues to guide the Ashram\'s work today.</p>\n<h2>The Leadership Team</h2>\n<p>The journey of Sai Yadadri Seva Ashramam has been strengthened by the collective dedication of its founding members and volunteers.</p>\n<p>Since its establishment in 2019, the leadership team has worked together to uphold the Ashram\'s spiritual and social mission and to build a community based on service, devotion and responsibility.</p>\n<h3>Sri Appalaraju</h3>\n<img src="/images/real/committee-g-appala-raju.jpg" alt="Sri Appalaraju">\n<p><strong>Vice President</strong> — Supports the leadership and continued development of the Ashram\'s service initiatives.</p>\n<h3>Sri J. Yanadi Setty</h3>\n<img src="/images/real/committee-j-yanadi-setty.jpg" alt="Sri J. Yanadi Setty">\n<p><strong>General Secretary</strong> — Contributes to the organisation and coordination of the Ashram\'s activities and community initiatives.</p>\n<h3>Sri S. Mahesh</h3>\n<img src="/images/real/committee-s-mahesh.jpg" alt="Sri S. Mahesh">\n<p><strong>Organising Secretary</strong></p>\n<p>Sri S. Mahesh is a distinguished retired Assistant General Manager of BSNL, with an illustrious service of 36 years and 3 months in the Department of Telecommunications and BSNL. He served in various important assignments in India and abroad and was honoured with the prestigious Sanchar Sree Award in 1989.</p>\n<p>After taking VRS in 2020, he dedicated himself to social service. As the Organising Secretary of Sai Yadadri Seva Ashram, Peddakondur, he has been serving elderly residents with compassion and commitment since its establishment in 2020.</p>\n<p>He is presently serving as the Circle Secretary of AIRBSNLEWA, Telangana Circle, a volunteer for CGHS beneficiaries, and the General Secretary of Gokul Enclave Colony, Hyderabad.</p>\n<p>A committed social worker and compassionate humanitarian, Sri S. Mahesh continues to inspire society through his selfless service.</p>\n<h2>Leadership Through Collective Responsibility</h2>\n<p>The Ashram\'s journey is not the work of one individual alone.</p>\n<p>It has been shaped by the collective efforts of its leadership team, founding members, volunteers, devotees, donors and well-wishers.</p>\n<p>Together, they strive to preserve the values on which the Ashram was founded:</p>\n<ul>\n<li><strong>Devotion</strong> — keeping spiritual values at the heart of service.</li>\n<li><strong>Compassion</strong> — responding to the needs of others with kindness.</li>\n<li><strong>Integrity</strong> — carrying out responsibilities with sincerity and accountability.</li>\n<li><strong>Selfless Service</strong> — giving time, resources and effort for the welfare of others.</li>\n<li><strong>Collective Responsibility</strong> — recognising that meaningful service becomes stronger when people work together.</li>\n</ul>\n<h2>Continuing the Founding Vision</h2>\n<p>The leadership of Sai Yadadri Seva Ashramam remains committed to carrying forward the vision with which the organisation began in 2019.</p>\n<p>As the Ashram continues its journey, the founding principle remains unchanged:</p>\n<p><em>Maanava Sevaaye Madhava Seva.<br>Service to Humanity is Service to God.</em></p>\n<p>The Founder and Leadership Team continue to guide the Ashram towards a future where spirituality inspires service, service strengthens community, and compassion becomes a way of life.</p>',
      treasurerMessageEn:
        '<h2>Sri Kommidi Vidya Sagar Reddy</h2>\n<h3>Treasurer, Sai Yadadri Seva Ashram</h3>\n<p><em>Supports the responsible financial administration of the Ashram and contributes to its service, welfare and community initiatives.</em></p>\n<h2>Personal Introduction</h2>\n<p>Sri Kommidi Vidya Sagar Reddy is a socially committed individual with a strong passion for education, motivation and community service. He holds M.Sc. and MBA qualifications and served Bharat Sanchar Nigam Limited (BSNL) in the position of Assistant General Manager (AGM) before taking Voluntary Retirement (VRS).</p>\n<h2>Education &amp; Professional Background</h2>\n<p>With a strong academic and professional background, Sri Kommidi Vidya Sagar Reddy actively participates in social service and educational initiatives. As a motivational speaker and mathematics teacher, he shares his knowledge, experience and practical insights to guide, encourage and inspire students and young people.</p>\n<h2>Role in Sai Yadadri Seva Ashram</h2>\n<p>Sri Kommidi Vidya Sagar Reddy currently serves as the Treasurer of Sai Yadadri Seva Ashram, Peddakonduru, where he contributes to the Ashram\'s service, welfare and community development initiatives. Through his involvement, he supports the Ashram\'s commitment to serving people in need and strengthening its social welfare activities.</p>\n<h2>Social Service</h2>\n<p>In addition to his responsibilities at Sai Yadadri Seva Ashram, he continues to contribute to humanitarian and community service activities as a member of the Lions Club and the Indian Red Cross Society.</p>\n<h2>Commitment</h2>\n<p>With a deep commitment to education, motivation, social welfare and voluntary service, Sri Kommidi Vidya Sagar Reddy continues to dedicate his knowledge, experience and time towards making a meaningful contribution to society. His work reflects his belief in empowering individuals through education, inspiring young people through guidance and supporting communities through selfless service.</p>\n<h2>Contact</h2>\n<p>Mobile: <a href="tel:9490600600">9490600600</a></p>\n<p>Email: <a href="mailto:kvsreddybsnl@gmail.com">kvsreddybsnl@gmail.com</a></p>',
    },
    blocksTe: {
      aboutEn:
        '<p>“మానవ సేవయే మాధవ సేవ” అనే పవిత్ర సిద్ధాంతంతో ప్రేరణ పొంది, సాయి యాదాద్రి సేవా ఆశ్రమం సమాజంలోని అత్యంత బలహీన వర్గాలకు గౌరవం, ఆరోగ్యం మరియు ఆశను పునరుద్ధరించడానికి అంకితమైన ఒక నమోదిత సామాజిక సేవా సంస్థ. నిరుపేద వృద్ధులు, అనాథలు, శారీరక వైకల్యం కలిగినవారు మరియు మానసిక అనారోగ్యంతో బాధపడేవారికి ఉచిత ఆశ్రయం, పౌష్టికాహారం మరియు సమగ్ర వైద్య సంరక్షణను అందించడం ద్వారా వారికి సంపూర్ణ ఆశ్రయం కల్పించడమే మా ప్రధాన లక్ష్యం.</p>\n<h3>మా ప్రయాణం &amp; ఆవిర్భావం</h3>\n<p>2019లో శ్రీ దెబ్బాడి అశోక్ అనే దూరదృష్టి కలిగిన BSNL అధికారి ద్వారా మా లక్ష్యానికి బీజం పడింది. ఆయన అప్పటికే ఆదిలాబాద్ జిల్లా, సాయి లింగి గ్రామంలో విజయవంతంగా ఒక వృద్ధాశ్రమాన్ని నడుపుతున్నారు. ఈ కీలకమైన సంరక్షణ వ్యవస్థను విస్తరించాలనే సంకల్పంతో, ఆయన సానుభూతి కలిగిన BSNL ఉద్యోగుల బృందంతో (పనిచేస్తున్నవారు మరియు పదవీ విరమణ చేసినవారు) మరియు సామాజిక స్పృహ కలిగిన పౌరులతో కలిసి హైదరాబాద్ శాఖను స్థాపించారు.</p>\n<p>కొద్దిమంది దూరదృష్టి కలిగిన స్థాపకులతో ప్రారంభమైన ఈ సంస్థ, సామాజిక సేవ కోసం ఏకతాటిపై పనిచేస్తున్న 100 మందికి పైగా అంకిత సభ్యులతో బలమైన, పారదర్శకమైన నెట్‌వర్క్‌గా విస్తరించింది.</p>\n<h3>మా ఆశ్రయం</h3>\n<p>2020 ఫిబ్రవరి నుండి, మా ఉచిత వృద్ధాశ్రమం 40 మంది శాశ్వత నివాసితులతో పూర్తి సామర్థ్యంతో నడుస్తోంది. ఈ కేంద్రం యాదాద్రి భువనగిరి జిల్లా, చౌటుప్పల్ మండలం, పెదకొండూరు గ్రామంలో ప్రశాంతమైన వాతావరణంలో ఉంది. ఈ ఆశ్రయం దయాగుణం కలిగిన దంపతులు శ్రీమతి &amp; శ్రీ మాయిరెడ్డి సత్యనారాయణ రెడ్డి &amp; జానకమ్మ దానం చేసిన భవనంలో కొనసాగుతోంది.</p>\n<h3>ఆశ్రయానికి మించి: మా సేవా మూలస్తంభాలు</h3>\n<p>మా నివాస గృహం మా పునాదిగా కొనసాగుతున్నప్పటికీ, మా దృక్పథం మూడు విభిన్న మూలస్తంభాల ద్వారా సామాజిక సాధికారత వైపు లోతుగా విస్తరిస్తుంది:</p>\n<ul>\n<li><strong>సంపూర్ణ నివాస సంరక్షణ:</strong> వృద్ధులు మరియు వికలాంగులకు 24/7 సంరక్షణ, ప్రామాణిక వైద్య పర్యవేక్షణ మరియు పూర్తిగా ఉచితంగా సమతుల్య భోజనం లభించే సురక్షితమైన, పరిశుభ్రమైన, ఆప్యాయతతో కూడిన వాతావరణాన్ని అందించడం.</li>\n<li><strong>భావి తరాన్ని సాధికారం చేయడం:</strong> నిరుపేద నేపథ్యం నుండి వచ్చిన ప్రతిభావంతులైన విద్యార్థులను గుర్తించి, వారి పాఠశాల లేదా కళాశాల ఫీజులను పూర్తిగా స్పాన్సర్ చేయడం ద్వారా పేదరిక చక్రాన్ని ఛేదించడం — ఆర్థిక ఇబ్బందులు ఏ బిడ్డ ఉన్నత విద్యను ఎప్పుడూ ఆపకుండా చూడడం.</li>\n<li><strong>అత్యవసర వైద్య సహాయం:</strong> ఆరోగ్య సంక్షోభ సమయాల్లో జీవనాధారంగా నిలవడం. ఆకస్మిక వైద్య అత్యవసర పరిస్థితులను ఎదుర్కొంటున్న నిరుపేద బాధితులకు — ఇటీవల రావణపల్లి గ్రామానికి చెందిన శ్రీ వెంకటేశం కేసులో మేము అందించిన సహాయం వంటిది — తక్షణ ఆర్థిక మరియు లాజిస్టిక్ సహాయాన్ని అందించడం.</li>\n</ul>\n<h3>సుస్థిరత &amp; పారదర్శకత</h3>\n<p>మా కార్యకలాపాలు పూర్తిగా సామూహిక దాతృత్వ స్ఫూర్తితో నడుస్తాయి. మా మూల స్థాపకులు ₹1 లక్ష మరియు అంతకంటే ఎక్కువ మొత్తాలను అందించడం ద్వారా ప్రారంభ ఏర్పాటుకు నిధులు సమకూర్చారు. నేడు, మా సభ్యుల నిర్మాణాత్మక, పారదర్శక విరాళాల ద్వారా — వారు నెలవారీ, త్రైమాసిక లేదా వార్షిక ప్రాతిపదికన సౌకర్యవంతంగా విరాళం ఇస్తారు — మా రోజువారీ కార్యకలాపాలు నిరాటంకంగా కొనసాగుతున్నాయి.</p>\n<h3>మీరు ఎలా సహాయం చేయవచ్చు: తదుపరి అడుగులు</h3>\n<p>మేము ఒంటరిగా దీన్ని చేయలేము. మీ దయ తీవ్ర క్లేశంలో ఉన్న ఎవరికైనా సురక్షితమైన రేపటిని అందించగలదు. మాతో అనుసంధానమై, ఈరోజే మా లక్ష్యానికి మద్దతు ఇవ్వగల మార్గాలను తెలుసుకోండి:</p>\n<h4>1. నమోదిత సభ్యులుగా చేరండి</h4>\n<p>100 మందికి పైగా మార్పు కోసం పనిచేసేవారి మా ప్రధాన నెట్‌వర్క్‌లో చేరండి. మీకు అనువైన సభ్యత్వ విధానాన్ని ఎంచుకోవడం ద్వారా మా రోజువారీ నిర్వహణ ఖర్చులకు మద్దతు ఇవ్వవచ్చు:</p>\n<ul>\n<li><strong>నెలవారీ మద్దతు:</strong> ఒక నివాసి ఆహారం మరియు మందుల కోసం ప్రతి నెల ₹3,000/- అందించండి.</li>\n<li><strong>త్రైమాసిక/వార్షిక మద్దతు:</strong> కాలానుగుణ వైద్య శిబిరాలు లేదా నిర్వహణ కోసం మీ విరాళాలను సమీకరించండి.</li>\n<li><strong>జీవితకాల సభ్యత్వం:</strong> మా మౌలిక సదుపాయాలను విస్తరించడంలో సహాయపడేందుకు ₹1 లక్ష లేదా అంతకంటే ఎక్కువ శాశ్వత విరాళం అందించండి.</li>\n</ul>\n<h4>2. ప్రత్యేక దినోత్సవాన్ని స్పాన్సర్ చేయండి</h4>\n<p>మీ ముఖ్యమైన సందర్భాలను — పుట్టినరోజులు, వివాహాలు, వార్షికోత్సవాలు లేదా ప్రియమైనవారి జ్ఞాపకార్థం — మా నివాసితులకు ఆనందాన్ని పంచడం ద్వారా జరుపుకోండి:</p>\n<ul>\n<li><strong>భోజనం స్పాన్సర్ చేయండి:</strong> 40 మంది నివాసితులందరికీ ఒక అల్పాహారం, భోజనం లేదా పూర్తి రోజు పౌష్టికాహారం కోసం నిధులు సమకూర్చండి.</li>\n<li><strong>వార్షికోత్సవం/జ్ఞాపక పూజ:</strong> మీ కుటుంబ గౌరవార్థం ప్రార్థనలు మరియు ప్రత్యేక ప్రసాదాల పంపిణీ కోసం ఒక రోజును అభ్యర్థించండి.</li>\n</ul>\n<h4>3. విద్య &amp; అత్యవసర వైద్య నిధులకు మద్దతు ఇవ్వండి</h4>\n<p>ఆశ్రమ సరిహద్దులకు ఆవల లక్ష్యిత సామాజిక సహాయం వైపు మీ దాతృత్వాన్ని మళ్లించండి:</p>\n<ul>\n<li><strong>ఒక విద్యార్థిని దత్తత తీసుకోండి:</strong> నిరుపేద నేపథ్యం నుండి వచ్చిన ధృవీకరించబడిన, ప్రతిభావంతుడైన విద్యార్థి వార్షిక పాఠశాల లేదా కళాశాల ట్యూషన్ ఫీజులను పూర్తిగా స్పాన్సర్ చేయండి.</li>\n<li><strong>అత్యవసర వైద్య నిధి:</strong> గ్రామీణ ప్రాంతాల ప్రజలు తీవ్రమైన ప్రమాదాలు లేదా ఆరోగ్య సంక్షోభాలను ఎదుర్కొన్నప్పుడు వేగంగా ఆర్థిక సహాయం అందించగలిగేలా మా వైద్య సహాయ నిధికి నేరుగా విరాళం ఇవ్వండి.</li>\n</ul>\n<h4>4. మమ్మల్ని సందర్శించండి &amp; వాలంటీర్‌గా చేరండి</h4>\n<p>వ్యక్తులు, కుటుంబాలు మరియు కార్పొరేట్ బృందాలు మా పెదకొండూరు గ్రామ క్యాంపస్‌ను సందర్శించడానికి స్వాగతం. వృద్ధులతో నాణ్యమైన సమయాన్ని గడపండి, మా గోశాలలో సహాయం చేయండి, లేదా నివాసితుల కోసం వినోద/సాంస్కృతిక కార్యక్రమాన్ని నిర్వహించండి. మీ సమయం మరియు సమక్షం వారికి ప్రపంచమంత విలువైనవి.</p>',
      visionEn:
        '<h3>వృద్ధుల సంరక్షణ &amp; మద్దతు</h3>\n<p>ప్రతి వృద్ధుడు సంపూర్ణ గౌరవంతో, ఉత్తేజకరమైన ఆరోగ్యంతో మరియు గాఢమైన అనుబంధ భావనతో జీవించే సమాజాన్ని నిర్మించడం — వారి స్వర్ణయుగాన్ని కేవలం మనుగడ నుండి చురుకైన, గౌరవించబడే సామాజిక నాయకత్వంగా మార్చడం.</p>\n<h3>పరివర్తనాత్మక విద్య &amp; అభ్యాసం</h3>\n<p>జీవితకాల అభ్యాసాన్ని అందరికీ అందుబాటులోకి తీసుకురావడం, విద్యా అవరోధాలను తొలగించడం ద్వారా అన్ని వయసుల వ్యక్తులు తమ పూర్తి మేధో సామర్థ్యాన్ని వెలికితీసి, స్థిరమైన వృత్తి ప్రగతిని సాధించేలా చేయడం.</p>\n<h3>వైద్య మద్దతు &amp; నివారణ ఆరోగ్యం</h3>\n<p>ఆరోగ్య సంరక్షణ అందరి హక్కుగా ఉండే ఒక బలమైన సమాజాన్ని నిర్మించడం — చురుకైన, కరుణాపూర్వక సంరక్షణ ద్వారా వ్యక్తులు వైద్య పేదరిక చక్రం నుండి విముక్తి పొందేలా వారిని శక్తివంతం చేయడం.</p>',
      missionEn:
        '<h3>వృద్ధుల సంరక్షణ &amp; మద్దతు</h3>\n<ul>\n<li>వృద్ధాప్య జనాభాలో ఒంటరితనం మరియు నిరాశను పూర్తిగా తొలగించడానికి నిర్మాణాత్మక, రోజువారీ సామాజిక అనుసంధాన కార్యక్రమాలను రూపొందించడం.</li>\n<li>వృద్ధులు తమ సొంత నివాస స్థలాల్లో స్వయం సమృద్ధిగా, సురక్షితంగా ఉండేలా స్థానికీకరించిన గృహ-సంరక్షణ వ్యవస్థలను అందించడం.</li>\n<li>వృద్ధుల నుండి యువతకు తరతరాల జ్ఞానాన్ని క్రమపద్ధతిలో అందించడానికి చురుకైన కథన మరియు మార్గదర్శక వేదికలను ప్రారంభించడం.</li>\n</ul>\n<h3>పరివర్తనాత్మక విద్య &amp; అభ్యాసం</h3>\n<p>వ్యక్తులు తమ పూర్తి మేధో సామర్థ్యాన్ని వెలికితీసి, స్థిరమైన వృత్తి ప్రగతిని సాధించేలా విద్యా అవరోధాలను తొలగించడం.</p>\n<h3>మూడవ మూలస్తంభం: వైద్య మద్దతు</h3>\n<p>ఆరోగ్య సంరక్షణ కేంద్రాలను స్థాపించడం, వైద్య శిబిరాలను నిర్వహించడం, అవసరమైనవారికి ఉచిత మందులను అందించడం మరియు దీర్ఘకాలిక వ్యాధిగ్రస్తులైన కేసులను సకాలంలో సహాయం కోసం కార్పొరేట్ రంగానికి సూచించడం ద్వారా వృద్ధులకు మరియు గ్రామీణ జనాభాకు వైద్య మద్దతును విస్తరించడం.</p>',
      founderBioEn:
        '<ul>\n<li>శ్రీ దెబ్బాడి అశోక్, వ్యవస్థాపక అధ్యక్షులు.</li>\n<li>శ్రీ అప్పలరాజు, ఉపాధ్యక్షులు.</li>\n<li>శ్రీ జె. యనడి శెట్టి, ప్రధాన కార్యదర్శి.</li>\n<li>శ్రీ కె. విద్యా సాగర్ రెడ్డి, కోశాధికారి.</li>\n<li>శ్రీ ఎస్. మహేష్, నిర్వహణ కార్యదర్శి.</li>\n</ul>',
    },
    updatedAt: '2026-08-06T14:59:39.683Z',
  },
  contact: {
    pageKey: 'contact',
    blocksEn: {
      introEn: '',
    },
    blocksTe: null,
    updatedAt: '2026-08-06T14:59:41.703Z',
  },
  'privacy-policy': {
    pageKey: 'privacy-policy',
    blocksEn: {},
    blocksTe: null,
    updatedAt: null,
  },
  'terms-conditions': {
    pageKey: 'terms-conditions',
    blocksEn: {},
    blocksTe: null,
    updatedAt: null,
  },
  'refund-policy': {
    pageKey: 'refund-policy',
    blocksEn: {},
    blocksTe: null,
    updatedAt: null,
  },
  disclaimer: {
    pageKey: 'disclaimer',
    blocksEn: {},
    blocksTe: null,
    updatedAt: null,
  },
};
