import { API_BASE_URL } from "../config/api";

export type TranslationMode = "local" | "cloud";

export interface TranslateRequest {
  text: string;
  sourceLanguage: string;
  targetLanguage: string;
  mode?: TranslationMode;
  signal?: AbortSignal;
}

export interface TranslateResult {
  success: boolean;
  translated?: string;
  error?: string;
}

const CACHE_MAX_ENTRIES = 100;
const cache = new Map<string, string>();

const cacheKey = (text: string, src: string, tgt: string, mode: TranslationMode) =>
  `${mode}|${src}|${tgt}|${text}`;

const cacheSet = (key: string, value: string) => {
  if (cache.size >= CACHE_MAX_ENTRIES) {
    const oldestKey = cache.keys().next().value;
    if (oldestKey !== undefined) cache.delete(oldestKey);
  }
  cache.set(key, value);
};

const delay = (ms: number, signal?: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    const id = setTimeout(resolve, ms);
    signal?.addEventListener("abort", () => {
      clearTimeout(id);
      reject(new DOMException("Aborted", "AbortError"));
    });
  });

export async function translateText({
  text,
  sourceLanguage,
  targetLanguage,
  mode = "local",
  signal,
}: TranslateRequest): Promise<TranslateResult> {
  const trimmed = text?.trim();
  if (!trimmed) return { success: false, error: "Empty input" };
  if (sourceLanguage === targetLanguage) return { success: true, translated: text };

  const key = cacheKey(text, sourceLanguage, targetLanguage, mode);
  const cached = cache.get(key);
  if (cached !== undefined) return { success: true, translated: cached };

  const backoffs = [0, 250, 1000];
  let lastError: string | undefined;

  for (let attempt = 0; attempt < backoffs.length; attempt++) {
    if (backoffs[attempt] > 0) {
      try {
        await delay(backoffs[attempt], signal);
      } catch {
        return { success: false, error: "Aborted" };
      }
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/stitch/translate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, sourceLanguage, targetLanguage, mode }),
        signal,
      });

      if (response.status >= 500 && response.status < 600) {
        lastError = `Server error (${response.status})`;
        continue;
      }

      const data = (await response.json().catch(() => null)) as TranslateResult | null;

      if (!response.ok) {
        return { success: false, error: data?.error || `HTTP ${response.status}` };
      }
      if (data?.success && data.translated) {
        cacheSet(key, data.translated);
        return data;
      }
      return data ?? { success: false, error: "Empty response" };
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return { success: false, error: "Aborted" };
      }
      lastError = error instanceof Error ? error.message : "Network error";
    }
  }

  return { success: false, error: lastError ?? "Translation failed after retries" };
}

const SENTENCE_SPLIT_RE = /(?<=[.!?।])\s+/;
const CHUNK_TARGET = 1800;

export async function translateLong(req: TranslateRequest): Promise<TranslateResult> {
  if (req.text.length <= CHUNK_TARGET) return translateText(req);

  const sentences = req.text.split(SENTENCE_SPLIT_RE);
  const chunks: string[] = [];
  let buffer = "";

  for (const sentence of sentences) {
    if (buffer.length + sentence.length + 1 > CHUNK_TARGET && buffer) {
      chunks.push(buffer);
      buffer = sentence;
    } else {
      buffer = buffer ? `${buffer} ${sentence}` : sentence;
    }
  }
  if (buffer) chunks.push(buffer);

  const translatedChunks: string[] = [];
  for (const chunk of chunks) {
    const result = await translateText({ ...req, text: chunk });
    if (!result.success || !result.translated) return result;
    translatedChunks.push(result.translated);
  }

  return { success: true, translated: translatedChunks.join(" ") };
}

export function clearTranslateCache(): void {
  cache.clear();
}
