import { isQualityReview } from './quality.ts';
import { validateInput } from './mock.ts';
import { countries, languages, directionIds, type CreativeContent, type Project } from './types.ts';

export const STORAGE_KEY = 'adpilot-projects-v1';
const record = (v: unknown): v is Record<string,unknown> => !!v && typeof v==='object' && !Array.isArray(v);
const date = (v: unknown) => typeof v==='string' && Number.isFinite(Date.parse(v));
const text = (v: unknown) => typeof v==='string' && v.length<=12000;
export function isCreativeContent(v: unknown): v is CreativeContent {
  if(!record(v)) return false;
  return ['direction','subtitle','coreBenefit','hook','body','cta','rationale'].every(k=>text(v[k])) &&
    ['concept','buyingReason','firstFrame','props','evidence','headline'].every(k=>v[k]===undefined||text(v[k])) &&
    Array.isArray(v.script) && v.script.length>=1 && v.script.length<=20 && v.script.every(s=>record(s)&&['time','visual','voiceover'].every(k=>text(s[k]))&&['title','subtitle','sound'].every(k=>s[k]===undefined||text(s[k])));
}
export function isProject(value: unknown): value is Project {
  if(!record(value))return false;
  const x=value;
  if(typeof x.id!=='string'||!x.id||!date(x.createdAt)||!date(x.updatedAt)||!Number.isInteger(x.revision)||Number(x.revision)<0||!record(x.input))return false;
  try { if(validateInput(x.input as Project['input']))return false; } catch { return false; }
  if(x.selectedDirection!==undefined&&!directionIds.includes(x.selectedDirection as typeof directionIds[number]))return false;
  if(x.signals!==undefined&&(!Array.isArray(x.signals)||new Set(x.signals.map(s=>record(s)?s.id:undefined)).size!==x.signals.length||!x.signals.every(s=>record(s)&&typeof s.id==='string'&&['save','copy','export','iterate','localize'].includes(String(s.type))&&typeof s.creativeId==='string'&&typeof s.versionId==='string'&&(s.localizationId===undefined||typeof s.localizationId==='string')&&date(s.at))))return false;
  if(x.status!==undefined&&!['draft','active','archived'].includes(String(x.status)))return false;
  if(x.userId!==undefined&&typeof x.userId!=='string')return false;
  if(x.isExample!==undefined&&typeof x.isExample!=='boolean')return false;
  if(x.caseId!==undefined&&typeof x.caseId!=='string')return false;
  if(x.generation!==undefined&&(!record(x.generation)||!['mock','ai'].includes(String(x.generation.mode))||!date(x.generation.generatedAt)||(x.generation.mode==='ai'&&(!text(x.generation.model)||!text(x.generation.provider)))))return false;
  if(x.reviews!==undefined&&(!record(x.reviews)||!Object.values(x.reviews).every(isQualityReview)))return false;
  if(!Array.isArray(x.creatives)||x.creatives.length>100||new Set(x.creatives.map(c=>record(c)?c.id:undefined)).size!==x.creatives.length)return false;
  return x.creatives.every(c=>{
    if(!record(c)||!isCreativeContent(c as unknown)||typeof c.id!=='string'||!c.id)return false;
    if(c.directionId!==undefined&&!directionIds.includes(c.directionId as typeof directionIds[number]))return false;
    if(c.createdAt!==undefined&&!date(c.createdAt)||c.updatedAt!==undefined&&!date(c.updatedAt))return false;
    if(c.generation!==undefined&&!isGeneration(c.generation))return false;
    if(c.savedVersions!==undefined&&(!Array.isArray(c.savedVersions)||!c.savedVersions.every(id=>typeof id==='string'&&Array.isArray(c.versions)&&c.versions.some(v=>record(v)&&v.id===id))))return false;
    if(c.favorite!==undefined&&typeof c.favorite!=='boolean')return false;
    if(c.source!==undefined&&!['generated','edited','improved','restored'].includes(String(c.source)))return false;
    if(c.versions!==undefined){
      if(!Array.isArray(c.versions)||!c.versions.length)return false;
      let previous=0;
      const valid=c.versions.every(v=>{
        if(!record(v)||typeof v.id!=='string'||!date(v.createdAt)||!Number.isInteger(v.number)||Number(v.number)!==previous+1||!['generated','edited','improved','restored'].includes(String(v.source))||!text(v.label)||!isCreativeContent(v.content))return false;
        if(v.score!==undefined&&!isScore(v.score)||v.generation!==undefined&&!isGeneration(v.generation)||v.changeNotes!==undefined&&(!Array.isArray(v.changeNotes)||!v.changeNotes.every(text)))return false;
        previous=Number(v.number);return true;
      });
      if(!valid||new Set(c.versions.map(v=>record(v)?v.id:undefined)).size!==c.versions.length)return false;
    }
    if(c.score!==undefined){
      const s=c.score;
      if(!record(s)||s.method!=='heuristic-v1'||!date(s.scoredAt)||typeof s.snapshot!=='string'||typeof s.total!=='number'||!Number.isFinite(s.total)||s.total<0||s.total>100||!Array.isArray(s.dimensions)||s.dimensions.length!==7||!s.dimensions.every(d=>record(d)&&typeof d.score==='number'&&Number.isFinite(d.score)&&d.score>=0&&d.score<=100&&['key','label','reason','suggestion'].every(k=>text(d[k]))))return false;
    }
    if(c.localizations!==undefined&&(!Array.isArray(c.localizations)||!c.localizations.every(l=>record(l)&&typeof l.id==='string'&&Object.hasOwn(countries,String(l.sourceMarket))&&Object.hasOwn(countries,String(l.targetMarket))&&Object.hasOwn(languages,String(l.language))&&text(l.tone)&&date(l.createdAt)&&Number.isInteger(l.sourceVersion)&&Number(l.sourceVersion)>0&&['mock','ai'].includes(String(l.mode))&&isCreativeContent(l.original)&&isCreativeContent(l.content)&&(l.generation===undefined||isGeneration(l.generation))&&['changedElements','warnings'].every(k=>l[k]===undefined||Array.isArray(l[k])&&(l[k] as unknown[]).every(text))&&Array.isArray(l.notes)&&l.notes.every(text))))return false;
    if(Array.isArray(c.localizations)){const ids=c.localizations.map(l=>record(l)?l.id:undefined);if(new Set(ids).size!==ids.length)return false;for(const l of c.localizations){if(!record(l))return false;const numbers=Array.isArray(c.versions)?c.versions.map(v=>record(v)?v.number:undefined):[1];if(!numbers.includes(l.sourceVersion))return false;}}
    return true;
  });
}
export function parseProjects(raw: string | null): Project[] {
  if(raw===null)return [];
  const parsed: unknown=JSON.parse(raw);
  if(!Array.isArray(parsed)||!parsed.every(isProject)||new Set(parsed.map(p=>p.id)).size!==parsed.length)throw new Error('项目数据无法读取。请先导出原始数据备份，不会覆盖已有数据。');
  return parsed;
}
export type StoragePort = Pick<Storage,'getItem'|'setItem'>;
export interface ProjectRepository {
  list(): Project[];
  save(project: Project, expectedUpdatedAt?: string): void;
  remove(id: string): void;
  merge(projects: Project[]): number;
}
export class LocalStorageProjectRepository implements ProjectRepository {
  private readonly storage: StoragePort;
  constructor(storage: StoragePort) { this.storage=storage; }
  list() { return parseProjects(this.storage.getItem(STORAGE_KEY)); }
  save(project: Project, expectedUpdatedAt?: string) {
    if(!isProject(project))throw new Error('项目数据未通过校验，未覆盖原有内容。');
    const projects=this.list();const previous=projects.find(p=>p.id===project.id);
    if(expectedUpdatedAt&&(!previous||previous.updatedAt!==expectedUpdatedAt))throw new Error('项目已在其他页面修改或删除，请刷新后重试。');
    const next=previous?projects.map(p=>p.id===project.id?project:p):[project,...projects];
    this.storage.setItem(STORAGE_KEY,JSON.stringify(next));
  }
  remove(id: string) { this.storage.setItem(STORAGE_KEY,JSON.stringify(this.list().filter(p=>p.id!==id))); }
  merge(incoming: Project[]) {
    if(!incoming.every(isProject))throw new Error('备份内容未通过校验');
    const existing=this.list();const ids=new Set(existing.map(p=>p.id));const additions: Project[]=[];
    for(const p of incoming){if(!ids.has(p.id)){ids.add(p.id);additions.push(p);}}
    this.storage.setItem(STORAGE_KEY,JSON.stringify([...existing,...additions]));return additions.length;
  }
}
export function readProjects() { return new LocalStorageProjectRepository(localStorage).list(); }
export function writeProjects(projects: Project[]) {
  if(!projects.every(isProject))throw new Error('项目数据未通过校验');
  localStorage.setItem(STORAGE_KEY,JSON.stringify(projects));
}

function isGeneration(v:unknown){return record(v)&&['mock','ai'].includes(String(v.mode))&&date(v.generatedAt)&&(v.mode!=='ai'||text(v.model)&&text(v.provider));}
function isScore(s:unknown){return record(s)&&s.method==='heuristic-v1'&&date(s.scoredAt)&&typeof s.snapshot==='string'&&typeof s.total==='number'&&Number.isFinite(s.total)&&s.total>=0&&s.total<=100&&Array.isArray(s.dimensions)&&s.dimensions.length===7&&s.dimensions.every(d=>record(d)&&typeof d.score==='number'&&Number.isFinite(d.score)&&d.score>=0&&d.score<=100&&['key','label','reason','suggestion'].every(k=>text(d[k])));}
