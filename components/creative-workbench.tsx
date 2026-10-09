'use client';
import { useEffect, useRef, useState } from 'react';
import { Heart, Copy, Trash2, X } from 'lucide-react';
import { useProjects } from '@/components/project-provider';
import { CreativeEditor } from '@/components/creative-editor';
import { CreativeCompare } from '@/components/creative-compare';
import { CopyButton } from '@/components/copy-button';
import { appendSignal } from '@/lib/signals';
import { changedElements, focusedImprovement, localizationWarnings } from '@/lib/changes';
import { contentOf, contentSnapshot, duplicateCreative, reviseCreative, versionsOf } from '@/lib/creative';
import { countries, languages, type Country, type Language, type Creative, type CreativeContent, type Project, type Localization, type GenerationInfo } from '@/lib/types';
import { scoreDisclaimer } from '@/lib/score';
import { creativeText } from '@/lib/mock';
import { marketRules } from '@/lib/intelligence';
import { track } from '@/lib/analytics';
import { improveDemo, improvements, mockLocalizationProvider, heuristicAnalysisProvider, type Improvement } from '@/services/ai/providers';
import { isCreativeContent } from '@/lib/storage';

type Props={project: Project;creative: Creative;busy: boolean;onSelect:(index: number)=>void};
export function CreativeWorkbench({project:p,creative:c,busy,onSelect}: Props) {
  const {update,error}=useProjects();const [message,setMessage]=useState('');const [failed,setFailed]=useState(false);
  const [pending,setPending]=useState('');const [mode,setMode]=useState<'mock'|'ai'>('mock');const [ai,setAi]=useState(false);
  const [improvement,setImprovement]=useState<Improvement>('hook');
  const [selected,setSelected]=useState<string[]>([]);const [preview,setPreview]=useState<string>('');
  const [target,setTarget]=useState<Country>(p.input.country==='GB'?'US':'GB');const [language,setLanguage]=useState<Language>('en');const [tone,setTone]=useState('自然清晰');
  const [localizedId,setLocalizedId]=useState('');const deleting=useRef<HTMLDialogElement>(null);const abort=useRef<AbortController|null>(null);const mounted=useRef(true);
  const locked=busy||!!pending||!!error;
  const versions=versionsOf(c,p.createdAt);const latest=versions.at(-1)!;const before=versions.at(-2);
  const compareVersions=p.creatives.flatMap(x=>versionsOf(x,p.createdAt).map(v=>({...v.content,id:v.id,compareLabel:`${x.direction} · V${v.number} · ${v.source}`,signal:{projectId:p.id,creativeId:x.id,versionId:v.id},generation:v.generation,score:v.id===versionsOf(x,p.createdAt).at(-1)!.id?x.score:v.score})));const viewed=versions.find(v=>v.id===preview);
  const score=c.score?.snapshot===contentSnapshot(c)?c.score:undefined;
  const localized=c.localizations?.find(l=>l.id===localizedId)??c.localizations?.at(-1);
  useEffect(()=>{
    mounted.current=true;const service=new AbortController();
    setPreview(new URLSearchParams(window.location.search).get('version')??'');setLocalizedId(new URLSearchParams(window.location.search).get('localization')??'');
    setSelected((new URLSearchParams(window.location.search).get('compare')??'').split(',').filter(Boolean).slice(0,3));
    fetch('/api/generate',{signal:service.signal}).then(r=>r.json()).then(data=>setAi(data.available===true)).catch(()=>{});
    return ()=>{mounted.current=false;service.abort();abort.current?.abort();};
  },[]);
  const comparisonEntries=[...compareVersions,...p.creatives.flatMap(x=>(x.localizations??[]).map(l=>({...l.content,id:l.id,compareLabel:`${x.direction} · Localized ${l.targetMarket} · 来源 V${l.sourceVersion}`,generation:l.generation??{mode:l.mode,generatedAt:l.createdAt},signal:{projectId:p.id,creativeId:x.id,versionId:versionsOf(x,p.createdAt).find(v=>v.number===l.sourceVersion)!.id,localizationId:l.id},localizationLabel:`${l.sourceMarket} → ${l.targetMarket} · ${l.language} · ${l.tone}`})))];
  function report(text: string, failure=false){if(mounted.current){setMessage(text);setFailed(failure);}}
  function save(next: Creative,text: string) {
    next={...next,versions:next.versions??versions};
    try {let project={...p,creatives:p.creatives.map(x=>x.id===c.id?next:x),updatedAt:new Date().toISOString()};const versionId=versionsOf(next,p.createdAt).at(-1)!.id;if((next.versions?.length??1)>versions.length&&next.source==='improved')project=appendSignal(project,'iterate',{creativeId:c.id,versionId});if((next.localizations?.length??0)>(c.localizations?.length??0))project=appendSignal(project,'localize',{creativeId:c.id,versionId,localizationId:next.localizations!.at(-1)!.id});if((next.savedVersions?.length??0)>(c.savedVersions?.length??0))project=appendSignal(project,'save',{creativeId:c.id,versionId});update(project,p.updatedAt);report(text);return true;}
    catch(e){report((e as Error).message,true);return false;}
  }
  function edit(content: CreativeContent){const saved=save(reviseCreative({...c,versions},content,'edited','手动编辑'),'已保存新版本 · User Edited');if(saved)track('creative_edited');return saved;}
  function duplicate(){try{const copy=duplicateCreative(c);update({...p,creatives:[...p.creatives,copy],updatedAt:new Date().toISOString()},p.updatedAt);onSelect(p.creatives.length);}catch(e){report((e as Error).message,true);}}
  function remove(){try{const remaining=p.creatives.filter(x=>x.id!==c.id);update({...p,creatives:remaining,signals:p.signals?.filter(s=>s.creativeId!==c.id),updatedAt:new Date().toISOString()},p.updatedAt);onSelect(0);deleting.current?.close();}catch(e){report((e as Error).message,true);}}
  async function run(action:'improve'|'localize', choice:Improvement=improvement) {
    if(locked)return;setPending(action);report('');
    const controller=new AbortController();abort.current=controller;const timeout=setTimeout(()=>controller.abort(new DOMException('超时','TimeoutError')),70000);
    try {
      let result: {content:CreativeContent;notes?:string[];generation?:GenerationInfo};
      if(mode==='ai'){
        const response=await fetch('/api/creative',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action,input:p.input,creative:contentOf(c),improvement:choice,targetMarket:target,language,tone}),signal:controller.signal});
        const data:unknown=await response.json();
        if(!response.ok)throw new Error(data&&typeof data==='object'&&'error' in data?String(data.error):'AI 操作未完成');
        const value=data as {content:unknown;notes:unknown;mode?:unknown;model?:unknown;provider?:unknown};
        if(!isCreativeContent(value.content)||action==='localize'&&(!Array.isArray(value.notes)||!value.notes.every(n=>typeof n==='string')))throw new Error('返回格式不完整');
        if(value.mode!=='ai'||typeof value.model!=='string'||typeof value.provider!=='string')throw new Error('AI 来源信息不完整');
        result={content:value.content,notes:Array.isArray(value.notes)?value.notes:[],generation:{mode:'ai',model:value.model,provider:value.provider,generatedAt:new Date().toISOString()}};
      }else{
        result=action==='improve'?{content:improveDemo(c,p.input,choice)}:await mockLocalizationProvider.localize({input:p.input,creative:c,targetMarket:target,language,tone});
      }
      if(!mounted.current||controller.signal.aborted)return;
      result.generation??={mode:'mock',generatedAt:new Date().toISOString()};
      if(action==='improve'){
        result.content=focusedImprovement(c,result.content,choice);
        if(!changedElements(c,result.content).length){report('未产生可保存的内容变化；请尝试其他目标或手动编辑。');return;}
        const next=reviseCreative({...c,versions},result.content,choice==='regenerate'?'generated':'improved',`${choice==='regenerate'?'单套重新生成':improvements[choice]} · ${mode==='ai'?'AI':'Demo'}`);
        next.generation=result.generation;
        next.versions=next.versions!.map((v,i,a)=>i===a.length-1?{...v,generation:result.generation}:v);
        if(save(next,'已保存新版本；前后变化见下方。')){track(choice==='regenerate'?'creative_regenerated':'creative_improved',{mode});}
      }else{
        const localization:Localization={id:crypto.randomUUID(),sourceMarket:p.input.country,targetMarket:target,language,tone,createdAt:new Date().toISOString(),sourceVersion:versions.at(-1)!.number,original:contentOf(c),content:result.content,generation:result.generation,notes:result.notes??[],changedElements:changedElements(c,result.content),warnings:localizationWarnings(c,result.content,p.input,mode),mode};
        if(save({...c,localizations:[...(c.localizations??[]),localization]},'本地化已保存；原始创意保持可用。')){setLocalizedId(localization.id);track('creative_localized',{mode});}
      }
    }catch(e){if(mounted.current)report(controller.signal.aborted?(controller.signal.reason?.name==='TimeoutError'?'等待超时；原有版本保留，可切换本地演示。':'已取消，原有版本保留。'):`${(e as Error).message}；可切换本地演示重试。`,!controller.signal.aborted||controller.signal.reason?.name==='TimeoutError');}
    finally{clearTimeout(timeout);if(mounted.current){setPending('');abort.current=null;}}
  }
  return <section id="creative-workbench" className="workbench" aria-label="创意编辑与迭代">
    <div className="workbench-actions"><div><span className="pill">V{versions.at(-1)!.number} · {c.source==='edited'?'User Edited':c.source==='improved'?'Improved':c.source==='restored'?'Restored':p.isExample?'Curated':'Generated'}</span><button className={`button secondary ${c.favorite?'favorited':''}`} aria-pressed={!!c.favorite} disabled={locked} onClick={()=>save({...c,favorite:!c.favorite},c.favorite?'已取消收藏':'已收藏')}><Heart size={15}/> {c.favorite?'已收藏':'收藏'}</button></div><div><button className="button secondary" disabled={locked||c.savedVersions?.includes(latest.id)} onClick={()=>{if(save({...c,savedVersions:[...(c.savedVersions??[]),latest.id]},'当前版本已标记为保存产出'))track('creative_saved');}}>{c.savedVersions?.includes(latest.id)?'此版本已保存':'保存此版本'}</button><CreativeEditor creative={c} disabled={locked} onSave={edit}/><button className="button secondary" disabled={locked} onClick={()=>run('improve','regenerate')}>重新生成这套</button><button className="button secondary" disabled={locked||p.creatives.length>=100} onClick={duplicate}><Copy size={15}/>复制为新创意</button><button className="button secondary" disabled={locked} onClick={()=>deleting.current?.showModal()}><Trash2 size={15}/>删除创意</button></div></div>
    {message&&<p role={failed?'alert':'status'} className={failed?'error-banner':'notice-banner'}>{message}</p>}
    <div className="inspector-grid"><section className="panel inspector"><div className="section-heading"><h2>Creative Quality Score</h2><button className="text-button" disabled={locked} onClick={()=>{if(save({...c,score:heuristicAnalysisProvider.analyze(c,p.input)},'规则质量评分已保存'))track('creative_scored');}}>{score?'重新评分':'评分当前版本'}</button></div>
      <p className="page-description">启发式规则 · 7 个维度 · 0–100</p>{score?<><div className="score-total"><strong>{score.total}</strong><span>/100</span></div>{score.dimensions.map(d=><details className="score-dimension" key={d.key}><summary><span>{d.label}</span><meter min={0} max={100} value={d.score} aria-label={`${d.label} ${d.score}/100`}/><span>{d.score}</span></summary><p>{d.reason}</p><p>建议：{d.suggestion}</p></details>)}</>:<p className="quiet-empty">先评分，查看结构问题和修改建议。</p>}<p className="assessment-note">{scoreDisclaimer}</p>
    </section><section className="panel inspector"><h2>Improve Creative</h2><p className="page-description">每次改进创建一个新版本，便于回看与比较。</p><label className="field">改进方向<select value={improvement} disabled={locked} onChange={e=>setImprovement(e.target.value as Improvement)}>{Object.entries(improvements).filter(([key])=>!['regenerate','ugc','premium','emotional'].includes(key)).map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></label><label className="field">处理方式<select value={mode} disabled={locked} onChange={e=>setMode(e.target.value as 'mock'|'ai')}><option value="mock">本地演示 · 模板变换</option><option value="ai" disabled={!ai}>真实 AI{!ai?' · 尚未就绪':''}</option></select></label><p className="assessment-note">{mode==='mock'?'演示仅进行有限的结构和表达变换，未知卖点不翻译、不核实事实。':'点击后发送 Brief 和当前创意到配置服务，可能产生费用，与生成共用每小时 6 次请求额度。'}</p><button className="button primary" disabled={locked} onClick={()=>run('improve')}>{pending==='improve'?'正在改进…':'生成改进版本'}</button>{pending&&<button className="button secondary" onClick={()=>abort.current?.abort()}>取消操作</button>}
    </section></div>
    {latest.source==='improved'&&before&&<section id="iteration-result" className="panel inspector iteration-result"><h2>Before / After</h2><h3>What Changed</h3><ul>{(latest.changeNotes??changedElements(before.content,latest.content)).map(note=><li key={note}>{note}</li>)}</ul><p className="assessment-note">修改保留独立编辑过的字幕与旁白；新版本需重新评分。</p><CreativeCompare input={p.input} creatives={[{...before.content,id:before.id,generation:before.generation,compareLabel:`Before · V${before.number}`,signal:{projectId:p.id,creativeId:c.id,versionId:before.id},score:before.score},{...latest.content,id:latest.id,generation:latest.generation,compareLabel:`After · V${latest.number}`,signal:{projectId:p.id,creativeId:c.id,versionId:latest.id},score:c.score}]} label="本次改进"/></section>}
    <details className="panel inspector version-history" open={!!preview}><summary>版本历史 · {versions.length} 个版本</summary><div className="version-list">{versions.map(v=><button className="button secondary" key={v.id} onClick={()=>setPreview(v.id)} aria-pressed={preview===v.id}>V{v.number} · {v.label}</button>)}</div>{viewed&&<><div className="version-preview"><h3>V{viewed.number} · {new Date(viewed.createdAt).toLocaleString('zh-CN')}</h3><pre>{creativeText({...viewed.content,id:viewed.id})}</pre><div className="dialog-actions"><CopyButton text={creativeText({...viewed.content,id:viewed.id})} label="旧版本" signal={{projectId:p.id,creativeId:c.id,versionId:viewed.id}}/><button className="button secondary" disabled={locked||viewed.id===versions.at(-1)!.id} onClick={()=>save(reviseCreative({...c,versions},viewed.content,'restored',`恢复 V${viewed.number}`),'旧内容已恢复为新版本')}>恢复为新版本</button></div></div>{viewed.id!==versions.at(-1)!.id&&<CreativeCompare input={p.input} creatives={[{...viewed.content,id:viewed.id,compareLabel:`V${viewed.number} · ${viewed.content.direction}`,score:viewed.score,signal:{projectId:p.id,creativeId:c.id,versionId:viewed.id}},{...c,compareLabel:`V${versions.at(-1)!.number} · ${c.direction}`,signal:{projectId:p.id,creativeId:c.id,versionId:latest.id}}]} label="Before / After"/>}</>}</details>
    <section className="panel inspector"><h2>Compare · 选择 2–3 个版本</h2><div className="compare-choices">{comparisonEntries.map(x=><label key={x.id}><input type="checkbox" checked={selected.includes(x.id)} disabled={!selected.includes(x.id)&&selected.length>=3} onChange={e=>{const next=e.target.checked?[...selected,x.id]:selected.filter(id=>id!==x.id);setSelected(next);if(next.length>=2)track('creative_compared',{count:next.length});}}/>{x.compareLabel}</label>)}</div>{selected.filter(id=>comparisonEntries.some(x=>x.id===id)).length>=2&&<CreativeCompare input={p.input} creatives={comparisonEntries.filter(x=>selected.includes(x.id))}/>}</section>
    <section id="localize" className="panel inspector localization"><h2>Localize Creative</h2><p className="page-description">来源：{countries[p.input.country].name} · V{versions.at(-1)!.number}。保存本地化副本与调整说明。</p><div className="localize-controls"><label className="field">目标市场<select disabled={locked} value={target} onChange={e=>{const value=e.target.value as Country;setTarget(value);setLanguage(marketRules[value].language);}}>{Object.entries(countries).map(([key,value])=><option key={key} value={key}>{value.name}</option>)}</select></label><label className="field">目标语言<select disabled={locked} value={language} onChange={e=>setLanguage(e.target.value as Language)}>{Object.entries(languages).map(([key,value])=><option key={key} value={key}>{value}</option>)}</select></label><label className="field">语气<select value={tone} disabled={locked} onChange={e=>setTone(e.target.value)}>{['自然清晰','简洁高级','轻松对话'].map(t=><option key={t}>{t}</option>)}</select></label></div><div className="dialog-actions"><span className="assessment-note">处理方式与改进区域一致：{mode==='mock'?'本地模板演示':'真实 AI'}</span><button className="button primary" disabled={locked} onClick={()=>run('localize')}>{pending==='localize'?'正在本地化…':'生成本地化副本'}</button></div>
      {!!c.localizations?.length&&<label className="field">已保存本地化<select value={localized?.id??''} onChange={e=>setLocalizedId(e.target.value)}>{c.localizations.map(l=><option key={l.id} value={l.id}>{countries[l.targetMarket].name} · {languages[l.language]} · 来源 V{l.sourceVersion} · {new Date(l.createdAt).toLocaleString('zh-CN')}</option>)}</select></label>}
      {localized&&<><div className="localization-result"><article><h3>Original · V{localized.sourceVersion}</h3><p className="label-caps">Hook</p><p>{localized.original.hook}</p><p className="label-caps">Primary text</p><p>{localized.original.body}</p><p>{localized.original.cta}</p></article><article lang={localized.language}><h3>Localized · {localized.mode==='mock'?'Demo':'AI'}</h3><p className="label-caps">Hook</p><p>{localized.content.hook}</p><p className="label-caps">Primary text</p><p>{localized.content.body}</p><p>{localized.content.cta}</p><CopyButton text={creativeText({...localized.content,id:localized.id})} label="本地化创意" signal={{projectId:p.id,creativeId:c.id,versionId:versions.find(v=>v.number===localized.sourceVersion)!.id,localizationId:localized.id}}/><details><summary>完整脚本与标题</summary><pre>{creativeText({...localized.content,id:localized.id})}</pre></details></article></div><h3>Changed Elements</h3><ul>{(localized.changedElements??changedElements(localized.original,localized.content)).length?(localized.changedElements??changedElements(localized.original,localized.content)).map(note=><li key={note}>{note}</li>):<li>未检测到广告字段变化；保存目标市场的复核备注。</li>}</ul><h3>Warnings · 人工复核</h3><ul>{(localized.warnings??localizationWarnings(localized.original,localized.content,p.input,localized.mode)).map(note=><li key={note}>{note}</li>)}</ul><h3>Adaptation Notes</h3><ul className="adaptation-notes">{localized.notes.map((note,index)=><li key={index}>{note}</li>)}</ul></>}
    </section>
    <dialog ref={deleting} className="workspace-dialog compact-dialog" aria-labelledby="delete-creative-title"><div className="dialog-heading"><h2 id="delete-creative-title">删除这套创意？</h2><button aria-label="关闭" onClick={()=>deleting.current?.close()}><X size={18}/></button></div><p>「{c.direction}」及版本、本地化将从当前项目移除。可先导出 JSON 备份。</p><div className="dialog-actions"><button autoFocus className="button secondary" onClick={()=>deleting.current?.close()}>保留创意</button><button className="button danger" disabled={locked} onClick={remove}>确认删除</button></div></dialog>
  </section>;
}
