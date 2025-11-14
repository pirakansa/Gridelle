# Gridelle

<p align="center">
        <img src="public/images/icon-512x512.png" alt="Gridelle logo" width="320">
</p>

Gridelle is a Vite + React application that lets you review and edit YAML workbooks in a spreadsheet-like UI while keeping the original files in sync. It was designed for infrastructure repositories where huge YAML manifests are hard to skim, diff, and copy/paste safely.

## Live sandbox

- [http://gridelle.piradn.com/](http://gridelle.piradn.com/)

## Feature overview

### Spreadsheet-style editing
- Rectangular selections, fill handle copy, drag to duplicate, and range input streamline repetitive edits.
- Keyboard-friendly behavior: Enter to edit, Shift+Enter for newline, and Esc to discard edits.
- Add/remove rows and columns, sort ranges, and bulk-apply formatting.
- Preserve cell text/background colors during YAML serialization so designers can convey intent.
- Manage multiple sheets via tabs with rename/add/remove operations.

### YAML round-trip tooling
- Edit the source text inside the "YAML Input / Preview" overlay and reapply it to the current workbook.
- Import `.yml`, `.yaml`, `.json`, and compatible data files, then expand them into tables.
- Download or copy the current workbook back to YAML at any time.
- Shared status area highlights parse errors, apply results, and destructive actions.

### GitHub collaboration flows
- Load any file instantly by pasting a blob URL, or browse branches/trees after verifying repository access.
- Explore pull requests, inspect touched files, and copy the YAML payload directly from PR metadata.
- Reuse the last loaded file info to write commits back to GitHub with a single button when you have access.

### Automation & extensions
- Toggle between Firebase auth (default) and an offline mode that provides guest sessions plus GitHub PAT input, so you can keep your data local while still calling the Octokit client.
- Register custom WebAssembly modules as spreadsheet macros; each exported function becomes a reusable formula that operates on selected ranges.
- The function macro feature remains experimental and may change without notice.
- Stress-test rendering performance by generating large synthetic YAML workbooks via the bundled CLI utility.

### UX niceties
- The UI ships as a Progressive Web App, includes bilingual (JA/EN) copy, and exposes the current version inside the in-app Help section to simplify support requests.

## Architecture & stack
- **React 19 + TypeScript, Vite multi-entry build.** The Vite config wires React, the bundle visualizer, and PWA plugins while building `src/index.html`, `src/top.html`, and `src/login.html` entry points.
- **Tailwind CSS + PostCSS tooling.** Tailwind and autoprefixer are injected through Vite’s PostCSS pipeline for utility-first styling.
- **Modern dependencies.** React 19, React Router 7, Firebase 12, js-yaml, and Octokit power the UI, auth, YAML parsing, and GitHub API access.
- **Workerized YAML parsing/stringifying.** Dedicated workers keep large document conversions off the main thread to avoid UI lock ups.
- **Auth abstraction.** `src/services/auth` exposes `configureAuthClient()` so you can swap Firebase, offline mock clients, or your own SSO adapter without touching page components.
- **GitHub service layer.** URL parsing, collaborator verification, blob/tree/PR fetchers, and commit helpers live under `src/services/githubRepositoryAccessService.ts`, keeping the React components declarative.

## Getting started

### Requirements
- Node.js 18+
- npm

### Install dependencies
```bash
npm install
```

### Local development
```bash
npm run dev
```
This launches Vite on all interfaces so you can test from multiple devices.

### Production build & preview
```bash
# Production bundle
npm run build

# Debug-friendly bundle with source maps
npm run build-dev

# Preview the production output on localhost
npm run preview
```

### Quality gates
Run the same checks enforced in CI before opening a PR.
```bash
npm run type-check
npm run lint
npm run test
npm run build
```

### Available npm scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the Vite development server. |
| `npm run build` | Produce an optimized production build. |
| `npm run build-dev` | Build without minification for easier debugging. |
| `npm run preview` | Serve the production build locally. |
| `npm run type-check` | Execute TypeScript in `--noEmit` mode. |
| `npm run lint` | Run ESLint with zero-warning tolerance. |
| `npm run test` | Execute the Vitest unit suite. |
| `npm run clean` | Remove the `dist/` directory. |
| `npm run check-deps` | Detect unused dependencies via `depcheck`. |
| `npm run generate-large-sample` | Produce a large sample YAML file under `docs/`. |

All commands are defined in `package.json` and require no global installs.

## Configuration & authentication

### Environment variables
Gridelle relies on Vite env variables. Create a `.env.local` (or export them in your shell) with the following keys:

| Key | Required | Purpose |
| --- | --- | --- |
| `VITE_FIREBASE_API_KEY` | Yes (Firebase login) | Firebase Web API key used by the default auth client. |
| `VITE_FIREBASE_AUTH_DOMAIN` | Yes (Firebase login) | Firebase auth domain. |
| `VITE_APP_VERSION` | Optional | Overrides the version string rendered in the UI (defaults to `package.json` version). |
| `VITE_LOGIN_APP` | Optional | Selects the login variant (`firebase`, `offline`, custom). |

The variables are typed in `src/env.d.ts`, so missing values are surfaced during type-checking.

Example `.env.local`:
```ini
VITE_FIREBASE_API_KEY=xxxx
VITE_FIREBASE_AUTH_DOMAIN=your-app.firebaseapp.com
VITE_APP_VERSION=0.6.0+local
# Switch to the offline login variant during local experiments
VITE_LOGIN_APP=offline
```

### Switching login variants
Login bundles follow the naming convention `src/pages/login/App.<variant>.tsx` and are picked via `VITE_LOGIN_APP` (default: `firebase`). You can add your own adapter by creating a new variant, calling `configureAuthClient()`, and wiring your SSO inside that file.

```bash
# Default Firebase login
npm run build

# Offline mode with GitHub personal access tokens
VITE_LOGIN_APP=offline npm run build
```

Offline mode exposes a guest button and an input for GitHub PATs so you can unlock repository features without contacting external identity providers.

## GitHub integration workflows
The GitHub integration panel lets you bounce between blob URLs, repository trees, and pull requests from a single overlay, reusing stored repository metadata and save notices between sessions. On the top page, the panel is paired with commit helpers so you can round-trip files directly from the spreadsheet UI—Gridelle ingests the YAML, tracks the last loaded file, and can write a new commit when you have collaborator permissions.

## Automation helpers & docs
- `docs/generate-large-yaml.mjs`: CLI script for producing synthetic workbooks when profiling the UI or benchmarking workers.
- `docs/wasm-macro-abi.md`: ABI reference for building custom WebAssembly macros that Gridelle can load at runtime.
- `docs/bif-functions.md`: Reference for Gridelle’s built-in spreadsheet functions (`sum`, `multiply`).
- `docs/README.ja.md`: Japanese-language README retained for historical reasons.

## Project conventions
- Shared UI lives in `src/components/`, while page-specific logic sits under `src/pages/`.
- Authentication services, clipboard helpers, GitHub accessors, YAML workers, and macro loaders are consolidated in `src/services/`.
- Static assets and icons stay in `public/`, while automation scripts and design docs live in `docs/`.
- Source code is MIT licensed (see `LICENSE`). Hosting Gridelle as a commercial or large-scale internal service on the provided servers requires a separate agreement.

When opening issues or PRs, include a concise problem statement, user impact, and the tests you ran so reviewers can respond quickly.
