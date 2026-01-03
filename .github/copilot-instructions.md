# Copilot Working Parameters (Project Defaults)

These rules describe how GitHub Copilot should operate when making changes in this repository.

## Product / Scope

- Prefer **feature-rich** implementations when adding functionality, but keep performance in mind.
- Do not invent new UX beyond what is requested.
- Keep changes consistent with existing patterns in the repo.

## Quality Bar

- Write **beautiful, readable code**.
- Prioritize correctness and maintainability.
- Avoid unnecessary complexity and avoid gratuitous refactors.

## Validation

- After making code changes, **always run** `npm test` and fix any failures caused by the change.

## Comments / Documentation

The request was: “comment every single code snippet and every single file of the project in detail”.

That is generally not practical (it would massively bloat the codebase and make maintenance harder). Instead, use this policy:

- Add **professional, helpful comments** for:
  - Non-obvious logic
  - Security-sensitive logic
  - Complex transformations / validation
  - Public APIs / exported functions
- Do **not** comment trivial lines.
- When editing existing code, keep or improve existing comments without turning files into essays.

Documentation:

- When behavior changes, update documentation **in detail** (README or relevant docs) in the same change.
- Ensure documentation stays accurate and consistent with the implementation.

## Safety

- Do not weaken authentication, authorization, permissions, or input validation.
- Avoid introducing new dependencies unless clearly beneficial.

## Security + Privacy (GDPR-minded)

Treat security and privacy as first-class requirements.

- Prefer **maximum security** defaults:
  - Least privilege (RBAC/permissions), deny-by-default for sensitive operations
  - Strong input validation + output encoding; never trust client input
  - Safe file upload handling (type/size checks, path traversal defense)
  - Avoid leaking sensitive detail in error messages
- Apply **GDPR-minded** practices when storing/processing user data:
  - Data minimization: collect/store only what’s needed for the feature
  - Purpose limitation: don’t reuse personal data for unrelated features
  - Safe logging: never log passwords/tokens/session IDs; minimize PII in logs
  - Retention: prefer bounded retention for logs/audit data where practical
  - User rights: when implementing new personal-data features, consider export/delete flows
  - Security of processing: prefer encryption/secrets via env vars and avoid hard-coded secrets

Note: This repo is not a legal advice tool. When adding features with compliance implications
(emails, analytics, user tracking, data sharing), surface assumptions and keep behavior configurable.

## Communication Style

- Be direct and concise.
- Summarize changes and include how to verify them.
