import { WindowManager } from '../../engine';
import { login, type LoginInput } from '../../http/auth';
import html from './index.html';

export function registerLogin(wm: WindowManager): void {
  const W = 380;
  const H = 520;
  const cx = Math.round((window.innerWidth - W) / 2);
  const cy = Math.round((window.innerHeight - H) / 2);

  wm.register({
    id: 'win-register',
    title: 'Login',
    accentColor: 'var(--green)',
    content: html,
    initialPosition: { x: cx, y: cy },
    initialSize: { width: W, height: H },
  });

  initLoginLogic();
}

function initLoginLogic(): void {
  const root = document.querySelector('.login')!;

  const els = {
    form: root.querySelector('.login-form') as HTMLFormElement,
    email: root.querySelector('#email') as HTMLInputElement,
    password: root.querySelector('#password') as HTMLInputElement,
    togglePw: root.querySelector('.register-toggle-pw') as HTMLButtonElement,
    button: root.querySelector('x-button'),
    errors: {
      email: root.querySelector('[data-field="email"]') as HTMLElement,
      password: root.querySelector('[data-field="password"]') as HTMLElement,
    },
  };

  function setupToggle(btn: HTMLButtonElement, input: HTMLInputElement): void {
    btn.addEventListener('click', () => {
      const isPassword = input.type === 'password';
      input.type = isPassword ? 'text' : 'password';
      btn.textContent = isPassword ? 'Hide' : 'Show';
    });
  }

  setupToggle(els.togglePw, els.password);

  function setErrors(errs: Record<string, string>) {
    (Object.keys(errs) as Array<keyof typeof els.errors>).forEach((key) => {
      if (els.errors[key]) els.errors[key].textContent = errs[key] ?? null;
    });
  }

  els.form.addEventListener('submit', async (e) => {
    e.preventDefault();

    els.button.setLoading(true);

    try {
      await login(<LoginInput>{
        email: els.email.value,
        password: els.password.value,
      });

      // TODO: close window, open tasks
    } catch (err) {
      const errs = (err as { response: { data: { data: Record<string, string> } } }).response.data
        .data;
      setErrors(errs);
    } finally {
      setTimeout(() => els.button.setLoading(false), 500);
    }
  });
}
