# Gridelle

<p align="center">
  <img src="public/images/icon-512x512.png" alt="Gridelle logo" width="320">
</p>

Gridelle is a Vite + React application for reviewing and editing YAML workbooks in a spreadsheet-like UI while keeping the source files round-trippable. It is designed for infrastructure repositories where large YAML manifests are hard to skim, diff, and edit safely.

## Live Sandbox

- [https://gridelle.piradn.com/](https://gridelle.piradn.com/)

## Highlights

- Spreadsheet-style YAML editing with selections, fill operations, row and column management, sheet tabs, and copy/paste-friendly workflows.
- YAML import, preview, edit, copy, and download flows for `.yml`, `.yaml`, `.json`, and compatible structured data.
- GitHub repository, blob URL, and pull request workflows for loading YAML files and writing commits when the user has access.
- Firebase and offline login variants, including local guest sessions and GitHub personal access token support in offline mode.
- Built-in spreadsheet functions and experimental WebAssembly macros for reusable cell calculations.
- Workerized YAML parsing and stringifying for large workbook handling.

## Quick Start

Requirements:

- Node.js 20.19+
- npm

Install dependencies and start the development server:

```bash
vorbere run setup
vorbere run dev
```

Run the same validation used by CI before opening a pull request:

```bash
vorbere run check
vorbere run test
vorbere run build
```

## Documentation

- [Documentation index](docs/README.md)
- [Getting started](docs/user-guides/getting-started.md)
- [Configuration and authentication](docs/user-guides/configuration-and-authentication.md)
- [GitHub integration](docs/user-guides/github-integration.md)
- [Large YAML samples](docs/user-guides/large-yaml-samples.md)
- [Built-in functions reference](docs/specifications/built-in-functions.md)
- [WebAssembly macro ABI reference](docs/specifications/wasm-macro-abi.md)

## Project Conventions

- Shared UI lives in `src/components/`, while page-specific logic sits under `src/pages/`.
- Services for authentication, GitHub access, file transfer, YAML workers, and macro loading live under `src/services/`.
- Static public assets live in `public/`.
- Detailed user guides, specification references, and examples live in `docs/`.

Source code is MIT licensed. Hosting Gridelle as a commercial or large-scale internal service on the provided servers requires a separate agreement.
