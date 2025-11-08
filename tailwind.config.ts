// Tailwind CSS configuration describing theme behavior and content scanning targets.
import type { Config } from 'tailwindcss'

const tailwindConfig: Config = {
  darkMode: 'class',
  content: [
  './top.html',
    './src/**/*.{ts,tsx,html,scss}',
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}

export default tailwindConfig
