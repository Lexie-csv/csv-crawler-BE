import axios from 'axios';
import robotsTxtParser from 'robots-parser';

export class RobotsParser {
    private cache: Map<string, ReturnType<typeof robotsTxtParser>> = new Map();
    private fetchTimeout = 5000;

    async isUrlAllowed(url: string, userAgent: string = 'CSV-Crawler'): Promise<boolean> {
        try {
            const urlObj = new URL(url);
            const origin = `${urlObj.protocol}//${urlObj.host}`;
            const robotsUrl = `${origin}/robots.txt`;

            const robots = await this.getRobotsTxt(robotsUrl);
            return robots.isAllowed(url, userAgent) ?? true;
        } catch (error) {
            console.warn('[RobotsParser] Error checking robots.txt:', error);
            return true;
        }
    }

    private async getRobotsTxt(robotsUrl: string): Promise<ReturnType<typeof robotsTxtParser>> {
        if (this.cache.has(robotsUrl)) {
            return this.cache.get(robotsUrl)!;
        }

        try {
            const response = await axios.get(robotsUrl, {
                timeout: this.fetchTimeout,
                headers: {
                    'User-Agent': 'CSV-Crawler/1.0 (Policy monitoring bot)',
                },
                validateStatus: (status) => status === 200 || status === 404,
            });

            let robotsTxt = '';
            if (response.status === 200) {
                robotsTxt = response.data;
            }

            const robots = robotsTxtParser(robotsUrl, robotsTxt);
            this.cache.set(robotsUrl, robots);
            setTimeout(() => this.cache.delete(robotsUrl), 3600000);

            return robots;
        } catch (error) {
            console.warn(`[RobotsParser] Failed to fetch ${robotsUrl}:`, error);
            return robotsTxtParser(robotsUrl, '');
        }
    }

    clearCache(): void {
        this.cache.clear();
    }
}

export const robotsParser = new RobotsParser();
