/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/renderer/index.html",
    "./src/renderer/src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        claude: {
            bg: "#faf9f6",
            sidebar: "#f0efeb",
            accent: "#d97757",
            input: "#ffffff"
        }
      },
      typography: (theme) => ({
        claude: {
          css: {
            '--tw-prose-body': theme('colors.gray.800'),
            '--tw-prose-headings': theme('colors.gray.900'),
            '--tw-prose-links': theme('colors.claude.accent'),
            '--tw-prose-code': theme('colors.gray.900'),
            '--tw-prose-pre-bg': theme('colors.gray.900'),
            '--tw-prose-pre-code': theme('colors.gray.100'),
            maxWidth: 'none',
            code: {
              fontWeight: '500',
              '&::before': { content: '""' },
              '&::after': { content: '""' },
              backgroundColor: theme('colors.gray.100'),
              padding: '0.2rem 0.4rem',
              borderRadius: '0.25rem',
            },
            pre: {
              backgroundColor: 'transparent',
              padding: 0,
            }
          }
        }
      })
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
}
