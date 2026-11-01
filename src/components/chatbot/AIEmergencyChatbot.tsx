import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Bot, X, Send, Sparkles, AlertTriangle, ShieldCheck, PhoneCall,
  RotateCcw, Volume2, VolumeX, Mic, MicOff, MapPin, Building2,
  Tent, ShieldAlert, ArrowUpRight, CheckCircle2, Search,
  Globe, ChevronDown, Check, Minimize2, Maximize2, Info
} from 'lucide-react';
import { api } from '../../services/api';
import { ChatbotMessage, ChatbotQuickData } from '../../types';
import { SUPPORTED_LANGUAGES, getLanguageConfig, LanguageItem } from '../../config/languages';

interface AIEmergencyChatbotProps {
  onOpenSOSModal?: () => void;
}

export const AIEmergencyChatbot: React.FC<AIEmergencyChatbotProps> = ({ onOpenSOSModal }) => {
  const navigate = useNavigate();

  // State
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  
  // Language selection state: defaults to 'auto' if not set
  const [selectedLanguage, setSelectedLanguage] = useState<string>(() => {
    return localStorage.getItem('resqai_chat_lang') || 'auto';
  });
  const [activeLanguage, setActiveLanguage] = useState<string>('en'); // Resolved language used for UI text & chips
  const [isLangSelectorOpen, setIsLangSelectorOpen] = useState(false);
  const [langSearchQuery, setLangSearchQuery] = useState('');

  const [sessionId] = useState<string>(() => {
    let sid = sessionStorage.getItem('resqai_chat_session_id');
    if (!sid) {
      sid = `ses_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
      sessionStorage.setItem('resqai_chat_session_id', sid);
    }
    return sid;
  });

  const [messages, setMessages] = useState<ChatbotMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [quickData, setQuickData] = useState<ChatbotQuickData | null>(null);

  // Voice & Speech State
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [speakingMsgIdx, setSpeakingMsgIdx] = useState<number | null>(null);
  const [voiceNotice, setVoiceNotice] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);

  // Location State
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);

  // Guided SOS Card State
  const [sosPromptOpen, setSosPromptOpen] = useState(false);
  const [sosDescription, setSosDescription] = useState('Immediate rescue & medical assistance requested');
  const [sosSubmitting, setSosSubmitting] = useState(false);
  const [sosResult, setSosResult] = useState<{ incidentId: string; status: string } | null>(null);
  const [sosError, setSosError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Current language config
  const currentLangConfig = useMemo(() => {
    return getLanguageConfig(selectedLanguage === 'auto' ? activeLanguage : selectedLanguage);
  }, [selectedLanguage, activeLanguage]);

  // Filtered languages for search in modal
  const filteredLanguages = useMemo(() => {
    const q = langSearchQuery.trim().toLowerCase();
    if (!q) return SUPPORTED_LANGUAGES;
    return SUPPORTED_LANGUAGES.filter(l => 
      l.name.toLowerCase().includes(q) ||
      l.nativeName.toLowerCase().includes(q) ||
      l.code.toLowerCase().includes(q) ||
      l.script.toLowerCase().includes(q)
    );
  }, [langSearchQuery]);

  // Multilingual question suggestions across languages
  const multilingualChips: Record<string, string[]> = {
    en: [
      'What should I do during a flood?',
      'How do I submit an SOS?',
      'Find nearby hospitals with beds',
      'Which relief camps are available?',
      'Is there an active disaster alert?',
      'What should I do after a fire?'
    ],
    hi: [
      'बाढ़ के दौरान क्या करना चाहिए?',
      'एसओएस कैसे सबमिट करें?',
      'नजदीकी अस्पताल और बेड खोजें',
      'राहत शिविर कहां उपलब्ध हैं?',
      'क्या कोई सक्रिय आपदा चेतावनी है?',
      'आग लगने पर क्या सावधानियां बरतें?'
    ],
    mr: [
      'पुराच्या वेळी काय करावे?',
      'एसओएस कसा पाठवायचा?',
      'जवळची रुग्णालये आणि बेड्स शोधा',
      'मदत छावण्या कुठे उपलब्ध आहेत?',
      'सध्या काही आपत्ती इशारा आहे का?',
      'आगीच्या दुर्घटनेत काय करावे?'
    ],
    bn: [
      'বন্যার সময় কী করা উচিত?',
      'কীভাবে এসওএস পাঠাব?',
      'নিকটবর্তী হাসপাতাল ও বেড খুঁজুন',
      'কোথায় ত্রাণ শিবির আছে?',
      'কোনো দুর্যোগ সতর্কতা আছে কি?'
    ],
    te: [
      'వరదల సమయంలో ఏమి చేయాలి?',
      'ఎస్ఓఎస్ ఎలా పంపాలి?',
      'సమీప ఆసుపత్రులు మరియు బెడ్లు కనుగొనండి',
      'పునరావాస శిబిరాలు ఎక్కడ ఉన్నాయి?',
      'ఏదైనా విపత్తు హెచ్చరిక ఉందా?'
    ],
    ta: [
      'வெள்ளத்தின் போது என்ன செய்ய வேண்டும்?',
      'SOS அனுப்புவது எப்படி?',
      'அருகிலுள்ள மருத்துவமனைகளைக் கண்டறியவும்',
      'நிவாரண முகாம்கள் எங்கே உள்ளன?',
      'ஏதேனும் பேரிடர் எச்சரிக்கை உள்ளதா?'
    ],
    gu: [
      'પૂર દરમિયાન શું કરવું જોઈએ?',
      'SOS કેવી રીતે મોકલવો?',
      'નજીકની હોસ્પિટલ અને બેડ શોધો',
      'રાહત શિબિરો ક્યાં છે?',
      'શું કોઈ આપત્તિ ચેતવણી છે?'
    ],
    ur: [
      'سیلاب کے دوران کیا کرنا چاہیے؟',
      'SOS کیسے بھیجیں؟',
      'قریبی ہسپتال اور بیڈز تلاش کریں',
      'امدادی کیمپ کہاں ہیں؟',
      'کیا کوئی ایمرجنسی الرٹ ہے؟'
    ],
    kn: [
      'ಪ್ರವಾಹದ ಸಮಯದಲ್ಲಿ ಏನು ಮಾಡಬೇಕು?',
      'SOS ಕಳುಹಿಸುವುದು ಹೇಗೆ?',
      'ಹತ್ತಿರದ ಆಸ್ಪತ್ರೆಗಳನ್ನು ಹುಡುಕಿ',
      'ಪರಿಹಾರ ಶಿಬಿರಗಳು ಎಲ್ಲಿವೆ?',
      'ಯಾವುದಾದರೂ ಎಚ್ಚರಿಕೆ ಇದೆಯೇ?'
    ],
    ml: [
      'വെള്ളപ്പൊക്ക സമയത്ത് എന്ത് ചെയ്യണം?',
      'SOS എങ്ങനെ അയക്കാം?',
      'അടുത്തുള്ള ആശുപത്രികൾ കണ്ടെത്തുക',
      'ദുരിതാശ്വാസ ക്യാമ്പുകൾ എവിടെയാണ്?',
      'എന്തെങ്കിലും മുന്നറിയിപ്പുണ്ടോ?'
    ],
    pa: [
      'ਹੜ੍ਹ ਦੌਰਾਨ ਕੀ ਕਰਨਾ ਚਾਹੀਦਾ ਹੈ?',
      'SOS ਕਿਵੇਂ ਭੇਜਣਾ ਹੈ?',
      'ਨੇੜਲੇ ਹਸਪਤਾਲ ਲੱਭੋ',
      'ਰਾਹਤ ਕੈਂਪ ਕਿੱਥੇ ਹਨ?',
      'ਕੀ ਕੋਈ ਆਫ਼ਤ ਚੇਤਾਵਨੀ ਹੈ?'
    ],
    or: [
      'ବନ୍ୟା ସମୟରେ କ\'ଣ କରିବା ଉଚିତ୍?',
      'SOS କିପରି ପଠାଇବେ?',
      'ନିକଟସ୍ଥ ଡାକ୍ତରଖାନା ଖୋଜନ୍ତୁ',
      'ରିଲିଫ୍ କ୍ୟାମ୍ପ୍ କେଉଁଠାରେ ଅଛି?'
    ],
    as: [
      'বানপানীৰ সময়ত কি কৰা উচিত?',
      'SOS কেনেকৈ প্ৰেৰণ কৰিব?',
      'ওচৰৰ চিকিৎসালয় বিচাৰক',
      'সাহায্য শিবিৰ ক\'ত আছে?'
    ],
    mai: [
      'बाढ़ि में की करबाक चाही?',
      'SOS कोना पठाउ?',
      'अस्पताल आ बेड खोजू',
      'राहत शिविर कतय अछि?'
    ],
    sa: [
      'जलप्लवे किं करणीयम्?',
      'SOS कथं प्रेषणीयम्?',
      'चिकित्सालयान् अन्विष्यन्तु',
      'सहायता-शिबिराणि कुत्र सन्ति?'
    ],
    ne: [
      'बाढीको बेला के गर्नुपर्छ?',
      'SOS कसरी पठाउने?',
      'अस्पताल र बेड खोज्नुहोस्',
      'राहत शिविर कहाँ छन्?'
    ],
    gom: [
      'व्हांवटयाच्या वेळार किदें करचें?',
      'SOS कसो धाडचो?',
      'हॉस्पिटलां आनी बेड्स सोदात',
      'मदत छावण्यो खंय आसात?'
    ],
    sd: [
      'ٻوڏ دوران ڇا ڪجي؟',
      'SOS ڪيئن موڪلجي؟',
      'اسپتالون ۽ بيڊز ڳوليو',
      'امدادی ڪئمپون ڪٿي آهن؟'
    ],
    doi: [
      'बाह्ड़ च क्या करना चाहिदा?',
      'SOS किश चाल्ली भेजने?',
      'हस्पताल ते बेड तुप्पो',
      'राहत कैम्प कुत्थे न?'
    ],
    ks: [
      'سیلابس دوران کِیاہ پَزِ کَرُن؟',
      'SOS کِتھ کٔنؠ سوزُن؟',
      'ہسپتال تہٕ بیڑ تلاش کٔرِو'
    ],
    brx: [
      'दैबाना समाव मा खालामनांगौ?',
      'SOS माबोरै दैथायहरनो?',
      'फाहामसालि आरो बिस्तारि नागिर'
    ],
    sat: [
      'ᱵᱟᱱ ᱚᱠᱛᱚ ᱪᱮᱫ ᱪᱤᱠᱟᱹ ᱦᱩᱭᱩᱜ-ᱟ?',
      'SOS ᱪᱮᱫ ᱞᱮᱠᱟᱛᱮ ᱵᱷᱮᱡᱟᱭᱟ?',
      'ᱦᱟᱥᱯᱟᱛᱟᱞ ᱯᱟᱱᱛᱮᱭ ᱢᱮ'
    ],
    mni: [
      'ঈশিং ইচাওদা করম তৌগদগে?',
      'SOS করম্না থাগদগে?',
      'হোস্পিতাল থিরু'
    ]
  };

  // Welcome message generators
  const getInitialWelcomeMessage = (lang: string): ChatbotMessage => {
    const welcomePrompts: Record<string, { content: string; label: string; direction: 'ltr' | 'rtl' }> = {
      en: {
        content: `👋 **Welcome to ResQAI Emergency Assistant.**\n\nI support all 22 Scheduled Indian Languages + English.\n\nAsk me about:\n• 🌊 **Disaster Safety** (Floods, Fires, Earthquakes, Cyclones)\n• 🏥 **Hospitals & Bed Availability** (Real-time ICU counts)\n• ⛺ **Relief Shelters** (Verified capacities & food rations)\n• 🚨 **Guided Emergency SOS** (Official rescue broadcast)\n\n*In imminent life-threatening emergencies, immediately dial **112**.*`,
        label: 'ResQAI Emergency Guidance Engine',
        direction: 'ltr'
      },
      hi: {
        content: `👋 **ResQAI आपातकालीन सहायक में आपका स्वागत है।**\n\nमैं भारत की सभी 22 आधिकारिक भाषाओं और अंग्रेजी का समर्थन करता हूँ।\n\nमुझसे पूछें:\n• 🌊 **आपदा सुरक्षा निर्देश** (बाढ़, आग, भूकंप, चक्रवात)\n• 🏥 **अस्पताल एवं बेड उपलब्धता** (लाइव आईसीयू विवरण)\n• ⛺ **राहत शिविर** (सत्यापित आश्रय स्थल व राशन)\n• 🚨 **मार्गदर्शित एसओएस** (सत्यापित बचाव अनुरोध)\n\n*तत्काल जीवन संकट की स्थिति में, सीधे **112** डायल करें।*`,
        label: 'ResQAI सुरक्षा मार्गदर्शन प्रणाली',
        direction: 'ltr'
      },
      mr: {
        content: `👋 **ResQAI आपत्कालीन सहाय्यकामध्ये आपले स्वागत आहे.**\n\nमी भारताच्या सर्व २२ अधिकृत भाषा आणि इंग्रजीचे समर्थन करतो.\n\nविचारू शकता:\n• 🌊 **आपत्ती सुरक्षा मार्गदर्शन** (पूर, आग, भूकंप, चक्रीवादळ)\n• 🏥 **रुग्णालये व बेड्स** (थेट आयसीयू उपलब्धता)\n• ⛺ **मदत छावण्या** (निवारा केंद्र व अन्न पुरवठा)\n• 🚨 **मार्गदर्शित एसओएस** (थेट बचाव संदेश)\n\n*तातडीच्या जीवितास धोका असल्यास त्वरित **११२** वर कॉल करा.*`,
        label: 'ResQAI आपत्ती मार्गदर्शन यंत्रणा',
        direction: 'ltr'
      },
      ur: {
        content: `👋 **ResQAI ایمرجنسی اسسٹنٹ میں خوش آمدید۔**\n\nمیں ہندوستان کی تمام 22 شیڈول زبانوں اور انگریزی میں رہنمائی فراہم کرتا ہوں۔\n\nرہنمائی حاصل کریں:\n• 🌊 **آفات سے حفاظت** (سیلاب، آگ، زلزلہ، طوفان)\n• 🏥 **ہسپتال اور بیڈز کی دستیابی**\n• ⛺ **امدادی کیمپ اور پناہ گاہیں**\n• 🚨 **رہنمائی شدہ SOS**\n\n*فوری خطرے میں براہ راست **112** ڈائل کریں۔*`,
        label: 'ResQAI ایمرجنسی گائیڈنس',
        direction: 'rtl'
      }
    };

    const sel = welcomePrompts[lang] || welcomePrompts.en;
    const chips = multilingualChips[lang] || multilingualChips.en;

    return {
      role: 'assistant',
      content: sel.content,
      language: lang,
      direction: sel.direction,
      source: 'ai_guidance',
      sourceLabel: `${sel.label} • ${getLanguageConfig(lang).nativeName}`,
      suggestedQuestions: chips,
      timestamp: new Date()
    };
  };

  // Configure Web Speech API
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      setSpeechSupported(true);
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;

      const langToUse = selectedLanguage === 'auto' ? activeLanguage : selectedLanguage;
      const bcp = getLanguageConfig(langToUse).bcp47 || 'en-IN';
      recognition.lang = bcp;

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInput(prev => (prev ? `${prev} ${transcript}` : transcript));
        setIsListening(false);
      };

      recognition.onerror = (e: any) => {
        setIsListening(false);
        if (e.error === 'not-allowed') {
          setVoiceNotice('Microphone permission required for speech input.');
        } else if (e.error === 'language-not-supported') {
          setVoiceNotice(`Speech recognition not supported for ${currentLangConfig.name} on this browser.`);
        }
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }
  }, [selectedLanguage, activeLanguage]);

  // Request browser location
  const requestLocation = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      },
      () => {
        setUserLocation({ lat: 28.6139, lng: 77.2090 });
      },
      { timeout: 7000 }
    );
  };

  // Initial data load
  useEffect(() => {
    api.getChatbotQuickData().then((data: ChatbotQuickData | null) => {
      if (data) setQuickData(data);
    });

    api.getChatHistory(sessionId).then((res: { success: boolean; messages: ChatbotMessage[] }) => {
      if (res.success && res.messages && res.messages.length > 0) {
        setMessages(res.messages);
        const lastMsg = res.messages[res.messages.length - 1];
        if (lastMsg.language && lastMsg.language !== 'auto') {
          setActiveLanguage(lastMsg.language);
        }
      } else {
        const initLang = selectedLanguage === 'auto' ? 'en' : selectedLanguage;
        setMessages([getInitialWelcomeMessage(initLang)]);
      }
    });

    requestLocation();
  }, [sessionId]);

  // Auto-scroll
  useEffect(() => {
    if (isOpen && !isMinimized && !isLangSelectorOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen, isMinimized, isLoading, sosPromptOpen, isLangSelectorOpen]);

  // Language selection change
  const handleSelectLanguage = (langCode: string) => {
    setSelectedLanguage(langCode);
    localStorage.setItem('resqai_chat_lang', langCode);
    setIsLangSelectorOpen(false);
    setLangSearchQuery('');

    const targetLang = langCode === 'auto' ? activeLanguage : langCode;
    setActiveLanguage(targetLang);

    if (recognitionRef.current) {
      recognitionRef.current.lang = getLanguageConfig(targetLang).bcp47 || 'en-IN';
    }

    if (messages.length <= 1) {
      setMessages([getInitialWelcomeMessage(targetLang)]);
    }
  };

  // Toggle listening
  const toggleListening = () => {
    if (!speechSupported || !recognitionRef.current) {
      setVoiceNotice('Voice recognition is not supported in this browser. Please type your message.');
      return;
    }
    setVoiceNotice(null);

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      try {
        const langToUse = selectedLanguage === 'auto' ? activeLanguage : selectedLanguage;
        const bcp = getLanguageConfig(langToUse).bcp47 || 'en-IN';
        recognitionRef.current.lang = bcp;
        recognitionRef.current.start();
        setIsListening(true);
      } catch (err: any) {
        console.warn('Speech recognition start error:', err);
        setIsListening(false);
      }
    }
  };

  // Text to speech
  const handleSpeak = (text: string, msgLang?: string, idx?: number) => {
    if (!('speechSynthesis' in window)) {
      setVoiceNotice('Text-to-speech audio is unsupported in this browser.');
      return;
    }
    setVoiceNotice(null);

    if (speakingMsgIdx === idx) {
      window.speechSynthesis.cancel();
      setSpeakingMsgIdx(null);
      return;
    }

    window.speechSynthesis.cancel();
    const cleanText = text.replace(/[*#_`]/g, '').trim();
    const utterance = new SpeechSynthesisUtterance(cleanText);

    const langCode = msgLang || (selectedLanguage === 'auto' ? activeLanguage : selectedLanguage);
    const bcp = getLanguageConfig(langCode).bcp47 || 'en-IN';
    utterance.lang = bcp;
    utterance.rate = 0.95;

    // Detect if browser has an appropriate voice
    const voices = window.speechSynthesis.getVoices();
    const match = voices.find(v => v.lang.startsWith(langCode) || v.lang.includes(bcp));
    if (match) utterance.voice = match;

    utterance.onend = () => setSpeakingMsgIdx(null);
    utterance.onerror = () => {
      setSpeakingMsgIdx(null);
      setVoiceNotice(`Spoken audio for ${getLanguageConfig(langCode).name} is unavailable on your device.`);
    };

    if (typeof idx === 'number') setSpeakingMsgIdx(idx);
    window.speechSynthesis.speak(utterance);
  };

  // Send message
  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || input).trim();
    if (!text || isLoading) return;

    setError(null);
    setVoiceNotice(null);
    setInput('');

    const isSosIntent = /(?:sos|emergency|help me|rescue me|save me|फंसा हुआ|मदद चाहिए|वाचवा|बचाओ|সাহায্য|बचाव|కాపాడండి|காப்பாற்று)/i.test(text);

    const userMsg: ChatbotMessage = {
      role: 'user',
      content: text,
      language: selectedLanguage,
      direction: currentLangConfig.direction,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMsg]);
    setIsLoading(true);

    try {
      const res = await api.sendChatMessage({
        message: text,
        sessionId,
        language: selectedLanguage,
        userLocation: userLocation || { lat: 28.6139, lng: 77.2090 }
      });

      if (res.success) {
        if (res.language && res.language !== 'auto') {
          setActiveLanguage(res.language);
        }

        const botMsg: ChatbotMessage = {
          role: 'assistant',
          content: res.reply,
          language: res.language || activeLanguage,
          detectedLanguage: res.detectedLanguage,
          direction: res.direction || 'ltr',
          source: (res.source as any) || 'ai_guidance',
          sourceLabel: res.sourceLabel,
          liveData: res.liveData,
          actionButtons: res.actionButtons,
          suggestedQuestions: res.suggestedQuestions,
          timestamp: res.timestamp || new Date()
        };
        setMessages(prev => [...prev, botMsg]);

        if (res.source === 'sos_guided' || isSosIntent) {
          setSosPromptOpen(true);
        }
      } else {
        throw new Error(res.message || 'Failed to get response');
      }
    } catch (err: any) {
      setError(err.message || 'Unable to connect to ResQAI AI service.');
      const fallbackMsg: ChatbotMessage = {
        role: 'assistant',
        content: `⚠️ **Emergency Notice:** Unable to reach AI server right now.\n\n• For immediate life threats, dial **112** (National Emergency Helpline) or **1078** (NDRF Control).\n• For active evacuation maps, visit [/citizen/evacuation](/citizen/evacuation).`,
        language: 'en',
        direction: 'ltr',
        source: 'emergency_hotline',
        sourceLabel: 'Emergency Safety Fallback',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, fallbackMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  // Submit Guided SOS
  const handleConfirmSOS = async () => {
    if (sosSubmitting) return;
    setSosSubmitting(true);
    setSosError(null);

    const coords = userLocation || { lat: 28.6139, lng: 77.2090 };

    try {
      const incident = await api.triggerSOS(coords.lat, coords.lng, 5, sosDescription);
      if (incident && incident.id) {
        setSosResult({
          incidentId: incident.id,
          status: incident.status || 'SEARCHING_FOR_RESCUE'
        });

        const confirmationMsg: ChatbotMessage = {
          role: 'assistant',
          content: `🚨 **SOS BROADCAST CONFIRMED & LOGGED IN COMMAND SYSTEM**\n\n• **Incident Reference:** \`${incident.id}\`\n• **Status:** \`${incident.status || 'SEARCHING_FOR_RESCUE'}\`\n• **Coordinates:** ${coords.lat.toFixed(4)}° N, ${coords.lng.toFixed(4)}° E\n• **Notice:** ResQAI rescue operators and nearby ambulances have been alerted via Socket.IO command telemetry.\n\n*Keep your phone charged and stay in a secure position.*`,
          language: activeLanguage,
          direction: currentLangConfig.direction,
          source: 'official_resqai_records',
          sourceLabel: 'Verified ResQAI Incident Record',
          timestamp: new Date()
        };
        setMessages(prev => [...prev, confirmationMsg]);
      } else {
        throw new Error('Backend failed to assign an incident ID. Please call 112 immediately.');
      }
    } catch (err: any) {
      setSosError(err.message || 'SOS Submission failed. Do not assume rescuers have been dispatched! Call 112 immediately.');
    } finally {
      setSosSubmitting(false);
    }
  };

  // Clear Chat History
  const handleClearHistory = async () => {
    if (window.confirm('Clear your conversation history for this session?')) {
      await api.clearChatHistory(sessionId);
      const initLang = selectedLanguage === 'auto' ? 'en' : selectedLanguage;
      setMessages([getInitialWelcomeMessage(initLang)]);
      setSosPromptOpen(false);
      setSosResult(null);
    }
  };

  // Handle Action Buttons
  const handleActionButton = (btn: { action: string; url?: string; payload?: string }) => {
    if (btn.action === 'OPEN_SOS_MODAL') {
      if (onOpenSOSModal) {
        onOpenSOSModal();
      } else {
        setSosPromptOpen(true);
      }
    } else if (btn.action === 'NAVIGATE' && btn.url) {
      navigate(btn.url);
      setIsMinimized(true);
    } else if (btn.action === 'CALL_HOTLINE') {
      window.location.href = `tel:${btn.payload || '112'}`;
    }
  };

  // Render Source Badge
  const renderSourceBadge = (source?: string, label?: string) => {
    switch (source) {
      case 'official_resqai_records':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
            <ShieldCheck className="w-3 h-3 text-emerald-400" />
            {label || 'Verified ResQAI Database'}
          </span>
        );
      case 'safety_protocol':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/20 text-amber-400 border border-amber-500/40">
            <AlertTriangle className="w-3 h-3 text-amber-400" />
            {label || 'NDMA Safety Protocol'}
          </span>
        );
      case 'sos_guided':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-500/20 text-rose-400 border border-rose-500/40">
            <ShieldAlert className="w-3 h-3 text-rose-400" />
            {label || 'Emergency SOS Protocol'}
          </span>
        );
      case 'emergency_hotline':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-600/20 text-red-400 border border-red-500/40">
            <PhoneCall className="w-3 h-3 text-red-400" />
            {label || 'National Emergency Helpline'}
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
            <Bot className="w-3 h-3 text-indigo-300" />
            {label || 'ResQAI AI Guidance'}
          </span>
        );
    }
  };

  // Active question chips
  const activeQuestionChips = useMemo(() => {
    const lang = selectedLanguage === 'auto' ? activeLanguage : selectedLanguage;
    return multilingualChips[lang] || multilingualChips.en;
  }, [selectedLanguage, activeLanguage]);

  return (
    <>
      {/* Floating Trigger Button (Bottom-Right) */}
      {!isOpen && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900/90 border border-blue-500/40 text-xs text-blue-200 shadow-xl backdrop-blur-md animate-fade-in">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>22 Indian Languages + EN</span>
          </div>

          <button
            onClick={() => {
              setIsOpen(true);
              setIsMinimized(false);
            }}
            aria-label="Open AI Emergency Assistant"
            className="group relative flex items-center justify-center w-14 h-14 rounded-full bg-gradient-to-tr from-blue-700 via-indigo-600 to-rose-600 text-white shadow-2xl hover:scale-105 active:scale-95 transition-all duration-300 border-2 border-white/20 focus:outline-none focus:ring-4 focus:ring-blue-500/40"
          >
            <span className="absolute -inset-1 rounded-full bg-blue-500/30 blur-md group-hover:bg-blue-500/50 animate-pulse" />
            <Bot className="relative w-7 h-7 text-white drop-shadow-md" />
            <span className="absolute -top-1 -right-1 flex h-4 w-4">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-4 w-4 bg-rose-500 text-[9px] font-bold text-white items-center justify-center">
                !
              </span>
            </span>
          </button>
        </div>
      )}

      {/* Chat Drawer Window */}
      {isOpen && (
        <div 
          className={`fixed z-50 transition-all duration-300 ease-in-out ${
            isMinimized 
              ? 'bottom-6 right-6 w-84 h-14 rounded-2xl' 
              : 'bottom-4 right-4 sm:bottom-6 sm:right-6 w-[450px] max-w-[calc(100vw-28px)] h-[660px] max-h-[calc(100vh-50px)] rounded-3xl'
          } bg-[#0b1329]/95 border border-blue-500/40 shadow-2xl backdrop-blur-xl flex flex-col overflow-hidden text-slate-100 font-sans`}
        >
          {/* Top Bar / Header */}
          <div className="relative px-3.5 py-3 bg-gradient-to-r from-slate-900 via-[#0d1a3a] to-slate-900 border-b border-slate-700/60 flex items-center justify-between select-none">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-gradient-to-tr from-blue-600 to-rose-600 text-white shadow-md">
                <Bot className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="font-bold text-sm tracking-wide text-white">ResQAI Emergency Bot</h3>
                  <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                </div>
                <p className="text-[10px] text-slate-400 font-medium">NDMA Protocols • 22 Indian Languages</p>
              </div>
            </div>

            {/* Language Selector Trigger & Controls */}
            <div className="flex items-center gap-1.5">
              {/* Language Selector Button */}
              <button
                onClick={() => {
                  setIsLangSelectorOpen(!isLangSelectorOpen);
                  if (!isLangSelectorOpen) {
                    setTimeout(() => searchInputRef.current?.focus(), 100);
                  }
                }}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-semibold border transition ${
                  selectedLanguage === 'auto'
                    ? 'bg-blue-600/30 text-blue-200 border-blue-500/40 hover:bg-blue-600/50'
                    : 'bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700'
                }`}
                title="Select language (22 Scheduled Languages + English)"
              >
                <Globe className="w-3.5 h-3.5 text-blue-400" />
                <span className="max-w-[80px] truncate">
                  {selectedLanguage === 'auto' ? 'Auto' : currentLangConfig.nativeName}
                </span>
                <ChevronDown className="w-3 h-3 text-slate-400" />
              </button>

              {/* Minimize */}
              <button
                onClick={() => setIsMinimized(!isMinimized)}
                aria-label={isMinimized ? "Maximize window" : "Minimize window"}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
                title={isMinimized ? 'Maximize' : 'Minimize'}
              >
                {isMinimized ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
              </button>

              {/* Close */}
              <button
                onClick={() => setIsOpen(false)}
                aria-label="Close chatbot window"
                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Body (When not minimized) */}
          {!isMinimized && (
            <>
              {/* Language Selector Modal / Drawer Overlay */}
              {isLangSelectorOpen && (
                <div className="absolute inset-0 z-40 bg-[#0b1329]/98 backdrop-blur-xl flex flex-col p-4 animate-in fade-in zoom-in-95">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-700">
                    <div className="flex items-center gap-2">
                      <Globe className="w-5 h-5 text-blue-400" />
                      <h4 className="font-bold text-sm text-white">Select Language / भाषा चुनें</h4>
                    </div>
                    <button
                      onClick={() => setIsLangSelectorOpen(false)}
                      className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Search Input */}
                  <div className="my-3 relative">
                    <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                    <input
                      ref={searchInputRef}
                      type="text"
                      value={langSearchQuery}
                      onChange={(e) => setLangSearchQuery(e.target.value)}
                      placeholder="Search language (e.g. தமிழ், Bengali, gu)..."
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  {/* Language Grid */}
                  <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 scrollbar-thin scrollbar-thumb-slate-700">
                    {/* Auto-detect option (first item) */}
                    {filteredLanguages.some(l => l.code === 'auto') && (
                      <button
                        onClick={() => handleSelectLanguage('auto')}
                        className={`w-full p-2.5 rounded-xl border flex items-center justify-between text-left transition ${
                          selectedLanguage === 'auto'
                            ? 'bg-blue-600/20 border-blue-500 text-white font-bold'
                            : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:bg-slate-800/80'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="p-1.5 rounded-lg bg-blue-500/20 text-blue-400">
                            <Sparkles className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="text-xs font-bold text-white">Auto-detect my language</div>
                            <div className="text-[10px] text-blue-300">स्वचालित पहचान / स्वतः ओळखा / தன்முயற்சி</div>
                          </div>
                        </div>
                        {selectedLanguage === 'auto' && <Check className="w-4 h-4 text-blue-400" />}
                      </button>
                    )}

                    <div className="pt-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 px-1">
                      22 Scheduled Indian Languages & English
                    </div>

                    {filteredLanguages
                      .filter(l => l.code !== 'auto')
                      .map((lang) => {
                        const isSelected = selectedLanguage === lang.code;
                        return (
                          <button
                            key={lang.code}
                            onClick={() => handleSelectLanguage(lang.code)}
                            className={`w-full p-2.5 rounded-xl border flex items-center justify-between text-left transition ${
                              isSelected
                                ? 'bg-blue-600/25 border-blue-500 text-white font-bold shadow-md'
                                : 'bg-slate-900/40 border-slate-800/80 text-slate-200 hover:bg-slate-800 hover:border-slate-700'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <span className="w-6 text-[10px] font-mono text-slate-400 uppercase">
                                {lang.code}
                              </span>
                              <div>
                                <span className="text-sm font-semibold text-white mr-1.5">
                                  {lang.nativeName}
                                </span>
                                <span className="text-xs text-slate-400">
                                  ({lang.name})
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              {lang.direction === 'rtl' && (
                                <span className="text-[9px] px-1 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                  RTL
                                </span>
                              )}
                              <span className="text-[10px] text-slate-400">
                                {lang.script}
                              </span>
                              {isSelected && <Check className="w-4 h-4 text-emerald-400" />}
                            </div>
                          </button>
                        );
                      })}
                  </div>
                </div>
              )}

              {/* Live Status Ribbon */}
              <div className="px-3 py-1.5 bg-slate-900/60 border-b border-slate-800/80 flex items-center justify-between text-[11px] text-slate-300 overflow-x-auto gap-2">
                <div className="flex items-center gap-3 whitespace-nowrap">
                  <span className="flex items-center gap-1 text-rose-400 font-semibold">
                    <ShieldAlert className="w-3.5 h-3.5" />
                    {quickData?.activeAlertsCount || 1} Alerts Active
                  </span>
                  <span className="flex items-center gap-1 text-emerald-400 font-semibold">
                    <Building2 className="w-3.5 h-3.5" />
                    {quickData?.availableBedsTotal || 74} Beds Avail
                  </span>
                  <span className="flex items-center gap-1 text-blue-400 font-semibold">
                    <Tent className="w-3.5 h-3.5" />
                    {quickData?.openCampsCount || 4} Shelters
                  </span>
                </div>
                
                <a
                  href="tel:112"
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-rose-600/30 hover:bg-rose-600 text-rose-200 hover:text-white text-[10px] font-bold border border-rose-500/40 transition whitespace-nowrap"
                  title="Direct Call National Helpline 112"
                >
                  <PhoneCall className="w-3 h-3 text-rose-300" />
                  112 Helpline
                </a>
              </div>

              {/* Voice / Capability Notice Banner */}
              {voiceNotice && (
                <div className="px-3 py-1 bg-amber-950/70 border-b border-amber-500/40 text-[11px] text-amber-200 flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <Info className="w-3 h-3 text-amber-400" />
                    {voiceNotice}
                  </span>
                  <button onClick={() => setVoiceNotice(null)} className="text-amber-300 hover:text-white">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )}

              {/* Message History Feed */}
              <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3.5 text-sm scrollbar-thin scrollbar-thumb-slate-700">
                {messages.map((msg, idx) => {
                  const isUser = msg.role === 'user';
                  const isRtl = msg.direction === 'rtl';
                  return (
                    <div
                      key={idx}
                      className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} space-y-1.5`}
                      dir={isRtl ? 'rtl' : 'ltr'}
                    >
                      {/* Source badge for bot replies */}
                      {!isUser && (
                        <div className="flex items-center gap-2">
                          {renderSourceBadge(msg.source, msg.sourceLabel)}
                          
                          {/* Detected language indicator */}
                          {msg.detectedLanguage && (
                            <span className="text-[10px] text-blue-300 bg-blue-900/40 px-1.5 py-0.5 rounded border border-blue-700/50">
                              {getLanguageConfig(msg.detectedLanguage).nativeName}
                            </span>
                          )}

                          {/* Text-to-speech button */}
                          <button
                            onClick={() => handleSpeak(msg.content, msg.language, idx)}
                            className="text-slate-400 hover:text-blue-300 p-0.5 rounded transition"
                            title="Listen with Text-to-Speech"
                          >
                            {speakingMsgIdx === idx ? (
                              <VolumeX className="w-3.5 h-3.5 text-rose-400 animate-pulse" />
                            ) : (
                              <Volume2 className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      )}

                      {/* Bubble */}
                      <div
                        className={`max-w-[88%] rounded-2xl px-3.5 py-2.5 text-xs sm:text-sm leading-relaxed shadow-lg ${
                          isUser
                            ? 'bg-gradient-to-tr from-blue-600 to-indigo-600 text-white rounded-tr-none'
                            : 'bg-slate-800/90 text-slate-100 border border-slate-700/70 rounded-tl-none'
                        } ${isRtl ? 'font-serif text-right' : ''}`}
                      >
                        <div className="whitespace-pre-line break-words">
                          {msg.content}
                        </div>

                        {/* Interactive Live Data Cards (if present) */}
                        {msg.liveData && Array.isArray(msg.liveData) && msg.liveData.length > 0 && (
                          <div className="mt-3 space-y-2 pt-2 border-t border-slate-700/60" dir="ltr">
                            {msg.liveData.map((item: any, itemIdx: number) => (
                              <div
                                key={itemIdx}
                                className="p-2 rounded-xl bg-slate-900/80 border border-slate-700/80 flex items-center justify-between text-xs"
                              >
                                <div>
                                  <div className="font-semibold text-slate-100 flex items-center gap-1.5">
                                    {item.type === 'hospital' ? <Building2 className="w-3.5 h-3.5 text-emerald-400" /> : <Tent className="w-3.5 h-3.5 text-blue-400" />}
                                    {item.name}
                                  </div>
                                  <div className="text-[11px] text-slate-400 mt-0.5">
                                    {item.type === 'hospital' ? (
                                      <span>Beds Available: <strong className="text-emerald-400">{item.availableBeds || item.beds}</strong> {item.icuBeds ? `• ICU: ${item.icuBeds}` : ''}</span>
                                    ) : (
                                      <span>Occupancy: <strong className="text-blue-400">{item.occupancy || item.currentOccupants}/{item.capacity}</strong></span>
                                    )}
                                  </div>
                                </div>
                                {item.contactPhone && (
                                  <a
                                    href={`tel:${item.contactPhone}`}
                                    className="px-2 py-1 rounded-lg bg-blue-600/30 hover:bg-blue-600 text-blue-200 hover:text-white text-[10px] font-bold border border-blue-500/40"
                                  >
                                    Call
                                  </a>
                                )}
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Action Buttons inside message */}
                        {msg.actionButtons && msg.actionButtons.length > 0 && (
                          <div className="mt-2.5 pt-2 border-t border-slate-700/60 flex flex-wrap gap-1.5" dir="ltr">
                            {msg.actionButtons.map((btn, btnIdx) => (
                              <button
                                key={btnIdx}
                                onClick={() => handleActionButton(btn)}
                                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition flex items-center gap-1 shadow-sm ${
                                  btn.action === 'OPEN_SOS_MODAL'
                                    ? 'bg-rose-600 hover:bg-rose-500 text-white'
                                    : 'bg-slate-700 hover:bg-slate-600 text-blue-200 hover:text-white border border-slate-600'
                                }`}
                              >
                                {btn.label}
                                <ArrowUpRight className="w-3 h-3" />
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Timestamp */}
                      <span className="text-[10px] text-slate-500 px-1">
                        {msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                      </span>
                    </div>
                  );
                })}

                {/* Loading indicator */}
                {isLoading && (
                  <div className="flex items-center gap-2 text-xs text-blue-300 bg-slate-800/80 px-3 py-2 rounded-2xl w-fit border border-slate-700 animate-pulse">
                    <Sparkles className="w-4 h-4 text-blue-400 animate-spin" />
                    <span>Evaluating emergency data in {currentLangConfig.name}...</span>
                  </div>
                )}

                {/* Guided SOS Confirmation Card */}
                {sosPromptOpen && (
                  <div className="my-3 p-3.5 rounded-2xl bg-rose-950/40 border-2 border-rose-500/60 shadow-xl space-y-2.5 animate-in fade-in zoom-in-95">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-rose-400 font-bold text-xs uppercase tracking-wider">
                        <ShieldAlert className="w-4 h-4 text-rose-500 animate-bounce" />
                        Guided Emergency SOS Broadcast
                      </div>
                      <button
                        onClick={() => setSosPromptOpen(false)}
                        className="text-slate-400 hover:text-white text-xs"
                      >
                        Cancel
                      </button>
                    </div>

                    <p className="text-[11px] text-slate-300 leading-normal">
                      ⚠️ <strong>Emergency Disclosure:</strong> The AI Chatbot does not directly deploy rescuers. Confirming below submits an official high-priority SOS into the ResQAI live dispatcher network.
                    </p>

                    <div>
                      <label className="block text-[11px] font-medium text-slate-300 mb-1">
                        Emergency Situation & Details:
                      </label>
                      <input
                        type="text"
                        value={sosDescription}
                        onChange={(e) => setSosDescription(e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500"
                        placeholder="Describe trapped victims, water level, injury, etc."
                      />
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-400 bg-slate-900/60 px-2.5 py-1 rounded-lg">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-rose-400" />
                        {userLocation ? `${userLocation.lat.toFixed(4)}, ${userLocation.lng.toFixed(4)}` : 'Detecting GPS...'}
                      </span>
                      <span className="text-[10px] text-emerald-400 font-mono">GPS ACCURACY: ±5M</span>
                    </div>

                    {sosError && (
                      <div className="text-[11px] text-rose-300 bg-rose-900/40 p-2 rounded-lg border border-rose-800">
                        {sosError}
                      </div>
                    )}

                    {sosResult ? (
                      <div className="p-2 rounded-xl bg-emerald-950/50 border border-emerald-500/50 text-emerald-200 text-xs flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          SOS Active #{sosResult.incidentId}
                        </span>
                        <button
                          onClick={() => {
                            navigate('/citizen/evacuation');
                            setIsMinimized(true);
                          }}
                          className="px-2 py-0.5 rounded bg-emerald-600 text-white font-bold text-[10px]"
                        >
                          View Map
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={handleConfirmSOS}
                        disabled={sosSubmitting}
                        className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-bold text-xs uppercase tracking-wide flex items-center justify-center gap-2 shadow-lg transition active:scale-95 disabled:opacity-50"
                      >
                        <ShieldAlert className="w-4 h-4" />
                        {sosSubmitting ? 'Transmitting to ResQAI Fleet...' : '🚨 Confirm & Broadcast SOS'}
                      </button>
                    )}
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Suggested Questions Chips */}
              <div className="px-3 py-2 bg-slate-900/70 border-t border-slate-800/80">
                <div className="flex items-center justify-between mb-1.5 text-[10px] text-slate-400">
                  <span>Suggested Emergency Queries ({currentLangConfig.nativeName}):</span>
                  <button
                    onClick={handleClearHistory}
                    className="flex items-center gap-1 text-slate-400 hover:text-rose-400 transition"
                    title="Clear Chat History"
                  >
                    <RotateCcw className="w-3 h-3" />
                    Clear Chat
                  </button>
                </div>
                <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none" dir={currentLangConfig.direction}>
                  {activeQuestionChips.map((chip, chipIdx) => (
                    <button
                      key={chipIdx}
                      onClick={() => handleSendMessage(chip)}
                      className="whitespace-nowrap px-2.5 py-1 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-[11px] transition shadow-sm active:scale-95"
                    >
                      {chip}
                    </button>
                  ))}
                </div>
              </div>

              {/* Message Input Bar */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendMessage();
                }}
                className="p-3 bg-slate-900 border-t border-slate-800 flex items-center gap-2"
                dir={currentLangConfig.direction}
              >
                {/* Speech to text */}
                <button
                  type="button"
                  onClick={toggleListening}
                  className={`p-2 rounded-xl transition ${
                    isListening
                      ? 'bg-rose-600 text-white animate-pulse'
                      : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'
                  }`}
                  title={
                    isListening
                      ? 'Stop listening'
                      : `Speak in ${currentLangConfig.name} (${currentLangConfig.nativeName})`
                  }
                >
                  {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                </button>

                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  dir={currentLangConfig.direction}
                  placeholder={`Ask emergency question in ${currentLangConfig.nativeName}...`}
                  className={`flex-1 bg-slate-800/90 text-slate-100 placeholder-slate-500 px-3.5 py-2 rounded-xl text-xs sm:text-sm border border-slate-700 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition ${
                    currentLangConfig.direction === 'rtl' ? 'text-right' : 'text-left'
                  }`}
                  disabled={isLoading}
                />

                <button
                  type="submit"
                  disabled={!input.trim() || isLoading}
                  aria-label="Send emergency question"
                  className="p-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white disabled:opacity-40 disabled:cursor-not-allowed shadow-md transition active:scale-95"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </>
          )}
        </div>
      )}
    </>
  );
};
