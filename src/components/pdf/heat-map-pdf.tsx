/**
 * Full PDF Document template for the Team Overview heat map export.
 * Landscape A4 with department-grouped rows, color-coded cells, and legend (PDF-01, PDF-02).
 */

import { Document, Page, Text, View } from '@react-pdf/renderer';
import type { HeatMapResponse } from '@/features/analytics/analytics.types';
import { calculateHeatMapStatus } from '@/lib/capacity';
import { formatMonthHeader } from '@/lib/date-utils';
import { PdfFooter, PdfHeader } from './pdf-header-footer';
import { PDF_CELL_COLORS, styles } from './pdf-styles';

interface HeatMapPDFProps {
  data: HeatMapResponse;
  orgName: string;
  dateRange: { from: string; to: string };
}

const LEGEND_ITEMS = [
  { label: 'Over 100%', color: PDF_CELL_COLORS.over },
  { label: '80-100%', color: PDF_CELL_COLORS.healthy },
  { label: '50-79%', color: PDF_CELL_COLORS.under },
  { label: 'Under 50%', color: PDF_CELL_COLORS.idle },
] as const;

export function HeatMapPDF({ data, orgName, dateRange }: HeatMapPDFProps) {
  return (
    <Document>
      <Page size="A4" orientation="landscape" style={styles.page}>
        <PdfHeader orgName={orgName} dateRange={dateRange} />
        <PdfFooter generatedAt={data.generatedAt} />

        {/* Content area — offset to clear fixed header */}
        <View style={{ marginTop: 45 }}>
          {/* Month header row */}
          <View style={styles.row}>
            <View style={styles.nameCell}>
              <Text>Name</Text>
            </View>
            {data.months.map((month) => (
              <View key={month} style={styles.dataCell}>
                <Text>{formatMonthHeader(month)}</Text>
              </View>
            ))}
          </View>

          {/* Department groups */}
          {data.departments.map((dept) => (
            <View key={dept.departmentId}>
              {/* Department header */}
              <View style={styles.deptHeader}>
                <View style={styles.nameCell}>
                  <Text>{dept.departmentName}</Text>
                </View>
                {data.months.map((month) => (
                  <View key={month} style={styles.dataCell}>
                    <Text />
                  </View>
                ))}
              </View>

              {/* Person rows */}
              {dept.people.map((person) => (
                <View key={person.personId} style={styles.row} wrap={false}>
                  <View style={styles.nameCell}>
                    <Text>
                      {person.firstName} {person.lastName}
                    </Text>
                  </View>
                  {data.months.map((month) => {
                    const hours = person.months[month] ?? 0;
                    const status = calculateHeatMapStatus(
                      hours,
                      person.targetHours,
                    );
                    return (
                      <View
                        key={month}
                        style={[
                          styles.dataCell,
                          { backgroundColor: PDF_CELL_COLORS[status] },
                        ]}
                      >
                        <Text>{hours > 0 ? String(hours) : ''}</Text>
                      </View>
                    );
                  })}
                </View>
              ))}
            </View>
          ))}

          {/* Legend */}
          <View style={styles.legend}>
            {LEGEND_ITEMS.map((item) => (
              <View key={item.label} style={styles.legendItem}>
                <View
                  style={[
                    styles.legendSwatch,
                    { backgroundColor: item.color },
                  ]}
                />
                <Text>{item.label}</Text>
              </View>
            ))}
          </View>
        </View>
      </Page>
    </Document>
  );
}
