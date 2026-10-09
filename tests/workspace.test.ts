import test from 'node:test';
import assert from 'node:assert/strict';
import { generateCreatives, exampleInput, validateInput } from '../lib/mock.ts';
import { countries, type Project } from '../lib/types.ts';
import { contentOf, contentSnapshot, duplicateCreative, duplicateProject, replaceGeneration, reviseCreative, versionsOf, synchronizeEditedScript } from '../lib/creative.ts';
import { isProject, parseProjects, STORAGE_KEY, LocalStorageProjectRepository } from '../lib/storage.ts';
import { scoreCreative } from '../lib/score.ts';
import { improveDemo, mockLocalizationProvider } from '../services/ai/providers.ts';
import { parseCreativeTask, parseTaskResult, requestCreativeTask } from '../services/ai/tasks.ts';
import { inspirationExamples, analyzeInspiration } from '../lib/inspiration.ts';
import { projectExport } from '../lib/export.ts';
import { parseDraft } from '../lib/draft.ts';
import { autoChecks, currentReview, type QualityReview } from '../lib/quality.ts';

function project(): Project {const time='2026-10-03T01:00:00.000Z';return {id:'test-project',createdAt:time,updatedAt:time,input:exampleInput,creatives:generateCreatives(exampleInput),revision:0};}
function memory(){const values=new Map<string,string>();return {values,getItem:(k:string)=>values.get(k)??null,setItem:(k:string,v:string)=>{values.set(k,v);}};}

test('旧项目、空结果和新增 Brief 字段兼容，非法嵌套内容拒绝',()=>{
  const p=project();assert.ok(isProject(p));assert.ok(isProject({...p,creatives:[]}));assert.ok(isProject({...p,creatives:p.creatives.slice(0,1)}));
  const input={...p.input,objective:'Conversion' as const,price:'USD 39.99',productUrl:'https://example.com/product',language:'en' as const,description:'规格与用途',offer:'',painPoints:'待验证假设'};
  assert.equal(validateInput(input),null);assert.deepEqual(parseDraft(JSON.stringify(input)),input);
  assert.ok(validateInput({...input,productUrl:'javascript:alert(1)'}));
  assert.equal(isProject({...p,creatives:[{...p.creatives[0],favorite:'yes'}]}),false);
  assert.equal(isProject({...p,creatives:[{...p.creatives[0],versions:[{number:2}]}]}),false);
  assert.equal(isProject({...p,creatives:[{...p.creatives[0],localizations:[{content:'broken'}]}]}),false);
  assert.throws(()=>parseProjects(JSON.stringify([p,{...p}])));
});
test('Repository CRUD 不覆盖损坏数据；配额失败保持原内容；跨页旧写入拒绝',()=>{
  const storage=memory();const repo=new LocalStorageProjectRepository(storage);const p=project();
  repo.save(p);assert.equal(repo.list().length,1);
  const changed={...p,updatedAt:'2026-10-03T02:00:00.000Z'};repo.save(changed,p.updatedAt);
  assert.throws(()=>repo.save({...p,updatedAt:'2026-10-03T03:00:00.000Z'},p.updatedAt),/其他页面/);
  assert.equal(repo.list()[0].updatedAt,changed.updatedAt);
  assert.equal(repo.merge([p,{...p,id:'second'}]),1);assert.equal(repo.list()[0].updatedAt,changed.updatedAt);
  repo.remove('second');assert.equal(repo.list().length,1);
  storage.values.set(STORAGE_KEY,'broken');assert.throws(()=>repo.save(p));assert.equal(storage.getItem(STORAGE_KEY),'broken');
  const full=new LocalStorageProjectRepository({getItem:()=>JSON.stringify([p]),setItem:()=>{throw new Error('QuotaExceeded');}});
  assert.throws(()=>full.save(changed),/QuotaExceeded/);assert.equal(full.list()[0].updatedAt,p.updatedAt);
});
test('编辑、改进、恢复、重新生成均追加版本并保留副本与本地化',()=>{
  const p=project();const c=p.creatives[0];const initial=contentOf(c);
  const edited=reviseCreative(c,{...contentOf(c),hook:'A user-edited hook'},'edited','手动编辑');
  assert.equal(edited.versions?.length,2);assert.deepEqual(edited.versions?.[0].content,initial);assert.equal(c.hook,initial.hook);
  const restored=reviseCreative(edited,edited.versions![0].content,'restored','恢复 V1');assert.equal(restored.versions?.length,3);assert.equal(restored.hook,c.hook);
  const duplicated=duplicateCreative(restored);assert.notEqual(duplicated.id,c.id);assert.equal(duplicated.versions?.length,1);
  const next=replaceGeneration({...p,creatives:[restored,...p.creatives.slice(1),duplicated]},generateCreatives(p.input,1),p.updatedAt);
  assert.equal(next.length,4);assert.equal(next[0].id,c.id);assert.equal(next[0].versions?.length,4);assert.equal(next[3].id,duplicated.id);
  assert.ok(isProject({...p,creatives:next}));assert.equal(versionsOf(c,p.createdAt)[0].number,1);
  const copy=duplicateProject(p);assert.notEqual(copy.id,p.id);assert.notEqual(copy.creatives[0].id,c.id);assert.ok(isProject(copy));
});
test('评分可复现且有理由，编辑后失效，收藏不改变评分或评审内容快照',()=>{
  const p=project();const c=p.creatives[0];const score=scoreCreative(c,p.input);
  assert.equal(score.total,scoreCreative(c,p.input).total);assert.equal(score.dimensions.length,7);assert.ok(score.dimensions.every(d=>d.score>=0&&d.score<=100&&d.reason&&d.suggestion));
  const next={...c,favorite:true};assert.equal(contentSnapshot(next),score.snapshot);
  const edited=reviseCreative({...c,score},{...contentOf(c),hook:'Changed'},'edited','edit');assert.equal(edited.score,undefined);assert.notEqual(contentSnapshot(edited),score.snapshot);
  const review:QualityReview={version:1,snapshot:contentSnapshot(c),facts:'verified',notes:'checked',savedAt:p.updatedAt,scores:{}};
  assert.equal(currentReview(next,review),review);assert.equal(currentReview(edited,review),undefined);
});
test('手动编辑 Hook / CTA 同步关联脚本，但保留独立编辑过的字幕',()=>{
  const c=project().creatives[0];const draft={...contentOf(c),hook:'Updated hook',cta:'Updated CTA'};
  const synced=synchronizeEditedScript(c,draft);assert.equal(synced.script[0].voiceover,'Updated hook');assert.equal(synced.script.at(-1)?.subtitle,'Updated CTA');
  draft.script[0].subtitle='Independently edited subtitle';const custom=synchronizeEditedScript(c,draft);assert.equal(custom.script[0].subtitle,'Independently edited subtitle');assert.equal(c.script[0].voiceover,c.hook);
});
test('有限模板改进同步首尾镜头且不新增价格、性能或虚构评价',()=>{
  const p=project();for(const action of ['hook','native','concise','cta','ugc','premium','emotional'] as const){
    const result=improveDemo(p.creatives[0],p.input,action);assert.equal(result.script[0].voiceover,result.hook);assert.equal(result.script.at(-1)?.voiceover,result.cta);assert.ok(autoChecks({...result,id:'x'}).every(x=>x.pass));
    assert.doesNotMatch(result.body,/guaranteed|99%|best seller|reviewers/i);
  }
});
test('单套重新生成改变表达、保留方向；保存后不改动其他创意',()=>{
  const p=project();const original=p.creatives[0];const next=improveDemo(original,p.input,'regenerate');
  assert.notEqual(next.hook,original.hook);assert.equal(next.direction,original.direction);
  const revised=reviseCreative(original,next,'generated','单套重新生成');
  assert.equal(revised.versions?.length,2);assert.equal(revised.versions?.[0].content.hook,original.hook);
  assert.equal(revised.id,original.id);assert.equal(p.creatives[1].hook,generateCreatives(p.input)[1].hook);
  assert.ok(autoChecks({...next,id:'x'}).every(x=>x.pass));
});
test('本地化保留原文、源币种与来源版本，UK 与东南亚样例有实际变化',async()=>{
  const p=project();const c={...p.creatives[0],hook:'Your favorite color?',body:'Keep your favorite color. Price USD 39.99.'};
  const uk=await mockLocalizationProvider.localize({input:p.input,creative:c,targetMarket:'GB',language:'en',tone:'简洁高级'});
  assert.match(uk.content.hook,/favourite colour/);assert.match(uk.content.body,/USD 39.99/);assert.match(uk.notes.join(' '),/不自动换算/);assert.equal(c.hook,'Your favorite color?');
  const id=await mockLocalizationProvider.localize({input:p.input,creative:c,targetMarket:'ID',language:'id',tone:'自然清晰'});
  assert.match(id.content.hook,/Apa/);assert.match(id.notes.join(' '),/不是逐句翻译/);assert.ok(autoChecks({...id.content,id:'l'}).every(x=>x.pass));
  for(const country of Object.keys(countries) as (keyof typeof countries)[])assert.equal(generateCreatives({...p.input,country}).length,3);
});
test('AI task 请求与输出校验；只修正一次，额度也计入修正，无真实网络请求',async()=>{
  const p=project();const creative=p.creatives[0];const raw={action:'localize',input:p.input,creative,improvement:'hook',targetMarket:'GB',language:'en',tone:'自然清晰'};
  const task=parseCreativeTask(raw);assert.equal(task.targetMarket,'GB');assert.throws(()=>parseCreativeTask({...raw,targetMarket:'constructor'}));
  assert.throws(()=>parseTaskResult(JSON.stringify({content:creative,notes:[]})));
  const valid=JSON.stringify({content:creative,notes:['保留原价格，调整 CTA。']});let calls=0;let allowances=0;
  const fake:typeof fetch=async()=>{calls++;return Response.json({choices:[{finish_reason:'stop',message:{content:calls===1?'{}':valid}}]});};
  const result=await requestCreativeTask({baseUrl:'https://example.com/v1',key:'test-only',model:'test',provider:'test'},task,new AbortController().signal,()=>{allowances++;},fake);
  assert.equal(calls,2);assert.equal(allowances,2);assert.equal(result.notes.length,1);
});
test('灵感分析仅传结构；导出包含编辑与版本，不复制竞品原文',()=>{
  const example=inspirationExamples[2];const insight=analyzeInspiration(example);assert.equal(insight.patternId,'problem-solution');assert.equal(insight.dimensions.length,8);assert.throws(()=>analyzeInspiration({headline:'',body:'',description:''}));
  const p=project();p.creatives[0]=reviseCreative(p.creatives[0],{...contentOf(p.creatives[0]),hook:'Saved edit'},'edited','edit');
  const json=JSON.parse(projectExport(p,'json'));assert.equal(json.schemaVersion,2);assert.equal(json.project.creatives[0].versions.length,2);assert.match(projectExport(p,'md'),/^# Adora/);assert.match(projectExport(p,'txt'),/Saved edit/);
});
