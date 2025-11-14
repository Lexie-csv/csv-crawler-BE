import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import { Pool } from 'pg';

const execp = promisify(exec);
const ROOT = path.resolve(__dirname, '../../../');

describe('DB migrations (integration)', () => {
    jest.setTimeout(120000);

    it('applies migrations and creates expected tables', async () => {
        // Ensure a clean slate
        try {
            await execp('pnpm --filter @csv/db run migrate:rollback', { cwd: ROOT });
        } catch (e) {
            // ignore rollback errors
            // eslint-disable-next-line no-console
            console.warn('rollback warning:', (e as any).message || e);
        }

        // Run migrations
        const { stdout, stderr } = await execp('pnpm --filter @csv/db run migrate', { cwd: ROOT });
        // eslint-disable-next-line no-console
        console.log(stdout, stderr);

        const pool = new Pool({
            connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/csv_crawler',
        });

        const res = await pool.query(
            "SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name IN ('sources','documents','datapoints') ORDER BY table_name"
        );

        const names = res.rows.map((r) => r.table_name).sort();
        expect(names).toEqual(['datapoints', 'documents', 'sources']);

        await pool.end();
    });
});
