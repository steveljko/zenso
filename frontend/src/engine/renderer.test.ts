import { renderWindow, updateWindowDOM } from './renderer';
import type { WindowConfig, WindowState, WindowInstance } from './types.ts';

const baseConfig = (overrides: Partial<WindowConfig> = {}): WindowConfig => ({
  id: 'win-1',
  title: 'Test Window',
  content: '<p>Hello</p>',
  ...overrides,
});

const baseState = (overrides: Partial<WindowState> = {}): WindowState => ({
  id: 'win-1',
  position: { x: 100, y: 200 },
  size: { width: 400, height: 300 },
  zIndex: 10,
  isHidden: false,
  isMinimized: false,
  ...overrides,
});

describe('renderWindow', () => {
  test('returns a div with class "win"', () => {
    const el = renderWindow(baseConfig(), baseState());
    expect(el.tagName).toBe('DIV');
    expect(el.classList.contains('win')).toBe(true);
  });

  test('sets id from config', () => {
    const el = renderWindow(baseConfig({ id: 'my-win' }), baseState());
    expect(el.id).toBe('my-win');
  });

  test('adds "hidden" class when isHidden is true', () => {
    const el = renderWindow(baseConfig(), baseState({ isHidden: true }));
    expect(el.classList.contains('hidden')).toBe(true);
  });

  test('does not add "hidden" class when isHidden is false', () => {
    const el = renderWindow(baseConfig(), baseState({ isHidden: false }));
    expect(el.classList.contains('hidden')).toBe(false);
  });

  test('adds "minimized" class when isMinimized is true', () => {
    const el = renderWindow(baseConfig(), baseState({ isMinimized: true }));
    expect(el.classList.contains('minimized')).toBe(true);
  });

  test('applies position and size styles', () => {
    const el = renderWindow(
      baseConfig(),
      baseState({ position: { x: 50, y: 75 }, size: { width: 500, height: 400 } })
    );
    expect(el.style.left).toBe('50px');
    expect(el.style.top).toBe('75px');
    expect(el.style.width).toBe('500px');
  });

  test('applies zIndex style', () => {
    const el = renderWindow(baseConfig(), baseState({ zIndex: 42 }));
    expect(el.style.zIndex).toBe('42');
  });

  test('uses default minSize when config.minSize is not set', () => {
    const el = renderWindow(baseConfig(), baseState());
    expect(el.style.minWidth).toBe('280px');
    expect(el.style.minHeight).toBe('120px');
  });

  test('uses custom minSize when provided', () => {
    const el = renderWindow(baseConfig({ minSize: { width: 400, height: 200 } }), baseState());
    expect(el.style.minWidth).toBe('400px');
    expect(el.style.minHeight).toBe('200px');
  });

  test('renders a title bar child with class "win-bar"', () => {
    const el = renderWindow(baseConfig(), baseState());
    const bar = el.querySelector('.win-bar');
    expect(bar).not.toBeNull();
  });

  test('title bar has data-win set to config.id', () => {
    const el = renderWindow(baseConfig({ id: 'abc' }), baseState());
    const bar = el.querySelector('.win-bar') as HTMLElement;
    expect(bar.dataset.win).toBe('abc');
  });

  test('title text is uppercased', () => {
    const el = renderWindow(baseConfig({ title: 'hello world' }), baseState());
    const label = el.querySelector('.win-title span:last-child') as HTMLElement;
    expect(label.textContent).toBe('HELLO WORLD');
  });

  test('accent color is applied to the dot', () => {
    const el = renderWindow(baseConfig({ accentColor: 'red' }), baseState());
    const dot = el.querySelector('.win-title-dot') as HTMLElement;
    expect(dot.style.background).toBe('red');
  });

  test('dot has no background when accentColor is not set', () => {
    const el = renderWindow(baseConfig(), baseState());
    const dot = el.querySelector('.win-title-dot') as HTMLElement;
    expect(dot.style.background).toBe('');
  });

  test('renders minimize and close buttons', () => {
    const el = renderWindow(baseConfig({ id: 'w1' }), baseState());
    const minBtn = el.querySelector('[data-action="min"]') as HTMLElement;
    const closeBtn = el.querySelector('[data-action="close"]') as HTMLElement;
    expect(minBtn).not.toBeNull();
    expect(closeBtn).not.toBeNull();
    expect(minBtn.dataset.win).toBe('w1');
    expect(closeBtn.dataset.win).toBe('w1');
    expect(minBtn.textContent).toBe('–');
    expect(closeBtn.textContent).toBe('×');
  });

  test('renders body with string HTML content', () => {
    const el = renderWindow(baseConfig({ content: '<p>Hi</p>' }), baseState());
    const body = el.querySelector('.win-body') as HTMLElement;
    expect(body.innerHTML).toBe('<p>Hi</p>');
  });

  test('renders body using content function', () => {
    const span = document.createElement('span');
    span.textContent = 'Dynamic';
    const el = renderWindow(baseConfig({ content: () => span }), baseState());
    const body = el.querySelector('.win-body') as HTMLElement;
    expect(body.querySelector('span')?.textContent).toBe('Dynamic');
  });
});

describe('updateWindowDOM', () => {
  const makeInstance = (
    stateOverrides: Partial<WindowState> = {},
    configOverrides: Partial<WindowConfig> = {}
  ): WindowInstance => {
    const config = baseConfig(configOverrides);
    const state = baseState(stateOverrides);
    const element = renderWindow(config, state);
    return { element, state, config };
  };

  test('toggles "hidden" class on/off', () => {
    const inst = makeInstance({ isHidden: false });
    inst.state.isHidden = true;
    updateWindowDOM(inst);
    expect(inst.element.classList.contains('hidden')).toBe(true);

    inst.state.isHidden = false;
    updateWindowDOM(inst);
    expect(inst.element.classList.contains('hidden')).toBe(false);
  });

  test('toggles "minimized" class on/off', () => {
    const inst = makeInstance({ isMinimized: false });
    inst.state.isMinimized = true;
    updateWindowDOM(inst);
    expect(inst.element.classList.contains('minimized')).toBe(true);
  });

  test('updates zIndex', () => {
    const inst = makeInstance({ zIndex: 1 });
    inst.state.zIndex = 99;
    updateWindowDOM(inst);
    expect(inst.element.style.zIndex).toBe('99');
  });

  test('updates position (left/top)', () => {
    const inst = makeInstance({ position: { x: 0, y: 0 } });
    inst.state.position = { x: 123, y: 456 };
    updateWindowDOM(inst);
    expect(inst.element.style.left).toBe('123px');
    expect(inst.element.style.top).toBe('456px');
  });
});
