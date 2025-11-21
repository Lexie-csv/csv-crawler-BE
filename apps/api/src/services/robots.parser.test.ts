import { RobotsParser } from './robots.parser';

describe('RobotsParser', () => {
    let parser: RobotsParser;

    beforeEach(() => {
        parser = new RobotsParser();
        parser.clearCache();

        // Mock fetch globally
        global.fetch = jest.fn();
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    describe('Path matching', () => {
        it('should match exact path', () => {
            const match = (parser as any).pathMatches('/admin', '/admin');
            expect(match).toBe(true);
        });

        it('should match prefix with wildcard', () => {
            const match = (parser as any).pathMatches('/admin/users', '/admin/*');
            expect(match).toBe(true);
        });

        it('should match prefix without wildcard', () => {
            const match = (parser as any).pathMatches('/admin/users', '/admin/');
            expect(match).toBe(true);
        });

        it('should not match different paths', () => {
            const match = (parser as any).pathMatches('/public', '/admin/');
            expect(match).toBe(false);
        });

        it('should not match partial prefix', () => {
            const match = (parser as any).pathMatches('/admins', '/admin/');
            expect(match).toBe(false);
        });
    });

    describe('Disallow rule parsing', () => {
        it('should parse basic Disallow rules', () => {
            const content = `
User-agent: *
Disallow: /admin
Disallow: /private/
      `.trim();

            const rules = (parser as any).parseDisallowRules(content);
            expect(rules).toContain('/admin');
            expect(rules).toContain('/private/');
        });

        it('should ignore comments', () => {
            const content = `
# This is a comment
Disallow: /admin
# Another comment
      `.trim();

            const rules = (parser as any).parseDisallowRules(content);
            expect(rules).toEqual(['/admin']);
        });

        it('should ignore empty lines', () => {
            const content = `
Disallow: /admin

Disallow: /private
      `.trim();

            const rules = (parser as any).parseDisallowRules(content);
            expect(rules).toHaveLength(2);
        });

        it('should trim whitespace', () => {
            const content = 'Disallow:   /admin   ';
            const rules = (parser as any).parseDisallowRules(content);
            expect(rules).toEqual(['/admin']);
        });

        it('should ignore lines without Disallow', () => {
            const content = `
User-agent: googlebot
Disallow: /admin
Allow: /public
      `.trim();

            const rules = (parser as any).parseDisallowRules(content);
            expect(rules).toEqual(['/admin']);
            expect(rules.some((r: string) => r.includes('Allow'))).toBe(false);
        });
    });

    describe('robots.txt fetching and caching', () => {
        it('should fetch robots.txt and cache result', async () => {
            const robotsContent = `
User-agent: *
Disallow: /admin
Disallow: /private/
      `.trim();

            (global.fetch as jest.Mock).mockResolvedValueOnce({
                ok: true,
                text: jest.fn().mockResolvedValueOnce(robotsContent),
            });

            const result1 = await (parser as any).getRobotsTxt('http://example.com/robots.txt');
            const result2 = await (parser as any).getRobotsTxt('http://example.com/robots.txt');

            // Should only fetch once (second call from cache)
            expect(global.fetch).toHaveBeenCalledTimes(1);
            expect(result1).toEqual(result2);
            expect(result1.disallow).toContain('/admin');
        });

        it('should handle fetch failure gracefully', async () => {
            (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

            const result = await (parser as any).getRobotsTxt('http://example.com/robots.txt');

            expect(result.disallow).toEqual([]);
        });

        it('should handle 404 response', async () => {
            (global.fetch as jest.Mock).mockResolvedValueOnce({
                ok: false,
                status: 404,
            });

            const result = await (parser as any).getRobotsTxt('http://example.com/robots.txt');

            expect(result.disallow).toEqual([]);
        });

        it('should timeout if fetch takes too long', async () => {
            (global.fetch as jest.Mock).mockImplementationOnce(
                () =>
                    new Promise(resolve =>
                        setTimeout(() => resolve({ ok: true, text: () => '' }), 10000)
                    )
            );

            const result = await (parser as any).getRobotsTxt('http://example.com/robots.txt');

            // Should timeout and return empty rules
            expect(result.disallow).toEqual([]);
        });
    });

    describe('URL allowed checking', () => {
        it('should allow URL if robots.txt permits', async () => {
            (global.fetch as jest.Mock).mockResolvedValueOnce({
                ok: true,
                text: jest.fn().mockResolvedValueOnce(`
User-agent: *
Disallow: /admin
        `),
            });

            const allowed = await parser.isUrlAllowed('http://example.com/public/page');

            expect(allowed).toBe(true);
        });

        it('should disallow URL if robots.txt forbids', async () => {
            (global.fetch as jest.Mock).mockResolvedValueOnce({
                ok: true,
                text: jest.fn().mockResolvedValueOnce(`
User-agent: *
Disallow: /admin
        `),
            });

            const allowed = await parser.isUrlAllowed('http://example.com/admin/users');

            expect(allowed).toBe(false);
        });

        it('should handle query parameters in URL', async () => {
            (global.fetch as jest.Mock).mockResolvedValueOnce({
                ok: true,
                text: jest.fn().mockResolvedValueOnce(`
User-agent: *
Disallow: /search
        `),
            });

            const allowed = await parser.isUrlAllowed(
                'http://example.com/public?q=test'
            );

            expect(allowed).toBe(true);
        });

        it('should allow by default if robots.txt fetch fails', async () => {
            (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

            const allowed = await parser.isUrlAllowed('http://example.com/admin');

            expect(allowed).toBe(true);
        });

        it('should extract domain correctly from URL', async () => {
            (global.fetch as jest.Mock).mockResolvedValueOnce({
                ok: true,
                text: jest.fn().mockResolvedValueOnce('Disallow: /admin'),
            });

            await parser.isUrlAllowed('http://example.com:8080/page');

            const callArgs = (global.fetch as jest.Mock).mock.calls[0][0];
            expect(callArgs).toBe('http://example.com:8080/robots.txt');
        });
    });
});
