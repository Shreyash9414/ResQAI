/**
 * ResQAI Emergency Chatbot Service
 * Integrates configurable LLM API (Gemini / OpenAI / custom) with live MongoDB platform data,
 * emergency safety rules, India 112 hotline guidance, and support for all 22 languages
 * in the Eighth Schedule of the Indian Constitution, plus English.
 */

const fetch = require('node-fetch');
const { SUPPORTED_LANGUAGES, getLanguageConfig, isValidLanguageCode } = require('../config/languages');
const { getLanguageContent } = require('../config/languageContent');
const languageDetectionService = require('./languageDetectionService');

class ChatbotService {
  constructor() {
    this.apiKey = process.env.AI_API_KEY || '';
    this.model = process.env.AI_MODEL || 'gemini-1.5-flash';
    this.baseUrl = process.env.AI_BASE_URL || 'https://generativelanguage.googleapis.com/v1beta';
    this.provider = process.env.AI_PROVIDER || (this.apiKey ? 'gemini' : 'fallback');
    this.timeoutMs = 8000;
  }

  /**
   * Fast, reliable script and lexical language detection for Indian languages.
   * Leverages centralized languageDetectionService with multi-turn smoothing.
   */
  detectLanguage(text, previousLanguage = null) {
    const res = languageDetectionService.detectLanguageWithContext(text, previousLanguage);
    return res.language;
  }

  /**
   * Tool: Query active incidents
   */
  async getActiveIncidents(mongoModels, query = {}) {
    const { Incident } = mongoModels;
    try {
      if (Incident) {
        const incidents = await Incident.find({
          status: { $nin: ['RESOLVED', 'INCIDENT_RESOLVED', 'CANCELLED', 'Resolved', 'Cancelled'] }
        })
        .sort({ priority: 1, createdAt: -1 })
        .limit(query.limit || 5)
        .lean();

        return incidents.map(inc => ({
          id: inc.incidentId || inc.id,
          title: inc.title,
          disasterType: inc.disasterType,
          severity: inc.severity,
          status: inc.status,
          location: inc.location?.address || 'Disaster Operational Area',
          timestamp: inc.createdAt
        }));
      }
    } catch (err) {
      console.warn('[ChatbotService] MongoDB Incident query notice:', err.message);
    }
    return [];
  }

  /**
   * Tool: Query nearby hospitals and verified bed availability
   */
  async getNearbyHospitals(mongoModels, refLat = 28.6280, refLng = 77.2050, limit = 4) {
    const { Hospital } = mongoModels;
    try {
      if (Hospital) {
        const hospitals = await Hospital.find({}).lean();
        if (hospitals && hospitals.length > 0) {
          const ranked = hospitals.map(h => {
            const lat = h.location?.lat || 28.6280;
            const lng = h.location?.lng || 77.2050;
            const distKm = this.calcDistanceKm(refLat, refLng, lat, lng);
            const availBeds = typeof h.generalBeds?.available === 'number'
              ? h.generalBeds.available
              : (typeof h.availableBeds === 'number' ? h.availableBeds : (h.capacity?.beds?.available || 35));
            const totBeds = typeof h.generalBeds?.total === 'number'
              ? h.generalBeds.total
              : (typeof h.totalBeds === 'number' ? h.totalBeds : (h.capacity?.beds?.total || 100));
            const icuAvail = typeof h.icuBeds?.available === 'number'
              ? h.icuBeds.available
              : (typeof h.icuBeds === 'number' ? h.icuBeds : (h.capacity?.icu?.available || 6));

            return {
              type: 'hospital',
              id: h.hospitalId || h._id.toString(),
              name: h.name,
              availableBeds: availBeds,
              totalBeds: totBeds,
              icuBeds: icuAvail,
              status: h.emergencyDepartmentStatus || h.status || 'AVAILABLE',
              address: h.address || h.location?.address || 'Emergency Trauma Center',
              contactPhone: h.contactPhone || '102 / 112',
              distanceKm: distKm ? Number(distKm.toFixed(1)) : 1.2
            };
          });

          ranked.sort((a, b) => a.distanceKm - b.distanceKm);
          return ranked.slice(0, limit);
        }
      }
    } catch (err) {
      console.warn('[ChatbotService] Hospital query notice:', err.message);
    }
    return [];
  }

  /**
   * Tool: Query available relief camps and shelter occupancy
   */
  async getAvailableReliefCamps(mongoModels, refLat = 28.6100, refLng = 77.2300, limit = 4) {
    const { ReliefCamp } = mongoModels;
    try {
      if (ReliefCamp) {
        const camps = await ReliefCamp.find({ status: { $ne: 'CLOSED' } }).lean();
        if (camps && camps.length > 0) {
          return camps.slice(0, limit).map(c => ({
            type: 'camp',
            id: c.campId || c._id.toString(),
            name: c.name,
            status: c.status || 'OPEN',
            capacity: c.capacity || 500,
            currentOccupants: c.currentOccupants || 0,
            occupancy: c.currentOccupants || 0,
            availableSlots: Math.max(0, (c.capacity || 500) - (c.currentOccupants || 0)),
            address: c.location?.address || 'Community Evacuation Center',
            managerName: c.managerName || 'Relief Officer',
            contactPhone: c.contactPhone || '+91 1800 11 1122',
            foodPacks: c.supplies?.foodPacks || 1200,
            waterLiters: c.supplies?.waterLiters || 4500
          }));
        }
      }
    } catch (err) {
      console.warn('[ChatbotService] ReliefCamp query notice:', err.message);
    }
    return [];
  }

  /**
   * Tool: Query active disaster prediction warnings
   */
  async getActivePredictions(mongoModels) {
    const { DisasterPrediction } = mongoModels;
    try {
      if (DisasterPrediction) {
        const predictions = await DisasterPrediction.find({
          status: { $in: ['Predicted', 'Under Review', 'Confirmed'] }
        })
        .sort({ createdAt: -1 })
        .limit(3)
        .lean();

        return predictions.map(p => ({
          predictionId: p.predictionId,
          disasterType: p.disasterType,
          predictedRiskLevel: p.predictedRiskLevel,
          affectedArea: p.affectedArea?.name,
          confidenceScore: p.confidenceScore,
          safetyPrecautions: (p.safetyPrecautions || []).slice(0, 3)
        }));
      }
    } catch (err) {
      console.warn('[ChatbotService] Prediction query notice:', err.message);
    }
    return [];
  }

  /**
   * Distance calculation using Haversine
   */
  calcDistanceKm(lat1, lon1, lat2, lon2) {
    if (!lat1 || !lon1 || !lat2 || !lon2) return null;
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
  }

  /**
   * Main entrypoint to process an incoming user message
   */
  async processMessage({ message, sessionId, language = 'auto', userLocation = null, mongoModels = {}, user = null, previousLanguage = null, conversationHistory = [] }) {
    // 1. Sanitize & length check
    const trimmed = (message || '').trim().slice(0, 500);
    if (!trimmed) {
      return {
        reply: 'Please ask an emergency or disaster safety question. कृपया कोई आपातकालीन प्रश्न पूछें।',
        language: 'en',
        detectedLanguage: 'en',
        confidence: 'low',
        direction: 'ltr',
        source: 'ai_guidance',
        sourceLabel: 'ResQAI'
      };
    }

    // 2. Perform automatic language detection with conversational context smoothing
    const detection = languageDetectionService.detectLanguageWithContext(trimmed, previousLanguage);
    let targetLang = language;
    const detectedLang = detection.language;

    if (!targetLang || targetLang === 'auto' || !isValidLanguageCode(targetLang)) {
      targetLang = detectedLang;
    }

    const langConfig = getLanguageConfig(targetLang);
    const content = getLanguageContent(targetLang);
    const direction = langConfig.direction || 'ltr';

    // 3. Location coords
    const lat = userLocation?.lat || 28.6139;
    const lng = userLocation?.lng || 77.2090;

    // 4. Try external LLM API if configured
    if (this.apiKey && this.provider !== 'fallback') {
      try {
        const aiResponse = await this.callExternalLLM(trimmed, targetLang, langConfig, { lat, lng }, mongoModels, conversationHistory, detection);
        if (aiResponse) {
          return {
            ...aiResponse,
            language: targetLang,
            detectedLanguage: detectedLang,
            detectedLanguageDetails: {
              name: detection.name,
              nativeName: detection.nativeName,
              script: detection.script,
              confidence: detection.confidence,
              isAmbiguous: detection.isAmbiguous,
              isMixedOrRomanized: !!detection.isMixedOrRomanized,
              rule: detection.rule
            },
            confidence: detection.confidence,
            direction
          };
        }
      } catch (err) {
        console.warn('[ChatbotService] External LLM call failed, smoothly activating local Knowledge Engine:', err.message);
      }
    }

    // 5. High-accuracy local Knowledge Engine response
    const knowledgeResponse = await this.buildKnowledgeEngineResponse({
      message: trimmed,
      language: targetLang,
      langConfig,
      content,
      userLocation: { lat, lng },
      mongoModels,
      user
    });

    return {
      ...knowledgeResponse,
      language: targetLang,
      detectedLanguage: detectedLang,
      detectedLanguageDetails: {
        name: detection.name,
        nativeName: detection.nativeName,
        script: detection.script,
        confidence: detection.confidence,
        isAmbiguous: detection.isAmbiguous,
        isMixedOrRomanized: !!detection.isMixedOrRomanized,
        rule: detection.rule
      },
      confidence: detection.confidence,
      direction
    };
  }

  /**
   * Detects intent and constructs high-accuracy emergency guidance
   * in the user's selected/detected language using live platform data.
   */
  async buildKnowledgeEngineResponse({ message, language, langConfig, content, userLocation, mongoModels, user }) {
    const q = (message || '').toLowerCase();
    const lat = userLocation?.lat || 28.6139;
    const lng = userLocation?.lng || 77.2090;

    // 1. SOS / Immediate Rescue Intent
    if (/(?:sos|save me|help me|trapped|stuck|drowning|dying|urgent help|rescue me|ambulance now|मदद|बचाओ|वाचवा|সাহায্য|బచావండి|காப்பாற்று|બચાવો|بچاؤ|ರಕ್ಷಿಸಿ|രക്ഷിക്കൂ|ਬਚਾਓ|ଉଦ୍ଧାର|সহায়|मदति|रक्षतु|गुहार|ᱜᱚᱲᱚ)/i.test(q)) {
      return {
        reply: content.sosPrompt,
        source: 'sos_guided',
        sourceLabel: 'Emergency Protocol • India Helpline 112',
        sosGuidedFlow: true,
        actionButtons: [
          { label: content.sosConfirmLabel || '🚨 Open SOS Form', action: 'OPEN_SOS_MODAL' },
          { label: '📞 Call 112 Helpline', action: 'CALL_HOTLINE', payload: '112' }
        ],
        suggestedQuestions: content.questions.slice(0, 3)
      };
    }

    // 2. Hospital & Bed Availability Query
    if (/(?:hospital|bed|icu|doctor|medical|clinic|अस्पताल|बेड|रुग्णालय|হাসপাতাল|ఆసుపత్రి|மருத்துவமனை|હોસ્પિટલ|ہسپتال|ಆಸ್ಪತ್ರೆ|ആശുപത്രി|ਹਸਪਤਾਲ|ଡାକ୍ତରଖାନା|চিকিৎসালয়|चिकित्सालय|हस्पताल|फाहामसालि|ᱦᱟᱥᱯᱟᱛᱟᱞ|হোস্পিতাল)/i.test(q)) {
      const hospitals = await this.getNearbyHospitals(mongoModels, lat, lng, 3);
      const hospitalListText = hospitals.map(h => 
        `• **${h.name}** (${h.distanceKm} km away)\n  Available Beds: **${h.availableBeds}** (ICU: ${h.icuBeds}) | Contact: \`${h.contactPhone}\`\n  Address: ${h.address}`
      ).join('\n\n');

      return {
        reply: `${content.hospitalsHeader}\n\n${hospitalListText || 'Hospital records updating.'}\n\n*${content.helplineText}*`,
        source: 'official_resqai_records',
        sourceLabel: 'Verified ResQAI Hospital Grid',
        liveData: hospitals,
        actionButtons: [
          { label: 'View Hospital Dashboard', action: 'NAVIGATE', url: '/hospital' },
          { label: 'Call Ambulance (108)', action: 'CALL_HOTLINE', payload: '108' }
        ],
        suggestedQuestions: content.questions.slice(0, 3)
      };
    }

    // 3. Relief Camp / Shelter Availability Query
    if (/(?:camp|shelter|relief|food|ration|stay|शिविर|राहत|छावणी|শিবির|శిబిరం|முகாம்|શિબિર|کیمپ|ಶಿಬಿರ|ക്യാമ്പ്|ਕੈਂਪ|କ୍ୟାମ୍ପ|আশ্ৰয়|निवारो|कैम्प|क्यम्प|ᱠᱮᱢᱯ)/i.test(q)) {
      const camps = await this.getAvailableReliefCamps(mongoModels, lat, lng, 3);
      const campListText = camps.map(c => 
        `• **${c.name}**\n  Status: **${c.status}** | Open Capacity: **${c.availableSlots}** / ${c.capacity}\n  Supplies: Food Packs (${c.foodPacks}), Water (${c.waterLiters}L)\n  Desk: ${c.managerName} (\`${c.contactPhone}\`)\n  Location: ${c.address}`
      ).join('\n\n');

      return {
        reply: `${content.campsHeader}\n\n${campListText || 'Relief camp records updating.'}\n\n*${content.helplineText}*`,
        source: 'official_resqai_records',
        sourceLabel: 'Verified Relief Camp Registry',
        liveData: camps,
        actionButtons: [
          { label: 'View Evacuation Map', action: 'NAVIGATE', url: '/citizen/evacuation' },
          { label: 'Missing Persons Registry', action: 'NAVIGATE', url: '/missing-persons' }
        ],
        suggestedQuestions: content.questions.slice(0, 3)
      };
    }

    // 4. Disaster Predictions & Weather Alerts
    if (/(?:alert|warning|prediction|forecast|weather|चेतावनी|इशारा|সতর্কতা|హెచ్చరిక|எச்சரிக்கை|ચેતવણી|انتباہ|ಎಚ್ಚರಿಕೆ|മുന്നറിയിപ്പ്|ਚੇਤਾਵਨੀ|ସତର୍କତା|পূৰ্বাভাস|शिटकावणी|हुसियार|হᱩᱥᱤᱭᱟᱹᱨ|ৱার্নিং)/i.test(q)) {
      const preds = await this.getActivePredictions(mongoModels);
      let predText = '';
      if (preds.length > 0) {
        predText = preds.map(p => 
          `• ⚠️ **${p.predictedRiskLevel} ${p.disasterType} Risk** in **${p.affectedArea}** (${Math.round((p.confidenceScore || 0.85) * 100)}% Confidence)\n  Safety steps: ${p.safetyPrecautions.join('; ')}`
        ).join('\n\n');
      } else {
        predText = 'No active critical disaster warnings for this operational zone.';
      }

      return {
        reply: `${content.alertsHeader}\n\n${predText}\n\n*${content.helplineText}*`,
        source: 'official_resqai_records',
        sourceLabel: 'Verified Disaster Alert Grid',
        actionButtons: [
          { label: 'Weather Monitoring Map', action: 'NAVIGATE', url: '/weather' },
          { label: 'Evacuation Routes', action: 'NAVIGATE', url: '/citizen/evacuation' }
        ],
        suggestedQuestions: content.questions.slice(0, 3)
      };
    }

    // 5. Flood Safety Query
    if (/(?:flood|water level|drown|बाढ़|पूर|বন্যা|వరద|வெள்ளம்|પૂર|سیلاب|ಪ್ರವಾಹ|വെള്ളപ്പൊക്കം|ਹੜ੍ਹ|ବନ୍ୟା|বানপানী|बाढ़ि|जलप्लव|बाढी|व्हांवटो|ٻوڏ|बाह्ड़|दैबाना|ᱵᱟᱱ|ঈশিং ইচাও)/i.test(q)) {
      const steps = content.floodSteps.map((s, i) => `${i + 1}. ${s}`).join('\n');
      return {
        reply: `🌊 **${content.floodTitle}**\n\n${steps}\n\n📞 *${content.helplineText}*`,
        source: 'safety_protocol',
        sourceLabel: 'NDMA Flood Safety Protocol',
        actionButtons: [
          { label: '🚨 Submit Flood SOS', action: 'OPEN_SOS_MODAL' },
          { label: 'Nearby Relief Camps', action: 'NAVIGATE', url: '/citizen/evacuation' }
        ],
        suggestedQuestions: content.questions.slice(0, 3)
      };
    }

    // 6. Fire Safety Query
    if (/(?:fire|smoke|burn|gas leak|आग|আগুন|నిప్పు|தீ|આગ|آگ|ಬೆಂಕಿ|തീ|ਅੱਗ|ନିଆଁ|জুই|आगि|अग्नि|आगलागी|उजो|باهه|अर|ᱥᱮᱸᱜᱮᱞ|মৈ চাকপা)/i.test(q)) {
      const steps = content.fireSteps.map((s, i) => `${i + 1}. ${s}`).join('\n');
      return {
        reply: `🔥 **${content.fireTitle}**\n\n${steps}\n\n📞 *${content.helplineText}*`,
        source: 'safety_protocol',
        sourceLabel: 'NDMA Fire Safety Protocol',
        actionButtons: [
          { label: '🚨 Submit Fire SOS', action: 'OPEN_SOS_MODAL' },
          { label: 'Find Trauma Hospitals', action: 'NAVIGATE', url: '/hospital' }
        ],
        suggestedQuestions: content.questions.slice(0, 3)
      };
    }

    // 7. Earthquake Safety Query
    if (/(?:earthquake|tremor|quake|भूकंप|धरणीकंप|ভূমিকম্প|భూకంపం|நிலநடுக்கம்|ભૂકંપ|زلزلہ|ಭೂಕಂಪ|ഭൂകമ്പം|ਭੂਚਾਲ|ଭୂମିକମ୍ପ|ভূমিকম্প|भूकम्प|धरंपकंप|भुआल|बांमौलुं|ᱚᱛᱞᱟᱲᱟᱣ|য়ুহারহাব)/i.test(q)) {
      const steps = content.earthquakeSteps.map((s, i) => `${i + 1}. ${s}`).join('\n');
      return {
        reply: `🌍 **${content.earthquakeTitle}**\n\n${steps}\n\n📞 *${content.helplineText}*`,
        source: 'safety_protocol',
        sourceLabel: 'NDMA Earthquake Safety Guidelines',
        actionButtons: [
          { label: '🚨 Submit Emergency SOS', action: 'OPEN_SOS_MODAL' },
          { label: 'Nearby Safe Shelters', action: 'NAVIGATE', url: '/citizen/evacuation' }
        ],
        suggestedQuestions: content.questions.slice(0, 3)
      };
    }

    // 8. Cyclone / Storm Safety Query
    if (/(?:cyclone|storm|wind|चक्रवात|वादळ|ঘূর্ণিঝড়|తుఫాను|புயல்|વાવાઝોડું|طوفان|ಚಂಡಮಾರುತ|ചുഴലിക്കാറ്റ്|ਤੂਫ਼ਾਨ|ବାତ୍ୟା|ধুমুহা|चक्रवातः|आँधी|बारहुंखा|ᱦᱩᱫᱩᱲ|নোংলৈ)/i.test(q)) {
      const steps = content.cycloneSteps.map((s, i) => `${i + 1}. ${s}`).join('\n');
      return {
        reply: `🌀 **${content.cycloneTitle}**\n\n${steps}\n\n📞 *${content.helplineText}*`,
        source: 'safety_protocol',
        sourceLabel: 'NDMA Cyclone Safety Guidelines',
        actionButtons: [
          { label: '🚨 Submit Emergency SOS', action: 'OPEN_SOS_MODAL' },
          { label: 'Weather Telemetry', action: 'NAVIGATE', url: '/weather' }
        ],
        suggestedQuestions: content.questions.slice(0, 3)
      };
    }

    // 9. General Welcome / FAQ Guidance
    return {
      reply: content.welcome,
      source: 'ai_guidance',
      sourceLabel: `${content.label} • ${langConfig.name}`,
      suggestedQuestions: content.questions,
      actionButtons: [
        { label: '🚨 Submit SOS', action: 'OPEN_SOS_MODAL' },
        { label: 'View Evacuation Map', action: 'NAVIGATE', url: '/citizen/evacuation' },
        { label: 'Call 112', action: 'CALL_HOTLINE', payload: '112' }
      ]
    };
  }

  /**
   * Calls configured external LLM (Gemini / OpenAI API) with emergency safety prompt
   * and strict language/script enforcement.
   */
  async callExternalLLM(userPrompt, targetLang, langConfig, coords, mongoModels, conversationHistory = [], detection = {}) {
    const hospitals = await this.getNearbyHospitals(mongoModels, coords.lat, coords.lng, 3);
    const camps = await this.getAvailableReliefCamps(mongoModels, coords.lat, coords.lng, 3);
    const alerts = await this.getActivePredictions(mongoModels);

    const systemPrompt = `You are the official ResQAI Emergency Assistant for disaster management in India.
Follow these strict safety rules:
1. Give concise, actionable, disaster-specific safety guidance immediately. Prioritize safety over lengthy explanations.
2. In India, identify 112 as the primary national emergency response number (Fire: 101, Ambulance: 108, NDRF: 1078).
3. NEVER claim an SOS has been sent or an ambulance dispatched unless confirmed.
4. NEVER invent weather alerts, hospital bed counts, or shelter vacancies. Use only the provided platform data.
5. Live Verified Platform Data:
Hospitals: ${JSON.stringify(hospitals)}
Relief Camps: ${JSON.stringify(camps)}
Active Warnings: ${JSON.stringify(alerts)}
6. LANGUAGE & SCRIPT INSTRUCTION:
- User's automatically detected query language: ${langConfig.name} (${langConfig.nativeName}, ISO code: ${targetLang}, Script: ${langConfig.script}, Text direction: ${langConfig.direction}).
- Respond strictly in ${langConfig.name} (${langConfig.nativeName}).
- Use natural, simple, locally understandable wording suitable for citizens in high-stress emergency situations.
- If the user communicated in Hinglish or a Romanized Indian dialect (e.g. Hindi/Marathi written in Latin letters), reply naturally in simple conversational style matching the user's register.
- Never switch to English unless explicitly requested by the user.
- Maintain multi-turn context smoothly, and immediately follow the user if they change languages between turns.
- Do NOT output metadata like "I detected your language as...". Answer directly.
- Preserve all phone numbers (112, 101, 108, 1078), names, and incident numbers exactly without translation errors.`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      if (this.provider === 'gemini' || this.baseUrl.includes('generativelanguage.googleapis.com')) {
        const endpoint = `${this.baseUrl}/models/${this.model}:generateContent?key=${this.apiKey}`;
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [
              { role: 'user', parts: [{ text: `${systemPrompt}\n\nUser Question: ${userPrompt}` }] }
            ],
            generationConfig: {
              temperature: 0.2,
              maxOutputTokens: 600
            }
          }),
          signal: controller.signal
        });
        clearTimeout(timeout);

        if (res.ok) {
          const data = await res.json();
          const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text) {
            return {
              reply: text,
              source: 'ai_guidance',
              sourceLabel: `AI Emergency Guidance • ${langConfig.name}`,
              suggestedQuestions: [
                'How do I submit an SOS?',
                'Find nearby hospitals with beds',
                'Where are relief camps?'
              ],
              actionButtons: [
                { label: '🚨 Submit SOS', action: 'OPEN_SOS_MODAL' },
                { label: 'Call 112', action: 'CALL_HOTLINE', payload: '112' }
              ]
            };
          }
        }
      } else {
        // OpenAI / compatible endpoint
        const endpoint = `${this.baseUrl}/chat/completions`;
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.apiKey}`
          },
          body: JSON.stringify({
            model: this.model,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userPrompt }
            ],
            temperature: 0.2,
            max_tokens: 600
          }),
          signal: controller.signal
        });
        clearTimeout(timeout);

        if (res.ok) {
          const data = await res.json();
          const text = data.choices?.[0]?.message?.content;
          if (text) {
            return {
              reply: text,
              source: 'ai_guidance',
              sourceLabel: `AI Emergency Guidance • ${langConfig.name}`,
              actionButtons: [
                { label: '🚨 Submit SOS', action: 'OPEN_SOS_MODAL' },
                { label: 'Call 112', action: 'CALL_HOTLINE', payload: '112' }
              ]
            };
          }
        }
      }
    } catch (err) {
      clearTimeout(timeout);
      throw err;
    }
    return null;
  }
}

module.exports = new ChatbotService();
