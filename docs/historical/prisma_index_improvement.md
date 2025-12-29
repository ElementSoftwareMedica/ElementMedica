# Prisma Index Improvements - Phase 1

## Context
Analysis showed only 1 model (TemplateLink) has `@@index([deletedAt])`.
Most queries filter by tenantId AND deletedAt → compound index needed.

## Strategy
Phase 1 (Quick Wins): Add to 5 CRITICAL models only (minimize risk)
Phase 2 (Later): Add to remaining 46 models

## Critical Models Selected
1. **Person** - Most queried (5k+ rows typical)
2. **Company** - Core entity (100-1k rows)
3. **Course** - Referenced heavily (50-500 rows)
4. **CourseSchedule** - Time-based queries (1k-10k rows)
5. **Attestato** - Certificates, heavily filtered (10k+ rows)

## Index to Add
@@index([tenantId, deletedAt])

## Benefit
- Soft delete queries 3-5x faster
- WHERE tenantId = X AND deletedAt IS NULL optimized
- Minimal migration risk (only 5 models)

## Phase 2 Scope (future)
Remaining 46 models with deletedAt field
