# Gridelle Documentation

This directory holds detailed documentation for Gridelle. The top-level `README.md` is intentionally short and points here for workflow and reference material.

## User Guides

- [Getting started](user-guides/getting-started.md): setup, development, production build, and available `vorbere` tasks.
- [Configuration and authentication](user-guides/configuration-and-authentication.md): Vite environment variables and login variants.
- [GitHub integration](user-guides/github-integration.md): blob URL, repository tree, pull request, and commit workflows.
- [Large YAML samples](user-guides/large-yaml-samples.md): generating and using synthetic workbooks for profiling.

## Specification References

- [Built-in functions](specifications/built-in-functions.md): `func` schema and behavior for built-in spreadsheet functions.
- [WebAssembly macro ABI](specifications/wasm-macro-abi.md): exported memory, function signatures, style buffer layout, and host argument handling.

## Examples

- [Large sample generator](examples/generate-large-yaml.mjs): CLI utility used by `vorbere run generate-large-sample`.

The generated `docs/examples/sample-large.yaml` file is ignored by Git and can be recreated locally when needed.
