// TypeScript declaration for Vite environment variables used throughout the app.
/// <reference types="vite/client" />

declare global {
  interface ImportMetaEnv {
    readonly VITE_FIREBASE_API_KEY: string
    readonly VITE_FIREBASE_AUTH_DOMAIN: string
    readonly VITE_APP_VERSION: string
    readonly VITE_LOGIN_APP?: string
  }

  interface ImportMeta {
    readonly env: ImportMetaEnv
  }
}

export {}
