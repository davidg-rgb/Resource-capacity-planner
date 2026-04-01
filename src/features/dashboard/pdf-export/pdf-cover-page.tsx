/**
 * Cover page template for multi-widget PDF export.
 * Shows org name, dashboard title, date range, generation timestamp.
 */

import { Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import { formatMonthHeader } from '@/lib/date-utils';

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const coverStyles = StyleSheet.create({
  page: {
    padding: 60,
    fontFamily: 'Helvetica',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 6,
    backgroundColor: '#1d4ed8',
  },
  orgName: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 16,
    textAlign: 'center',
  },
  dashboardTitle: {
    fontSize: 18,
    color: '#4b5563',
    marginBottom: 40,
    textAlign: 'center',
  },
  divider: {
    width: 120,
    height: 2,
    backgroundColor: '#d1d5db',
    marginBottom: 40,
  },
  dateRange: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 8,
    textAlign: 'center',
  },
  widgetCount: {
    fontSize: 11,
    color: '#9ca3af',
    marginBottom: 40,
    textAlign: 'center',
  },
  timestamp: {
    fontSize: 9,
    color: '#9ca3af',
    position: 'absolute',
    bottom: 40,
    textAlign: 'center',
  },
});

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface PdfCoverPageProps {
  orgName: string;
  dashboardTitle: string;
  dateRange: { from: string; to: string };
  widgetCount: number;
  orientation: 'landscape' | 'portrait';
}

export function PdfCoverPage({
  orgName,
  dashboardTitle,
  dateRange,
  widgetCount,
  orientation,
}: PdfCoverPageProps) {
  const now = new Date().toLocaleString('sv-SE', {
    dateStyle: 'long',
    timeStyle: 'short',
  });

  return (
    <Page size="A4" orientation={orientation} style={coverStyles.page}>
      <View style={coverStyles.topBar} />

      <Text style={coverStyles.orgName}>{orgName}</Text>
      <Text style={coverStyles.dashboardTitle}>{dashboardTitle}</Text>

      <View style={coverStyles.divider} />

      <Text style={coverStyles.dateRange}>
        {formatMonthHeader(dateRange.from)} — {formatMonthHeader(dateRange.to)}
      </Text>
      <Text style={coverStyles.widgetCount}>
        {widgetCount} {widgetCount === 1 ? 'widget' : 'widgets'}
      </Text>

      <Text style={coverStyles.timestamp}>Genererad: {now}</Text>
    </Page>
  );
}
