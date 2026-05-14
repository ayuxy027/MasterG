import type {
  PosterCategory,
  Language,
  PosterGenerationRequest,
  PosterGenerationResponse,
} from '../types/poster';
import { API_BASE_URL } from '../config/api';

export class PosterApiError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public details?: unknown
  ) {
    super(message);
    this.name = 'PosterApiError';
  }
}

export async function generatePosters(
  request: PosterGenerationRequest
): Promise<PosterGenerationResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/posters/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new PosterApiError(
        data.error || 'Failed to generate posters',
        response.status,
        data
      );
    }

    return data;
  } catch (error) {
    if (error instanceof PosterApiError) throw error;
    throw new PosterApiError(
      error instanceof Error ? error.message : 'Network error',
      undefined,
      error
    );
  }
}

export async function getCategories(): Promise<PosterCategory[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/posters/categories`, {
      method: 'GET',
    });

    if (!response.ok) {
      throw new PosterApiError('Failed to fetch categories', response.status);
    }

    const data = await response.json();
    return data.categories || [];
  } catch (error) {
    if (error instanceof PosterApiError) throw error;
    throw new PosterApiError(
      error instanceof Error ? error.message : 'Network error'
    );
  }
}

export async function getLanguages(): Promise<Language[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/posters/languages`, {
      method: 'GET',
    });

    if (!response.ok) {
      throw new PosterApiError('Failed to fetch languages', response.status);
    }

    const data = await response.json();
    return data.languages || [];
  } catch (error) {
    if (error instanceof PosterApiError) throw error;
    throw new PosterApiError(
      error instanceof Error ? error.message : 'Network error'
    );
  }
}
