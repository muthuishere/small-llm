## Context

The README.md currently has two complete duplicated sections (architecture diagrams, prerequisites, API reference, development instructions) resulting from separate commits that each added a full standalone README. The `docs/` folder exists but is empty. Users hitting the repo for the first time see contradictory or repeated content.

## Goals / Non-Goals

**Goals:**
- Produce a single, canonical README.md that covers both server and browser modes without duplication
- Establish a `docs/` folder with focused sub-documents for detailed topics
- Make the Quick Start accurate (Taskfile is the primary workflow)

**Non-Goals:**
- No code changes to backend or frontend
- No new features documented that don't exist yet
- Not adding auto-generated API docs (e.g., Swagger/OpenAPI) — out of scope for this pass

## Decisions

**Single README vs. split README per mode**
→ Keep one README. The two modes share the same repo, stack, and prerequisites. Splitting would create confusion about where to start. Rationale: most OSS projects with multiple runtime modes use a single README with clear sub-sections.

**docs/ structure: flat files vs. nested folders**
→ Flat files (`docs/api-reference.md`, `docs/architecture.md`, `docs/development.md`). The project is small enough that one level of nesting is sufficient. Nested folders would be premature complexity.

**README length**
→ Keep README concise (~1 page of essentials) and link to `docs/` for deep dives. Avoids the wall-of-text problem the current README has.

## Risks / Trade-offs

- [Stale duplication re-introduced] → Use `docs/` links in README so details live in one place only
- [README diverges from actual Taskfile commands] → Verify all commands against `Taskfile.yml` before writing

## Open Questions

- Should `docs/development.md` include Docker/Kamal deployment steps (Dockerfile and deploy config already exist)?
