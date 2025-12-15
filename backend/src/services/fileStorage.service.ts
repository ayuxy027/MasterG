import fs from 'fs/promises';
import path from 'path';

export interface StoredFile {
    fileId: string;
    userId: string;
    sessionId: string;
    fileName: string;
    originalName: string;
    mimeType: string;
    filePath: string;
    fileSize: number;
    storedAt: Date;
}

/**
 * File Storage Service
 * Manages persistent file storage for document preview
 */
class FileStorageService {
    private baseDir: string;

    constructor() {
        this.baseDir = process.env.FILE_STORAGE_DIR || path.join(process.cwd(), 'uploads', 'files');
        this.ensureBaseDir();
    }

    private async ensureBaseDir(): Promise<void> {
        try {
            await fs.mkdir(this.baseDir, { recursive: true });
        } catch (error) {
            console.error('Failed to create storage directory:', error);
        }
    }

    /**
     * Get storage path for a user/session
     */
    private getSessionPath(userId: string, sessionId: string): string {
        return path.join(this.baseDir, userId, sessionId);
    }

    /**
     * Store a file permanently
     * @param fileId - The fileId to use (from upload controller)
     * @param tempPath - Path to temp uploaded file
     * @param userId - User ID for folder structure
     * @param sessionId - Session ID for folder structure
     * @param originalName - Original filename
     * @param mimeType - MIME type
     */
    async storeFile(
        fileId: string,
        tempPath: string,
        userId: string,
        sessionId: string,
        originalName: string,
        mimeType: string
    ): Promise<StoredFile> {
        const ext = path.extname(originalName);
        const fileName = `${fileId}${ext}`;

        const sessionPath = this.getSessionPath(userId, sessionId);
        await fs.mkdir(sessionPath, { recursive: true });

        const filePath = path.join(sessionPath, fileName);

        // Copy file from temp to permanent storage
        await fs.copyFile(tempPath, filePath);

        // Get file stats
        const stats = await fs.stat(filePath);

        const storedFile: StoredFile = {
            fileId,
            userId,
            sessionId,
            fileName,
            originalName,
            mimeType,
            filePath,
            fileSize: stats.size,
            storedAt: new Date(),
        };

        console.log(`📁 Stored file: ${originalName} -> ${filePath}`);
        console.log(`📁 FileId: ${fileId}, Extension: ${ext}`);

        return storedFile;
    }

    /**
     * Get file path by ID
     */
    async getFilePath(userId: string, sessionId: string, fileId: string): Promise<string | null> {
        const sessionPath = this.getSessionPath(userId, sessionId);
        console.log(`🔍 Looking for file ${fileId} in: ${sessionPath}`);

        try {
            const files = await fs.readdir(sessionPath);
            console.log(`📂 Files in directory: ${files.join(', ')}`);

            const matchingFile = files.find(f => f.startsWith(fileId));

            if (matchingFile) {
                const filePath = path.join(sessionPath, matchingFile);
                console.log(`✅ Found file: ${filePath}`);
                return filePath;
            }
            console.log(`⚠️ No file starting with ${fileId} found`);
        } catch (error: any) {
            console.log(`❌ Directory not found or error: ${error.message}`);
        }

        return null;
    }

    /**
     * Read file as buffer
     */
    async readFile(filePath: string): Promise<Buffer> {
        return fs.readFile(filePath);
    }

    /**
     * Read file as text (for TXT files)
     */
    async readFileAsText(filePath: string): Promise<string> {
        return fs.readFile(filePath, 'utf-8');
    }

    /**
     * Delete a file
     */
    async deleteFile(filePath: string): Promise<void> {
        try {
            await fs.unlink(filePath);
            console.log(`🗑️ Deleted file: ${filePath}`);
        } catch (error) {
            console.error('Failed to delete file:', error);
        }
    }

    /**
     * Delete all files in a session
     */
    async deleteSessionFiles(userId: string, sessionId: string): Promise<void> {
        const sessionPath = this.getSessionPath(userId, sessionId);

        try {
            await fs.rm(sessionPath, { recursive: true, force: true });
            console.log(`🗑️ Deleted session files: ${sessionPath}`);
        } catch (error) {
            console.error('Failed to delete session files:', error);
        }
    }

    /**
     * Check if file exists
     */
    async fileExists(filePath: string): Promise<boolean> {
        try {
            await fs.access(filePath);
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Get file stats
     */
    async getFileStats(filePath: string): Promise<{ size: number; createdAt: Date } | null> {
        try {
            const stats = await fs.stat(filePath);
            return {
                size: stats.size,
                createdAt: stats.birthtime,
            };
        } catch {
            return null;
        }
    }
}

export const fileStorageService = new FileStorageService();
