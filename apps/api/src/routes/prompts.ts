/**
 * Prompt Management API Routes
 * 
 * Endpoints for viewing and managing extraction prompt templates
 */

import { Router, Request, Response } from 'express';
import { query, queryOne } from '@csv/db';
import { 
    EXTRACTION_PROMPTS, 
    getPromptByTemplate, 
    getAvailableTemplates, 
    isValidTemplate,
    PromptTemplate 
} from '../prompts/extraction-prompts';

const router: Router = Router();

/**
 * GET /api/v1/prompts
 * List all available prompt templates
 */
router.get('/', async (req: Request, res: Response) => {
    try {
        const templates = getAvailableTemplates();
        
        const promptList = templates.map(name => ({
            name,
            preview: EXTRACTION_PROMPTS[name].split('\n')[0].trim(), // First line as preview
            length: EXTRACTION_PROMPTS[name].length,
            linesCount: EXTRACTION_PROMPTS[name].split('\n').length
        }));

        res.json({
            success: true,
            data: {
                templates: promptList,
                total: templates.length
            }
        });
    } catch (error) {
        console.error('[PromptAPI] Error listing prompts:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to list prompt templates'
        });
    }
});

/**
 * GET /api/v1/prompts/:name
 * Get full text of a specific prompt template
 */
router.get('/:name', async (req: Request, res: Response) => {
    try {
        const { name } = req.params;

        if (!isValidTemplate(name)) {
            return res.status(404).json({
                success: false,
                error: `Prompt template '${name}' not found`
            });
        }

        const prompt = getPromptByTemplate(name as PromptTemplate);

        res.json({
            success: true,
            data: {
                name,
                prompt,
                length: prompt.length,
                linesCount: prompt.split('\n').length
            }
        });
    } catch (error) {
        console.error('[PromptAPI] Error retrieving prompt:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to retrieve prompt template'
        });
    }
});

/**
 * PUT /api/v1/prompts/sources/:sourceId
 * Update a source's prompt template
 */
router.put('/sources/:sourceId', async (req: Request, res: Response) => {
    try {
        const { sourceId } = req.params;
        const { promptTemplate } = req.body;

        // Validate prompt template
        if (promptTemplate && !isValidTemplate(promptTemplate)) {
            return res.status(400).json({
                success: false,
                error: `Invalid prompt template '${promptTemplate}'. Available templates: ${getAvailableTemplates().join(', ')}`
            });
        }

        // Check if source exists
        const existing = await queryOne<{ id: string; name: string }>(
            'SELECT id, name FROM sources WHERE id = $1',
            [sourceId]
        );

        if (!existing) {
            return res.status(404).json({
                success: false,
                error: `Source ${sourceId} not found`
            });
        }

        // Update source
        const result = await queryOne<{
            id: string;
            name: string;
            prompt_template: string | null;
            extraction_prompt: string | null;
        }>(
            `UPDATE sources 
             SET prompt_template = $1, updated_at = NOW() 
             WHERE id = $2 
             RETURNING id, name, prompt_template, extraction_prompt`,
            [promptTemplate || null, sourceId]
        );

        console.log(`[PromptAPI] Updated source ${existing.name} to use template: ${promptTemplate || 'default'}`);

        res.json({
            success: true,
            data: result,
            message: `Source '${existing.name}' updated to use ${promptTemplate ? `template '${promptTemplate}'` : 'default template'}`
        });
    } catch (error) {
        console.error('[PromptAPI] Error updating source prompt:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update source prompt template'
        });
    }
});

/**
 * GET /api/v1/prompts/sources/:sourceId
 * Get the current prompt configuration for a source
 */
router.get('/sources/:sourceId', async (req: Request, res: Response) => {
    try {
        const { sourceId } = req.params;

        const source = await queryOne<{
            id: string;
            name: string;
            type: string;
            prompt_template: string | null;
            extraction_prompt: string | null;
        }>(
            'SELECT id, name, type, prompt_template, extraction_prompt FROM sources WHERE id = $1',
            [sourceId]
        );

        if (!source) {
            return res.status(404).json({
                success: false,
                error: `Source ${sourceId} not found`
            });
        }

        // Determine effective prompt
        let effectivePrompt: string;
        let promptSource: string;

        if (source.extraction_prompt) {
            effectivePrompt = source.extraction_prompt;
            promptSource = 'custom';
        } else if (source.prompt_template && isValidTemplate(source.prompt_template)) {
            effectivePrompt = getPromptByTemplate(source.prompt_template as PromptTemplate);
            promptSource = `template:${source.prompt_template}`;
        } else {
            effectivePrompt = getPromptByTemplate('news_article');
            promptSource = 'template:news_article (default)';
        }

        res.json({
            success: true,
            data: {
                source: {
                    id: source.id,
                    name: source.name,
                    type: source.type
                },
                promptTemplate: source.prompt_template,
                hasCustomPrompt: !!source.extraction_prompt,
                promptSource,
                effectivePrompt: {
                    preview: effectivePrompt.split('\n').slice(0, 5).join('\n') + '\n...',
                    length: effectivePrompt.length
                }
            }
        });
    } catch (error) {
        console.error('[PromptAPI] Error retrieving source prompt:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to retrieve source prompt configuration'
        });
    }
});

/**
 * POST /api/v1/prompts/sources/:sourceId/custom
 * Set a custom extraction prompt for a source (overrides template)
 */
router.post('/sources/:sourceId/custom', async (req: Request, res: Response) => {
    try {
        const { sourceId } = req.params;
        const { extractionPrompt } = req.body;

        if (!extractionPrompt || typeof extractionPrompt !== 'string') {
            return res.status(400).json({
                success: false,
                error: 'extractionPrompt is required and must be a string'
            });
        }

        // Check if source exists
        const existing = await queryOne<{ id: string; name: string }>(
            'SELECT id, name FROM sources WHERE id = $1',
            [sourceId]
        );

        if (!existing) {
            return res.status(404).json({
                success: false,
                error: `Source ${sourceId} not found`
            });
        }

        // Update source with custom prompt
        const result = await queryOne<{
            id: string;
            name: string;
            prompt_template: string | null;
            extraction_prompt: string | null;
        }>(
            `UPDATE sources 
             SET extraction_prompt = $1, updated_at = NOW() 
             WHERE id = $2 
             RETURNING id, name, prompt_template, extraction_prompt`,
            [extractionPrompt, sourceId]
        );

        console.log(`[PromptAPI] Set custom prompt for source ${existing.name}`);

        res.json({
            success: true,
            data: result,
            message: `Custom prompt set for source '${existing.name}'`
        });
    } catch (error) {
        console.error('[PromptAPI] Error setting custom prompt:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to set custom extraction prompt'
        });
    }
});

/**
 * DELETE /api/v1/prompts/sources/:sourceId/custom
 * Remove custom prompt (will fall back to template or default)
 */
router.delete('/sources/:sourceId/custom', async (req: Request, res: Response) => {
    try {
        const { sourceId } = req.params;

        const existing = await queryOne<{ id: string; name: string }>(
            'SELECT id, name FROM sources WHERE id = $1',
            [sourceId]
        );

        if (!existing) {
            return res.status(404).json({
                success: false,
                error: `Source ${sourceId} not found`
            });
        }

        await query(
            'UPDATE sources SET extraction_prompt = NULL, updated_at = NOW() WHERE id = $1',
            [sourceId]
        );

        console.log(`[PromptAPI] Removed custom prompt from source ${existing.name}`);

        res.json({
            success: true,
            message: `Custom prompt removed from source '${existing.name}'. Will use template or default.`
        });
    } catch (error) {
        console.error('[PromptAPI] Error removing custom prompt:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to remove custom extraction prompt'
        });
    }
});

export default router;
