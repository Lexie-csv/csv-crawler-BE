# 📖 CSV Stories Guide

This directory contains all implementable stories for the CSV crawler project. Each story is designed to be completed in ~30 minutes with TDD methodology.

## 📋 Story Naming Convention

- **01_database_schema.md** — Foundation: database tables & migrations
- **02_typescript_types.md** — Types & data models
- **03_database_pool.md** — Connection pooling & query utilities
- **04_sources_crud.md** — RESTful source management API
- **05_crawl_job_queue.md** — Job enqueue & status tracking
- **06_llm_crawler.md** — LLM-based content fetching + deduplication
- **07_extraction_pipeline.md** — Deterministic datapoint extraction (regex + validators)
- **08_dashboard_ui.md** — Web UI crawl dashboard & job monitoring
- **09_digest_email.md** — Weekly digest generation & email delivery
- **10_datapoint_query_api.md** — Data query API & time series export

## 🎯 How to Use

1. **Start with Story #1** (`01_database_schema.md`)
2. **Read the story** (accept criteria, tests, implementation notes)
3. **Tell Copilot**: "Implement story #X"
4. **Copilot implements** following TDD approach
5. **Create `docs/implementations/0X_*.md`** documenting what was built
6. **Commit**: `git commit -m "feat(story-X): <description>"`
7. **Move to next story**

## 🧪 Testing Each Story

Each story includes:
- ✅ Unit test examples
- ✅ Integration test requirements
- ✅ E2E test guidance
- ✅ Testing commands

Run tests after implementation:
```bash
pnpm test -- --testNamePattern="<story-keyword>"
```

## 📝 Story Template (for reference)

```markdown
# Story #N: Title

## Status
🔴 Not Started | 🟡 In Progress | 🟢 Done

## Time Estimate
30 minutes

## Description
User story format: "As a [user], I need [feature] so that [benefit]"

## Acceptance Criteria
- ✅ Criterion 1
- ✅ Criterion 2
- (No mocks unless testing error cases)

## Tests Required
- Unit test: ...
- Integration test: ...

## Files to Create/Modify
- `/path/to/file.ts`

## Dependencies
- Story #N
- External library

## Next Story
After completion → Story #N+1
```

## 🚀 Key Rules

1. **No Mock Data**: Real PostgreSQL, real LLM API calls (mock only for error testing)
2. **Fail-Fast**: Break tests intentionally; verify they fail before implementing
3. **Type-Safe**: No `any` types; strict TypeScript
4. **TDD**: Write tests first, implement to pass
5. **Atomic**: Each story is self-contained; dependencies listed clearly
6. **Auditable**: Every action logged; timestamps tracked

## 💡 Pro Tips

- Read the **ACTIVE_CONTEXT.md** before starting each story
- Use `git commit` to save work after each story (conventional commits)
- Keep terminal output; verify all tests pass
- If a story is blocked, check dependencies in that story's "Dependencies" section

## 📊 Progress Tracking

Use **ACTIVE_CONTEXT.md** to track status:
```markdown
| # | Title | Status | Est. Time |
|---|-------|--------|-----------|
| 1️⃣ | Database Schema | 🟢 Done | 30m |
| 2️⃣ | TypeScript Types | 🟡 In Progress | 30m |
| ... |
```

---

**Ready to start?** Read `docs/stories/01_database_schema.md` and tell Copilot: "Implement story #1 with TDD"
