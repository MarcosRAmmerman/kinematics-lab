import {test,expect,Page} from '@playwright/test';
async function open(page:Page,name:string){await page.getByRole('navigation').getByRole('button',{name:new RegExp(name+'$')}).click();}
async function start(page:Page){await page.getByRole('button',{name:'Start experiment',exact:true}).click();await page.clock.runFor(3100);await expect(page.locator('.phase-playing')).toBeVisible();}
test.beforeEach(async({page})=>{await page.clock.install({time:new Date('2026-01-01T00:00:00Z')});await page.clock.pauseAt(new Date('2026-01-01T00:00:01Z'));await page.goto('/');});
test('countdown keeps controls stable and all primary controls above fold',async({page},info)=>{
 for(const name of ['Free Play','Tron Bike','Mouse Throttle']){
  await open(page,name);
  const selectors=['.scene','.scene-controls','.graphs','.toolbar'];
  const ready=await Promise.all(selectors.map(s=>page.locator(s).boundingBox()));
  await page.getByRole('button',{name:'Start experiment',exact:true}).click();
  const counting=await Promise.all(selectors.map(s=>page.locator(s).boundingBox()));
  await page.screenshot({path:info.outputPath(name+'-countdown.png')});
  await page.clock.runFor(3100);
  const playing=await Promise.all(selectors.map(s=>page.locator(s).boundingBox()));
  for(let i=0;i<selectors.length;i++)for(const field of ['x','y','width','height'] as const){expect(Math.abs(ready[i]![field]-counting[i]![field])).toBeLessThan(.6);expect(Math.abs(counting[i]![field]-playing[i]![field])).toBeLessThan(.6);}
  for(const label of ['Pause & analyze','Stop','Reset']){const box=await page.getByRole('button',{name:label,exact:true}).boundingBox();expect(box!.y).toBeGreaterThanOrEqual(0);expect(box!.y+box!.height).toBeLessThan(page.viewportSize()!.height);}
  const controls=await page.locator('.scene-controls').boundingBox();expect(controls!.y+controls!.height).toBeLessThan(page.viewportSize()!.height);
  const graphs=await page.locator('.graphs').boundingBox();expect(graphs!.y+graphs!.height).toBeLessThan(page.viewportSize()!.height);
  await page.screenshot({path:info.outputPath(name+'-playing.png')});
 }
});
test('timed Free Play, timer, raw traces, results and complete replay',async({page},info)=>{
 await open(page,'Free Play');await expect(page.getByLabel('Recording duration')).toHaveValue('6');await expect(page.getByLabel('Simulation timer')).toContainText('00.0 / 06.0 s');
 await start(page);
 await page.keyboard.down('ArrowRight');await page.clock.runFor(300);await page.keyboard.up('ArrowRight');
 const t=Number(await page.locator('.scene-top b').textContent());await expect(page.getByLabel('Simulation timer')).toContainText(t.toFixed(1).padStart(4,'0'));
 await expect(page.locator('.graph.a .raw-line')).not.toHaveAttribute('d','');
 const scene=await page.locator('.scene').boundingBox();const graph=await page.locator('.graph.a').boundingBox();await page.mouse.move(scene!.x+scene!.width*.5,scene!.y+scene!.height*.6);await page.mouse.down();await page.mouse.move(scene!.x+scene!.width*.75,graph!.y+20);await page.clock.runFor(200);expect(Number(await page.locator('.scene').getAttribute('data-world-x'))).toBeGreaterThan(4);await page.mouse.up();await page.locator('.graph.a').hover();await page.clock.runFor(6200);
 await expect(page.locator('.results-panel')).toBeVisible();await expect(page.getByLabel('Simulation timer')).toContainText('06.0 / 06.0 s');await expect(page.locator('.statusbar')).toContainText('721 samples');
 expect((await page.locator('.graph').first().boundingBox())!.height).toBeGreaterThan(220);
 await page.screenshot({path:info.outputPath('results.png'),fullPage:true});
 await page.getByRole('button',{name:'Analyze',exact:true}).click();await expect(page.getByLabel('Run scrubber')).toHaveAttribute('max','6');
 await page.getByRole('button',{name:'Replay',exact:true}).click();await page.clock.runFor(1500);await expect(page.locator('.scene-top')).toContainText('RECORDED MOMENT');
 await page.getByRole('button',{name:'Adjust & retry',exact:true}).click();await page.getByLabel('Recording duration').fill('2');await start(page);await page.clock.runFor(2200);await expect(page.locator('.statusbar')).toContainText('241 samples');
});
test('two-cycle Match sine and hold-to-move keys, conflict, release, blur',async({page})=>{
 await open(page,'Match the Curve');await expect(page.getByLabel('Challenge duration')).toHaveValue('10');await page.getByLabel('Sine period').selectOption('6');await expect(page.getByLabel('Challenge duration')).toHaveValue('12');
 await open(page,'Tron Bike');await start(page);
 await page.keyboard.down('d');await page.clock.runFor(100);expect(Number(await page.locator('.scene').getAttribute('data-world-v'))).toBe(3);
 await page.keyboard.down('a');await page.clock.runFor(100);expect(Number(await page.locator('.scene').getAttribute('data-world-v'))).toBe(0);
 await page.keyboard.up('a');await page.clock.runFor(100);expect(Number(await page.locator('.scene').getAttribute('data-world-v'))).toBe(3);
 await page.keyboard.up('d');await page.clock.runFor(100);expect(Number(await page.locator('.scene').getAttribute('data-world-v'))).toBe(0);
 await page.keyboard.down('ArrowRight');await page.clock.runFor(100);await page.evaluate(()=>window.dispatchEvent(new Event('blur')));await expect(page.locator('.phase-analysis')).toBeVisible();await page.keyboard.up('ArrowRight');
 await page.getByRole('button',{name:'Resume play'}).click();await page.clock.runFor(100);expect(Number(await page.locator('.scene').getAttribute('data-world-v'))).toBe(0);
});
test('rocket crosses the old camera threshold continuously with readable offscreen target',async({page},info)=>{
 await open(page,'Pedal Pulses');await page.getByLabel('Challenge duration').selectOption('15');await start(page);await page.keyboard.down('ArrowRight');
 const frames:number[][]=[];
 for(let i=0;i<60;i++){await page.clock.runFor(100);frames.push(await page.locator('.scene').evaluate(el=>['data-world-x','data-world-v','data-camera'].map(k=>Number(el.getAttribute(k)))));if(i===30)await page.screenshot({path:info.outputPath('rocket-before-threshold.png')});}
 await page.keyboard.up('ArrowRight');
 for(let i=1;i<frames.length;i++){expect(frames[i][0]).toBeGreaterThan(frames[i-1][0]);expect(Math.abs(frames[i][2]-frames[i-1][2])).toBeLessThan(1.5);expect(Math.abs(frames[i][0]-frames[i][2])).toBeLessThan(12);}
 expect(frames.some(f=>f[0]>10)).toBe(true);expect(frames.at(-1)![0]).toBeGreaterThan(30);
 await expect(page.locator('.offscreen-target')).toBeVisible();await expect(page.locator('.starfield')).toBeVisible();expect(await page.locator('.starfield line').first().evaluate(el=>Math.abs(Number(el.getAttribute('x1'))-Number(el.getAttribute('x2'))))).toBeGreaterThan(0);
 await page.screenshot({path:info.outputPath('rocket-after-threshold.png')});
 const before=frames.at(-1)!;await page.clock.runFor(300);const after=await page.locator('.scene').evaluate(el=>['data-world-x','data-world-v'].map(k=>Number(el.getAttribute(k))));expect(after[1]).toBeCloseTo(before[1],8);expect(after[0]).toBeGreaterThan(before[0]);
 await page.keyboard.down('ArrowLeft');let lastCamera=Number(await page.locator('.scene').getAttribute('data-camera'));
 for(let i=0;i<75;i++){await page.clock.runFor(100);const nextCamera=Number(await page.locator('.scene').getAttribute('data-camera'));expect(Math.abs(nextCamera-lastCamera)).toBeLessThan(1.5);lastCamera=nextCamera;}
 await page.keyboard.up('ArrowLeft');expect(Number(await page.locator('.scene').getAttribute('data-world-v'))).toBeLessThan(-2);
 expect(await page.locator('.starfield line').first().evaluate(el=>Number(el.getAttribute('x2'))-Number(el.getAttribute('x1')))).toBeGreaterThan(0);
 await page.screenshot({path:info.outputPath('rocket-reversing.png')});
});
