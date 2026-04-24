/**
 * Chart color constants derived from the Nordic Precision design system.
 * Matches globals.css design tokens for consistent visual identity.
 */

export const CHART_COLORS = {
  // Core palette (from CSS tokens)
  primary: '#496173',
  primaryDim: '#3d5567',
  secondary: '#586065',
  tertiary: '#5b6063',
  error: '#9f403d',
  surface: '#f8fafb',
  grid: '#a9b4b7',
  text: '#2a3437',
  textMuted: '#566164',

  // Semantic capacity colors
  over: '#EF4444',
  healthy: '#22C55E',
  under: '#FBBF24',
  idle: '#D1D5DB',

  // Ordered palette for multi-series charts (muted greyscale — retained for
  // single-series and greyscale-compatible consumers).
  palette: ['#496173', '#586065', '#5b6063', '#3d5567', '#727d80', '#a9b4b7', '#465e70', '#4c5459'],

  // Categorical palette for charts that need hue-distinct slices
  // (e.g. discipline donut). 8 colors, colorblind-safer variant of
  // Tol/muted. All ≥ 4.5:1 contrast against the light surface token.
  // UI-03: the old greyscale palette produced indistinguishable slices
  // on the discipline donut (ΔE ≈ 12–18 between adjacent colors).
  categoricalPalette: [
    '#4477AA', // blue
    '#EE6677', // red-pink
    '#228833', // green
    '#CCBB44', // yellow
    '#66CCEE', // cyan
    '#AA3377', // purple
    '#BBBBBB', // grey
    '#994F00', // brown
  ],
} as const;

export const CHART_FONT = {
  family: 'Inter, sans-serif',
  headlineFamily: 'Manrope, sans-serif',
  size: 12,
  smallSize: 10,
} as const;
