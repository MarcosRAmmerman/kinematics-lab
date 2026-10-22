import { State, clamp, initial } from './physics';
export type RocketMission = 'docking' | 'burn-coast' | 'intercept';
export type Difficulty = 'standard' | 'advanced';
export const missionNames: Record<RocketMission,string> = {docking:'Precision Docking','burn-coast':'Burn & Coast',intercept:'Intercept'};
export function missionConfig(mission:RocketMission,difficulty:Difficulty) {
  return {duration:mission==='intercept'?(difficulty==='advanced'?10:8):(difficulty==='advanced'?8:10),
    destination:mission==='burn-coast'?16:10, coast:[4,12] as [number,number],
    positionTolerance:difficulty==='advanced'?.2:.35, velocityTolerance:difficulty==='advanced'?.15:.25,
    targetAcceleration:mission==='intercept'&&difficulty==='advanced'?.08:0, assistAllowed:difficulty==='standard'};
}
export function rocketTarget(t:number,mission:RocketMission,difficulty:Difficulty):State {
  const c=missionConfig(mission,difficulty);
  return mission==='intercept'?{t,x:3+t+.5*c.targetAcceleration*t*t,v:1+c.targetAcceleration*t,a:c.targetAcceleration}:{t,x:c.destination,v:0,a:0};
}
export function relativeMotion(player:State,target:State) { return {dx:player.x-target.x,dv:player.v-target.v}; }
export function matched(player:State,target:State,positionTolerance=.35,velocityTolerance=.25) {
  const r=relativeMotion(player,target);return Math.abs(r.dx)<=positionTolerance&&Math.abs(r.dv)<=velocityTolerance;
}
export function stoppingPosition(x:number,v:number,maxDeceleration=2) {
  return x+Math.sign(v)*v*v/(2*maxDeceleration);
}
export function missionReport(samples:State[],mission:RocketMission,difficulty:Difficulty) {
  const c=missionConfig(mission,difficulty),final=samples.at(-1)??initial();
  let crossedEntrance=false,crossedExit=false;
  let fuel=0,coastDistance=0,engineDistance=0,hit:State|undefined,best=final,bestError=Infinity;
  for(let i=0;i<samples.length;i++) {
    const s=samples[i],r=relativeMotion(s,rocketTarget(s.t,mission,difficulty));
    const error=Math.abs(r.dx)/c.positionTolerance+Math.abs(r.dv)/c.velocityTolerance;
    if(error<bestError){bestError=error;best=s;}
    if(!hit&&matched(s,rocketTarget(s.t,mission,difficulty),c.positionTolerance,c.velocityTolerance))hit=s;
    if(i){const p=samples[i-1],dt=s.t-p.t;
      if(p.x<=c.coast[0]&&s.x>=c.coast[0])crossedEntrance=true;
      if(crossedEntrance&&p.x<c.coast[1]&&s.x>=c.coast[1])crossedExit=true;fuel+=Math.abs(s.a)*dt;
      // Clip each segment to the coast corridor; crossing boundaries is counted fractionally.
      const distance=Math.max(0,Math.min(Math.max(p.x,s.x),c.coast[1])-Math.max(Math.min(p.x,s.x),c.coast[0]));
      if(Math.abs(s.a)<.05)coastDistance+=distance;else engineDistance+=distance;
    }
  }
  const coastFraction=clamp(coastDistance/(c.coast[1]-c.coast[0]),0,1);
  const coastSuccess=crossedExit&&coastFraction>=.95&&engineDistance<.05;
  const evaluation=mission==='intercept'?(hit??best):final;
  const r=relativeMotion(evaluation,rocketTarget(evaluation.t,mission,difficulty));
  const accuracy=clamp(1-Math.abs(r.dx)/4,0,1),speed=clamp(1-Math.abs(r.dv)/2,0,1);
  const efficiency=clamp(1-fuel/20,0,1);
  const success=mission==='intercept'?!!hit:matched(final,rocketTarget(final.t,mission,difficulty),c.positionTolerance,c.velocityTolerance)&&(mission!=='burn-coast'||coastSuccess);
  const points=mission==='burn-coast'?40*accuracy+30*speed+20*(coastSuccess?1:coastFraction*.5)+10*efficiency:60*accuracy+40*speed;
  return {score:Math.round(points),success,fuel,coastFraction,coastSuccess,engineDistance,hitTime:hit?.t,dx:r.dx,dv:r.dv};
}
