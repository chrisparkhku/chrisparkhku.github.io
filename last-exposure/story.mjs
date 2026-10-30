export const DEVELOPMENT_SECONDS = [8, 10, 12, 9];
export class Story {
  constructor() { this.stage = 'collection'; this.print = 0; this.elapsed = 0; this.total = 0; }
  accepts(action) {
    return (action === 'film' && this.stage === 'collection') ||
      (action === 'tray' && ['develop', 'final', 'ready'].includes(this.stage)) ||
      (action === 'bell' && this.stage === 'counter') ||
      (action === 'phone' && this.stage === 'phone') ||
      (action === 'delivery' && this.stage === 'deliver');
  }
  interact(action) {
    if (!this.accepts(action)) return false;
    if (action === 'film') this.stage = 'develop';
    else if (action === 'tray') this.stage = this.stage === 'ready' ? 'inspect' : 'processing';
    else if (action === 'bell') { this.print = 1; this.stage = 'develop'; }
    else if (action === 'phone') { this.print = 2; this.stage = 'develop'; }
    else if (action === 'delivery') { this.print = 3; this.stage = 'final'; }
    this.elapsed = 0;
    return true;
  }
  tick(seconds) {
    const dt = Math.max(0, Math.min(seconds, .25));
    this.elapsed += dt; this.total += dt;
    if (this.stage === 'processing' && this.elapsed >= DEVELOPMENT_SECONDS[this.print]) {
      this.stage = 'ready'; this.elapsed = 0; return 'ready';
    }
    return null;
  }
  lower() {
    if (this.stage !== 'inspect' || this.elapsed < 5) return false;
    this.stage = ['counter', 'phone', 'deliver', 'turn'][this.print]; this.elapsed = 0;
    return true;
  }
  end() { if (this.stage !== 'turn') return false; this.stage = 'ended'; this.elapsed = 0; return true; }
  get progress() { return this.stage === 'processing' ? Math.min(1, this.elapsed / DEVELOPMENT_SECONDS[this.print]) : 0; }
}

export function canStand(x, z, obstacles, radius = .23) {
  if (x < -4.12 || x > 4.12 || z < -6.72 || z > 6.65) return false;
  return !obstacles.some(box => x > box.x0 - radius && x < box.x1 + radius && z > box.z0 - radius && z < box.z1 + radius);
}
