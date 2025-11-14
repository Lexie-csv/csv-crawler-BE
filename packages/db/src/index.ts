import { Pool, QueryResult } from 'pg';

/**
 * Initialize PostgreSQL connection pool with environment config
 */
export function createPool(): Pool {
    const isProduction = process.env.NODE_ENV === 'production';
    const maxConnections = isProduction ? 20 : 10;

    const pool = new Pool({
        connectionString:
            process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/csv_crawler',
        max: maxConnections,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000,
    });

    // Log connection pool events
    pool.on('error', (err) => {
        console.error('Unexpected error on idle client', err);
    });

    pool.on('connect', () => {
        if (process.env.LOG_LEVEL === 'debug') {
            console.log('[DB] Client connected to pool');
        }
    });

    pool.on('remove', () => {
        if (process.env.LOG_LEVEL === 'debug') {
            console.log('[DB] Client removed from pool');
        }
    });

    return pool;
}

/**
 * Global singleton pool instance
 */
let pool: Pool | null = null;

export function getPool(): Pool {
    if (!pool) {
        pool = createPool();
    }
    return pool;
}

/**
 * Type-safe query function: returns array of rows (generic type T)
 */
export async function query<T = Record<string, unknown>>(
    sql: string,
    params?: unknown[]
): Promise<T[]> {
    const client = await getPool().connect();
    try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const result: QueryResult<any> = await client.query(sql, params);
        return result.rows as T[];
    } catch (err) {
        console.error('[DB] Query error:', { sql, params, error: err });
        throw err;
    } finally {
        client.release();
    }
}

/**
 * Type-safe query function: returns single row or null (generic type T)
 */
export async function queryOne<T = Record<string, unknown>>(
    sql: string,
    params?: unknown[]
): Promise<T | null> {
    const rows = await query<T>(sql, params);
    return rows.length > 0 ? rows[0] : null;
}

/**
 * Health check: verify pool connectivity
 */
export async function healthCheck(): Promise<{ ok: boolean; message: string }> {
    try {
        const result = await query<{ now: Date }>('SELECT NOW() as now');
        if (result.length === 0) {
            return { ok: false, message: 'Health check returned no results' };
        }
        return { ok: true, message: 'Database connection healthy' };
    } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return { ok: false, message: `Health check failed: ${message}` };
    }
}

/**
 * Graceful shutdown: close all connections
 */
export async function closePool(): Promise<void> {
    if (pool) {
        try {
            await pool.end();
            console.log('[DB] Connection pool closed');
            pool = null;
        } catch (err) {
            console.error('[DB] Error closing pool:', err);
            throw err;
        }
    }
}

/**
 * Handle graceful shutdown on process signals
 */
export function setupGracefulShutdown(): void {
    const signals = ['SIGTERM', 'SIGINT'];

    signals.forEach((signal) => {
        process.on(signal, async () => {
            console.log(`[DB] Received ${signal}, closing pool...`);
            await closePool();
            process.exit(0);
        });
    });
}

export { Pool };
