# Gridelle

<p align="center">
	<img src="public/images/icon-512x512.png" alt="Gridelle logo" width="320">
</p>

Gridelle is a web application that makes YAML files editable like spreadsheets. It targets the common pain points developers face when reviewing infrastructure repositories: poor readability, limited overview, and fragile copy/paste workflows. Gridelle lets you round-trip between a worksheet-like UI and the original YAML documents.

- [http://gridelle.piradn.com/](http://gridelle.piradn.com/)

## Key Capabilities

### Spreadsheet-style editing
- Rectangular selection (click + Shift), fill handle, drag-copy, and fast range input.
- Enter opens the editor, Shift+Enter inserts a newline, Esc cancels changes.
- Add/remove rows and columns, sort, and bulk-edit selections.
- Preserve cell styles (text/background colors) and carry them through YAML serialization.
- Manage multiple sheets via tabs with rename/add/remove actions.

### YAML import/export
- Edit YAML directly in the “YAML Input / Preview” modal.
- Import `.yml`, `.yaml`, `.json`, and other compatible formats, then expand them into tables.
- Download or copy the current workbook as YAML at any time.
- Notify users about parse errors or apply results through the shared status area.

### GitHub integration preview
- Load a single file immediately by specifying a blob URL.
- (WIP) Pull Request mode acts as a placeholder for future diff review features.

## Setup

### Requirements
- Node.js 18+
- npm

### Initial install
```bash
npm install
```

## Available npm scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the Vite development server. |
| `npm run build` | Produce a production build. |
| `npm run type-check` | Run TypeScript in `--noEmit` mode. |
| `npm run lint` | Execute ESLint with zero-warning tolerance. |
| `npm run test` | Run the Vitest unit test suite. |

## Authentication variants

Login bundles follow the naming convention `src/pages/login/App.<variant>.tsx`. The build selects a variant via the `VITE_LOGIN_APP` environment variable (default: `firebase`). Examples:

```bash
# Default Firebase login
npm run build

# Offline mode with GitHub personal access tokens
VITE_LOGIN_APP=offline npm run build
```

Offline mode provides both a guest button and a GitHub PAT input. Entering a token switches the session to `loginMode='github'`, enabling repository features without contacting external identity providers.

When adding a new variant, create `App.<variant>.tsx` and configure authentication by calling `configureAuthClient()` with your custom implementation (Firebase, Cognito, corporate SSO, mock adapters, etc.). You can reuse the Firebase UI and only swap out the auth layer if desired.

## Development guidelines

1. Branch from `main` and follow GitHub Flow.  
2. Before opening a PR, run `npm run type-check && npm run lint && npm run test && npm run build`.  
3. Add unit tests for new behavior and guard against regressions.  
4. Update README or `docs/` when the UX, API, or configuration changes.  
5. PR descriptions should include Motivation / Design / Tests / Risks, with supplemental docs stored under `docs/` as needed.

## Documentation layout

- `README.md`: English developer guide (this file).
- `docs/README.ja.md`: Legacy Japanese README retained for reference.
- `docs/`: Additional design notes, large-YAML scripts, WASM macro specs, etc.
- `AGENTS.md`: AI development rules—commit policy, lint expectations, and coding conventions.

## Additional notes

- Shared UI components live in `src/components/`, while page-specific logic belongs to `src/pages/`.
- GitHub repository access helpers and Octokit wrappers reside in `src/services/githubRepositoryAccessService.ts`.
- YAML parsing, application, and worker plumbing lives under `src/pages/top/useSpreadsheetDataController.ts` and `src/services/yaml*`.
- The function macro feature is experimental; expect breaking changes.
- Source code is MIT licensed (see `LICENSE`). Hosting Gridelle as a commercial or large-scale internal service on the provided servers requires a separate agreement.

When opening issues or PRs, describe the background, user impact, and test results succinctly so collaborators can review efficiently.
