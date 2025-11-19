import Link from 'next/link';

export default function DocsPage(): JSX.Element {
  return (
    <div className="min-h-screen bg-bg-page">
      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-copy mb-2">Documentation</h1>
          <p className="text-secondary">
            Complete guide to using the CSV Policy & Data Crawler
          </p>
        </div>

        {/* Quick Start */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold text-copy mb-4">Quick Start</h2>
          <div className="bg-white border border-border rounded-lg p-6 space-y-6">
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-copy text-white flex items-center justify-center font-semibold text-sm">
                1
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-copy mb-1">Add a Source</h3>
                <p className="text-sm text-secondary mb-2">
                  Navigate to Sources and add a website to monitor (e.g., DOE Philippines, ERC, BSP).
                </p>
                <Link href="/sources" className="text-sm text-blue-600 hover:underline">
                  Go to Sources →
                </Link>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-copy text-white flex items-center justify-center font-semibold text-sm">
                2
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-copy mb-1">Start a Crawl</h3>
                <p className="text-sm text-secondary mb-2">
                  Visit the Crawl page and click "Start Crawl" on any source. Configure multi-page options if needed.
                </p>
                <Link href="/crawl" className="text-sm text-blue-600 hover:underline">
                  Go to Crawl →
                </Link>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-copy text-white flex items-center justify-center font-semibold text-sm">
                3
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-copy mb-1">View Results</h3>
                <p className="text-sm text-secondary mb-2">
                  Check Digests for AI-generated summaries or Documents for raw crawled pages.
                </p>
                <Link href="/digests" className="text-sm text-blue-600 hover:underline">
                  View Digests →
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold text-copy mb-4">Features</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-white border border-border rounded-lg p-6">
              <div className="text-2xl mb-2">🕷️</div>
              <h3 className="font-semibold text-copy mb-2">Multi-Page Crawling</h3>
              <p className="text-sm text-secondary">
                Automatically detects pagination and follows internal links up to configurable depth.
              </p>
            </div>

            <div className="bg-white border border-border rounded-lg p-6">
              <div className="text-2xl mb-2">🤖</div>
              <h3 className="font-semibold text-copy mb-2">LLM Extraction</h3>
              <p className="text-sm text-secondary">
                Uses OpenAI to classify content, extract datapoints, and generate summaries.
              </p>
            </div>

            <div className="bg-white border border-border rounded-lg p-6">
              <div className="text-2xl mb-2">📊</div>
              <h3 className="font-semibold text-copy mb-2">Structured Data</h3>
              <p className="text-sm text-secondary">
                Extracts circulars, PPAs, price changes, and energy mix data into queryable format.
              </p>
            </div>

            <div className="bg-white border border-border rounded-lg p-6">
              <div className="text-2xl mb-2">📝</div>
              <h3 className="font-semibold text-copy mb-2">Automated Digests</h3>
              <p className="text-sm text-secondary">
                Generates 1-2 page Markdown summaries with highlights and key datapoints.
              </p>
            </div>
          </div>
        </section>

        {/* Crawl Modes */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold text-copy mb-4">Crawl Modes</h2>
          <div className="space-y-4">
            <div className="border-l-4 border-green-500 pl-4 py-2 bg-white rounded-r-lg">
              <h3 className="font-semibold text-copy mb-1">Single-Page Mode (Free)</h3>
              <p className="text-sm text-secondary">
                Crawls one URL, extracts data using regex/CSV parsing. No API key required.
              </p>
            </div>

            <div className="border-l-4 border-blue-500 pl-4 py-2 bg-white rounded-r-lg">
              <h3 className="font-semibold text-copy mb-1">Multi-Page Mode (Paid)</h3>
              <p className="text-sm text-secondary">
                Crawls multiple pages with pagination, uses LLM for classification and extraction.
                Requires <code className="bg-bg-contrast px-2 py-1 rounded text-xs">OPENAI_API_KEY</code>.
                Cost: ~$0.35 per 50-page crawl.
              </p>
            </div>
          </div>
        </section>

        {/* Configuration */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold text-copy mb-4">Configuration</h2>
          <div className="bg-white border border-border rounded-lg p-6">
            <h3 className="font-semibold text-copy mb-3">Multi-Page Crawl Options</h3>
            <ul className="space-y-2 text-sm text-secondary">
              <li>
                <strong className="text-copy">Max Depth:</strong> How many link levels to follow (1-5)
              </li>
              <li>
                <strong className="text-copy">Max Pages:</strong> Total page limit per crawl (1-500)
              </li>
              <li>
                <strong className="text-copy">Concurrency:</strong> Parallel requests (1-5, be respectful!)
              </li>
              <li>
                <strong className="text-copy">Enable Multi-Page:</strong> Toggle LLM-powered extraction
              </li>
            </ul>
          </div>
        </section>

        {/* API Endpoints */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold text-copy mb-4">API Endpoints</h2>
          <div className="space-y-3">
            <div className="bg-white border border-border rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-mono bg-bg-contrast px-2 py-1 rounded text-copy">
                  POST
                </span>
                <code className="text-sm text-blue-600">/api/crawl/start</code>
              </div>
              <p className="text-sm text-secondary">Start a crawl job with options</p>
            </div>

            <div className="bg-white border border-border rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-mono bg-bg-contrast px-2 py-1 rounded text-copy">
                  GET
                </span>
                <code className="text-sm text-blue-600">/api/crawl/jobs/:jobId</code>
              </div>
              <p className="text-sm text-secondary">Check crawl job status</p>
            </div>

            <div className="bg-white border border-border rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-mono bg-bg-contrast px-2 py-1 rounded text-copy">
                  GET
                </span>
                <code className="text-sm text-blue-600">/api/crawl/:jobId/digest</code>
              </div>
              <p className="text-sm text-secondary">Get LLM-generated digest</p>
            </div>

            <div className="bg-white border border-border rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-mono bg-bg-contrast px-2 py-1 rounded text-copy">
                  GET
                </span>
                <code className="text-sm text-blue-600">/api/digests</code>
              </div>
              <p className="text-sm text-secondary">List all digests (paginated)</p>
            </div>
          </div>
        </section>

        {/* Troubleshooting */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold text-copy mb-4">Troubleshooting</h2>
          <div className="space-y-3">
            <details className="bg-white border border-border rounded-lg p-4 group">
              <summary className="font-semibold text-copy cursor-pointer list-none flex items-center justify-between">
                "Failed to fetch" errors
                <span className="text-secondary group-open:rotate-180 transition-transform">▼</span>
              </summary>
              <p className="text-sm text-secondary mt-3 pt-3 border-t border-border">
                Check that both API (port 3001) and Web (port 3000) servers are running.
                Run <code className="bg-bg-contrast px-2 py-1 rounded text-xs">pnpm dev</code> from project root.
              </p>
            </details>

            <details className="bg-white border border-border rounded-lg p-4 group">
              <summary className="font-semibold text-copy cursor-pointer list-none flex items-center justify-between">
                LLM extraction not working
                <span className="text-secondary group-open:rotate-180 transition-transform">▼</span>
              </summary>
              <p className="text-sm text-secondary mt-3 pt-3 border-t border-border">
                Ensure <code className="bg-bg-contrast px-2 py-1 rounded text-xs">OPENAI_API_KEY</code> is
                set in <code className="bg-bg-contrast px-2 py-1 rounded text-xs">apps/api/.env</code>.
                Single-page mode works without an API key.
              </p>
            </details>

            <details className="bg-white border border-border rounded-lg p-4 group">
              <summary className="font-semibold text-copy cursor-pointer list-none flex items-center justify-between">
                No datapoints extracted
                <span className="text-secondary group-open:rotate-180 transition-transform">▼</span>
              </summary>
              <p className="text-sm text-secondary mt-3 pt-3 border-t border-border">
                The page may not contain structured data (CSV, tables, or matching patterns).
                Try enabling multi-page mode for LLM-based extraction.
              </p>
            </details>
          </div>
        </section>

        {/* Back Link */}
        <div className="pt-6 border-t border-border">
          <Link href="/" className="text-sm text-secondary hover:text-copy transition-colors">
            ← Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
