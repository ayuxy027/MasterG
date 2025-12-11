import logger from "./logger.service";

/**
 * Query Optimization Service
 * Optimizes queries by extracting key terms and expanding context
 */
export class QueryOptimizerService {
  /**
   * Optimize query for better retrieval
   */
  async optimizeQuery(query: string, language: string): Promise<string> {
    const optimized = query.trim();

    // Remove filler words
    const withoutFillers = this.removeFillerWords(optimized, language);

    // Extract key terms (for logging)
    const keyTerms = this.extractKeyTerms(withoutFillers);
    logger.debug(`🔍 Key terms: ${keyTerms.join(", ")}`);

    return withoutFillers;
  }

  /**
   * Remove filler words based on language
   */
  private removeFillerWords(query: string, language: string): string {
    const fillerWords: Record<string, string[]> = {
      en: ["um", "uh", "like", "you know", "i mean", "basically", "actually"],
      hi: ["मतलब", "यानी", "तो", "जैसे"],
    };

    const fillers = fillerWords[language] || fillerWords.en;
    let optimized = query;

    fillers.forEach((filler) => {
      const regex = new RegExp(`\\b${filler}\\b`, "gi");
      optimized = optimized.replace(regex, "");
    });

    return optimized.replace(/\s+/g, " ").trim();
  }

  /**
   * Extract key terms from query
   */
  private extractKeyTerms(query: string): string[] {
    // Split by spaces and filter out short words
    const words = query
      .toLowerCase()
      .split(/\s+/)
      .filter((word) => word.length > 3);

    // Remove common stop words
    const stopWords = new Set([
      "what",
      "when",
      "where",
      "which",
      "who",
      "how",
      "this",
      "that",
      "these",
      "those",
      "with",
      "from",
    ]);

    return words.filter((word) => !stopWords.has(word));
  }

  /**
   * Expand acronyms (educational context)
   */
  expandAcronyms(query: string): string {
    const acronyms: Record<string, string> = {
      DNA: "Deoxyribonucleic Acid",
      RNA: "Ribonucleic Acid",
      AI: "Artificial Intelligence",
      ML: "Machine Learning",
      NLP: "Natural Language Processing",
    };

    let expanded = query;
    Object.entries(acronyms).forEach(([acronym, full]) => {
      const regex = new RegExp(`\\b${acronym}\\b`, "g");
      expanded = expanded.replace(regex, `${acronym} (${full})`);
    });

    return expanded;
  }
}

export const queryOptimizerService = new QueryOptimizerService();
