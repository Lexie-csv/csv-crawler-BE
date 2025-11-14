/**
 * DigestService Tests
 */

import { digestService, DigestService } from './digest.service';

// Mock the database
jest.mock('@csv/db', () => ({
  query: jest.fn(),
  queryOne: jest.fn(),
}));

import { query } from '@csv/db';

describe('DigestService', () => {
  let service: DigestService;

  beforeEach(() => {
    service = new DigestService();
    jest.clearAllMocks();
  });

  describe('generateDigest', () => {
    it('should generate digest with datapoints and documents', async () => {
      const mockDatapoints = [
        {
          id: '1',
          category: 'Banking',
          subcategory: 'Capital Requirements',
          title: 'New CAR threshold',
          value: '12%',
          date_value: '2025-01-01',
          url: 'https://example.com',
          source_name: 'BSP',
          source_country: 'PH',
          source_sector: 'Banking',
        },
      ];

      const mockDocuments = [
        {
          id: 'doc1',
          title: 'BSP Circular 2025-01',
          url: 'https://example.com/doc',
          source_name: 'BSP',
          published_at: '2025-01-01',
          datapoint_count: 1,
        },
      ];

      (query as jest.Mock)
        .mockResolvedValueOnce(mockDatapoints) // First call: fetch datapoints
        .mockResolvedValueOnce(mockDocuments); // Second call: fetch documents

      const periodStart = new Date('2025-01-01');
      const periodEnd = new Date('2025-01-08');

      const digest = await service.generateDigest({
        periodStart,
        periodEnd,
      });

      expect(digest.subject).toContain('Policy & Data Crawler Weekly Digest');
      expect(digest.datapointCount).toBe(1);
      expect(digest.documentCount).toBe(1);
      expect(digest.contentMarkdown).toContain('BSP');
      expect(digest.contentHtml).toContain('BSP');
    });

    it('should handle empty results', async () => {
      (query as jest.Mock)
        .mockResolvedValueOnce([]) // No datapoints
        .mockResolvedValueOnce([]); // No documents

      const periodStart = new Date('2025-01-01');
      const periodEnd = new Date('2025-01-08');

      const digest = await service.generateDigest({
        periodStart,
        periodEnd,
      });

      expect(digest.datapointCount).toBe(0);
      expect(digest.documentCount).toBe(0);
      expect(digest.contentMarkdown).toContain('No new datapoints');
      expect(digest.contentHtml).toContain('No new datapoints');
    });

    it('should group datapoints by country and sector', async () => {
      const mockDatapoints = [
        {
          id: '1',
          category: 'Banking',
          subcategory: null,
          title: 'Philippines Banking Update',
          value: '10%',
          date_value: '2025-01-01',
          url: 'https://example.com',
          source_name: 'BSP',
          source_country: 'PH',
          source_sector: 'Banking',
        },
        {
          id: '2',
          category: 'Energy',
          subcategory: null,
          title: 'Singapore Energy Policy',
          value: '5 GW',
          date_value: '2025-01-02',
          url: 'https://example.com',
          source_name: 'EMA',
          source_country: 'SG',
          source_sector: 'Energy',
        },
      ];

      (query as jest.Mock)
        .mockResolvedValueOnce(mockDatapoints)
        .mockResolvedValueOnce([]);

      const periodStart = new Date('2025-01-01');
      const periodEnd = new Date('2025-01-08');

      const digest = await service.generateDigest({
        periodStart,
        periodEnd,
      });

      expect(digest.contentMarkdown).toContain('PH — Banking');
      expect(digest.contentMarkdown).toContain('SG — Energy');
    });

    it('should filter by countries when provided', async () => {
      (query as jest.Mock)
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      const periodStart = new Date('2025-01-01');
      const periodEnd = new Date('2025-01-08');

      await service.generateDigest({
        periodStart,
        periodEnd,
        countries: ['PH', 'SG'],
      });

      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('s.country = ANY($3)'),
        expect.arrayContaining([periodStart, periodEnd, ['PH', 'SG']])
      );
    });
  });
});
