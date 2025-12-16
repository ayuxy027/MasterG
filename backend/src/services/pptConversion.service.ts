import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs/promises';
import { existsSync } from 'fs';

const execPromise = promisify(exec);

/**
 * PPT/PPTX to PDF Conversion Service
 * Uses LibreOffice (soffice) for conversion
 * 
 * Requirements:
 * - LibreOffice must be installed on the system
 * - Windows: soffice.exe in PATH or default install location
 * - Linux/Docker: libreoffice package installed
 */
class PPTConversionService {
    private libreOfficePath: string | null = null;
    private isAvailable: boolean | null = null;

    /**
     * Find LibreOffice executable path
     */
    private async findLibreOffice(): Promise<string | null> {
        // Common paths for LibreOffice
        const possiblePaths = [
            // Windows
            'C:\\Program Files\\LibreOffice\\program\\soffice.exe',
            'C:\\Program Files (x86)\\LibreOffice\\program\\soffice.exe',
            // Linux/Docker
            '/usr/bin/soffice',
            '/usr/bin/libreoffice',
            '/usr/local/bin/soffice',
            // macOS
            '/Applications/LibreOffice.app/Contents/MacOS/soffice',
        ];

        for (const libPath of possiblePaths) {
            if (existsSync(libPath)) {
                console.log(`✅ Found LibreOffice at: ${libPath}`);
                return libPath;
            }
        }

        // Try to find in PATH
        try {
            const { stdout } = await execPromise(process.platform === 'win32' ? 'where soffice' : 'which soffice');
            const foundPath = stdout.trim().split('\n')[0];
            if (foundPath && existsSync(foundPath)) {
                console.log(`✅ Found LibreOffice in PATH: ${foundPath}`);
                return foundPath;
            }
        } catch {
            // Not in PATH
        }

        console.warn('⚠️ LibreOffice not found. PPT preview will use text fallback.');
        return null;
    }

    /**
     * Check if conversion is available
     */
    async isConversionAvailable(): Promise<boolean> {
        if (this.isAvailable !== null) {
            return this.isAvailable;
        }

        this.libreOfficePath = await this.findLibreOffice();
        this.isAvailable = this.libreOfficePath !== null;
        return this.isAvailable;
    }

    /**
     * Convert PPT/PPTX to PDF
     * Returns path to the generated PDF file
     */
    async convertToPDF(inputPath: string, outputDir: string): Promise<string | null> {
        try {
            if (!await this.isConversionAvailable()) {
                console.log('📊 LibreOffice not available, skipping PPT→PDF conversion');
                return null;
            }

            const inputFileName = path.basename(inputPath);
            const baseName = path.parse(inputFileName).name;
            const outputPdfPath = path.join(outputDir, `${baseName}.pdf`);

            console.log(`🔄 Converting PPT to PDF: ${inputFileName}`);

            // Ensure output directory exists
            await fs.mkdir(outputDir, { recursive: true });

            // LibreOffice headless conversion command
            // --headless: No GUI
            // --convert-to pdf: Convert to PDF format
            // --outdir: Output directory
            const command = `"${this.libreOfficePath}" --headless --convert-to pdf --outdir "${outputDir}" "${inputPath}"`;

            console.log(`📝 Running: ${command}`);

            const { stdout, stderr } = await execPromise(command, {
                timeout: 120000, // 2 minute timeout for large files
            });

            if (stderr && !stderr.includes('warn')) {
                console.warn('LibreOffice stderr:', stderr);
            }

            // Check if PDF was created
            if (existsSync(outputPdfPath)) {
                console.log(`✅ PDF created: ${outputPdfPath}`);
                return outputPdfPath;
            }

            // LibreOffice might output with slightly different name
            const files = await fs.readdir(outputDir);
            const pdfFile = files.find(f => f.endsWith('.pdf') && f.startsWith(baseName.substring(0, 10)));

            if (pdfFile) {
                const actualPdfPath = path.join(outputDir, pdfFile);
                console.log(`✅ PDF created (alternate name): ${actualPdfPath}`);
                return actualPdfPath;
            }

            console.error('❌ PDF file not found after conversion');
            console.log('stdout:', stdout);
            return null;

        } catch (error: any) {
            console.error('❌ PPT to PDF conversion failed:', error.message);
            return null;
        }
    }

    /**
     * Convert PPT and store alongside original file
     * Returns the PDF file path if successful
     */
    async convertAndStore(
        originalPath: string,
        fileId: string,
        outputDir: string
    ): Promise<{ pdfPath: string | null; pdfFileId: string }> {
        const pdfFileId = `${fileId}_preview`;

        try {
            const pdfPath = await this.convertToPDF(originalPath, outputDir);

            if (pdfPath) {
                // Rename to use our fileId naming convention
                const finalPdfPath = path.join(outputDir, `${pdfFileId}.pdf`);

                if (pdfPath !== finalPdfPath) {
                    await fs.rename(pdfPath, finalPdfPath);
                }

                console.log(`✅ PPT preview PDF stored: ${finalPdfPath}`);
                return { pdfPath: finalPdfPath, pdfFileId };
            }

            return { pdfPath: null, pdfFileId };
        } catch (error: any) {
            console.error('PPT conversion error:', error);
            return { pdfPath: null, pdfFileId };
        }
    }

    /**
     * Check if a preview PDF exists for a file
     */
    async getPreviewPdfPath(
        userId: string,
        sessionId: string,
        fileId: string,
        baseDir: string
    ): Promise<string | null> {
        const previewFileId = `${fileId}_preview`;
        const sessionPath = path.join(baseDir, userId, sessionId);
        const pdfPath = path.join(sessionPath, `${previewFileId}.pdf`);

        if (existsSync(pdfPath)) {
            return pdfPath;
        }

        return null;
    }
}

export const pptConversionService = new PPTConversionService();
