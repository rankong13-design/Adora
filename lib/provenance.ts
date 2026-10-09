import type { GenerationInfo, VersionSource } from './types.ts';

export function generationLabel(generation?:GenerationInfo):string {
  if(generation?.mode==='mock')return 'Demo · 有限模板';
  if(generation?.mode==='ai')return `AI · ${generation.provider??'旧记录未记录供应商'} · ${generation.model??'未记录模型'}`;
  return '旧记录未记录处理来源';
}
export function versionSourceLabel(source:VersionSource,generation?:GenerationInfo,curated=false):string {
  if(source==='edited')return 'User Edited · 用户编辑';
  if(source==='restored')return 'Restored · 旧版本恢复';
  if(curated&&!generation&&source==='generated')return 'Curated · 精选人工练习';
  return `${source==='improved'?'Improved':'Generated'} · ${generationLabel(generation)}`;
}
