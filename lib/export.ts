import type { Creative, Project } from './types.ts';
import { countries } from './types.ts';
import { creativeText } from './mock.ts';
import { versionsOf } from './creative.ts';
import { outputLanguage } from './intelligence.ts';
import { generationLabel, versionSourceLabel } from './provenance.ts';
import { featuredCaseId } from './featured-case.ts';

export function projectExport(p: Project, format: 'txt'|'md'|'json') {
  if(format==='json')return JSON.stringify({schemaVersion:2,exportedAt:new Date().toISOString(),project:p},null,2);
  const title=`Adora · ${p.input.name} · ${countries[p.input.country].name} · ${p.input.platform}`;
  const brief=[`商品卖点：${p.input.benefits}`,`目标用户：${p.input.audience}`,`产品类别：${p.input.category}`,`输出语言：${outputLanguage(p.input)}`,`目标：${p.input.objective??'旧记录未记录目标'}`,`语气：${p.input.tone??p.input.style}`,...([
    ['商品描述',p.input.description],['价格',p.input.price],['优惠',p.input.offer],['使用情境',p.input.usageContext],['购买顾虑',p.input.purchaseConcern],['期望行动',p.input.desiredCta],['证据资料与限制 · 未自动核实',p.input.evidenceSources],['商品链接',p.input.productUrl],
  ] as const).filter(([,value])=>value?.trim()).map(([label,value])=>`${label}：${value}`)].join('\n');
  const assets=p.creatives.map(c=>{
    const version=versionsOf(c,p.createdAt).at(-1)!;
    const source=c.versions?.length?version.source:c.source??version.source;
    const provenance=`当前创意 V${version.number} · ${versionSourceLabel(source,version.generation,p.caseId===featuredCaseId)}\n版本时间：${version.createdAt}${c.versions?.length?'':'（旧记录使用项目创建时间）'}`;
    const localized=(c.localizations??[]).map(l=>`\n\n本地化：${countries[l.targetMarket].name} / ${l.language} / ${l.tone}\n原市场：${countries[l.sourceMarket].name} · 来源版本 V${l.sourceVersion}\n处理来源：${generationLabel(l.generation??{mode:l.mode,generatedAt:l.createdAt})}\n副本时间：${l.createdAt}\n${creativeText({...l.content,id:l.id})}\n调整说明：${l.notes.join('\n')}\n变化：${l.changedElements?.join('；')??'旧记录未记录变化项'}\n复核：${l.warnings?.join('\n')??'Localization is based on language and creative conventions. Human review is recommended.'}`).join('');
    return `${provenance}\n\n${creativeText(c)}${localized}`;
  }).join('\n\n---\n\n');
  return `${format==='md'?'# ':''}${title}\n\n广告资产与本地化副本 · 请人工审核后使用\n\n${format==='md'?'## ':''}Campaign Brief\n${brief}\n\n${assets}`;
}
export function downloadFile(content: string, filename: string, type='text/plain;charset=utf-8') {
  const url=URL.createObjectURL(new Blob([content],{type}));const a=document.createElement('a');a.href=url;a.download=filename.replace(/[\\/:*?"<>|]/g,'_');a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
export function currentCreativeText(c: Creative) { return creativeText(c); }
