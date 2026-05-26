# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Raven is a cross-platform Git desktop client built with Tauri 2 (Rust backend) + React + TypeScript. The Rust side shells out to the system `git` binary — there is no libgit2 or similar; all git operations go through `std::process::Command`.

## Commands

```bash
# Dev (launches Vite + Tauri together)
bun run tauri dev

# Frontend only (no Tauri window, for UI iteration)
bun run dev

# Type-check frontend
bun run typecheck

# Production build
bun run tauri build

# Lint/format Rust
cargo clippy --manifest-path src-tauri/Cargo.toml
cargo fmt --manifest-path src-tauri/Cargo.toml
```

No test suite exists yet.

## Architecture

### Frontend → Backend boundary

All Tauri commands are declared in `src-tauri/src/lib.rs` and implemented under `src-tauri/src/commands/`. The frontend calls them exclusively through `src/lib/tauri.ts`, which exports a single `api` object wrapping every `invoke<T>(...)` call. All shared TypeScript types (DTOs) live in that same file.

Adding a new command requires:
1. Implement the `#[tauri::command]` fn in `src-tauri/src/commands/<module>.rs`
2. Register it in `lib.rs` `invoke_handler![]`
3. Add the corresponding `api.xxx` wrapper + TypeScript type in `src/lib/tauri.ts`

### Rust internals

```
src-tauri/src/
  git/
    cli.rs      — GitCommand struct; wraps Command::new("git"), args never shell-concatenated
    parsers.rs  — parses git porcelain/log output into typed structs
    types.rs    — Rust-side git data types
  commands/     — one file per feature domain (status, diff, staging, commit, …)
  db/
    connection.rs — SQLite open + inline migrations (repositories + preferences tables)
    repositories.rs / preferences.rs — CRUD helpers
  errors.rs     — AppError enum; serializes to {kind, message, exitCode} for the frontend
```

`DbState` (a `Mutex<Connection>`) is managed via Tauri's state system and injected into commands that need it.

### Frontend internals

```
src/
  lib/tauri.ts          — API layer + all shared TS types (single source of truth)
  features/repository/  — repository.store.ts: global Zustand store (repo, view, status, error, AI state)
  features/changes/     — staged/unstaged file list + diff viewer
  features/history/     — commit log + commit detail
  features/graph/       — branch graph view
  features/branches/    — branch list, checkout, create, merge
  features/stash/       — stash list, pop, apply, drop
  features/ai/          — AISuggestModal (currently hardcoded mock suggestions)
  features/palette/     — CommandPalette (⌘K)
  components/layout/    — IconRail, TopBar, StatusBar, ErrorBanner
```

State flows through a single Zustand store (`useRepoStore`). Views are switched by setting `store.view` (`"changes" | "history" | "graph" | "branches" | "stash"`).

### Styling

CSS custom properties (OKLCH design tokens) are defined in `src/styles.css` and used directly via inline `style={}` props — Tailwind is used sparingly for utility classes. Typography uses Geist Sans / Geist Mono via `@fontsource`. The `@` alias resolves to `src/`.

### Persistence

SQLite database stored in the OS app-data directory (managed by Tauri). Two tables: `repositories` (recent repos list) and `preferences` (key/value store). Migrations run inline in `db/connection.rs` on startup.

### Error handling

Rust errors propagate as `AppError` (serialized to `{kind, message, exitCode}`). On the frontend, `isAppError` / `errorMessage` helpers in `tauri.ts` normalise errors; the store surfaces them via `store.error` → `ErrorBanner`.

## Key shortcuts (global)

| Shortcut | Action |
|----------|--------|
| ⌘K | Open Command Palette |
| ⌘J | Open AI Suggest Modal |
