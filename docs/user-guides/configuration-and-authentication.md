# Configuration and Authentication

Gridelle uses Vite environment variables for build-time configuration and supports multiple login variants.

## Environment Variables

Create a `.env.local` file or export the variables in your shell.

| Key | Required | Purpose |
| --- | --- | --- |
| `VITE_FIREBASE_API_KEY` | Yes for Firebase login | Firebase Web API key used by the default auth client. |
| `VITE_FIREBASE_AUTH_DOMAIN` | Yes for Firebase login | Firebase auth domain. |
| `VITE_APP_VERSION` | Optional | Overrides the version string rendered in the in-app Help section. Defaults to `package.json` version. |
| `VITE_LOGIN_APP` | Optional | Selects the login variant. The default is `firebase`; `offline` is also provided. |

Example `.env.local`:

```ini
VITE_FIREBASE_API_KEY=xxxx
VITE_FIREBASE_AUTH_DOMAIN=your-app.firebaseapp.com
VITE_APP_VERSION=0.10.0+local
VITE_LOGIN_APP=offline
```

The variables are typed in `src/env.d.ts`, so missing or misspelled keys can be surfaced during type checking.

## Login Variants

Login bundles follow the file naming convention `src/pages/login/App.<variant>.tsx`. `VITE_LOGIN_APP` selects the variant during the Vite build.

Use the default Firebase login:

```bash
vorbere run build
```

Build with the offline login variant:

```bash
VITE_LOGIN_APP=offline vorbere run build
```

Offline mode exposes a guest session flow and a GitHub personal access token input. This lets repository features use the Octokit client without contacting an external identity provider.

## Token Lifetime

GitHub OAuth and personal access tokens are stored in `sessionStorage`, so they remain available while navigating between Gridelle pages in the same browser tab. Closing the tab ends that token session and requires GitHub authentication again. Tokens are not persisted in `localStorage`.

When Gridelle encounters a token saved by an older release in `localStorage`, it migrates the token to `sessionStorage` for the current tab and removes the old persistent copy. Logging out or clearing the session cache removes the session token immediately.

## Custom Authentication

To add a custom login variant, create `src/pages/login/App.<variant>.tsx`, configure an auth client with `configureAuthClient()`, and set `VITE_LOGIN_APP=<variant>` for the build that should use it.
