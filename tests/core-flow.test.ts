import test from 'node:test';
import assert from 'node:assert/strict';
import { exampleInput, generateCreatives } from '../lib/mock.ts';
import { mockGenerationProvider, improveDemo } from '../services/ai/providers.ts';
import { creativeDirections } from '../lib/directions.ts';
import { contentOf, mergeDirectionGeneration, reviseCreative, versionsOf } from '../lib/creative.ts';
import { focusedImprovement, changedElements, localizationWarnings, localizationDisclaimer } from '../lib/changes.ts';
import { parseGeneratedContent, generationMessages, requestCreatives } from '../lib/generation.ts';
import { appendSignal, usefulCounts, projectProgress } from '../lib/signals.ts';
import { scoreCreative } from '../lib/score.ts';
import { isProject, LocalStorageProjectRepository } from '../lib/storage.ts';
import { diversityWarnings } from '../lib/diversity.ts';
import { parseCreativeTask, requestCreativeTask } from '../services/ai/tasks.ts';
import type { Project } from '../lib/types.ts';
const at='2026-10-05T00:00:00.000Z';
function project():Project{return {id:'flow',input:{...exampleInput,tone:'UGC',objective:'Consideration'},createdAt:at,updatedAt:at,creatives:[],revision:0};}
test('三方向策略独立；单套生成与重新生成只更新所选方向，旧三套兼容',async()=>{
 const p=project();const directions=creativeDirections(p.input);assert.equal(directions.length,3);assert.equal(new Set(directions.map(d=>d.logic)).size,3);
 for(const d of directions)assert.ok(d.name&&d.strategy&&d.hookExample&&d.strength&&d.bestFor);
 const demo=await mockGenerationProvider.generate({input:p.input,revision:0,direction:'product-demo'});assert.equal(demo.length,1);
 const first=mergeDirectionGeneration(p,demo[0],'product-demo',{mode:'mock',generatedAt:at});assert.equal(first.length,1);assert.ok(isProject({...p,creatives:first,selectedDirection:'product-demo'}));
 const other=await mockGenerationProvider.generate({input:p.input,revision:0,direction:'lifestyle'});
 const two=mergeDirectionGeneration({...p,creatives:first},other[0],'lifestyle',{mode:'mock',generatedAt:at});assert.equal(two.length,2);assert.deepEqual(two[0],first[0]);
 const next=mergeDirectionGeneration({...p,creatives:two},demo[0],'product-demo',{mode:'mock',generatedAt:at});assert.equal(next[0].versions?.length,2);assert.deepEqual(next[1],two[1]);
 const old=generateCreatives(p.input);assert.equal(mergeDirectionGeneration({...p,creatives:old},demo[0],'product-demo',{mode:'mock',generatedAt:at}).length,3);
});
test('所选方向进入提示与结构校验；测试适配器单套输出且无真实请求',async()=>{
 const p=project();const c=generateCreatives(p.input)[2];const json=JSON.stringify({creatives:[c]});assert.equal(parseGeneratedContent(json,0,'product-demo').length,1);assert.throws(()=>parseGeneratedContent(json,0));assert.match(generationMessages(p.input,0,'product-demo')[1].content,/selectedDirection/);
 let count=0;const fake:typeof fetch=async()=>{count++;return Response.json({choices:[{finish_reason:'stop',message:{content:json}}]});};
 const result=await requestCreatives({baseUrl:'https://example.com/v1',key:'test',model:'test',provider:'test'},p.input,0,new AbortController().signal,fake,()=>{},()=>{},'product-demo');assert.equal(result.length,1);assert.equal(count,1);
});
test('结构重复检查容忍共同时间线与CTA，拒绝近似开场',()=>{
 const all=generateCreatives(exampleInput);assert.deepEqual(diversityWarnings(all),[]);
 const same={...all[1],hook:all[0].hook+'!'};assert.ok(diversityWarnings([all[0],same]).length);
});
test('所有聚焦改进保留独立字幕旁白；旧评分归档、新版本评分失效',()=>{
 const p=project();const c=generateCreatives(p.input)[0];c.script[0].subtitle='Custom subtitle';c.script[0].voiceover='Custom voice';c.script.at(-1)!.subtitle='Custom end';
 for(const goal of ['hook','value','concise','native','platform','cta','claims'] as const){const next=improveDemo(c,p.input,goal);assert.equal(next.script[0].subtitle,'Custom subtitle');assert.equal(next.script[0].voiceover,'Custom voice');assert.equal(next.script.at(-1)!.subtitle,'Custom end');}
 const proposal={...contentOf(c),hook:'New hook',body:'Unrelated body',script:[]};const focused=focusedImprovement(c,proposal,'hook');assert.equal(focused.body,c.body);assert.equal(focused.script.length,4);
 const score=scoreCreative(c,p.input);const revised=reviseCreative({...c,score},focused,'improved','Hook');assert.equal(revised.score,undefined);assert.deepEqual(revised.versions![0].score,score);assert.ok(revised.versions!.at(-1)!.changeNotes?.some(n=>n.includes('Hook')));assert.equal(changedElements(c,{...contentOf(c),rationale:'Only note'}).length,0);
});
test('真实本地化输出新增售价会触发一次修正；移除源USD明确提醒',async()=>{
 const p=project();const c={...generateCreatives(p.input)[0],body:'Price USD 39.99.'};const task=parseCreativeTask({action:'localize',input:p.input,creative:c,improvement:'hook',targetMarket:'GB',language:'en',tone:'自然清晰'});let count=0;
 const fake:typeof fetch=async()=>{count++;return Response.json({choices:[{finish_reason:'stop',message:{content:JSON.stringify({content:{...c,body:count===1?'Price GBP 29.99.':'See the product details.'},notes:['移除价格，没有换算。']})}}]});};
 const result=await requestCreativeTask({baseUrl:'https://example.com/v1',key:'test',model:'test',provider:'test'},task,new AbortController().signal,()=>{},fake);assert.equal(count,2);
 const warnings=localizationWarnings(c,result.content,p.input,'ai');assert.ok(warnings.includes(localizationDisclaimer));assert.match(warnings.join(' '),/USD 39.99.*未出现在/);
});
test('Useful Outputs按实际动作与版本去重，存储失败不提交记录、历史刷新可恢复',()=>{
 const p=project();p.creatives=mergeDirectionGeneration(p,generateCreatives(p.input)[0],'pain-point',{mode:'mock',generatedAt:at});const c=p.creatives[0];const context={creativeId:c.id,versionId:versionsOf(c,at)[0].id};
 assert.equal(usefulCounts([p]).useful,0);const copied=appendSignal(appendSignal(p,'copy',context),'copy',context);const saved=appendSignal(copied,'save',context);assert.equal(usefulCounts([saved]).useful,1);assert.equal(usefulCounts([saved]).copy,1);assert.equal(saved.updatedAt,p.updatedAt);
 let stored=JSON.stringify([p]);const repo=new LocalStorageProjectRepository({getItem:()=>stored,setItem:(_,v)=>{stored=v;}});repo.save(saved,p.updatedAt);assert.equal(usefulCounts(repo.list()).save,1);assert.ok(isProject(repo.list()[0]));
 const full=new LocalStorageProjectRepository({getItem:()=>stored,setItem:()=>{throw new Error('quota');}});assert.throws(()=>full.save(appendSignal(saved,'export',context)),/quota/);assert.equal(usefulCounts(full.list()).export,0);assert.throws(()=>appendSignal(p,'copy',{...context,versionId:'missing'}));assert.equal(projectProgress(saved).find(s=>s.label==='Generate')!.done,true);
 assert.equal(isProject({...saved,selectedDirection:'unknown'}),false);assert.equal(isProject({...saved,signals:[{id:'bad'}]}),false);
});
