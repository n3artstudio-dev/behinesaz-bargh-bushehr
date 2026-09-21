/* Procedural WebAudio soundscape — no external assets required */

class AudioSys {
  ctx: AudioContext | null = null;
  master!: GainNode;
  sfxGain!: GainNode;
  musicGain!: GainNode;
  ambGain!: GainNode;
  started = false;
  seaGain?: GainNode;
  windGain?: GainNode;
  musicTimer?: number;
  gullTimer?: number;
  lastStep = 0;

  init() {
    if (this.started) return;
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.9;
    this.master.connect(this.ctx.destination);
    this.sfxGain = this.ctx.createGain();
    this.musicGain = this.ctx.createGain();
    this.ambGain = this.ctx.createGain();
    this.sfxGain.connect(this.master);
    this.musicGain.connect(this.master);
    this.ambGain.connect(this.master);
    this.musicGain.gain.value = 0.22;
    this.ambGain.gain.value = 0.7;
    this.started = true;
    this.startAmbience();
    this.startMusic();
  }

  resume() {
    this.ctx?.resume();
  }

  setEnabled(music: boolean, sfx: boolean) {
    if (!this.ctx) return;
    this.musicGain.gain.setTargetAtTime(music ? 0.22 : 0, this.ctx.currentTime, 0.2);
    this.sfxGain.gain.setTargetAtTime(sfx ? 1 : 0, this.ctx.currentTime, 0.1);
    this.ambGain.gain.setTargetAtTime(sfx ? 0.7 : 0, this.ctx.currentTime, 0.2);
  }

  private noiseBuffer(seconds = 2) {
    const ctx = this.ctx!;
    const buf = ctx.createBuffer(1, ctx.sampleRate * seconds, ctx.sampleRate);
    const d = buf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < d.length; i++) {
      const w = Math.random() * 2 - 1;
      last = (last + 0.02 * w) / 1.02; // brownish
      d[i] = last * 3.5;
    }
    return buf;
  }

  private startAmbience() {
    const ctx = this.ctx!;
    // Sea waves: brown noise through LP filter with slow LFO
    const sea = ctx.createBufferSource();
    sea.buffer = this.noiseBuffer(4);
    sea.loop = true;
    const seaF = ctx.createBiquadFilter();
    seaF.type = "lowpass";
    seaF.frequency.value = 500;
    this.seaGain = ctx.createGain();
    this.seaGain.gain.value = 0.35;
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.12;
    const lfoG = ctx.createGain();
    lfoG.gain.value = 0.18;
    lfo.connect(lfoG).connect(this.seaGain.gain);
    sea.connect(seaF).connect(this.seaGain).connect(this.ambGain);
    sea.start();
    lfo.start();

    // Wind: filtered noise, bandpass sweeping
    const wind = ctx.createBufferSource();
    wind.buffer = this.noiseBuffer(3);
    wind.loop = true;
    const windF = ctx.createBiquadFilter();
    windF.type = "bandpass";
    windF.frequency.value = 350;
    windF.Q.value = 0.6;
    this.windGain = ctx.createGain();
    this.windGain.gain.value = 0.09;
    const wl = ctx.createOscillator();
    wl.frequency.value = 0.07;
    const wlg = ctx.createGain();
    wlg.gain.value = 150;
    wl.connect(wlg).connect(windF.frequency);
    wind.connect(windF).connect(this.windGain).connect(this.ambGain);
    wind.start();
    wl.start();

    // Gulls occasionally
    const gull = () => {
      this.gull();
      this.gullTimer = window.setTimeout(gull, 4000 + Math.random() * 9000);
    };
    this.gullTimer = window.setTimeout(gull, 2500);
  }

  setSeaDistance(d: number) {
    if (!this.ctx || !this.seaGain) return;
    const g = Math.max(0.08, Math.min(0.45, 0.45 - d * 0.004));
    this.seaGain.gain.setTargetAtTime(g, this.ctx.currentTime, 0.5);
  }

  private gull() {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const t = ctx.currentTime;
    const o = ctx.createOscillator();
    o.type = "sawtooth";
    const g = ctx.createGain();
    const f = ctx.createBiquadFilter();
    f.type = "lowpass";
    f.frequency.value = 2200;
    o.frequency.setValueAtTime(900, t);
    o.frequency.linearRampToValueAtTime(1400, t + 0.12);
    o.frequency.linearRampToValueAtTime(1000, t + 0.35);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.035, t + 0.05);
    g.gain.linearRampToValueAtTime(0, t + 0.4);
    o.connect(f).connect(g).connect(this.ambGain);
    o.start(t);
    o.stop(t + 0.45);
  }

  private tone(freq: number, dur: number, type: OscillatorType = "sine", vol = 0.2, when = 0, slideTo?: number) {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const t = ctx.currentTime + when;
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(this.sfxGain);
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  click() {
    this.tone(880, 0.07, "square", 0.06);
    this.tone(1320, 0.05, "sine", 0.05, 0.03);
  }
  open() {
    this.tone(520, 0.12, "triangle", 0.1);
    this.tone(780, 0.14, "triangle", 0.1, 0.06);
  }
  close() {
    this.tone(700, 0.1, "triangle", 0.08);
    this.tone(460, 0.12, "triangle", 0.08, 0.05);
  }
  coin() {
    // جرنگ جرنگ شاد جایزه — سه نت بالارونده + یک زنگ
    this.tone(1318, 0.07, "triangle", 0.09);
    this.tone(1760, 0.08, "triangle", 0.09, 0.05);
    this.tone(2349, 0.18, "triangle", 0.1, 0.1);
    this.tone(2637, 0.06, "sine", 0.06, 0.1);
  }
  reward() {
    this.coin();
    this.tone(3136, 0.3, "sine", 0.08, 0.16);
  }
  jump() {
    this.tone(300, 0.18, "sine", 0.12, 0, 700);
  }
  scan() {
    this.tone(400, 0.5, "sine", 0.06, 0, 1600);
    this.tone(1200, 0.1, "square", 0.03, 0.45);
  }
  zap() {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const t = ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer(0.3);
    const f = ctx.createBiquadFilter();
    f.type = "highpass";
    f.frequency.value = 1800;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.25, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.25);
    src.connect(f).connect(g).connect(this.sfxGain);
    src.start(t);
    this.tone(120, 0.2, "sawtooth", 0.08, 0, 60);
  }
  switchClick() {
    this.tone(2400, 0.03, "square", 0.08);
    this.tone(1200, 0.05, "square", 0.06, 0.04);
  }
  door() {
    this.tone(90, 0.6, "sawtooth", 0.06, 0, 70);
    this.tone(180, 0.25, "triangle", 0.05, 0.2);
  }
  success() {
    const seq = [523, 659, 784, 1047];
    seq.forEach((f, i) => this.tone(f, 0.35, "triangle", 0.14, i * 0.11));
    this.tone(1318, 0.7, "sine", 0.12, 0.45);
  }
  fanfare() {
    const seq = [392, 523, 659, 784, 1047, 1318];
    seq.forEach((f, i) => {
      this.tone(f, 0.5, "triangle", 0.14, i * 0.1);
      this.tone(f * 1.5, 0.3, "sine", 0.05, i * 0.1 + 0.05);
    });
    this.tone(1568, 1.2, "sine", 0.12, 0.65);
  }
  warn() {
    this.tone(330, 0.2, "square", 0.06);
    this.tone(262, 0.3, "square", 0.06, 0.2);
  }
  footstep(running: boolean) {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    if (now - this.lastStep < (running ? 0.26 : 0.42)) return;
    this.lastStep = now;
    const ctx = this.ctx;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer(0.12);
    const f = ctx.createBiquadFilter();
    f.type = "lowpass";
    f.frequency.value = 700 + Math.random() * 300;
    const g = ctx.createGain();
    g.gain.setValueAtTime(running ? 0.12 : 0.07, now);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.1);
    src.connect(f).connect(g).connect(this.sfxGain);
    src.start(now);
  }

  /* Subtle southern-Iranian flavoured loop: Bayat-e-Esfahan-like scale over a soft 6/8 pulse */
  private startMusic() {
    const ctx = this.ctx!;
    const scale = [0, 2, 3, 5, 7, 8, 10, 12, 14, 15];
    const base = 220;
    let step = 0;
    const pattern = [0, 4, 7, 4, 2, 5, 7, 9, 7, 5, 4, 2];
    const beat = 0.42;
    const schedule = () => {
      if (!this.ctx) return;
      const t = ctx.currentTime + 0.05;
      const idx = pattern[step % pattern.length];
      const semis = scale[idx % scale.length] + (step % 24 >= 12 ? 5 : 0);
      const freq = base * Math.pow(2, semis / 12);
      // plucked santur-like note
      const o = ctx.createOscillator();
      o.type = "triangle";
      o.frequency.value = freq;
      const o2 = ctx.createOscillator();
      o2.type = "sine";
      o2.frequency.value = freq * 2.01;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.16, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0005, t + 0.9);
      o.connect(g);
      o2.connect(g);
      g.connect(this.musicGain);
      o.start(t);
      o2.start(t);
      o.stop(t + 1);
      o2.stop(t + 1);
      // drone
      if (step % 12 === 0) {
        const d = ctx.createOscillator();
        d.type = "sine";
        d.frequency.value = base / 2;
        const dg = ctx.createGain();
        dg.gain.setValueAtTime(0, t);
        dg.gain.linearRampToValueAtTime(0.09, t + 0.5);
        dg.gain.linearRampToValueAtTime(0, t + beat * 12);
        d.connect(dg).connect(this.musicGain);
        d.start(t);
        d.stop(t + beat * 12 + 0.1);
      }
      // soft tombak pulse (6/8): accents on 1 and 4
      if (step % 3 === 0) {
        const k = ctx.createOscillator();
        k.type = "sine";
        k.frequency.setValueAtTime(step % 6 === 0 ? 150 : 220, t);
        k.frequency.exponentialRampToValueAtTime(60, t + 0.12);
        const kg = ctx.createGain();
        kg.gain.setValueAtTime(step % 6 === 0 ? 0.25 : 0.12, t);
        kg.gain.exponentialRampToValueAtTime(0.0005, t + 0.15);
        k.connect(kg).connect(this.musicGain);
        k.start(t);
        k.stop(t + 0.2);
      }
      step++;
      this.musicTimer = window.setTimeout(schedule, beat * 1000);
    };
    schedule();
  }
}

export const audio = new AudioSys();
