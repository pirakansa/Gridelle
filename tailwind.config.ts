// Tailwind CSS configuration describing scan targets for class usage.
import type { Config } from 'tailwindcss'

export default {
  darkMode: 'class',
  content: [
    './src/**/*.{ts,tsx,html,scss}',
  ],
} satisfies Config
