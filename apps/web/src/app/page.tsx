import Link from 'next/link';

export default function Page(): JSX.Element {
    return (
        <div className="min-h-screen bg-white">
            {/* Navigation */}
            <nav className="border-b border-border sticky top-0 z-50 bg-white">
                <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
                    <Link href="/" className="flex items-center gap-2">
                        <div className="text-2xl font-bold text-copy">CSV</div>
                        <span className="text-xs text-secondary font-medium">Policy & Data Crawler</span>
                    </Link>
                    <div className="flex gap-6">
                        <Link href="/sources" className="text-sm text-secondary hover:text-copy transition">
                            Sources
                        </Link>
                        <Link href="/crawl" className="text-sm text-secondary hover:text-copy transition">
                            Crawl Jobs
                        </Link>
                        <Link href="/digests" className="text-sm text-secondary hover:text-copy transition">
                            Digests
                        </Link>
                        <Link href="/documents" className="text-sm text-secondary hover:text-copy transition">
                            Documents
                        </Link>
                        <Link href="/datapoints" className="text-sm text-secondary hover:text-copy transition">
                            Datapoints
                        </Link>
                        <a href="http://localhost:3001/health" target="_blank" rel="noopener noreferrer" className="text-sm text-secondary hover:text-copy transition">
                            API
                        </a>
                    </div>
                </div>
            </nav>

            {/* Hero */}
            <section className="max-w-5xl mx-auto px-6 py-16">
                <div className="mb-12">
                    <h1 className="text-5xl font-bold text-copy mb-4 leading-tight">
                        Monitor regulatory & policy updates across Southeast Asia
                    </h1>
                    <p className="text-lg text-secondary mb-8 max-w-2xl">
                        Extract structured datapoints from policy documents, regulatory filings, and official sources. Build reliable inputs for financial models and research.
                    </p>
                    <div className="flex gap-4">
                        <Link href="/sources" className="px-6 py-3 bg-copy text-white rounded-md font-medium text-sm hover:bg-opacity-90 transition">
                            Get Started
                        </Link>
                        <a href="http://localhost:3001/health" target="_blank" rel="noopener noreferrer" className="px-6 py-3 border border-border text-copy rounded-md font-medium text-sm hover:bg-bg-contrast transition">
                            API Status
                        </a>
                    </div>
                </div>

                {/* Key Metrics */}
                <div className="grid md:grid-cols-3 gap-6 mb-16 py-8 border-t border-b border-border">
                    <div>
                        <div className="text-3xl font-bold text-copy mb-1">80%+</div>
                        <p className="text-sm text-secondary">Source coverage target</p>
                    </div>
                    <div>
                        <div className="text-3xl font-bold text-copy mb-1">95%+</div>
                        <p className="text-sm text-secondary">Extraction precision</p>
                    </div>
                    <div>
                        <div className="text-3xl font-bold text-copy mb-1">Weekly</div>
                        <p className="text-sm text-secondary">Digest delivery</p>
                    </div>
                </div>
            </section>

            {/* Core Capabilities */}
            <section id="sources" className="bg-bg-page py-16">
                <div className="max-w-5xl mx-auto px-6">
                    <h2 className="text-3xl font-bold text-copy mb-2">Core Capabilities</h2>
                    <p className="text-secondary mb-12">What CSV does to keep your research data current and reliable.</p>

                    <div className="grid md:grid-cols-2 gap-8">
                        {/* Crawl & Watchlists */}
                        <div className="bg-white border border-border rounded-md p-8">
                            <div className="text-2xl mb-3">📡</div>
                            <h3 className="text-lg font-semibold text-copy mb-3">Crawl & Watchlists</h3>
                            <p className="text-sm text-secondary mb-4 leading-relaxed">
                                Track official regulators, exchanges, IFIs, energy portals, gazettes, and policy announcements. Respects robots.txt, auto-deduplicates, and schedules crawls intelligently.
                            </p>
                            <ul className="text-xs text-secondary space-y-2">
                                <li>✓ Rate-limited crawling</li>
                                <li>✓ Content-based deduplication</li>
                                <li>✓ Multi-market tracking</li>
                            </ul>
                        </div>

                        {/* Policy Intelligence */}
                        <div className="bg-white border border-border rounded-md p-8">
                            <div className="text-2xl mb-3">🧠</div>
                            <h3 className="text-lg font-semibold text-copy mb-3">Policy Intelligence</h3>
                            <p className="text-sm text-secondary mb-4 leading-relaxed">
                                Classify documents by type and sector. Automatically extract entities and structured datapoints: FIT rates, WESM prices, tax rates, FX, CPI, capex incentives, ESG disclosures.
                            </p>
                            <ul className="text-xs text-secondary space-y-2">
                                <li>✓ Document classification</li>
                                <li>✓ NER + deterministic extraction</li>
                                <li>✓ Sector & theme tagging</li>
                            </ul>
                        </div>

                        {/* Data Registry */}
                        <div className="bg-white border border-border rounded-md p-8">
                            <div className="text-2xl mb-3">📊</div>
                            <h3 className="text-lg font-semibold text-copy mb-3">Data Registry</h3>
                            <p className="text-sm text-secondary mb-4 leading-relaxed">
                                Normalize and store structured datapoints with units, effective dates, sources, and confidence scores. Query time series for model inputs.
                            </p>
                            <ul className="text-xs text-secondary space-y-2">
                                <li>✓ Versioned datapoints</li>
                                <li>✓ Provenance tracking</li>
                                <li>✓ Time-series queryable</li>
                            </ul>
                        </div>

                        {/* Weekly Digest */}
                        <div className="bg-white border border-border rounded-md p-8">
                            <div className="text-2xl mb-3">📧</div>
                            <h3 className="text-lg font-semibold text-copy mb-3">Weekly Digest</h3>
                            <p className="text-sm text-secondary mb-4 leading-relaxed">
                                Curated newsletters by topic and country. Email + in-app feed. Export to Markdown or PDF for reports.
                            </p>
                            <ul className="text-xs text-secondary space-y-2">
                                <li>✓ Monday 08:00 Asia/Manila</li>
                                <li>✓ Topic subscriptions</li>
                                <li>✓ Export-ready formats</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </section>

            {/* Tracked Markets & Sectors */}
            <section className="max-w-5xl mx-auto px-6 py-16">
                <h2 className="text-3xl font-bold text-copy mb-2">Tracked Markets & Sectors</h2>
                <p className="text-secondary mb-8">CSV monitors regulatory updates across key markets and sectors.</p>

                <div className="grid md:grid-cols-2 gap-8">
                    <div>
                        <h3 className="font-semibold text-copy mb-4 text-sm">Markets</h3>
                        <div className="space-y-2 text-sm">
                            <div className="flex items-center gap-2 text-secondary">
                                <span className="w-1.5 h-1.5 bg-border rounded-full"></span>
                                Philippines (primary)
                            </div>
                            <div className="flex items-center gap-2 text-secondary">
                                <span className="w-1.5 h-1.5 bg-border rounded-full"></span>
                                Southeast Asia (regional)
                            </div>
                            <div className="flex items-center gap-2 text-secondary">
                                <span className="w-1.5 h-1.5 bg-border rounded-full"></span>
                                Energy & utilities
                            </div>
                            <div className="flex items-center gap-2 text-secondary">
                                <span className="w-1.5 h-1.5 bg-border rounded-full"></span>
                                Finance & capital markets
                            </div>
                        </div>
                    </div>

                    <div>
                        <h3 className="font-semibold text-copy mb-4 text-sm">Sample Datapoints Tracked</h3>
                        <div className="space-y-2 text-sm">
                            <div className="flex items-center gap-2 text-secondary">
                                <span className="w-1.5 h-1.5 bg-border rounded-full"></span>
                                WESM average pricing
                            </div>
                            <div className="flex items-center gap-2 text-secondary">
                                <span className="w-1.5 h-1.5 bg-border rounded-full"></span>
                                Solar FIT rates
                            </div>
                            <div className="flex items-center gap-2 text-secondary">
                                <span className="w-1.5 h-1.5 bg-border rounded-full"></span>
                                Corporate & VAT rates
                            </div>
                            <div className="flex items-center gap-2 text-secondary">
                                <span className="w-1.5 h-1.5 bg-border rounded-full"></span>
                                FX, CPI, GDP growth
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Extraction Pipeline */}
            <section id="extraction" className="bg-bg-page py-16">
                <div className="max-w-5xl mx-auto px-6">
                    <h2 className="text-3xl font-bold text-copy mb-2">How Extraction Works</h2>
                    <p className="text-secondary mb-12">Deterministic + AI-assisted. Reliable. Auditable.</p>

                    <div className="space-y-6">
                        {[
                            {
                                step: '1',
                                title: 'Document Ingestion',
                                desc: 'Crawled documents are queued, deduplicated, and stored with source metadata.',
                            },
                            {
                                step: '2',
                                title: 'Classification',
                                desc: 'Document type (policy/regulation/news/data) and sector/country tags applied via rule-based + LLM assist.',
                            },
                            {
                                step: '3',
                                title: 'Entity & Data Extraction',
                                desc: 'Regex patterns + schema validators extract structured fields. LLM fallback if deterministic fails.',
                            },
                            {
                                step: '4',
                                title: 'Validation & Confidence',
                                desc: 'Cross-check against historical data and other sources. Score confidence. Flag conflicts for review.',
                            },
                            {
                                step: '5',
                                title: 'Registry & Versioning',
                                desc: 'Publish to data registry with effective date, unit, provenance. Maintain audit trail.',
                            },
                            {
                                step: '6',
                                title: 'Delivery',
                                desc: 'Aggregated into weekly digest. Email sent. In-app feed updated. Available via API.',
                            },
                        ].map((item) => (
                            <div key={item.step} className="flex gap-6 bg-white border border-border rounded-md p-6">
                                <div className="flex-shrink-0 w-10 h-10 bg-bg-contrast rounded-md flex items-center justify-center font-semibold text-copy text-sm">
                                    {item.step}
                                </div>
                                <div className="flex-grow">
                                    <h3 className="font-semibold text-copy mb-1">{item.title}</h3>
                                    <p className="text-sm text-secondary">{item.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Tech Stack */}
            <section className="max-w-5xl mx-auto px-6 py-16">
                <h2 className="text-3xl font-bold text-copy mb-12">Built With</h2>
                <div className="grid md:grid-cols-3 gap-6">
                    <div className="bg-bg-contrast border border-border rounded-md p-6">
                        <h3 className="font-semibold text-copy mb-4">Backend</h3>
                        <ul className="text-sm text-secondary space-y-2">
                            <li>Express.js + TypeScript</li>
                            <li>PostgreSQL 14+</li>
                            <li>SQL migrations</li>
                            <li>Jest + Supertest</li>
                        </ul>
                    </div>
                    <div className="bg-bg-contrast border border-border rounded-md p-6">
                        <h3 className="font-semibold text-copy mb-4">Frontend</h3>
                        <ul className="text-sm text-secondary space-y-2">
                            <li>Next.js 14 (App Router)</li>
                            <li>Tailwind CSS</li>
                            <li>shadcn/ui</li>
                            <li>Playwright E2E</li>
                        </ul>
                    </div>
                    <div className="bg-bg-contrast border border-border rounded-md p-6">
                        <h3 className="font-semibold text-copy mb-4">AI & Extraction</h3>
                        <ul className="text-sm text-secondary space-y-2">
                            <li>TypeScript LangGraph</li>
                            <li>Regex + schema validators</li>
                            <li>LLM assist (fallback)</li>
                            <li>NER pipeline</li>
                        </ul>
                    </div>
                </div>
            </section>

            {/* System Status */}
            <section className="bg-bg-page py-16">
                <div className="max-w-5xl mx-auto px-6">
                    <h2 className="text-3xl font-bold text-copy mb-12">System Status</h2>
                    <div className="grid md:grid-cols-2 gap-6">
                        <div className="bg-white border border-border rounded-md p-6">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="font-semibold text-copy">API Server</h3>
                                <span className="w-3 h-3 bg-green-500 rounded-full"></span>
                            </div>
                            <p className="text-sm text-secondary mb-3">Express running on port 3001</p>
                            <a href="http://localhost:3001/health" target="_blank" rel="noopener noreferrer" className="text-xs text-copy font-medium hover:underline">
                                Check health →
                            </a>
                        </div>
                        <div className="bg-white border border-border rounded-md p-6">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="font-semibold text-copy">Web UI</h3>
                                <span className="w-3 h-3 bg-green-500 rounded-full"></span>
                            </div>
                            <p className="text-sm text-secondary mb-3">Next.js in development</p>
                            <a href="http://localhost:3000" className="text-xs text-copy font-medium hover:underline">
                                View UI →
                            </a>
                        </div>
                        <div className="bg-white border border-border rounded-md p-6">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="font-semibold text-copy">Database</h3>
                                <span className="w-3 h-3 bg-green-500 rounded-full"></span>
                            </div>
                            <p className="text-sm text-secondary mb-3">PostgreSQL 14+ (Docker)</p>
                            <span className="text-xs text-caption">localhost:5432</span>
                        </div>
                        <div className="bg-white border border-border rounded-md p-6">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="font-semibold text-copy">Testing</h3>
                                <span className="w-3 h-3 bg-green-500 rounded-full"></span>
                            </div>
                            <p className="text-sm text-secondary mb-3">Jest, Supertest, Playwright</p>
                            <span className="text-xs text-caption">Ready</span>
                        </div>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="border-t border-border bg-white py-8">
                <div className="max-w-5xl mx-auto px-6 flex justify-between items-center">
                    <div>
                        <p className="text-sm font-semibold text-copy">CSV</p>
                        <p className="text-xs text-caption">Policy & Data Crawler</p>
                    </div>
                    <div className="text-xs text-caption">
                        © 2025. Monitor regulatory updates across Southeast Asia.
                    </div>
                </div>
            </footer>
        </div>
    );
}
