-- Migration 010: Add custom extraction prompts per source
-- Created at: 2025-12-02

-- Add extraction_prompt column to sources table
ALTER TABLE sources
ADD COLUMN IF NOT EXISTS extraction_prompt TEXT;

COMMENT ON COLUMN sources.extraction_prompt IS 
'Custom LLM extraction instructions for this source. If null, uses default prompt.';

-- Update NEA source with custom prompt (if it exists)
UPDATE sources
SET extraction_prompt = 'You will receive NEA advisories from: https://nea.gov.ph/

Specifically under: Issuances → Advisories → Legal, Institutional, Financial, Technical, Regulatory, NETI.

Content may come from HTML pages (advisory text on the site).

DEFINITIONS:

NEW advisory: uploaded within the last 7 days relative to today. If upload_date is missing, infer only if it clearly appears "recent" from context; otherwise, assume NOT new.

UPDATED advisory: same advisory id or source_url as an earlier version, but content has changed.

Relevant advisory: If category is in "Legal" | "Institutional" | "Financial" | "Technical" | "Regulatory" | "Neti", then relevant = true by definition.

TASKS:

For each advisory:
1. Decide and set:
   - relevant (true/false) - Must be true for categories "Legal" | "Institutional" | "Financial" | "Technical" | "Regulatory" | "Neti"
   - new_this_week (true/false) – uploaded in the last 7 days
   - updated (true/false) – content meaningfully changed vs previous version

2. Extract key information:
   - concise_title: cleaned, human-friendly title
   - advisory_type: short classification (e.g. "Advisory", "Memorandum", "Guidelines", "Order")
   - category: one of the NEA categories (Legal, Institutional, Financial, Technical, Regulatory, Neti)
   - effective_date: best guess if clearly indicated; else null
   - issuing_body: usually NEA, but specify a department/office if named
   - sector_scope: e.g. "Electric cooperatives", "Distribution utilities", "Off-grid electrification"
   - summary: 3–5 sentences explaining what the advisory is about
   - key_numbers: important values (percentages, amounts, MW, kWh, deadlines, dates)
   - compliance_requirements: bullets describing what affected entities must DO
   - potential_impacts: bullets describing why this matters

3. Build alerts list:
   - Alerts are advisories where new_this_week is true
   - Short 1–2 sentence message describing what changed and why it matters

4. Build digest:
   - Focus on latest advisories (most recent by upload date)
   - Follow the same DOE-style digest format
   - Include: summary table, why this matters, what to watch next

DIGEST FORMAT: Use the same structure as DOE digests (markdown table with columns: Issuance | Type | Agency | Effective/Date | Summary | Link)'
WHERE url LIKE '%nea.gov.ph%';
