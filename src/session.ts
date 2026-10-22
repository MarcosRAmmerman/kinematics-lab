import { DT, FixedClock, State, Mode, Curve, initial, step, sampleAt, clamp } from './physics';
export const DURATION = 5;
export const MAX_SAMPLES = Math.round(DURATION / DT) + 1;
export type Phase = 'explorer' | 'ready' | 'countdown' | 'playing' | 'results' | 'analysis';
/** Owns live physics. Inspection can never feed back into this state. */
export class RunSession {
  phase: Phase = 'explorer';
  state = initial();
  samples: State[] = [];
  inspectionTime: number | null = null;
  command = 0;
  countdown = 3;
  private ticks = 0;
  private clock = new FixedClock();
  constructor(public mode: Mode = 'displacement', public challenge = false, public duration = DURATION, public timed = challenge) {}
  ready() {
    this.phase = 'ready'; this.state = initial(); this.samples = [];
    this.inspectionTime = null; this.command = 0; this.countdown = 3;
    this.duration = Math.round(clamp(Number.isFinite(this.duration)?this.duration:DURATION, 1, 60) / DT) * DT;
    this.ticks = 0; this.clock.reset();
  }
  start() { this.ready(); this.phase = 'countdown'; }
  input(value: number) { if (this.phase === 'playing') this.command = value; }
  inspect(t: number) {
    if (this.phase === 'analysis') this.inspectionTime = clamp(t, this.samples[0]?.t ?? 0, this.state.t);
  }
  display(): State {
    return this.phase === 'analysis' ? sampleAt(this.samples, this.inspectionTime ?? this.state.t) : this.state;
  }
  advance(elapsed: number) {
    if (this.phase === 'countdown') {
      this.countdown = Math.max(0, this.countdown - Math.min(elapsed, .1));
      if (this.countdown < 1e-9) {
        this.phase = 'playing'; this.countdown = 0; this.state = initial();
        this.samples = [initial()]; this.command = 0; this.clock.reset();
      }
      return; // Countdown frame remainder is never scored or recorded.
    }
    this.clock.advance(elapsed, this.phase === 'playing', 1, () => {
      if (this.phase !== 'playing') return;
      this.state = { ...step(this.state, this.mode, this.command), t: ++this.ticks * DT };
      this.samples.push(this.state);
      if (!this.timed && this.samples.length > MAX_SAMPLES) this.samples.shift();
      if (this.timed && this.ticks >= Math.round(this.duration / DT)) this.finish();
    });
  }
  finish() { this.phase = 'results'; this.command = 0; this.inspectionTime = null; this.clock.reset(); }
  analyze() { this.phase = 'analysis'; this.inspectionTime = this.state.t; this.command = 0; this.clock.reset(); }
  resume() { this.phase = 'playing'; this.inspectionTime = null; this.command = 0; this.clock.reset(); }
}
export function shortTarget(t: number, curve: Curve = 'sine', duration = 5, period = 5): State {
  const w = 2 * Math.PI / period, u = clamp(t / duration, 0, 1);
  if (curve === 'linear') return { t, x: 5*t/duration, v: 5/duration, a: 0 };
  if (curve === 'quadratic') return { t, x: 5*(t/duration)**2, v: 10*t/duration**2, a: 10/duration**2 };
  if (curve === 'smooth') return { t, x: 6*(3*u*u-2*u*u*u), v: 36/duration*u*(1-u), a: 36/duration**2*(1-2*u) };
  return { t, x: 4*Math.sin(w*t), v: 4*w*Math.cos(w*t), a: -4*w*w*Math.sin(w*t) };
}
export function shortBikeTarget(t: number, duration = 5): State {
  const commands = [3, 0, -3, 0, 3];
  const segment=duration/commands.length;
  const x = commands.reduce((sum,v,i)=>sum+v*clamp(t-i*segment,0,segment),0);
  return { t, x, v: commands[Math.min(4,Math.floor(t/segment))], a: 0 };
}
/** Installed only for a playing scene; returned teardown removes every listener. */
export function bindGameKeys(host: Window, mode: Mode, input: (n:number)=>void, command:()=>number, pause:()=>void) {
  const held=new Set<string>();
  const key=(value:string)=>value.toLowerCase();
  const movement=(value:string)=>['arrowleft','arrowright','a','d'].includes(key(value));
  const sendHeld=()=>{
    const left=held.has('arrowleft')||held.has('a'),right=held.has('arrowright')||held.has('d');
    input(left===right?0:left?-3:3);
  };
  const clear=()=>{held.clear();input(0);};
  const down=(e:KeyboardEvent)=>{
    const element=e.target as HTMLElement;
    if(element?.matches?.('input,select,textarea')||(element?.matches?.('button')&&[' ','Enter'].includes(e.key)))return;
    if(key(e.key)==='p'){clear();pause();return;}
    if(mode==='velocity'){
      if(!movement(e.key))return;
      e.preventDefault();if(e.repeat||held.has(key(e.key)))return;
      held.add(key(e.key));sendHeld();return;
    }
    if(!['ArrowLeft','ArrowRight',' '].includes(e.key))return;
    e.preventDefault();input(mode==='displacement'?clamp(command()+(e.key==='ArrowRight'?.4:e.key==='ArrowLeft'?-.4:0),-10,10):e.key===' '?0:e.key==='ArrowRight'?2:-2);
  };
  const up=(e:KeyboardEvent)=>{
    if(mode==='velocity'&&movement(e.key)){e.preventDefault();held.delete(key(e.key));sendHeld();}
    else if(mode==='acceleration'&&['ArrowLeft','ArrowRight'].includes(e.key))input(0);
  };
  const blur=()=>{clear();pause();};
  // Focus moving into an editable control also releases any held movement.
  const focusout=()=>clear();
  host.addEventListener('keydown',down);host.addEventListener('keyup',up);host.addEventListener('blur',blur);
  host.document?.addEventListener('focusout',focusout);
  return ()=>{clear();host.removeEventListener('keydown',down);host.removeEventListener('keyup',up);host.removeEventListener('blur',blur);host.document?.removeEventListener('focusout',focusout);};
}
