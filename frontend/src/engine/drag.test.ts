import { describe, test, expect, beforeEach, vi, type Mock } from 'vitest';
import { DragHandler } from './drag';
import type { WindowInstance } from './types';

type OnMoveFn = (position: { x: number; y: number }) => void;

function makeInstance(): WindowInstance {
  const element = document.createElement('div');
  element.className = 'win';

  const bar = document.createElement('div');
  bar.className = 'win-bar';

  const actions = document.createElement('div');
  actions.className = 'win-actions';
  const closeBtn = document.createElement('button');
  actions.appendChild(closeBtn);
  bar.appendChild(actions);
  element.appendChild(bar);

  return {
    element,
    config: { id: 'w1', title: 'Test', content: '' },
    state: {
      id: 'w1',
      isHidden: false,
      isMinimized: false,
      zIndex: 10,
      position: { x: 0, y: 0 },
      size: { width: 200, height: 100 },
    },
  } as WindowInstance;
}

function mousedown(target: HTMLElement, x = 0, y = 0) {
  target.dispatchEvent(new MouseEvent('mousedown', { clientX: x, clientY: y, bubbles: true }));
}
function mousemove(x = 0, y = 0) {
  document.dispatchEvent(new MouseEvent('mousemove', { clientX: x, clientY: y }));
}
function mouseup() {
  document.dispatchEvent(new MouseEvent('mouseup'));
}

function touchstart(target: HTMLElement, x = 0, y = 0) {
  const touch = { clientX: x, clientY: y, target, identifier: Date.now() } as unknown as Touch;

  const event = new TouchEvent('touchstart', {
    bubbles: true,
    cancelable: true,
    touches: [touch],
    targetTouches: [touch],
    changedTouches: [touch],
  });

  target.dispatchEvent(event);
}

function touchmove(target: HTMLElement, x = 0, y = 0) {
  const touch = { clientX: x, clientY: y, target, identifier: Date.now() } as unknown as Touch;

  const event = new TouchEvent('touchmove', {
    bubbles: true,
    cancelable: true,
    touches: [touch],
    targetTouches: [touch],
    changedTouches: [touch],
  });

  document.dispatchEvent(event);
}

function touchend() {
  document.dispatchEvent(new Event('touchend'));
}

describe('DragHandler', () => {
  let instance: WindowInstance;
  let onMove: Mock<OnMoveFn>;
  let container: HTMLElement;
  let handler: DragHandler;
  let bar: HTMLElement;

  beforeEach(() => {
    instance = makeInstance();
    onMove = vi.fn<OnMoveFn>();
    container = document.createElement('div');
    Object.defineProperty(container, 'clientHeight', { value: 1000, configurable: true });
    document.body.appendChild(container);

    instance.element.getBoundingClientRect = vi.fn().mockReturnValue({
      left: 0,
      top: 0,
      width: 200,
      height: 100,
      right: 200,
      bottom: 100,
    });

    handler = new DragHandler(instance, onMove, container);
    bar = instance.element.querySelector('.win-bar') as HTMLElement;
  });

  describe('mouse drag', () => {
    test('onMove is called during mousemove after mousedown on bar', () => {
      mousedown(bar, 10, 10);
      mousemove(50, 60);
      expect(onMove).toHaveBeenCalledOnce();
    });

    test('onMove receives correct position', () => {
      mousedown(bar, 10, 10); // offsetX=10, offsetY=10
      mousemove(50, 60);
      const { x, y } = onMove.mock.calls[0]![0]!;
      expect(x).toBe(40); // 50 - 10
      expect(y).toBe(50); // 60 - 10
    });

    test('onMove is not called if drag not started', () => {
      mousemove(100, 100);
      expect(onMove).not.toHaveBeenCalled();
    });

    test('onMove is not called after mouseup', () => {
      mousedown(bar, 0, 0);
      mouseup();
      mousemove(100, 100);
      expect(onMove).not.toHaveBeenCalled();
    });

    test('disables userSelect on dragstart', () => {
      mousedown(bar, 0, 0);
      expect(document.body.style.userSelect).toBe('none');
    });

    test('restores userSelect on mouseup', () => {
      mousedown(bar, 0, 0);
      mouseup();
      expect(document.body.style.userSelect).toBe('');
    });

    test('does not start drag when clicking inside .win-actions', () => {
      const actionsBtn = bar.querySelector('button') as HTMLElement;
      mousedown(actionsBtn, 10, 10);
      mousemove(100, 100);
      expect(onMove).not.toHaveBeenCalled();
    });

    test('clamps x to 0 minimum', () => {
      mousedown(bar, 50, 0); // offsetX = 50
      mousemove(10, 0); // clientX - offsetX = -40, clamped to 0
      const { x } = onMove.mock.calls[0]![0]!;
      expect(x).toBeGreaterThanOrEqual(0);
    });
  });

  describe('touch drag', () => {
    test('onMove is called during touchmove after touchstart', () => {
      touchstart(bar, 10, 10);
      touchmove(bar, 50, 60);
      expect(onMove).toHaveBeenCalledOnce();
    });

    test('onMove receives correct position on touch', () => {
      touchstart(bar, 10, 10);
      touchmove(bar, 50, 60);
      const { x, y } = onMove.mock.calls[0]![0]!;
      expect(x).toBe(40);
      expect(y).toBe(50);
    });

    test('onMove not called after touchend', () => {
      touchstart(bar, 0, 0);
      touchend();
      touchmove(bar, 100, 100);
      expect(onMove).not.toHaveBeenCalled();
    });

    test('does not start touch drag when target is inside .win-actions', () => {
      const actionsBtn = bar.querySelector('button') as HTMLElement;
      touchstart(actionsBtn, 10, 10);
      touchmove(bar, 100, 100);
      expect(onMove).not.toHaveBeenCalled();
    });
  });

  describe('destroy', () => {
    test('mousemove no longer triggers onMove after destroy', () => {
      mousedown(bar, 0, 0);
      handler.destroy();
      mousemove(100, 100);
      expect(onMove).not.toHaveBeenCalled();
    });

    test('does not throw when bar is missing', () => {
      const noBarInstance = makeInstance();
      noBarInstance.element.innerHTML = ''; // remove bar
      const h = new DragHandler(noBarInstance, onMove, container);
      expect(() => h.destroy()).not.toThrow();
    });
  });
});
