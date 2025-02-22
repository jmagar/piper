/** @type {import('@tailwindcss/postcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  future: {
    // Enable modern features
    hoverOnlyWhenSupported: true,
    respectDefaultRingColorOpacity: true,
    disableColorOpacityUtilitiesByDefault: false,
    enableTransitionValue: true,
  },
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: {
        '2xl': '1400px',
      },
    },
    extend: {
      colors: {
        // Base colors
        background: {
          DEFAULT: "hsl(0 0% 100%)",
          dark: "hsl(240 10% 3.9%)"
        },
        foreground: {
          DEFAULT: "hsl(240 10% 3.9%)",
          dark: "hsl(0 0% 98%)"
        },
        
        // Component colors
        card: {
          DEFAULT: "hsl(0 0% 100%)",
          foreground: "hsl(240 10% 3.9%)",
          dark: "hsl(240 10% 3.9%)",
          "dark-foreground": "hsl(0 0% 98%)"
        },
        
        popover: {
          DEFAULT: "hsl(0 0% 100%)",
          foreground: "hsl(240 10% 3.9%)",
          dark: "hsl(240 10% 3.9%)",
          "dark-foreground": "hsl(0 0% 98%)"
        },
        
        primary: {
          DEFAULT: "hsl(240 5.9% 10%)",
          foreground: "hsl(0 0% 98%)",
          dark: "hsl(0 0% 98%)",
          "dark-foreground": "hsl(240 5.9% 10%)"
        },
        
        secondary: {
          DEFAULT: "hsl(240 4.8% 95.9%)",
          foreground: "hsl(240 5.9% 10%)",
          dark: "hsl(240 3.7% 15.9%)",
          "dark-foreground": "hsl(0 0% 98%)"
        },
        
        muted: {
          DEFAULT: "hsl(240 4.8% 95.9%)",
          foreground: "hsl(240 3.8% 46.1%)",
          dark: "hsl(240 3.7% 15.9%)",
          "dark-foreground": "hsl(240 5% 64.9%)"
        },
        
        accent: {
          DEFAULT: "hsl(240 4.8% 95.9%)",
          foreground: "hsl(240 5.9% 10%)",
          dark: "hsl(240 3.7% 15.9%)",
          "dark-foreground": "hsl(0 0% 98%)"
        },
        
        destructive: {
          DEFAULT: "hsl(0 84.2% 60.2%)",
          foreground: "hsl(0 0% 98%)",
          dark: "hsl(0 62.8% 30.6%)",
          "dark-foreground": "hsl(0 0% 98%)"
        },
        
        sidebar: {
          DEFAULT: "hsl(0 0% 98%)",
          foreground: "hsl(240 5.3% 26.1%)",
          primary: "hsl(240 5.9% 10%)",
          "primary-foreground": "hsl(0 0% 98%)",
          accent: "hsl(240 4.8% 95.9%)",
          "accent-foreground": "hsl(240 5.9% 10%)",
          border: "hsl(220 13% 91%)",
          ring: "hsl(217.2 91.2% 59.8%)",
          dark: "hsl(240 5.9% 10%)",
          "dark-foreground": "hsl(240 4.8% 95.9%)",
          "dark-primary": "hsl(224.3 76.3% 48%)",
          "dark-primary-foreground": "hsl(0 0% 100%)",
          "dark-accent": "hsl(240 3.7% 15.9%)",
          "dark-accent-foreground": "hsl(240 4.8% 95.9%)",
          "dark-border": "hsl(240 3.7% 15.9%)",
          "dark-ring": "hsl(217.2 91.2% 59.8%)"
        },

        // Brand colors
        success: {
          DEFAULT: "hsl(142 72% 29%)",
          soft: "hsl(142 72% 35%)",
          emphasis: "hsl(142 72% 42%)",
          muted: "hsl(142 72% 85%)",
          subtle: "hsl(142 72% 95%)",
          inverted: "hsl(142 72% 98%)"
        },
        warning: {
          DEFAULT: "hsl(37 92% 50%)",
          soft: "hsl(37 92% 55%)",
          emphasis: "hsl(37 92% 60%)",
          muted: "hsl(37 92% 85%)",
          subtle: "hsl(37 92% 95%)",
          inverted: "hsl(37 92% 98%)"
        },
        error: {
          DEFAULT: "hsl(0 84.2% 60.2%)",
          soft: "hsl(0 84.2% 65.2%)",
          emphasis: "hsl(0 84.2% 70.2%)",
          muted: "hsl(0 84.2% 85.2%)",
          subtle: "hsl(0 84.2% 95.2%)",
          inverted: "hsl(0 84.2% 98.2%)"
        },
        surface: {
          DEFAULT: "hsl(0 0% 100%)",
          raised: "hsl(0 0% 98%)",
          overlay: "hsl(0 0% 100% / 0.9)",
          sunken: "hsl(0 0% 96%)"
        }
      },
      borderRadius: {
        none: '0',
        sm: '0.2rem',
        DEFAULT: '0.6rem',
        md: '0.4rem',
        lg: '0.6rem',
        xl: '1.2rem',
        full: '9999px',
      },
      // Typography system
      fontFamily: {
        sans: ['system-ui', 'sans-serif'],
        mono: ['monospace'],
      },
      fontSize: {
        '2xs': ['0.625rem', { lineHeight: '1rem' }],
        xs: ['0.75rem', { lineHeight: '1rem' }],
        sm: ['0.875rem', { lineHeight: '1.25rem' }],
        base: ['1rem', { lineHeight: '1.5rem' }],
        lg: ['1.125rem', { lineHeight: '1.75rem' }],
        xl: ['1.25rem', { lineHeight: '1.75rem' }],
        '2xl': ['1.5rem', { lineHeight: '2rem' }],
        '3xl': ['1.875rem', { lineHeight: '2.25rem' }],
        '4xl': ['2.25rem', { lineHeight: '2.5rem' }],
        '5xl': ['3rem', { lineHeight: '3rem' }],
      },
      // Spacing system
      spacing: {
        '4xs': '0.125rem',
        '3xs': '0.25rem',
        '2xs': '0.375rem',
        xs: '0.5rem',
        sm: '0.75rem',
        md: '1rem',
        lg: '1.25rem',
        xl: '1.5rem',
        '2xl': '2rem',
        '3xl': '2.5rem',
        '4xl': '3rem',
      },
      // Shadows
      boxShadow: {
        sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
        DEFAULT: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
        md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
        lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
        xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
      },
      // Animations
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
        "fade-in": {
          from: { opacity: 0 },
          to: { opacity: 1 },
        },
        "fade-out": {
          from: { opacity: 1 },
          to: { opacity: 0 },
        },
        "slide-in": {
          from: { transform: "translateY(100%)" },
          to: { transform: "translateY(0)" },
        },
        "spin-reverse": {
          to: { transform: "rotate(-360deg)" },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        "fade-in": "fade-in 0.2s ease-out",
        "fade-out": "fade-out 0.2s ease-out",
        "slide-in": "slide-in 0.2s ease-out",
        "spin-reverse": "spin-reverse 1s linear infinite",
      },
      // Transitions
      transitionProperty: {
        'height': 'height',
        'spacing': 'margin, padding',
        'width': 'width',
        'position': 'top, right, bottom, left',
      },
      transitionTimingFunction: {
        "ease-spring": "cubic-bezier(0.25, 0.1, 0.25, 1.5)",
        "ease-out-back": "cubic-bezier(0.34, 1.56, 0.64, 1)",
        "ease-in-back": "cubic-bezier(0.36, 0, 0.66, -0.56)",
      },
      transitionDuration: {
        '250': '250ms',
        '350': '350ms',
        '400': '400ms',
      },
    },
  },
  plugins: [
    require('@tailwindcss/container-queries'),
    require('@tailwindcss/forms'),
    require('@tailwindcss/typography'),
    require('tailwindcss-animate'),
  ],
}; 