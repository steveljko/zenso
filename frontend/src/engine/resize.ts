import type { WindowInstance } from './types';

// resize state persistence to manage start coordinates, dimensions, and active status.
interface ResizeState {
  active: boolean;
  startX: number;
  startY: number;
  startW: number;
  startH: number;
}

export class ResizeHandler {
  private resize: ResizeState = {
    active: false,
    startX: 0,
    startY: 0,
    startW: 0,
    startH: 0,
  };
  private onResize: (size: { width: number; height: number }) => void;

  constructor(
    private instance: WindowInstance,
    onResize: (size: { width: number; height: number }) => void
  ) {
    this.onResize = onResize;
    this.bindEvents();
  }

  /**
   * initializes listeners, move/end events are bound to document to
   * maintain tracking if the pointer leaves the resize handle area.
   */
  private bindEvents(): void {
    const handle = this.instance.element.querySelector('.win-resize') as HTMLElement;
    if (!handle) return;
    handle.addEventListener('mousedown', this.onMouseDown);
    document.addEventListener('mousemove', this.onMouseMove);
    document.addEventListener('mouseup', this.onEnd);
    handle.addEventListener('touchstart', this.onTouchStart, { passive: false });
    document.addEventListener('touchmove', this.onTouchMove, { passive: false });
    document.addEventListener('touchend', this.onEnd);
  }

  // captures the initial pointer position and element dimensions, disables global text selection.
  private startResize(clientX: number, clientY: number): void {
    this.resize = {
      active: true,
      startX: clientX,
      startY: clientY,
      startW: this.instance.element.offsetWidth,
      startH: this.instance.element.offsetHeight,
    };
    document.body.style.userSelect = 'none';
  }

  // calculates new dimensions with minimum size clamping.
  private applyResize(clientX: number, clientY: number): void {
    if (!this.resize.active) return;
    const min = this.instance.config.minSize ?? { width: 240, height: 100 };
    const width = Math.max(min.width, this.resize.startW + (clientX - this.resize.startX));
    const height = Math.max(min.height, this.resize.startH + (clientY - this.resize.startY));
    this.onResize({ width, height });
  }

  private onMouseDown = (e: MouseEvent): void => {
    this.startResize(e.clientX, e.clientY);
    e.stopPropagation();
  };

  private onMouseMove = (e: MouseEvent): void => {
    this.applyResize(e.clientX, e.clientY);
  };

  private onTouchStart = (e: TouchEvent): void => {
    const t = e.touches[0]!;
    this.startResize(t.clientX, t.clientY);
    e.preventDefault();
  };

  private onTouchMove = (e: TouchEvent): void => {
    if (!this.resize.active) return;
    const t = e.touches[0]!;
    this.applyResize(t.clientX, t.clientY);
    e.preventDefault();
  };

  private onEnd = (): void => {
    this.resize.active = false;
    document.body.style.userSelect = '';
  };

  public destroy(): void {
    const handle = this.instance.element.querySelector('.win-resize') as HTMLElement;
    handle?.removeEventListener('mousedown', this.onMouseDown);
    handle?.removeEventListener('touchstart', this.onTouchStart);
    document.removeEventListener('mousemove', this.onMouseMove);
    document.removeEventListener('mouseup', this.onEnd);
    document.removeEventListener('touchmove', this.onTouchMove);
    document.removeEventListener('touchend', this.onEnd);
  }
}
