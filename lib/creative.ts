import { directionOf } from './directions.ts';
import { changedElements } from './diff.ts';
import type { Creative, CreativeContent, CreativeVersion, Project, VersionSource, DirectionId, GenerationInfo } from './types.ts';

export function contentOf(c: CreativeContent): CreativeContent {
  const { direction,subtitle,concept,buyingReason,firstFrame,props,evidence,coreBenefit,hook,body,headline,cta,script,rationale } = c;
  return structuredClone({direction,subtitle,concept,buyingReason,firstFrame,props,evidence,coreBenefit,hook,body,headline,cta,script,rationale});
}
export function contentSnapshot(c: CreativeContent) { return JSON.stringify(contentOf(c)); }
export function synchronizeEditedScript(previous: CreativeContent, draft: CreativeContent): CreativeContent {
  const content=contentOf(draft);
  content.script=content.script.map((scene,index)=>{
    const original=previous.script[index];
    if(!original)return scene;
    if(index===0&&draft.hook!==previous.hook)return {...scene,voiceover:scene.voiceover===previous.hook?draft.hook:scene.voiceover,subtitle:scene.subtitle===previous.hook?draft.hook:scene.subtitle};
    if(index===content.script.length-1&&draft.cta!==previous.cta)return {...scene,voiceover:scene.voiceover===previous.cta?draft.cta:scene.voiceover,subtitle:scene.subtitle===previous.cta?draft.cta:scene.subtitle};
    return scene;
  });
  return content;
}
export function versionsOf(c: Creative, createdAt: string): CreativeVersion[] {
  return c.versions?.length ? c.versions : [{id:`${c.id}-v1`,number:1,createdAt,source:'generated',label:'初始生成',content:contentOf(c),generation:c.generation,score:c.score}];
}
export function reviseCreative(c: Creative, content: CreativeContent, source: VersionSource, label: string, createdAt = new Date().toISOString()): Creative {
  const versions=versionsOf(c,c.createdAt??createdAt).map(v=>v.id===versionsOf(c,c.createdAt??createdAt).at(-1)!.id&&c.score?.snapshot===contentSnapshot(c)?{...v,score:c.score}:v);
  const number=versions.at(-1)!.number+1;
  return {...c,...contentOf(content),source,updatedAt:createdAt,generation:undefined,score:undefined,versions:[...versions,{id:crypto.randomUUID(),number,createdAt,source,label,content:contentOf(content),changeNotes:changedElements(c,content)}]};
}
export function replaceGeneration(project: Project, creatives: Creative[], generatedAt: string): Creative[] {
  return creatives.map((c,index): Creative=>{
    const previous=project.creatives[index];
    return previous ? reviseCreative({...previous,versions:versionsOf(previous,project.createdAt)},c,'generated','重新生成',generatedAt) : {...c,versions:versionsOf(c,generatedAt),source:'generated'};
  }).concat(project.creatives.slice(creatives.length));
}
export function duplicateCreative(c: Creative): Creative {
  const copy={...contentOf(c),id:crypto.randomUUID(),direction:`${c.direction} · 副本`,source:'generated' as const};
  return {...copy,versions:versionsOf(copy,new Date().toISOString())};
}
export function duplicateProject(p: Project): Project {
  const now=new Date().toISOString();
  return {...p,id:crypto.randomUUID(),createdAt:now,updatedAt:now,input:{...p.input,name:`${p.input.name.slice(0,74)} · 副本`},caseId:undefined,reviews:undefined,signals:[],creatives:p.creatives.map(c=>({...structuredClone(c),id:crypto.randomUUID(),savedVersions:[]}))};
}

export function mergeDirectionGeneration(project:Project, creative:Creative, direction:DirectionId, generation:GenerationInfo):Creative[] {
 const at=generation.generatedAt;const index=project.creatives.findIndex((c,i)=>directionOf(c,i)===direction);
 const previous=project.creatives[index];let next:Creative;
 if(previous){next=reviseCreative({...previous,versions:versionsOf(previous,project.createdAt)},creative,'generated','重新生成所选方向',at);next.versions=next.versions!.map((v,i,a)=>i===a.length-1?{...v,generation}:v);}
 else{next={...creative,id:crypto.randomUUID(),source:'generated',createdAt:at,generation};next.versions=versionsOf(next,at);}
 next={...next,directionId:direction,generation,updatedAt:at};return previous?project.creatives.map((c,i)=>i===index?next:c):[...project.creatives,next];
}
