import { Pool } from 'pg';

const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/csv_crawler'
});

async function setupSources() {
    const sources = [
        {
            id: '10000000-0000-0000-0000-000000000001',
            name: 'DOE-circulars-test',
            url: 'https://legacy.doe.gov.ph/?q=laws-and-issuances/department-circular',
            country: 'PH',
            type: 'policy',
            sector: 'energy'
        },
        {
            id: '10000000-0000-0000-0000-000000000002',
            name: 'DOE-circulars',
            url: 'https://legacy.doe.gov.ph/?q=laws-and-issuances/department-circular',
            country: 'PH',
            type: 'policy',
            sector: 'energy'
        },
        {
            id: '10000000-0000-0000-0000-000000000003',
            name: 'DOE-main',
            url: 'https://doe.gov.ph/',
            country: 'PH',
            type: 'policy',
            sector: 'energy'
        },
        {
            id: '10000000-0000-0000-0000-000000000004',
            name: 'DOE-legacy-ERC',
            url: 'https://legacy.doe.gov.ph/energy-information-resources?q=electric-power/coe-erc',
            country: 'PH',
            type: 'policy',
            sector: 'energy'
        }
    ];

    for (const source of sources) {
        try {
            // Check if exists first
            const existing = await pool.query(
                `SELECT id FROM sources WHERE name = $1`,
                [source.name]
            );

            if (existing.rows.length > 0) {
                console.log(`✅ Source already exists: ${source.name} (${existing.rows[0].id})`);
                continue;
            }

            const result = await pool.query(
                `INSERT INTO sources (id, name, url, country, type, sector, active)
                 VALUES ($1, $2, $3, $4, $5, $6, true)
                 RETURNING id, name`,
                [source.id, source.name, source.url, source.country, source.type, source.sector]
            );
            console.log(`✅ Created source: ${result.rows[0].name} (${result.rows[0].id})`);
        } catch (error) {
            console.error(`❌ Failed to create source ${source.name}:`, error);
        }
    }

    await pool.end();
}

setupSources().catch(console.error);
