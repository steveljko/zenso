import type { WindowManager } from '../../engine';
import html from './index.html';

export function registerTestWindow(wm: WindowManager): void {
  wm.register({
    id: 'win-test',
    title: 'Example',
    accentColor: '#cf000f',
    content: html,
  });
}
