/**
 * Fixed header and footer components for PDF pages.
 * Rendered on every page via the `fixed` prop (PDF-03).
 */

import { Text, View } from '@react-pdf/renderer';
import { formatMonthHeader } from '@/lib/date-utils';
import { styles } from './pdf-styles';

interface PdfHeaderProps {
  orgName: string;
  dateRange: { from: string; to: string };
}

export function PdfHeader({ orgName, dateRange }: PdfHeaderProps) {
  return (
    <View fixed style={styles.header}>
      <Text>{orgName}</Text>
      <Text>
        {formatMonthHeader(dateRange.from)} - {formatMonthHeader(dateRange.to)}
      </Text>
    </View>
  );
}

interface PdfFooterProps {
  generatedAt: string;
}

export function PdfFooter({ generatedAt }: PdfFooterProps) {
  return (
    <View fixed style={styles.footer}>
      <Text>Generated: {generatedAt}</Text>
      <Text
        render={({ pageNumber, totalPages }) =>
          `Page ${pageNumber} / ${totalPages}`
        }
      />
    </View>
  );
}
