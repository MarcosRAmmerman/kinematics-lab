import { useId, useRef } from 'react';
import { State, sampleAt } from './physics';
import { displayRange } from './smoothing';
type Props={samples:State[]; reference?:State[]; ghost?:State[]; field:'x'|'v'|'a'; end:number; cursor:number|null; inspect:(t:number)=>void; expanded:boolean; expand:()=>void; interval?:[number,number]; analytic?:boolean; onAnswer?:(t:number)=>void; title?:string; interactive?:boolean; window?:number; raw?:State[]; trendLabel?:string; robust?:boolean; large?:boolean};
const names={x:'Displacement',v:'Velocity',a:'Acceleration'}, units={x:'m',v:'m/s',a:'m/s²'};
export default function Graph(p:Props) {
 const clip=useId().replace(/:/g,'');
 const svg=useRef<SVGSVGElement>(null), W=p.large||p.interactive?900:480,H=p.expanded?330:p.large?195:155,L=62,R=20,T=20,B=28;
 const span=p.window??5, start=Math.max(0,p.end-span),end=Math.max(span,p.end), visible=(ss:State[])=>ss.filter(s=>s.t>=start&&s.t<=end);
 const data=visible(p.samples),ref=visible(p.reference??[]),ghost=visible(p.ghost??[]),raw=visible(p.raw??[]);
 const range=displayRange([...data,...ref,...ghost,...(p.robust?[]:raw)].map(s=>s[p.field]),p.field==='x'?10:p.field==='v'?5:4,p.robust);
 const bound=range.bound;
 const clipped=[...data,...ref,...ghost,...raw].filter(s=>Math.abs(s[p.field])>bound).length;
 const X=(t:number)=>L+(t-start)/(end-start)*(W-L-R),Y=(y:number)=>T+(1-y/bound)/2*(H-T-B);
 const path=(ss:State[])=>ss.map((s,i)=>`${i?'L':'M'}${X(s.t).toFixed(2)},${Y(i&&s.dv!==undefined&&p.field==='v'?ss[i-1].v:s[p.field]).toFixed(2)}${i&&s.dv!==undefined&&p.field==='v'?` L${X(s.t)},${Y(s.v)}`:''}`).join(' ');
 const selected=sampleAt(p.samples,p.cursor??p.samples.at(-1)?.t??0), exact=sampleAt(p.reference??[],selected.t);
 const slope=p.field==='x'?selected.v:selected.a;
 const time=(e:React.PointerEvent)=>{const r=svg.current!.getBoundingClientRect();return Math.max(start,Math.min(end,start+((e.clientX-r.left)/r.width*W-L)/(W-L-R)*(end-start)));};
 return <section className={`graph ${p.field} ${p.expanded?'expanded':''} ${p.large?'large':''}`}><header><span className="dot"/><strong>{p.title??names[p.field]}</strong>{p.trendLabel&&<span className="trend-label" title={p.trendLabel}>Trend</span>}{clipped>0&&<span className="range-note" title={`${clipped} values exceed the visible range. Use Full range in analysis.`}>{clipped} off-scale</span>}<span className="formula">{p.field}(t) · {units[p.field]}</span><span className="reading">{selected[p.field].toFixed(2)} <small>{units[p.field]}</small></span><button aria-label={`Expand ${names[p.field]}`} disabled={!p.interactive} onClick={p.expand}>{p.expanded?'Restore':'Expand'}</button></header>
 <svg ref={svg} viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${names[p.field]} versus time graph`} style={{pointerEvents:p.interactive?'auto':'none'}} onPointerMove={p.interactive?e=>p.inspect(time(e)):undefined} onPointerDown={p.interactive?e=>{p.inspect(time(e));p.onAnswer?.(time(e));}:undefined}>
 {[0,1,2,3,4,5].map(i=><g key={i}><line className="grid" x1={X(start+i*span/5)} x2={X(start+i*span/5)} y1={T} y2={H-B}/><text x={X(start+i*span/5)} y={H-7} textAnchor="middle">{(start+i*span/5).toFixed(span%5===0?0:1)}s</text></g>)}
 {[-1,0,1].map(i=><g key={i}><line className={i?'grid':'zero'} x1={L} x2={W-R} y1={Y(i*bound*.8)} y2={Y(i*bound*.8)}/><text x={L-10} y={Y(i*bound*.8)+4} textAnchor="end">{(i*bound*.8).toFixed(1)}</text></g>)}
 {p.interval&&data.slice(1).map((s,i)=>{const a=data[i];if(a.t<p.interval![0]||s.t>p.interval![1])return null;return <path key={i} d={`M${X(a.t)},${Y(0)} L${X(a.t)},${Y(a[p.field])} L${X(s.t)},${Y(s[p.field])} L${X(s.t)},${Y(0)} Z`} fill={s[p.field]>=0?'#77aee044':'#e5a07e55'}/>;})}
 <defs><clipPath id={clip}><rect x={L} y={T} width={W-L-R} height={H-T-B}/></clipPath></defs><g clipPath={`url(#${clip})`}><path className="raw-line" d={path(raw)}/><path className="target-line" d={path(ref)}/><path className="ghost-line" d={path(ghost)}/><path className="data-line" d={path(data)}/></g>
 {p.field==='a'&&data.filter(s=>s.dv!==undefined).map(s=><g key={s.t}><line className="impulse" x1={X(s.t)} x2={X(s.t)} y1={Y(0)} y2={Y(0)-Math.sign(s.dv!)*36}/><text className="impulse-label" x={X(s.t)+4} y={Y(0)-Math.sign(s.dv!)*40}>Δv {s.dv!>0?'+':''}{s.dv}</text></g>)}
 {p.onAnswer&&[0,2,4,6,8,10,12,14].map(t=><circle key={t} cx={X(t)} cy={Y(sampleAt(p.samples,t)[p.field])} r="5" className="point"/>)}
 {p.cursor!==null&&<g><line className="cursor" x1={X(selected.t)} x2={X(selected.t)} y1={T} y2={H-B}/><circle cx={X(selected.t)} cy={Y(selected[p.field])} r="4" className="point"/>{p.interactive&&p.field!=='a'&&selected.dv===undefined&&<line className="tangent" x1={X(selected.t-.65)} x2={X(selected.t+.65)} y1={Y(selected[p.field]-.65*slope)} y2={Y(selected[p.field]+.65*slope)}/>}</g>}
 </svg><footer>{!p.interactive?<span>{p.large?'Recorded preview / open Analyze to inspect':'Live telemetry / inspection available in Analyze'}</span>:p.cursor!==null?<><span>t = {selected.t.toFixed(2)} s</span><span>{p.field==='v'&&selected.dv!==undefined?'Impulse: no finite slope':p.field==='a'&&p.trendLabel?p.trendLabel:p.field==='a'?'Continuous a; Δv markers are impulses':`${p.trendLabel?'Local-fit estimate':p.analytic?'Exact':'Estimated'} slope = ${slope.toFixed(2)} ${p.field==='x'?'m/s':'m/s²'}`}</span>{p.reference?.length?<span>Δ{p.field} = {(selected[p.field]-exact[p.field]).toFixed(2)}</span>:null}</>:<span>Hover to inspect · shared time cursor · {p.field==='x'?'tangent shows velocity':p.field==='v'?'slope shows acceleration':'signed acceleration'}</span>}</footer></section>;
}

