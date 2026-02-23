import type { WindowConfig, WindowState, WindowInstance } from './types.ts';

/**
 * entry point for window dom generation.
 * constructs the root container and orchestrates partial renders for sub-components.
 */
export function renderWindow(config: WindowConfig, state: WindowState): HTMLElement {
  const win = document.createElement('div');
  win.className =
    'win' + (state.isHidden ? ' hidden' : '') + (state.isMinimized ? ' minimized' : '');
  win.id = config.id;
  win.style.cssText = buildWindowStyles(state, config);

  win.appendChild(renderTitleBar(config));
  win.appendChild(renderBody(config));

  return win;
}

// serializes state and configuration into a css string.
function buildWindowStyles(state: WindowState, config: WindowConfig): string {
  const { position, size, zIndex } = state;
  const min = config.minSize ?? { width: 280, height: 120 };

  return [
    `left:${position.x}px`,
    `top:${position.y}px`,
    `width:${size.width}px`,
    `min-width:${min.width}px`,
    `min-height:${min.height}px`,
    `z-index:${zIndex}`,
  ].join(';');
}

function renderTitleBar(config: WindowConfig): HTMLElement {
  const bar = document.createElement('div');
  bar.className = 'win-bar';
  bar.dataset.win = config.id;

  const title = document.createElement('div');
  title.className = 'win-title';

  const dot = document.createElement('span');
  dot.className = 'win-title-dot';
  if (config.accentColor) dot.style.background = config.accentColor;

  const label = document.createElement('span');
  label.textContent = config.title.toUpperCase();

  title.appendChild(dot);
  title.appendChild(label);

  const actions = document.createElement('div');
  actions.className = 'win-actions';
  actions.appendChild(createWinButton('–', 'min', config.id));
  actions.appendChild(createWinButton('×', 'close', config.id));

  bar.appendChild(title);
  bar.appendChild(actions);
  return bar;
}

/**
 * factory for window controls.
 * uses data attributes for action delegation in the manager class.
 */
function createWinButton(label: string, action: 'min' | 'close', winId: string): HTMLElement {
  const btn = document.createElement('button');
  btn.className = 'win-btn';
  btn.dataset.action = action;
  btn.dataset.win = winId;
  btn.textContent = label;
  return btn;
}

function renderBody(config: WindowConfig): HTMLElement {
  const body = document.createElement('div');
  body.className = 'win-body';

  if (typeof config.content === 'string') {
    body.innerHTML = config.content;
  } else {
    body.appendChild(config.content());
  }

  return body;
}

// updates existing dom nodes to reflect reactive changes in the window state object.
export function updateWindowDOM(instance: WindowInstance): void {
  const { element, state } = instance;
  element.classList.toggle('hidden', state.isHidden);
  element.classList.toggle('minimized', state.isMinimized);
  element.style.zIndex = String(state.zIndex);
  element.style.left = state.position.x + 'px';
  element.style.top = state.position.y + 'px';
}
