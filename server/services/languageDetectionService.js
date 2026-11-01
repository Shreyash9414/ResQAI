/**
 * ResQAI Centralized Language Detection Service
 * Real-time automatic language identification supporting all 22 Eighth Schedule Indian Languages,
 * English, Hinglish, and Romanized Indian dialects.
 * Fast, deterministic Unicode script + lexical analysis with contextual multi-turn smoothing.
 */

const { getLanguageConfig, isValidLanguageCode, SUPPORTED_LANGUAGES } = require('../config/languages');

class LanguageDetectionService {
  constructor() {
    // Ambiguous single-token words that could appear in any conversation
    this.ambiguousTokens = new Set([
      'hi', 'hello', 'hey', 'ok', 'okay', 'yes', 'no', 'ha', 'haa', 'haan', 'nahi',
      'help', 'sos', '112', '108', '101', '1078', 'emergency', 'thanks', 'thank you',
      'plz', 'please', 'test', 'done', 'location', 'map', 'status', 'info', 'namaste'
    ]);
  }

  /**
   * Main detection entry point with optional recent conversation language context.
   *
   * @param {string} text - User message text
   * @param {string|null} previousLanguage - Language code of previous turn in session (if any)
   * @returns {Object} Detection result
   */
  detectLanguageWithContext(text, previousLanguage = null) {
    if (!text || typeof text !== 'string') {
      const fallback = (previousLanguage && isValidLanguageCode(previousLanguage) && previousLanguage !== 'auto')
        ? previousLanguage
        : 'en';
      const config = getLanguageConfig(fallback);
      return {
        language: fallback,
        confidence: 'low',
        isAmbiguous: true,
        script: config.script,
        direction: config.direction,
        name: config.name,
        nativeName: config.nativeName,
        rule: 'empty_input_fallback'
      };
    }

    const trimmed = text.trim();
    const cleanTokens = trimmed.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(Boolean);

    // 1. Check for very short / ambiguous messages
    const isSingleAmbiguousToken = cleanTokens.length === 1 && this.ambiguousTokens.has(cleanTokens[0]);
    const isOnlyPunctuationOrDigits = /^[\d\s.,!?@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]*$/.test(trimmed);

    if ((isSingleAmbiguousToken || isOnlyPunctuationOrDigits || trimmed.length < 2) && previousLanguage && isValidLanguageCode(previousLanguage) && previousLanguage !== 'auto') {
      const config = getLanguageConfig(previousLanguage);
      return {
        language: previousLanguage,
        confidence: 'medium',
        isAmbiguous: true,
        script: config.script,
        direction: config.direction,
        name: config.name,
        nativeName: config.nativeName,
        rule: 'previous_conversation_context_smoothing'
      };
    }

    // 2. Perform direct detection on the current text
    const detection = this.detect(trimmed);

    // 3. If detection confidence is low or ambiguous and we have a previous language, smooth contextually
    if (detection.confidence === 'low' && previousLanguage && isValidLanguageCode(previousLanguage) && previousLanguage !== 'auto') {
      const config = getLanguageConfig(previousLanguage);
      return {
        language: previousLanguage,
        confidence: 'medium',
        isAmbiguous: true,
        script: config.script,
        direction: config.direction,
        name: config.name,
        nativeName: config.nativeName,
        rule: 'contextual_fallback_smoothing',
        secondaryCandidate: detection.language
      };
    }

    return detection;
  }

  /**
   * Core detection algorithm analyzing Unicode blocks and lexical patterns.
   */
  detect(trimmed) {
    // ----------------------------------------------------
    // UNICODE SCRIPT-LEVEL DETECTION
    // ----------------------------------------------------

    // 1. Gurmukhi Script (Punjabi): \u0A00-\u0A7F
    if (/[\u0A00-\u0A7F]/.test(trimmed)) {
      const config = getLanguageConfig('pa');
      return {
        language: 'pa',
        confidence: 'high',
        isAmbiguous: false,
        script: 'Gurmukhi',
        direction: config.direction,
        name: config.name,
        nativeName: config.nativeName,
        rule: 'unicode_script_gurmukhi'
      };
    }

    // 2. Gujarati Script: \u0A80-\u0AFF
    if (/[\u0A80-\u0AFF]/.test(trimmed)) {
      const config = getLanguageConfig('gu');
      return {
        language: 'gu',
        confidence: 'high',
        isAmbiguous: false,
        script: 'Gujarati',
        direction: config.direction,
        name: config.name,
        nativeName: config.nativeName,
        rule: 'unicode_script_gujarati'
      };
    }

    // 3. Odia Script: \u0B00-\u0B7F
    if (/[\u0B00-\u0B7F]/.test(trimmed)) {
      const config = getLanguageConfig('or');
      return {
        language: 'or',
        confidence: 'high',
        isAmbiguous: false,
        script: 'Odia',
        direction: config.direction,
        name: config.name,
        nativeName: config.nativeName,
        rule: 'unicode_script_odia'
      };
    }

    // 4. Tamil Script: \u0B80-\u0BFF
    if (/[\u0B80-\u0BFF]/.test(trimmed)) {
      const config = getLanguageConfig('ta');
      return {
        language: 'ta',
        confidence: 'high',
        isAmbiguous: false,
        script: 'Tamil',
        direction: config.direction,
        name: config.name,
        nativeName: config.nativeName,
        rule: 'unicode_script_tamil'
      };
    }

    // 5. Telugu Script: \u0C00-\u0C7F
    if (/[\u0C00-\u0C7F]/.test(trimmed)) {
      const config = getLanguageConfig('te');
      return {
        language: 'te',
        confidence: 'high',
        isAmbiguous: false,
        script: 'Telugu',
        direction: config.direction,
        name: config.name,
        nativeName: config.nativeName,
        rule: 'unicode_script_telugu'
      };
    }

    // 6. Kannada Script: \u0C80-\u0CFF
    if (/[\u0C80-\u0CFF]/.test(trimmed)) {
      const config = getLanguageConfig('kn');
      return {
        language: 'kn',
        confidence: 'high',
        isAmbiguous: false,
        script: 'Kannada',
        direction: config.direction,
        name: config.name,
        nativeName: config.nativeName,
        rule: 'unicode_script_kannada'
      };
    }

    // 7. Malayalam Script: \u0D00-\u0D7F
    if (/[\u0D00-\u0D7F]/.test(trimmed)) {
      const config = getLanguageConfig('ml');
      return {
        language: 'ml',
        confidence: 'high',
        isAmbiguous: false,
        script: 'Malayalam',
        direction: config.direction,
        name: config.name,
        nativeName: config.nativeName,
        rule: 'unicode_script_malayalam'
      };
    }

    // 8. Ol Chiki Script (Santali): \u1C50-\u1C7F
    if (/[\u1C50-\u1C7F]/.test(trimmed)) {
      const config = getLanguageConfig('sat');
      return {
        language: 'sat',
        confidence: 'high',
        isAmbiguous: false,
        script: 'Ol Chiki',
        direction: config.direction,
        name: config.name,
        nativeName: config.nativeName,
        rule: 'unicode_script_ol_chiki'
      };
    }

    // 9. Meetei Mayek Script (Manipuri): \uABC0-\uABFF
    if (/[\uABC0-\uABFF]/.test(trimmed)) {
      const config = getLanguageConfig('mni');
      return {
        language: 'mni',
        confidence: 'high',
        isAmbiguous: false,
        script: 'Meetei Mayek',
        direction: config.direction,
        name: config.name,
        nativeName: config.nativeName,
        rule: 'unicode_script_meetei_mayek'
      };
    }

    // 10. Perso-Arabic Script (Urdu, Sindhi, Kashmiri): \u0600-\u06FF, \u0750-\u077F, \uFB50-\uFDFF, \uFE70-\uFEFF
    if (/[\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFF]/.test(trimmed)) {
      // Sindhi specific characters (ڄ, ڃ, ڇ, ڌ, ڏ, ڍ, ڙ, ڦ, ٻ, ٽ, ٺ, ڀ, ڻ, ڪ) or vocabulary
      if (/[ڄڃڇڌڏڍڙڦٻٽٺڀڻڪ]/.test(trimmed) || /(?:^|\s|[.,?!])(ٻوڏ|سنڌي|اسپتال|مدد|ڪريو|ڪٿي|ڇا|ڪجي|ڪئمپ)(?:$|\s|[.,?!])/.test(trimmed)) {
        const config = getLanguageConfig('sd');
        return {
          language: 'sd',
          confidence: 'high',
          isAmbiguous: false,
          script: 'Perso-Arabic',
          direction: 'rtl',
          name: config.name,
          nativeName: config.nativeName,
          rule: 'perso_arabic_sindhi_chars'
        };
      }
      // Kashmiri specific characters (ؠ, ٲ, ۄ, ێ) or vocabulary
      if (/[ؠٲۄێ]/.test(trimmed) || /(?:^|\s|[.,?!])(کٲشُر|مدتھ|کِتھ|پَزِ|بیڑ|سیلاب)(?:$|\s|[.,?!])/.test(trimmed)) {
        const config = getLanguageConfig('ks');
        return {
          language: 'ks',
          confidence: 'high',
          isAmbiguous: false,
          script: 'Perso-Arabic',
          direction: 'rtl',
          name: config.name,
          nativeName: config.nativeName,
          rule: 'perso_arabic_kashmiri_chars'
        };
      }
      // Default Perso-Arabic to Urdu
      const config = getLanguageConfig('ur');
      return {
        language: 'ur',
        confidence: 'high',
        isAmbiguous: false,
        script: 'Perso-Arabic',
        direction: 'rtl',
        name: config.name,
        nativeName: config.nativeName,
        rule: 'perso_arabic_urdu_default'
      };
    }

    // 11. Bengali / Assamese Script: \u0980-\u09FF
    if (/[\u0980-\u09FF]/.test(trimmed)) {
      // Assamese unique characters: ৰ (U+09F0), ৱ (U+09F1) or distinctive Assamese vocabulary
      if (/[\u09F0\u09F1]/.test(trimmed) || /(?:^|\s|[.,?!])(বানপানী|চিকিৎসালয়|সহায়|সহায়|কি কৰিম|ক'ত|ক’ত|কলৈ|হৈছে|ওচৰৰ|ধুমুহা|আশ্ৰয়|বিচাৰক|কেনে)(?:$|\s|[.,?!])/.test(trimmed)) {
        const config = getLanguageConfig('as');
        return {
          language: 'as',
          confidence: 'high',
          isAmbiguous: false,
          script: 'Bengali/Assamese',
          direction: config.direction,
          name: config.name,
          nativeName: config.nativeName,
          rule: 'assamese_unique_chars_or_words'
        };
      }
      // Manipuri written in Bengali script
      if (/(?:^|\s|[.,?!])(মৈতৈলোন্|মাতম|ইশিং|মতেং|হোস্পিতাল|ঈশিং ইচাও|থাগদগে|থিরু|করম্না|করম)(?:$|\s|[.,?!])/.test(trimmed)) {
        const config = getLanguageConfig('mni');
        return {
          language: 'mni',
          confidence: 'high',
          isAmbiguous: false,
          script: 'Bengali Script',
          direction: config.direction,
          name: config.name,
          nativeName: config.nativeName,
          rule: 'manipuri_bengali_words'
        };
      }
      // Default to Bengali
      const config = getLanguageConfig('bn');
      return {
        language: 'bn',
        confidence: 'high',
        isAmbiguous: false,
        script: 'Bengali',
        direction: config.direction,
        name: config.name,
        nativeName: config.nativeName,
        rule: 'bengali_default'
      };
    }

    // 12. Devanagari Script: \u0900-\u097F
    if (/[\u0900-\u097F]/.test(trimmed)) {
      // Marathi: unique character ळ (U+0933) or distinctive Marathi grammatical verbs & vocabulary
      if (/[\u0933]/.test(trimmed) || /(?:^|\s|[.,?!])(आहे|आहेत|करावे|काय|कुठे|मदत|पूर|रुग्णालय|वाचवा|छावणी|इशारा|झाला|झाली|झाले|कसे|कशी|काही|सांगा|नाही|आम्ही|पाहिजे|अडकलो|व्हायला|पडला)(?:$|\s|[.,?!])/.test(trimmed)) {
        const config = getLanguageConfig('mr');
        return {
          language: 'mr',
          confidence: 'high',
          isAmbiguous: false,
          script: 'Devanagari',
          direction: config.direction,
          name: config.name,
          nativeName: config.nativeName,
          rule: 'devanagari_marathi_lexical'
        };
      }

      // Nepali: distinctive verbs & vocabulary (छ, छन्, गर्नु, बाढी, कहाँ, भयो)
      if (/(?:^|\s|[.,?!])(छ|छन्|गर्नुपर्छ|गर्नु|कहाँ|सहयोग|बाढी|अस्पताल|बचाउनुहोस्|के गर्ने|आँधी|भयो|हुने|हाम्रो|गर्ने)(?:$|\s|[.,?!])/.test(trimmed)) {
        const config = getLanguageConfig('ne');
        return {
          language: 'ne',
          confidence: 'high',
          isAmbiguous: false,
          script: 'Devanagari',
          direction: config.direction,
          name: config.name,
          nativeName: config.nativeName,
          rule: 'devanagari_nepali_lexical'
        };
      }

      // Sanskrit: distinctive inflection & vocabulary (अस्ति, सन्ति, कुत्र, करोतु, सहायता)
      if (/(?:^|\s|[.,?!])(अस्ति|सन्ति|कुत्र|सहायता|करोतु|करणीयम्|आपत्कालीन|भवतः|नमः|चिकित्सालय|जलप्लव|रक्षतु|प्रार्थये)(?:$|\s|[.,?!])/.test(trimmed)) {
        const config = getLanguageConfig('sa');
        return {
          language: 'sa',
          confidence: 'high',
          isAmbiguous: false,
          script: 'Devanagari',
          direction: config.direction,
          name: config.name,
          nativeName: config.nativeName,
          rule: 'devanagari_sanskrit_lexical'
        };
      }

      // Maithili: distinctive vocabulary (अछि, कतय, मदति, बाढ़ि, कोना, भेल, कएल, अहाँ)
      if (/(?:^|\s|[.,?!])(अछि|कतय|मदति|बाढ़ि|कोना|भेल|कएल|अहाँ|हमर|चाही|पठाउ)(?:$|\s|[.,?!])/.test(trimmed)) {
        const config = getLanguageConfig('mai');
        return {
          language: 'mai',
          confidence: 'high',
          isAmbiguous: false,
          script: 'Devanagari',
          direction: config.direction,
          name: config.name,
          nativeName: config.nativeName,
          rule: 'devanagari_maithili_lexical'
        };
      }

      // Konkani in Devanagari: (आसा, किदें, खंय, मजत, निवारो, व्हांवटो, उजो)
      if (/(?:^|\s|[.,?!])(आसा|किदें|खंय|मजत|निवारो|व्हांवटो|उजो|धाडचो|सोदात)(?:$|\s|[.,?!])/.test(trimmed)) {
        const config = getLanguageConfig('gom');
        return {
          language: 'gom',
          confidence: 'high',
          isAmbiguous: false,
          script: 'Devanagari',
          direction: config.direction,
          name: config.name,
          nativeName: config.nativeName,
          rule: 'devanagari_konkani_lexical'
        };
      }

      // Dogri: (कुत्थे, ह्वा, बाह्ड़, भुआल, अग्ग, तुस, किश)
      if (/(?:^|\s|[.,?!])(कुत्थे|ह्वा|बाह्ड़|भुआल|अग्ग|तुस|चाल्ली|तुप्पो)(?:$|\s|[.,?!])/.test(trimmed)) {
        const config = getLanguageConfig('doi');
        return {
          language: 'doi',
          confidence: 'high',
          isAmbiguous: false,
          script: 'Devanagari',
          direction: config.direction,
          name: config.name,
          nativeName: config.nativeName,
          rule: 'devanagari_dogri_lexical'
        };
      }

      // Bodo in Devanagari: (दं, मा, बबेयाव, हेफाजाब, दैबाना, बांमौलुं)
      if (/(?:^|\s|[.,?!])(दं|मा|बबेयाव|हेफाजाब|दैबाना|बांमौलुं|नांगौ|दैथायहरनो)(?:$|\s|[.,?!])/.test(trimmed)) {
        const config = getLanguageConfig('brx');
        return {
          language: 'brx',
          confidence: 'high',
          isAmbiguous: false,
          script: 'Devanagari',
          direction: config.direction,
          name: config.name,
          nativeName: config.nativeName,
          rule: 'devanagari_bodo_lexical'
        };
      }

      // Default Devanagari to Hindi
      const config = getLanguageConfig('hi');
      return {
        language: 'hi',
        confidence: 'high',
        isAmbiguous: false,
        script: 'Devanagari',
        direction: config.direction,
        name: config.name,
        nativeName: config.nativeName,
        rule: 'devanagari_hindi_default'
      };
    }

    // ----------------------------------------------------
    // LATIN SCRIPT & CODE-SWITCHING (HINGLISH / REGIONAL ROMANIZED)
    // ----------------------------------------------------

    // 13. Romanized Marathi / Marathi in Latin script
    if (/\b(kay karayche|madat kara|kuthe ahe|kute ahe|vachva|panyat|aag lagli|kay karu|pura madhe|hospital kuthe|sanga|madat pahije|amhi adkalo|amhi phaslo|madat dyavi|evacuation kuthe|camp kuthe|bed shodha)\b/i.test(trimmed)) {
      const config = getLanguageConfig('mr');
      return {
        language: 'mr',
        confidence: 'high',
        isAmbiguous: false,
        isMixedOrRomanized: true,
        script: 'Latin (Romanized Marathi)',
        direction: config.direction,
        name: config.name,
        nativeName: config.nativeName,
        rule: 'romanized_marathi_lexical'
      };
    }

    // 14. Romanized Tamil (Tanglish)
    if (/\b(kaapathi|kaapathunga|udhavi|udhavi seiyunga|hospital enga|enga irukku|vellam vanthuruchu|enna pannanum|thee pidichuruchu|maruthuvamanai)\b/i.test(trimmed)) {
      const config = getLanguageConfig('ta');
      return {
        language: 'ta',
        confidence: 'high',
        isAmbiguous: false,
        isMixedOrRomanized: true,
        script: 'Latin (Tanglish)',
        direction: config.direction,
        name: config.name,
        nativeName: config.nativeName,
        rule: 'romanized_tamil_lexical'
      };
    }

    // 15. Romanized Telugu
    if (/\b(kaapadandi|sahayam|sahayam cheyandi|hospital ekkada|varada vachindi|em cheyali|aasupathri ekkada|shelter ekkada)\b/i.test(trimmed)) {
      const config = getLanguageConfig('te');
      return {
        language: 'te',
        confidence: 'high',
        isAmbiguous: false,
        isMixedOrRomanized: true,
        script: 'Latin (Romanized Telugu)',
        direction: config.direction,
        name: config.name,
        nativeName: config.nativeName,
        rule: 'romanized_telugu_lexical'
      };
    }

    // 16. Romanized Bengali
    if (/\b(bachao|sahajjo korun|hospital kothay|bonnya hoyeche|ki korbo|banya asche)\b/i.test(trimmed)) {
      const config = getLanguageConfig('bn');
      return {
        language: 'bn',
        confidence: 'high',
        isAmbiguous: false,
        isMixedOrRomanized: true,
        script: 'Latin (Romanized Bengali)',
        direction: config.direction,
        name: config.name,
        nativeName: config.nativeName,
        rule: 'romanized_bengali_lexical'
      };
    }

    // 17. Romanized Gujarati
    if (/\b(bachavo|madad karo|hospital kyan chhe|poor aavyu|su karvu|aag laagi chhe)\b/i.test(trimmed)) {
      const config = getLanguageConfig('gu');
      return {
        language: 'gu',
        confidence: 'high',
        isAmbiguous: false,
        isMixedOrRomanized: true,
        script: 'Latin (Romanized Gujarati)',
        direction: config.direction,
        name: config.name,
        nativeName: config.nativeName,
        rule: 'romanized_gujarati_lexical'
      };
    }

    // 18. Hinglish / Romanized Hindi
    if (/\b(bachao|madad|kya kare|kya karu|kahan hai|kaha hai|pani bhar gaya|aag lag gayi|flood me|hospital kahan|sos bhejo|bhookamp|toofan|batao|kripya|chahiye|aagaya|aa gaya|karo|bhejo|bachav|surakshit|rahat|kaise bache|police ko bulao|ambulance bhejo|ghar me pani|mujhe madad chahiye|rescue team kahan hai|kya chal raha hai|madad karo|koi hai|fasa hua hu|fas gaye|jaldi aao|chahiye|dekho|baad aagayi|baarish ho rahi|camp kahan|bed available hai)\b/i.test(trimmed)) {
      const config = getLanguageConfig('hi');
      return {
        language: 'hi',
        confidence: 'high',
        isAmbiguous: false,
        isMixedOrRomanized: true,
        script: 'Latin (Hinglish)',
        direction: config.direction,
        name: config.name,
        nativeName: config.nativeName,
        rule: 'hinglish_lexical'
      };
    }

    // 19. Standard English
    const config = getLanguageConfig('en');
    return {
      language: 'en',
      confidence: trimmed.length >= 6 ? 'high' : 'medium',
      isAmbiguous: trimmed.length < 6,
      script: 'Latin',
      direction: config.direction,
      name: config.name,
      nativeName: config.nativeName,
      rule: 'english_default'
    };
  }
}

module.exports = new LanguageDetectionService();
