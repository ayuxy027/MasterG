import { embeddingService } from "./embedding.service";
import { ollamaEmbeddingService } from "./ollamaEmbedding.service";
import { groqService } from "./groq.service";
import { ollamaChatService } from "./ollamaChat.service";
import { geminiService } from "./gemini.service";

/**
 * Service Factory for Offline/Online Mode
 * Dynamically selects services based on configuration
 */

export type ServiceMode = "online" | "offline" | "auto";

class ServiceFactory {
    private mode: ServiceMode;
    private ollamaAvailable: boolean | null = null;

    constructor() {
        this.mode = (process.env.USE_OFFLINE_MODE?.toLowerCase() as ServiceMode) || "auto";
        console.log(`🔧 Service Factory initialized in "${this.mode}" mode`);
    }

    /**
     * Check if Ollama is available
     */
    async checkOllamaAvailability(): Promise<boolean> {
        if (this.ollamaAvailable !== null) {
            return this.ollamaAvailable;
        }

        try {
            const embedCheck = await ollamaEmbeddingService.checkConnection();
            const chatCheck = await ollamaChatService.checkConnection();

            this.ollamaAvailable = embedCheck && chatCheck;

            if (this.ollamaAvailable) {
                console.log("✅ Ollama is available with all required models");
            } else {
                console.warn("⚠️ Ollama is not fully available");
                if (!embedCheck) console.warn("  - Embedding model not found");
                if (!chatCheck) console.warn("  - Chat model not found");
            }

            return this.ollamaAvailable;
        } catch (error) {
            console.error("❌ Ollama availability check failed:", error);
            this.ollamaAvailable = false;
            return false;
        }
    }

    /**
     * Determine effective mode based on configuration and availability
     */
    async getEffectiveMode(): Promise<"online" | "offline"> {
        if (this.mode === "offline") {
            return "offline";
        }

        if (this.mode === "online") {
            return "online";
        }

        // Auto mode: prefer offline if Ollama is available
        const ollamaReady = await this.checkOllamaAvailability();
        return ollamaReady ? "offline" : "online";
    }

    /**
     * Get the appropriate embedding service
     */
    async getEmbeddingService(): Promise<typeof embeddingService | typeof ollamaEmbeddingService> {
        const effectiveMode = await this.getEffectiveMode();

        if (effectiveMode === "offline") {
            console.log("📊 Using Ollama Embedding Service (offline)");
            return ollamaEmbeddingService;
        }

        console.log("📊 Using Google Embedding Service (online)");
        return embeddingService;
    }

    /**
     * Get the appropriate chat service
     */
    async getChatService(): Promise<typeof groqService | typeof ollamaChatService> {
        const effectiveMode = await this.getEffectiveMode();

        if (effectiveMode === "offline") {
            console.log("🤖 Using Ollama Chat Service (offline)");
            return ollamaChatService;
        }

        console.log("🤖 Using Groq Chat Service (online)");
        return groqService;
    }

    /**
     * Get the appropriate deep analysis service
     * In offline mode, this uses Ollama; in online mode, it uses Gemini
     */
    async getDeepService(): Promise<typeof geminiService | typeof ollamaChatService> {
        const effectiveMode = await this.getEffectiveMode();

        if (effectiveMode === "offline") {
            console.log("🧠 Using Ollama for deep analysis (offline)");
            return ollamaChatService;
        }

        console.log("🧠 Using Gemini for deep analysis (online)");
        return geminiService;
    }

    /**
     * Check current mode status
     */
    getStatus(): {
        configuredMode: ServiceMode;
        ollamaAvailable: boolean | null;
    } {
        return {
            configuredMode: this.mode,
            ollamaAvailable: this.ollamaAvailable,
        };
    }

    /**
     * Force refresh Ollama availability check
     */
    async refreshOllamaStatus(): Promise<boolean> {
        this.ollamaAvailable = null;
        return this.checkOllamaAvailability();
    }

    /**
     * Set mode programmatically
     */
    setMode(mode: ServiceMode): void {
        this.mode = mode;
        console.log(`🔧 Service Factory mode changed to "${mode}"`);
    }
}

export const serviceFactory = new ServiceFactory();
