/**
 * ResQAI Centralized Languages Configuration (Frontend)
 * Covers all 22 languages in the Eighth Schedule of the Indian Constitution, plus English and Auto-Detect.
 */

export interface LanguageItem {
  code: string;
  name: string;
  nativeName: string;
  direction: 'ltr' | 'rtl';
  script: string;
  bcp47: string;
  speechRecognitionSupported: boolean;
  speechSynthesisSupported: boolean;
  scheduledLanguage: boolean;
}

export const SUPPORTED_LANGUAGES: LanguageItem[] = [
  {
    code: 'auto',
    name: 'Auto-detect my language',
    nativeName: 'स्वचालित पहचान / Auto Detect',
    direction: 'ltr',
    script: 'Various',
    bcp47: 'en-IN',
    speechRecognitionSupported: true,
    speechSynthesisSupported: true,
    scheduledLanguage: false
  },
  {
    code: 'en',
    name: 'English',
    nativeName: 'English',
    direction: 'ltr',
    script: 'Latin',
    bcp47: 'en-IN',
    speechRecognitionSupported: true,
    speechSynthesisSupported: true,
    scheduledLanguage: false
  },
  {
    code: 'hi',
    name: 'Hindi',
    nativeName: 'हिन्दी',
    direction: 'ltr',
    script: 'Devanagari',
    bcp47: 'hi-IN',
    speechRecognitionSupported: true,
    speechSynthesisSupported: true,
    scheduledLanguage: true
  },
  {
    code: 'bn',
    name: 'Bengali',
    nativeName: 'বাংলা',
    direction: 'ltr',
    script: 'Bengali',
    bcp47: 'bn-IN',
    speechRecognitionSupported: true,
    speechSynthesisSupported: true,
    scheduledLanguage: true
  },
  {
    code: 'mr',
    name: 'Marathi',
    nativeName: 'मराठी',
    direction: 'ltr',
    script: 'Devanagari',
    bcp47: 'mr-IN',
    speechRecognitionSupported: true,
    speechSynthesisSupported: true,
    scheduledLanguage: true
  },
  {
    code: 'te',
    name: 'Telugu',
    nativeName: 'తెలుగు',
    direction: 'ltr',
    script: 'Telugu',
    bcp47: 'te-IN',
    speechRecognitionSupported: true,
    speechSynthesisSupported: true,
    scheduledLanguage: true
  },
  {
    code: 'ta',
    name: 'Tamil',
    nativeName: 'தமிழ்',
    direction: 'ltr',
    script: 'Tamil',
    bcp47: 'ta-IN',
    speechRecognitionSupported: true,
    speechSynthesisSupported: true,
    scheduledLanguage: true
  },
  {
    code: 'gu',
    name: 'Gujarati',
    nativeName: 'ગુજરાતી',
    direction: 'ltr',
    script: 'Gujarati',
    bcp47: 'gu-IN',
    speechRecognitionSupported: true,
    speechSynthesisSupported: true,
    scheduledLanguage: true
  },
  {
    code: 'ur',
    name: 'Urdu',
    nativeName: 'اردو',
    direction: 'rtl',
    script: 'Perso-Arabic',
    bcp47: 'ur-IN',
    speechRecognitionSupported: true,
    speechSynthesisSupported: true,
    scheduledLanguage: true
  },
  {
    code: 'kn',
    name: 'Kannada',
    nativeName: 'ಕನ್ನಡ',
    direction: 'ltr',
    script: 'Kannada',
    bcp47: 'kn-IN',
    speechRecognitionSupported: true,
    speechSynthesisSupported: true,
    scheduledLanguage: true
  },
  {
    code: 'or',
    name: 'Odia',
    nativeName: 'ଓଡ଼ିଆ',
    direction: 'ltr',
    script: 'Odia',
    bcp47: 'or-IN',
    speechRecognitionSupported: false,
    speechSynthesisSupported: false,
    scheduledLanguage: true
  },
  {
    code: 'ml',
    name: 'Malayalam',
    nativeName: 'മലയാളം',
    direction: 'ltr',
    script: 'Malayalam',
    bcp47: 'ml-IN',
    speechRecognitionSupported: true,
    speechSynthesisSupported: true,
    scheduledLanguage: true
  },
  {
    code: 'pa',
    name: 'Punjabi',
    nativeName: 'ਪੰਜਾਬੀ',
    direction: 'ltr',
    script: 'Gurmukhi',
    bcp47: 'pa-IN',
    speechRecognitionSupported: true,
    speechSynthesisSupported: true,
    scheduledLanguage: true
  },
  {
    code: 'as',
    name: 'Assamese',
    nativeName: 'অসমীয়া',
    direction: 'ltr',
    script: 'Bengali-Assamese',
    bcp47: 'as-IN',
    speechRecognitionSupported: false,
    speechSynthesisSupported: false,
    scheduledLanguage: true
  },
  {
    code: 'mai',
    name: 'Maithili',
    nativeName: 'मैथिली',
    direction: 'ltr',
    script: 'Devanagari',
    bcp47: 'mai-IN',
    speechRecognitionSupported: false,
    speechSynthesisSupported: false,
    scheduledLanguage: true
  },
  {
    code: 'sa',
    name: 'Sanskrit',
    nativeName: 'संस्कृतम्',
    direction: 'ltr',
    script: 'Devanagari',
    bcp47: 'sa-IN',
    speechRecognitionSupported: false,
    speechSynthesisSupported: false,
    scheduledLanguage: true
  },
  {
    code: 'ne',
    name: 'Nepali',
    nativeName: 'नेपाली',
    direction: 'ltr',
    script: 'Devanagari',
    bcp47: 'ne-NP',
    speechRecognitionSupported: true,
    speechSynthesisSupported: true,
    scheduledLanguage: true
  },
  {
    code: 'gom',
    name: 'Konkani',
    nativeName: 'कोंकणी',
    direction: 'ltr',
    script: 'Devanagari',
    bcp47: 'kok-IN',
    speechRecognitionSupported: false,
    speechSynthesisSupported: false,
    scheduledLanguage: true
  },
  {
    code: 'sd',
    name: 'Sindhi',
    nativeName: 'سنڌي / सिन्धी',
    direction: 'rtl',
    script: 'Perso-Arabic / Devanagari',
    bcp47: 'sd-IN',
    speechRecognitionSupported: false,
    speechSynthesisSupported: false,
    scheduledLanguage: true
  },
  {
    code: 'doi',
    name: 'Dogri',
    nativeName: 'डोगरी',
    direction: 'ltr',
    script: 'Devanagari',
    bcp47: 'doi-IN',
    speechRecognitionSupported: false,
    speechSynthesisSupported: false,
    scheduledLanguage: true
  },
  {
    code: 'ks',
    name: 'Kashmiri',
    nativeName: 'كٲشُر / कॉशुर',
    direction: 'rtl',
    script: 'Perso-Arabic / Devanagari',
    bcp47: 'ks-IN',
    speechRecognitionSupported: false,
    speechSynthesisSupported: false,
    scheduledLanguage: true
  },
  {
    code: 'brx',
    name: 'Bodo',
    nativeName: 'बर\'',
    direction: 'ltr',
    script: 'Devanagari',
    bcp47: 'brx-IN',
    speechRecognitionSupported: false,
    speechSynthesisSupported: false,
    scheduledLanguage: true
  },
  {
    code: 'sat',
    name: 'Santali',
    nativeName: 'ᱥᱟᱱᱛᱟᱲᱤ / संताली',
    direction: 'ltr',
    script: 'Ol Chiki / Devanagari',
    bcp47: 'sat-IN',
    speechRecognitionSupported: false,
    speechSynthesisSupported: false,
    scheduledLanguage: true
  },
  {
    code: 'mni',
    name: 'Manipuri (Meitei)',
    nativeName: 'মৈতৈলোন্ / ꯃꯩꯇꯩꯂꯣꯟ',
    direction: 'ltr',
    script: 'Bengali / Meetei Mayek',
    bcp47: 'mni-IN',
    speechRecognitionSupported: false,
    speechSynthesisSupported: false,
    scheduledLanguage: true
  }
];

export const LANGUAGE_MAP = new Map<string, LanguageItem>(
  SUPPORTED_LANGUAGES.map(l => [l.code, l])
);

export function getLanguageConfig(code: string = 'en'): LanguageItem {
  return LANGUAGE_MAP.get(code) || LANGUAGE_MAP.get('en')!;
}
