export class ShopAudio {
  constructor() { this.enabled = true; this.context = null; this.loops = []; }
  async start(enabled = true) {
    this.enabled = enabled;
    try {
      if (!this.context) {
        this.context = new (window.AudioContext || window.webkitAudioContext)();
        const c = this.context;
        this.master = c.createGain(); this.master.gain.value = enabled ? .38 : 0;
        const compressor = c.createDynamicsCompressor(); compressor.threshold.value = -16; compressor.ratio.value = 6;
        this.master.connect(compressor); compressor.connect(c.destination);
        this.noise = c.createBuffer(1, c.sampleRate * 4, c.sampleRate);
        const data = this.noise.getChannelData(0);
        for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
        const rain = c.createBufferSource(); rain.buffer = this.noise; rain.loop = true;
        const filter = c.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.value = 1600;
        this.rainGain = c.createGain(); this.rainGain.gain.value = .25;
        rain.connect(filter); filter.connect(this.rainGain); this.rainGain.connect(this.master); rain.start();
        for (const frequency of [60, 120]) {
          const o = c.createOscillator(), g = c.createGain(); o.frequency.value = frequency; g.gain.value = frequency === 60 ? .035 : .012;
          o.connect(g); g.connect(this.master); o.start(); this.loops.push(o);
        }
        const low = c.createOscillator(); low.frequency.value = 43;
        this.drone = c.createGain(); this.drone.gain.value = .015; low.connect(this.drone); this.drone.connect(this.master); low.start();
      }
      await this.context.resume();
      this.master.gain.setTargetAtTime(this.enabled ? .38 : 0, this.context.currentTime, .2);
    } catch { this.enabled = false; }
  }
  pause() { this.context?.suspend().catch(() => {}); }
  update(back, tension) {
    if (!this.context) return;
    const t = this.context.currentTime;
    this.rainGain.gain.setTargetAtTime(back ? .075 : .22, t, .6);
    this.drone.gain.setTargetAtTime(.014 + tension * .025, t, 1);
  }
  tone(frequency, seconds, gain, pan = 0, delay = 0, type = 'sine') {
    if (!this.context || !this.enabled || this.context.state !== 'running') return;
    const c = this.context, t = c.currentTime + delay;
    const o = c.createOscillator(), g = c.createGain(), p = c.createStereoPanner();
    o.type = type; o.frequency.value = frequency; p.pan.value = pan;
    g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(gain, t + .008); g.gain.exponentialRampToValueAtTime(.0001, t + seconds);
    o.connect(g); g.connect(p); p.connect(this.master); o.start(t); o.stop(t + seconds);
    o.onended = () => { o.disconnect(); g.disconnect(); p.disconnect(); };
  }
  noiseBurst(seconds, gain, frequency = 800, pan = 0) {
    if (!this.context || !this.enabled || this.context.state !== 'running') return;
    const c = this.context, t = c.currentTime, source = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain(), p = c.createStereoPanner();
    source.buffer = this.noise; f.type = 'bandpass'; f.frequency.value = frequency; f.Q.value = .6; p.pan.value = pan;
    g.gain.setValueAtTime(.0001, t); g.gain.linearRampToValueAtTime(gain, t + .04); g.gain.exponentialRampToValueAtTime(.0001, t + seconds);
    source.connect(f); f.connect(g); g.connect(p); p.connect(this.master); source.start(t, Math.random()); source.stop(t + seconds);
    source.onended = () => { source.disconnect(); f.disconnect(); g.disconnect(); p.disconnect(); };
  }
  bell() { [1800, 2750, 4100].forEach((f, i) => this.tone(f, 2.4 - i * .3, .11 / (i + 1), -.35, i * .012)); }
  footstep() { this.noiseBurst(.13, .12, 140); this.tone(75, .1, .07); }
  paper() { this.noiseBurst(.5, .17, 1700); }
  water() { this.noiseBurst(1.5, .22, 700); }
  ring() { this.tone(660, .45, .09, .65); this.tone(880, .45, .04, .65, .08); }
  whisper() { this.noiseBurst(3.6, .22, 1800, -.55); this.tone(185, 3, .025, .55); }
  knock() { this.tone(170, .2, .15, -.55); this.tone(135, .2, .13, -.55, .35); }
}
