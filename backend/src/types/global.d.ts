// Type declarations for packages without @types

declare namespace Express {
  export interface Request {
    file?: any;
    files?: any[];
  }
}

declare module 'pdf-parse' {
  const pdfParse: any;
  export = pdfParse;
}

declare module 'tesseract.js' {
  export const recognize: any;
  export const createWorker: any;
}

declare module 'uuid' {
  export function v4(): string;
}

declare module 'langchain/text_splitter' {
  export class RecursiveCharacterTextSplitter {
    constructor(config: any);
    createDocuments(texts: string[], metadatas?: any[]): Promise<any[]>;
  }
}

declare module 'chromadb' {
  export interface ChromaClientParams {
    path?: string;
  }

  export interface CollectionMetadata {
    description?: string;
    [key: string]: any;
  }

  export interface Collection {
    name: string;
    metadata?: CollectionMetadata;
    add(params: {
      ids: string[];
      embeddings: number[][];
      metadatas?: any[];
      documents?: string[];
    }): Promise<void>;
    query(params: {
      queryEmbeddings: number[][];
      nResults?: number;
      where?: any;
    }): Promise<{
      ids: string[][];
      distances: number[][];
      metadatas: any[][];
      documents: string[][];
    }>;
    get(params: { where?: any; ids?: string[] }): Promise<{
      ids: string[];
      embeddings?: number[][];
      metadatas?: any[];
      documents?: string[];
    }>;
    delete(params: { ids?: string[]; where?: any }): Promise<void>;
    count(): Promise<number>;
  }

  export class ChromaClient {
    constructor(params?: ChromaClientParams);
    getOrCreateCollection(params: {
      name: string;
      metadata?: CollectionMetadata;
    }): Promise<Collection>;
    deleteCollection(params: { name: string }): Promise<void>;
    listCollections(): Promise<Collection[]>;
  }
}
