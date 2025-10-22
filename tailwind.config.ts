import type { Config } from "tailwindcss";
import { generateColorPalette } from "./color_palette_generator";
import { RecursiveKeyValuePair } from "tailwindcss/types/config";

export default {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))'
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))'
        },
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))'
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))'
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))'
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))'
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))'
        },
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        chart: {
          '1': 'hsl(var(--chart-1))',
          '2': 'hsl(var(--chart-2))',
          '3': 'hsl(var(--chart-3))',
          '4': 'hsl(var(--chart-4))',
          '5': 'hsl(var(--chart-5))'
        },
        'success': generateColorPalette('#22c55e'), // Veya 'green-500' gibi Tailwind rengi
        'danger': generateColorPalette('#ef4444'),  // Veya 'red-500'
        'warning': generateColorPalette('#f59e0b'), // Veya 'amber-500'
        sidebar: {
          DEFAULT: 'hsl(var(--sidebar-background))',
          foreground: 'hsl(var(--sidebar-foreground))',
          primary: 'hsl(var(--sidebar-primary))',
          'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
          accent: 'hsl(var(--sidebar-accent))',
          'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
          border: 'hsl(var(--sidebar-border))',
          ring: 'hsl(var(--sidebar-ring))'
        }
      },
      fontFamily: {
        sans: ['var(--font-sans)'],
        mono: ['var(--font-mono)'],
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)'
      },
      typography: {
        DEFAULT: {
          css: {
            maxWidth: 'none',
            color: 'var(--foreground)',
            'h1, h2, h3, h4, h5, h6': {
              color: 'var(--foreground) !important',
              fontWeight: '900 !important',
              fontFamily: 'var(--font-sans) !important'
            },
            '.prose h1, .prose h2, .prose h3, .prose h4, .prose h5, .prose h6': {
              color: 'var(--foreground) !important',
              fontWeight: '900 !important',
              fontFamily: 'var(--font-sans) !important'
            },
            h1: {
              fontSize: '2.5rem !important',
              lineHeight: '2.75rem !important',
              marginTop: '2.5rem !important',
              marginBottom: '1.5rem !important',
              letterSpacing: '-0.025em !important',
              fontWeight: '900 !important'
            },
            '.prose h1': {
              fontSize: '2.5rem !important',
              lineHeight: '2.75rem !important',
              marginTop: '2.5rem !important',
              marginBottom: '1.5rem !important',
              letterSpacing: '-0.025em !important',
              fontWeight: '900 !important',
              color: 'var(--foreground) !important'
            },
            h2: {
              fontSize: '2rem !important',
              lineHeight: '2.5rem !important',
              marginTop: '2.5rem !important',
              marginBottom: '1.25rem !important',
              letterSpacing: '-0.025em !important',
              fontWeight: '900 !important'
            },
            '.prose h2': {
              fontSize: '2rem !important',
              lineHeight: '2.5rem !important',
              marginTop: '2.5rem !important',
              marginBottom: '1.25rem !important',
              letterSpacing: '-0.025em !important',
              fontWeight: '900 !important',
              color: 'var(--foreground) !important'
            },
            h3: {
              fontSize: '1.75rem !important',
              lineHeight: '2.25rem !important',
              marginTop: '2rem !important',
              marginBottom: '1rem !important',
              letterSpacing: '-0.025em !important',
              fontWeight: '900 !important'
            },
            '.prose h3': {
              fontSize: '1.75rem !important',
              lineHeight: '2.25rem !important',
              marginTop: '2rem !important',
              marginBottom: '1rem !important',
              letterSpacing: '-0.025em !important',
              fontWeight: '900 !important',
              color: 'var(--foreground) !important'
            },
            h4: {
              fontSize: '1.5rem !important',
              lineHeight: '2rem !important',
              marginTop: '1.75rem !important',
              marginBottom: '0.75rem !important',
              letterSpacing: '-0.025em !important'
            },
            h5: {
              fontSize: '1.25rem !important',
              lineHeight: '1.75rem !important',
              marginTop: '1.5rem !important',
              marginBottom: '0.5rem !important',
              letterSpacing: '-0.025em !important'
            },
            h6: {
              fontSize: '1.125rem !important',
              lineHeight: '1.5rem !important',
              marginTop: '1.25rem !important',
              marginBottom: '0.5rem !important',
              letterSpacing: '-0.025em !important'
            },
            p: {
              color: 'var(--muted-foreground)',
              lineHeight: '1.75',
              marginTop: '1.25rem',
              marginBottom: '1.25rem'
            },
            a: {
              color: 'var(--primary)',
              textDecoration: 'none',
              '&:hover': {
                textDecoration: 'underline'
              }
            },
            strong: {
              color: 'var(--foreground) !important',
              fontWeight: '900 !important'
            },
            '.prose strong': {
              color: 'var(--foreground) !important',
              fontWeight: '900 !important'
            },
            em: {
              color: 'var(--foreground)',
              fontStyle: 'italic'
            },
            code: {
              color: 'var(--foreground)',
              backgroundColor: 'var(--muted)',
              padding: '0.25rem 0.375rem',
              borderRadius: '0.25rem',
              fontSize: '0.875rem',
              fontWeight: '500'
            },
            'code::before': {
              content: ''
            },
            'code::after': {
              content: ''
            },
            pre: {
              backgroundColor: 'var(--muted)',
              color: 'var(--foreground)',
              padding: '1rem',
              borderRadius: '0.5rem',
              overflow: 'auto',
              fontSize: '0.875rem',
              lineHeight: '1.5'
            },
            'pre code': {
              backgroundColor: 'transparent',
              padding: '0',
              borderRadius: '0',
              fontSize: 'inherit'
            },
            ul: {
              color: 'var(--muted-foreground)',
              listStyleType: 'disc',
              paddingLeft: '1.5rem'
            },
            ol: {
              color: 'var(--muted-foreground)',
              listStyleType: 'decimal',
              paddingLeft: '1.5rem'
            },
            li: {
              color: 'var(--muted-foreground)',
              marginTop: '0.5rem',
              marginBottom: '0.5rem'
            },
            blockquote: {
              color: 'var(--muted-foreground)',
              borderLeftColor: 'var(--border)',
              borderLeftWidth: '4px',
              paddingLeft: '1rem',
              fontStyle: 'italic'
            },
            img: {
              borderRadius: '0.5rem !important',
              marginTop: '1.5rem !important',
              marginBottom: '0.5rem !important'
            },
            'img + em': {
              display: 'block !important',
              textAlign: 'center !important',
              fontSize: '0.875rem !important',
              color: 'var(--muted-foreground) !important',
              fontStyle: 'italic !important',
              marginTop: '0.5rem !important',
              marginBottom: '1.5rem !important'
            },
            table: {
              width: '100%',
              borderCollapse: 'collapse',
              marginTop: '1.5rem',
              marginBottom: '1.5rem'
            },
            th: {
              color: 'var(--foreground)',
              fontWeight: '600',
              textAlign: 'left',
              padding: '0.75rem',
              borderBottom: '1px solid var(--border)'
            },
            td: {
              color: 'var(--muted-foreground)',
              padding: '0.75rem',
              borderBottom: '1px solid var(--border)'
            }
          }
        }
      }
    }
  },
  plugins: [
    require("tailwindcss-animate"),
    require('@tailwindcss/typography'),
  ],
} satisfies Config;
