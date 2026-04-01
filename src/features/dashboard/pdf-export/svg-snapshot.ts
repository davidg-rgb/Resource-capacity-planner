/**
 * SVG Snapshot Utility for Recharts-based widgets.
 *
 * Extracts the SVG element from a widget's DOM container and converts it
 * to a PNG data URI suitable for @react-pdf/renderer Image components.
 *
 * Recharts renders pure SVG, so we can grab it directly from the DOM
 * without Puppeteer or html2canvas.
 */

// ---------------------------------------------------------------------------
// extractSvgFromWidget — finds the Recharts SVG inside a widget container
// ---------------------------------------------------------------------------

function extractSvgElement(container: HTMLElement): SVGSVGElement | null {
  // Recharts wraps SVG inside .recharts-responsive-container > .recharts-wrapper > svg
  const svg = container.querySelector<SVGSVGElement>('.recharts-wrapper > svg');
  if (svg) return svg;

  // Fallback: find any top-level SVG
  return container.querySelector<SVGSVGElement>('svg');
}

// ---------------------------------------------------------------------------
// svgToPngDataUri — renders an SVG to a PNG data URI via Canvas
// ---------------------------------------------------------------------------

export async function svgToPngDataUri(
  svgElement: SVGSVGElement,
  width = 800,
  height = 400,
): Promise<string> {
  // Clone the SVG so we don't mutate the live DOM
  const clone = svgElement.cloneNode(true) as SVGSVGElement;

  // Ensure explicit dimensions for the serialization
  clone.setAttribute('width', String(width));
  clone.setAttribute('height', String(height));
  clone.setAttribute('viewBox', `0 0 ${width} ${height}`);

  // Inline computed styles so the PNG renders correctly
  inlineStyles(svgElement, clone);

  const serializer = new XMLSerializer();
  const svgString = serializer.serializeToString(clone);
  const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(svgBlob);

  return new Promise<string>((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      // Use 2x resolution for crisp PDF rendering
      const scale = 2;
      canvas.width = width * scale;
      canvas.height = height * scale;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        URL.revokeObjectURL(url);
        reject(new Error('Failed to get 2d context'));
        return;
      }
      // White background
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.scale(scale, scale);
      ctx.drawImage(img, 0, 0, width, height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load SVG as image'));
    };
    img.src = url;
  });
}

// ---------------------------------------------------------------------------
// captureWidgetSnapshot — high-level: widget container -> PNG data URI
// ---------------------------------------------------------------------------

export async function captureWidgetSnapshot(widgetId: string): Promise<string | null> {
  // Widget containers are rendered with data-widget-id attribute
  const container = document.querySelector<HTMLElement>(`[data-widget-id="${widgetId}"]`);
  if (!container) return null;

  const svg = extractSvgElement(container);
  if (!svg) return null;

  // Get the rendered dimensions from the container
  const rect = container.getBoundingClientRect();
  const width = Math.round(rect.width) || 800;
  const height = Math.round(rect.height) || 400;

  return svgToPngDataUri(svg, width, Math.min(height, 600));
}

// ---------------------------------------------------------------------------
// Batch capture for multiple widgets
// ---------------------------------------------------------------------------

export async function captureWidgetSnapshots(
  widgetIds: string[],
): Promise<Record<string, string | null>> {
  const results: Record<string, string | null> = {};
  for (const id of widgetIds) {
    try {
      results[id] = await captureWidgetSnapshot(id);
    } catch {
      results[id] = null;
    }
  }
  return results;
}

// ---------------------------------------------------------------------------
// inlineStyles — copy computed styles from original to clone for accurate rendering
// ---------------------------------------------------------------------------

function inlineStyles(source: Element, target: Element): void {
  const sourceChildren = source.children;
  const targetChildren = target.children;

  if (source instanceof SVGElement && target instanceof SVGElement) {
    const computed = window.getComputedStyle(source);
    const importantProps = [
      'fill',
      'stroke',
      'stroke-width',
      'stroke-dasharray',
      'opacity',
      'font-family',
      'font-size',
      'font-weight',
      'text-anchor',
      'dominant-baseline',
    ];
    for (const prop of importantProps) {
      const value = computed.getPropertyValue(prop);
      if (value) {
        (target as SVGElement).style.setProperty(prop, value);
      }
    }
  }

  for (let i = 0; i < sourceChildren.length && i < targetChildren.length; i++) {
    inlineStyles(sourceChildren[i], targetChildren[i]);
  }
}
