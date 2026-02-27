class XButton extends HTMLElement {
  static get observedAttributes(): string[] {
    return ['loading', 'full'];
  }

  private _label: string = '';
  private _btn: HTMLButtonElement | null = null;

  connectedCallback(): void {
    this._label = this.textContent?.trim() ?? '';
    this._render();
  }

  attributeChangedCallback(): void {
    if (this._btn) this._render();
  }

  private _render(): void {
    this.innerHTML = `
      <button class="button">
        <span class="label">${this._label}</span>
        <span class="spinner"></span>
      </button>
    `;
    this._btn = this.querySelector<HTMLButtonElement>('button');
    this._btn?.addEventListener('click', (e: MouseEvent) => {
      if (!this.hasAttribute('loading')) {
        this.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      }
      e.stopPropagation();
    });
  }

  setLoading(on: boolean): void {
    if (on) this.setAttribute('loading', '');
    else this.removeAttribute('loading');
  }
}

export default XButton;
