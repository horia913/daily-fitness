/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: '#2E7BFF',
        secondary: '#1B1E24',
        accent: '#2E7BFF',
        destructive: '#FF5A4D',
      },
    },
  },
  plugins: [],
}