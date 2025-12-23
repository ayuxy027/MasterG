/**
 * llama.rn Type Definitions
 * Custom types for llama.rn v0.10 compatibility
 */

// llama.rn completion parameters
export interface LlamaCompletionParams {
    prompt: string;
    n_predict?: number;
    temperature?: number;
    top_p?: number;
    top_k?: number;
    stop?: string[];
    messages?: Array<{
        role: 'user' | 'assistant' | 'system';
        content: string | Array<{ type: string; text?: string; image_url?: { url: string } }>;
    }>;
}

// llama.rn initialization parameters
export interface LlamaInitParams {
    model: string;
    n_ctx?: number;
    n_gpu_layers?: number;
    n_batch?: number;
    seed?: number;
    f16_kv?: boolean;
    logits_all?: boolean;
    vocab_only?: boolean;
    use_mmap?: boolean;
    use_mlock?: boolean;
    ctx_shift?: boolean;
}

// llama.rn multimodal initialization
export interface LlamaMultimodalParams {
    path: string;
    use_gpu?: boolean;
}

// Completion result
export interface LlamaCompletionResult {
    text: string;
    tokens?: number;
}

// Token callback data
export interface LlamaTokenData {
    token: string;
}
