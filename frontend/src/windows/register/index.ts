import type { WindowManager } from '../../engine';
import html from './index.html';
import { register, type RegisterInput } from '../../http/auth';

export function registerRegister(wm: WindowManager): void {
  const W = 380;
  const H = 520;
  const cx = Math.round((window.innerWidth - W) / 2);
  const cy = Math.round((window.innerHeight - H) / 2);

  wm.register({
    id: 'register',
    title: 'Create Your Account',
    accentColor: 'var(--blue)',
    content: html,
    initialPosition: { x: cx, y: cy },
    initialSize: { width: W, height: H },
    hidden: true,
  });

  initRegisterLogic();
}

function initRegisterLogic(): void {
  const root = document.querySelector('.register')!;

  const els = {
    form: root.querySelector('.register-form') as HTMLFormElement,
    name: root.querySelector('#name') as HTMLInputElement,
    email: root.querySelector('#email') as HTMLInputElement,
    password: root.querySelector('#password') as HTMLInputElement,
    togglePw: root.querySelector('.register-toggle-pw') as HTMLButtonElement,
    errors: {
      name: root.querySelector('[data-field="name"]') as HTMLElement,
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

  (Object.keys(els.errors) as Array<keyof typeof els.errors>).forEach((key) => {
    const input = els[key as keyof typeof els] as HTMLInputElement | undefined;
    if (input instanceof HTMLInputElement) {
      input.addEventListener('input', () => {
        els.errors[key].textContent = '';
        input.classList.remove('input-error');
      });
    }
  });

  function clearErrors() {
    (Object.keys(els.errors) as Array<keyof typeof els.errors>).forEach((k) => {
      els.errors[k].textContent = '';
    });
  }

  function setErrors(errs: Record<string, string>) {
    (Object.keys(errs) as Array<keyof typeof els.errors>).forEach((key) => {
      if (els.errors[key]) els.errors[key].textContent = errs[key] ?? null;
    });
  }

  els.form.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearErrors();

    const btn = document.querySelector('x-button');

    btn.setLoading(true);

    try {
      await register(<RegisterInput>{
        name: els.name.value,
        email: els.email.value,
        password: els.password.value,
      });
    } catch (err) {
      const errs = (err as { response: { data: { data: Record<string, string> } } }).response.data
        .data;
      setErrors(errs);
    } finally {
      setTimeout(() => btn.setLoading(false), 500);
    }
  });
}
