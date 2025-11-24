import { AIResponse, isValidAIResponse } from '../types/aiResponse';

/**
 * Parse and validate AI response JSON
 */
export function parseAIResponse(content: string, userInput: string): AIResponse {
  try {
    // Clean the content - remove any non-JSON text
    const jsonStart = content.indexOf('{');
    const jsonEnd = content.lastIndexOf('}') + 1;
    
    if (jsonStart === -1 || jsonEnd === 0) {
      console.warn('No JSON found in response:', content);
      return { sections: [
        { title: 'Overview', content: userInput },
        { title: 'Details', content: 'Content not available' },
        { title: 'Summary', content: 'Content not available' }
      ] };
    }
    
    const jsonContent = content.substring(jsonStart, jsonEnd);
    const parsed = JSON.parse(jsonContent);
    
    if (isValidAIResponse(parsed)) {
      return parsed;
    } else {
      console.warn('Invalid AI response structure:', parsed);
      return { sections: [
        { title: 'Overview', content: '' },
        { title: 'Details', content: '' },
        { title: 'Summary', content: '' }
      ] };
    }
  } catch (error) {
    console.error('JSON parsing error:', error);
    return { sections: [
      { title: 'Overview', content: userInput },
      { title: 'Details', content: 'Content not available' },
      { title: 'Summary', content: 'Content not available' }
    ] };
  }
}

/**
 * Extract sections from AI response for card creation
 */
export function extractSections(response: AIResponse): string[] {
  return response.sections.map(s => `### ${s.title}\n${s.content.trim()}`);
}

/**
 * Validate if a string contains valid JSON
 */
export function isValidJSON(str: string): boolean {
  try {
    JSON.parse(str);
    return true;
  } catch {
    return false;
  }
}

/**
 * Clean and prepare content for JSON parsing
 */
export function cleanJSONContent(content: string): string {
  let cleaned = content.trim();
  cleaned = cleaned.replace(/```json\s*/g, '');
  cleaned = cleaned.replace(/```\s*$/g, '');
  const jsonStart = cleaned.indexOf('{');
  if (jsonStart > 0) cleaned = cleaned.substring(jsonStart);
  const jsonEnd = cleaned.lastIndexOf('}');
  if (jsonEnd !== -1 && jsonEnd < cleaned.length - 1) cleaned = cleaned.substring(0, jsonEnd + 1);
  return cleaned;
}

