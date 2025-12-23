/**
 * CBSE Curriculum Configuration
 * Optimized prompts and settings for Grades 1-12, all subjects
 */

import { SupportedLanguage } from '../../types/ai.types';

// ============================================
// Grade Level Configurations
// ============================================

export interface GradeConfig {
    level: 'primary' | 'middle' | 'secondary' | 'senior';
    vocabulary: 'basic' | 'intermediate' | 'advanced' | 'technical';
    sentenceLength: 'short' | 'medium' | 'long';
    examplesType: 'visual' | 'everyday' | 'scientific' | 'analytical';
    maxWords: number;
    useAnalogies: boolean;
}

export const GRADE_CONFIGS: Record<string, GradeConfig> = {
    '1': { level: 'primary', vocabulary: 'basic', sentenceLength: 'short', examplesType: 'visual', maxWords: 150, useAnalogies: true },
    '2': { level: 'primary', vocabulary: 'basic', sentenceLength: 'short', examplesType: 'visual', maxWords: 150, useAnalogies: true },
    '3': { level: 'primary', vocabulary: 'basic', sentenceLength: 'short', examplesType: 'everyday', maxWords: 180, useAnalogies: true },
    '4': { level: 'primary', vocabulary: 'basic', sentenceLength: 'medium', examplesType: 'everyday', maxWords: 200, useAnalogies: true },
    '5': { level: 'primary', vocabulary: 'intermediate', sentenceLength: 'medium', examplesType: 'everyday', maxWords: 220, useAnalogies: true },
    '6': { level: 'middle', vocabulary: 'intermediate', sentenceLength: 'medium', examplesType: 'everyday', maxWords: 250, useAnalogies: true },
    '7': { level: 'middle', vocabulary: 'intermediate', sentenceLength: 'medium', examplesType: 'scientific', maxWords: 280, useAnalogies: true },
    '8': { level: 'middle', vocabulary: 'intermediate', sentenceLength: 'medium', examplesType: 'scientific', maxWords: 300, useAnalogies: false },
    '9': { level: 'secondary', vocabulary: 'advanced', sentenceLength: 'long', examplesType: 'scientific', maxWords: 350, useAnalogies: false },
    '10': { level: 'secondary', vocabulary: 'advanced', sentenceLength: 'long', examplesType: 'scientific', maxWords: 350, useAnalogies: false },
    '11': { level: 'senior', vocabulary: 'technical', sentenceLength: 'long', examplesType: 'analytical', maxWords: 400, useAnalogies: false },
    '12': { level: 'senior', vocabulary: 'technical', sentenceLength: 'long', examplesType: 'analytical', maxWords: 400, useAnalogies: false },
};

// ============================================
// Subject Configurations
// ============================================

export interface SubjectConfig {
    category: 'science' | 'mathematics' | 'social' | 'language' | 'arts';
    requiresFormulas: boolean;
    requiresDiagrams: boolean;
    promptStyle: 'explanatory' | 'procedural' | 'narrative' | 'analytical';
    keyTermsImportant: boolean;
    realWorldExamples: boolean;
    indianContext: boolean;
}

export const SUBJECT_CONFIGS: Record<string, SubjectConfig> = {
    // Science Subjects
    'science': { category: 'science', requiresFormulas: false, requiresDiagrams: true, promptStyle: 'explanatory', keyTermsImportant: true, realWorldExamples: true, indianContext: true },
    'physics': { category: 'science', requiresFormulas: true, requiresDiagrams: true, promptStyle: 'procedural', keyTermsImportant: true, realWorldExamples: true, indianContext: false },
    'chemistry': { category: 'science', requiresFormulas: true, requiresDiagrams: true, promptStyle: 'explanatory', keyTermsImportant: true, realWorldExamples: true, indianContext: false },
    'biology': { category: 'science', requiresFormulas: false, requiresDiagrams: true, promptStyle: 'explanatory', keyTermsImportant: true, realWorldExamples: true, indianContext: true },
    'environmental_science': { category: 'science', requiresFormulas: false, requiresDiagrams: false, promptStyle: 'explanatory', keyTermsImportant: false, realWorldExamples: true, indianContext: true },

    // Mathematics
    'mathematics': { category: 'mathematics', requiresFormulas: true, requiresDiagrams: true, promptStyle: 'procedural', keyTermsImportant: true, realWorldExamples: true, indianContext: false },

    // Social Sciences
    'social_science': { category: 'social', requiresFormulas: false, requiresDiagrams: false, promptStyle: 'narrative', keyTermsImportant: true, realWorldExamples: true, indianContext: true },
    'history': { category: 'social', requiresFormulas: false, requiresDiagrams: false, promptStyle: 'narrative', keyTermsImportant: true, realWorldExamples: false, indianContext: true },
    'geography': { category: 'social', requiresFormulas: false, requiresDiagrams: true, promptStyle: 'explanatory', keyTermsImportant: true, realWorldExamples: true, indianContext: true },
    'civics': { category: 'social', requiresFormulas: false, requiresDiagrams: false, promptStyle: 'explanatory', keyTermsImportant: true, realWorldExamples: true, indianContext: true },
    'economics': { category: 'social', requiresFormulas: true, requiresDiagrams: true, promptStyle: 'analytical', keyTermsImportant: true, realWorldExamples: true, indianContext: true },
    'political_science': { category: 'social', requiresFormulas: false, requiresDiagrams: false, promptStyle: 'analytical', keyTermsImportant: true, realWorldExamples: true, indianContext: true },

    // Languages
    'hindi': { category: 'language', requiresFormulas: false, requiresDiagrams: false, promptStyle: 'narrative', keyTermsImportant: false, realWorldExamples: true, indianContext: true },
    'english': { category: 'language', requiresFormulas: false, requiresDiagrams: false, promptStyle: 'narrative', keyTermsImportant: false, realWorldExamples: true, indianContext: false },
    'sanskrit': { category: 'language', requiresFormulas: false, requiresDiagrams: false, promptStyle: 'narrative', keyTermsImportant: true, realWorldExamples: false, indianContext: true },

    // Arts & Others
    'computer_science': { category: 'science', requiresFormulas: false, requiresDiagrams: true, promptStyle: 'procedural', keyTermsImportant: true, realWorldExamples: true, indianContext: false },
    'physical_education': { category: 'arts', requiresFormulas: false, requiresDiagrams: false, promptStyle: 'explanatory', keyTermsImportant: false, realWorldExamples: true, indianContext: true },
    'art': { category: 'arts', requiresFormulas: false, requiresDiagrams: false, promptStyle: 'narrative', keyTermsImportant: false, realWorldExamples: true, indianContext: true },
};

// ============================================
// Topic Keywords for Specialized Handling
// ============================================

export const TOPIC_KEYWORDS = {
    // Biology/Science topics needing special care
    'life_processes': ['photosynthesis', 'respiration', 'digestion', 'circulation', 'excretion', 'nutrition'],
    'ecology': ['food chain', 'food web', 'ecosystem', 'biodiversity', 'conservation', 'pollution'],
    'human_body': ['heart', 'lungs', 'brain', 'digestive system', 'nervous system', 'skeleton'],
    'reproduction': ['reproduction', 'fertilization', 'cell division', 'genetics', 'heredity'],

    // Physics topics
    'mechanics': ['force', 'motion', 'velocity', 'acceleration', 'gravity', 'friction', 'momentum'],
    'electricity': ['current', 'voltage', 'resistance', 'circuit', 'ohm', 'magnetic'],
    'optics': ['light', 'reflection', 'refraction', 'lens', 'mirror', 'prism'],
    'waves': ['sound', 'wave', 'frequency', 'amplitude', 'wavelength'],

    // Chemistry topics
    'matter': ['matter', 'atom', 'molecule', 'element', 'compound', 'mixture'],
    'reactions': ['chemical reaction', 'oxidation', 'reduction', 'acid', 'base', 'salt'],
    'periodic_table': ['periodic table', 'metals', 'non-metals', 'noble gases'],

    // Math topics
    'algebra': ['equation', 'polynomial', 'linear', 'quadratic', 'variable', 'expression'],
    'geometry': ['triangle', 'circle', 'angle', 'area', 'perimeter', 'volume', 'congruent'],
    'statistics': ['mean', 'median', 'mode', 'probability', 'data', 'graph'],
    'trigonometry': ['sine', 'cosine', 'tangent', 'trigonometry', 'pythagoras'],

    // History topics
    'ancient_india': ['indus valley', 'vedic', 'maurya', 'gupta', 'harappa', 'mohenjo-daro'],
    'medieval_india': ['mughal', 'delhi sultanate', 'vijayanagara', 'chola', 'rajput'],
    'modern_india': ['british', 'independence', 'freedom struggle', 'gandhi', 'nehru', 'partition'],
    'world_history': ['world war', 'french revolution', 'industrial revolution', 'renaissance'],

    // Geography topics
    'physical_geography': ['climate', 'landforms', 'rivers', 'mountains', 'plateau', 'plains'],
    'indian_geography': ['monsoon', 'himalaya', 'ganga', 'deccan', 'western ghats'],
    'resources': ['natural resources', 'minerals', 'agriculture', 'industries', 'water resources'],
};

// ============================================
// Prompt Templates by Subject Category
// ============================================

export const SUBJECT_PROMPT_TEMPLATES = {
    science: {
        english: `You are an experienced CBSE Science teacher. Explain the following topic:

Topic: {topic}
Grade: {grade}
Complexity: {complexity}

Instructions:
1. Start with a clear DEFINITION
2. Explain the PROCESS or MECHANISM step by step
3. Give a REAL-LIFE EXAMPLE from India
4. Mention KEY TERMS in bold conceptually
5. End with WHY THIS MATTERS

Content:`,

        hindi: `आप एक अनुभवी CBSE विज्ञान शिक्षक हैं। निम्नलिखित विषय समझाइए:

विषय: {topic}
कक्षा: {grade}
स्तर: {complexity}

निर्देश:
1. स्पष्ट परिभाषा से शुरू करें
2. प्रक्रिया चरणबद्ध तरीके से समझाएं
3. भारत से जुड़ा उदाहरण दें
4. मुख्य शब्दों को समझाएं
5. महत्व बताएं

सामग्री:`,
    },

    mathematics: {
        english: `You are a CBSE Mathematics teacher. Explain this concept:

Topic: {topic}
Grade: {grade}

Instructions:
1. Define the concept clearly
2. Show the FORMULA if applicable
3. Explain each step of solving
4. Give a SOLVED EXAMPLE
5. Mention common mistakes to avoid

Explanation:`,

        hindi: `आप CBSE गणित शिक्षक हैं। यह अवधारणा समझाइए:

विषय: {topic}
कक्षा: {grade}

निर्देश:
1. अवधारणा स्पष्ट रूप से परिभाषित करें
2. सूत्र दें (यदि लागू हो)
3. प्रत्येक चरण समझाएं
4. हल किया हुआ उदाहरण दें
5. सामान्य गलतियाँ बताएं

व्याख्या:`,
    },

    social: {
        english: `You are a CBSE Social Science teacher. Explain this topic:

Topic: {topic}
Grade: {grade}
Subject Area: {subject}

Instructions:
1. Provide CONTEXT and BACKGROUND
2. Explain KEY FACTS and EVENTS
3. Discuss SIGNIFICANCE for India
4. Connect to PRESENT DAY relevance
5. Mention important DATES and NAMES

Content:`,

        hindi: `आप CBSE सामाजिक विज्ञान शिक्षक हैं। यह विषय समझाइए:

विषय: {topic}
कक्षा: {grade}

निर्देश:
1. पृष्ठभूमि और संदर्भ दें
2. मुख्य तथ्य और घटनाएं बताएं
3. भारत के लिए महत्व समझाएं
4. वर्तमान से जोड़ें
5. महत्वपूर्ण तिथियां और नाम बताएं

सामग्री:`,
    },

    language: {
        english: `You are a language teacher. Create educational content about:

Topic: {topic}
Grade: {grade}

Instructions:
1. Explain the concept simply
2. Give examples of usage
3. Include practice sentences
4. Make it engaging for students

Content:`,

        hindi: `आप भाषा शिक्षक हैं। शैक्षिक सामग्री बनाइए:

विषय: {topic}
कक्षा: {grade}

निर्देश:
1. अवधारणा सरल रूप में समझाएं
2. प्रयोग के उदाहरण दें
3. अभ्यास वाक्य शामिल करें
4. विद्यार्थियों के लिए रोचक बनाएं

सामग्री:`,
    },

    arts: {
        english: `You are a creative teacher. Explain this topic:

Topic: {topic}
Grade: {grade}

Instructions:
1. Make it interesting and engaging
2. Include practical tips
3. Relate to everyday life
4. Encourage creativity

Content:`,

        hindi: `आप एक रचनात्मक शिक्षक हैं। यह विषय समझाइए:

विषय: {topic}
कक्षा: {grade}

निर्देश:
1. रोचक और आकर्षक बनाएं
2. व्यावहारिक सुझाव दें
3. दैनिक जीवन से जोड़ें
4. रचनात्मकता को प्रोत्साहित करें

सामग्री:`,
    },
};

// ============================================
// Complexity Guidance by Grade Level
// ============================================

export const COMPLEXITY_GUIDANCE = {
    primary: {
        english: 'Use very simple words. Short sentences only. Give picture-like examples. Make it fun and easy to understand.',
        hindi: 'बहुत सरल शब्द प्रयोग करें। छोटे वाक्य। चित्रात्मक उदाहरण दें। मज़ेदार और आसान बनाएं।',
    },
    middle: {
        english: 'Use clear language with some technical terms. Explain concepts step-by-step. Use everyday examples.',
        hindi: 'स्पष्ट भाषा में कुछ तकनीकी शब्द प्रयोग करें। अवधारणाएं चरणबद्ध समझाएं। रोज़मर्रा के उदाहरण दें।',
    },
    secondary: {
        english: 'Use proper scientific/technical terminology. Explain underlying principles. Include formulas where needed.',
        hindi: 'उचित वैज्ञानिक/तकनीकी शब्दावली प्रयोग करें। मूल सिद्धांत समझाएं। आवश्यक सूत्र शामिल करें।',
    },
    senior: {
        english: 'Use advanced academic language. Discuss theories and applications. Include analytical perspectives.',
        hindi: 'उन्नत अकादमिक भाषा प्रयोग करें। सिद्धांत और अनुप्रयोग चर्चा करें। विश्लेषणात्मक दृष्टिकोण शामिल करें।',
    },
};

// ============================================
// Inference Configurations by Subject
// ============================================

export const SUBJECT_INFERENCE_CONFIGS = {
    science: {
        temperature: 0.3,  // Low for factual accuracy
        top_p: 0.85,
        top_k: 50,
        maxTokens: 450,
    },
    mathematics: {
        temperature: 0.2,  // Very low for precise formulas
        top_p: 0.8,
        top_k: 40,
        maxTokens: 400,
    },
    social: {
        temperature: 0.4,  // Slightly higher for narrative
        top_p: 0.9,
        top_k: 60,
        maxTokens: 500,
    },
    language: {
        temperature: 0.5,  // Higher for creativity
        top_p: 0.9,
        top_k: 70,
        maxTokens: 400,
    },
    arts: {
        temperature: 0.6,  // Highest for creativity
        top_p: 0.95,
        top_k: 80,
        maxTokens: 350,
    },
};

// ============================================
// Helper Functions
// ============================================

/**
 * Get configuration for a specific grade
 */
export function getGradeConfig(grade: string): GradeConfig {
    return GRADE_CONFIGS[grade] || GRADE_CONFIGS['6']; // Default to Grade 6
}

/**
 * Get configuration for a specific subject
 */
export function getSubjectConfig(subject: string): SubjectConfig {
    const normalizedSubject = subject.toLowerCase().replace(/\s+/g, '_');
    return SUBJECT_CONFIGS[normalizedSubject] || SUBJECT_CONFIGS['science'];
}

/**
 * Get prompt template for subject category
 */
export function getPromptTemplate(
    subject: string,
    language: SupportedLanguage = 'english'
): string {
    const subjectConfig = getSubjectConfig(subject);
    const templates = SUBJECT_PROMPT_TEMPLATES[subjectConfig.category] || SUBJECT_PROMPT_TEMPLATES.science;

    // For Indic languages, use Hindi template (Navarasa understands Hindi prompts best)
    const langKey = language === 'english' ? 'english' : 'hindi';
    return templates[langKey];
}

/**
 * Get complexity guidance based on grade level
 */
export function getComplexityGuidanceForGrade(
    grade: string,
    language: SupportedLanguage = 'english'
): string {
    const gradeConfig = getGradeConfig(grade);
    const guidance = COMPLEXITY_GUIDANCE[gradeConfig.level];
    return language === 'english' ? guidance.english : guidance.hindi;
}

/**
 * Get inference config for subject
 */
export function getInferenceConfigForSubject(subject: string) {
    const subjectConfig = getSubjectConfig(subject);
    return SUBJECT_INFERENCE_CONFIGS[subjectConfig.category] || SUBJECT_INFERENCE_CONFIGS.science;
}

/**
 * Detect topic category from topic text
 */
export function detectTopicCategory(topic: string): string | null {
    const normalizedTopic = topic.toLowerCase();

    for (const [category, keywords] of Object.entries(TOPIC_KEYWORDS)) {
        for (const keyword of keywords) {
            if (normalizedTopic.includes(keyword)) {
                return category;
            }
        }
    }
    return null;
}

/**
 * Build optimized prompt for CBSE content
 */
export function buildCBSEOptimizedPrompt(params: {
    topic: string;
    subject: string;
    grade: string;
    language: SupportedLanguage;
    additionalInstructions?: string;
}): string {
    const gradeConfig = getGradeConfig(params.grade);
    const subjectConfig = getSubjectConfig(params.subject);
    const template = getPromptTemplate(params.subject, params.language);
    const complexity = getComplexityGuidanceForGrade(params.grade, params.language);

    // Build the prompt
    let prompt = template
        .replace('{topic}', params.topic)
        .replace('{grade}', params.grade)
        .replace('{subject}', params.subject)
        .replace('{complexity}', complexity);

    // Add additional instructions if provided
    if (params.additionalInstructions) {
        const instructionLabel = params.language === 'english' ? 'Additional:' : 'अतिरिक्त:';
        prompt += `\n${instructionLabel} ${params.additionalInstructions}\n`;
    }

    return prompt;
}
