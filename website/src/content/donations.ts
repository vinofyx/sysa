/**
 * Build-time snapshot of live CMS data, captured from the production API on
 * 2026-08-11 for the Hostinger static export (STATIC_EXPORT=true).
 * Donation categories and appeals (appeals list is currently empty in production).
 *
 * `xxxTe` fields were `null` in production and have been hand-translated
 * directly here — see the caveat comment in content/site.ts.
 */
import type { DonationCategory, Appeal } from '@/types/public';

export const donationCategories: DonationCategory[] = [
  {
    id: 'bcbd64a1-48db-4891-ac98-d44c8d23c092',
    code: 'ADOPT_A_STUDENT',
    nameEn: 'Adopt a Student',
    nameTe: 'ఒక విద్యార్థిని దత్తత తీసుకోండి',
    descriptionEn:
      'Fully sponsor the annual school or college tuition fees for a verified, brilliant student from an impoverished background—ensuring that financial constraints never halt a child’s higher education.',
    descriptionTe:
      'నిరుపేద నేపథ్యం నుండి వచ్చిన ధృవీకరించబడిన, ప్రతిభావంతుడైన విద్యార్థి వార్షిక పాఠశాల లేదా కళాశాల ట్యూషన్ ఫీజులను పూర్తిగా స్పాన్సర్ చేయండి — ఆర్థిక ఇబ్బందులు ఏ బిడ్డ ఉన్నత విద్యను ఎప్పుడూ ఆపకుండా చూడడం.',
    hasPresetTiers: false,
  },
  {
    id: 'f60ab421-ece1-4de9-a908-9e1871f1868e',
    code: 'ANNAPRASADAM',
    nameEn: 'Annaprasadam',
    nameTe: 'అన్నప్రసాదం',
    descriptionEn:
      'Sponsor meals for residents — Lunch (₹3,000), Full Day (₹5,000), or Life Membership (₹51,000, two occasions/year for life).',
    descriptionTe:
      'నివాసితుల కోసం భోజనాలు స్పాన్సర్ చేయండి — లంచ్ (₹3,000), పూర్తి రోజు (₹5,000), లేదా జీవితకాల సభ్యత్వం (₹51,000, జీవితాంతం సంవత్సరానికి రెండు సందర్భాలు).',
    hasPresetTiers: true,
  },
  {
    id: 'e6621e44-b552-43ee-8a02-7dc98cac4b54',
    code: 'MEMBERSHIP',
    nameEn: 'Become a Registered Member',
    nameTe: 'నమోదిత సభ్యులుగా చేరండి',
    descriptionEn:
      'Join our core network of over 100 changemakers. Monthly Support: contribute ₹3,000/- every month to sustain an inmate’s food and medicine. Quarterly/Annual Support: pool your contributions to fund seasonal medical camps or maintenance. Life Membership: make a legacy contribution of ₹1 Lakh or above to help us expand our infrastructure.',
    descriptionTe:
      '100 మందికి పైగా మార్పు కోసం పనిచేసేవారి మా ప్రధాన నెట్‌వర్క్‌లో చేరండి. నెలవారీ మద్దతు: ఒక నివాసి ఆహారం మరియు మందుల కోసం ప్రతి నెల ₹3,000/- అందించండి. త్రైమాసిక/వార్షిక మద్దతు: కాలానుగుణ వైద్య శిబిరాలు లేదా నిర్వహణ కోసం మీ విరాళాలను సమీకరించండి. జీవితకాల సభ్యత్వం: మా మౌలిక సదుపాయాలను విస్తరించడంలో సహాయపడేందుకు ₹1 లక్ష లేదా అంతకంటే ఎక్కువ శాశ్వత విరాళం అందించండి.',
    hasPresetTiers: true,
  },
  {
    id: '2728e751-9188-43e8-90f3-cc77c37eb3a3',
    code: 'BUILDING_FUND',
    nameEn: 'Building Fund',
    nameTe: 'భవన నిధి',
    descriptionEn:
      'Support the new G+2 building expansion (estimated ₹2.25 Crore, adds capacity for 50 more residents).',
    descriptionTe:
      'కొత్త G+2 భవన విస్తరణకు మద్దతు ఇవ్వండి (అంచనా వ్యయం ₹2.25 కోట్లు, మరో 50 మంది నివాసితులకు స్థలం సమకూరుస్తుంది).',
    hasPresetTiers: false,
  },
  {
    id: '960cfb8e-3272-406e-90e4-cb94d6a3a9a4',
    code: 'EMERGENCY_MEDICAL_FUND',
    nameEn: 'Emergency Medical Corpus',
    nameTe: 'అత్యవసర వైద్య నిధి',
    descriptionEn:
      'Contribute directly to our medical relief fund so we can rapidly deploy financial aid to rural villagers facing critical accidents or health crises—serving as a lifeline during healthcare emergencies for impoverished outsiders.',
    descriptionTe:
      'గ్రామీణ ప్రాంతాల ప్రజలు తీవ్రమైన ప్రమాదాలు లేదా ఆరోగ్య సంక్షోభాలను ఎదుర్కొన్నప్పుడు వేగంగా ఆర్థిక సహాయం అందించగలిగేలా మా వైద్య సహాయ నిధికి నేరుగా విరాళం ఇవ్వండి — నిరుపేద బాధితులకు వైద్య అత్యవసర పరిస్థితుల్లో ఇది జీవనాధారంగా నిలుస్తుంది.',
    hasPresetTiers: false,
  },
  {
    id: '59d7c0e9-e012-42cb-a785-7a5364d3b037',
    code: 'GENERAL_DONATION',
    nameEn: 'General Donation',
    nameTe: 'సాధారణ విరాళం',
    descriptionEn: 'Unrestricted general donation to support the Ashram’s mission.',
    descriptionTe: 'ఆశ్రమం లక్ష్యానికి మద్దతుగా నియంత్రణ లేని సాధారణ విరాళం.',
    hasPresetTiers: false,
  },
  {
    id: '050d330a-c868-4432-9dae-205ae5fa6eb8',
    code: 'GOSHALA',
    nameEn: 'Goshala / Goseva',
    nameTe: 'గోశాల / గోసేవ',
    descriptionEn:
      'Support the Goshala (10 cows, 10 calves, 2 acres of fodder land) — Daily (₹516), Monthly (₹5,116 or ₹11,116).',
    descriptionTe:
      'గోశాలకు మద్దతు ఇవ్వండి (10 ఆవులు, 10 దూడలు, 2 ఎకరాల మేత భూమి) — రోజువారీ (₹516), నెలవారీ (₹5,116 లేదా ₹11,116).',
    hasPresetTiers: true,
  },
  {
    id: 'fda7d0b2-5259-48cd-a291-e2f3196e6cfe',
    code: 'OLD_AGE_HOME',
    nameEn: 'Old Age Home (General)',
    nameTe: 'వృద్ధాశ్రమం (సాధారణం)',
    descriptionEn: 'General support for the Vanaprasthasramam Old Age Home.',
    descriptionTe: 'వానప్రస్థాశ్రమం వృద్ధాశ్రమానికి సాధారణ మద్దతు.',
    hasPresetTiers: false,
  },
  {
    id: '08ae4304-1260-400c-b19d-2c97fbded80d',
    code: 'SPONSOR_A_MEAL',
    nameEn: 'Sponsor a Special Day',
    nameTe: 'ప్రత్యేక దినోత్సవాన్ని స్పాన్సర్ చేయండి',
    descriptionEn:
      'Celebrate your milestones—birthdays, weddings, anniversaries, or the memory of a loved one—by bringing joy to our residents. Sponsor a Meal: fund a single breakfast, lunch, or a full day of nutritious meals for all 40 residents. Anniversary/Memory Puja: request a day of prayers and specialized sweets distributed in honor of your family.',
    descriptionTe:
      'మీ ముఖ్యమైన సందర్భాలను — పుట్టినరోజులు, వివాహాలు, వార్షికోత్సవాలు లేదా ప్రియమైనవారి జ్ఞాపకార్థం — మా నివాసితులకు ఆనందాన్ని పంచడం ద్వారా జరుపుకోండి. భోజనం స్పాన్సర్ చేయండి: 40 మంది నివాసితులందరికీ ఒక అల్పాహారం, భోజనం లేదా పూర్తి రోజు పౌష్టికాహారం కోసం నిధులు సమకూర్చండి. వార్షికోత్సవం/జ్ఞాపక పూజ: మీ కుటుంబ గౌరవార్థం ప్రార్థనలు మరియు ప్రత్యేక ప్రసాదాల పంపిణీ కోసం ఒక రోజును అభ్యర్థించండి.',
    hasPresetTiers: false,
  },
];

export const appeals: Appeal[] = [];
