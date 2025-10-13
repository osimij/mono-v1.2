import type { Config } from "tailwindcss";
import {
  typography,
  radii as radiiTokens,
  shadows as shadowTokens,
  spacing as spacingTokens,
} from "./client/src/design-system";

const config = {
  darkMode: ["class"],
  content: ["./client/index.html", "./client/src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    container: {
      center: true,
      padding: {
        DEFAULT: spacingTokens.lg,
        sm: spacingTokens.lg,
        lg: spacingTokens.xl,
        xl: spacingTokens.xl,
        "2xl": spacingTokens["2xl"],
      },
      screens: {
        "2xl": "1280px",
        "3xl": "1440px",
      },
    },
    extend: {
      fontFamily: {
        sans: typography.fontFamily.sans,
        display: typography.fontFamily.display,
        mono: typography.fontFamily.mono,
      },
      fontSize: {
        xs: [typography.fontSize.xs, { lineHeight: typography.lineHeight.normal }],
        sm: [typography.fontSize.sm, { lineHeight: typography.lineHeight.normal }],
        base: [typography.fontSize.md, { lineHeight: typography.lineHeight.normal }],
        lg: [typography.fontSize.lg, { lineHeight: typography.lineHeight.snug }],
        xl: [typography.fontSize.xl, { lineHeight: typography.lineHeight.snug }],
        "2xl": [typography.fontSize["2xl"], { lineHeight: typography.lineHeight.tight }],
        "3xl": [typography.fontSize["3xl"], { lineHeight: typography.lineHeight.tighter }],
        "4xl": [typography.fontSize["4xl"], { lineHeight: typography.lineHeight.tighter }],
      },
      borderWidth: {
        "3": "3px",
      },
      borderRadius: {
        xs: radiiTokens.xs,
        sm: radiiTokens.sm,
        md: radiiTokens.md,
        lg: radiiTokens.lg,
        xl: radiiTokens.xl,
        "2xl": radiiTokens["2xl"],
        full: radiiTokens.full,
      },
      boxShadow: {
        xs: shadowTokens.xs,
        sm: shadowTokens.sm,
        md: shadowTokens.md,
        lg: shadowTokens.lg,
        xl: shadowTokens.xl,
      },
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        surface: {
          DEFAULT: "var(--surface)",
          muted: "var(--surface-muted)",
          subtle: "var(--surface-subtle)",
          elevated: "var(--surface-elevated)",
          inverted: "var(--surface-inverted)",
        },
        text: {
          DEFAULT: "var(--text-primary)",
          soft: "var(--text-soft)",
          muted: "var(--text-muted)",
          subtle: "var(--text-subtle)",
          inverted: "var(--text-inverted)",
        },
        card: {
          DEFAULT: "var(--card)",
          foreground: "var(--card-foreground)",
        },
        popover: {
          DEFAULT: "var(--popover)",
          foreground: "var(--popover-foreground)",
        },
        primary: {
          DEFAULT: "var(--primary)",
          foreground: "var(--primary-foreground)",
          muted: "hsl(var(--ds-primary-muted))",
          strong: "hsl(var(--ds-primary-strong))",
        },
        secondary: {
          DEFAULT: "var(--secondary)",
          foreground: "var(--secondary-foreground)",
          muted: "hsl(var(--ds-secondary-muted))",
        },
        accent: {
          DEFAULT: "var(--accent)",
          foreground: "var(--accent-foreground)",
          muted: "hsl(var(--ds-accent-muted))",
        },
        success: {
          DEFAULT: "var(--success)",
          muted: "var(--success-muted)",
          foreground: "var(--success-foreground)",
        },
        warning: {
          DEFAULT: "var(--warning)",
          muted: "var(--warning-muted)",
          foreground: "var(--warning-foreground)",
        },
        danger: {
          DEFAULT: "var(--danger)",
          muted: "var(--danger-muted)",
          foreground: "var(--danger-foreground)",
        },
        info: {
          DEFAULT: "var(--info)",
          muted: "var(--info-muted)",
          foreground: "var(--info-foreground)",
        },
        muted: {
          DEFAULT: "var(--muted)",
          foreground: "var(--muted-foreground)",
        },
        outline: "hsl(var(--ds-focus))",
        destructive: {
          DEFAULT: "var(--destructive)",
          foreground: "var(--destructive-foreground)",
        },
        neutral: {
          50: "hsl(var(--ds-surface-muted))",
          100: "hsl(var(--ds-surface-subtle))",
          200: "hsl(var(--ds-border-subtle))",
          300: "hsl(var(--ds-border-strong))",
          800: "hsl(var(--ds-surface-inverted))",
        },
        border: {
          DEFAULT: "var(--border)",
          strong: "var(--border-strong)",
        },
        input: "var(--input)",
        ring: "var(--ring)",
        chart: {
          "1": "var(--chart-1)",
          "2": "var(--chart-2)",
          "3": "var(--chart-3)",
          "4": "var(--chart-4)",
          "5": "var(--chart-5)",
        },
        sidebar: {
          DEFAULT: "var(--sidebar-background)",
          foreground: "var(--sidebar-foreground)",
          primary: "var(--sidebar-primary)",
          "primary-foreground": "var(--sidebar-primary-foreground)",
          accent: "var(--sidebar-accent)",
          "accent-foreground": "var(--sidebar-accent-foreground)",
          border: "var(--sidebar-border)",
          ring: "var(--sidebar-ring)",
        },
      },
      keyframes: {
        "accordion-down": {
          from: {
            height: "0",
          },
          to: {
            height: "var(--radix-accordion-content-height)",
          },
        },
        "accordion-up": {
          from: {
            height: "var(--radix-accordion-content-height)",
          },
          to: {
            height: "0",
          },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate"), require("@tailwindcss/typography")],
} satisfies Config;

export default config;
