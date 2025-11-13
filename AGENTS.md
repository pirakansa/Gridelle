# AGENTS.md

This document is the **README for AI coding agents**. It complements the human-facing README.md so that agents can develop safely and efficiently.

---

## 1. Setup Steps

* Recommended: VS Code Dev Container / GitHub Codespaces (use the `.devcontainer/` image).
* On the first run, execute `npm install` at the project root to make sure dependencies are intact.
* Task runner: `npm` (CI uses the `npm` targets described later).

---

## 2. Build & Run

* Build: `npm run build`
* Type check : `npm run type-check`
* Lint: `npm run lint`
* Test: `npm run test`
* Run during development: `npm run dev`
* Cleanup: remove build artifacts (such as `./dist/`) with `rm -rf ./dist/` (equivalent to `npm run clean`).

---

## 3. Project Structure

We follow the project layout.

```
.
├─ src/<name>.html         # Rollup entry point
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
├─ package.tson           # Build / test / release tasks
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
* When modifying existing functions, add or update unit tests and confirm `npm run test` passes.
* When writing files or accessing external resources, use temporary directories so existing test data is not overwritten.

---

## 4. Coding Standards
* Always run `npm run lint` to ensure code passes lint checks and is properly formatted.
* Run `npm run lint` for static checks and ensure there are no warnings (CI requirement).
* Do not silently discard errors.. Prefer `console.error` for user-facing messages.
* Extract magic numbers and hard-coded URLs into constants with meaningful names within the module.
* Avoid large, unrelated refactors and keep the impact of changes minimal.
* The following comments are required:
  * File header
  * Function header
* Implementation and comments must always be kept consistent.

---

## 5. Testing & Verification

* Unit tests: `npm run test`
* When command behavior changes, keep usage examples in `README.md` and fixtures under `test` consistent.

### Static Analysis / Lint / Vulnerability Scanning

* Static analysis: `npm run type-check`
* Code quality: `npm run lint`
* Vulnerability scanning: `npm audit`

---

## 6. CI Requirements

GitHub Actions (`.github/workflows/static.yml`) runs the following:

* `npm run type-check`
* `npm run lint`
* `npm run test`
* `npm run build`

Confirm `npm run type-check` / `npm run lint` / `npm run test` / `npm run build` succeed locally before opening a PR. If they fail, format and validate locally, then rerun.

---

## 7. Security & Data Handling

* Do not commit secrets or confidential information.
* Do not log personal or authentication data in logs or error messages.
* Use fictitious URLs and passwords in test data; avoid hitting real services.
* Obtain user approval before accessing external networks (disabled by default in the agent environment).

---

## 8. Agent Notes

* If multiple `AGENTS.md` files exist, reference the one closest to your working directory (this repository only has the top-level file).
* When instructions conflict, prioritize explicit user prompts and clarify any uncertainties.
* Before and after your work, confirm `npm run type-check`, `npm run lint`, `npm run test` and `npm run build` succeed. If they fail, report the cause and mitigation.

---

## 9. Branch Workflow (GitHub Flow)

This project follows **GitHub Flow** based on `main`.

* **main branch**: Always releasable. Direct commits are forbidden; use pull requests.
* **Feature branches (`feature/<topic>`)**: Branch from `main` for new features or enhancements, then open a PR when done.
* **Hotfix branches (`hotfix/<issue>`)**: Branch from `main` for urgent fixes, merge promptly after CI passes.

### Rules

* Always branch from `main`.
* Assign reviewers when opening a PR and merge only after CI passes.
* Feel free to delete branches after merging.

---

## 10. Commit Message Policy

Commit messages follow **Conventional Commits**. Agents must comply. Write the comment section in **English**.

### Format

```
type(scope?): description
```

* `type`: feat / fix / docs / style / refactor / test / chore
* `scope`: Optional; module or directory names, etc.
* `description`: Describe the change concisely in English.

### Body

* Write the WHY (reason for the change) in a single English sentence.
* List the HOW (per-file changes) in English.

```
- internal/data/data.go: Added error return when YAML parsing fails
- pkg/req/req.go: Strengthened HTTP timeout configuration
```

### Granularity

* Default to one semantic change per commit.
* Separate generated code into logical units; do not mix with other changes.

### PRs and Commits

* Always document **Motivation / Design / Tests / Risks** in English in the PR description.
* Follow team policy on squashing after reviews; if none, keep the original commit structure.

---

## 11. Documentation Policy

* **README.md (top level)**:
  * Introduction: application overview, usage, installation.
  * Later sections: developer build steps, testing instructions.
  * Keep it accessible so first-time users can onboard smoothly.

* **docs/**:
  * Create detailed designs or supplemental docs as needed. None exist yet, so define structure and filenames when adding.

* **Operational Guidelines**:
  * Update documentation alongside code changes; if none are needed, note "No documentation changes" in the PR description.
  * Verify sample code and command examples actually work.
  * Include generation scripts when submitting auto-generated docs.

---

## 12. Dependency Management Policy

* Add dependencies with `npm install <module>` and keep `package.json` / `package-lock.json` in sync.
* For dependency updates, state the target module and reason in the PR body.
* Check external dependencies with `npm audit` and report as needed.

---

## 13. Release Process

* Follow **SemVer** for versioning.
* Tag new releases with `git tag vX.Y.Z` and verify `make release` outputs.
* Update CHANGELOG.md and reflect the changes in the release notes (include generators in the PR if they were used).

### 13.1 CHANGELOG.md Policy

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

## 14. PR Template

Include the following items when creating a PR:

* **Motivation**: Why this change is needed.
* **Design**: How you implemented it.
* **Tests**: Which tests were run.
* **Risks**: Potential side effects or concerns.

Template example:

```
### Motivation
...

### Design
...

### Tests
...

### Risks
...
```

---

## 15. Checklist

* [ ] `npm run type-check`
* [ ] `npm run lint`
* [ ] `npm run test`
* [ ] `npm run build`
