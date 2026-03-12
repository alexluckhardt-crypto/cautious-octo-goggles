import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['DM Sans', 'sans-serif'],
        display: ['Syne', 'sans-serif'],
      },
      colors: {
        bg: '#080b12',
        surface: '#0e1420',
        surface2: '#141c2e',
        surface3: '#1a2338',
        border: '#1e2d45',
        border2: '#243552',
        accent: '#5b8cff',
        'accent-dark': '#3d6bff',
        green: '#3dffa0',
        red: '#ff4d6a',
        yellow: '#ffd54d',
        purple: '#bf4dff',
      },
    },
  },
  plugins: [],
}

export default config
