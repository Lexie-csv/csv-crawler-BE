/**
 * Story #3 Integration Tests: Database Connection Pool & Query Utilities
 *
 * These tests verify:
 * 1. Pool can connect to PostgreSQL
 * 2. query() returns typed results
 * 3. queryOne() returns correct value or null
 * 4. Pool closes cleanly on shutdown
 * 5. Connection errors are properly caught and logged
 */

import { query, queryOne, healthCheck, closePool, getPool } from './index';

describe('Database Connection Pool (integration)', () => {
    jest.setTimeout(15000);

    beforeAll(async () => {
        // Ensure pool is initialized before tests
        getPool();
    });

    afterAll(async () => {
        // Clean up pool after all tests
        await closePool();
    });

    it('should connect to PostgreSQL via pool', async () => {
        const result = await query<{ now: Date }>('SELECT NOW() as now');
        expect(result).toHaveLength(1);
        expect(result[0]).toHaveProperty('now');
        expect(result[0].now).toBeInstanceOf(Date);
    });

    it('should return typed results from query()', async () => {
        // Verify sources table exists (from migrations)
        const result = await query<{ table_name: string }>(
            `SELECT table_name FROM information_schema.tables
       WHERE table_schema='public' AND table_name='sources'`
        );
        expect(result).toHaveLength(1);
        expect(result[0].table_name).toBe('sources');
    });

    it('should return single row or null from queryOne()', async () => {
        // Query a table that should exist
        const source = await queryOne<{ table_name: string }>(
            `SELECT table_name FROM information_schema.tables
       WHERE table_schema='public' AND table_name='sources'`
        );
        expect(source).not.toBeNull();
        expect(source?.table_name).toBe('sources');
    });

    it('should return null from queryOne() on empty result', async () => {
        // Query with WHERE clause that matches nothing
        const result = await queryOne<{ table_name: string }>(
            `SELECT table_name FROM information_schema.tables
       WHERE table_schema='public' AND table_name='nonexistent_table'`
        );
        expect(result).toBeNull();
    });

    it('should pass health check with database connectivity', async () => {
        const health = await healthCheck();
        expect(health.ok).toBe(true);
        expect(health.message).toContain('healthy');
    });

    it('should handle query errors gracefully', async () => {
        // Invalid SQL should throw
        await expect(query('SELECT * FROM nonexistent_table')).rejects.toThrow();
    });

    it('should have active pool instance', () => {
        const pool = getPool();
        expect(pool).toBeDefined();
        expect(pool.totalCount).toBeGreaterThanOrEqual(1);
    });

    it('should close pool cleanly', async () => {
        // Create a new pool for this test
        const { createPool } = await import('./index');
        const testPool = createPool();

        const connection = await testPool.connect();
        connection.release();

        await testPool.end();

        // Attempting to query after pool.end() should fail
        await expect(testPool.query('SELECT 1')).rejects.toThrow();
    });
});
