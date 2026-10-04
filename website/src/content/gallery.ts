/**
 * Build-time snapshot of live CMS data, captured from the production API on
 * 2026-08-11 for the Hostinger static export (STATIC_EXPORT=true).
 * Gallery albums and items.
 *
 * `xxxTe` fields were `null` in production and have been hand-translated
 * directly here — see the caveat comment in content/site.ts. `category` has
 * no Telugu counterpart in the type (single free-text field), so it's left
 * as-is.
 *
 * The second album ("Community Programs & Recognition") is hand-added, not
 * part of the original CMS snapshot — real event photos supplied directly
 * (Quadrant IT Services' skill-development sponsorship, the physiotherapy
 * centre inauguration, committee/school-outreach events, and press
 * clippings). Re-running the extraction script will not remove it (it only
 * overwrites the first album, "Ashram Life," which mirrors live CMS data),
 * but entering these in the live CMS is still the durable long-term home.
 */
import type { GalleryAlbum } from '@/types/public';

export const galleryAlbums: GalleryAlbum[] = [
  {
    id: 'dfe15736-9b08-4b05-adc1-f36859922367',
    nameEn: 'Ashram Life',
    nameTe: 'ఆశ్రమ జీవితం',
    category: 'General',
    displayOrder: 1,
    items: [
      {
        id: 'd485ad86-a564-435c-ac6c-f4e0fcdfb4bd',
        mediaType: 'image',
        mediaUrl: '/images/real/ashram-building.jpg',
        altTextEn: 'The Ashram building',
        altTextTe: 'ఆశ్రమ భవనం',
        displayOrder: 1,
      },
      {
        id: '5c69a79b-c629-41d5-98f7-25189e4dc198',
        mediaType: 'image',
        mediaUrl: '/images/real/founders.jpg',
        altTextEn: 'Founders of Vanaprasthasramam',
        altTextTe: 'వానప్రస్థాశ్రమం స్థాపకులు',
        displayOrder: 2,
      },
      {
        id: '41d823c9-d800-4778-92a1-b921a77821c3',
        mediaType: 'image',
        mediaUrl: '/images/real/groundbreaking-ceremony.jpg',
        altTextEn: 'Foundation-laying ceremony for the new building',
        altTextTe: 'కొత్త భవనానికి పునాది వేసే కార్యక్రమం',
        displayOrder: 3,
      },
      {
        id: '4d3d2770-317f-4e23-8648-9c605832c211',
        mediaType: 'image',
        mediaUrl: '/images/real/annaprasadam-hall.jpg',
        altTextEn: 'Annaprasadam dining hall',
        altTextTe: 'అన్నప్రసాదం భోజనశాల',
        displayOrder: 4,
      },
      {
        id: '2de705fe-a6f1-4a2a-bba0-a10c8d84ec56',
        mediaType: 'image',
        mediaUrl: '/images/real/goshala-cows.jpg',
        altTextEn: 'Cows at the Goshala',
        altTextTe: 'గోశాలలో ఆవులు',
        displayOrder: 5,
      },
      {
        id: '6a1dd15f-7c15-4748-9830-093750f8e52b',
        mediaType: 'image',
        mediaUrl: '/images/real/goshala-goseva.jpg',
        altTextEn: 'Devotees performing Goseva',
        altTextTe: 'గోసేవ చేస్తున్న భక్తులు',
        displayOrder: 6,
      },
      {
        id: 'b4c0b12f-ae29-4b8e-9e2d-0d638a0c05ec',
        mediaType: 'image',
        mediaUrl: '/images/real/residents-activities.jpg',
        altTextEn: 'Residents playing carrom in the evening',
        altTextTe: 'సాయంత్రం క్యారమ్ ఆడుతున్న నివాసితులు',
        displayOrder: 7,
      },
      {
        id: '73bc0efa-b425-4a30-87c0-f6d33103611c',
        mediaType: 'image',
        mediaUrl: '/images/real/fitness-room.jpg',
        altTextEn: 'Physical fitness activities at the wellness centre',
        altTextTe: 'వెల్‌నెస్ కేంద్రంలో ఫిజికల్ ఫిట్‌నెస్ కార్యక్రమాలు',
        displayOrder: 8,
      },
      {
        id: 'cd4b95fb-34a3-446f-ae9f-d424311829aa',
        mediaType: 'image',
        mediaUrl: '/images/real/education-outreach.jpg',
        altTextEn: 'Education outreach with local students',
        altTextTe: 'స్థానిక విద్యార్థులతో విద్యా కార్యక్రమం',
        displayOrder: 9,
      },
      {
        id: '390eeab0-10fe-455c-bc8e-8e407906eafd',
        mediaType: 'image',
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
        mediaType: 'image',
        mediaUrl: '/images/real/quadrant-sponsorship-briefing.jpg',
        altTextEn: 'Quadrant IT Services team briefing at the skill development centre launch',
        altTextTe:
          'నైపుణ్యాభివృద్ధి కేంద్రం ప్రారంభోత్సవంలో క్వాడ్రంట్ ఐటీ సర్వీసెస్ బృందం సమావేశం',
        displayOrder: 1,
      },
      {
        id: '54995487-7988-4621-8fd3-acbb23bf5cce',
        mediaType: 'image',
        mediaUrl: '/images/real/quadrant-sponsorship-office-1.jpg',
        altTextEn: 'Quadrant IT Services office during the sponsorship event',
        altTextTe: 'స్పాన్సర్‌షిప్ కార్యక్రమంలో క్వాడ్రంట్ ఐటీ సర్వీసెస్ కార్యాలయం',
        displayOrder: 2,
      },
      {
        id: 'f9cf6c1f-83ba-4315-a572-4577821bc909',
        mediaType: 'image',
        mediaUrl: '/images/real/quadrant-sponsorship-office-2.jpg',
        altTextEn: 'Quadrant IT Services office during the sponsorship event',
        altTextTe: 'స్పాన్సర్‌షిప్ కార్యక్రమంలో క్వాడ్రంట్ ఐటీ సర్వీసెస్ కార్యాలయం',
        displayOrder: 3,
      },
      {
        id: '27bd6c80-f41d-41b5-b4d3-86d714b66771',
        mediaType: 'image',
        mediaUrl: '/images/real/quadrant-sponsorship-office-3.jpg',
        altTextEn: 'Attendees applauding at the Quadrant IT Services sponsorship event',
        altTextTe:
          'క్వాడ్రంట్ ఐటీ సర్వీసెస్ స్పాన్సర్‌షిప్ కార్యక్రమంలో హాజరైనవారు కరతాళధ్వనులు చేస్తున్న దృశ్యం',
        displayOrder: 4,
      },
      {
        id: '4c8760f7-0b4a-464d-8e07-a1d4444dd67a',
        mediaType: 'image',
        mediaUrl: '/images/real/physiotherapy-centre-inauguration.jpg',
        altTextEn: 'Physiotherapy centre inauguration at the Ashram, with the District Collector',
        altTextTe: 'జిల్లా కలెక్టర్ సమక్షంలో ఆశ్రమంలో ఫిజియోథెరపీ కేంద్రం ప్రారంభోత్సవం',
        displayOrder: 5,
      },
      {
        id: '4d16cc79-4c2d-48ac-a2ca-3a5710492aab',
        mediaType: 'image',
        mediaUrl: '/images/real/sai-swasthya-wellness-centre-signage.jpg',
        altTextEn: 'Sai Swasthya Wellness Centre signage at the Ashram',
        altTextTe: 'ఆశ్రమంలో సాయి స్వాస్థ్య వెల్‌నెస్ సెంటర్ బోర్డు',
        displayOrder: 6,
      },
      {
        id: '0464aa3e-092d-420e-a643-2691d9b2cf92',
        mediaType: 'image',
        mediaUrl: '/images/real/committee-new-body-2026.jpg',
        altTextEn: 'The newly elected managing committee',
        altTextTe: 'కొత్తగా ఎన్నికైన నిర్వహణ కమిటీ',
        displayOrder: 8,
      },
      {
        id: '78df350e-b97c-4806-a079-8a108762bba8',
        mediaType: 'image',
        mediaUrl: '/images/real/committee-event-2026-07-27-1.jpg',
        altTextEn: 'Committee members honouring residents at an Ashram event',
        altTextTe: 'ఆశ్రమ కార్యక్రమంలో నివాసితులను సత్కరిస్తున్న కమిటీ సభ్యులు',
        displayOrder: 9,
      },
      {
        id: '805145ac-d49d-4768-9058-b7ec2d32136b',
        mediaType: 'image',
        mediaUrl: '/images/real/committee-event-2026-07-27-2.jpg',
        altTextEn: 'Committee members honouring residents at an Ashram event',
        altTextTe: 'ఆశ్రమ కార్యక్రమంలో నివాసితులను సత్కరిస్తున్న కమిటీ సభ్యులు',
        displayOrder: 10,
      },
      {
        id: '2fc589bf-c610-4a33-ae29-40104c87a957',
        mediaType: 'image',
        mediaUrl: '/images/real/school-outreach-students-outdoor.jpg',
        altTextEn: 'Students at a school outreach programme',
        altTextTe: 'పాఠశాల విద్యా కార్యక్రమంలో విద్యార్థులు',
        displayOrder: 11,
      },
      {
        id: '159c72de-8816-47ef-b732-58ff03726f9c',
        mediaType: 'image',
        mediaUrl: '/images/real/school-outreach-auditorium.jpg',
        altTextEn: 'Students representing the Ashram at a community event',
        altTextTe: 'సామాజిక కార్యక్రమంలో ఆశ్రమానికి ప్రాతినిధ్యం వహిస్తున్న విద్యార్థులు',
        displayOrder: 12,
      },
      {
        id: '16d05b2e-9a92-4d8d-95ee-3ee8756a4dbb',
        mediaType: 'image',
        mediaUrl: '/images/real/school-computer-lab.jpg',
        altTextEn: "Students in a computer lab supported by the Ashram's education programme",
        altTextTe: 'ఆశ్రమం విద్యా కార్యక్రమం మద్దతుతో కంప్యూటర్ ల్యాబ్‌లో విద్యార్థులు',
        displayOrder: 13,
      },
      {
        id: '85f20c2f-ee4c-4eb4-b399-77cc8ba9ce6f',
        mediaType: 'image',
        mediaUrl: '/images/real/skill-development-classroom.jpg',
        altTextEn: 'A skill development training session',
        altTextTe: 'నైపుణ్యాభివృద్ధి శిక్షణ తరగతి',
        displayOrder: 14,
      },
      {
        id: '48d42053-9a07-4832-8fc5-78a6bbf1eb72',
        mediaType: 'image',
        mediaUrl: '/images/real/goshala-cows-2.jpg',
        altTextEn: 'Cows and calves at the Goshala',
        altTextTe: 'గోశాలలో ఆవులు మరియు దూడలు',
        displayOrder: 15,
      },
    ],
  },
];
