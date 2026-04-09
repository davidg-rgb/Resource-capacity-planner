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
