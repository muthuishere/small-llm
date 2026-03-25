# small-llm — Documentation Index

> Generated: 2026-03-23 | Scan Level: Deep | Mode: Initial Scan

## Project Summary

**small-llm** is a full-stack local LLM application that runs Qwen 2.5 0.5B inference entirely on the user's machine — no cloud calls, no API keys. It supports two distinct inference modes from the same codebase:

| Mode | Where inference runs | Entry point |
|---|---|---|
| **Server** | Go backend → llama-server subprocess (CPU/GPU) | `/server` |
| **Browser** | React → WebLLM (WebGPU in-browser) | `/browser` |

Both modes expose three interaction patterns: **Chat**, **Structured Output (JSON extraction)**, and **Tool-augmented Chat**.

---

## Documentation Files

| File | Description |
|---|---|
| [project-context.md](./project-context.md) | Full AI context — architecture, data flows, conventions, key decisions |
| [architecture.md](./architecture.md) | System architecture, component diagram, inference pipeline |
| [api-reference.md](./api-reference.md) | Complete backend API reference (all endpoints, request/response schemas) |
| [development.md](./development.md) | Developer guide — setup, testing, build, deployment |

---

## Project Parts

- **backend/** — Go 1.25, Gin framework, llama.cpp integration
- **frontend/** — React 18, Vite 6, MUI + Radix UI + TailwindCSS v4, Zustand state

## Tech Stack At a Glance

```
Frontend:  React 18 · Vite 6 · TailwindCSS v4 · MUI · Radix UI · Zustand · Axios
Backend:   Go 1.25 · Gin · llama.cpp (llama-server subprocess)
Browser:   @mlc-ai/web-llm · WebGPU
Testing:   Go test · Vitest · @testing-library/react
Deploy:    Docker · Kamal
```
