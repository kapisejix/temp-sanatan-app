// Mock data for Sanatan Saathi mobile app — realistic structure that mirrors backend API.
// Replace with live API calls later (see config/api.js → API_BASE_URL).

export const TODAY_UPAYA = {
  graha: 'Shani',
  graha_hi: 'शनि',
  devta_hi: 'शनि देव',
  mantra: 'ॐ शं शनैश्चराय नमः',
  mantra_en: 'Om Sham Shanaischaraya Namah',
  count: 108,
  day_hi: 'शनिवार',
  color_hi: 'काला/नीला',
  remedy_hi: 'शनिवार को शनि देव को तेल अर्पित करें। काले उड़द और तिल का दान करें।',
  why_hi: 'आपकी कुंडली में शनि अष्टम भाव में स्थित होकर पीड़ित है — यह उपाय शनि की शान्ति के लिए है।',
};

export const CURRENT_DASHA = {
  mahadasha: { planet: 'Saturn', planet_hi: 'शनि', start: '2016-07-12', end: '2035-07-12' },
  antardasha: { planet: 'Venus', planet_hi: 'शुक्र', start: '2023-05-03', end: '2026-07-03' },
  overall_severity_hi: 'मिश्रित काल',
  insights_hi: [
    'मुख्य प्रभाव: शनि (महादशा)',
    'उप-प्रभाव: शुक्र (अंतर्दशा)',
    'शनि बलवान — अनुशासित प्रयासों का अच्छा फल मिल सकता है',
  ],
};

export const TODAY_PANCHANG = {
  date: '28 अप्रैल 2026',
  weekday_hi: 'मंगलवार',
  tithi_hi: 'शुक्ल पक्ष द्वितीया',
  nakshatra_hi: 'भरणी',
  yoga_hi: 'सिद्ध',
  karana_hi: 'बालव',
  rahu_kaal: '15:30 – 17:00',
  sunrise: '05:42',
  sunset: '18:55',
};

export const TRENDING_BHAKTI = [
  { id: 'b1', title_hi: 'हनुमान चालीसा', title_en: 'Hanuman Chalisa', deity: 'Hanuman', duration: '8:42', plays: '12.4K' },
  { id: 'b2', title_hi: 'शिव तांडव स्तोत्र', title_en: 'Shiva Tandava Stotram', deity: 'Shiva', duration: '6:18', plays: '9.1K' },
  { id: 'b3', title_hi: 'गायत्री मंत्र', title_en: 'Gayatri Mantra', deity: 'Surya', duration: '4:30', plays: '15.8K' },
  { id: 'b4', title_hi: 'ॐ जय जगदीश हरे', title_en: 'Om Jai Jagdish Hare', deity: 'Vishnu', duration: '5:55', plays: '7.6K' },
];

export const DEITIES = [
  { id: 'hanuman', name_hi: 'हनुमान', name_en: 'Hanuman', emoji: '🪔', color: '#FED7AA' },
  { id: 'shiva', name_hi: 'शिव', name_en: 'Shiva', emoji: '🔱', color: '#BFDBFE' },
  { id: 'krishna', name_hi: 'कृष्ण', name_en: 'Krishna', emoji: '🦚', color: '#DBEAFE' },
  { id: 'durga', name_hi: 'दुर्गा', name_en: 'Durga', emoji: '🌺', color: '#FECACA' },
  { id: 'ganesha', name_hi: 'गणेश', name_en: 'Ganesha', emoji: '🐘', color: '#FDE68A' },
  { id: 'rama', name_hi: 'राम', name_en: 'Rama', emoji: '🏹', color: '#FCD34D' },
];

export const BHAKTI_TYPES = [
  { id: 'aarti', name_hi: 'आरती', icon: '🪔' },
  { id: 'chalisa', name_hi: 'चालीसा', icon: '📿' },
  { id: 'mantra', name_hi: 'मंत्र', icon: '🕉️' },
  { id: 'stotram', name_hi: 'स्तोत्र', icon: '📜' },
  { id: 'kavach', name_hi: 'कवच', icon: '🛡️' },
  { id: 'sahasranama', name_hi: 'सहस्रनाम', icon: '✨' },
];

export const DAILY_BHAKTI = {
  morning: [
    { id: 'm1', title_hi: 'गायत्री मंत्र', count: 11 },
    { id: 'm2', title_hi: 'सूर्य नमस्कार मंत्र', count: 12 },
    { id: 'm3', title_hi: 'महामृत्युंजय मंत्र', count: 21 },
  ],
  evening: [
    { id: 'e1', title_hi: 'शिव आरती', count: 1 },
    { id: 'e2', title_hi: 'दुर्गा आरती', count: 1 },
    { id: 'e3', title_hi: 'गणेश आरती', count: 1 },
  ],
};

export const KUNDLI_OVERVIEW = {
  user: { name: 'Test User', dob: '1990-08-15', tob: '10:30', place: 'Delhi, India' },
  ascendant_hi: 'तुला',
  graha_scores: [
    { graha: 'Sun', graha_hi: 'सूर्य', score: 25, priority: 'LOW' },
    { graha: 'Moon', graha_hi: 'चन्द्र', score: 35, priority: 'LOW' },
    { graha: 'Mars', graha_hi: 'मंगल', score: 65, priority: 'HIGH' },
    { graha: 'Mercury', graha_hi: 'बुध', score: 30, priority: 'LOW' },
    { graha: 'Jupiter', graha_hi: 'गुरु', score: 28, priority: 'LOW' },
    { graha: 'Venus', graha_hi: 'शुक्र', score: 22, priority: 'LOW' },
    { graha: 'Saturn', graha_hi: 'शनि', score: 55, priority: 'MEDIUM' },
    { graha: 'Rahu', graha_hi: 'राहु', score: 48, priority: 'MEDIUM' },
    { graha: 'Ketu', graha_hi: 'केतु', score: 50, priority: 'MEDIUM' },
  ],
  doshas: [
    { type: 'mangal_dosha', name_hi: 'मंगल दोष', present: true, severity_hi: 'उच्च' },
    { type: 'kaal_sarp_dosha', name_hi: 'काल सर्प दोष', present: false, severity_hi: 'नहीं' },
    { type: 'sade_sati', name_hi: 'साढ़े साती', present: false, severity_hi: 'नहीं' },
  ],
};

export const KUNDLI_ANALYSIS = {
  predictions_hi: [
    'शनि महादशा में अनुशासन और लगन से किया गया कार्य दीर्घकालिक सफलता देगा।',
    'शुक्र अंतर्दशा 2026 तक संबंधों और कलात्मक क्षेत्रों में अनुकूल रहेगी।',
    'मंगल दोष के कारण विवाह और संबंधों में धैर्य आवश्यक — हनुमान चालीसा का नियमित पाठ करें।',
  ],
};

export const QUICK_ACTIONS = [
  { id: 'kundli', label_hi: 'मेरी कुंडली', icon: '🔮', screen: 'Kundli' },
  { id: 'bhakti', label_hi: 'भक्ति', icon: '🪔', screen: 'Bhakti' },
  { id: 'ai', label_hi: 'AI से पूछें', icon: '🤖', screen: 'AIChat' },
  { id: 'panchang', label_hi: 'पंचांग', icon: '📅', screen: 'Panchang' },
];

export const MONTHLY_PANCHANG = [
  { date: '01', tithi_hi: 'पंचमी', special_hi: 'विनायक चतुर्थी' },
  { date: '08', tithi_hi: 'द्वादशी', special_hi: 'मोहिनी एकादशी' },
  { date: '14', tithi_hi: 'पूर्णिमा', special_hi: 'बुद्ध पूर्णिमा' },
  { date: '22', tithi_hi: 'अष्टमी', special_hi: 'कालाष्टमी' },
  { date: '28', tithi_hi: 'द्वितीया', special_hi: 'अमावस्या' },
];

export const FESTIVALS = [
  { date: '14 मई', name_hi: 'बुद्ध पूर्णिमा' },
  { date: '02 जून', name_hi: 'गंगा दशहरा' },
  { date: '19 जुलाई', name_hi: 'देवशयनी एकादशी' },
  { date: '15 अगस्त', name_hi: 'रक्षा बंधन' },
  { date: '05 सितंबर', name_hi: 'जन्माष्टमी' },
];

export const MUHURATS = [
  { date: '03 मई', type_hi: 'विवाह', time: '08:30 – 10:45' },
  { date: '10 मई', type_hi: 'गृह प्रवेश', time: '06:15 – 08:00' },
  { date: '17 मई', type_hi: 'मुंडन', time: '09:20 – 11:00' },
  { date: '24 मई', type_hi: 'व्यापार आरंभ', time: '07:45 – 09:30' },
];

export const SAMPLE_AUDIO_URI = 'https://www.soundjay.com/buttons/sounds/beep-07a.mp3';
// In production, replace with /api/tts/synthesize results or actual audio URLs.
