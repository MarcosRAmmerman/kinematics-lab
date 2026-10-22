export type State = { t: number; x: number; v: number; a: number; dv?: number };
export type Mode = 'displacement' | 'velocity' | 'acceleration';
export type Curve = 'sine' | 'linear' | 'quadratic' | 'smooth';
export const DT = 1 / 120;
export const initial = (): State => ({ t: 0, x: 0, v: 0, a: 0 });
export const clamp = (x: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, x));
// Backward differences of a one-pole low-pass position estimate (tau = 60 ms).
// These are causal estimates, not exact derivatives of pointer motion.
export function step(s: State, mode: Mode, command: number, dt = DT): State {
  const t = s.t + dt;
  if (mode === 'acceleration') return { t, x: s.x + s.v * dt + .5 * command * dt * dt, v: s.v + command * dt, a: command };
  if (mode === 'velocity') return { t, x: s.x + command * dt, v: command, a: 0, ...(command !== s.v ? { dv: command - s.v } : {}) };
  const x = s.x + (command - s.x) * (1 - Math.exp(-dt / .06));
  const v = (x - s.x) / dt;
  return { t, x, v, a: (v - s.v) / dt };
}
export function target(t: number, curve: Curve = 'sine'): State {
  const w = 2 * Math.PI / 8;
  if (curve === 'linear') return { t, x: t * .6, v: .6, a: 0 };
  if (curve === 'quadratic') return { t, x: .03 * t * t, v: .06 * t, a: .06 };
  if (curve === 'smooth') { const u = clamp(t / 16, 0, 1); return { t, x: 8 * (3*u*u-2*u*u*u), v: 3*u*(1-u), a: (3-6*u)/16 }; }
  return { t, x: 6*Math.sin(w*t), v: 6*w*Math.cos(w*t), a: -6*w*w*Math.sin(w*t) };
}
export function bikeTarget(t: number): State {
  const commands = [3, 0, -3, 3, -3, 0, 3, 0];
  let x = 0;
  for (let i = 0; i < commands.length; i++) x += commands[i] * clamp(t - i*2, 0, 2);
  return { t, x, v: commands[Math.min(7, Math.floor(t/2))], a: 0 };
}
export class FixedClock {
  private remainder = 0;
  advance(elapsed: number, running: boolean, speed: number, tick: () => void) {
    if (!running) { this.remainder = 0; return; }
    this.remainder += Math.min(elapsed, .1) * speed;
    while (this.remainder + 1e-12 >= DT) { tick(); this.remainder -= DT; }
  }
  reset() { this.remainder = 0; }
}
export function sampleAt(samples: State[], t: number): State {
  if (!samples.length) return initial();
  let lo=0, hi=samples.length-1;
  while(lo<hi) { const mid=Math.floor((lo+hi)/2); if(samples[mid].t<t) lo=mid+1; else hi=mid; }
  const b=samples[lo], a=samples[Math.max(0,lo-1)];
  return Math.abs(a.t-t)<Math.abs(b.t-t) ? a : b;
}
export function score(samples: State[], reference: (t:number)=>State, scale=12) {
  if (!samples.length) return 0;
  const rmse=Math.sqrt(samples.reduce((sum,s)=>sum+(s.x-reference(s.t).x)**2,0)/samples.length);
  return Math.round(100*clamp(1-rmse/scale,0,1));
}
export function signedArea(samples: State[], key: 'v'|'a', from: number, to: number) {
  let area=0;
  for(let i=1;i<samples.length;i++) {
    const p=samples[i-1], q=samples[i], l=Math.max(from,p.t), r=Math.min(to,q.t);
    if(r<=l) continue;
    const at=(t:number)=>p[key]+(q[key]-p[key])*(t-p.t)/(q.t-p.t);
    area+=(at(l)+at(r))*.5*(r-l);
  }
  return area;
}
export function csv(samples: State[]) {
  return 'time_s,position_m,velocity_m_s,acceleration_m_s2,impulse_delta_v_m_s\n'+samples.map(s=>[s.t,s.x,s.v,s.a,s.dv??''].join(',')).join('\n');
}
export type Attempt = { id: string; samples: State[]; score: number; curve: Curve; challenge: boolean; duration?:number; period?:number; mission?:string; difficulty?:string };
export function areaReference(t:number, shape:string, key:'v'|'a'): State {
  const y=shape==='rectangle'?4:shape==='triangle'?t:4-t;
  const integral=shape==='rectangle'?4*t:shape==='triangle'?.5*t*t:4*t-.5*t*t;
  if(key==='v') return {t,x:integral,v:y,a:shape==='rectangle'?0:shape==='triangle'?1:-1};
  return {t,x:shape==='rectangle'?2*t*t:shape==='triangle'?t*t*t/6:2*t*t-t*t*t/6,v:integral,a:y};
}

