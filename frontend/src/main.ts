import { WindowManager } from './engine';
import { registerTasks } from './windows/tasks';
import { createState } from './state';

import './styles/main.css';

if (window.matchMedia('(prefers-color-scheme: light)').matches) {
  document.documentElement.classList.add('light');
}

window.matchMedia('(prefers-color-scheme: light)').addEventListener('change', (e) => {
  document.documentElement.classList.toggle('light', e.matches);
});

const wm = new WindowManager({
  container: document.getElementById('surface') ?? document.body,
});

const state = createState();

registerTasks(wm, state);
