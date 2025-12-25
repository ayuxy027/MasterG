import { encoding_for_model } from 'tiktoken';

let encoder: ReturnType<typeof encoding_for_model> | null = null;

function getEncoder() {
    if (!encoder) {
        encoder = encoding_for_model('gpt-4');
    }
    return encoder;
}

export function countTokens(text: string): number {
    const enc = getEncoder();
    const tokens = enc.encode(text);
    return tokens.length;
}

export function truncateToTokens(text: string, maxTokens: number): string {
    const enc = getEncoder();
    const tokens = enc.encode(text);

    if (tokens.length <= maxTokens) {
        return text;
    }

    const truncated = tokens.slice(0, maxTokens);
    return new TextDecoder().decode(enc.decode(truncated));
}

export function splitByParagraphs(text: string): string[] {
    return text.split(/\n\n+/).filter(p => p.trim().length > 0);
}

export function splitRecursively(text: string, maxTokens: number): string[] {
    const tokenCount = countTokens(text);

    if (tokenCount <= maxTokens) {
        return [text];
    }

    const paragraphs = splitByParagraphs(text);

    if (paragraphs.length > 1) {
        const chunks: string[] = [];
        let currentChunk = '';

        for (const para of paragraphs) {
            const testChunk = currentChunk ? `${currentChunk}\n\n${para}` : para;

            if (countTokens(testChunk) <= maxTokens) {
                currentChunk = testChunk;
            } else {
                if (currentChunk) {
                    chunks.push(currentChunk);
                }

                if (countTokens(para) > maxTokens) {
                    chunks.push(...splitRecursively(para, maxTokens));
                } else {
                    currentChunk = para;
                }
            }
        }

        if (currentChunk) {
            chunks.push(currentChunk);
        }

        return chunks;
    }

    const mid = Math.floor(text.length / 2);
    const left = text.substring(0, mid);
    const right = text.substring(mid);

    return [
        ...splitRecursively(left, maxTokens),
        ...splitRecursively(right, maxTokens)
    ];
}
