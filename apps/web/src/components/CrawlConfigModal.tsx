'use client';

import { useState } from 'react';
import { Modal } from './Modal';

export interface CrawlConfig {
    useMultiPage: boolean;
    maxDepth: number;
    maxPages: number;
    concurrency: number;
}

interface CrawlConfigModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (config: CrawlConfig) => void;
    sourceName: string;
}

export function CrawlConfigModal({ isOpen, onClose, onSubmit, sourceName }: CrawlConfigModalProps) {
    const [config, setConfig] = useState<CrawlConfig>({
        useMultiPage: true, // Enable by default
        maxDepth: 3, // Deeper crawling by default
        maxPages: 50, // Good default
        concurrency: 3,
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit(config);
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Configure Crawl: ${sourceName}`}>
            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Multi-Page Toggle */}
                <div className="flex items-start">
                    <div className="flex items-center h-5">
                        <input
                            id="useMultiPage"
                            type="checkbox"
                            checked={config.useMultiPage}
                            onChange={(e) => setConfig({ ...config, useMultiPage: e.target.checked })}
                            className="w-4 h-4 text-copy border-border rounded focus:ring-2 focus:ring-copy"
                        />
                    </div>
                    <div className="ml-3">
                        <label htmlFor="useMultiPage" className="font-medium text-copy">
                            Multi-Page Crawling
                        </label>
                        <p className="text-sm text-secondary mt-1">
                            Follow links and detect pagination patterns. LLM will extract structured data and generate a digest.
                        </p>
                    </div>
                </div>

                {/* Multi-Page Options */}
                {config.useMultiPage && (
                    <div className="space-y-4 pl-7 border-l-2 border-border">
                        {/* Max Depth */}
                        <div>
                            <label htmlFor="maxDepth" className="block text-sm font-medium text-copy mb-1">
                                Max Depth
                            </label>
                            <input
                                id="maxDepth"
                                type="number"
                                min="1"
                                max="5"
                                value={config.maxDepth}
                                onChange={(e) => setConfig({ ...config, maxDepth: parseInt(e.target.value) })}
                                className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-copy"
                            />
                            <p className="text-xs text-secondary mt-1">
                                How many levels of links to follow (1-5). Higher = more pages but slower.
                            </p>
                        </div>

                        {/* Max Pages */}
                        <div>
                            <label htmlFor="maxPages" className="block text-sm font-medium text-copy mb-1">
                                Max Pages
                            </label>
                            <input
                                id="maxPages"
                                type="number"
                                min="1"
                                max="500"
                                value={config.maxPages}
                                onChange={(e) => setConfig({ ...config, maxPages: parseInt(e.target.value) })}
                                className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-copy"
                            />
                            <p className="text-xs text-secondary mt-1">
                                Maximum total pages to crawl (1-500). Crawl stops when this limit is reached.
                            </p>
                        </div>

                        {/* Concurrency */}
                        <div>
                            <label htmlFor="concurrency" className="block text-sm font-medium text-copy mb-1">
                                Concurrency
                            </label>
                            <select
                                id="concurrency"
                                value={config.concurrency}
                                onChange={(e) => setConfig({ ...config, concurrency: parseInt(e.target.value) })}
                                className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-copy"
                            >
                                <option value="1">1 (Slowest, most polite)</option>
                                <option value="2">2</option>
                                <option value="3">3 (Recommended)</option>
                                <option value="4">4</option>
                                <option value="5">5 (Fastest, least polite)</option>
                            </select>
                            <p className="text-xs text-secondary mt-1">
                                Number of parallel requests. Higher = faster but may trigger rate limits.
                            </p>
                        </div>

                        {/* Estimated Time */}
                        <div className="bg-bg-page p-3 rounded-md border border-border">
                            <p className="text-xs text-secondary">
                                <strong>Estimated time:</strong>{' '}
                                {Math.ceil((config.maxPages * 2) / config.concurrency / 60)} minutes
                            </p>
                            <p className="text-xs text-secondary mt-1">
                                <strong>LLM cost:</strong> ~$0.10-0.50 per crawl (depends on content size)
                            </p>
                        </div>
                    </div>
                )}

                {/* Single-Page Info */}
                {!config.useMultiPage && (
                    <div className="bg-bg-page p-4 rounded-md border border-border">
                        <p className="text-sm text-secondary">
                            <strong>Single-page mode:</strong> Only the source URL will be crawled. No LLM extraction or digest generation.
                        </p>
                    </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-3 pt-4">
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex-1 px-4 py-2 border border-border text-copy rounded-md font-medium hover:bg-bg-contrast transition"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        className="flex-1 px-4 py-2 bg-copy text-white rounded-md font-medium hover:bg-opacity-90 transition"
                    >
                        Start Crawl
                    </button>
                </div>
            </form>
        </Modal>
    );
}
