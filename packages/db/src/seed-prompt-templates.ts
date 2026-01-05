#!/usr/bin/env tsx
/**
 * Seed Prompt Templates for Existing Sources
 * 
 * This script assigns appropriate prompt templates to existing sources
 * based on their name and type.
 */

import { query } from './index';
import type { PromptTemplate } from '../../types/src/index';

interface Source {
    id: string;
    name: string;
    type: string;
    url: string;
    prompt_template: string | null;
}

/**
 * Mapping logic: Determine best template based on source name/URL
 */
function determineTemplate(source: Source): PromptTemplate | null {
    const name = source.name.toLowerCase();
    const url = source.url.toLowerCase();
    
    // Government regulations (BSP, SEC, DOE, ERC, NEA orders/circulars)
    if (
        name.includes('circular') ||
        name.includes('advisory') ||
        name.includes('memorandum') ||
        name.includes('order') ||
        name.includes('bsp') ||
        name.includes('sec') ||
        name.includes('erc') ||
        name.includes('doe') && (name.includes('order') || name.includes('circular')) ||
        url.includes('bsp.gov.ph') ||
        url.includes('sec.gov.ph') ||
        url.includes('erc.gov.ph')
    ) {
        return 'government_regulation';
    }
    
    // Press releases (official government announcements)
    if (
        name.includes('press release') ||
        name.includes('announcement') ||
        name.includes('news release') ||
        (name.includes('doe') && name.includes('news')) ||
        (name.includes('nea') && name.includes('news'))
    ) {
        return 'press_release';
    }
    
    // Energy tenders/RFPs
    if (
        name.includes('tender') ||
        name.includes('rfp') ||
        name.includes('bidding') ||
        name.includes('psalm') ||
        (name.includes('doe') && name.includes('procurement'))
    ) {
        return 'energy_tender';
    }
    
    // Financial reports (PSE disclosures, company reports)
    if (
        name.includes('pse') ||
        name.includes('disclosure') ||
        name.includes('financial') ||
        name.includes('quarterly') ||
        name.includes('annual report') ||
        url.includes('pse.com.ph') ||
        url.includes('edge.pse.com.ph')
    ) {
        return 'financial_report';
    }
    
    // News articles (default for news sources)
    if (
        source.type === 'news' ||
        name.includes('businessworld') ||
        name.includes('inquirer') ||
        name.includes('manila bulletin') ||
        name.includes('philstar') ||
        name.includes('rappler') ||
        url.includes('bworldonline.com') ||
        url.includes('inquirer.net') ||
        url.includes('mb.com.ph') ||
        url.includes('philstar.com') ||
        url.includes('rappler.com')
    ) {
        return 'news_article';
    }
    
    // Default: return null (will use system default)
    return null;
}

async function seedPromptTemplates() {
    console.log('🌱 Seeding prompt templates for existing sources...\n');
    
    try {
        // Fetch all sources
        const sources = await query<Source>(
            'SELECT id, name, type, url, prompt_template FROM sources ORDER BY name'
        );
        
        console.log(`Found ${sources.length} sources to process\n`);
        
        let updated = 0;
        let skipped = 0;
        let unchanged = 0;
        
        for (const source of sources) {
            // Skip if already has a template
            if (source.prompt_template) {
                console.log(`⊘ ${source.name} - already has template: ${source.prompt_template}`);
                unchanged++;
                continue;
            }
            
            // Determine best template
            const template = determineTemplate(source);
            
            if (!template) {
                console.log(`⊘ ${source.name} - no template match, will use default`);
                skipped++;
                continue;
            }
            
            // Update source
            await query(
                'UPDATE sources SET prompt_template = $1, updated_at = NOW() WHERE id = $2',
                [template, source.id]
            );
            
            console.log(`✓ ${source.name} → ${template}`);
            updated++;
        }
        
        console.log(`\n📊 Summary:`);
        console.log(`   Updated: ${updated}`);
        console.log(`   Skipped (no match): ${skipped}`);
        console.log(`   Unchanged (already set): ${unchanged}`);
        console.log(`   Total: ${sources.length}`);
        
        console.log(`\n✅ Prompt template seeding complete!`);
        process.exit(0);
        
    } catch (error) {
        console.error('❌ Error seeding prompt templates:', error);
        process.exit(1);
    }
}

// Run if executed directly
if (require.main === module) {
    seedPromptTemplates();
}

export { seedPromptTemplates };
