import {clamp,State} from './physics';
/** Rendering-only camera: fixed scale, continuous world-space offset. */
export class SmoothCamera {
  offset=0;
  reset(x=0){this.offset=x;}
  advance(x:number,v:number,dt:number){
    const lookAhead=clamp(v*.25,-3,3);
    const delta=x+lookAhead-this.offset;
    const target=this.offset+Math.sign(delta)*Math.max(0,Math.abs(delta)-4);
    // Shorter response at extreme speed keeps the craft visible without snapping.
    const tau=Math.min(.18,3/Math.max(1,Math.abs(v)));
    this.offset+=(target-this.offset)*(-Math.expm1(-Math.max(0,dt)/tau));
    return this.offset;
  }
}
export function worldToScreen(x:number,camera:number){return 450+(x-camera)*32;}
export function starVisual(index:number,state:Pick<State,'x'|'v'>,reducedMotion=false){
  const depth=.25+(index%5)*.13;
  // Phase comes from integrated world displacement, so motion rate is proportional to v.
  const phase=reducedMotion?0:state.x*depth*10;
  const x=(((index*173-phase)%900)+900)%900;
  return {x,y:(index*47)%110+8,streak:reducedMotion||Math.abs(state.v)<=2?0:-Math.sign(state.v)*Math.min(17,Math.max(0,Math.abs(state.v)-2)*depth*.7)};
}
