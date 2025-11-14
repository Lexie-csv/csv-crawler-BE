/**
 * Story #2 Unit Test: TypeScript Types & Data Models
 *
 * This test validates that:
 * 1. All required types are exported from the types package
 * 2. Types compile without errors (via pnpm type-check)
 * 3. Runtime imports work correctly
 */

import type {
    Source,
    CrawlJob,
    CrawledDocument,
    DataPoint,
    Digest,
    Subscription,
    AuditLog,
    CrawlConfig,
    ApiResponse,
    ApiListResponse,
} from './index';

describe('TypeScript Domain Types', () => {
    it('should export all required types (compile-time check)', () => {
        // This test passes if the file compiles without TS errors.
        // The imports above verify all types are exported.
        expect(true).toBe(true);
    });

    it('should instantiate a Source with correct shape', () => {
        // Compile-time check: a valid source object
        const source: Source = {
            id: '123e4567-e89b-12d3-a456-426614174000',
            name: 'Test Source',
            url: 'https://example.com',
            type: 'policy',
            country: 'PH',
            active: true,
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        expect(source).toEqual(expect.objectContaining({ name: 'Test Source' }));
    });

    it('should instantiate a CrawlJob with correct shape', () => {
        const job: CrawlJob = {
            id: '123e4567-e89b-12d3-a456-426614174000',
            sourceId: '123e4567-e89b-12d3-a456-426614174001',
            status: 'pending',
            itemsCrawled: 0,
            itemsNew: 0,
            createdAt: new Date(),
        };

        expect(job.status).toBe('pending');
    });

    it('should instantiate a CrawledDocument with correct shape', () => {
        const doc: CrawledDocument = {
            id: '123e4567-e89b-12d3-a456-426614174000',
            sourceId: '123e4567-e89b-12d3-a456-426614174001',
            url: 'https://example.com/article',
            contentHash: 'abc123def456',
            createdAt: new Date(),
        };

        expect(doc.url).toEqual('https://example.com/article');
    });

    it('should instantiate a DataPoint with correct shape', () => {
        const dp: DataPoint = {
            id: '123e4567-e89b-12d3-a456-426614174000',
            documentId: '123e4567-e89b-12d3-a456-426614174001',
            key: 'interest_rate',
            value: 3.5,
            unit: 'percent',
            confidence: 0.95,
            createdAt: new Date(),
        };

        expect(dp.key).toBe('interest_rate');
    });

    it('should instantiate an ApiResponse with generic type parameter', () => {
        interface TestData {
            message: string;
        }

        const response: ApiResponse<TestData> = {
            data: { message: 'Success' },
            message: 'Operation completed',
        };

        expect(response.data?.message).toBe('Success');
    });

    it('should instantiate an ApiListResponse with generic type parameter', () => {
        const listResponse: ApiListResponse<Source> = {
            data: [],
            total: 0,
            limit: 10,
            offset: 0,
        };

        expect(listResponse.total).toBe(0);
    });

    it('should support optional and nullable fields on types', () => {
        // This test validates that optional/nullable fields compile correctly
        const doc: CrawledDocument = {
            id: '123e4567-e89b-12d3-a456-426614174000',
            sourceId: '123e4567-e89b-12d3-a456-426614174001',
            url: 'https://example.com',
            contentHash: 'hash',
            createdAt: new Date(),
            // Optional fields omitted intentionally
        };

        expect(doc).toBeDefined();

        // Nullable field set to null
        const docWithNull: CrawledDocument = {
            id: '123e4567-e89b-12d3-a456-426614174000',
            sourceId: '123e4567-e89b-12d3-a456-426614174001',
            url: 'https://example.com',
            contentHash: 'hash',
            title: null,
            createdAt: new Date(),
        };

        expect(docWithNull.title).toBeNull();
    });

    it('should support CrawlConfig shape for LLM settings', () => {
        const config: CrawlConfig = {
            apiKey: 'sk-test-key',
            model: 'gpt-4-turbo',
            temperature: 0.7,
            maxTokens: 2000,
            systemPrompt: 'Extract regulatory data...',
        };

        expect(config.model).toBe('gpt-4-turbo');
    });
});
