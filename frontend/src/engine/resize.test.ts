import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';
import { ResizeHandler } from './resize';
import type { WindowInstance } from './types';

type OnResizeFn = (size: { width: number; height: number }) => void;

function createHandle(): HTMLElement {
  const el = document.createElement('div');
  el.className = 'win-resize';
  return el;
}

function createInstance(overrides?: Partial<WindowInstance['config']>): WindowInstance {
  const element = document.createElement('div');
  element.appendChild(createHandle());

  Object.defineProperty(element, 'offsetWidth', { configurable: true, get: () => 400 });
  Object.defineProperty(element, 'offsetHeight', { configurable: true, get: () => 300 });

  return {
    element,
    config: { minSize: undefined, ...overrides },
  } as unknown as WindowInstance;
}

function mousedown(target: Element, x: number, y: number) {
  target.dispatchEvent(new MouseEvent('mousedown', { clientX: x, clientY: y, bubbles: true }));
}

function mousemove(x: number, y: number) {
  document.dispatchEvent(new MouseEvent('mousemove', { clientX: x, clientY: y }));
}

function mouseup() {
  document.dispatchEvent(new MouseEvent('mouseup'));
}

describe('ResizeHandler', () => {
  let instance: WindowInstance;
  let onResize: Mock<OnResizeFn>;
  let handler: ResizeHandler;
  let handle: Element;

  beforeEach(() => {
    instance = createInstance();
    onResize = vi.fn<OnResizeFn>();
    handler = new ResizeHandler(instance, onResize);
    handle = instance.element.querySelector('.win-resize')!;
  });

  afterEach(() => {
    handler.destroy();
    document.body.style.userSelect = '';
  });

  it('does not throw when .win-resize handle is missing', () => {
    const el = document.createElement('div');
    const bare = { element: el, config: {} } as unknown as WindowInstance;
    expect(() => new ResizeHandler(bare, onResize)).not.toThrow();
  });

  it('does not call onResize on mousemove before mousedown', () => {
    mousemove(500, 400);
    expect(onResize).not.toHaveBeenCalled();
  });

  it('calls onResize during drag with correct deltas', () => {
    mousedown(handle, 200, 150);
    mousemove(250, 200); // +50x, +50y → 400+50=450, 300+50=350
    expect(onResize).toHaveBeenCalledWith({ width: 450, height: 350 });
  });

  it('stops calling onResize after mouseup', () => {
    mousedown(handle, 200, 150);
    mousemove(250, 200);
    mouseup();
    onResize.mockClear();
    mousemove(300, 250);
    expect(onResize).not.toHaveBeenCalled();
  });

  it('can start a new resize after a completed one', () => {
    mousedown(handle, 200, 150);
    mousemove(250, 200);
    mouseup();
    onResize.mockClear();

    mousedown(handle, 200, 150);
    mousemove(260, 160);
    expect(onResize).toHaveBeenCalledWith({ width: 460, height: 310 });
  });

  it('clamps width and height to default minimums (240×100)', () => {
    mousedown(handle, 200, 150);
    mousemove(0, 0); // would give 400-200=200 width, 300-150=150 height
    const call = onResize.mock.calls[0]![0]!;
    expect(call.width).toBe(240); // clamped
    expect(call.height).toBe(150); // not clamped (150 > 100)
  });

  it('clamps height to default minimum when result is too small', () => {
    mousedown(handle, 200, 150);
    mousemove(100, 0); // height: 300 - 150 = 150 → but going way up
    const call = onResize.mock.calls[0]![0]!;
    expect(call.height).toBeGreaterThanOrEqual(100);
  });

  it('respects custom minSize from config', () => {
    const customInstance = createInstance({ minSize: { width: 100, height: 50 } });
    const customHandler = new ResizeHandler(customInstance, onResize);
    const customHandle = customInstance.element.querySelector('.win-resize')!;

    mousedown(customHandle, 200, 150);
    mousemove(50, 50); // width: 400-150=250→but clientX=50 → 400+(50-200)=250, height: 300+(50-150)=200
    const call = onResize.mock.calls[0]![0]!;
    expect(call.width).toBeGreaterThanOrEqual(100);
    expect(call.height).toBeGreaterThanOrEqual(50);
    customHandler.destroy();
  });

  it('never returns width below custom minimum', () => {
    const customInstance = createInstance({ minSize: { width: 320, height: 200 } });
    const customHandler = new ResizeHandler(customInstance, onResize);
    const customHandle = customInstance.element.querySelector('.win-resize')!;

    mousedown(customHandle, 400, 300);
    mousemove(0, 0); // large negative delta
    const { width, height } = onResize.mock.calls[0]![0]!;
    expect(width).toBe(320);
    expect(height).toBe(200);
    customHandler.destroy();
  });

  it('sets userSelect to none on mousedown', () => {
    mousedown(handle, 100, 100);
    expect(document.body.style.userSelect).toBe('none');
  });

  it('clears userSelect on mouseup', () => {
    mousedown(handle, 100, 100);
    mouseup();
    expect(document.body.style.userSelect).toBe('');
  });

  it('tracks dimensions correctly across multiple mousemove events', () => {
    mousedown(handle, 100, 100);
    mousemove(150, 130); // +50, +30 → 450×330
    mousemove(200, 160); // +100, +60 → 500×360
    mousemove(50, 80); // -50, -20 → 350×280

    expect(onResize).toHaveBeenNthCalledWith(1, { width: 450, height: 330 });
    expect(onResize).toHaveBeenNthCalledWith(2, { width: 500, height: 360 });
    expect(onResize).toHaveBeenNthCalledWith(3, { width: 350, height: 280 });
  });

  it('stops responding to events after destroy()', () => {
    handler.destroy();
    mousedown(handle, 100, 100);
    mousemove(200, 200);
    expect(onResize).not.toHaveBeenCalled();
  });

  it('calling destroy() twice does not throw', () => {
    expect(() => {
      handler.destroy();
      handler.destroy();
    }).not.toThrow();
  });
});
