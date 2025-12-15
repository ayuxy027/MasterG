import { Request, Response, Router } from 'express';
import path from 'path';
import fs from 'fs/promises';
import { createReadStream, statSync, existsSync } from 'fs';
import { documentService } from '../services/document.service';
import { fileStorageService } from '../services/fileStorage.service';

const router = Router();

// Get base directory for file storage (Docker-compatible)
const getBaseDir = () => {
    return process.env.FILE_STORAGE_DIR || path.join(process.cwd(), 'uploads', 'files');
};

/**
 * OPTIONS handler for CORS preflight
 */
router.options('/:fileId', (req: Request, res: Response) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Access-Control-Max-Age', '86400');
    res.status(204).end();
});

/**
 * GET /api/files/:fileId/preview
 * Serve converted PDF preview for PPT files
 */
router.get('/:fileId/preview', async (req: Request, res: Response) => {
    try {
        const { fileId } = req.params;
        const { userId, sessionId } = req.query;

        if (!userId || !sessionId) {
            res.status(400).json({ error: 'userId and sessionId required' });
            return;
        }

        console.log(`📊 Preview PDF request: fileId=${fileId}`);

        // Look for the converted PDF file
        const previewFileId = `${fileId}_preview`;
        const baseDir = getBaseDir();
        const sessionPath = path.join(baseDir, userId as string, sessionId as string);
        const previewPdfPath = path.join(sessionPath, `${previewFileId}.pdf`);

        if (!existsSync(previewPdfPath)) {
            // No preview PDF available, return 404
            res.status(404).json({
                error: 'Preview PDF not available',
                message: 'LibreOffice conversion was not available during upload. Use text preview instead.'
            });
            return;
        }

        const stats = statSync(previewPdfPath);

        // Set headers for PDF
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Length', stats.size);
        res.setHeader('Cache-Control', 'private, max-age=3600');
        res.setHeader('Accept-Ranges', 'bytes');
        res.setHeader('Access-Control-Allow-Origin', '*');

        // Stream the PDF
        const stream = createReadStream(previewPdfPath);
        stream.pipe(res);

        stream.on('error', (err) => {
            console.error('Preview PDF streaming error:', err);
            if (!res.headersSent) {
                res.status(500).json({ error: 'Failed to stream preview PDF' });
            }
        });

    } catch (error: any) {
        console.error('Preview PDF error:', error);
        res.status(500).json({ error: error.message || 'Failed to serve preview' });
    }
});

/**
 * GET /api/files/:fileId
 * Serve file for preview
 */
router.get('/:fileId', async (req: Request, res: Response) => {
    try {
        const { fileId } = req.params;
        const { userId, sessionId } = req.query;

        console.log(`📥 File request: fileId=${fileId}, userId=${userId}, sessionId=${sessionId}`);

        if (!userId || !sessionId) {
            res.status(400).json({ error: 'userId and sessionId required' });
            return;
        }

        // Use fileStorageService to find the file (more robust)
        const filePath = await fileStorageService.getFilePath(
            userId as string,
            sessionId as string,
            fileId
        );

        if (!filePath) {
            // Fallback: Try to find with documentService for mimeType
            const fileInfo = await documentService.getFileInfo(fileId);

            if (!fileInfo) {
                console.error(`❌ File not found: fileId=${fileId}`);
                res.status(404).json({ error: 'File not found in database' });
                return;
            }

            // Try constructing path manually
            const baseDir = getBaseDir();
            const ext = path.extname(fileInfo.fileName);
            const manualPath = path.join(baseDir, userId as string, sessionId as string, `${fileId}${ext}`);

            console.log(`🔍 Trying manual path: ${manualPath}`);

            if (!existsSync(manualPath)) {
                console.error(`❌ File not found on disk: ${manualPath}`);
                res.status(404).json({ error: 'File not found on disk' });
                return;
            }

            // Get file stats and stream
            const stats = statSync(manualPath);
            res.setHeader('Content-Type', fileInfo.mimeType || 'application/octet-stream');
            res.setHeader('Content-Length', stats.size);
            res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(fileInfo.fileName)}"`);
            res.setHeader('Cache-Control', 'private, max-age=3600');

            const stream = createReadStream(manualPath);
            stream.pipe(res);
            return;
        }

        console.log(`✅ Found file at: ${filePath}`);

        // Verify ownership via documentService
        const fileInfo = await documentService.getFileInfo(fileId);
        if (fileInfo && (fileInfo.userId !== userId || fileInfo.sessionId !== sessionId)) {
            res.status(403).json({ error: 'Access denied' });
            return;
        }

        // Get file stats
        const stats = statSync(filePath);
        const ext = path.extname(filePath).toLowerCase();

        // Determine MIME type
        const mimeTypes: Record<string, string> = {
            '.pdf': 'application/pdf',
            '.txt': 'text/plain',
            '.doc': 'application/msword',
            '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            '.ppt': 'application/vnd.ms-powerpoint',
            '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
            // Image formats
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.jfif': 'image/jpeg',
            '.jpe': 'image/jpeg',
            '.png': 'image/png',
            '.gif': 'image/gif',
            '.webp': 'image/webp',
            '.bmp': 'image/bmp',
            '.svg': 'image/svg+xml',
            '.ico': 'image/x-icon',
            '.tiff': 'image/tiff',
            '.tif': 'image/tiff',
            '.avif': 'image/avif',
            '.heic': 'image/heic',
            '.heif': 'image/heif',
        };

        const mimeType = fileInfo?.mimeType || mimeTypes[ext] || 'application/octet-stream';
        const fileName = fileInfo?.fileName || `file${ext}`;

        // Set headers for inline display (not download)
        res.setHeader('Content-Type', mimeType);
        res.setHeader('Content-Length', stats.size);

        // Only set Content-Disposition for file types that should download
        // PDFs and images should display inline without Content-Disposition
        const downloadTypes = ['.doc', '.docx', '.ppt', '.pptx', '.txt'];
        if (downloadTypes.includes(ext)) {
            res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(fileName)}"`);
        }

        // Cache control
        res.setHeader('Cache-Control', 'private, max-age=3600');

        // Enable range requests for better streaming
        res.setHeader('Accept-Ranges', 'bytes');

        // CORS headers for cross-origin access
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

        // For embedding in iframes
        res.setHeader('X-Content-Type-Options', 'nosniff');

        // Stream file
        const stream = createReadStream(filePath);
        stream.pipe(res);

        stream.on('error', (err) => {
            console.error('File streaming error:', err);
            if (!res.headersSent) {
                res.status(500).json({ error: 'Failed to stream file' });
            }
        });

    } catch (error: any) {
        console.error('File serve error:', error);
        res.status(500).json({ error: error.message || 'Failed to serve file' });
    }
});

/**
 * GET /api/files/:fileId/content
 * Get file content as text (for TXT files - reads from disk)
 */
router.get('/:fileId/content', async (req: Request, res: Response) => {
    try {
        const { fileId } = req.params;
        const { userId, sessionId } = req.query;

        if (!userId || !sessionId) {
            res.status(400).json({ error: 'userId and sessionId required' });
            return;
        }

        // Find file path
        const filePath = await fileStorageService.getFilePath(
            userId as string,
            sessionId as string,
            fileId
        );

        if (!filePath) {
            res.status(404).json({ error: 'File not found' });
            return;
        }

        // Read content
        const content = await fs.readFile(filePath, 'utf-8');

        // Get file info for name
        const fileInfo = await documentService.getFileInfo(fileId);

        res.json({
            success: true,
            content,
            fileName: fileInfo?.fileName || `file.txt`,
        });

    } catch (error: any) {
        console.error('File content error:', error);
        res.status(500).json({ error: error.message || 'Failed to read file content' });
    }
});

/**
 * GET /api/files/:fileId/text
 * Get extracted text content from MongoDB (for PPT, DOC files)
 * This returns the text that was extracted during upload
 */
router.get('/:fileId/text', async (req: Request, res: Response) => {
    try {
        const { fileId } = req.params;
        const { userId, sessionId } = req.query;

        if (!userId || !sessionId) {
            res.status(400).json({ error: 'userId and sessionId required' });
            return;
        }

        console.log(`📖 Fetching extracted text for fileId: ${fileId}`);

        // Get file info and content from MongoDB
        const fileInfo = await documentService.getFileInfo(fileId);

        if (!fileInfo) {
            res.status(404).json({ error: 'Document not found in database' });
            return;
        }

        // Verify ownership
        if (fileInfo.userId !== userId || fileInfo.sessionId !== sessionId) {
            res.status(403).json({ error: 'Access denied' });
            return;
        }

        // Get the full document content from MongoDB
        const fullContent = await documentService.getFullContent(fileId);

        if (!fullContent) {
            res.status(404).json({ error: 'No extracted text found for this document' });
            return;
        }

        console.log(`✅ Found extracted text: ${fullContent.length} characters`);

        res.json({
            success: true,
            content: fullContent,
            fileName: fileInfo.fileName,
            mimeType: fileInfo.mimeType,
            pageCount: fileInfo.pageCount,
        });

    } catch (error: any) {
        console.error('Get extracted text error:', error);
        res.status(500).json({ error: error.message || 'Failed to get extracted text' });
    }
});

/**
 * GET /api/files/:fileId/info
 * Get file metadata
 */
router.get('/:fileId/info', async (req: Request, res: Response) => {
    try {
        const { fileId } = req.params;
        const { userId, sessionId } = req.query;

        if (!userId || !sessionId) {
            res.status(400).json({ error: 'userId and sessionId required' });
            return;
        }

        const fileInfo = await documentService.getFileInfo(fileId);

        if (!fileInfo) {
            res.status(404).json({ error: 'File not found' });
            return;
        }

        if (fileInfo.userId !== userId || fileInfo.sessionId !== sessionId) {
            res.status(403).json({ error: 'Access denied' });
            return;
        }

        res.json({
            success: true,
            file: {
                fileId: fileInfo.fileId,
                fileName: fileInfo.fileName,
                mimeType: fileInfo.mimeType,
                pageCount: fileInfo.pageCount,
                language: fileInfo.language,
                uploadedAt: fileInfo.createdAt,
            },
        });

    } catch (error: any) {
        console.error('File info error:', error);
        res.status(500).json({ error: error.message || 'Failed to get file info' });
    }
});

export default router;
