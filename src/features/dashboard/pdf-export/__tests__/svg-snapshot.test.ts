// @vitest-environment jsdom
/**
 * Unit tests for svg-snapshot capture paths.
 *
 * Phase 45 (LAUNCH-01): verify the html2canvas→html-to-image swap preserves
 * public API wiring. Pixel-level correctness is out of scope in jsdom — that
 * is covered by the manual smoke test in 45-01 Task 5.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const toPngMock = vi.fn();
vi.mock('html-to-image', () => ({
  toPng: (...args: unknown[]) => toPngMock(...args),
}));

import { captureWidgetSnapshot, captureWidgetSnapshots } from '../svg-snapshot';

beforeEach(() => {
  toPngMock.mockReset();
  vi.spyOn(console, 'warn').mockImplementation(() => {});

  // Stub URL.createObjectURL for svgToPngDataUri
  global.URL.createObjectURL = vi.fn(() => 'blob:mock');
  global.URL.revokeObjectURL = vi.fn();

  // Stub Image so svgToPngDataUri's onload fires synchronously
  class MockImage {
    onload: (() => void) | null = null;
    onerror: (() => void) | null = null;
    set src(_v: string) {
      queueMicrotask(() => this.onload?.());
    }
  }
  // @ts-expect-error - test stub
  global.Image = MockImage;

  // Stub canvas.getContext for svgToPngDataUri
  HTMLCanvasElement.prototype.getContext = vi.fn(() => ({
    fillStyle: '',
    fillRect: vi.fn(),
    scale: vi.fn(),
    drawImage: vi.fn(),
  })) as unknown as typeof HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.toDataURL = vi.fn(() => 'data:image/png;base64,CANVAS_MOCK');
});

afterEach(() => {
  document.body.innerHTML = '';
  vi.restoreAllMocks();
});

describe('captureWidgetSnapshot', () => {
  it('uses SVG fast-path when a Recharts SVG is present', async () => {
    document.body.innerHTML = `
      <div data-widget-id="w1">
        <div class="recharts-wrapper">
          <svg width="800" height="400"><rect width="100" height="100" /></svg>
        </div>
      </div>
    `;
    const result = await captureWidgetSnapshot('w1');
    expect(result).toMatch(/^data:image\/png;base64,/);
    expect(toPngMock).not.toHaveBeenCalled();
  });

  it('uses html-to-image fallback when no SVG is present', async () => {
    toPngMock.mockResolvedValue('data:image/png;base64,MOCK');
    document.body.innerHTML = `<div data-widget-id="w2"><p>KPI card content</p></div>`;
    const result = await captureWidgetSnapshot('w2');
    expect(result).toBe('data:image/png;base64,MOCK');
    expect(toPngMock).toHaveBeenCalledOnce();
  });

  it('returns null and logs a warning when html-to-image throws', async () => {
    toPngMock.mockRejectedValue(new Error('boom'));
    document.body.innerHTML = `<div data-widget-id="w3"><p>table</p></div>`;
    const result = await captureWidgetSnapshot('w3');
    expect(result).toBeNull();
    expect(console.warn).toHaveBeenCalledWith(
      expect.stringContaining('w3'),
      expect.any(Error),
    );
  });

  it('returns null when the widget element is not in the DOM', async () => {
    const result = await captureWidgetSnapshot('missing');
    expect(result).toBeNull();
    expect(toPngMock).not.toHaveBeenCalled();
  });
});

describe('TC-PDF-004: gauge button filter', () => {
  it('preserves buttons wrapping Recharts content but strips plain buttons and selects', async () => {
    toPngMock.mockResolvedValue('data:image/png;base64,MOCK');
    document.body.innerHTML = `
      <div data-widget-id="gauges">
        <button type="button" id="gauge-btn"><div class="recharts-wrapper"><svg><g></g></svg></div></button>
        <button type="button" id="gauge-btn-2"><div class="recharts-wrapper"><svg><g></g></svg></div></button>
        <button type="button" id="export-btn">Export PDF</button>
        <select id="filter-sel"><option>All</option></select>
        <div role="button" id="role-btn-chart"><svg><g></g></svg></div>
        <div role="button" id="role-btn-plain">Click</div>
      </div>
    `;
    await captureWidgetSnapshot('gauges');
    expect(toPngMock).toHaveBeenCalledOnce();
    const opts = toPngMock.mock.calls[0][1] as { filter: (n: Node) => boolean };
    expect(typeof opts.filter).toBe('function');

    const gaugeBtn = document.getElementById('gauge-btn')!;
    const exportBtn = document.getElementById('export-btn')!;
    const filterSel = document.getElementById('filter-sel')!;
    const roleBtnChart = document.getElementById('role-btn-chart')!;
    const roleBtnPlain = document.getElementById('role-btn-plain')!;

    expect(opts.filter(gaugeBtn)).toBe(true);
    expect(opts.filter(exportBtn)).toBe(false);
    expect(opts.filter(filterSel)).toBe(false);
    expect(opts.filter(roleBtnChart)).toBe(true);
    expect(opts.filter(roleBtnPlain)).toBe(false);
  });
});

describe('TC-PDF-005: parent-width fallback', () => {
  it('uses parent width when parent is wider than container and restores inline style', async () => {
    toPngMock.mockResolvedValue('data:image/png;base64,MOCK');
    document.body.innerHTML = `
      <div id="parent"><div data-widget-id="finder"><p>content</p></div></div>
    `;
    const parent = document.getElementById('parent')!;
    const container = document.querySelector<HTMLElement>('[data-widget-id="finder"]')!;
    vi.spyOn(container, 'getBoundingClientRect').mockReturnValue({
      width: 200, height: 300, top: 0, left: 0, right: 200, bottom: 300, x: 0, y: 0, toJSON: () => ({}),
    } as DOMRect);
    vi.spyOn(parent, 'getBoundingClientRect').mockReturnValue({
      width: 800, height: 300, top: 0, left: 0, right: 800, bottom: 300, x: 0, y: 0, toJSON: () => ({}),
    } as DOMRect);

    expect(container.style.width).toBe('');
    await captureWidgetSnapshot('finder');

    const opts = toPngMock.mock.calls[0][1] as { width: number; canvasWidth: number; height: number };
    expect(opts.width).toBe(800);
    expect(opts.canvasWidth).toBe(800);
    expect(opts.height).toBe(300);
    // inline width restored in finally
    expect(container.style.width).toBe('');
  });

  it('uses self width when parent is not wider', async () => {
    toPngMock.mockResolvedValue('data:image/png;base64,MOCK');
    document.body.innerHTML = `
      <div id="parent2"><div data-widget-id="widget2"><p>content</p></div></div>
    `;
    const parent = document.getElementById('parent2')!;
    const container = document.querySelector<HTMLElement>('[data-widget-id="widget2"]')!;
    vi.spyOn(container, 'getBoundingClientRect').mockReturnValue({
      width: 600, height: 200, top: 0, left: 0, right: 600, bottom: 200, x: 0, y: 0, toJSON: () => ({}),
    } as DOMRect);
    vi.spyOn(parent, 'getBoundingClientRect').mockReturnValue({
      width: 400, height: 200, top: 0, left: 0, right: 400, bottom: 200, x: 0, y: 0, toJSON: () => ({}),
    } as DOMRect);

    await captureWidgetSnapshot('widget2');
    const opts = toPngMock.mock.calls[0][1] as { width: number };
    expect(opts.width).toBe(600);
    expect(container.style.width).toBe('');
  });
});

describe('captureWidgetSnapshots', () => {
  it('returns a record keyed by widget id for multiple widgets', async () => {
    toPngMock.mockResolvedValue('data:image/png;base64,MOCK');
    document.body.innerHTML = `
      <div data-widget-id="a"><p>A</p></div>
      <div data-widget-id="b"><p>B</p></div>
    `;
    const result = await captureWidgetSnapshots(['a', 'b']);
    expect(Object.keys(result)).toEqual(['a', 'b']);
    expect(result.a).toBe('data:image/png;base64,MOCK');
    expect(result.b).toBe('data:image/png;base64,MOCK');
  });
});
