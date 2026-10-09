'use client';
import { DirectionChooser } from '@/components/direction-chooser';
import { GenerationControls } from '@/components/generation-controls';
import { GenerationStatus } from '@/components/generation-status';
import { readGenerationResponse, type GenerationProgress } from '@/lib/generation-stream';
import { CreativeWorkbench } from '@/components/creative-workbench';
import { BriefSummary } from '@/components/brief-fields';
import { mergeDirectionGeneration, contentSnapshot } from '@/lib/creative';
import { projectExport, downloadFile } from '@/lib/export';
import { track } from '@/lib/analytics';
import { outputLanguage } from '@/lib/intelligence';
import { QualityPanel } from '@/components/quality-panel';
import Link from 'next/link';
import { use, useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, ChevronDown, Copy, Download, Film, Lightbulb, Sparkles } from 'lucide-react';
import { useProjects } from '@/components/project-provider';
import { diversityWarnings } from '@/lib/diversity';
import { versionsOf } from '@/lib/creative';
import { CopyButton, SignalScope } from '@/components/copy-button';
import { LoadingState, PageHeading } from '@/components/ui';
import { featuredCaseId, productSource } from '@/lib/featured-case';
import { parseGeneratedContent } from '@/lib/generation';
import { directionOf } from '@/lib/directions';
import { countries } from '@/lib/types';
import { creativeText, scriptText } from '@/lib/mock';
import { mockGenerationProvider } from '@/services/ai/providers';
export default function ProjectPage({params}: {params: Promise<{id:string}>}) {
  const {id} = use(params); const {projects,ready,error,update,recordSignals} = useProjects(); const project = projects.find(p=>p.id===id);
  const [active,setActive] = useState(0); const [busy,setBusy] = useState(false); const [message,setMessage] = useState(''); const [copied,setCopied] = useState(false); const [failed,setFailed]=useState(false);
  const controller = useRef<AbortController | null>(null); const mounted = useRef(true);
  const generating=useRef(false);
  const requestedCreative=useRef(false);

  const [progress,setProgress]=useState<GenerationProgress|null>(null);
  const [startedAt,setStartedAt]=useState(0);
  useEffect(()=>{mounted.current=true; requestedCreative.current=false; setBusy(false); generating.current=false; setActive(0); setMessage(''); setFailed(false); return ()=>{mounted.current=false;controller.current?.abort();controller.current=null;};},[id]);
  useEffect(()=>{if(!project||requestedCreative.current)return;requestedCreative.current=true;track('project_reopened');const requested=new URLSearchParams(window.location.search).get('creative');const index=project.creatives.findIndex(c=>c.id===requested);if(index>=0)setActive(index);},[project,id]);
  if(!ready) return <LoadingState/>;
  if(!project) return <div className="page"><div className="empty-state"><h1>没有找到这个项目</h1><p>{error || '项目可能已被删除，或保存在其他浏览器中。'}</p><Link href="/history" className="button primary">返回历史项目</Link></div></div>;
  const p = project; const featured=p.caseId===featuredCaseId; const c = p.creatives[active]??p.creatives[0];
  const signalContext=c?{projectId:p.id,creativeId:c.id,versionId:versionsOf(c,p.createdAt).at(-1)!.id}:undefined;
  async function generate(mode:'mock'|'ai') {
    if(generating.current || featured || !p.selectedDirection) return;
    generating.current=true; setBusy(true); setMessage(''); setFailed(false);
    const abort=new AbortController(); controller.current=abort;
    setStartedAt(Date.now());setProgress(null);
    const deadline=setTimeout(()=>abort.abort(new DOMException('生成等待超时','TimeoutError')),75000);
    try {
      const revision=p.creatives.length?p.revision+1:p.revision;
      const now=new Date().toISOString();
      let creatives; let generation;
      if(mode==='ai') {
        const response=await fetch('/api/generate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({input:p.input,revision,direction:p.selectedDirection}),signal:abort.signal});
        const data=await readGenerationResponse(response,p=>{if(mounted.current&&controller.current===abort)setProgress(p);},abort.signal) as {creatives:unknown;durationMs?:number;generation?:{mode:string;model:string;provider:string;generatedAt:string}};
        creatives=parseGeneratedContent(JSON.stringify({creatives:data.creatives}),revision,p.selectedDirection);
        if(data.generation?.mode!=='ai'||typeof data.generation.model!=='string'||typeof data.generation.provider!=='string'||typeof data.generation.generatedAt!=='string')throw new Error('生成来源信息不完整，请重试。');
        generation={...data.generation,mode:'ai' as const};
        if(mounted.current&&controller.current===abort&&Number.isFinite(data.durationMs))setMessage(`已生成所选方向的真实创意，本次模型处理用时 ${Math.ceil(data.durationMs!/1000)} 秒。`);
      } else {
        creatives=await mockGenerationProvider.generate({input:p.input,revision,direction:p.selectedDirection});
        generation={mode:'mock' as const,generatedAt:now};
      }
      if(abort.signal.aborted||!mounted.current||controller.current!==abort)return;
      const warnings=diversityWarnings([creatives[0],...p.creatives.filter((x,i)=>directionOf(x,i)!==p.selectedDirection)]);if(warnings.length)throw new Error('创意与已有方向过于相似，尚未保存；请重新尝试。'+warnings.join('；'));
      const merged=mergeDirectionGeneration(p,creatives[0],p.selectedDirection,generation);
      update({...p,creatives:merged,generation,revision,updatedAt:now,status:'active'},p.updatedAt); track(p.creatives.length?'creative_regenerated':'creative_generated',{mode}); setActive(merged.findIndex(x=>x.directionId===p.selectedDirection)); setCopied(false);
    }catch(e){
      if(mounted.current&&controller.current===abort){
        const timedOut=abort.signal.aborted&&abort.signal.reason?.name==='TimeoutError';
        setFailed(!abort.signal.aborted||timedOut);
        setMessage(timedOut?'等待超过 75 秒，已停止生成；原有创意保留，请稍后重试。':abort.signal.aborted?'已取消本次生成，原有创意保留。':(e as Error).message);
      }
    }finally{
      clearTimeout(deadline);
      if(mounted.current&&controller.current===abort){generating.current=false;setBusy(false);controller.current=null;}
    }
  }
  async function copy(all=false) { setFailed(false); try { await navigator.clipboard.writeText(all ? p.creatives.map(creativeText).join('\n\n────────────\n\n') : creativeText(c)); if(mounted.current){let unrecorded=false;try{recordSignals('copy',(all?p.creatives:[c]).map(x=>({projectId:p.id,creativeId:x.id,versionId:versionsOf(x,p.createdAt).at(-1)!.id})));}catch{unrecorded=true;}track('creative_copied',{count:all?p.creatives.length:1});setCopied(true); setMessage(unrecorded?'已复制，但浏览器未保存使用记录。':all ? `已复制全部 ${p.creatives.length} 套创意。` : '已复制当前创意。');} } catch { if(mounted.current) setMessage('浏览器未允许复制，请选择文案手动复制，或下载全部创意。'); } }
  function exportProject(format:'txt'|'md'|'json'){setFailed(false);try{downloadFile(projectExport(p,format),`Adora-${p.input.name}.${format}`,format==='json'?'application/json':'text/plain;charset=utf-8');}catch(e){setFailed(true);setMessage(`无法发起下载：${(e as Error).message}`);return;}track('creative_exported',{format});try{recordSignals('export',p.creatives.flatMap(x=>[{projectId:p.id,creativeId:x.id,versionId:versionsOf(x,p.createdAt).at(-1)!.id},...(x.localizations??[]).map(l=>({projectId:p.id,creativeId:x.id,versionId:versionsOf(x,p.createdAt).find(v=>v.number===l.sourceVersion)!.id,localizationId:l.id}))]));setMessage(`已发起 ${format.toUpperCase()} 下载；文件保存位置由浏览器决定。`);}catch(e){setFailed(true);setMessage(`已发起下载，但使用记录未保存：${(e as Error).message}`);}}
  return <SignalScope context={signalContext}><div className="page result-page"><Link href="/projects" className="back-link"><ArrowLeft size={15}/>全部项目</Link><PageHeading title={p.input.name} description="让同一个好产品，拥有不同的表达方式。" action={<Link href={`/projects/new?from=${p.id}`} className="button secondary">调整信息并新建<ArrowRight size={15}/></Link>}/><div className="project-context"><span>{countries[p.input.country].flag} {countries[p.input.country].name}</span><i/><span>{p.input.platform}</span><i/><span>{p.input.tone??p.input.style}</span><span className="pill">{outputLanguage(p.input).toUpperCase()} 输出</span><span className="context-audience">{p.input.audience}</span></div>{featured && <div className="notice-banner"><strong>精选演示案例 · 非官方创意练习</strong><p>人工编写的质量样板，不代表通用 Mock 的生成能力。人群与情境为待验证假设；未生成真实视频。</p><a href={productSource} target="_blank" rel="noreferrer">查看 Anker 官方产品资料 ↗</a></div>}<details className="input-details"><summary>查看商品信息<ChevronDown size={14}/></summary><div><BriefSummary input={p.input}/><strong>商品卖点</strong><p>{p.input.benefits}</p><strong>产品类别 · 目标用户</strong><p>{p.input.category} · {p.input.audience}</p>{p.input.usageContext && <><strong>使用情境</strong><p>{p.input.usageContext}</p></>}{p.input.purchaseConcern && <><strong>购买顾虑</strong><p>{p.input.purchaseConcern}</p></>}{p.input.evidenceSources && <><strong>证据资料与限制 · 未自动核实</strong><p>{p.input.evidenceSources}</p></>}</div></details>{(message || error) && <p className={error || failed ? 'error-banner' : 'notice-banner'} role="status">{error || message}</p>}<DirectionChooser project={p} busy={busy} onSelect={(direction)=>{try{update({...p,selectedDirection:direction,updatedAt:new Date().toISOString()},p.updatedAt);track('direction_selected',{direction});const index=p.creatives.findIndex((x,i)=>directionOf(x,i)===direction);if(index>=0)setActive(index);}catch(e){setMessage((e as Error).message);setFailed(true);}}}/>{!featured && <GenerationControls selected={p.selectedDirection} busy={busy} blocked={!!error} hasResults={!!c} onGenerate={generate}/>}<p className="generation-source">{!p.creatives.length ? '尚未生成' : featured ? '精选人工案例' : p.generation?.mode==='ai' ? `真实 AI · ${p.generation.provider} · ${p.generation.model}` : '本地模板 · Mock'} · 最近方向生成来源；后续修改见版本记录 · 请人工审核后使用</p>{busy && <GenerationStatus startedAt={startedAt} progress={progress} hasResults={!!c} onCancel={()=>controller.current?.abort()}/>}{!c ? (busy ? null : <div className="generation-state panel"><span className="generation-orb"><Sparkles size={32}/></span><h2>商品已就绪，让灵感开始。</h2><p>选定策略后，生成一套可编辑、评分与本地化的完整创意。</p><small>上方选择生成方式并开始。</small></div>) : <><div className="result-toolbar"><div><h2>你的广告创意 <span className="pill green">{p.creatives.length} 套已保存</span></h2><p>选一个方向，看看它如何讲好产品故事。</p></div></div><nav className="workspace-shortcuts" aria-label="工作台区域"><a href="#creative-panel">广告资产</a><a href="#creative-workbench">编辑 · 评分 · 改进</a><a href="#localize">本地化</a>{c.source==='improved'&&<a href="#iteration-result">本次变化</a>}</nav><div className="creative-tabs" role="tablist" aria-label="创意方向">{p.creatives.map((creative,index)=><button id={`creative-tab-${index}`} role="tab" aria-selected={active===index} aria-controls="creative-panel" tabIndex={active===index ? 0 : -1} key={creative.id} className={`creative-tab ${active===index ? 'selected' : ''}`} onKeyDown={e=>{ if(['ArrowRight','ArrowLeft','Home','End'].includes(e.key)){e.preventDefault(); const n=e.key==='Home'?0:e.key==='End'?p.creatives.length-1:(index+(e.key==='ArrowRight'?1:p.creatives.length-1))%p.creatives.length;setActive(n);setCopied(false);setMessage('' );document.getElementById(`creative-tab-${n}`)?.focus();} }} onClick={()=>{setActive(index);track('creative_selected');setCopied(false);setMessage('');}}><span className="tab-number">0{index+1}</span><span><strong>{creative.direction}</strong><small>{creative.subtitle}</small></span>{active===index && <Check size={17}/>}</button>)}</div><div id="creative-panel" role="tabpanel" aria-labelledby={`creative-tab-${active}`} className="creative-layout">{c.concept && <section className="creative-brief panel"><p className="label-caps">先看懂这条广告</p><h2>{c.concept}</h2><dl><div><dt>购买理由</dt><dd>{c.buyingReason}</dd></div><div><dt>首帧画面</dt><dd>{c.firstFrame}</dd></div><div><dt>拍摄准备</dt><dd>{c.props}</dd></div></dl></section>}<section className="panel copy-panel"><div className="copy-panel-heading"><h3><Sparkles size={18}/>广告文案</h3><button className="text-button" onClick={()=>copy()}>{copied ? <Check size={15}/> : <Copy size={15}/>}复制这套创意</button></div><div className="core-benefit"><span>核心卖点</span><p>{c.coreBenefit}</p></div><div className="hook-block"><div className="copy-label-row"><span className="label-caps">THE HOOK · 开场吸引</span><CopyButton text={c.hook} label="Hook"/></div><h2 lang={outputLanguage(p.input)}>{c.hook}</h2></div><div className="headline-block"><span className="label-caps">HEADLINE · 广告标题</span><h3>{c.headline??c.hook}</h3></div><div className="body-block"><div className="copy-label-row"><span className="label-caps">AD COPY · 广告正文</span><CopyButton text={c.body} label="广告正文"/></div><p lang={outputLanguage(p.input)}>{c.body}</p></div><div className="cta-block"><div className="cta-label"><span className="label-caps">CALL TO ACTION</span><CopyButton text={c.cta} label="CTA"/></div><span lang={outputLanguage(p.input)}>{c.cta}<ArrowUpRightIcon/></span></div><div className="rationale"><h4><Lightbulb size={17}/>为什么适合这个市场？</h4><p>{c.rationale}</p></div></section><section className="panel script-panel"><div className="copy-panel-heading"><h3><Film size={18}/>15 秒短视频脚本</h3><CopyButton text={scriptText(c)} label="完整脚本"/></div><div className="timeline">{c.script.map((scene,index)=><div className="scene" key={scene.time}><span className="scene-time">{scene.time}</span><div><span className="scene-title">{scene.title || ['开场抓住注意','展示商品','强化卖点','引导行动'][index] || '镜头'}</span><p>{scene.visual}</p>{scene.subtitle && <div className="shot-subtitle"><span>屏幕字幕</span><blockquote lang={outputLanguage(p.input)}>{scene.subtitle}</blockquote></div>}{scene.voiceover && <blockquote lang={outputLanguage(p.input)}>{scene.voiceover}</blockquote>}{scene.sound && <p className="shot-sound">声音 · {scene.sound}</p>}</div></div>)}</div><div className="script-note">{c.evidence ? <><strong>拍摄证据与限制</strong><p>{c.evidence}</p><p>{c.script.some(s=>s.voiceover.trim()) ? '字幕与旁白使用目标市场语言，拍摄前需检查实际时长。' : '本方案无旁白，以目标市场字幕和动作声叙事。'}</p></> : <>画面为拍摄建议，旁白为目标市场语言。<br/>演示版本不生成视频文件。</>}</div></section></div><CreativeWorkbench key={c.id} project={p} creative={c} busy={busy} onSelect={setActive}/><QualityPanel key={p.id+c.id+contentSnapshot(c)} project={p} creative={c}/><div className="result-bottom"><p><span className="mini-dot"/>创意请人工审核后使用 · 当前第 {p.revision+1} 版</p><div><button className="button secondary" onClick={()=>exportProject('md')}>导出 Markdown</button><button className="button secondary" onClick={()=>exportProject('json')}>备份 JSON</button><button className="button secondary" onClick={()=>exportProject('txt')}><Download size={16}/>下载全部</button><button className="button primary" onClick={()=>copy(true)}><Copy size={16}/>复制全部创意</button></div></div></>}</div></SignalScope>;
}
function ArrowUpRightIcon(){return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><path d="M7 17 17 7M7 7h10v10"/></svg>;}
