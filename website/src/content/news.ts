/**
 * Build-time snapshot of live CMS data for the Hostinger static export
 * (STATIC_EXPORT=true). Published news posts, keyed by slug for the
 * [slug] detail route.
 */
import type { NewsPost } from '@/types/public';

export const newsPosts: NewsPost[] = [
  {
    id: 'e92f6b6c-b176-4795-9540-afe17f3dcce4',
    titleEn: 'District Collector Visits Sai Yadadri Seva Ashram',
    titleTe: null,
    bodyEn: `
<p><em>Collector calls for improved facilities and continued care for elderly residents.</em></p>
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
<p>The Ashram continues its journey of service with compassion, dignity and a commitment to the wellbeing of elderly residents and the wider community.</p>
`.trim(),
    bodyTe: null,
    slug: 'district-collector-visits-sai-yadadri-seva-ashram',
    publishedAt: '2026-08-21T00:00:00.000Z',
    status: 'published',
    featuredImageUrl: '/images/real/collector-visit-ashram-bulletin.jpg',
    category: 'News & Media',
    tags: [
      'District Collector',
      'Elderly Care',
      'Pedakondur',
      'Community Service',
      'Sai Yadadri Seva Ashram',
    ],
    metaTitleEn: 'District Collector Visits Sai Yadadri Seva Ashram | Sai Yadadri Seva Ashramam',
    metaDescriptionEn:
      "Read about the District Collector's visit to Sai Yadadri Seva Ashram and the focus on improving facilities and care for elderly residents, as covered by Andhra Prabha.",
  },
];
