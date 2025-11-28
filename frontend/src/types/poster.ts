export interface PosterCategory {
  id: string;
  name: string;
  description: string;
  icon: string;
  examples: string[];
}

export interface Language {
  code: string;
  name: string;
  native: string;
}

export interface GeneratedPoster {
  imageBase64: string;
  enhancedPrompt: string;
  mimeType: string;
}

export interface PosterGenerationRequest {
  query: string;
  category: string;
  language?: string;
  count?: number;
  aspectRatio?: '1:1' | '16:9' | '9:16' | '4:3' | '3:4';
}

export interface PosterGenerationResponse {
  success: boolean;
  posters: GeneratedPoster[];
  metadata: {
    category: string;
    language: string;
    originalQuery: string;
    count?: number;
  };
  error?: string;
}
