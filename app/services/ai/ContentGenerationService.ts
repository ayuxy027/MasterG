/**
 * EduLite Mobile AI - Content Generation Service
 * Generates educational content using Gemma 3n model
 */

import {
  ContentGenerationParams,
  GeneratedContent,
  GradeLevel,
} from "../../types/ai.types"
import {
  getComplexityGuidanceForGrade,
  getGradeConfig,
  getSubjectConfig,
} from "./CBSECurriculumConfig"
import {
  CONTENT_GENERATION_CONFIG,
  CURRICULUM_INFO,
  SUPPORTED_LANGUAGES,
} from "./constants"
import ModelManager from "./ModelManager"
import TranslationService from "./TranslationService"

class ContentGenerationService {
  private static instance: ContentGenerationService
  private modelManager: ModelManager
  private translationService: TranslationService

  private constructor() {
    this.modelManager = ModelManager.getInstance()
    this.translationService = TranslationService.getInstance()
  }

  static getInstance(): ContentGenerationService {
    if (!ContentGenerationService.instance) {
      ContentGenerationService.instance = new ContentGenerationService()
    }
    return ContentGenerationService.instance
  }

  /**
   * Generate educational content based on parameters
   */
  async generateContent(
    params: ContentGenerationParams
  ): Promise<GeneratedContent> {
    const startTime = Date.now()

    // Check if we need the Hindi model for Indian languages
    const isIndicLanguage = this.isIndicLanguage(params.language)

    if (isIndicLanguage) {
      // Use Sarvam-1 translation workflow (generate in English, then translate)
      if (
        this.translationService.isTranslationReady() &&
        params.language !== "english"
      ) {
        console.log("🌐 Using Sarvam-1 translation workflow")
        return this.generateWithTranslation(params, startTime)
      } else {
        // If translation model not ready, generate in English
        console.log("⚠️ Translation model not loaded, generating in English")
      }
    }

    // Use English/Text model (Gemma)
    if (!this.modelManager.isReady()) {
      throw new Error(
        "Text model not initialized. Please load the model first."
      )
    }

    const textModel = this.modelManager.getTextModel()
    if (!textModel) {
      throw new Error("Text model not available.")
    }

    console.log("📝 Generating educational content (English model)...")
    console.log("  ├── Topic:", params.topic)
    console.log("  ├── Subject:", params.subject)
    console.log("  ├── Grade:", params.grade)
    console.log("  └── Language:", params.language)

    try {
      const prompt = this.buildEducationalPrompt(params)

      const result = await textModel.completion(
        {
          prompt: prompt,
          n_predict: params.maxLength || CONTENT_GENERATION_CONFIG.maxTokens,
          temperature: CONTENT_GENERATION_CONFIG.temperature,
          top_p: CONTENT_GENERATION_CONFIG.topP,
          top_k: CONTENT_GENERATION_CONFIG.topK,
          stop: CONTENT_GENERATION_CONFIG.stopSequences,
        },
        () => { }
      )

      const processingTime = Date.now() - startTime
      let generatedText = result.text.trim()

      // Validate and ensure content is complete (prevent cutoffs)
      generatedText = this.validateAndCompleteContent(generatedText, params.topic)

      const content = this.parseGeneratedContent(
        generatedText,
        params,
        processingTime
      )

      console.log("✅ Content generated in", processingTime, "ms")
      console.log("  └── Word count:", content.wordCount)

      return content
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error"
      console.error("❌ Content generation failed:", errorMessage)
      throw new Error("Content generation failed: " + errorMessage)
    }
  }

  /**
   * Generate content in English, then translate to target Indic language using Sarvam-1
   * RECOMMENDED: Uses state-of-the-art translation for better accuracy
   */
  private async generateWithTranslation(
    params: ContentGenerationParams,
    startTime: number
  ): Promise<GeneratedContent> {
    console.log("🎯 Generating content with Sarvam-1 translation...")
    console.log("  ├── Step 1: Generate in English")
    console.log("  └── Step 2: Translate to", params.language)

    if (!this.modelManager.isReady()) {
      throw new Error("Text model not initialized.")
    }

    const textModel = this.modelManager.getTextModel()
    if (!textModel) {
      throw new Error("Text model not available.")
    }

    try {
      // Step 1: Generate content in English (high quality)
      const englishParams = { ...params, language: "english" as any }
      const prompt = this.buildEducationalPrompt(englishParams)

      console.log("📝 Generating English content...")
      const result = await textModel.completion(
        {
          prompt: prompt,
          n_predict: params.maxLength || CONTENT_GENERATION_CONFIG.maxTokens,
          temperature: CONTENT_GENERATION_CONFIG.temperature,
          top_p: CONTENT_GENERATION_CONFIG.topP,
          top_k: CONTENT_GENERATION_CONFIG.topK,
          stop: CONTENT_GENERATION_CONFIG.stopSequences,
        },
        () => { }
      )

      const englishText = result.text.trim()
      console.log("✅ English content generated")
      console.log("  └── Length:", englishText.length, "chars")

      // Step 2: Translate to target language using Sarvam-1
      console.log("🌐 Translating to", params.language, "...")
      const translationResult = await this.translationService.translate({
        text: englishText,
        sourceLanguage: "english",
        targetLanguage: params.language,
        context: "educational",
      })

      const processingTime = Date.now() - startTime
      const translatedContent = this.parseGeneratedContent(
        translationResult.translatedText,
        params,
        processingTime
      )

      // Add translation metadata
      translatedContent.confidence = Math.min(
        translatedContent.confidence,
        translationResult.confidence
      )

      console.log("✅ Translation completed")
      console.log("  ├── Total time:", processingTime, "ms")
      console.log("  ├── Translation confidence:", translationResult.confidence)
      console.log("  └── Word count:", translatedContent.wordCount)

      return translatedContent
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error"
      console.error("❌ Translation workflow failed:", errorMessage)
      throw new Error(
        "Content generation with translation failed: " + errorMessage
      )
    }
  }

  /**
   * Check if language is an Indian/Indic language
   */
  private isIndicLanguage(language: string): boolean {
    const indicLanguages = [
      "hindi",
      "bengali",
      "tamil",
      "telugu",
      "kannada",
      "malayalam",
      "marathi",
      "gujarati",
      "punjabi",
      "odia",
    ]
    return indicLanguages.includes(language.toLowerCase())
  }

  // NOTE: generateWithHindiModel was removed - Navarasa model replaced by Sarvam-1
  // All Indic language content is now generated in English and translated using Sarvam-1

  /**
   * Remove repeated sentences from generated text
   */
  private removeRepetition(text: string): string {
    // Split by sentence-ending punctuation (including Devanagari danda)
    const sentences = text.split(/(?<=[।.!?])\s*/)
    const seen = new Set<string>()
    const uniqueSentences: string[] = []

    for (const sentence of sentences) {
      const normalized = sentence.trim().toLowerCase()
      // Only keep if we haven't seen this sentence before
      if (normalized.length > 10 && !seen.has(normalized)) {
        seen.add(normalized)
        uniqueSentences.push(sentence.trim())
      } else if (normalized.length <= 10) {
        // Keep short fragments
        uniqueSentences.push(sentence.trim())
      }
    }

    return uniqueSentences.join(" ")
  }

  /**
   * Validate and complete content to prevent cutoffs
   * Ensures content has proper structure and conclusion
   */
  private validateAndCompleteContent(content: string, topic: string): string {
    let validatedContent = content.trim()

    // Remove any incomplete sentences at the end (likely cutoffs)
    const lastPunctuation = Math.max(
      validatedContent.lastIndexOf('.'),
      validatedContent.lastIndexOf('!'),
      validatedContent.lastIndexOf('?'),
      validatedContent.lastIndexOf('।') // Devanagari danda
    )

    if (lastPunctuation > 0 && lastPunctuation < validatedContent.length - 1) {
      // There's content after the last punctuation - likely incomplete
      validatedContent = validatedContent.substring(0, lastPunctuation + 1)
      console.log("⚠️ Trimmed incomplete sentence at end")
    }

    // Check if content has a conclusion section
    const hasConclusion = validatedContent.includes('✅ CONCLUSION') ||
      validatedContent.includes('Conclusion') ||
      validatedContent.includes('In conclusion') ||
      validatedContent.includes('To summarize') ||
      validatedContent.includes('In summary')

    // If no conclusion section and content is substantial, add one
    if (!hasConclusion && validatedContent.length > 200) {
      // Generate a simple conclusion based on the topic
      const conclusion = `\n\n✅ CONCLUSION:\nThis covers the essential aspects of ${topic}. Understanding these concepts will help students build a strong foundation for further learning.`
      validatedContent += conclusion
      console.log("📝 Added missing conclusion section")
    }

    return validatedContent
  }

  /**
   * Build prompt optimized for Navarasa model (all Indic languages)
   * Uses structured format to prevent repetition and ensure quality
   */
  private buildHindiPrompt(params: ContentGenerationParams): string {
    const languageInfo =
      SUPPORTED_LANGUAGES[params.language] || SUPPORTED_LANGUAGES["hindi"]
    const gradeConfig = getGradeConfig(params.grade)
    const subjectConfig = getSubjectConfig(params.subject)
    const complexityGuidance = getComplexityGuidanceForGrade(
      params.grade,
      "hindi"
    )
    const languageInstruction = this.getIndicPromptInstruction(
      params.language,
      params.subject
    )

    // Get subject-specific prompt structure
    const subjectPromptHints = this.getSubjectSpecificHints(
      subjectConfig.category,
      params.language
    )

    // Build CBSE-optimized structured prompt
    // Use target language for the entire prompt to ensure correct language output
    const langPrompt = this.buildLanguageSpecificPrompt(
      params,
      languageInfo,
      gradeConfig,
      subjectConfig,
      subjectPromptHints,
      complexityGuidance
    )
    return langPrompt
  }

  /**
   * Build prompt in the target language to ensure correct language output
   */
  private buildLanguageSpecificPrompt(
    params: ContentGenerationParams,
    languageInfo: { code: string; script: string; name: string },
    gradeConfig: { maxWords: number; level: string },
    subjectConfig: { category: string },
    subjectHints: string,
    complexityGuidance: string
  ): string {
    const lang = params.language

    // Language-specific prompt templates
    const prompts: Record<string, string> = {
      marathi: `तुम्ही एक अनुभवी CBSE शिक्षक आहात.

विषय: ${params.topic}
विषय क्षेत्र: ${params.subject}
इयत्ता: ${params.grade}

महत्त्वाचे: संपूर्ण उत्तर मराठीत लिहा. हिंदी किंवा इंग्रजी वापरू नका.

${subjectHints}

सूचना:
• फक्त मराठीत लिहा
• ${gradeConfig.maxWords} शब्दांपर्यंत
• प्रत्येक वाक्य नवीन माहिती द्या
• पुनरावृत्ती टाळा

"${params.topic}" बद्दल मराठीत शैक्षणिक सामग्री:

`,
      hindi: `आप एक अनुभवी CBSE शिक्षक हैं।

विषय: ${params.topic}
विषय क्षेत्र: ${params.subject}
कक्षा: ${params.grade}

महत्वपूर्ण: पूरा उत्तर हिंदी में लिखें।

${subjectHints}

सूचना:
• केवल हिंदी में लिखें
• ${gradeConfig.maxWords} शब्दों तक
• प्रत्येक वाक्य नई जानकारी दे
• दोहराव से बचें

"${params.topic}" के बारे में हिंदी में शैक्षिक सामग्री:

`,
      bengali: `আপনি একজন অভিজ্ঞ CBSE শিক্ষক।

বিষয়: ${params.topic}
বিষয় ক্ষেত্র: ${params.subject}
শ্রেণী: ${params.grade}

গুরুত্বপূর্ণ: সম্পূর্ণ উত্তর বাংলায় লিখুন। হিন্দি বা ইংরেজি ব্যবহার করবেন না।

${subjectHints}

নির্দেশনা:
• শুধুমাত্র বাংলায় লিখুন
• ${gradeConfig.maxWords} শব্দ পর্যন্ত
• প্রতিটি বাক্য নতুন তথ্য দিন
• পুনরাবৃত্তি এড়িয়ে চলুন

"${params.topic}" সম্পর্কে বাংলায় শিক্ষামূলক বিষয়বস্তু:

`,
      tamil: `நீங்கள் ஒரு அனுபவமுள்ள CBSE ஆசிரியர்.

தலைப்பு: ${params.topic}
பாடம்: ${params.subject}
வகுப்பு: ${params.grade}

முக்கியம்: முழு பதிலையும் தமிழில் எழுதுங்கள். ஹிந்தி அல்லது ஆங்கிலம் பயன்படுத்த வேண்டாம்.

${subjectHints}

வழிமுறைகள்:
• தமிழில் மட்டுமே எழுதுங்கள்
• ${gradeConfig.maxWords} வார்த்தைகள் வரை
• ஒவ்வொரு வாக்கியமும் புதிய தகவலை வழங்கவும்
• மீண்டும் மீண்டும் தவிர்க்கவும்

"${params.topic}" பற்றி தமிழில் கல்வி உள்ளடக்கம்:

`,
      telugu: `మీరు ఒక అనుభవజ్ఞుడైన CBSE ఉపాధ్యాయుడు.

అంశం: ${params.topic}
విషయం: ${params.subject}
తరగతి: ${params.grade}

ముఖ్యం: మొత్తం సమాధానం తెలుగులో రాయండి. హిందీ లేదా ఇంగ్లీషు వాడకండి.

${subjectHints}

సూచనలు:
• తెలుగులో మాత్రమే రాయండి
• ${gradeConfig.maxWords} పదాల వరకు
• ప్రతి వాక్యం కొత్త సమాచారం ఇవ్వాలి
• పునరావృతం చేయకండి

"${params.topic}" గురించి తెలుగులో విద్యా విషయం:

`,
      kannada: `ನೀವು ಒಬ್ಬ ಅನುಭವಿ CBSE ಶಿಕ್ಷಕ.

ವಿಷಯ: ${params.topic}
ವಿಷಯ ಕ್ಷೇತ್ರ: ${params.subject}
ತರಗತಿ: ${params.grade}

ಮುಖ್ಯ: ಸಂಪೂರ್ಣ ಉತ್ತರವನ್ನು ಕನ್ನಡದಲ್ಲಿ ಬರೆಯಿರಿ. ಹಿಂದಿ ಅಥವಾ ಇಂಗ್ಲಿಷ್ ಬಳಸಬೇಡಿ.

${subjectHints}

ಸೂಚನೆಗಳು:
• ಕನ್ನಡದಲ್ಲಿ ಮಾತ್ರ ಬರೆಯಿರಿ
• ${gradeConfig.maxWords} ಪದಗಳವರೆಗೆ
• ಪ್ರತಿ ವಾಕ್ಯವು ಹೊಸ ಮಾಹಿತಿ ನೀಡಬೇಕು
• ಪುನರಾವರ್ತನೆ ತಪ್ಪಿಸಿ

"${params.topic}" ಬಗ್ಗೆ ಕನ್ನಡದಲ್ಲಿ ಶೈಕ್ಷಣಿಕ ವಿಷಯ:

`,
      malayalam: `നിങ്ങൾ ഒരു പരിചയസമ്പന്നനായ CBSE അധ്യാപകനാണ്.

വിഷയം: ${params.topic}
വിഷയ മേഖല: ${params.subject}
ക്ലാസ്: ${params.grade}

പ്രധానം: മുഴുവൻ ഉത്തരവും മലയാളത്തിൽ എഴുതുക. ഹിന്ദി അല്ലെങ്കിൽ ഇംഗ്ലീഷ് ഉപയോഗിക്കരുത്.

${subjectHints}

നിർദ്ദേശങ്ങൾ:
• മലയാളത്തിൽ മാത്രം എഴുതുക
• ${gradeConfig.maxWords} വാക്കുകൾ വരെ
• ഓരോ വാക്യവും പുതിയ വിവരം നൽകണം
• ആവർത്തനം ഒഴിവാക്കുക

"${params.topic}" കുറിച്ച് മലയാളത്തിൽ വിദ്യാഭ്യാസ ഉള്ളടക്കം:

`,
      gujarati: `તમે એક અનુભવી CBSE શિક્ષક છો.

વિષય: ${params.topic}
વિષય ક્ષેत્ર: ${params.subject}
ધોરણ: ${params.grade}

મહત્વપૂર્ણ: સંપૂર્ણ જવાબ ગુજરાતીમાં લખો. હિન્દી અથવા અંગ્રેજીનો ઉપયોગ કરશો નહીં.

${subjectHints}

સૂચનાઓ:
• ફક્ત ગુજરાતીમાં લખો
• ${gradeConfig.maxWords} શબ્દો સુધી
• દરેક વાક્ય નવી માહિતી આપે
• પુનરાવર્તન ટાળો

"${params.topic}" વિશે ગુજરાતીમાં શૈક્ષણિક સામગ્રી:

`,
      punjabi: `ਤੁਸੀਂ ਇੱਕ ਤਜਰਬੇਕਾਰ CBSE ਅਧਿਆਪਕ ਹੋ।

ਵਿਸ਼ਾ: ${params.topic}
ਵਿਸ਼ਾ ਖੇਤਰ: ${params.subject}
ਜਮਾਤ: ${params.grade}

ਮਹੱਤਵਪੂਰਨ: ਪੂਰਾ ਜਵਾਬ ਪੰਜਾਬੀ ਵਿੱਚ ਲਿਖੋ। ਹਿੰਦੀ ਜਾਂ ਅੰਗਰੇਜ਼ੀ ਨਾ ਵਰਤੋ।

${subjectHints}

ਹਦਾਇਤਾਂ:
• ਸਿਰਫ਼ ਪੰਜਾਬੀ ਵਿੱਚ ਲਿਖੋ
• ${gradeConfig.maxWords} ਸ਼ਬਦਾਂ ਤੱਕ
• ਹਰ ਵਾਕ ਨਵੀਂ ਜਾਣਕਾਰੀ ਦੇਵੇ
• ਦੁਹਰਾਓ ਤੋਂ ਬਚੋ

"${params.topic}" ਬਾਰੇ ਪੰਜਾਬੀ ਵਿੱਚ ਵਿਦਿਅਕ ਸਮੱਗਰੀ:

`,
      odia: `ଆପଣ ଜଣେ ଅଭିଜ୍ଞ CBSE ଶିକ୍ଷକ।

ବିଷୟ: ${params.topic}
ବିଷୟ କ୍ଷେତ୍ର: ${params.subject}
ଶ୍ରେଣୀ: ${params.grade}

ଗୁରୁତ୍ୱପୂର୍ଣ୍ଣ: ସମ୍ପୂର୍ଣ୍ଣ ଉତ୍ତର ଓଡ଼ିଆରେ ଲେଖନ୍ତୁ। ହିନ୍ଦୀ କିମ୍ବା ଇଂରାଜୀ ବ୍ୟବହାର କରନ୍ତୁ ନାହିଁ।

${subjectHints}

ନିର୍ଦ୍ଦେଶନା:
• କେବଳ ଓଡ଼ିଆରେ ଲେଖନ୍ତୁ
• ${gradeConfig.maxWords} ଶବ୍ଦ ପର୍ଯ୍ୟନ୍ତ
• ପ୍ରତ୍ୟେକ ବାକ୍ୟ ନୂଆ ସୂଚନା ଦିଅନ୍ତୁ
• ପୁନରାବୃତ୍ତି ଏଡ଼ାନ୍ତୁ

"${params.topic}" ବିଷୟରେ ଓଡ଼ିଆରେ ଶିକ୍ଷାମୂଳକ ସାମଗ୍ରୀ:

`,
    }

    return prompts[lang] || prompts["hindi"]
  }

  /**
   * Get subject-specific hints for prompt in the TARGET language
   */
  private getSubjectSpecificHints(category: string, language: string): string {
    // Science hints in all languages
    const scienceHints: Record<string, string> = {
      hindi:
        "• पहले परिभाषा दें\n• प्रक्रिया चरणबद्ध समझाएं\n• भारतीय उदाहरण दें",
      marathi:
        "• प्रथम व्याख्या द्या\n• प्रक्रिया टप्प्याटप्प्याने समजावून सांगा\n• भारतीय उदाहरण द्या",
      bengali:
        "• প্রথমে সংজ্ঞা দিন\n• প্রক্রিয়া ধাপে ধাপে ব্যাখ্যা করুন\n• ভারতীয় উদাহরণ দিন",
      tamil:
        "• முதலில் வரையறை கொடுங்கள்\n• செயல்முறையை படிப்படியாக விளக்குங்கள்\n• இந்திய உதாரணங்கள் கொடுங்கள்",
      telugu:
        "• మొదట నిర్వచనం ఇవ్వండి\n• ప్రక్రియను దశలవారీగా వివరించండి\n• భారతీయ ఉదాహరణలు ఇవ్వండి",
      kannada:
        "• ಮೊದಲು ವ್ಯಾಖ್ಯಾನ ನೀಡಿ\n• ಪ್ರಕ್ರಿಯೆಯನ್ನು ಹಂತಹಂತವಾಗಿ ವಿವರಿಸಿ\n• ಭಾರತೀಯ ಉದಾಹರಣೆಗಳನ್ನು ನೀಡಿ",
      malayalam:
        "• ആദ്യം നിർവചനം നൽകുക\n• പ്രക്രിയ ഘട്ടം ഘട്ടമായി വിശദീകരിക്കുക\n• ഇന്ത്യൻ ഉദാഹരണങ്ങൾ നൽകുക",
      gujarati:
        "• પહેલા વ્યાખ્યા આપો\n• પ્રક્રિયા ક્રમશઃ સમજાવો\n• ભારતીય ઉદાહરણ આપો",
      punjabi:
        "• ਪਹਿਲਾਂ ਪਰਿਭਾਸ਼ਾ ਦਿਓ\n• ਪ੍ਰਕਿਰਿਆ ਕਦਮ-ਦਰ-ਕਦਮ ਸਮਝਾਓ\n• ਭਾਰਤੀ ਉਦਾਹਰਣ ਦਿਓ",
      odia: "• ପ୍ରଥମେ ସଂଜ୍ଞା ଦିଅନ୍ତୁ\n• ପ୍ରକ୍ରିୟା ପର୍ଯ୍ୟାୟକ୍ରମେ ବୁଝାନ୍ତୁ\n• ଭାରତୀୟ ଉଦାହରଣ ଦିଅନ୍ତୁ",
      english:
        "• Start with definition\n• Explain process step-by-step\n• Give Indian examples",
    }

    const mathHints: Record<string, string> = {
      hindi: "• सूत्र स्पष्ट लिखें\n• हल करने के चरण दें\n• एक उदाहरण हल करें",
      marathi:
        "• सूत्र स्पष्टपणे लिहा\n• सोडवण्याचे टप्पे द्या\n• एक उदाहरण सोडवा",
      english:
        "• Write formula clearly\n• Show solving steps\n• Solve one example",
    }

    const socialHints: Record<string, string> = {
      hindi:
        "• ऐतिहासिक पृष्ठभूमि दें\n• महत्वपूर्ण तिथियां बताएं\n• भारत से जोड़ें",
      marathi:
        "• ऐतिहासिक पार्श्वभूमी द्या\n• महत्त्वाच्या तारखा सांगा\n• भारताशी जोडा",
      english:
        "• Give historical context\n• Mention important dates\n• Connect to India",
    }

    // Select hints based on category
    let categoryHints: Record<string, string>
    switch (category) {
      case "science":
        categoryHints = scienceHints
        break
      case "mathematics":
        categoryHints = mathHints
        break
      case "social":
        categoryHints = socialHints
        break
      default:
        categoryHints = scienceHints
    }

    // Return hint in target language, fallback to Hindi
    return (
      categoryHints[language] ||
      categoryHints["hindi"] ||
      categoryHints["english"]
    )
  }

  /**
   * Get language-specific prompt instruction for Indic languages
   * Enhanced with subject awareness for CBSE curriculum
   */
  private getIndicPromptInstruction(language: string, subject: string): string {
    const subjectConfig = getSubjectConfig(subject)
    const subjectType = subjectConfig.category

    const instructions: Record<string, Record<string, string>> = {
      hindi: {
        science:
          "आप एक अनुभवी CBSE विज्ञान शिक्षक हैं। वैज्ञानिक अवधारणा स्पष्ट रूप से समझाइए।",
        mathematics:
          "आप एक CBSE गणित शिक्षक हैं। गणितीय अवधारणा और सूत्र समझाइए।",
        social:
          "आप एक CBSE सामाजिक विज्ञान शिक्षक हैं। ऐतिहासिक/भौगोलिक जानकारी दीजिए।",
        language: "आप एक भाषा शिक्षक हैं। व्याकरण और प्रयोग समझाइए।",
        arts: "आप एक शिक्षक हैं। इस विषय को रोचक तरीके से समझाइए।",
      },
      marathi: {
        science:
          "तुम्ही एक अनुभवी CBSE विज्ञान शिक्षक आहात. वैज्ञानिक संकल्पना स्पष्टपणे समजावून सांगा.",
        mathematics:
          "तुम्ही एक CBSE गणित शिक्षक आहात. गणितीय संकल्पना आणि सूत्र समजावून सांगा.",
        social:
          "तुम्ही एक CBSE सामाजिक शास्त्र शिक्षक आहात. ऐतिहासिक/भौगोलिक माहिती द्या.",
        language: "तुम्ही एक भाषा शिक्षक आहात. व्याकरण आणि वापर समजावून सांगा.",
        arts: "तुम्ही एक शिक्षक आहात. हा विषय रोचक पद्धतीने समजावून सांगा.",
      },
      bengali: {
        science:
          "আপনি একজন অভিজ্ঞ CBSE বিজ্ঞান শিক্ষক। বৈজ্ঞানিক ধারণা স্পষ্টভাবে ব্যাখ্যা করুন।",
        mathematics:
          "আপনি একজন CBSE গণিত শিক্ষক। গাণিতিক ধারণা এবং সূত্র ব্যাখ্যা করুন।",
        social: "আপনি একজন CBSE সমাজবিজ্ঞান শিক্ষক। ঐতিহাসিক/ভৌগোলিক তথ্য দিন।",
        language: "আপনি একজন ভাষা শিক্ষক। ব্যাকরণ এবং ব্যবহার ব্যাখ্যা করুন।",
        arts: "আপনি একজন শিক্ষক। এই বিষয়টি আকর্ষণীয়ভাবে ব্যাখ্যা করুন।",
      },
      tamil: {
        science:
          "நீங்கள் ஒரு அனுபவமுள்ள CBSE அறிவியல் ஆசிரியர். அறிவியல் கருத்தை தெளிவாக விளக்குங்கள்.",
        mathematics:
          "நீங்கள் ஒரு CBSE கணித ஆசிரியர். கணித கருத்து மற்றும் சூத்திரத்தை விளக்குங்கள்.",
        social:
          "நீங்கள் ஒரு CBSE சமூக அறிவியல் ஆசிரியர். வரலாற்று/புவியியல் தகவல்களை வழங்குங்கள்.",
        language:
          "நீங்கள் ஒரு மொழி ஆசிரியர். இலக்கணம் மற்றும் பயன்பாட்டை விளக்குங்கள்.",
        arts: "நீங்கள் ஒரு ஆசிரியர். இந்த தலைப்பை சுவாரஸ்யமாக விளக்குங்கள்.",
      },
      telugu: {
        science:
          "మీరు ఒక అనుభవజ్ఞుడైన CBSE సైన్స్ టీచర్. శాస్త్రీయ భావనను స్పష్టంగా వివరించండి.",
        mathematics:
          "మీరు ఒక CBSE మ్యాథ్స్ టీచర్. గణిత భావన మరియు సూత్రాన్ని వివరించండి.",
        social:
          "మీరు ఒక CBSE సోషల్ సైన్స్ టీచర్. చారిత్రక/భౌగోళిక సమాచారం ఇవ్వండి.",
        language:
          "మీరు ఒక భాషా ఉపాధ్యాయుడు. వ్యాకరణం మరియు వాడకాన్ని వివరించండి.",
        arts: "మీరు ఒక ఉపాధ్యాయుడు. ఈ అంశాన్ని ఆసక్తికరంగా వివరించండి.",
      },
    }

    // Default to Hindi structure for other languages
    const langInstructions = instructions[language] || instructions["hindi"]
    return langInstructions[subjectType] || langInstructions.science
  }
  /**
   * Build the educational prompt for content generation
   * OPTIMIZED: Uses structured format to prevent cutoffs and ensure complete responses
   * Format: Introduction → Bullet Points → Conclusion
   */
  private buildEducationalPrompt(params: ContentGenerationParams): string {
    const languageInfo = SUPPORTED_LANGUAGES[params.language]
    const curriculumInfo = CURRICULUM_INFO[params.curriculum]
    const complexityGuidance = this.getComplexityGuidance(params.grade)

    // Calculate optimal word limit based on grade
    const gradeNum = parseInt(params.grade)
    let wordLimit = 200 // Default
    if (gradeNum <= 5) wordLimit = 150
    else if (gradeNum <= 8) wordLimit = 180
    else if (gradeNum <= 10) wordLimit = 200
    else wordLimit = 250

    // Build structured prompt with explicit format requirements
    const prompt = `You are an expert CBSE educational assistant. Generate structured educational content.

TOPIC: ${params.topic}
SUBJECT: ${params.subject}
GRADE: ${params.grade}
LANGUAGE: ${languageInfo.name}

REQUIRED FORMAT (FOLLOW EXACTLY):
1. 🎯 INTRODUCTION: Write a brief 1-2 sentence introduction explaining the topic
2. 📋 MAIN CONTENT: Provide detailed explanation in bullet points (use • symbol)
3. ✅ CONCLUSION: Write a 1-2 sentence conclusion summarizing key points

CONTENT RULES:
- Complexity Level: ${complexityGuidance}
- Use grade-appropriate language suitable for Grade ${params.grade} students
- Include relevant Indian examples where applicable
- Keep response under ${wordLimit} words
- IMPORTANT: You MUST end with a proper ✅ CONCLUSION section
- Do NOT start generating questions or further prompts

Now provide the structured educational content about "${params.topic}":

🎯 INTRODUCTION:
`
    return prompt
  }

  /**
   * Get language-specific prefix to prime the model
   */
  private getLanguagePrefix(language: string): string {
    const prefixes: Record<string, string> = {
      hindi: "निम्नलिखित शैक्षिक सामग्री हिंदी में लिखें।",
      bengali: "নিম্নলিখিত শিক্ষামূলক বিষয়বস্তু বাংলায় লিখুন।",
      tamil: "பின்வரும் கல்வி உள்ளடக்கத்தை தமிழில் எழுதுங்கள்.",
      telugu: "కింది విద్యా కంటెంట్ తెలుగులో రాయండి.",
      kannada: "ಕೆಳಗಿನ ಶೈಕ್ಷಣಿಕ ವಿಷಯವನ್ನು ಕನ್ನಡದಲ್ಲಿ ಬರೆಯಿರಿ.",
      malayalam: "താഴെ പറയുന്ന വിദ്യാഭ്യാസ ഉള്ളടക്കം മലയാളത്തിൽ എഴുതുക.",
      marathi: "खालील शैक्षणिक सामग्री मराठीत लिहा.",
      gujarati: "નીચેની શૈક્ષણિક સામગ્રી ગુજરાતીમાં લખો.",
      punjabi: "ਹੇਠਾਂ ਦਿੱਤੀ ਵਿਦਿਅਕ ਸਮੱਗਰੀ ਪੰਜਾਬੀ ਵਿੱਚ ਲਿਖੋ।",
      odia: "ନିମ୍ନଲିଖିତ ଶିକ୍ଷାମୂଳକ ବିଷୟବସ୍ତୁ ଓଡ଼ିଆରେ ଲେଖନ୍ତୁ।",
      english: "Write the following educational content in English.",
    }
    return prefixes[language] || prefixes["english"]
  }

  /**
   * Get complexity guidance based on grade level
   */
  private getComplexityGuidance(grade: GradeLevel): string {
    const gradeNum = parseInt(grade)

    if (gradeNum <= 3) {
      return "Use very simple words, short sentences, lots of examples and stories"
    } else if (gradeNum <= 5) {
      return "Use simple language, include fun facts and relatable examples"
    } else if (gradeNum <= 8) {
      return "Use clear explanations, introduce technical terms with definitions"
    } else if (gradeNum <= 10) {
      return "Use proper terminology, include detailed explanations and applications"
    } else {
      return "Use advanced vocabulary, include complex concepts and analytical thinking"
    }
  }

  /**
   * Parse and structure the generated content
   */
  private parseGeneratedContent(
    text: string,
    params: ContentGenerationParams,
    processingTime: number
  ): GeneratedContent {
    const wordCount = text.split(/\s+/).filter((word) => word.length > 0).length
    const estimatedReadTime = Math.ceil(wordCount / 200) // 200 words per minute

    // Generate a title from the topic
    const title = this.generateTitle(params.topic, params.subject)

    return {
      id: this.generateId(),
      title: title,
      content: text,
      language: params.language,
      grade: params.grade,
      subject: params.subject,
      topic: params.topic,
      wordCount: wordCount,
      estimatedReadTime: estimatedReadTime,
      confidence: 0.9,
      createdAt: new Date().toISOString(),
    }
  }

  /**
   * Generate a content ID
   */
  private generateId(): string {
    return (
      "content_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9)
    )
  }

  /**
   * Generate a title for the content
   */
  private generateTitle(topic: string, subject: string): string {
    return (
      topic.charAt(0).toUpperCase() +
      topic.slice(1) +
      " - " +
      subject.charAt(0).toUpperCase() +
      subject.slice(1)
    )
  }

  /**
   * Generate content with streaming callback
   */
  async generateContentStreaming(
    params: ContentGenerationParams,
    onToken: (token: string) => void
  ): Promise<GeneratedContent> {
    const startTime = Date.now()

    if (!this.modelManager.isReady()) {
      throw new Error("Text model not initialized.")
    }

    const textModel = this.modelManager.getTextModel()
    if (!textModel) {
      throw new Error("Text model not available.")
    }

    const prompt = this.buildEducationalPrompt(params)
    let fullText = ""

    const result = await textModel.completion(
      {
        prompt: prompt,
        n_predict: params.maxLength || CONTENT_GENERATION_CONFIG.maxTokens,
        temperature: CONTENT_GENERATION_CONFIG.temperature,
        top_p: CONTENT_GENERATION_CONFIG.topP,
        top_k: CONTENT_GENERATION_CONFIG.topK,
        stop: CONTENT_GENERATION_CONFIG.stopSequences,
      },
      (data) => {
        if (data.token) {
          fullText += data.token
          onToken(data.token)
        }
      }
    )

    const processingTime = Date.now() - startTime
    return this.parseGeneratedContent(
      result.text.trim(),
      params,
      processingTime
    )
  }
}

export default ContentGenerationService
