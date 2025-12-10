import crypto from 'crypto';
import { Pool } from 'pg';

/**
 * Document Change Detection Service
 * Tracks document versions and detects changes between crawls
 */

export interface DocumentVersion {
    id?: string;
    source_id: string;
    document_url: string;
    document_title: string;
    content_type: string;
    version_number?: number;
    is_current?: boolean;
    content_hash: string;
    metadata_hash?: string;
    category?: string;
    issuing_body?: string;
    effective_date?: Date | string;
    published_date?: Date | string;
    summary?: string;
    topics?: any[];
    key_numbers?: any[];
    file_path?: string;
    file_size_bytes?: number;
    change_type?: string;
    changes_detected?: any;
    full_data?: any;
    first_seen_at?: Date;
    last_seen_at?: Date;
}

export interface DocumentChange {
    id?: string;
    source_id: string;
    document_url: string;
    old_version_id?: string;
    new_version_id: string;
    change_type: string;
    change_summary?: string;
    changes_detected?: any;
    significance_score?: number;
    requires_review?: boolean;
    crawl_job_id?: string;
}

export interface ChangeDetectionResult {
    isNew: boolean;
    hasChanged: boolean;
    changeType?: 'new' | 'content_updated' | 'metadata_updated' | 'title_changed' | 'date_changed' | 'no_change';
    changes?: any;
    previousVersion?: DocumentVersion;
    significanceScore?: number;
}

export class DocumentChangeDetector {
    private pool: Pool;

    constructor(pool: Pool) {
        this.pool = pool;
    }

    /**
     * Generate SHA-256 hash of content for change detection
     */
    private hashContent(content: string): string {
        return crypto.createHash('sha256').update(content, 'utf8').digest('hex');
    }

    /**
     * Generate metadata hash from key fields
     */
    private hashMetadata(doc: DocumentVersion): string {
        const metadataString = [
            doc.document_title?.trim().toLowerCase(),
            doc.issuing_body?.trim().toLowerCase(),
            doc.effective_date,
            doc.published_date,
            doc.category?.trim().toLowerCase()
        ].filter(Boolean).join('|');

        return this.hashContent(metadataString);
    }

    /**
     * Generate content hash from document
     */
    generateContentHash(doc: any): string {
        // Hash summary + topics + key numbers as proxy for content
        const contentString = [
            doc.summary?.trim().toLowerCase(),
            JSON.stringify(doc.topics || []),
            JSON.stringify(doc.key_numbers || [])
        ].filter(Boolean).join('|');

        return this.hashContent(contentString);
    }

    /**
     * Compare two versions and detect specific changes
     */
    private detectChanges(oldDoc: DocumentVersion, newDoc: DocumentVersion): any {
        const changes: any = {};

        // Check title
        if (oldDoc.document_title !== newDoc.document_title) {
            changes.title = { old: oldDoc.document_title, new: newDoc.document_title };
        }

        // Check content
        if (oldDoc.content_hash !== newDoc.content_hash) {
            changes.content = { changed: true };
        }

        // Check metadata
        if (oldDoc.metadata_hash !== newDoc.metadata_hash) {
            if (oldDoc.issuing_body !== newDoc.issuing_body) {
                changes.issuing_body = { old: oldDoc.issuing_body, new: newDoc.issuing_body };
            }
            if (oldDoc.effective_date !== newDoc.effective_date) {
                changes.effective_date = { old: oldDoc.effective_date, new: newDoc.effective_date };
            }
            if (oldDoc.published_date !== newDoc.published_date) {
                changes.published_date = { old: oldDoc.published_date, new: newDoc.published_date };
            }
            if (oldDoc.category !== newDoc.category) {
                changes.category = { old: oldDoc.category, new: newDoc.category };
            }
        }

        // Check summary
        if (oldDoc.summary !== newDoc.summary) {
            changes.summary = { changed: true, length_diff: (newDoc.summary?.length || 0) - (oldDoc.summary?.length || 0) };
        }

        return changes;
    }

    /**
     * Calculate significance score for changes (0.0 - 1.0)
     */
    private calculateSignificance(changes: any): number {
        let score = 0.0;

        if (changes.title) score += 0.3; // Title changes are significant
        if (changes.content) score += 0.4; // Content changes are most important
        if (changes.effective_date || changes.published_date) score += 0.2; // Date changes matter
        if (changes.issuing_body) score += 0.15; // Issuing body changes matter
        if (changes.category) score += 0.1; // Category changes
        if (changes.summary) score += 0.2; // Summary changes

        return Math.min(score, 1.0);
    }

    /**
     * Check if document exists and has changed
     */
    async detectChange(sourceId: string, documentUrl: string, newDocument: any): Promise<ChangeDetectionResult> {
        // Get current version
        const result = await this.pool.query(
            `SELECT * FROM document_versions 
             WHERE source_id = $1 AND document_url = $2 AND is_current = true
             ORDER BY version_number DESC LIMIT 1`,
            [sourceId, documentUrl]
        );

        const previousVersion = result.rows[0] as DocumentVersion | undefined;

        // If no previous version, it's new
        if (!previousVersion) {
            return {
                isNew: true,
                hasChanged: false,
                changeType: 'new'
            };
        }

        // Generate hashes for new document
        const contentHash = this.generateContentHash(newDocument);
        const newDoc: DocumentVersion = {
            ...newDocument,
            source_id: sourceId,
            document_url: documentUrl,
            content_hash: contentHash,
            metadata_hash: this.hashMetadata({
                ...newDocument,
                source_id: sourceId,
                document_url: documentUrl,
                content_hash: contentHash
            })
        };

        // Check if anything changed
        const contentChanged = previousVersion.content_hash !== newDoc.content_hash;
        const metadataChanged = previousVersion.metadata_hash !== newDoc.metadata_hash;

        if (!contentChanged && !metadataChanged) {
            return {
                isNew: false,
                hasChanged: false,
                changeType: 'no_change',
                previousVersion
            };
        }

        // Detect specific changes
        const changes = this.detectChanges(previousVersion, newDoc);
        const significanceScore = this.calculateSignificance(changes);

        // Determine change type
        let changeType: any = 'metadata_updated';
        if (contentChanged) {
            changeType = 'content_updated';
        } else if (changes.title) {
            changeType = 'title_changed';
        } else if (changes.effective_date || changes.published_date) {
            changeType = 'date_changed';
        }

        return {
            isNew: false,
            hasChanged: true,
            changeType,
            changes,
            previousVersion,
            significanceScore
        };
    }

    /**
     * Save new document version
     */
    async saveVersion(doc: DocumentVersion): Promise<string> {
        const client = await this.pool.connect();
        try {
            await client.query('BEGIN');

            // Mark previous versions as not current
            await client.query(
                `UPDATE document_versions 
                 SET is_current = false 
                 WHERE source_id = $1 AND document_url = $2 AND is_current = true`,
                [doc.source_id, doc.document_url]
            );

            // Get next version number
            const versionResult = await client.query(
                `SELECT COALESCE(MAX(version_number), 0) + 1 as next_version
                 FROM document_versions
                 WHERE source_id = $1 AND document_url = $2`,
                [doc.source_id, doc.document_url]
            );
            const versionNumber = versionResult.rows[0].next_version;

            // Insert new version
            const insertResult = await client.query(
                `INSERT INTO document_versions (
                    source_id, document_url, document_title, content_type,
                    version_number, is_current, content_hash, metadata_hash,
                    category, issuing_body, effective_date, published_date,
                    summary, topics, key_numbers, file_path, file_size_bytes,
                    change_type, changes_detected, full_data,
                    first_seen_at, last_seen_at
                ) VALUES (
                    $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22
                ) RETURNING id`,
                [
                    doc.source_id, doc.document_url, doc.document_title, doc.content_type,
                    versionNumber, true, doc.content_hash, doc.metadata_hash,
                    doc.category, doc.issuing_body, doc.effective_date, doc.published_date,
                    doc.summary, JSON.stringify(doc.topics || []), JSON.stringify(doc.key_numbers || []),
                    doc.file_path, doc.file_size_bytes, doc.change_type, JSON.stringify(doc.changes_detected || {}),
                    JSON.stringify(doc.full_data || {}), doc.first_seen_at || new Date(), doc.last_seen_at || new Date()
                ]
            );

            await client.query('COMMIT');
            return insertResult.rows[0].id;
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Record a document change
     */
    async recordChange(change: DocumentChange): Promise<string> {
        const result = await this.pool.query(
            `INSERT INTO document_changes (
                source_id, document_url, old_version_id, new_version_id,
                change_type, change_summary, changes_detected,
                significance_score, requires_review, crawl_job_id
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            RETURNING id`,
            [
                change.source_id, change.document_url, change.old_version_id, change.new_version_id,
                change.change_type, change.change_summary, JSON.stringify(change.changes_detected || {}),
                change.significance_score, change.requires_review, change.crawl_job_id
            ]
        );

        return result.rows[0].id;
    }

    /**
     * Process a document and handle versioning
     */
    async processDocument(sourceId: string, document: any, crawlJobId?: string): Promise<{
        versionId: string;
        changeId?: string;
        isNew: boolean;
        hasChanged: boolean;
    }> {
        const documentUrl = document.source_url || document.url || document.document_url;

        // Detect changes
        const detection = await this.detectChange(sourceId, documentUrl, document);

        // Prepare document version
        const docVersion: DocumentVersion = {
            source_id: sourceId,
            document_url: documentUrl,
            document_title: document.title,
            content_type: document.content_type || 'pdf',
            content_hash: this.generateContentHash(document),
            metadata_hash: this.hashMetadata({
                source_id: sourceId,
                document_url: documentUrl,
                document_title: document.title,
                content_type: document.content_type || 'pdf',
                content_hash: '',
                category: document.category,
                issuing_body: document.issuing_body,
                effective_date: document.effective_date || document.date_effective,
                published_date: document.published_date || document.date_published
            }),
            category: document.category || document.type,
            issuing_body: document.issuing_body,
            effective_date: document.effective_date || document.date_effective,
            published_date: document.published_date || document.date_published,
            summary: document.summary,
            topics: document.topics,
            key_numbers: document.key_numbers,
            file_path: document.file_path,
            file_size_bytes: document.file_size,
            change_type: detection.changeType,
            changes_detected: detection.changes,
            full_data: document,
            first_seen_at: new Date(),
            last_seen_at: new Date()
        };

        // Save version
        const versionId = await this.saveVersion(docVersion);

        // Record change if document changed
        let changeId: string | undefined;
        if (detection.hasChanged || detection.isNew) {
            const changeSummary = detection.isNew
                ? `New document: ${document.title}`
                : `Updated: ${Object.keys(detection.changes || {}).join(', ')}`;

            changeId = await this.recordChange({
                source_id: sourceId,
                document_url: documentUrl,
                old_version_id: detection.previousVersion?.id,
                new_version_id: versionId,
                change_type: detection.changeType || 'new',
                change_summary: changeSummary,
                changes_detected: detection.changes,
                significance_score: detection.significanceScore,
                requires_review: (detection.significanceScore || 0) >= 0.7, // High significance = needs review
                crawl_job_id: crawlJobId
            });
        }

        return {
            versionId,
            changeId,
            isNew: detection.isNew,
            hasChanged: detection.hasChanged
        };
    }

    /**
     * Get version history for a document
     */
    async getVersionHistory(sourceId: string, documentUrl: string): Promise<DocumentVersion[]> {
        const result = await this.pool.query(
            `SELECT * FROM document_versions
             WHERE source_id = $1 AND document_url = $2
             ORDER BY version_number DESC`,
            [sourceId, documentUrl]
        );

        return result.rows;
    }

    /**
     * Get recent changes for a source
     */
    async getRecentChanges(sourceId: string, limit: number = 50): Promise<any[]> {
        const result = await this.pool.query(
            `SELECT * FROM recent_document_changes
             WHERE source_id = $1
             ORDER BY detected_at DESC
             LIMIT $2`,
            [sourceId, limit]
        );

        return result.rows;
    }

    /**
     * Get changes requiring review
     */
    async getChangesForReview(sourceId?: string): Promise<any[]> {
        const query = sourceId
            ? `SELECT * FROM recent_document_changes 
               WHERE source_id = $1 AND requires_review = true 
               ORDER BY significance_score DESC, detected_at DESC`
            : `SELECT * FROM recent_document_changes 
               WHERE requires_review = true 
               ORDER BY significance_score DESC, detected_at DESC`;

        const params = sourceId ? [sourceId] : [];
        const result = await this.pool.query(query, params);

        return result.rows;
    }
}
