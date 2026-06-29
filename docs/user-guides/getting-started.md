# Getting Started

This guide covers local setup, development commands, and validation tasks for Gridelle.

## Requirements

- Node.js 20.19 or later
- npm

## Install Dependencies

```bash
vorbere run setup
```

The setup task runs `npm ci` and installs dependencies from the lockfile.

## Local Development

```bash
vorbere run dev
```

This starts the Vite development server on all interfaces so the app can be tested from other devices on the same network.

## Production Build and Preview

```bash
vorbere run build
vorbere run preview
```

For debug-friendly build output with source maps and no minification, run:

```bash
vorbere run build-dev
```

## Quality Gates

Run the same checks enforced in CI before opening a pull request:

```bash
vorbere run check
vorbere run test
vorbere run build
```

`vorbere run check` runs TypeScript with `--noEmit` and ESLint with zero-warning tolerance.

## Available Tasks

| Command | Description |
| --- | --- |
| `vorbere run setup` | Install dependencies using the lockfile. |
| `vorbere run dev` | Start the Vite development server. |
| `vorbere run build` | Produce an optimized production build. |
| `vorbere run build-dev` | Build without minification for easier debugging. |
| `vorbere run preview` | Serve the production build locally. |
| `vorbere run check` | Run static analysis with TypeScript and ESLint. |
| `vorbere run test` | Execute the Vitest unit suite. |
| `vorbere run clean` | Remove the `dist/` directory. |
| `vorbere run check-deps` | Detect unused dependencies via `depcheck`. |
| `vorbere run generate-large-sample` | Produce a large sample YAML file under `docs/examples/`. |

Commands are defined in `package.json` and routed through `vorbere.yaml`; no global npm packages are required beyond the `vorbere` task runner.
