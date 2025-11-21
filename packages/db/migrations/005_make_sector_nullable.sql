-- Migration 005: Make sector column nullable in sources table
-- Created at: 2025-11-14
-- Reason: TypeScript types define sector as optional, but DB has NOT NULL constraint

-- Remove NOT NULL constraint from sector column
ALTER TABLE sources 
ALTER COLUMN sector DROP NOT NULL;
