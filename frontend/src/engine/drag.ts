import type { WindowInstance } from './types';

// drag state persistence to manage movement offsets and active status.
interface DragState {
  active: boolean;
  offsetX: number;
  offsetY: number;
}

export class DragHandler {
  private drag: DragState = {
    active: false,
    offsetX: 0,
    offsetY: 0,
  };
  private onMove: (position: { x: number; y: number }) => void;
  private container: HTMLElement;

  constructor(
    private instance: WindowInstance,
    onMove: (position: { x: number; y: number }) => void,
    container: HTMLElement = document.body
  ) {
    this.onMove = onMove;
    this.container = container;
    this.bindEvents();
  }

  /**
   * initializes listeners, move/end events are bound to document to
   * maintain tracking if the pointer leaves the header area.
   */
  private bindEvents(): void {
    const bar = this.instance.element.querySelector('.win-bar') as HTMLElement;
    if (!bar) return;

    bar.addEventListener('mousedown', this.onMouseDown);
    document.addEventListener('mousemove', this.onMouseMove);
    document.addEventListener('mouseup', this.onEnd);

    bar.addEventListener('touchstart', this.onTouchStart, { passive: false });
    document.addEventListener('touchmove', this.onTouchMove, { passive: false });
    document.addEventListener('touchend', this.onEnd);
  }

  // sets the initial grab point and disables global text selection.
  private startDrag(clientX: number, clientY: number): void {
    const rect = this.instance.element.getBoundingClientRect();
    this.drag = { active: true, offsetX: clientX - rect.left, offsetY: clientY - rect.top };
    document.body.style.userSelect = 'none';
  }

  // calculates new coordinates with viewport boundary clamping.
  private applyMove(clientX: number, clientY: number): void {
    if (!this.drag.active) return;
    const containerH = this.container.clientHeight;
    const winW = this.instance.element.offsetWidth;
    const winH = this.instance.element.offsetHeight;

    const x = Math.max(0, Math.min(clientX - this.drag.offsetX, window.innerWidth - winW));
    const y = Math.max(0, Math.min(clientY - this.drag.offsetY, containerH - winH));
    this.onMove({ x, y });
  }

  private onMouseDown = (e: MouseEvent): void => {
    if ((e.target as HTMLElement).closest('.win-actions')) return;
    if ((e.target as HTMLElement).closest('button')) return;
    this.startDrag(e.clientX, e.clientY);
  };

  private onMouseMove = (e: MouseEvent): void => {
    this.applyMove(e.clientX, e.clientY);
  };

  private onTouchStart = (e: TouchEvent): void => {
    if ((e.target as HTMLElement).closest('.win-actions')) return;
    if ((e.target as HTMLElement).closest('button')) return;
    const t = e.touches[0]!;
    this.startDrag(t.clientX, t.clientY);
    e.preventDefault();
  };

  private onTouchMove = (e: TouchEvent): void => {
    if (!this.drag.active) return;
    const t = e.touches[0]!;
    this.applyMove(t.clientX, t.clientY);
    e.preventDefault();
  };

  private onEnd = (): void => {
    this.drag.active = false;
    document.body.style.userSelect = '';
  };

  public destroy(): void {
    const bar = this.instance.element.querySelector('.win-bar') as HTMLElement;
    bar?.removeEventListener('mousedown', this.onMouseDown);
    bar?.removeEventListener('touchstart', this.onTouchStart);

    document.removeEventListener('mousemove', this.onMouseMove);
    document.removeEventListener('mouseup', this.onEnd);
    document.removeEventListener('touchmove', this.onTouchMove);
    document.removeEventListener('touchend', this.onEnd);
  }
}
