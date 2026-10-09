'use client';
import { countries, languages, objectives, tones, type ProductInput } from '@/lib/types';
import { outputLanguage, patterns } from '@/lib/intelligence';

type Props = {input: ProductInput; onChange: <K extends keyof ProductInput>(key: K,value: ProductInput[K])=>void};
export function BriefFields({input,onChange}: Props) {
  return <section className="brief-fields" aria-labelledby="campaign-heading">
    <h2 id="campaign-heading">Campaign Brief</h2><p className="page-description">为创意设定语言、目标与下一步行动。</p>
    <div className="field-grid">
      <label className="field">输出语言<select value={outputLanguage(input)} onChange={e=>onChange('language',e.target.value as ProductInput['language'])}>{Object.entries(languages).map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></label>
      <label className="field">营销目标<select value={input.objective??'Conversion'} onChange={e=>onChange('objective',e.target.value as ProductInput['objective'])}>{objectives.map(v=><option key={v}>{v}</option>)}</select></label>
    </div>
    <label className="field">语气<select value={input.tone??'Casual'} onChange={e=>onChange('tone',e.target.value as ProductInput['tone'])}>{Object.entries(tones).map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></label>
    <label className="field">商品描述 · 可选<textarea rows={3} maxLength={1000} value={input.description??''} onChange={e=>onChange('description',e.target.value)} placeholder="说明商品是什么、如何使用；卖点只填写可核实的特点"/></label>
    <label className="field">期望 CTA · 可选<input maxLength={500} value={input.desiredCta??''} onChange={e=>onChange('desiredCta',e.target.value)} placeholder="例如：Explore the details（请使用输出语言）"/></label>
    <details className="creative-inputs"><summary>商品与活动补充 · 可选</summary>

      <div className="field-grid"><label className="field">价格 / 价格区间<input maxLength={500} value={input.price??''} onChange={e=>onChange('price',e.target.value)} placeholder="例如 USD 39.99；不会自动换算"/></label><label className="field">优惠 / 促销<input maxLength={500} value={input.offer??''} onChange={e=>onChange('offer',e.target.value)} placeholder="只填写已确认的优惠与适用条件"/></label></div>
      <label className="field">商品链接<input type="url" maxLength={500} value={input.productUrl??''} onChange={e=>onChange('productUrl',e.target.value)} placeholder="https://…（不会自动抓取）"/></label>
      <label className="field">受众痛点<textarea rows={2} maxLength={500} value={input.painPoints??''} onChange={e=>onChange('painPoints',e.target.value)} placeholder="记录已有依据的顾虑；没有研究时可标记为假设"/></label>
      <label className="field">灵感结构<select value={input.patternId??''} onChange={e=>onChange('patternId',e.target.value)}><option value="">自动探索三个不同方向</option>{patterns.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
    </details>
  </section>;
}
export function BriefSummary({input}: {input: ProductInput}) {
  return <section className="brief-summary panel" aria-labelledby="brief-summary-title"><p className="label-caps">CAMPAIGN BRIEF</p><h3 id="brief-summary-title">{input.name||'你的商品'}</h3><dl>{[
    ['市场',countries[input.country].name],['语言',languages[outputLanguage(input)]],['平台',input.platform],['目标',input.objective??'Conversion'],['受众',input.audience||'待填写'],['语气',input.tone?tones[input.tone]:input.style],['价格',input.price||'未提供'],['优惠',input.offer||'未提供'],['CTA',input.desiredCta||'按创意方向建议'],
  ].map(([label,value])=><div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl><p>市场指导是创作参考，需由当地用户审核与投放测试验证。</p></section>;
}
