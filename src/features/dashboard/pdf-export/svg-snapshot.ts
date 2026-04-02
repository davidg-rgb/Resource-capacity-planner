/**
 * Widget Snapshot Utility for PDF export.
 *
 * Two capture strategies:
 * 1. Recharts SVG extraction → PNG (fast, crisp for chart widgets)
 * 2. html2canvas fallback → PNG (captures any HTML widget: KPIs, tables, etc.)
 */

import html2canvas from 'html2canvas';

// ---------------------------------------------------------------------------
// extractSvgFromWidget — finds the Recharts SVG inside a widget container
// ---------------------------------------------------------------------------

function extractSvgElement(container: HTMLElement): SVGSVGElement | null {
  // Recharts wraps SVG inside .recharts-responsive-container > .recharts-wrapper > svg
  const svg = container.querySelector<SVGSVGElement>('.recharts-wrapper > svg');
  if (svg) return svg;

  // Fallback: find any top-level SVG (but skip tiny icons)
  const allSvgs = container.querySelectorAll<SVGSVGElement>('svg');
  for (const s of allSvgs) {
    const rect = s.getBoundingClientRect();
    if (rect.width > 100 && rect.height > 50) return s;
  }
  return null;
}

// ---------------------------------------------------------------------------
// svgToPngDataUri — renders an SVG to a PNG data URI via Canvas
// ---------------------------------------------------------------------------

export async function svgToPngDataUri(
  svgElement: SVGSVGElement,
  width = 800,
  height = 400,
): Promise<string> {
  const clone = svgElement.cloneNode(true) as SVGSVGElement;

  clone.setAttribute('width', String(width));
  clone.setAttribute('height', String(height));
  clone.setAttribute('viewBox', `0 0 ${width} ${height}`);

  inlineStyles(svgElement, clone);

  const serializer = new XMLSerializer();
  const svgString = serializer.serializeToString(clone);
  const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(svgBlob);

  return new Promise<string>((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const scale = 2;
      canvas.width = width * scale;
      canvas.height = height * scale;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        URL.revokeObjectURL(url);
        reject(new Error('Failed to get 2d context'));
        return;
      }
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
// html2canvasCapture — fallback: screenshot the widget container as PNG
// ---------------------------------------------------------------------------

/**
 * Inline all CSS custom properties as computed values on a cloned DOM tree.
 * html2canvas cannot resolve var(--xxx) — it needs actual color/size values.
 */
function inlineCustomProperties(clonedDoc: Document) {
  const elements = clonedDoc.querySelectorAll('*');
  for (const el of elements) {
    if (!(el instanceof HTMLElement)) continue;
    const computed = getComputedStyle(el);

    // Inline key visual properties that commonly use CSS custom properties
    const props = [
      'color',
      'background-color',
      'border-color',
      'border-top-color',
      'border-bottom-color',
      'border-left-color',
      'border-right-color',
      'fill',
      'stroke',
      'box-shadow',
      'outline-color',
    ];

    for (const prop of props) {
      const value = computed.getPropertyValue(prop);
      if (value && value !== 'rgba(0, 0, 0, 0)' && value !== 'transparent') {
        el.style.setProperty(prop, value);
      }
    }

    // Also ensure font is inlined
    el.style.setProperty('font-family', computed.fontFamily);
  }
}

async function html2canvasCapture(container: HTMLElement): Promise<string> {
  const canvas = await html2canvas(container, {
    backgroundColor: '#ffffff',
    scale: 2,
    logging: false,
    useCORS: true,
    onclone: (_doc, clonedEl) => {
      // Inline CSS custom properties on the cloned element tree
      inlineCustomProperties(clonedEl.ownerDocument);
    },
    ignoreElements: (el) => {
      const tag = el.tagName?.toLowerCase();
      return tag === 'button' || tag === 'select' || el.getAttribute('role') === 'button';
    },
  });
  return canvas.toDataURL('image/png');
}

// ---------------------------------------------------------------------------
// captureWidgetSnapshot — high-level: widget container -> PNG data URI
// Uses SVG extraction for Recharts, html2canvas fallback for everything else
// ---------------------------------------------------------------------------

export async function captureWidgetSnapshot(widgetId: string): Promise<string | null> {
  const container = document.querySelector<HTMLElement>(`[data-widget-id="${widgetId}"]`);
  if (!container) return null;

  // Strategy 1: Try Recharts SVG extraction (fast, crisp)
  const svg = extractSvgElement(container);
  if (svg) {
    try {
      const rect = container.getBoundingClientRect();
      const width = Math.round(rect.width) || 800;
      const height = Math.round(rect.height) || 400;
      return await svgToPngDataUri(svg, width, Math.min(height, 600));
    } catch {
      // Fall through to html2canvas
    }
  }

  // Strategy 2: html2canvas fallback (captures any HTML content)
  try {
    return await html2canvasCapture(container);
  } catch {
    return null;
  }
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
