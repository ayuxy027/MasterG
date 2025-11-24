// Simple Groq API client
import { SYSTEM_PROMPT, createUserPrompt } from '../prompt/queryPrompt';

// Keep simple constants (no extra env variables as requested)
const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY;
const GROQ_MODEL = 'meta-llama/llama-4-scout-17b-16e-instruct';

export interface GroqResponse {
  content: string;
  success: boolean;
  error?: string;
}

function withTimeout(timeoutMs: number): AbortController {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  // @ts-expect-error Attach for cleanup by caller if needed
  controller._timeoutId = id;
  return controller;
}

async function groqFetch(body: unknown, opts?: { stream?: boolean; timeoutMs?: number }): Promise<Response> {
  const controller = withTimeout(opts?.timeoutMs ?? 30000);
  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    return res;
  } finally {
    // @ts-expect-error private
    clearTimeout(controller._timeoutId);
  }
}

/**
 * Simple function to send a message to Groq API with streaming
 */
export async function sendMessage(message: string, onChunk?: (chunk: string) => void): Promise<GroqResponse> {
  try {
    const userPrompt = createUserPrompt(message);

    const response = await groqFetch({
      model: GROQ_MODEL,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
      max_tokens: 800,
      temperature: 0.7,
      stream: true,
    }, { stream: true, timeoutMs: 45000 });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('No response body for streaming');
    }

    const decoder = new TextDecoder();
    let buffer = '';
    let fullContent = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') break;
          try {
            const chunk = JSON.parse(data);
            if (chunk.choices?.[0]?.delta?.content) {
              const content = chunk.choices[0].delta.content as string;
              fullContent += content;
              onChunk?.(content);
            }
          } catch {
            // ignore partial JSON lines
          }
        }
      }
    }

    return { content: fullContent, success: true };
  } catch (error) {
    console.error('❌ Groq API error:', error);
    return {
      content: '',
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Function to send a direct message to Groq API without using canvas-specific prompts
 * Used for prompt enhancement and other non-canvas operations
 */
export async function sendDirectMessage(message: string): Promise<GroqResponse> {
  try {
    const response = await groqFetch({
      model: GROQ_MODEL,
      messages: [ { role: 'user', content: message } ],
      max_tokens: 800,
      temperature: 0.7,
      stream: false,
    }, { timeoutMs: 30000 });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    return { content: content.trim(), success: true };
  } catch (error) {
    console.error('❌ Groq API error:', error);
    return {
      content: '',
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Test function to verify API connection
 */
export async function testConnection(): Promise<GroqResponse> {
  return sendMessage('Hello! Please respond with "API connection successful" if you can see this message.');
}

