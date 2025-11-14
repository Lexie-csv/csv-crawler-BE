import fetch from 'node-fetch';

/**
 * Parse and enforce robots.txt rules
 */
export class RobotsParser {
    private cache: Map<string, { disallow: string[] }> = new Map();
    private fetchTimeout = 5000; // 5 seconds

    /**
     * Check if a URL is allowed by robots.txt
     */
    async isUrlAllowed(url: string, userAgent: string = '*'): Promise<boolean> {
        try {
            const urlObj = new URL(url);
            const origin = `${urlObj.protocol}//${urlObj.host}`;
            const pathname = urlObj.pathname + urlObj.search;

            // Get robots.txt rules
            const robotsUrl = `${origin}/robots.txt`;
            const rules = await this.getRobotsTxt(robotsUrl);

            // Simple robots.txt parsing: check for Disallow rules
            // This is a basic implementation; full parser would use robots-parser package
            for (const disallowRule of rules.disallow) {
                if (this.pathMatches(pathname, disallowRule)) {
                    return false;
                }
            }

            return true;
        } catch (error) {
            // If robots.txt fetch fails, allow by default (fail open)
            console.warn('[RobotsParser] Error checking robots.txt:', error);
            return true;
        }
    }

    /**
     * Fetch and parse robots.txt for a domain
     */
    private async getRobotsTxt(robotsUrl: string): Promise<{
        disallow: string[];
    }> {
        // Check cache first
        if (this.cache.has(robotsUrl)) {
            return this.cache.get(robotsUrl)!;
        }

        try {
            const response = await Promise.race([
                fetch(robotsUrl),
                new Promise<Response>((_, reject) =>
                    setTimeout(() => reject(new Error('Timeout')), this.fetchTimeout)
                ),
            ]);

            if (!response.ok) {
                return { disallow: [] };
            }

            const text = await (response as any).text();
            const disallow = this.parseDisallowRules(text);

            const result = { disallow };
            this.cache.set(robotsUrl, result);
            return result;
        } catch (error) {
            console.warn(`[RobotsParser] Failed to fetch ${robotsUrl}:`, error);
            return { disallow: [] };
        }
    }

    /**
     * Parse Disallow rules from robots.txt content
     */
    private parseDisallowRules(content: string): string[] {
        const rules: string[] = [];
        const lines = content.split('\n');

        for (const line of lines) {
            const trimmed = line.trim();

            // Skip comments and empty lines
            if (!trimmed || trimmed.startsWith('#')) {
                continue;
            }

            // Look for Disallow rules
            if (trimmed.toLowerCase().startsWith('disallow:')) {
                const path = trimmed.substring('disallow:'.length).trim();
                if (path) {
                    rules.push(path);
                }
            }
        }

        return rules;
    }

    /**
     * Check if a path matches a disallow rule (basic glob matching)
     */
    private pathMatches(path: string, rule: string): boolean {
        // Exact match
        if (path === rule) {
            return true;
        }

        // Prefix match (e.g., /admin/ disallows /admin/*, /admin/users/*, etc.)
        if (rule.endsWith('*')) {
            const prefix = rule.substring(0, rule.length - 1);
            return path.startsWith(prefix);
        }

        // Prefix match without *
        if (path.startsWith(rule)) {
            // Only match if rule ends at a path boundary
            if (rule.endsWith('/') || path[rule.length] === '/' || path[rule.length] === '?') {
                return true;
            }
        }

        return false;
    }

    /**
     * Clear cache
     */
    clearCache(): void {
        this.cache.clear();
    }
}

export const robotsParser = new RobotsParser();
