import {State} from './physics';
export type TrendMode = 'causal' | 'centered';
// Fit x = c0 + c1*u + c2*u^2 with u=(t-t_i)/window. Normalizing avoids
// poorly scaled powers of seconds. Gaussian elimination solves the 3x3 normal equations.
function solve(matrix:number[][]):number[]|null {
  for(let k=0;k<3;k++){
    let pivot=k;for(let i=k+1;i<3;i++)if(Math.abs(matrix[i][k])>Math.abs(matrix[pivot][k]))pivot=i;
    if(Math.abs(matrix[pivot][k])<1e-12)return null;
    [matrix[k],matrix[pivot]]=[matrix[pivot],matrix[k]];
    const d=matrix[k][k];for(let j=k;j<4;j++)matrix[k][j]/=d;
    for(let i=0;i<3;i++)if(i!==k){const factor=matrix[i][k];for(let j=k;j<4;j++)matrix[i][j]-=factor*matrix[k][j];}
  }return matrix.map(row=>row[3]);
}
export function fitDerivatives(samples:State[],index:number,windowSeconds=.35,mode:TrendMode='causal'):State {
  const s=samples[index],window=Math.max(.05,windowSeconds),half=window/2;
  let lo=index,hi=index;
  if(mode==='causal'){while(lo>0&&s.t-samples[lo-1].t<=window+1e-10)lo--;}
  else {
    // Shift a centered window inward at boundaries; evaluate at the original timestamp.
    const left=Math.max(samples[0].t,Math.min(s.t-half,samples.at(-1)!.t-window)),right=left+window;
    while(lo>0&&samples[lo-1].t>=left-1e-10)lo--;
    while(hi+1<samples.length&&samples[hi+1].t<=right+1e-10)hi++;
  }
  if(hi-lo<2)return {...s}; // Not enough independent points: retain the labeled raw estimate.
  const sums=[0,0,0,0,0],rhs=[0,0,0];
  for(let j=lo;j<=hi;j++){
    const u=(samples[j].t-s.t)/window,y=samples[j].x-s.x;
    let power=1;for(let k=0;k<5;k++){sums[k]+=power;if(k<3)rhs[k]+=power*y;power*=u;}
  }
  const c=solve([[sums[0],sums[1],sums[2],rhs[0]],[sums[1],sums[2],sums[3],rhs[1]],[sums[2],sums[3],sums[4],rhs[2]]]);
  return c?{...s,v:c[1]/window,a:2*c[2]/window**2}:{...s};
}
export function derivativeTrend(samples:State[],windowSeconds=.35,mode:TrendMode='causal') {
  return samples.map((_,i)=>fitDerivatives(samples,i,windowSeconds,mode));
}
/** Append-only causal estimates can be cached by immutable sample identity. */
export class LiveTrend {
  private cache=new WeakMap<State,State>(); private window=0;
  calculate(samples:State[],windowSeconds=.35) {
    if(windowSeconds!==this.window){this.cache=new WeakMap();this.window=windowSeconds;}
    return samples.map((s,i)=>{let value=this.cache.get(s);if(!value){value=fitDerivatives(samples,i,windowSeconds,'causal');this.cache.set(s,value);}return value;});
  }
}
export function displayRange(values:number[],minimum:number,robust=false) {
  const sorted=values.filter(Number.isFinite).map(Math.abs).sort((a,b)=>a-b);
  const high=sorted.length?sorted[robust?Math.floor((sorted.length-1)*.95):sorted.length-1]:0;
  const bound=Math.max(minimum,high)*1.12;
  return {bound,clipped:sorted.filter(v=>v>bound).length};
}
