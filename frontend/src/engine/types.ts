export interface WindowInstance {
  config: WindowConfig;
  state: WindowState;
  element: HTMLElement;
}

export interface WindowConfig {
  id: string;
  title: string;
  accentColor?: string;
  initialPosition?: { x: number; y: number };
  initialSize?: { width: number; height: number };
  minSize?: { width: number; height: number };
  resizable?: boolean;
  hidden?: boolean;
  content: string | (() => HTMLElement);
}

export interface WindowState {
  id: string;
  isHidden: boolean;
  isMinimized: boolean;
  zIndex: number;
  position: { x: number; y: number };
  size: { width: number; height: number };
}

export interface WindowManagerOptions {
  container?: HTMLElement;
  zIndexBase?: number;
}
