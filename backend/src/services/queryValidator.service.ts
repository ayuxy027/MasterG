import logger from "./logger.service";

export enum QueryType {
  VALID_RAG_QUERY = "VALID_RAG_QUERY",
  DIRECT_ANSWER = "DIRECT_ANSWER",
  OUT_OF_SCOPE = "OUT_OF_SCOPE",
  AMBIGUOUS = "AMBIGUOUS",
  GREETING = "GREETING",
  INVALID = "INVALID",
}

export interface ValidationResult {
  isValid: boolean;
  type: QueryType;
  reason: string;
  confidence: number;
}

/**
 * Query Validation & Classification Service
 * Validates and classifies queries before processing
 */
export class QueryValidatorService {
  private readonly MIN_LENGTH = 2;
  private readonly MAX_LENGTH = 2000;

  /**
   * Validate and classify query
   */
  async validateQuery(query: string): Promise<ValidationResult> {
    const trimmedQuery = query.trim();

    // Length validation
    if (trimmedQuery.length < this.MIN_LENGTH) {
      return {
        isValid: false,
        type: QueryType.INVALID,
        reason: "Query too short",
        confidence: 1.0,
      };
    }

    if (trimmedQuery.length > this.MAX_LENGTH) {
      return {
        isValid: false,
        type: QueryType.INVALID,
        reason: "Query too long",
        confidence: 1.0,
      };
    }

    // Check for greetings
    if (this.isGreeting(trimmedQuery)) {
      return {
        isValid: true,
        type: QueryType.GREETING,
        reason: "Greeting detected",
        confidence: 0.95,
      };
    }

    // Check for inappropriate content
    if (this.isInappropriate(trimmedQuery)) {
      return {
        isValid: false,
        type: QueryType.OUT_OF_SCOPE,
        reason: "Inappropriate content",
        confidence: 0.9,
      };
    }

    // Check if it's a factual/direct question
    if (this.isDirectAnswerQuery(trimmedQuery)) {
      return {
        isValid: true,
        type: QueryType.DIRECT_ANSWER,
        reason: "Factual query - direct answer possible",
        confidence: 0.8,
      };
    }

    // Default: RAG query
    return {
      isValid: true,
      type: QueryType.VALID_RAG_QUERY,
      reason: "Valid RAG query",
      confidence: 0.85,
    };
  }

  /**
   * Check if query is a greeting
   */
  private isGreeting(query: string): boolean {
    const greetings = [
      /^(hi|hello|hey|hola|namaste|greetings|good morning|good evening|good afternoon)$/i,
      /^(thanks|thank you|thx|धन्यवाद)$/i,
      /^(bye|goodbye|see you|cya)$/i,
    ];
    return greetings.some((pattern) => pattern.test(query));
  }

  /**
   * Check for inappropriate content
   */
  private isInappropriate(query: string): boolean {
    const inappropriatePatterns = [
      /\b(fuck|shit|damn|bitch|asshole|bastard)\b/i,
      /\b(stupid|idiot|dumb)\b/i,
    ];
    return inappropriatePatterns.some((pattern) => pattern.test(query));
  }

  /**
   * Check if query can be answered directly (factual)
   */
  private isDirectAnswerQuery(query: string): boolean {
    const directPatterns = [
      /^what is the capital of/i,
      /^who is/i,
      /^when (did|was|is)/i,
      /^where is/i,
      /^how many/i,
      /^what time/i,
    ];
    return directPatterns.some((pattern) => pattern.test(query));
  }

  /**
   * Sanitize query (remove harmful content)
   */
  sanitizeQuery(query: string): string {
    // Remove HTML tags
    let sanitized = query.replace(/<[^>]*>/g, "");

    // Remove excessive whitespace
    sanitized = sanitized.replace(/\s+/g, " ").trim();

    return sanitized;
  }
}

export const queryValidatorService = new QueryValidatorService();
