/**
 * Policy Scanner Integration Test
 * 
 * Tests the full pipeline: scan -> extract -> digest -> export
 */

import { PolicyScanner } from '../services/policy.scanner';
import { DigestGenerator } from '../services/digest.generator';
import { ExportService } from '../services/export.service';

describe('Policy Scanner Integration', () => {
    let scanner: PolicyScanner;
    let digestGenerator: DigestGenerator;
    let exportService: ExportService;

    beforeAll(() => {
        scanner = new PolicyScanner();
        digestGenerator = new DigestGenerator();
        exportService = new ExportService('./storage/test-exports');
    });

    afterAll(async () => {
        await scanner.closeBrowser();
    });

    describe('Scanner', () => {
        it('should scan a URL and detect relevance', async () => {
            // Use a simple test URL
            const result = await scanner.scan('https://example.com', {
                useHeadless: false,
                timeout: 10000,
            });

            expect(result).toBeDefined();
            expect(result.url).toBe('https://example.com');
            expect(result.title).toBeTruthy();
            expect(result.contentHash).toBeTruthy();
            expect(typeof result.isRelevant).toBe('boolean');
            expect(result.relevanceScore).toBeGreaterThanOrEqual(0);
            expect(result.relevanceScore).toBeLessThanOrEqual(100);
            expect(Array.isArray(result.signals)).toBe(true);
            expect(result.metadata).toBeDefined();
            expect(result.metadata.method).toMatch(/fetch|headless/);
        }, 30000);

        it('should use headless browser for JS-heavy sites', async () => {
            const result = await scanner.scan('https://www.wesm.ph', {
                timeout: 15000,
            });

            expect(result.metadata.method).toBe('headless');
            expect(typeof result.metadata.hasJavaScript).toBe('boolean');
        }, 30000);
    });

    describe('Digest Generator', () => {
        it('should generate executive digest from scan results', async () => {
            const mockResults = [
                {
                    url: 'https://example.com/circular',
                    title: 'SEC Circular 2025-01',
                    content: '<html>...</html>',
                    extractedText: 'SEC Circular No. 2025-01 effective December 1, 2025...',
                    contentHash: 'abc123',
                    isRelevant: true,
                    relevanceScore: 95,
                    relevanceReason: 'Contains new circular with effective date',
                    signals: [
                        {
                            type: 'circular' as const,
                            title: 'SEC Circular 2025-01',
                            description: 'New reporting requirements',
                            effectiveDate: new Date('2025-12-01'),
                            impactedParties: ['public companies'],
                            confidence: 0.95,
                        },
                    ],
                    metadata: {
                        scrapedAt: new Date(),
                        method: 'fetch' as const,
                        hasJavaScript: false,
                        contentLength: 1000,
                    },
                },
            ];

            const digest = await digestGenerator.generate(mockResults, 'November 15-19, 2025');

            expect(digest).toBeDefined();
            expect(digest.title).toContain('November 15-19, 2025');
            expect(digest.sections.whatChanged.length).toBeGreaterThan(0);
            expect(digest.metadata.totalDocuments).toBe(1);
            expect(digest.metadata.relevantDocuments).toBe(1);
            expect(digest.metadata.signalsDetected).toBe(1);
        });

        it('should format digest as markdown', async () => {
            const mockDigest = {
                id: 'test-digest',
                generatedAt: new Date(),
                period: 'November 15-19, 2025',
                title: 'Test Digest',
                summary: 'Test summary',
                sections: {
                    whatChanged: [
                        {
                            title: 'Test Section',
                            content: 'Test content',
                            priority: 'high' as const,
                        },
                    ],
                    soWhat: [],
                    whatToWatch: [],
                },
                keyDatapoints: [],
                sources: ['https://example.com'],
                metadata: {
                    totalDocuments: 1,
                    relevantDocuments: 1,
                    signalsDetected: 1,
                },
            };

            const markdown = digestGenerator.formatAsMarkdown(mockDigest);

            expect(markdown).toContain('# Test Digest');
            expect(markdown).toContain('## Executive Summary');
            expect(markdown).toContain('## 📋 What Changed');
            expect(markdown).toContain('Test Section');
        });
    });

    describe('Export Service', () => {
        it('should export scan results to JSON', async () => {
            const mockResults = [
                {
                    url: 'https://example.com',
                    title: 'Test Page',
                    content: '<html></html>',
                    extractedText: 'Test content',
                    contentHash: 'abc123',
                    isRelevant: false,
                    relevanceScore: 40,
                    relevanceReason: 'Generic page',
                    signals: [],
                    metadata: {
                        scrapedAt: new Date(),
                        method: 'fetch' as const,
                        hasJavaScript: false,
                        contentLength: 100,
                    },
                },
            ];

            const result = await exportService.exportScanResults(mockResults, {
                formats: ['json'],
                includeMetadata: true,
            });

            expect(result.success).toBe(true);
            expect(result.files.length).toBeGreaterThan(0);
            expect(result.files[0]).toMatch(/\.json$/);
            expect(result.errors.length).toBe(0);
        });

        it('should export datapoints to CSV', async () => {
            const mockDatapoints = [
                {
                    category: 'Rate Change',
                    key: 'Corporate Tax',
                    newValue: '25%',
                    effectiveDate: new Date('2025-12-01'),
                    source: 'BIR',
                    impact: 'high' as const,
                },
            ];

            const filePath = await exportService.exportDatapointsToCSV(mockDatapoints);

            expect(filePath).toMatch(/\.csv$/);
            expect(filePath).toContain('datapoints_');
        });
    });
});
