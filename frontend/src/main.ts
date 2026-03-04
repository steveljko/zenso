import { WindowManager } from './engine';
import { registerRegister } from './windows/register';
import { registerLogin } from './windows/login';
import { registerTasks } from './windows/tasks';
import { createState } from './state';
import { auth } from './utils/auth';
import XButton from './components/button';

import './styles/main.css';

if (window.matchMedia('(prefers-color-scheme: light)').matches) {
  document.documentElement.classList.add('light');
}

window.matchMedia('(prefers-color-scheme: light)').addEventListener('change', (e) => {
  document.documentElement.classList.toggle('light', e.matches);
});

async function boot(): Promise<void> {
  const wm = new WindowManager({
    container: document.getElementById('surface') ?? document.body,
  });
  const state = createState();

  registerRegister(wm);
  registerLogin(wm);
  registerTasks(wm, state);

  auth.onChange((user) => {
    if (user) {
      wm.close('login');
      wm.show('tasks');
    } else {
      wm.close('tasks');
      wm.show('login');
    }
  });

  const user = await auth.init();

  if (!user && !auth.isAuthenticated) {
    wm.show('login');
  }
}

await boot();

customElements.define('x-button', XButton);
