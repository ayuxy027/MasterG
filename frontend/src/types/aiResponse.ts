export interface AISection {
  title: string;
  content: string; // markdown-supported
}

export interface AIResponse {
  sections: AISection[]; // exactly 3 items expected
}

// Validation helpers
export const isValidAIResponse = (data: unknown): data is AIResponse => {
  if (typeof data !== 'object' || data === null) return false;
  const obj = data as Record<string, unknown>;
  if (!Array.isArray(obj.sections)) return false;
  if (obj.sections.length !== 3) return false;
  return obj.sections.every((s) =>
    typeof s === 'object' && s !== null &&
    typeof (s as Record<string, unknown>).title === 'string' &&
    typeof (s as Record<string, unknown>).content === 'string'
  );
};

// Default fallback response
export const createFallbackResponse = (userInput: string): AIResponse => ({
  sections: [
    { title: 'Overview', content: userInput },
    { title: 'Key Points', content: '- Point 1\n- Point 2' },
    { title: 'Summary', content: 'Concise wrap-up' }
  ]
});

