// VitePWA plugin configuration centralizing the manifest and workbox behavior.
import type { VitePWAOptions } from 'vite-plugin-pwa'

const vitePwaConfig: Partial<VitePWAOptions> = {
  registerType: 'autoUpdate',
  includeAssets: [
    '/images/favicon.png',
    '/images/apple-touch-icon.png',
    '/assets/logo-*.jpeg'
  ],
  manifest: {
    name: 'Gridelle',
    short_name: 'Gridelle',
    description: "Gridelle's sandbox application.",
    start_url: '/',
    scope: '/',
    display: 'standalone',
    lang: 'ja',
    background_color: '#fafbf5',
    icons: [
      {
        src: '/images/icon-192x192.png',
        sizes: '192x192',
        type: 'image/png'
      },
      {
        src: '/images/icon-512x512.png',
        sizes: '512x512',
        type: 'image/png'
      }
    ]
  },
  devOptions: {
    enabled: false,
  },
  workbox: {
    // ignoreURLParametersMatching: [/.*/],
    navigateFallbackDenylist: [/\/login\.html/],
  }
}

export default vitePwaConfig
