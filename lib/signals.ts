import type { Project, UsefulSignal } from './types.ts';
import { versionsOf } from './creative.ts';
export type SignalContext={projectId:string;creativeId:string;versionId:string;localizationId?:string};
type SignalTarget=Omit<SignalContext,'projectId'>;
export function isSignalTarget(p:Project,context:SignalTarget):boolean {
 const c=p.creatives.find(c=>c.id===context.creativeId);
 const version=c&&versionsOf(c,p.createdAt).find(v=>v.id===context.versionId);
 if(!c||!version)return false;
 return context.localizationId===undefined||!!c.localizations?.some(l=>l.id===context.localizationId&&l.sourceVersion===version.number);
}
export function appendSignals(p:Project,type:UsefulSignal['type'],contexts:SignalTarget[]):Project {
 if(!contexts.length)return p;
 if(!contexts.every(c=>isSignalTarget(p,c)))throw new Error('记录所对应的版本已不存在或本地化来源不一致。');
 const at=new Date().toISOString();
 const signals=contexts.map(({creativeId,versionId,localizationId}):UsefulSignal=>({id:crypto.randomUUID(),type,creativeId,versionId,localizationId,at}));
 return {...p,signals:[...(p.signals??[]),...signals]};
}
export function appendSignal(p:Project,type:UsefulSignal['type'],context:Omit<SignalContext,'projectId'>):Project {
 return appendSignals(p,type,[context]);
}
export function usefulCounts(projects:Project[]){
 const sets=Object.fromEntries(['save','copy','export','iterate','localize','useful'].map(k=>[k,new Set<string>()]));
 for(const p of projects)for(const s of p.signals??[]){if(!isSignalTarget(p,s))continue;const key=`${p.id}/${s.creativeId}/${s.versionId}/${s.localizationId??''}`;sets[s.type].add(key);sets.useful.add(key);}
 return Object.fromEntries(Object.entries(sets).map(([k,v])=>[k,v.size]));
}
export function projectProgress(p:Project){
 return [{label:'Brief',done:true},{label:'Directions',done:!!p.selectedDirection||p.creatives.length>0},{label:'Generate',done:p.creatives.length>0},{label:'Evaluate',done:p.creatives.some(c=>!!c.score)||!!p.reviews&&Object.keys(p.reviews).length>0},{label:'Improve',done:p.creatives.some(c=>c.versions?.some(v=>v.source==='improved'))},{label:'Localize',done:p.creatives.some(c=>!!c.localizations?.length)}];
}
