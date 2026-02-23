import { describe, test, expect, beforeEach, vi } from 'vitest';
import { WindowManager } from './manager';
import type { WindowConfig } from './types';

// mocks
vi.mock('./drag', () => ({
  DragHandler: vi.fn().mockImplementation(function () {
    return { destroy: vi.fn() };
  }),
}));

vi.mock('./renderer', () => ({
  renderWindow: vi.fn().mockImplementation((config) => {
    const el = document.createElement('div');
    el.id = config.id;
    el.className = 'win';

    const minBtn = document.createElement('button');
    minBtn.dataset.action = 'min';
    minBtn.dataset.win = config.id;

    const closeBtn = document.createElement('button');
    closeBtn.dataset.action = 'close';
    closeBtn.dataset.win = config.id;

    el.appendChild(minBtn);
    el.appendChild(closeBtn);
    return el;
  }),
  updateWindowDOM: vi.fn(),
}));

const makeConfig = (overrides: Partial<WindowConfig> = {}): WindowConfig => ({
  id: 'win',
  title: 'Test',
  content: '<p>hi</p>',
  ...overrides,
});

describe('WindowManager', () => {
  let manager: WindowManager;
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    manager = new WindowManager({ container, zIndexBase: 10 });
    vi.clearAllMocks();
  });

  describe('register', () => {
    test('returns a WindowInstance with config, state, element', () => {
      const instance = manager.register(makeConfig());
      expect(instance).toHaveProperty('config');
      expect(instance).toHaveProperty('state');
      expect(instance).toHaveProperty('element');
    });

    test('appends element to container', () => {
      manager.register(makeConfig());
      expect(container.children.length).toBe(1);
    });

    test('initial state has isHidden false by default', () => {
      const { state } = manager.register(makeConfig());
      expect(state.isHidden).toBe(false);
    });

    test('initial state respects config.hidden', () => {
      const { state } = manager.register(makeConfig({ hidden: true }));
      expect(state.isHidden).toBe(true);
    });

    test('initial state has isMinimized false', () => {
      const { state } = manager.register(makeConfig());
      expect(state.isMinimized).toBe(false);
    });

    test('initial zIndex is incremented from base', () => {
      const { state } = manager.register(makeConfig());
      expect(state.zIndex).toBe(11);
    });

    test('uses config.initialPosition when provided', () => {
      const { state } = manager.register(makeConfig({ initialPosition: { x: 50, y: 60 } }));
      expect(state.position).toEqual({ x: 50, y: 60 });
    });

    test('falls back to default position when not provided', () => {
      const { state } = manager.register(makeConfig());
      expect(state.position).toEqual({ x: 80, y: 80 });
    });

    test('uses config.initialSize when provided', () => {
      const { state } = manager.register(makeConfig({ initialSize: { width: 600, height: 400 } }));
      expect(state.size).toEqual({ width: 600, height: 400 });
    });

    test('multiple windows get incrementing zIndex', () => {
      const a = manager.register(makeConfig({ id: 'a' }));
      const b = manager.register(makeConfig({ id: 'b' }));
      expect(b.state.zIndex).toBeGreaterThan(a.state.zIndex);
    });
  });

  // --- get ---

  describe('get', () => {
    test('returns registered instance by id', () => {
      const instance = manager.register(makeConfig({ id: 'x' }));
      const id = instance.config.id; // id may have random suffix
      expect(manager.get(id)).toBe(instance);
    });

    test('throws for unknown id', () => {
      expect(() => manager.get('nonexistent')).toThrow('not found');
    });
  });

  describe('unregister', () => {
    test('removes element from container', () => {
      const instance = manager.register(makeConfig());
      manager.unregister(instance.config.id);
      expect(container.children.length).toBe(0);
    });

    test('throws when getting unregistered window', () => {
      const instance = manager.register(makeConfig());
      const id = instance.config.id;
      manager.unregister(id);
      expect(() => manager.get(id)).toThrow('not found');
    });

    test('throws for unknown id', () => {
      expect(() => manager.unregister('ghost')).toThrow('not found');
    });
  });

  describe('minimize', () => {
    test('toggles isMinimized from false to true', () => {
      const instance = manager.register(makeConfig());
      manager.minimize(instance.config.id);
      expect(instance.state.isMinimized).toBe(true);
    });

    test('toggles isMinimized back to false', () => {
      const instance = manager.register(makeConfig());
      manager.minimize(instance.config.id);
      manager.minimize(instance.config.id);
      expect(instance.state.isMinimized).toBe(false);
    });

    test('calls updateWindowDOM', async () => {
      const { updateWindowDOM } = await import('./renderer');
      const instance = manager.register(makeConfig());
      manager.minimize(instance.config.id);
      expect(updateWindowDOM).toHaveBeenCalledWith(instance);
    });

    test('throws for unknown id', () => {
      expect(() => manager.minimize('nope')).toThrow('not found');
    });
  });

  describe('close', () => {
    test('sets isHidden to true', () => {
      const instance = manager.register(makeConfig());
      const id = instance.config.id;
      manager.close(id);
      // instance is removed, but state was mutated before removal
      expect(instance.state.isHidden).toBe(true);
    });

    test('removes window from container', () => {
      const instance = manager.register(makeConfig());
      manager.close(instance.config.id);
      expect(container.children.length).toBe(0);
    });

    test('throws for unknown id', () => {
      expect(() => manager.close('ghost')).toThrow('not found');
    });
  });

  describe('focus', () => {
    test('increments zIndex on focus', () => {
      const instance = manager.register(makeConfig());
      const prevZ = instance.state.zIndex;
      manager.focus(instance.config.id);
      expect(instance.state.zIndex).toBeGreaterThan(prevZ);
    });

    test('focused window gets higher zIndex than the other', () => {
      const a = manager.register(makeConfig({ id: 'a' }));
      const b = manager.register(makeConfig({ id: 'b' }));
      manager.focus(a.config.id);
      expect(a.state.zIndex).toBeGreaterThan(b.state.zIndex);
    });

    test('updates element style.zIndex', () => {
      const instance = manager.register(makeConfig());
      manager.focus(instance.config.id);
      expect(instance.element.style.zIndex).toBe(String(instance.state.zIndex));
    });

    test('throws for unknown id', () => {
      expect(() => manager.focus('nope')).toThrow('not found');
    });
  });

  // --- button behavior ---

  describe('button click behaviors', () => {
    test('min button click calls minimize', () => {
      const instance = manager.register(makeConfig());
      const minBtn = instance.element.querySelector<HTMLElement>('[data-action="min"]')!;
      minBtn.click();
      expect(instance.state.isMinimized).toBe(true);
    });

    test('close button click removes element', () => {
      const instance = manager.register(makeConfig());
      const closeBtn = instance.element.querySelector<HTMLElement>('[data-action="close"]')!;
      closeBtn.click();
      expect(container.children.length).toBe(0);
    });
  });
});
