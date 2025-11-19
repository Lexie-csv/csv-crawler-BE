/**
 * Datapoint Query Service Tests
 */

import { DatapointQueryService } from './datapoint-query.service';
import * as db from '@csv/db';

// Mock database
jest.mock('@csv/db');
const mockQuery = db.query as jest.MockedFunction<typeof db.query>;

describe('DatapointQueryService', () => {
    let service: DatapointQueryService;

    beforeEach(() => {
        service = new DatapointQueryService();
        jest.clearAllMocks();
    });

    describe('queryDatapoints', () => {
        it('should query datapoints with basic filters', async () => {
            const mockDatapoints = [
                {
                    id: '1',
                    document_id: '101',
                    key: 'SOLAR_FIT',
                    value: '9.68',
                    unit: 'PHP/kWh',
                    effective_date: '2024-01-01',
                    source: 'ERC',
                    confidence: 0.95,
                    provenance: 'Table 1',
                    created_at: '2024-01-15',
                    updated_at: '2024-01-15',
                    source_name: 'Energy Regulatory Commission',
                    source_country: 'PH',
                    source_sector: 'energy',
                },
            ];

            mockQuery
                .mockResolvedValueOnce(mockDatapoints)
                .mockResolvedValueOnce([{ count: '1' }]);

            const result = await service.queryDatapoints({
                key: 'SOLAR_FIT',
                country: 'PH',
                limit: 10,
                offset: 0,
            });

            expect(result.data).toHaveLength(1);
            expect(result.data[0].key).toBe('SOLAR_FIT');
            expect(result.total).toBe(1);
            expect(result.hasMore).toBe(false);
            expect(mockQuery).toHaveBeenCalledTimes(2);
        });

        it('should apply date range filters', async () => {
            mockQuery
                .mockResolvedValueOnce([])
                .mockResolvedValueOnce([{ count: '0' }]);

            await service.queryDatapoints({
                startDate: '2024-01-01',
                endDate: '2024-12-31',
                limit: 50,
                offset: 0,
            });

            const sql = mockQuery.mock.calls[0][0] as string;
            expect(sql).toContain('dp.effective_date >= $');
            expect(sql).toContain('dp.effective_date <= $');
        });

        it('should validate limit bounds', async () => {
            await expect(
                service.queryDatapoints({ limit: 0 })
            ).rejects.toThrow('Limit must be between 1 and 10000');

            await expect(
                service.queryDatapoints({ limit: 10001 })
            ).rejects.toThrow('Limit must be between 1 and 10000');
        });

        it('should validate offset', async () => {
            await expect(
                service.queryDatapoints({ offset: -1 })
            ).rejects.toThrow('Offset must be >= 0');
        });

        it('should calculate pagination correctly', async () => {
            const mockData = Array.from({ length: 10 }, (_, i) => ({
                id: `${i}`,
                document_id: '101',
                key: 'TEST',
                value: '1',
                unit: null,
                effective_date: null,
                source: null,
                confidence: 0.9,
                provenance: null,
                created_at: '2024-01-01',
                updated_at: '2024-01-01',
            }));

            mockQuery
                .mockResolvedValueOnce(mockData)
                .mockResolvedValueOnce([{ count: '25' }]);

            const result = await service.queryDatapoints({
                limit: 10,
                offset: 10,
            });

            expect(result.data).toHaveLength(10);
            expect(result.total).toBe(25);
            expect(result.hasMore).toBe(true);
        });
    });

    describe('getTimeSeries', () => {
        it('should aggregate time series data monthly', async () => {
            const mockTimeSeries = [
                {
                    date: '2024-01-01',
                    avg: 9.5,
                    min: 9.0,
                    max: 10.0,
                    count: '5',
                },
                {
                    date: '2024-02-01',
                    avg: 9.8,
                    min: 9.5,
                    max: 10.2,
                    count: '3',
                },
            ];

            mockQuery.mockResolvedValueOnce(mockTimeSeries);

            const result = await service.getTimeSeries('SOLAR_FIT', {
                resolution: 'monthly',
                country: 'PH',
            });

            expect(result).toHaveLength(2);
            expect(result[0].date).toBe('2024-01-01');
            expect(result[0].avg).toBe(9.5);
            expect(result[0].count).toBe(5);
            expect(mockQuery).toHaveBeenCalledTimes(1);

            const sql = mockQuery.mock.calls[0][0] as string;
            expect(sql).toContain("DATE_TRUNC('month'");
        });

        it('should support daily resolution', async () => {
            mockQuery.mockResolvedValueOnce([]);

            await service.getTimeSeries('TEST_KEY', {
                resolution: 'daily',
            });

            const sql = mockQuery.mock.calls[0][0] as string;
            expect(sql).toContain('DATE(dp.effective_date)');
        });

        it('should support weekly resolution', async () => {
            mockQuery.mockResolvedValueOnce([]);

            await service.getTimeSeries('TEST_KEY', {
                resolution: 'weekly',
            });

            const sql = mockQuery.mock.calls[0][0] as string;
            expect(sql).toContain("DATE_TRUNC('week'");
        });

        it('should filter by date range', async () => {
            mockQuery.mockResolvedValueOnce([]);

            await service.getTimeSeries('TEST_KEY', {
                startDate: '2024-01-01',
                endDate: '2024-12-31',
                resolution: 'monthly',
            });

            const sql = mockQuery.mock.calls[0][0] as string;
            expect(sql).toContain('dp.effective_date >= $');
            expect(sql).toContain('dp.effective_date <= $');
        });
    });

    describe('exportToCSV', () => {
        it('should generate valid CSV output', async () => {
            const mockDatapoints = [
                {
                    id: '1',
                    document_id: '101',
                    key: 'SOLAR_FIT',
                    value: '9.68',
                    unit: 'PHP/kWh',
                    effective_date: '2024-01-01',
                    source: 'ERC',
                    confidence: 0.95,
                    provenance: 'Table 1',
                    created_at: '2024-01-15',
                    updated_at: '2024-01-15',
                    source_name: 'Energy Regulatory Commission',
                    source_country: 'PH',
                    source_sector: 'energy',
                },
            ];

            mockQuery
                .mockResolvedValueOnce(mockDatapoints)
                .mockResolvedValueOnce([{ count: '1' }]);

            const csv = await service.exportToCSV({ key: 'SOLAR_FIT' });

            expect(csv).toContain('ID,Key,Value,Unit,Effective Date');
            expect(csv).toContain('"1","SOLAR_FIT","9.68","PHP/kWh","2024-01-01"');
            expect(csv.split('\n').length).toBe(2); // header + 1 row
        });

        it('should handle empty results', async () => {
            mockQuery
                .mockResolvedValueOnce([])
                .mockResolvedValueOnce([{ count: '0' }]);

            const csv = await service.exportToCSV({});

            expect(csv).toContain('ID,Key,Value,Unit');
            expect(csv.split('\n').length).toBe(1); // header only
        });

        it('should escape CSV values', async () => {
            const mockDatapoints = [
                {
                    id: '1',
                    document_id: '101',
                    key: 'TEST',
                    value: 'Value with "quotes"',
                    unit: null,
                    effective_date: null,
                    source: 'Source, with comma',
                    confidence: 0.9,
                    provenance: null,
                    created_at: '2024-01-01',
                    updated_at: '2024-01-01',
                    source_name: 'Test Source',
                    source_country: 'PH',
                    source_sector: 'test',
                },
            ];

            mockQuery
                .mockResolvedValueOnce(mockDatapoints)
                .mockResolvedValueOnce([{ count: '1' }]);

            const csv = await service.exportToCSV({});

            expect(csv).toContain('"Value with "quotes""');
            expect(csv).toContain('"Source, with comma"');
        });
    });
});
