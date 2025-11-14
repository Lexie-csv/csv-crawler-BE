import { processDocument, runExtractionLoop } from './extraction.service';
import * as db from '@csv/db';

jest.mock('@csv/db');

describe('Extraction Service', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    const mockDoc = {
        id: 'doc1',
        source_id: 'source1',
        url: 'http://example.com/policy',
        content: 'Policy update: Q1 2025 target 15%',
        content_hash: 'hash123',
        classification: null,
        country: null,
        sector: null,
        themes: null,
        extracted_data: null,
        confidence: 0,
        verified: false,
        published_at: null,
        crawled_at: new Date(),
        created_at: new Date(),
        updated_at: new Date(),
    } as any;

    describe('processDocument', () => {
        it('should extract datapoints and mark document processed', async () => {
            const mockExtractor = jest.fn().mockResolvedValueOnce({
                datapoints: [
                    { key: 'target', value: '15', unit: '%', confidence: 0.8 },
                    { key: 'period', value: 'Q1 2025', confidence: 0.7 },
                ],
                classification: 'policy',
                country: 'PH',
                confidence: 0.8,
            });

            (db.query as jest.Mock)
                .mockResolvedValueOnce([
                    // insert datapoints return
                    { id: 'dp1', key: 'target', value: '15' },
                    { id: 'dp2', key: 'period', value: 'Q1 2025' },
                ])
                .mockResolvedValueOnce(undefined) // update metadata
                .mockResolvedValueOnce(undefined); // mark processed

            const result = await processDocument(mockDoc, mockExtractor);

            expect(result.success).toBe(true);
            expect(result.datapointsCount).toBe(2);
            expect(mockExtractor).toHaveBeenCalledWith(mockDoc.content);
            expect(db.query).toHaveBeenCalledTimes(3);
        });

        it('should handle documents with no content', async () => {
            const docWithoutContent = { ...mockDoc, content: null };

            const result = await processDocument(docWithoutContent);

            expect(result.success).toBe(false);
            expect(result.error).toContain('no content');
        });

        it('should filter out invalid datapoints', async () => {
            const mockExtractor = jest.fn().mockResolvedValueOnce({
                datapoints: [
                    { key: 'valid', value: '100' },
                    { key: '', value: 'invalid' }, // empty key
                    { key: 'novalue' }, // missing value
                ],
                classification: 'policy',
            });

            (db.query as jest.Mock)
                .mockResolvedValueOnce([{ id: 'dp1', key: 'valid', value: '100' }])
                .mockResolvedValueOnce(undefined)
                .mockResolvedValueOnce(undefined);

            const result = await processDocument(mockDoc, mockExtractor);

            expect(result.success).toBe(true);
            expect(result.datapointsCount).toBe(1);
        });

        it('should update document metadata (classification, country, etc.)', async () => {
            const mockExtractor = jest.fn().mockResolvedValueOnce({
                datapoints: [{ key: 'test', value: 'value' }],
                classification: 'regulation',
                country: 'SG',
                sector: 'Finance',
                themes: ['compliance', 'capital'],
                confidence: 0.9,
                verified: true,
            });

            (db.query as jest.Mock)
                .mockResolvedValueOnce([{ id: 'dp1' }])
                .mockResolvedValueOnce(undefined)
                .mockResolvedValueOnce(undefined);

            await processDocument(mockDoc, mockExtractor);

            const updateMetaCall = (db.query as jest.Mock).mock.calls[1];
            expect(updateMetaCall[0]).toContain('UPDATE documents');
            expect(updateMetaCall[1][0]).toBe('regulation'); // classification
            expect(updateMetaCall[1][1]).toBe('SG'); // country
            expect(updateMetaCall[1][2]).toBe('Finance'); // sector
        });

        it('should return error on extraction failure', async () => {
            const mockExtractor = jest
                .fn()
                .mockRejectedValueOnce(new Error('LLM error'));

            const result = await processDocument(mockDoc, mockExtractor);

            expect(result.success).toBe(false);
            expect(result.error).toContain('LLM error');
            expect(result.datapointsCount).toBe(0);
        });
    });

    describe('runExtractionLoop', () => {
        it(
            'should poll for unprocessed documents and process them',
            async () => {
                const stopSignal = { stop: false };
                const mockExtractor = jest.fn().mockResolvedValue({
                    datapoints: [],
                    classification: 'policy',
                });

                // Mock getUnprocessedDocuments to return one doc, then stop loop immediately
                let pollCount = 0;
                (db.query as jest.Mock).mockImplementation(() => {
                    pollCount++;
                    if (pollCount === 1) {
                        // First poll: get unprocessed docs
                        return Promise.resolve([mockDoc]);
                    }
                    // Second poll onwards: return empty to exit naturally
                    stopSignal.stop = true;
                    return Promise.resolve([]);
                });

                // Use a short timeout override for this test
                const originalEnv = process.env.EXTRACTION_POLL_MS;
                process.env.EXTRACTION_POLL_MS = '100'; // 100ms poll interval

                await runExtractionLoop(stopSignal, mockExtractor);

                process.env.EXTRACTION_POLL_MS = originalEnv;

                // Verify db.query was called multiple times (get docs + processing updates)
                expect(db.query).toHaveBeenCalled();
            },
            10000
        );
    });
});
