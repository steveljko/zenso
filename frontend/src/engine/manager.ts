import type { WindowConfig, WindowManagerOptions, WindowState, WindowInstance } from './types';
import { renderWindow, updateWindowDOM } from './renderer';
import { DragHandler } from './drag';

// this class orchestrates the lifecycle, state, and z-index layering of window instances.
export class WindowManager {
  private instances = new Map<string, WindowInstance>();
  private dragHandlers = new Map<string, DragHandler>();

  private zTop: number;
  private container: HTMLElement;

  constructor(private options: WindowManagerOptions = {}) {
    this.container = options.container ?? document.body;
    this.zTop = options.zIndexBase ?? 10;
  }

  public register(config: WindowConfig): WindowInstance {
    config.id = config.id + Math.round(Math.random() * 100);
    if (this.instances.has(config.id)) {
      throw new Error(`Window "${config.id}" is already registered.`);
    }

    const state = this.buildInitialState(config);
    const element = renderWindow(config, state);
    const instance: WindowInstance = { config, state, element };

    this.instances.set(config.id, instance);
    this.container.appendChild(element);
    this.attachBehaviors(instance);

    return instance;
  }

  public unregister(id: string): void {
    const instance = this.get(id);
    this.dragHandlers.get(id)?.destroy();
    this.dragHandlers.delete(id);
    instance.element.remove();
    this.instances.delete(id);
  }

  public minimize(id: string): void {
    const instance = this.get(id);
    instance.state.isMinimized = !instance.state.isMinimized;
    updateWindowDOM(instance);
  }

  public close(id: string): void {
    const instance = this.get(id);
    instance.state.isHidden = true;
    updateWindowDOM(instance);
    this.unregister(id);
  }

  public focus(id: string): void {
    const instance = this.get(id);
    instance.state.zIndex = ++this.zTop;
    instance.element.style.zIndex = String(this.zTop);
  }

  public get(id: string): WindowInstance {
    const instance = this.instances.get(id);
    if (!instance) throw new Error(`Window "${id}" not found.`);
    return instance;
  }

  // constructs the default state object for new instances.
  private buildInitialState(config: WindowConfig): WindowState {
    return {
      id: config.id + Math.random() * 10,
      isHidden: config.hidden ?? false,
      isMinimized: false,
      zIndex: ++this.zTop,
      position: config.initialPosition ?? { x: 80, y: 80 },
      size: config.initialSize ?? { width: 320, height: 0 },
    };
  }

  // binds core interactions including focus, action buttons, and dragging.
  // TODO: add resize interaction
  private attachBehaviors(instance: WindowInstance): void {
    // global focus trigger on interaction
    instance.element.addEventListener('mousedown', () => this.focus(instance.config.id));

    // titlebar button actions
    instance.element.querySelectorAll<HTMLElement>('[data-action]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (btn.dataset.action === 'min') this.minimize(instance.config.id);
        if (btn.dataset.action === 'close') this.close(instance.config.id);
      });
    });

    // drag
    this.dragHandlers.set(
      instance.config.id,
      new DragHandler(
        instance,
        (position) => {
          instance.state.position = position;
          instance.element.style.left = position.x + 'px';
          instance.element.style.top = position.y + 'px';
        },
        this.container
      )
    );
  }
}
