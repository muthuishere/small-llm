## Why

The current README.md contains duplicated sections (two architecture diagrams, two prerequisites blocks, two API reference sections) making it confusing and hard to maintain. Documentation needs to be consolidated, structured, and accurate so new contributors and users can get started without confusion.

## What Changes

- Consolidate the README.md into a single, clean document removing all duplicate sections
- Add a `docs/` folder with structured sub-documents for deeper topics (API reference, architecture, development guide)
- Ensure the Quick Start section accurately reflects Taskfile-based workflow (not manual `cd backend && go run .`)
- Add a contribution and testing guide
- Document the browser mode (WebLLM/WebGPU) alongside server mode consistently throughout

## Capabilities

### New Capabilities

- `readme-consolidation`: Single authoritative README.md with no duplicate sections, covering both server and browser modes
- `docs-structure`: Organized `docs/` directory with separate files for API reference, architecture overview, and development guide

### Modified Capabilities

<!-- No existing specs to modify — docs folder is currently empty -->

## Impact

- `README.md` — full rewrite to remove duplication and add clarity
- `docs/` — new files: `api-reference.md`, `architecture.md`, `development.md`
- No code changes required
