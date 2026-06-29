# GitHub Integration

Gridelle includes repository workflows for loading YAML files from GitHub and writing changes back when the user has permission.

## Supported Loading Flows

- Paste a GitHub blob URL to load a specific file.
- Browse repository branches and trees after repository access is verified.
- Inspect pull requests and copy or load YAML payloads from touched files.

The integration panel keeps the last loaded file metadata so the top page can reuse the repository, branch, path, and SHA when preparing a commit.

## Commit Flow

When the user has collaborator access and a file was loaded from GitHub, Gridelle can write the current YAML workbook back to the same repository path as a new commit.

The service layer for these operations lives under `src/services/githubRepositoryAccess/` and `src/services/githubRepositoryAccessService.ts`. Page components should call those services instead of directly handling Octokit request details.

## Authentication Notes

Firebase login is the default application login. Offline mode provides a guest session and GitHub personal access token input, which is useful for local experiments where an external identity provider should not be contacted.
