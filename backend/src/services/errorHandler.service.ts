import logger from "./logger.service";

export enum ErrorType {
  VALIDATION_ERROR = "VALIDATION_ERROR",
  API_ERROR = "API_ERROR",
  DATABASE_ERROR = "DATABASE_ERROR",
  NETWORK_ERROR = "NETWORK_ERROR",
  TIMEOUT_ERROR = "TIMEOUT_ERROR",
  QUOTA_ERROR = "QUOTA_ERROR",
  UNKNOWN_ERROR = "UNKNOWN_ERROR",
}

export interface AppError {
  type: ErrorType;
  message: string;
  originalError?: any;
  retryable: boolean;
}

/**
 * Centralized Error Handling Service
 * Classifies errors and determines retry strategy
 */
export class ErrorHandlerService {
  /**
   * Parse and classify error
   */
  parseError(error: any): AppError {
    // Axios errors
    if (error.response) {
      const status = error.response.status;
      const message = error.response.data?.error?.message || error.message;

      if (status === 429) {
        return {
          type: ErrorType.QUOTA_ERROR,
          message: "API rate limit exceeded",
          originalError: error,
          retryable: false,
        };
      }

      if (status >= 500) {
        return {
          type: ErrorType.API_ERROR,
          message: `API server error: ${message}`,
          originalError: error,
          retryable: true,
        };
      }

      if (status === 401 || status === 403) {
        return {
          type: ErrorType.API_ERROR,
          message: "API authentication failed",
          originalError: error,
          retryable: false,
        };
      }

      return {
        type: ErrorType.API_ERROR,
        message: `API error: ${message}`,
        originalError: error,
        retryable: false,
      };
    }

    // Network errors
    if (
      error.code === "ECONNRESET" ||
      error.code === "ETIMEDOUT" ||
      error.code === "ENOTFOUND"
    ) {
      return {
        type: ErrorType.NETWORK_ERROR,
        message: "Network connection failed",
        originalError: error,
        retryable: true,
      };
    }

    // Timeout errors
    if (error.code === "ECONNABORTED" || error.message?.includes("timeout")) {
      return {
        type: ErrorType.TIMEOUT_ERROR,
        message: "Request timeout",
        originalError: error,
        retryable: true,
      };
    }

    // Database errors
    if (error.name === "MongoError" || error.message?.includes("MongoDB")) {
      return {
        type: ErrorType.DATABASE_ERROR,
        message: "Database operation failed",
        originalError: error,
        retryable: true,
      };
    }

    // Default
    return {
      type: ErrorType.UNKNOWN_ERROR,
      message: error.message || "Unknown error occurred",
      originalError: error,
      retryable: false,
    };
  }

  /**
   * Retry with exponential backoff
   */
  async retryWithBackoff<T>(
    fn: () => Promise<T>,
    maxRetries: number = 3,
    baseDelay: number = 1000
  ): Promise<T> {
    let lastError: any;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;
        const appError = this.parseError(error);

        if (!appError.retryable || attempt === maxRetries) {
          throw error;
        }

        const delay = baseDelay * Math.pow(2, attempt);
        logger.warn(
          `⚠️  Retry attempt ${attempt + 1}/${maxRetries} after ${delay}ms - ${
            appError.message
          }`
        );
        await this.sleep(delay);
      }
    }

    throw lastError;
  }

  /**
   * Circuit breaker pattern
   */
  private failureCount = 0;
  private readonly FAILURE_THRESHOLD = 5;
  private readonly RESET_TIMEOUT = 60000; // 1 minute
  private circuitOpen = false;

  async executeWithCircuitBreaker<T>(fn: () => Promise<T>): Promise<T> {
    if (this.circuitOpen) {
      throw new Error(
        "Circuit breaker is OPEN - service temporarily unavailable"
      );
    }

    try {
      const result = await fn();
      this.failureCount = 0; // Reset on success
      return result;
    } catch (error) {
      this.failureCount++;

      if (this.failureCount >= this.FAILURE_THRESHOLD) {
        this.circuitOpen = true;
        logger.error("🚨 Circuit breaker OPENED - too many failures");

        // Auto-reset after timeout
        setTimeout(() => {
          this.circuitOpen = false;
          this.failureCount = 0;
          logger.info("🔄 Circuit breaker RESET");
        }, this.RESET_TIMEOUT);
      }

      throw error;
    }
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

export const errorHandlerService = new ErrorHandlerService();
