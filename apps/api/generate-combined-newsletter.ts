#!/usr/bin/env tsx
/**
 * Generate combined CSV Market Intelligence Newsletter from all active news sources
 */

import dotenv from 'dotenv';
dotenv.config({ path: '../../.env.local' });

import pkg from 'pg';
const { Pool } = pkg;
import fs from 'fs';
import path from 'path';
import OpenAI from 'openai';

const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/csv_crawler'
});

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

async function main() {
    try {
        const today = new Date().toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        });

        console.log('\n📰 CSV Market Intelligence Newsletter');
        console.log(`📅 ${today}`);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

        // Get all active news sources
        const sourcesResult = await pool.query(`
            SELECT id, name 
            FROM sources 
            WHERE type = 'news' AND active = true
            ORDER BY name
        `);
        
        const sources = sourcesResult.rows;
        console.log(`📡 Active news sources (${sources.length}):`);
        sources.forEach((s: any) => console.log(`   • ${s.name}`));
        console.log('');

        // Fetch all documents from active news sources (last 7 days)
        const docsResult = await pool.query(`
            SELECT 
                d.id,
                d.title,
                d.url,
                d.content,
                d.published_at,
                d.created_at,
                s.name as source_name
            FROM documents d
            JOIN sources s ON d.source_id = s.id
            WHERE s.type = 'news' 
              AND s.active = true
              AND d.created_at >= CURRENT_DATE - INTERVAL '7 days'
            ORDER BY d.created_at DESC
        `);

        const documents = docsResult.rows;
        console.log(`📄 Found ${documents.length} articles from the past 7 days\n`);

        if (documents.length === 0) {
            console.log('⚠️  No recent articles found. Run crawls first.');
            await pool.end();
            process.exit(0);
        }

        // Group by source
        const docsBySource = documents.reduce((acc: any, doc: any) => {
            if (!acc[doc.source_name]) acc[doc.source_name] = [];
            acc[doc.source_name].push(doc);
            return acc;
        }, {});

        console.log('Articles by source:');
        Object.entries(docsBySource).forEach(([source, docs]: [string, any]) => {
            console.log(`  ${source}: ${docs.length} articles`);
        });
        console.log('');

        // Generate digest with GPT-4o-mini
        console.log('🤖 Analyzing articles with GPT-4o-mini...\n');

        const prompt = buildAnalysisPrompt(documents);
        
        const response = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
                {
                    role: 'system',
                    content: 'You are the CSV Radar News Intelligence Analyst. Analyze energy sector news and extract key insights for executive stakeholders.'
                },
                {
                    role: 'user',
                    content: prompt
                }
            ],
            temperature: 0.3,
            response_format: { type: 'json_object' }
        });

        const analysis = JSON.parse(response.choices[0].message.content || '{}');
        
        console.log('✅ Analysis complete!\n');
        console.log(`  Highlights: ${analysis.highlights?.length || 0}`);
        console.log(`  Datapoints: ${analysis.datapoints?.length || 0}`);
        console.log(`  Trends: ${analysis.trends?.length || 0}\n`);

        // Build newsletter content
        const newsletter = buildNewsletterMarkdown(analysis, documents, docsBySource, today);

        // Save to file
        const dateStr = new Date().toISOString().split('T')[0];
        const filename = `CSV-Market-Intelligence-Newsletter-${dateStr}.md`;
        const filepath = path.join(process.cwd(), '../../storage/digests', filename);
        
        fs.writeFileSync(filepath, newsletter);

        console.log(`✅ Newsletter generated successfully!`);
        console.log(`📁 Saved to: storage/digests/${filename}\n`);

        await pool.end();
        process.exit(0);
    } catch (error: any) {
        console.error('\n❌ Error:', error.message);
        console.error(error.stack);
        await pool.end();
        process.exit(1);
    }
}

function buildAnalysisPrompt(documents: any[]): string {
    const articlesText = documents.map((a: any) => 
        `ID: ${a.id}
Source: ${a.source_name}
Date: ${a.published_at || a.created_at}
Title: ${a.title}
Content: ${(a.content || '').substring(0, 500)}...
URL: ${a.url || 'N/A'}`
    ).join('\n\n---\n\n');

    return `You are analyzing energy sector news from multiple sources across the Philippines, Southeast Asia, and global markets.

ARTICLES (${documents.length} total from past 7 days):

${articlesText}

---

Generate a comprehensive weekly newsletter with:

1. **TOP HIGHLIGHTS** (5-7 most important stories):
   - Focus on: regulatory changes, market developments, major investments, technology trends
   - Each highlight should have:
     * Compelling headline (5-10 words)
     * 2-3 sentence executive summary
     * Source attribution
     * Related document IDs (array of UUIDs)
   - Prioritize stories with broad market impact
   - Mix sources (don't favor one publication)

2. **KEY DATAPOINTS** (8-12 quantitative insights):
   - Extract specific numbers, dates, financial figures
   - Examples: capacity additions (MW), investment amounts ($), policy deadlines, price changes
   - Each datapoint should have:
     * Descriptive label
     * Numeric value
     * Unit of measurement
     * Source attribution
     * Related document IDs

3. **MARKET TRENDS** (3-5 emerging patterns):
   - Identify recurring themes across multiple articles
   - Examples: "Increased LNG imports", "Renewable energy policy momentum"
   - 1-2 sentences per trend

Return JSON with this exact structure:
{
  "highlights": [
    {
      "title": "Headline here",
      "summary": "Executive summary here",
      "source": "Source name",
      "documentIds": ["uuid1", "uuid2"]
    }
  ],
  "datapoints": [
    {
      "label": "Description",
      "value": "123",
      "unit": "MW",
      "source": "Source name",
      "documentIds": ["uuid1"]
    }
  ],
  "trends": [
    {
      "title": "Trend name",
      "description": "Trend description",
      "articleCount": 3
    }
  ]
}

CRITICAL:
- Use ONLY document IDs from the articles provided above
- Do NOT fabricate data or reference external sources
- Focus on Philippine and Southeast Asian energy markets
- Prioritize actionable intelligence over general news`;
}

function buildNewsletterMarkdown(analysis: any, documents: any[], docsBySource: any, today: string): string {
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - 7);
    
    const formatDate = (date: Date) => date.toLocaleDateString('en-US', { 
        month: 'long', 
        day: 'numeric', 
        year: 'numeric' 
    });

    let md = `# CSV Market Intelligence Newsletter

**Energy Sector Update**  
**Period:** ${formatDate(weekStart)} – ${today}  
**Sources:** ${Object.keys(docsBySource).join(', ')}  
**Total Articles Analyzed:** ${documents.length}

---

## 📊 Executive Summary

This week's newsletter synthesizes energy sector developments from ${Object.keys(docsBySource).length} leading publications, covering Philippine markets, Southeast Asian regional trends, and global impacts on local energy dynamics.

---

## 🔥 Top Highlights

`;

    // Highlights
    if (analysis.highlights && analysis.highlights.length > 0) {
        analysis.highlights.forEach((h: any, idx: number) => {
            md += `### ${idx + 1}. ${h.title}\n\n`;
            md += `${h.summary}\n\n`;
            md += `**Source:** ${h.source}\n\n`;
            
            // Add article links
            if (h.documentIds && h.documentIds.length > 0) {
                const relatedArticles = documents.filter((a: any) => h.documentIds.includes(a.id));
                if (relatedArticles.length > 0) {
                    md += `**Related Articles:**\n`;
                    relatedArticles.forEach((a: any) => {
                        md += `- [${a.title}](${a.url || '#'}) (${a.source_name}, ${a.published_at || a.created_at})\n`;
                    });
                    md += '\n';
                }
            }
            md += '---\n\n';
        });
    } else {
        md += `*No highlights extracted this week.*\n\n`;
    }

    // Key Datapoints
    md += `## 📈 Key Datapoints\n\n`;
    
    if (analysis.datapoints && analysis.datapoints.length > 0) {
        md += `| Metric | Value | Source |\n`;
        md += `|--------|-------|--------|\n`;
        
        analysis.datapoints.forEach((dp: any) => {
            md += `| ${dp.label} | **${dp.value} ${dp.unit}** | ${dp.source} |\n`;
        });
        md += '\n';
    } else {
        md += `*No quantitative datapoints extracted this week.*\n\n`;
    }

    // Market Trends
    if (analysis.trends && analysis.trends.length > 0) {
        md += `## 🔍 Emerging Trends\n\n`;
        
        analysis.trends.forEach((trend: any, idx: number) => {
            md += `### ${idx + 1}. ${trend.title}\n\n`;
            md += `${trend.description}\n\n`;
            md += `*Mentioned in ${trend.articleCount} articles*\n\n`;
        });
    }

    // Coverage Breakdown
    md += `## 📰 Coverage Breakdown\n\n`;
    md += `| Source | Articles |\n`;
    md += `|--------|----------|\n`;
    
    Object.entries(docsBySource)
        .sort((a: any, b: any) => b[1].length - a[1].length)
        .forEach(([source, arts]: [string, any]) => {
            md += `| ${source} | ${arts.length} |\n`;
        });
    md += '\n';

    // Full Article List
    md += `---

## 📋 Full Article List

`;
    
    documents.slice(0, 30).forEach((a: any, idx: number) => {
        md += `${idx + 1}. **${a.title}**  \n`;
        md += `   *${a.source_name}* • ${a.published_at || a.created_at}  \n`;
        if (a.url) {
            md += `   [Read more →](${a.url})  \n`;
        }
        md += '\n';
    });

    if (documents.length > 30) {
        md += `\n*...and ${documents.length - 30} more articles*\n\n`;
    }

    md += `---

*Generated by CSV Radar News Intelligence System*  
*Last updated: ${new Date().toISOString()}*
`;

    return md;
}

main();
