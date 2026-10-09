import test from 'node:test';
import assert from 'node:assert/strict';
import { exampleInput, generateCreatives } from '../lib/mock.ts';
import { featuredCaseId } from '../lib/featured-case.ts';
import { improveDemo } from '../services/ai/providers.ts';
import { contentOf, mergeDirectionGeneration, reviseCreative, versionsOf } from '../lib/creative.ts';
import { projectExport } from '../lib/export.ts';
import { appendSignals, usefulCounts } from '../lib/signals.ts';
import { LocalStorageProjectRepository, parseProjects } from '../lib/storage.ts';
import type { Language, Project } from '../lib/types.ts';

const at='2026-10-06T00:00:00.000Z';
function project():Project {
 const p:Project={id:'reliability',input:{...exampleInput,price:'USD 39.99',offer:'No discount provided'},createdAt:at,updatedAt:at,creatives:[],revision:0};
 return {...p,creatives:mergeDirectionGeneration(p,generateCreatives(p.input)[0],'pain-point',{mode:'ai',model:'test-model',provider:'test-provider',generatedAt:at})};
}

test('Shorter keeps decimal prices, measurements and late restrictions while removing generic repetition',()=>{
 const p=project();const c={...p.creatives[0],body:'Take a closer look. Seller price USD 39.99. Another way to see it. Capacity is 500 ml; width is 3.5 cm. Not dishwasher safe. An everyday moment.'};
 const result=improveDemo(c,p.input,'concise');
 assert.equal(result.body,'Take a closer look. Seller price USD 39.99. Capacity is 500 ml; width is 3.5 cm. Not dishwasher safe.');
 assert.deepEqual(result.script,c.script);
 assert.equal(result.hook,c.hook);
 const qualified={...c,body:'Take a closer look. See the details. Don’t use in a microwave. Results may vary. Another everyday moment.'};
 assert.equal(improveDemo(qualified,p.input,'concise').body,'Take a closer look. See the details. Don’t use in a microwave. Results may vary.');
});

test('Shorter and Clearer Value preserve decimals in Japanese and Indonesian',()=>{
 const p=project();
 const samples:[Language,string,string][]=[['ja','商品をご確認ください。価格はUSD 39.99です。幅は3.5 cmです。','USD 39.99'],['id','Lihat detailnya. Harga USD 39.99. Lebar 3.5 cm. Hanya untuk penggunaan di rumah.','USD 39.99']];
 for(const [language,body,price] of samples)for(const goal of ['concise','value'] as const){
   const c={...p.creatives[0],body};const result=improveDemo(c,{...p.input,language},goal);
   assert.ok(result.body.includes(price));assert.ok(result.body.includes('3.5 cm'));
   if(language==='id')assert.ok(result.body.includes('Hanya untuk penggunaan di rumah.'));
 }
});

test('Clearer Value deduplicates complete sentences without changing a decimal price',()=>{
 const p=project();const c={...p.creatives[0],body:'Seller price USD 39.99. Seller price USD 39.99. Width is 3.5 cm.'};
 assert.equal(improveDemo(c,p.input,'value').body,'Seller price USD 39.99. Width is 3.5 cm.');
});

test('Manual edits clear current generation attribution and keep historical AI provenance',()=>{
 const p=project();const c=p.creatives[0];
 const edited=reviseCreative(c,{...contentOf(c),body:'Seller price USD 39.99.'},'edited','Manual edit',at);
 assert.equal(edited.generation,undefined);
 assert.equal(edited.versions![0].generation?.model,'test-model');
 assert.equal(edited.versions!.at(-1)!.generation,undefined);
 for(const format of ['txt','md'] as const){
   const text=projectExport({...p,creatives:[edited],generation:c.generation},format);
   assert.match(text,/当前创意 V2 · User Edited · 用户编辑/);
   assert.doesNotMatch(text,/test-model|AI 生成/);
   assert.match(text,/价格：USD 39\.99/);
   assert.match(text,/版本时间：2026-10-06/);
 }
});

test('Mixed exports attribute each current creative and localization to its own source version',()=>{
 const p=project();const c=p.creatives[0];
 const edited=reviseCreative(c,{...contentOf(c),hook:'My manual opening'},'edited','Edit',at);
 edited.localizations=[{id:'local',sourceMarket:'US',targetMarket:'GB',language:'en',tone:'自然清晰',createdAt:at,sourceVersion:1,original:contentOf(c),content:contentOf(c),mode:'mock',notes:['Keep original price'],warnings:['Human review required.']}];
 const demo=mergeDirectionGeneration({...p,creatives:[]},generateCreatives(p.input)[1],'lifestyle',{mode:'mock',generatedAt:at})[0];
 const restored=reviseCreative(c,contentOf(c),'restored','Restore',at);
 const mixed={...p,creatives:[c,edited,demo,restored]};
 for(const format of ['txt','md'] as const){
   const text=projectExport(mixed,format);
   assert.match(text,/Generated · AI · test-provider · test-model/);
   assert.match(text,/Generated · Demo · 有限模板/);
   assert.match(text,/User Edited · 用户编辑/);assert.match(text,/Restored · 旧版本恢复/);
   assert.match(text,/原市场：美国 · 来源版本 V1/);
   assert.match(text,/处理来源：Demo · 有限模板/);assert.match(text,/副本时间：2026-10-06/);
   assert.match(text,/Human review required/);
 }
 const backup=JSON.parse(projectExport({...p,creatives:[edited]},'json'));
 assert.equal(backup.schemaVersion,2);
 assert.deepEqual(parseProjects(JSON.stringify([backup.project]))[0],JSON.parse(JSON.stringify({...p,creatives:[edited]})));
 const legacy={...c,versions:undefined,generation:undefined};
 assert.match(projectExport({...p,creatives:[legacy],generation:c.generation},'txt'),/旧记录未记录处理来源/);
 assert.match(projectExport({...p,isExample:true,creatives:[legacy]},'txt'),/旧记录未记录处理来源/);
 assert.match(projectExport({...p,isExample:true,caseId:featuredCaseId,creatives:[legacy]},'txt'),/Curated · 精选人工练习/);
});

test('Batch usage signals validate all targets before saving and persist in one write',()=>{
 const p=project();const c=p.creatives[0];const edited=reviseCreative(c,{...contentOf(c),hook:'New opening'},'edited','Edit',at);
 edited.localizations=[{id:'local',sourceMarket:'US',targetMarket:'GB',language:'en',tone:'自然清晰',createdAt:at,sourceVersion:1,original:contentOf(c),content:contentOf(c),mode:'mock',notes:[]}];
 const full={...p,creatives:[edited]};const versions=versionsOf(edited,at);
 const contexts=[{creativeId:c.id,versionId:versions[1].id},{creativeId:c.id,versionId:versions[0].id,localizationId:'local'}];
 let stored=JSON.stringify([full]);let writes=0;
 const repo=new LocalStorageProjectRepository({getItem:()=>stored,setItem:(_,v)=>{writes++;stored=v;}});
 repo.save(appendSignals(full,'export',contexts),full.updatedAt);
 assert.equal(writes,1);assert.equal(usefulCounts(repo.list()).export,2);assert.equal(full.signals,undefined);
 assert.throws(()=>appendSignals(full,'copy',[contexts[0],{...contexts[1],versionId:versions[1].id}]),/来源不一致/);
 assert.throws(()=>appendSignals(full,'copy',[contexts[0],{...contexts[0],creativeId:'missing'}]));
 assert.equal(full.signals,undefined);
 const failed=new LocalStorageProjectRepository({getItem:()=>stored,setItem:()=>{throw new Error('quota');}});
 assert.throws(()=>failed.save(appendSignals(full,'copy',contexts)),/quota/);
 assert.equal(usefulCounts(failed.list()).copy,0);
 const stale={...full,signals:[{id:'stale',type:'copy' as const,creativeId:c.id,versionId:versions[1].id,localizationId:'local',at}]};
 assert.equal(usefulCounts([stale]).useful,0);
});
