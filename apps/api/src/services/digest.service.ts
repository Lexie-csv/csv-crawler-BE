/**
 * DigestService
 * Generates weekly digests of regulatory updates and datapoints
 */

import { query } from '@csv/db';

export interface DigestParams {
  periodStart: Date;
  periodEnd: Date;
  countries?: string[];
  sectors?: string[];
}

export interface DigestDatapoint {
  id: string;
  category: string;
  subcategory: string | null;
  title: string;
  value: string | null;
  date_value: string | null;
  url: string | null;
  source_name: string;
  source_country: string;
  source_sector: string | null;
}

export interface DigestDocument {
  id: string;
  title: string | null;
  url: string;
  source_name: string;
  published_at: string | null;
  datapoint_count: number;
}

export interface Digest {
  subject: string;
  contentMarkdown: string;
  contentHtml: string;
  datapointCount: number;
  documentCount: number;
  periodStart: Date;
  periodEnd: Date;
}

export class DigestService {
  /**
   * Generate a digest for the specified time period
   */
  async generateDigest(params: DigestParams): Promise<Digest> {
    const { periodStart, periodEnd, countries, sectors } = params;

    // Fetch datapoints
    const datapoints = await this.fetchDatapoints(periodStart, periodEnd, countries, sectors);

    // Fetch documents
    const documents = await this.fetchDocuments(periodStart, periodEnd, countries, sectors);

    // Group datapoints by country/sector
    const grouped = this.groupDatapoints(datapoints);

    // Generate content
    const contentMarkdown = this.generateMarkdown(grouped, documents, periodStart, periodEnd);
    const contentHtml = this.generateHtml(grouped, documents, periodStart, periodEnd);

    // Generate subject
    const weekNumber = this.getWeekNumber(periodEnd);
    const year = periodEnd.getFullYear();
    const subject = `Policy & Data Crawler Weekly Digest — Week ${weekNumber}, ${year}`;

    return {
      subject,
      contentMarkdown,
      contentHtml,
      datapointCount: datapoints.length,
      documentCount: documents.length,
      periodStart,
      periodEnd,
    };
  }

  /**
   * Fetch datapoints for the time period
   */
  private async fetchDatapoints(
    periodStart: Date,
    periodEnd: Date,
    countries?: string[],
    sectors?: string[]
  ): Promise<DigestDatapoint[]> {
    let sql = `
      SELECT 
        dp.id,
        dp.category,
        dp.subcategory,
        dp.title,
        dp.value,
        dp.date_value,
        dp.url,
        s.name as source_name,
        s.country as source_country,
        s.sector as source_sector
      FROM datapoints dp
      JOIN sources s ON dp.source_id = s.id
      WHERE dp.created_at >= $1 AND dp.created_at < $2
    `;

    const params: any[] = [periodStart, periodEnd];
    let paramIndex = 3;

    if (countries && countries.length > 0) {
      sql += ` AND s.country = ANY($${paramIndex})`;
      params.push(countries);
      paramIndex++;
    }

    if (sectors && sectors.length > 0) {
      sql += ` AND s.sector = ANY($${paramIndex})`;
      params.push(sectors);
      paramIndex++;
    }

    sql += ' ORDER BY dp.created_at DESC';

    const rows = await query<DigestDatapoint>(sql, params);
    return rows;
  }

  /**
   * Fetch documents for the time period
   */
  private async fetchDocuments(
    periodStart: Date,
    periodEnd: Date,
    countries?: string[],
    sectors?: string[]
  ): Promise<DigestDocument[]> {
    let sql = `
      SELECT 
        d.id,
        d.title,
        d.url,
        s.name as source_name,
        d.published_at,
        COUNT(dp.id) as datapoint_count
      FROM documents d
      JOIN sources s ON d.source_id = s.id
      LEFT JOIN datapoints dp ON d.id = dp.document_id
      WHERE d.created_at >= $1 AND d.created_at < $2
    `;

    const params: any[] = [periodStart, periodEnd];
    let paramIndex = 3;

    if (countries && countries.length > 0) {
      sql += ` AND s.country = ANY($${paramIndex})`;
      params.push(countries);
      paramIndex++;
    }

    if (sectors && sectors.length > 0) {
      sql += ` AND s.sector = ANY($${paramIndex})`;
      params.push(sectors);
      paramIndex++;
    }

    sql += ' GROUP BY d.id, d.title, d.url, s.name, d.published_at ORDER BY d.created_at DESC';

    const rows = await query<DigestDocument>(sql, params);
    return rows;
  }

  /**
   * Group datapoints by country and sector
   */
  private groupDatapoints(datapoints: DigestDatapoint[]): Map<string, DigestDatapoint[]> {
    const grouped = new Map<string, DigestDatapoint[]>();

    for (const dp of datapoints) {
      const key = `${dp.source_country}${dp.source_sector ? ` — ${dp.source_sector}` : ''}`;
      if (!grouped.has(key)) {
        grouped.set(key, []);
      }
      grouped.get(key)!.push(dp);
    }

    return grouped;
  }

  /**
   * Generate Markdown content
   */
  private generateMarkdown(
    grouped: Map<string, DigestDatapoint[]>,
    documents: DigestDocument[],
    periodStart: Date,
    periodEnd: Date
  ): string {
    const weekNumber = this.getWeekNumber(periodEnd);
    const year = periodEnd.getFullYear();
    const dateRange = `${this.formatDate(periodStart)} – ${this.formatDate(periodEnd)}`;

    let md = `# Policy & Data Crawler Weekly Digest\n\n`;
    md += `**Week ${weekNumber}, ${year}** | ${dateRange}\n\n`;
    md += `---\n\n`;

    if (grouped.size === 0) {
      md += `No new datapoints this week.\n\n`;
    } else {
      md += `## 📊 New Datapoints\n\n`;

      for (const [groupKey, datapoints] of grouped) {
        md += `### ${groupKey}\n\n`;
        md += `| Title | Value | Date | Source |\n`;
        md += `|-------|-------|------|--------|\n`;

        for (const dp of datapoints.slice(0, 10)) {
          // Limit to 10 per group
          const title = this.escapeMarkdown(dp.title);
          const value = dp.value ? this.escapeMarkdown(dp.value) : '—';
          const date = dp.date_value ? this.formatDate(new Date(dp.date_value)) : '—';
          const source = this.escapeMarkdown(dp.source_name);

          md += `| ${title} | ${value} | ${date} | ${source} |\n`;
        }

        md += `\n`;
      }
    }

    if (documents.length > 0) {
      md += `## 📄 Recent Documents (${documents.length})\n\n`;

      for (const doc of documents.slice(0, 15)) {
        // Limit to 15 documents
        const title = doc.title || 'Untitled Document';
        const source = doc.source_name;
        const count = doc.datapoint_count;

        md += `- **[${this.escapeMarkdown(title)}](${doc.url})** — ${source}`;
        if (count > 0) {
          md += ` (${count} datapoint${count !== 1 ? 's' : ''})`;
        }
        md += `\n`;
      }

      md += `\n`;
    }

    md += `---\n\n`;
    md += `[View Full Dashboard](http://localhost:3000/datapoints)\n\n`;
    md += `To unsubscribe, [click here](http://localhost:3000/unsubscribe).\n`;

    return md;
  }

  /**
   * Generate HTML content
   */
  private generateHtml(
    grouped: Map<string, DigestDatapoint[]>,
    documents: DigestDocument[],
    periodStart: Date,
    periodEnd: Date
  ): string {
    const weekNumber = this.getWeekNumber(periodEnd);
    const year = periodEnd.getFullYear();
    const dateRange = `${this.formatDate(periodStart)} – ${this.formatDate(periodEnd)}`;

    let html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Weekly Digest — Week ${weekNumber}, ${year}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #202020; max-width: 680px; margin: 0 auto; padding: 20px; }
    h1 { font-size: 24px; font-weight: 700; margin-bottom: 8px; }
    h2 { font-size: 18px; font-weight: 600; margin-top: 32px; margin-bottom: 16px; border-bottom: 1px solid #DCDCDC; padding-bottom: 8px; }
    h3 { font-size: 16px; font-weight: 600; margin-top: 24px; margin-bottom: 12px; color: #202020; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 24px; font-size: 14px; }
    th { background-color: #FAFAFA; text-align: left; padding: 8px 12px; font-weight: 600; border-bottom: 2px solid #DCDCDC; }
    td { padding: 8px 12px; border-bottom: 1px solid #EFEFEF; }
    tr:hover { background-color: #FAFAFA; }
    a { color: #2563eb; text-decoration: none; }
    a:hover { text-decoration: underline; }
    ul { padding-left: 20px; }
    li { margin-bottom: 8px; }
    .meta { color: #727272; font-size: 14px; margin-bottom: 24px; }
    .footer { margin-top: 48px; padding-top: 24px; border-top: 1px solid #DCDCDC; font-size: 12px; color: #A0A0A0; }
    .cta { display: inline-block; margin-top: 16px; padding: 10px 20px; background-color: #202020; color: white; border-radius: 6px; text-decoration: none; }
    .cta:hover { background-color: #404040; }
  </style>
</head>
<body>
  <h1>Policy & Data Crawler Weekly Digest</h1>
  <p class="meta"><strong>Week ${weekNumber}, ${year}</strong> | ${dateRange}</p>
  <hr>
`;

    if (grouped.size === 0) {
      html += `<p>No new datapoints this week.</p>`;
    } else {
      html += `<h2>📊 New Datapoints</h2>`;

      for (const [groupKey, datapoints] of grouped) {
        html += `<h3>${this.escapeHtml(groupKey)}</h3>`;
        html += `<table><thead><tr><th>Title</th><th>Value</th><th>Date</th><th>Source</th></tr></thead><tbody>`;

        for (const dp of datapoints.slice(0, 10)) {
          const title = this.escapeHtml(dp.title);
          const value = dp.value ? this.escapeHtml(dp.value) : '—';
          const date = dp.date_value ? this.formatDate(new Date(dp.date_value)) : '—';
          const source = this.escapeHtml(dp.source_name);

          html += `<tr><td>${title}</td><td>${value}</td><td>${date}</td><td>${source}</td></tr>`;
        }

        html += `</tbody></table>`;
      }
    }

    if (documents.length > 0) {
      html += `<h2>📄 Recent Documents (${documents.length})</h2><ul>`;

      for (const doc of documents.slice(0, 15)) {
        const title = this.escapeHtml(doc.title || 'Untitled Document');
        const source = this.escapeHtml(doc.source_name);
        const count = doc.datapoint_count;

        html += `<li><strong><a href="${doc.url}" target="_blank">${title}</a></strong> — ${source}`;
        if (count > 0) {
          html += ` (${count} datapoint${count !== 1 ? 's' : ''})`;
        }
        html += `</li>`;
      }

      html += `</ul>`;
    }

    html += `
  <a href="http://localhost:3000/datapoints" class="cta">View Full Dashboard</a>
  <div class="footer">
    <p>To unsubscribe from these emails, <a href="http://localhost:3000/unsubscribe">click here</a>.</p>
  </div>
</body>
</html>
`;

    return html;
  }

  /**
   * Get ISO week number
   */
  private getWeekNumber(date: Date): number {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  }

  /**
   * Format date as YYYY-MM-DD
   */
  private formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  /**
   * Escape Markdown special characters
   */
  private escapeMarkdown(text: string): string {
    return text.replace(/([|\\`*_{}[\]()#+\-.!])/g, '\\$1');
  }

  /**
   * Escape HTML special characters
   */
  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}

// Export singleton instance
export const digestService = new DigestService();
