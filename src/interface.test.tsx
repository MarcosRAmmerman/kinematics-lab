// @vitest-environment jsdom
import {act} from 'react';
import {createRoot,Root} from 'react-dom/client';
import {afterEach,beforeEach,describe,it,expect,vi} from 'vitest';
import Graph from './Graph';
import App from './App';
let host:HTMLDivElement,root:Root;
beforeEach(()=>{(globalThis as Record<string,unknown>).IS_REACT_ACT_ENVIRONMENT=true;host=document.createElement('div');document.body.append(host);root=createRoot(host);sessionStorage.clear();});
afterEach(()=>{act(()=>root.unmount());host.remove();vi.unstubAllGlobals();vi.restoreAllMocks();});
const sample=[{t:0,x:0,v:2,a:0},{t:1,x:2,v:2,a:0}];
describe('graph input boundary',()=>{
 it('does not dispatch hover or press inspection during gameplay',()=>{const inspect=vi.fn();act(()=>root.render(<Graph samples={sample} field="x" end={5} cursor={1} inspect={inspect} expanded={false} expand={()=>{}} interactive={false}/>));const svg=host.querySelector('svg')!;act(()=>{svg.dispatchEvent(new MouseEvent('pointermove',{bubbles:true,clientX:100}));svg.dispatchEvent(new MouseEvent('pointerdown',{bubbles:true,clientX:100}));svg.dispatchEvent(new MouseEvent('pointerout',{bubbles:true}));});expect(inspect).not.toHaveBeenCalled();expect(svg.style.pointerEvents).toBe('none');expect(host.querySelector('.tangent')).toBeNull();expect(host.querySelector('.cursor')).not.toBeNull();expect(host.querySelector('button')!.disabled).toBe(true);});
 it('allows inspection and tangents in analysis',()=>{const inspect=vi.fn();act(()=>root.render(<Graph samples={sample} field="x" end={5} cursor={1} inspect={inspect} expanded={false} expand={()=>{}} interactive/>));const svg=host.querySelector('svg')!;vi.spyOn(svg,'getBoundingClientRect').mockReturnValue({left:0,width:900} as DOMRect);act(()=>svg.dispatchEvent(new MouseEvent('pointermove',{bubbles:true,clientX:450})));expect(inspect).toHaveBeenCalledWith(expect.any(Number));expect(host.querySelector('.tangent')).not.toBeNull();});
});
describe('scene navigation and live controls',()=>{
 it('opens ready, counts down without recording, then isolates graph hover from live dragging',()=>{
  let frame:FrameRequestCallback=()=>{};let now=0;
  vi.spyOn(performance,'now').mockImplementation(()=>now);
  vi.stubGlobal('requestAnimationFrame',(cb:FrameRequestCallback)=>{frame=cb;return 1;});vi.stubGlobal('cancelAnimationFrame',()=>{});
  act(()=>root.render(<App/>));
  const click=(text:string)=>{const b=[...host.querySelectorAll('button')].find(b=>text==='Free Play'?b.textContent?.includes('Free Play'):b.textContent?.trim()===text)!;expect(b).toBeTruthy();act(()=>b.click());};
  click('Free Play');expect(host.querySelector('.ready-panel')).not.toBeNull();expect(host.querySelector('.scrubber')).toBeNull();
  click('Start experiment');expect(host.querySelector('.countdown')).not.toBeNull();expect(host.textContent).toContain('0 samples');
  for(let i=0;i<30;i++){now+=100;act(()=>frame(now));}
  expect(host.querySelector('.phase-playing')).not.toBeNull();expect(host.textContent).toContain('1 samples');
  const scene=host.querySelector<SVGSVGElement>('.scene')!;
  vi.spyOn(scene,'getBoundingClientRect').mockReturnValue({left:0,width:900} as DOMRect);
  scene.setPointerCapture=vi.fn();scene.hasPointerCapture=()=>true;scene.releasePointerCapture=vi.fn();
  act(()=>scene.dispatchEvent(new MouseEvent('pointerdown',{bubbles:true,clientX:600})));
  now+=100;act(()=>frame(now));
  const oldTime=host.querySelector('.scene-top b')!.textContent;
  const oldCursor=host.querySelector('.graph .cursor')!.getAttribute('x1');
  const graph=host.querySelector('.graph svg')!;
  act(()=>{graph.dispatchEvent(new MouseEvent('pointermove',{bubbles:true,clientX:100}));graph.dispatchEvent(new MouseEvent('pointerout',{bubbles:true}));scene.dispatchEvent(new MouseEvent('pointermove',{bubbles:true,clientX:650}));});
  now+=100;act(()=>frame(now));
  expect(host.querySelector('.scene-top b')!.textContent).not.toBe(oldTime);
  expect(host.querySelector('.graph .cursor')!.getAttribute('x1')).not.toBe(oldCursor);
  expect(Number(host.querySelector<HTMLInputElement>('[aria-label="Position control"]')!.value)).toBeGreaterThan(5);
  expect(host.querySelector('.scrubber')).toBeNull();expect(host.querySelector('.tangent')).toBeNull();
  click('Pause & analyze');expect(host.querySelector('.scrubber')).not.toBeNull();expect(host.textContent).toContain('RECORDED MOMENT');
  click('Retry');expect(host.querySelector('.countdown')).not.toBeNull();expect(host.textContent).toContain('0 samples');
  click('Cancel');expect(host.querySelector('.ready-panel')).not.toBeNull();
 });
});

describe('stable countdown structure',()=>{
 it.each(['Free Play','Tron Bike','Mouse Throttle'])('retains the same scene, control nodes, and graph containers at GO: %s',name=>{
  let frame:FrameRequestCallback=()=>{};let now=0;
  vi.spyOn(performance,'now').mockImplementation(()=>now);
  vi.stubGlobal('requestAnimationFrame',(cb:FrameRequestCallback)=>{frame=cb;return 1;});vi.stubGlobal('cancelAnimationFrame',()=>{});
  act(()=>root.render(<App/>));
  const navigation=[...host.querySelectorAll<HTMLButtonElement>('nav button')].find(b=>b.textContent?.includes(name))!;
  act(()=>navigation.click());
  const scene=host.querySelector('.scene')!,controls=host.querySelector('.scene-controls')!,graphs=host.querySelector('.graphs')!,timer=host.querySelector('.run-timer')!;
  const firstControl=controls.querySelector('input,button');
  const start=[...host.querySelectorAll('button')].find(b=>b.textContent==='Start experiment')!;
  act(()=>start.click());
  expect(host.querySelector('.game-stage')).not.toBeNull();
  expect(host.querySelector('.scene-panel')!.contains(host.querySelector('.countdown'))).toBe(true);
  const toolbar=host.querySelector('.toolbar');
  for(let i=0;i<30;i++){now+=100;act(()=>frame(now));}
  expect(host.querySelector('.phase-playing.game-stage')).not.toBeNull();
  expect(host.querySelector('.scene')).toBe(scene);expect(host.querySelector('.scene-controls')).toBe(controls);
  expect(controls.querySelector('input,button')).toBe(firstControl);
  expect(host.querySelector('.graphs')).toBe(graphs);expect(host.querySelector('.launch-slot')).toBeNull();expect(host.querySelector('.run-timer')).toBe(timer);
  expect(host.querySelector('.toolbar')).toBe(toolbar);expect(host.querySelector('.countdown')!.textContent).toBe('GO');
  expect((controls as HTMLFieldSetElement).disabled).toBe(false);
 });
 it('opens a ten-second sine run and exposes the whole attempt in analysis',()=>{
  let frame:FrameRequestCallback=()=>{};let now=0;
  vi.spyOn(performance,'now').mockImplementation(()=>now);
  vi.stubGlobal('requestAnimationFrame',(cb:FrameRequestCallback)=>{frame=cb;return 1;});vi.stubGlobal('cancelAnimationFrame',()=>{});
  act(()=>root.render(<App/>));
  act(()=>[...host.querySelectorAll<HTMLButtonElement>('nav button')].find(b=>b.textContent?.includes('Trace a Sine Wave'))!.click());
  expect(host.querySelector<HTMLSelectElement>('[aria-label="Challenge duration"]')!.value).toBe('10');
  act(()=>[...host.querySelectorAll('button')].find(b=>b.textContent==='Start experiment')!.click());
  // One React flush per frame, matching the actual animation scheduling contract.
  for(let i=0;i<130;i++){now+=100;act(()=>frame(now));}
  expect(host.querySelector('.phase-results')).not.toBeNull();expect(host.textContent).toContain('1,201 samples');
  act(()=>[...host.querySelectorAll('button')].find(b=>b.textContent==='Analyze')!.click());
  expect(host.querySelector<HTMLInputElement>('[aria-label="Run scrubber"]')!.max).toBe('10');
  expect(host.querySelector('.graph svg')!.textContent).toContain('10s');
  expect(host.querySelector('[aria-label="Trend timing"]')).not.toBeNull();
 });
});
