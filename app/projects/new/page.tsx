'use client';
import { Suspense, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, Check, ChevronRight, Globe2, Sparkles, WandSparkles } from 'lucide-react';
import { LoadingState } from '@/components/ui';
import { useProjects } from '@/components/project-provider';
import { readDraft, writeDraft, removeDraft } from '@/lib/draft';
import { emptyInput, exampleInput, validateInput } from '@/lib/mock';
import { BriefSummary } from '@/components/brief-fields';
import { marketRules, patterns, outputLanguage } from '@/lib/intelligence';
import { countries, languages, objectives, tones, type ProductInput } from '@/lib/types';
export default function NewProject() { return <Suspense fallback={<LoadingState/>}><NewProjectForm/></Suspense>; }
function NewProjectForm() {
  const params = useSearchParams(); const {projects,ready,error,create} = useProjects();
  const source = projects.find(p=>p.id === params.get('from'));
  if (!ready) return <LoadingState/>;
  return <ProductForm key={params.get('from') || params.get('pattern') || 'new'} sourceId={params.get('from') || (params.get('pattern')?`pattern:${params.get('pattern')}`:'')} initial={source?.input || {...emptyInput,patternId:patterns.some(p=>p.id===params.get('pattern'))?params.get('pattern')!:undefined}} storageError={error} onCreate={create}/>;
}
function ProductForm({initial,storageError,onCreate,sourceId}: {sourceId: string; initial: ProductInput; storageError: string; onCreate: ReturnType<typeof useProjects>['create']}) {
  const router = useRouter(); const [input,setInput] = useState<ProductInput>({...initial,tone:initial.tone??(initial.style==='简洁高级'?'Premium':'Casual'),objective:initial.objective??'Conversion',language:outputLanguage(initial)}); const [error,setError] = useState(''); const [busy,setBusy] = useState(false);
  const [draftStatus,setDraftStatus] = useState('');
  const [draftReady,setDraftReady] = useState(false);
  const canSave = useRef(true); const finished = useRef(false);
  useEffect(() => {
    try {
      const saved = readDraft(sourceId);
      if (saved) { setInput({...saved,tone:saved.tone??(saved.style==='简洁高级'?'Premium':'Casual'),objective:saved.objective??'Conversion',language:outputLanguage(saved)}); setDraftStatus('已恢复上次草稿'); }
    } catch { canSave.current=false; setDraftStatus('草稿读取失败，本次填写不会覆盖原草稿'); }
    setDraftReady(true);
  }, [sourceId]);
  function saveDraft(next: ProductInput) {
    if (!canSave.current || finished.current) return;
    try { writeDraft(sourceId,next); setDraftStatus('草稿已保存 · 仅当前浏览器'); }
    catch { setDraftStatus('草稿保存失败，请保持页面打开'); }
  }
  function fillExample() { const next={...exampleInput,tone:'Casual' as const,objective:'Conversion' as const,language:outputLanguage(exampleInput),patternId:input.patternId};setInput(next); saveDraft(next); setError(''); }
  function field<K extends keyof ProductInput>(key: K, value: ProductInput[K]) { const next={...input,[key]:value,...(key==='country'?{language:marketRules[value as ProductInput['country']].language}:{})}; setInput(next); saveDraft(next); setError(''); }
  function submit(e: React.FormEvent) { e.preventDefault(); const invalid = validateInput(input); if(invalid) { setError(invalid); return; } setBusy(true); try { const p = onCreate(input); finished.current=true; try { removeDraft(sourceId); } catch { /* Project is saved even if draft cleanup is unavailable. */ } router.push(`/projects/${p.id}`); } catch(e) { setError((e as Error).message); setBusy(false); } }
  if (!draftReady) return <LoadingState text="正在读取草稿…"/>;
  return (
    <div className="page brief-page">
      <div className="brief-topline">
        <Link href="/" className="back-link"><ArrowLeft size={15}/>返回工作台</Link>
        <p className="draft-status" role="status"><span aria-hidden="true"/>{draftStatus || '草稿自动保存于当前浏览器'}</p>
      </div>
      <header className="brief-hero">
        <div><p className="eyebrow">START WITH YOUR PRODUCT</p><h1>好创意，从了解产品开始。</h1><p>告诉 Adora 你卖什么、面向谁。下一步，我们一起找到合适的创意方向。</p></div>
        <button type="button" className="button secondary brief-example" onClick={fillExample}><WandSparkles size={15}/>填入示例</button>
      </header>
      <ol className="brief-workflow" aria-label="创作流程">
        <li aria-current="step"><span>01</span><b>建立 Brief</b></li>
        <li aria-hidden="true" className="brief-step-arrow"><ChevronRight size={14}/></li>
        <li><span>02</span><b>选择创意方向</b></li>
        <li aria-hidden="true" className="brief-step-arrow"><ChevronRight size={14}/></li>
        <li><span>03</span><b>生成与改进</b></li>
      </ol>
      <div className="form-layout brief-layout">
        <form className="panel product-form brief-form" onSubmit={submit}>
          <section className="brief-section" aria-labelledby="product-info-title">
            <div className="brief-section-heading"><span className="brief-section-number">01</span><div><h2 id="product-info-title">商品信息</h2><p>具体、真实的产品特点，是创意的起点。</p></div><span className="brief-section-tag">THE PRODUCT</span></div>
            <div className="field-grid brief-product-basics">
              <label className="field">商品名称 <span className="required">*</span><input required maxLength={80} value={input.name} onChange={e=>field('name',e.target.value)} placeholder="例如：轻量随行保温杯"/></label>
              <label className="field">产品类别 <span className="required">*</span><select value={input.category} onChange={e=>field('category',e.target.value)}>{['家居生活','美妆个护','服饰配件','数码电子','运动户外','其他'].map(x=><option key={x}>{x}</option>)}</select></label>
            </div>
            <label className="field">商品卖点 <span className="required">*</span><textarea required maxLength={800} rows={4} value={input.benefits} onChange={e=>field('benefits',e.target.value)} placeholder="例如：316 不锈钢内胆；500ml 容量；防漏杯盖；适合日常通勤"/><small className="field-hint">填写特点、材质或使用场景，每项用分号分隔。<span>{input.benefits.length}/800</span></small></label>
            <label className="field">商品描述 <span className="brief-optional">可选</span><textarea rows={3} maxLength={1000} value={input.description??''} onChange={e=>field('description',e.target.value)} placeholder="补充商品是什么、如何使用，以及让用户理解它的必要信息。"/></label>
            <details className="creative-inputs brief-expand">
              <summary>添加价格、优惠与商品链接 <span>可选</span></summary>
              <div className="field-grid">
                <label className="field">价格 / 价格区间<input maxLength={500} value={input.price??''} onChange={e=>field('price',e.target.value)} placeholder="例如 USD 39.99；不会自动换算"/></label>
                <label className="field">优惠 / 促销<input maxLength={500} value={input.offer??''} onChange={e=>field('offer',e.target.value)} placeholder="已确认的优惠与适用条件"/></label>
              </div>
              <label className="field">商品链接<input type="url" maxLength={500} value={input.productUrl??''} onChange={e=>field('productUrl',e.target.value)} placeholder="https://…"/><small>用于人工核对商品信息，链接不会被自动读取。</small></label>
            </details>
          </section>
          <section className="brief-section" aria-labelledby="market-goals-title">
            <div className="brief-section-heading"><span className="brief-section-number">02</span><div><h2 id="market-goals-title">市场与目标</h2><p>同一个产品，面对不同受众需要不同表达。</p></div><span className="brief-section-tag">THE AUDIENCE</span></div>
            <div className="field-grid">
              <label className="field">目标国家 <span className="required">*</span><select value={input.country} onChange={e=>field('country',e.target.value as ProductInput['country'])}>{Object.entries(countries).map(([key,c])=><option key={key} value={key}>{c.flag} {c.name}</option>)}</select></label>
              <label className="field">广告平台 <span className="required">*</span><select value={input.platform} onChange={e=>field('platform',e.target.value)}>{['TikTok','Instagram','Facebook'].map(x=><option key={x}>{x}</option>)}</select></label>
            </div>
            <label className="field">目标用户 <span className="required">*</span><input required maxLength={160} value={input.audience} onChange={e=>field('audience',e.target.value)} placeholder="例如：25–35 岁，注重生活品质的都市通勤人群"/></label>
            <div className="field-grid">
              <label className="field">输出语言<select value={outputLanguage(input)} onChange={e=>field('language',e.target.value as ProductInput['language'])}>{Object.entries(languages).map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></label>
              <label className="field">营销目标<select value={input.objective??'Conversion'} onChange={e=>field('objective',e.target.value as ProductInput['objective'])}>{objectives.map(v=><option key={v}>{v}</option>)}</select></label>
            </div>
            <label className="field">表达语气<select value={input.tone??'Casual'} onChange={e=>field('tone',e.target.value as ProductInput['tone'])}>{Object.entries(tones).map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></label>
            <label className="field">期望 CTA <span className="brief-optional">可选</span><input maxLength={500} value={input.desiredCta??''} onChange={e=>field('desiredCta',e.target.value)} placeholder="例如：Explore the details"/><small>你希望用户采取什么行动？请使用输出语言填写。</small></label>
          </section>
          <section className="brief-section brief-clues" aria-labelledby="creative-clues-title">
            <div className="brief-section-heading"><span className="brief-section-number">03</span><div><h2 id="creative-clues-title">创意线索 <span className="brief-optional">可选</span></h2><p>有更多依据，就能写出更贴近真实需求的创意。</p></div><span className="brief-section-tag">THE CONTEXT</span></div>
            <details className="creative-inputs brief-expand">
              <summary>添加使用场景、顾虑与证据 <span>展开填写</span></summary>
              <p>没有的信息可以留空。尚未确认的判断请标为假设。</p>
              <label className="field">使用情境<textarea maxLength={500} rows={2} value={input.usageContext || ''} onChange={e=>field('usageContext',e.target.value)} placeholder="例如：下午离开图书馆，手机低电量，还要查看叫车信息"/></label>
              <label className="field">购买顾虑<textarea maxLength={500} rows={2} value={input.purchaseConcern || ''} onChange={e=>field('purchaseConcern',e.target.value)} placeholder="例如：担心外出忘带充电线，临时无法补电"/></label>
              <label className="field">受众痛点<textarea rows={2} maxLength={500} value={input.painPoints??''} onChange={e=>field('painPoints',e.target.value)} placeholder="记录有依据的需求与困扰；未经验证的判断请注明为假设"/></label>
              <label className="field">证据资料与限制<textarea maxLength={2000} rows={3} value={input.evidenceSources || ''} onChange={e=>field('evidenceSources',e.target.value)} placeholder="粘贴关键规格、测试依据、来源链接及使用限制。"/><small>链接仅供人工核对，不会被自动读取。</small></label>
            </details>
            <label className="field">灵感结构<select value={input.patternId??''} onChange={e=>field('patternId',e.target.value)}><option value="">自动探索三个不同方向</option>{patterns.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select><small>可以沿用灵感库中的结构，也可以留给 Adora 探索。</small></label>
          </section>
          {(error || storageError) && <p className="error-banner" role="alert">{error || storageError}</p>}
          <div className="form-bottom brief-submit">
            <span>下一步：比较 3 个创意方向</span>
            <button type="submit" disabled={busy || !!storageError} className="button primary">{busy ? '正在创建…' : '创建项目并继续'}<ArrowRight size={16}/></button>
          </div>
        </form>
        <aside className="form-aside brief-aside" aria-label="当前 Brief 预览">
          <div className="brief-preview-sticky">
            <div className="brief-preview-label"><span className="brief-live-dot" aria-hidden="true"/>你的创作预览<span>LIVE BRIEF</span></div>
            <BriefSummary input={input}/>
            <div className="brief-deliverables">
              <div className="brief-deliverables-heading"><Sparkles size={17}/><h3>准备好开启创作</h3></div>
              <p>先比较方向，再把选中的想法展开成完整广告。</p>
              <ul>{['Hook · 正文 · CTA','15 秒短视频分镜脚本','目标市场的表达建议'].map(x=><li key={x}><Check size={14}/>{x}</li>)}</ul>
              <div className="brief-delivery-count"><strong>3</strong><span>个策略方向<br/><small>找到适合产品的切入点</small></span><ArrowRight size={20}/></div>
            </div>
            <div className="brief-market-note"><Globe2 size={16}/><p>{countries[input.country].name} · {languages[outputLanguage(input)]}<span>项目与草稿保存在当前浏览器</span></p></div>
          </div>
        </aside>
      </div>
    </div>
  );
}
