/**
 * Widget Snapshot Utility for PDF export.
 *
 * Two capture strategies:
 * 1. Recharts SVG extraction → PNG (fast, crisp for chart widgets)
 * 2. html-to-image DOM capture fallback → PNG (captures any HTML widget:
 *    KPIs, tables, sparklines, bench report, etc.) via foreignObject
 *    rasterization, so the browser handles modern CSS (custom properties,
 *    oklch, web fonts, content-visibility).
 */

import { toPng } from 'html-to-image';

// ---------------------------------------------------------------------------
// extractSvgFromWidget — finds the Recharts SVG inside a widget container
// ---------------------------------------------------------------------------

function extractSvgElement(container: HTMLElement): SVGSVGElement | null {
  // Only activate the SVG fast-path for Recharts-rendered widgets. Multi-SVG
  // widgets (e.g. Capacity Gauges with 3 radial gauges, Availability Finder
  // with per-row bars) must go through html-to-image so the full laid-out DOM
  // is captured — picking the "first big SVG" hijacks the capture and stretches
  // one child to the container bounds.
  const rechartsWrappers = container.querySelectorAll<HTMLElement>('.recharts-wrapper');
  if (rechartsWrappers.length !== 1) return null;
  return rechartsWrappers[0].querySelector<SVGSVGElement>(':scope > svg');
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
// domToImageCapture — fallback: rasterize the widget container as PNG via
// html-to-image's foreignObject pipeline. Delegates CSS resolution to the
// browser so Tailwind v4 oklch tokens, CSS custom properties, web fonts, and
// content-visibility all "just work".
// ---------------------------------------------------------------------------

async function domToImageCapture(container: HTMLElement): Promise<string> {
  // Ensure web fonts are loaded so Swedish characters (åäö) render in the
  // correct typeface rather than a fallback. Guarded for jsdom/test envs.
  if (typeof document !== 'undefined' && document.fonts && document.fonts.ready) {
    await document.fonts.ready;
  }

  // Below-the-fold widgets may use content-visibility:auto or intersection-
  // observer lazy rendering. Their children aren't painted until the
  // container is scrolled into the viewport — capturing without this yields
  // an empty frame or a collapsed bounding rect. Force a layout pass by
  // scrolling the container into view and waiting two RAFs so the browser
  // commits the painted layout before html-to-image serializes.
  if (typeof container.scrollIntoView === 'function') {
    container.scrollIntoView({ block: 'center', inline: 'center' });
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
    });
  }

  // Use the laid-out bounding rect as explicit capture dimensions. Without
  // this, html-to-image falls back to the container's intrinsic size which
  // can collapse for flex/grid widgets whose children drive the real layout.
  // Parent-width fallback: when the container's own rect is narrower than
  // its parent (e.g. Availability Finder rendered at intrinsic content width
  // inside a stretched grid cell), use the parent width so the widget fills
  // its allocated PDF tile instead of being shrunken.
  const selfRect = container.getBoundingClientRect();
  const parentRect = container.parentElement?.getBoundingClientRect();
  const useParent = !!parentRect && parentRect.width > selfRect.width;
  const width = Math.max(1, Math.round(useParent ? parentRect!.width : selfRect.width));
  const height = Math.max(1, Math.round(selfRect.height));

  // When using parent width, temporarily stretch the container so the
  // foreignObject layout inside html-to-image matches the allocated tile
  // width. Restored in finally.
  const prevInlineWidth = container.style.width;
  if (useParent) {
    container.style.width = `${width}px`;
  }
  try {
    return await toPng(container, {
      backgroundColor: '#ffffff',
      pixelRatio: 2,
      cacheBust: true,
      width,
      height,
      canvasWidth: width,
      canvasHeight: height,
      filter: (node) => {
        if (!(node instanceof HTMLElement)) return true;
        const tag = node.tagName?.toLowerCase();
        const isButton = tag === 'button' || node.getAttribute('role') === 'button';
        if (isButton || tag === 'select') {
          // Preserve buttons that wrap chart content — Capacity Gauges renders
          // each gauge inside a <button> for navigation. Only strip buttons
          // whose subtree has no chart/SVG content (export button, filters).
          if (node.querySelector('.recharts-wrapper, svg')) return true;
          return false;
        }
        return true;
      },
    });
  } finally {
    if (useParent) {
      container.style.width = prevInlineWidth;
    }
  }
}

// ---------------------------------------------------------------------------
// captureWidgetSnapshot — high-level: widget container -> PNG data URI
// Uses SVG extraction for Recharts, html-to-image fallback for everything else
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
    } catch (err) {
      console.warn(
        `[pdf-export] SVG fast-path failed for widget ${widgetId}, falling back to DOM capture:`,
        err,
      );
      // Fall through to html-to-image
    }
  }

  // Strategy 2: html-to-image fallback (captures any HTML content via foreignObject)
  try {
    return await domToImageCapture(container);
  } catch (err) {
    console.warn(`[pdf-export] DOM capture failed for widget ${widgetId}:`, err);
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
    } catch (err) {
      console.warn(`[pdf-export] captureWidgetSnapshot threw for widget ${id}:`, err);
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
