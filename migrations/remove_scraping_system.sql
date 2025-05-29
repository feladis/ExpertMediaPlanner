-- Migration: Remove Legacy Scraping System
-- Date: 2025-01-29
-- Description: Complete removal of obsolete scraping tables and constraints
-- Note: Data backup already created in backup_expert_sources and backup_expert_content

BEGIN;

-- Step 1: Drop foreign key constraints first (safe order)
ALTER TABLE expert_content_relevance DROP CONSTRAINT IF EXISTS expert_content_relevance_expert_id_fkey;
ALTER TABLE expert_content_relevance DROP CONSTRAINT IF EXISTS expert_content_relevance_scraped_content_id_fkey;

-- Step 2: Drop tables in dependency order
DROP TABLE IF EXISTS expert_content_relevance CASCADE;
DROP TABLE IF EXISTS scraped_content CASCADE;
DROP TABLE IF EXISTS scraping_targets CASCADE;

-- Step 3: Clean up any remaining indexes
DROP INDEX IF EXISTS idx_scraped_content_url;
DROP INDEX IF EXISTS idx_scraped_content_hash;
DROP INDEX IF EXISTS idx_scraped_content_domain;
DROP INDEX IF EXISTS idx_scraping_targets_domain;
DROP INDEX IF EXISTS idx_expert_content_relevance_score;
DROP INDEX IF EXISTS idx_expert_content_relevance_expert_id;

-- Step 4: Clean up any sequences (if they exist)
DROP SEQUENCE IF EXISTS scraped_content_id_seq CASCADE;
DROP SEQUENCE IF EXISTS scraping_targets_id_seq CASCADE;
DROP SEQUENCE IF EXISTS expert_content_relevance_id_seq CASCADE;

COMMIT;

-- Verification: Check that backup tables still exist
SELECT 'Backup verification' as status, 
       (SELECT COUNT(*) FROM backup_expert_sources) as sources_backed_up,
       (SELECT COUNT(*) FROM backup_expert_content) as content_backed_up;