export const semanticColors = {
  surface: {
    base: "0 0% 100%",
    muted: "210 16% 96%",
    subtle: "214 14% 92%",
    elevated: "210 18% 98%",
    inverted: "222 47% 11%",
  },
  text: {
    primary: "222 47% 11%",
    soft: "218 15% 38%",
    muted: "218 12% 47%",
    subtle: "216 12% 61%",
    inverted: "210 20% 96%",
  },
  border: {
    subtle: "216 15% 88%",
    strong: "218 13% 72%",
  },
  brand: {
    primary: "204 88% 53%",
    primaryStrong: "204 88% 45%",
    primaryMuted: "204 88% 92%",
    accent: "283 75% 57%",
    accentMuted: "283 75% 92%",
    secondary: "221 83% 53%",
    secondaryMuted: "221 83% 92%",
  },
  support: {
    success: "152 63% 45%",
    successMuted: "152 63% 92%",
    warning: "38 92% 58%",
    warningMuted: "38 92% 92%",
    danger: "0 84% 60%",
    dangerMuted: "0 84% 94%",
    info: "207 82% 55%",
    infoMuted: "207 82% 92%",
  },
  state: {
    focus: "204 88% 53%",
    ring: "204 88% 53%",
  },
};

export const typography = {
  fontFamily: {
    sans: [
      "var(--font-sans)",
      "Inter",
      "Inter var",
      "system-ui",
      "-apple-system",
      "BlinkMacSystemFont",
      "\"Segoe UI\"",
      "sans-serif",
    ],
    display: [
      "var(--font-display)",
      "\"Cal Sans\"",
      "Inter",
      "system-ui",
      "-apple-system",
      "sans-serif",
    ],
    mono: [
      "var(--font-mono)",
      "\"JetBrains Mono\"",
      "\"Fira Code\"",
      "ui-monospace",
      "SFMono-Regular",
      "Menlo",
      "monospace",
    ],
  },
  fontSize: {
    xs: "0.75rem",
    sm: "0.875rem",
    md: "1rem",
    lg: "1.125rem",
    xl: "1.25rem",
    "2xl": "1.5rem",
    "3xl": "1.875rem",
    "4xl": "2.25rem",
  },
  lineHeight: {
    tighter: "1.1",
    tight: "1.25",
    snug: "1.35",
    normal: "1.5",
    relaxed: "1.7",
  },
};

export const radii = {
  xs: "0.25rem",
  sm: "0.5rem",
  md: "0.75rem",
  lg: "1rem",
  xl: "1.25rem",
  "2xl": "1.75rem",
  full: "9999px",
};

export const spacing = {
  xs: "0.25rem",
  sm: "0.5rem",
  md: "0.75rem",
  lg: "1rem",
  xl: "1.5rem",
  "2xl": "2rem",
  "3xl": "3rem",
};

export const shadows = {
  xs: "0 1px 1px rgba(15, 23, 42, 0.05)",
  sm: "0 1px 2px rgba(15, 23, 42, 0.07)",
  md: "0 6px 16px rgba(15, 23, 42, 0.08)",
  lg: "0 12px 32px rgba(15, 23, 42, 0.12)",
  xl: "0 24px 48px rgba(15, 23, 42, 0.18)",
};

export const designTokens = {
  colors: semanticColors,
  typography,
  radii,
  spacing,
  shadows,
};

export type DesignTokens = typeof designTokens;
