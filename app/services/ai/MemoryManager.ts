/**
 * EduLite Mobile AI - Memory Manager
 * Handles memory monitoring and optimization for AI operations
 */

import { MemoryInfo } from '../../types/ai.types';
import { MEMORY_THRESHOLDS, MODEL_MEMORY_REQUIREMENTS } from './constants';

class MemoryManager {
    private static instance: MemoryManager;
    private memoryThreshold: number;
    private monitoringInterval: ReturnType<typeof setInterval> | null = null;
    private onHighMemoryCallback: ((info: MemoryInfo) => void) | null = null;

    private constructor() {
        this.memoryThreshold = MEMORY_THRESHOLDS.WARNING;
    }

    /**
     * Get singleton instance
     */
    static getInstance(): MemoryManager {
        if (!MemoryManager.instance) {
            MemoryManager.instance = new MemoryManager();
        }
        return MemoryManager.instance;
    }

    /**
     * Get current memory information
     * Note: In React Native, we estimate memory usage
     */
    async getMemoryInfo(): Promise<MemoryInfo> {
        try {
            // Estimate based on typical mobile device constraints
            // In production, use native modules for accurate readings
            const estimatedTotal = 4 * 1024 * 1024 * 1024; // Assume 4GB device
            const estimatedUsed = this.estimateUsedMemory();
            const available = estimatedTotal - estimatedUsed;
            const usagePercentage = (estimatedUsed / estimatedTotal) * 100;

            return {
                total: estimatedTotal,
                used: estimatedUsed,
                available,
                usagePercentage,
            };
        } catch (error) {
            console.error('Failed to get memory info:', error);
            // Return safe defaults
            return {
                total: 4 * 1024 * 1024 * 1024,
                used: 2 * 1024 * 1024 * 1024,
                available: 2 * 1024 * 1024 * 1024,
                usagePercentage: 50,
            };
        }
    }

    /**
     * Estimate used memory based on loaded models
     */
    private estimateUsedMemory(): number {
        // Base app memory usage
        let used = 200 * 1024 * 1024; // ~200MB base

        // Add model memory if loaded (this would be tracked in model manager)
        // For now, return base estimate
        return used;
    }

    /**
     * Check if there's enough memory for a specific operation
     */
    async checkMemoryAvailability(operation: 'text' | 'vision' | 'combined'): Promise<boolean> {
        const memoryInfo = await this.getMemoryInfo();
        const requiredMemory = MODEL_MEMORY_REQUIREMENTS[operation];

        const hasEnoughMemory = memoryInfo.available >= requiredMemory;

        if (!hasEnoughMemory) {
            console.warn(`⚠️ Insufficient memory for ${operation}. Available: ${this.formatBytes(memoryInfo.available)}, Required: ${this.formatBytes(requiredMemory)}`);
        }

        return hasEnoughMemory;
    }

    /**
     * Prepare memory for model loading
     */
    async prepareForModelLoad(modelType: 'text' | 'vision'): Promise<boolean> {
        const requiredMemory = MODEL_MEMORY_REQUIREMENTS[modelType];
        const memoryInfo = await this.getMemoryInfo();

        if (memoryInfo.available < requiredMemory) {
            console.log('🧹 Memory cleanup required before model load...');
            await this.performCleanup();

            // Check again after cleanup
            const updatedInfo = await this.getMemoryInfo();
            if (updatedInfo.available < requiredMemory) {
                console.error(`❌ Still insufficient memory after cleanup. Available: ${this.formatBytes(updatedInfo.available)}`);
                return false;
            }
        }

        return true;
    }

    /**
     * Perform memory cleanup
     */
    async performCleanup(): Promise<void> {
        console.log('🧹 Performing memory cleanup...');

        // 1. Request garbage collection (if available)
        if (typeof global !== 'undefined' && (global as any).gc) {
            (global as any).gc();
        }

        // 2. Clear any internal caches
        await this.clearCaches();

        // 3. Wait for GC to complete
        await new Promise(resolve => setTimeout(resolve, 100));

        console.log('✅ Memory cleanup completed');
    }

    /**
     * Clear application caches
     */
    private async clearCaches(): Promise<void> {
        // Clear inference result caches
        // This would be implemented when we have caching
        console.log('Clearing application caches...');
    }

    /**
     * Start memory monitoring
     */
    startMonitoring(intervalMs: number = 30000): void {
        if (this.monitoringInterval) {
            this.stopMonitoring();
        }

        console.log('📊 Starting memory monitoring...');

        this.monitoringInterval = setInterval(async () => {
            const memoryInfo = await this.getMemoryInfo();

            if (memoryInfo.usagePercentage >= MEMORY_THRESHOLDS.CRITICAL * 100) {
                console.warn('🚨 CRITICAL: Memory usage at', memoryInfo.usagePercentage.toFixed(1) + '%');
                await this.performCleanup();
            } else if (memoryInfo.usagePercentage >= MEMORY_THRESHOLDS.WARNING * 100) {
                console.warn('⚠️ WARNING: Memory usage at', memoryInfo.usagePercentage.toFixed(1) + '%');
                if (this.onHighMemoryCallback) {
                    this.onHighMemoryCallback(memoryInfo);
                }
            }
        }, intervalMs);
    }

    /**
     * Stop memory monitoring
     */
    stopMonitoring(): void {
        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
            this.monitoringInterval = null;
            console.log('📊 Memory monitoring stopped');
        }
    }

    /**
     * Set callback for high memory usage
     */
    onHighMemory(callback: (info: MemoryInfo) => void): void {
        this.onHighMemoryCallback = callback;
    }

    /**
     * Format bytes to human readable string
     */
    formatBytes(bytes: number): string {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
        return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
    }

    /**
     * Get memory status report
     */
    async getStatusReport(): Promise<string> {
        const info = await this.getMemoryInfo();
        return `
📊 Memory Status:
├── Total: ${this.formatBytes(info.total)}
├── Used: ${this.formatBytes(info.used)}
├── Available: ${this.formatBytes(info.available)}
└── Usage: ${info.usagePercentage.toFixed(1)}%
    `.trim();
    }
}

export default MemoryManager;
