# AGENTS.md

This document is the **README for AI coding agents**. It complements the human-facing README.md so that agents can develop safely and efficiently.

---

## Documentation of Process vs Policy

This repository separates **policy** from **how-to guidance**:

- **AGENTS.md = Policy (MUST/MUST NOT)**  
  Contains the mandatory rules agents must follow (e.g., language requirements, required sections, validation expectations, boundaries).
  Keep it short and stable.

- **SKILLS = Procedure / Templates / Checklists**  
  Contains step-by-step workflows, templates, and checklists used to comply with policy.
  Prefer updating skills when improving writing structure or workflow details.

Rule of thumb:
- If it is a non-negotiable rule for reviews/CI: put it in **AGENTS.md**.
- If it is an example, template, or writing process: put it in a **skill**.

---

## Setup Steps

* Recommended: VS Code Dev Container / GitHub Codespaces (use the `.devcontainer/` image).
* On the first run, execute `vorbere run setup` at the project root to make sure dependencies are intact.
* Task runner: `vorbere` (CI uses the `vorbere` tasks described later).

---

## Build & Run

* Build: `vorbere run build`
* Check (includes type check): `vorbere run check`
* Test: `vorbere run test`
* Run during development: `vorbere run dev`
* Cleanup: remove build artifacts (such as `./dist/`) with `rm -rf ./dist/` (equivalent to `vorbere run clean`).

---

## Project Structure

We follow the project layout.

```
.
├─ src/<name>.html        # Rollup entry point
├─ src/<name>.tsx
├─ src/assets/            # Static assets such as images and stylesheets
│   └── images/
├─ src/utils/             # Helper functions and utilities
│   ├── Global.scss
│   ├── Theme.tx
│   └── responseUtils.ts
├─ src/pages/<name>/      # Page-specific layouts and content components
│   ├── App.tsx
│   └── <name>.module.scss
├─ src/components/        # Reusable React components
│   ├── atom/
│   │  ├── SearchText.tsx
│   │  └── Button.tsx
│   └── block/
│       ├── UserLists.tsx
│       └── Header.tsx
├─ src/services/          # Service logic such as API requests and authentication
│   ├── api.ts
│   └── models/
├─ public/                # Static files (HTML, icons, etc.)
│   ├── robots.txt
│   └── images/favicon.png
├─ dist/                  # Build artifacts (generated; not tracked by Git)
├─ package.json           # Package management file
├─ vorbere.yaml           # Task definitions for vorbere
└─ docs/                  # Documentation
```

### Roles and Guidelines

* Place shared logic in `src/utils/` or `src/services/` and shared UI in `src/components/` (use `atom/` for small primitives and `block/` for composed pieces). Keep page-specific code under `src/pages/<name>/`.
* Use `src/<name>.tsx` only for application bootstrapping and route/entry wiring; avoid putting business logic in entry files.
* Put API requests, authentication and data models under `src/services/`.
* Store static assets and global styles in `src/assets/` (images, `Global.scss`, theme files) and `public/` for true static files (`robots.txt`, favicon).
* Co-locate tests with the code they exercise (e.g., `src/pages/<name>/__tests__/*.test.ts`).

### Agent-Specific Rules

* Place new files according to the directory guidelines above; avoid introducing unnecessary top-level directories.
* When modifying existing functions, add or update unit tests and confirm `vorbere run test` passes.
* When writing files or accessing external resources, use temporary directories so existing test data is not overwritten.

---

## Coding Standards

* Always run `vorbere run check` to ensure code passes static checks and is properly formatted.
* Run `vorbere run check` and ensure there are no warnings (CI requirement).
* Do not silently discard errors.. Prefer `console.error` for user-facing messages.
* Extract magic numbers and hard-coded URLs into constants with meaningful names within the module.
* Avoid large, unrelated refactors and keep the impact of changes minimal.
* The following comments are required:
  * File header
  * Function header
* Implementation and comments must always be kept consistent.

---

## Testing & Verification

* Unit tests: `vorbere run test`
* When command behavior changes, keep usage examples in `README.md` and fixtures under `test` consistent.

### Static Analysis / Checks / Vulnerability Scanning

* Static analysis + code quality: `vorbere run check` (runs TypeScript `--noEmit` and ESLint)
* Vulnerability scanning: `npm audit`

---

## CI Requirements

GitHub Actions (`.github/workflows/static.yml`) runs the following:

* `vorbere run check`
* `vorbere run test`
* `vorbere run build`

Confirm `vorbere run check` / `vorbere run test` / `vorbere run build` succeed locally before opening a PR. If they fail, format and validate locally, then rerun.

---

## Security & Data Handling

* Do not commit secrets or confidential information.
* Do not log personal or authentication data in logs or error messages.
* Use fictitious URLs and passwords in test data; avoid hitting real services.
* Obtain user approval before accessing external networks (disabled by default in the agent environment).

---

## Agent Notes

* If multiple `AGENTS.md` files exist, reference the one closest to your working directory (this repository only has the top-level file).
* When instructions conflict, prioritize explicit user prompts and clarify any uncertainties.
* Before and after your work, confirm `vorbere run check`, `vorbere run test` and `vorbere run build` succeed. If they fail, report the cause and mitigation.

---

## Branch Workflow (GitHub Flow)

This project follows **GitHub Flow** based on `main`.

* **main branch**: Always releasable. Direct commits are forbidden; use pull requests.
* **Feature branches (`feature/<topic>`)**: Branch from `main` for new features or enhancements, then open a PR when done.
* **Hotfix branches (`hotfix/<issue>`)**: Branch from `main` for urgent fixes, merge promptly after CI passes.

### Rules

* Always branch from `main`.
* Assign reviewers when opening a PR and merge only after CI passes.
* Feel free to delete branches after merging.

---

## Commit Message Policy

Commit messages MUST follow **Conventional Commits** and MUST be written in **English**.

### Header
`type(scope?): description`

- `type`: feat / fix / docs / style / refactor / test / chore
- `scope`: optional (module/package/directory)
- `description`: concise present-tense English summary

### Body
- First body line MUST state the **WHY** (reason for the change) in a single English sentence.
- Then list the **HOW** as per-file bullet points in English (`path: concrete change`).
- Do not claim tests passed unless they were actually run.

### Granularity
- One semantic change per commit.
- Keep generated files separate when practical; do not mix with other changes.

For structured authoring (template, checklist), use the skill: `conventional-commits-authoring`.

---

## Documentation Policy

- **Language**: All documentation (README.md, docs/, inline doc-comments) MUST be written in **English**.
- **README.md (top level)** is onboarding-first: overview, install, and one quick-start. Keep it short and link to details in `docs/`.
- **docs/** holds detailed documentation and is organized as:
  - **User guides** (practical usage / workflows)
  - **Specification references** (contracts: schema, flags, processing rules)
  - If content mixes both, split it into the appropriate documents.
- **Source of truth**
  - For post-implementation updates, treat **code + passing tests** as SoT and use `docs-maintenance-implementation-sync`.
  - For design-first work where the **spec is SoT**, use the spec-driven skills (`spec-driven-doc-authoring` / `spec-to-code-implementation`).
- **PR hygiene**: Update docs with behavior changes. If no doc updates are needed, explicitly note **"No documentation changes"** in the PR description.

---

## Dependency Management Policy

* Add dependencies with `npm install <module>` and keep `package.json` / `package-lock.json` in sync.
* For dependency updates, state the target module and reason in the PR body.
* Check external dependencies with `npm audit` and report as needed.

---

## Release Process

* Follow **SemVer** for versioning.
* Tag new releases with `git tag vX.Y.Z` and verify `make release` outputs.
* Update CHANGELOG.md and reflect the changes in the release notes (include generators in the PR if they were used).

### CHANGELOG.md Policy

* **Sections**: Follow `[Keep a Changelog]` categories - `Added / Changed / Fixed / Deprecated / Removed / Security`.
* **Language**: English.
* **Writing Principles**:
  * Describe "what changes for the user" in one sentence; include implementation details only when needed.
  * Emphasize **breaking changes** in bold and provide migration steps.
  * Include PR/Issue numbers when possible (e.g., `(#123)`).
* **Workflow**:
  1. Add entries to the `Unreleased` section in feature PRs.
  2. Update the version number and date in release PRs.
  3. After tagging, copy the relevant section into the release notes.
* **Links (recommended)**:
  * Add comparison links at the end of the file.
* **Supporting Tools** (optional):
  * Use tools like `git-cliff` or `conventional-changelog` to draft entries, then edit manually.

---

## PR Template

PR descriptions MUST be written in **English** and MUST include:
- Motivation
- Design
- Tests (only what was actually run)
- Risks

For structured authoring (template, checklist), use the skill: `pr-description-authoring`.

---

## Checklist

* [ ] `vorbere run check`
* [ ] `vorbere run test`
* [ ] `vorbere run build`
