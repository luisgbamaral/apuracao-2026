/** A page that reloads its data on a fixed interval. Subclasses implement load() and render(data). */
export class LivePage {
  #refreshId = 0;

  constructor(intervalMs) {
    this.intervalMs = intervalMs;
  }

  async start() {
    await this.refresh();
    setInterval(() => this.refresh(), this.intervalMs);
    // Browsers throttle timers in background tabs, so catch up as soon as the tab is shown again.
    document.addEventListener('visibilitychange', () => document.hidden || this.refresh());
  }

  async refresh() {
    const refreshId = ++this.#refreshId;
    const data = await this.load();
    // A newer refresh may have started meanwhile; never paint older data over it.
    if (refreshId === this.#refreshId) this.render(data);
  }

  /** Text shared by the status line of every page. */
  get refreshNote() {
    const now = new Date().toLocaleTimeString('pt-BR');
    return `página atualizada às ${now} (a cada ${this.intervalMs / 1000} s)`;
  }
}
