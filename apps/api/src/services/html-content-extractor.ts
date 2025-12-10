/**
 * HTML Content Extractor Service
 * 
 * Extracts structured content from HTML pages:
 * - Main text content
 * - Tables
 * - Metadata (title, description)
 * - Links to other documents
 */

import { Page } from 'playwright';
import * as crypto from 'crypto';
import type { HtmlPageContent } from '@csv/types';

export class HtmlContentExtractor {
    /**
     * Extract structured content from an HTML page
     */
    async extract(page: Page): Promise<HtmlPageContent> {
        console.log(`  📄 Extracting HTML content from: ${page.url()}`);

        try {
            // Extract all content in parallel
            const [content, tables] = await Promise.all([
                this.extractBasicContent(page),
                this.extractTables(page),
            ]);

            return {
                ...content,
                tables,
            };
        } catch (error) {
            console.error(`  ❌ Error extracting HTML content: ${error}`);
            throw error;
        }
    }

    /**
     * Extract basic page content (title, text, metadata)
     */
    private async extractBasicContent(page: Page): Promise<Omit<HtmlPageContent, 'tables'>> {
        const content = await page.evaluate(() => {
            // Get title
            const title = (window as any).document.title || '';

            // Get meta description
            const metaDesc = (window as any).document.querySelector('meta[name="description"]');
            const metaDescription = metaDesc ? metaDesc.getAttribute('content') : null;

            // Get main text content
            // Try to find main content area first, fall back to body
            const mainSelectors = [
                'main',
                'article',
                '[role="main"]',
                '.main-content',
                '.content',
                '#content',
            ];

            let mainElement: any = null;
            for (const selector of mainSelectors) {
                mainElement = (window as any).document.querySelector(selector);
                if (mainElement) break;
            }

            const contentElement = mainElement || (window as any).document.body;

            // Remove script, style, nav, footer, header elements
            const clone = contentElement.cloneNode(true);
            const excludeSelectors = ['script', 'style', 'nav', 'footer', 'header', 'iframe', 'noscript'];
            excludeSelectors.forEach(sel => {
                clone.querySelectorAll(sel).forEach((el: any) => el.remove());
            });

            // Get text content
            const bodyText = clone.textContent || '';
            const cleanedText = bodyText
                .replace(/\s+/g, ' ')  // Collapse whitespace
                .trim();

            // Look for announcements (elements that look like announcements)
            const announcementSelectors = [
                '.announcement',
                '.alert',
                '.notice',
                '[class*="announcement"]',
                '[class*="alert"]',
            ];
            const announcements: string[] = [];
            announcementSelectors.forEach(sel => {
                const elements = (window as any).document.querySelectorAll(sel);
                elements.forEach((el: any) => {
                    const text = el.textContent?.trim();
                    if (text && text.length > 20) {
                        announcements.push(text);
                    }
                });
            });

            // Get metadata from meta tags
            const metaTags = Array.from((window as any).document.querySelectorAll('meta'));
            const metadata: Record<string, string> = {};
            metaTags.forEach((tag: any) => {
                const name = tag.getAttribute('name') || tag.getAttribute('property');
                const content = tag.getAttribute('content');
                if (name && content) {
                    metadata[name] = content;
                }
            });

            return {
                title,
                metaDescription,
                mainText: cleanedText,
                announcements,
                metadata,
            };
        });

        return {
            url: page.url(),
            title: content.title,
            metaDescription: content.metaDescription,
            mainText: content.mainText,
            announcements: content.announcements,
            metadata: content.metadata,
        };
    }

    /**
     * Extract tables from the page
     */
    private async extractTables(page: Page): Promise<Array<{ headers: string[]; rows: string[][] }>> {
        return await page.evaluate(() => {
            const doc = (window as any).document;
            const tables = Array.from(doc.querySelectorAll('table'));

            return tables.map((table: any) => {
                // Extract headers
                const headerCells = Array.from(table.querySelectorAll('th'));
                const headers = headerCells.map((th: any) => th.textContent?.trim() || '');

                // Extract rows
                const rows = Array.from(table.querySelectorAll('tr'))
                    .map((tr: any) => {
                        const cells = Array.from(tr.querySelectorAll('td'));
                        if (cells.length === 0) return null; // Skip header rows
                        return cells.map((td: any) => td.textContent?.trim() || '');
                    })
                    .filter((row: any) => row !== null);

                return { headers, rows };
            }).filter((table: any) => table.rows.length > 0); // Only return tables with data
        });
    }

    /**
     * Check if a page looks like it contains relevant content
     * (Quick heuristic check before LLM analysis)
     */
    isLikelyRelevant(content: HtmlPageContent): boolean {
        const text = content.mainText.toLowerCase();
        const title = content.title.toLowerCase();

        // Keywords that suggest regulatory content
        const relevantKeywords = [
            'circular', 'order', 'resolution', 'memorandum', 'advisory',
            'regulation', 'policy', 'issuance', 'directive', 'guideline',
            'announcement', 'notice', 'press release', 'bulletin',
            'tariff', 'rate', 'compliance', 'requirement',
        ];

        // Check title and first 1000 chars
        const searchText = (title + ' ' + text.substring(0, 1000)).toLowerCase();

        return relevantKeywords.some(keyword => searchText.includes(keyword));
    }
}
