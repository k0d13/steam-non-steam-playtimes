class Logger {
  #resetStyle = 'background: transparent;';
  #badgeText: string;

  constructor(badgeText: string) {
    this.#badgeText = badgeText;
  }

  get #badgeStyle() {
    const hash = [...this.#badgeText] //
      .reduce((h, c) => (h << 5) - h + c.charCodeAt(0), 0);
    const hex = (hash & 0xffffff).toString(16).padStart(6, '0');
    const [r, g, b] = hex.match(/.{2}/g)!.map((x) => parseInt(x, 16));
    const luminance = 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
    return `background: #${hex}; color: ${luminance > 128 ? 'black' : 'white'};`;
  }

  #log(log: typeof console.log, ...args: unknown[]) {
    log(`%c ${this.#badgeText} %c`, this.#badgeStyle, this.#resetStyle, ...args);
  }

  debug(...args: unknown[]) {
    this.#log(console.debug, ...args);
  }

  info(...args: unknown[]) {
    this.#log(console.info, ...args);
  }
}

export default new Logger('Non-Steam Playtimes');
