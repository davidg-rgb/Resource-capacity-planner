/**
 * Multi-widget PDF Document template.
 *
 * Accepts a list of widget snapshots (PNG data URIs for chart widgets)
 * and renders them into a paginated PDF with headers/footers.
 *
 * Layout rules (from spec F6):
 * - Large widgets (colSpan 12): full page
 * - Medium widgets (colSpan 6): 2 per page
 * - Small widgets (colSpan 4): 3 per page (2 col layout)
 *
 * Table-based widgets without snapshots get a placeholder section.
 */

import { Document, Image, Page, StyleSheet, Text, View } from '@react-pdf/renderer';
import { formatMonthHeader } from '@/lib/date-utils';

import { PdfCoverPage } from './pdf-cover-page';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PdfWidgetEntry {
  widgetId: string;
  name: string;
  colSpan: 4 | 6 | 12;
  /** PNG data URI from SVG snapshot, or null for table-only widgets */
  snapshotUri: string | null;
}

export interface DashboardPdfProps {
  orgName: string;
  dashboardTitle: string;
  dateRange: { from: string; to: string };
  orientation: 'landscape' | 'portrait';
  includeCoverPage: boolean;
  widgets: PdfWidgetEntry[];
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const s = StyleSheet.create({
  page: {
    padding: 30,
    paddingTop: 50,
    paddingBottom: 50,
    fontSize: 8,
    fontFamily: 'Helvetica',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    position: 'absolute',
    top: 15,
    left: 30,
    right: 30,
    paddingBottom: 5,
    borderBottomWidth: 1,
    borderBottomColor: '#d1d5db',
    fontSize: 8,
    color: '#6b7280',
  },
  footer: {
    position: 'absolute',
    bottom: 15,
    left: 30,
    right: 30,
    flexDirection: 'row',
    justifyContent: 'space-between',
    fontSize: 7,
    color: '#9ca3af',
    borderTopWidth: 0.5,
    borderTopColor: '#d1d5db',
    paddingTop: 4,
  },
  widgetSection: {
    marginBottom: 20,
  },
  widgetTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 8,
    paddingBottom: 4,
    borderBottomWidth: 0.5,
    borderBottomColor: '#e5e7eb',
  },
  chartImage: {
    objectFit: 'contain',
    maxHeight: 350,
  },
  placeholderBox: {
    height: 200,
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: 10,
    color: '#9ca3af',
  },
  // Two-column layout for small widgets
  row: {
    flexDirection: 'row',
    gap: 16,
  },
  halfCol: {
    flex: 1,
  },
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function PageHeader({
  orgName,
  dateRange,
}: {
  orgName: string;
  dateRange: { from: string; to: string };
}) {
  return (
    <View fixed style={s.header}>
      <Text>{orgName}</Text>
      <Text>
        {formatMonthHeader(dateRange.from)} — {formatMonthHeader(dateRange.to)}
      </Text>
    </View>
  );
}

function PageFooter() {
  const now = new Date().toLocaleString('sv-SE', {
    dateStyle: 'short',
    timeStyle: 'short',
  });
  return (
    <View fixed style={s.footer}>
      <Text>Genererad: {now}</Text>
      <Text render={({ pageNumber, totalPages }) => `Sida ${pageNumber} / ${totalPages}`} />
    </View>
  );
}

function WidgetSection({ widget }: { widget: PdfWidgetEntry }) {
  return (
    <View style={s.widgetSection} wrap={false}>
      <Text style={s.widgetTitle}>{widget.name}</Text>
      {widget.snapshotUri ? (
        /* eslint-disable-next-line jsx-a11y/alt-text -- @react-pdf/renderer Image does not support alt */
        <Image src={widget.snapshotUri} style={s.chartImage} />
      ) : (
        <View style={s.placeholderBox}>
          <Text style={s.placeholderText}>{widget.name} — tabelldata, se interaktiv dashboard</Text>
        </View>
      )}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Layout engine — group widgets into pages
// ---------------------------------------------------------------------------

interface PageGroup {
  widgets: PdfWidgetEntry[];
  layout: 'full' | 'half';
}

function groupWidgetsIntoPages(widgets: PdfWidgetEntry[]): PageGroup[] {
  const pages: PageGroup[] = [];
  const smallQueue: PdfWidgetEntry[] = [];

  for (const w of widgets) {
    if (w.colSpan === 12) {
      // Flush any pending small widgets first
      flushSmallQueue(smallQueue, pages);
      pages.push({ widgets: [w], layout: 'full' });
    } else {
      smallQueue.push(w);
      // When we have 2 small widgets, flush them as a page
      if (smallQueue.length === 2) {
        flushSmallQueue(smallQueue, pages);
      }
    }
  }

  // Flush remaining
  flushSmallQueue(smallQueue, pages);

  return pages;
}

function flushSmallQueue(queue: PdfWidgetEntry[], pages: PageGroup[]): void {
  while (queue.length > 0) {
    const batch = queue.splice(0, 2);
    pages.push({ widgets: batch, layout: batch.length === 2 ? 'half' : 'full' });
  }
}

// ---------------------------------------------------------------------------
// Document
// ---------------------------------------------------------------------------

export function DashboardPdfDocument({
  orgName,
  dashboardTitle,
  dateRange,
  orientation,
  includeCoverPage,
  widgets,
}: DashboardPdfProps) {
  const pageGroups = groupWidgetsIntoPages(widgets);

  return (
    <Document>
      {includeCoverPage && (
        <PdfCoverPage
          orgName={orgName}
          dashboardTitle={dashboardTitle}
          dateRange={dateRange}
          widgetCount={widgets.length}
          orientation={orientation}
        />
      )}

      {pageGroups.map((group, pageIdx) => (
        <Page key={pageIdx} size="A4" orientation={orientation} style={s.page}>
          <PageHeader orgName={orgName} dateRange={dateRange} />
          <PageFooter />

          {group.layout === 'half' && group.widgets.length === 2 ? (
            <View style={s.row}>
              <View style={s.halfCol}>
                <WidgetSection widget={group.widgets[0]} />
              </View>
              <View style={s.halfCol}>
                <WidgetSection widget={group.widgets[1]} />
              </View>
            </View>
          ) : (
            group.widgets.map((w) => <WidgetSection key={w.widgetId} widget={w} />)
          )}
        </Page>
      ))}
    </Document>
  );
}
