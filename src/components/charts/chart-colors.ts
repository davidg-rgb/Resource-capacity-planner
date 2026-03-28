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

  // Ordered palette for multi-series charts
  palette: ['#496173', '#586065', '#5b6063', '#3d5567', '#727d80', '#a9b4b7', '#465e70', '#4c5459'],
} as const;

export const CHART_FONT = {
  family: 'Inter, sans-serif',
  headlineFamily: 'Manrope, sans-serif',
  size: 12,
  smallSize: 10,
} as const;
