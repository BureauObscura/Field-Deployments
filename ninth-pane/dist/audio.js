const SCENES = {
  exterior: [1200, 0.18, 0.025], gate: [1100, 0.16, 0.03],
  nave: [850, 0.10, 0.055], potting: [650, 0.075, 0.045],
  boiler: [420, 0.035, 0.11], passage: [500, 0.045, 0.07],
  office: [600, 0.045, 0.035],
};

/** Optional procedural ambience. Audio is created only by an explicit toggle. */
export class Atmosphere {
  constructor() {
    this.enabled = false;
    this.context = null;
    this.scene = 'exterior';
    this.sources = [];
    this.nodes = [];
    this.voices = new Set();
    this.destroyed = false;
    this.revision = 0;
    this.document = globalThis.document;
    this.onVisibility = () => { this._sync().catch(() => {}); };
    this.document?.addEventListener('visibilitychange', this.onVisibility);
  }

  _init() {
    const AudioContext = globalThis.AudioContext || globalThis.webkitAudioContext;
    if (!AudioContext) return false;
    const ctx = this.context = new AudioContext();
    this.master = ctx.createGain();
    this.master.gain.value = 0.18;
    this.master.connect(ctx.destination);
    this.filter = ctx.createBiquadFilter();
    this.filter.type = 'lowpass';
    this.filter.Q.value = 0.2;
    this.rain = ctx.createGain();
    this.hum = ctx.createGain();
    this.rain.gain.value = this.hum.gain.value = 0;
    this.filter.connect(this.rain).connect(this.master);
    this.hum.connect(this.master);
    this.nodes.push(this.master, this.filter, this.rain, this.hum);
    const buffer = ctx.createBuffer(2, Math.floor(ctx.sampleRate * 6), ctx.sampleRate);
    for (let channel = 0; channel < 2; channel++) {
      const data = buffer.getChannelData(channel);
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    noise.loop = true;
    noise.connect(this.filter);
    this.sources.push(noise);
    for (const frequency of [55, 110]) {
      const oscillator = ctx.createOscillator();
      oscillator.type = 'sine';
      oscillator.frequency.value = frequency;
      oscillator.connect(this.hum);
      this.sources.push(oscillator);
    }
    this.setScene(this.scene);
    this.sources.forEach(source => source.start());
    return true;
  }

  async _sync() {
    const ctx = this.context;
    if (!ctx || ctx.state === 'closed' || this.destroyed) return;
    const shouldPlay = () => this.enabled && !this.document?.hidden && !this.destroyed;
    const playing = shouldPlay();
    await (playing ? ctx.resume() : ctx.suspend());
    if (ctx.state !== 'closed' && playing !== shouldPlay()) {
      await (shouldPlay() ? ctx.resume() : ctx.suspend());
    }
  }

  async toggle() {
    if (this.destroyed) return false;
    const revision = ++this.revision;
    this.enabled = !this.enabled;
    try {
      if (this.enabled && !this.context && !this._init()) this.enabled = false;
      await this._sync();
      if (revision === this.revision && this.enabled && !this.document?.hidden &&
          this.context?.state !== 'running') this.enabled = false;
      return this.enabled;
    } catch {
      this.destroy();
      return false;
    }
  }

  setScene(sceneId) {
    this.scene = sceneId;
    if (!this.context || !this.filter || this.destroyed) return;
    const [cutoff, rain, hum] = SCENES[sceneId] || SCENES.nave;
    const time = this.context.currentTime;
    for (const [parameter, value] of [
      [this.filter.frequency, cutoff], [this.rain.gain, rain], [this.hum.gain, hum],
    ]) {
      parameter.cancelScheduledValues(time);
      parameter.setTargetAtTime(value, time, 0.7);
    }
  }

  cue(kind = 'inspect') {
    const ctx = this.context;
    if (!this.enabled || !ctx || ctx.state !== 'running' || this.document?.hidden ||
        this.destroyed || this.voices.size >= 3) return;
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    const now = ctx.currentTime;
    oscillator.frequency.value = ({ inspect: 660, choice: 330, deduction: 440, ending: 220 })[kind] || 520;
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.035, now + 0.025);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.24);
    oscillator.connect(gain).connect(this.master);
    const voice = { oscillator, gain };
    this.voices.add(voice);
    oscillator.onended = () => {
      oscillator.disconnect();
      gain.disconnect();
      this.voices.delete(voice);
    };
    oscillator.start(now);
    oscillator.stop(now + 0.26);
  }

  destroy() {
    this.destroyed = true;
    this.enabled = false;
    this.document?.removeEventListener('visibilitychange', this.onVisibility);
    for (const source of [...this.sources, ...[...this.voices].map(v => v.oscillator)]) {
      try { source.stop(); source.disconnect(); } catch { /* Already stopped. */ }
    }
    this.voices.forEach(voice => voice.gain.disconnect());
    this.nodes.forEach(node => node.disconnect());
    this.sources = [];
    this.nodes = [];
    this.voices.clear();
    if (this.context?.state !== 'closed') this.context?.close().catch(() => {});
    this.context = null;
  }
}
