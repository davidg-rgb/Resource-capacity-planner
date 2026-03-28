/**
 * react-pdf StyleSheet definitions for PDF export.
 * Provides layout styles for heat map PDF and color mapping for cell statuses.
 */

import { StyleSheet } from '@react-pdf/renderer';
import type { HeatMapStatus } from '@/lib/capacity';

export const styles = StyleSheet.create({
  page: {
    padding: 30,
    fontSize: 7,
    fontFamily: 'Helvetica',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
    paddingBottom: 5,
    borderBottomWidth: 1,
    borderBottomColor: '#d1d5db',
    fontSize: 9,
    position: 'absolute',
    top: 15,
    left: 30,
    right: 30,
  },
  footer: {
    position: 'absolute',
    bottom: 15,
    left: 30,
    right: 30,
    flexDirection: 'row',
    justifyContent: 'space-between',
    fontSize: 7,
    color: '#6b7280',
    borderTopWidth: 0.5,
    borderTopColor: '#d1d5db',
    paddingTop: 4,
  },
  deptHeader: {
    flexDirection: 'row',
    backgroundColor: '#f3f4f6',
    fontWeight: 'bold',
    fontSize: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#9ca3af',
  },
  row: {
    flexDirection: 'row',
    borderBottomWidth: 0.5,
    borderBottomColor: '#e5e7eb',
    minHeight: 13,
  },
  nameCell: {
    width: 120,
    padding: 3,
    borderRightWidth: 0.5,
    borderRightColor: '#e5e7eb',
    fontSize: 7,
  },
  dataCell: {
    width: 36,
    padding: 2,
    textAlign: 'center',
    borderRightWidth: 0.5,
    borderRightColor: '#e5e7eb',
    fontSize: 7,
  },
  cellOver: {
    backgroundColor: '#fca5a5',
  },
  cellHealthy: {
    backgroundColor: '#86efac',
  },
  cellUnder: {
    backgroundColor: '#fde68a',
  },
  cellIdle: {
    backgroundColor: '#e5e7eb',
  },
  legend: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
    fontSize: 7,
    color: '#6b7280',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  legendSwatch: {
    width: 10,
    height: 10,
    borderRadius: 2,
  },
});

/** Hex color map for heat map cell backgrounds in PDF (Tailwind classes don't work in react-pdf). */
export const PDF_CELL_COLORS: Record<HeatMapStatus, string> = {
  over: '#fca5a5',
  healthy: '#86efac',
  under: '#fde68a',
  idle: '#e5e7eb',
};
