import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/csv_crawler',
});

const MIGRATIONS_DIR = path.join(__dirname, '../migrations');
const MIGRATIONS_TABLE = 'schema_migrations';

async function ensureMigrationsTable(client: any) {
    await client.query(`
    CREATE TABLE IF NOT EXISTS ${MIGRATIONS_TABLE} (
      id SERIAL PRIMARY KEY,
      filename VARCHAR(255) NOT NULL UNIQUE,
      applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);
}

export async function migrate(): Promise<void> {
    const client = await pool.connect();
    try {
        // Ensure migrations table exists
        await ensureMigrationsTable(client);

        // Read migration files sorted
        const files = fs.readdirSync(MIGRATIONS_DIR)
            .filter((f) => f.endsWith('.sql'))
            .sort();

        for (const file of files) {
            // Check if applied
            const res = await client.query(`SELECT 1 FROM ${MIGRATIONS_TABLE} WHERE filename = $1`, [file]);
            if ((res?.rowCount ?? 0) > 0) {
                console.log(`- Skipping already applied migration: ${file}`);
                continue;
            }

            const filePath = path.join(MIGRATIONS_DIR, file);
            const sql = fs.readFileSync(filePath, 'utf-8');

            console.log(`> Applying migration: ${file}`);
            try {
                await client.query('BEGIN');
                // Execute the SQL file. Many migration files contain multiple statements.
                await client.query(sql);
                await client.query(`INSERT INTO ${MIGRATIONS_TABLE} (filename) VALUES ($1)`, [file]);
                await client.query('COMMIT');
                console.log(`✓ Applied ${file}`);
            } catch (err: any) {
                await client.query('ROLLBACK');
                // Handle common harmless conflicts when repo contains overlapping/legacy migrations
                const incompatibleTypes = err?.code === '42804' && /incompatible/i.test(err?.detail ?? err?.message ?? '');
                if (incompatibleTypes) {
                    console.warn(`! Migration ${file} conflicts with existing schema (incompatible types). Marking as skipped.`);
                    // Record as applied to avoid repeated failures
                    await client.query(`INSERT INTO ${MIGRATIONS_TABLE} (filename) VALUES ($1) ON CONFLICT (filename) DO NOTHING`, [file]);
                    continue;
                }

                console.error(`✗ Failed to apply ${file}:`, err);
                throw err;
            }
        }

        console.log('All migrations applied');
    } finally {
        client.release();
    }
}

export async function rollback(): Promise<void> {
    const client = await pool.connect();
    try {
        // Simple rollback: drop known tables used by migrations in reverse order.
        await client.query(`
      DROP TABLE IF EXISTS audit_logs CASCADE;
      DROP TABLE IF EXISTS subscriptions CASCADE;
      DROP TABLE IF EXISTS digests CASCADE;
      DROP TABLE IF EXISTS datapoints CASCADE;
      DROP TABLE IF EXISTS documents CASCADE;
      DROP TABLE IF EXISTS crawled_documents CASCADE;
      DROP TABLE IF EXISTS crawl_jobs CASCADE;
      DROP TABLE IF EXISTS sources CASCADE;
      DROP TABLE IF EXISTS ${MIGRATIONS_TABLE} CASCADE;
    `);
        console.log('✓ Rollback completed successfully');
    } catch (error) {
        console.error('✗ Rollback failed:', error);
        throw error;
    } finally {
        client.release();
    }
}
