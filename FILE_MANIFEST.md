# File Manifest (Strict Documentation)

This repository aims to keep a clear “what is this file for?” note for every user-authored file.

Some formats **support comments** (e.g., `.js`, `.html`, `.css`, `.ps1`, `.md`, `.env`, `.gitignore`), so those files include a small top-of-file header.

Some formats **do not support comments** (notably **pure JSON**). For those, this document acts as the authoritative description.

## Non-commentable (JSON) files

- `package.json`
  - Node project metadata: name/version, scripts, dependencies.
  - Prefer documenting behavior in README/QUICKSTART instead of trying to add invalid JSON comments.

- `package-lock.json`
  - Auto-generated dependency lockfile produced by npm.
  - Do not hand-edit; changes should come from `npm install` / `npm update`.

- `cspell.json`
  - Spellchecker configuration for the workspace (word allow-list + ignore paths).

- `.markdownlint.json`
  - Markdown lint rules configuration.

## Commentable “special” files

- `.env.example`
  - Environment variable template for local dev.
  - Copy to `.env` and replace placeholders.

- `.gitignore`
  - Ignore rules for generated output (coverage), logs, local env files, etc.

## Helper scripts

- `scripts/*.ps1`
  - Windows-friendly run helpers (start server, dev server, kill port).

- `scripts/*.js`
  - One-off admin/dev helpers (superadmin bootstrap, chat smoke/sanity checks).
  - Includes `scripts/seedCuratedContent.js` for seeding curated Tags + Resources.

## Documentation (Markdown)

- `README.md`
  - Primary project documentation: overview, features, architecture notes, and from-scratch setup + usage.

- `QUICKSTART.md`
  - Short, task-focused setup guide + common URLs for daily development.

- `PROXMOX_DEPLOYMENT.md`
  - Step-by-step guide to deploy Piqniq from scratch on a Proxmox hypervisor (VM-based, Docker or native).

- `USER_MANUAL.md`
  - End-user and staff/admin usage guide covering current site features and workflows.

- `FEATURES.md`
  - Feature catalog for the platform (what exists and what it does).

- `SECURITY.md`
  - Security posture and operational guidance (reporting, best practices, and deployment notes).

- `IMPLEMENTATION.md`
  - Engineering notes describing major implementation decisions and changes.

- `IMPLEMENTATION_COMPLETE.md`
  - Snapshot/status doc confirming completed implementation work.

- `BUTTON_AUDIT_REPORT.md`
  - UI audit output and findings for button/link wiring and navigation behavior.

- `.github/copilot-instructions.md`
  - Repository-specific Copilot working rules (quality bar, testing expectations, commenting policy).

## API routes (Express)

- `routes/news.js`
  - Server-side RSS/Atom aggregation for the Home page Tech News feed (`GET /api/news`).

- `routes/portfolio.js`
  - Personal portfolio API (owner editing + invite-token access model).

- `routes/sitePortfolio.js`
  - Site-wide staff-curated portfolio feed (`GET /api/site-portfolio`) + permission-gated CRUD.

- `routes/study.js`
  - Study Room API (private per-user workspaces, items, todos, focus, templates, review).

If you want to be stricter still, I can extend this manifest to include key non-Markdown files (e.g., `app.js`, `routes/*`, `models/*`) as a single-line index in addition to their per-file headers.
