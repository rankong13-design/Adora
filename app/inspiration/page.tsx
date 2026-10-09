'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowDown, ArrowRight, ArrowUpRight, Check, Focus, Lightbulb, Search, Sparkles, Sun } from 'lucide-react';
import { inspirationExamples, analyzeInspiration, type InspirationInput } from '@/lib/inspiration';
import { patterns } from '@/lib/intelligence';

const objectives = [
  { value: 'all', label: '全部结构' },
  { value: 'Awareness', label: '认知' },
  { value: 'Conversion', label: '转化' },
  { value: 'Traffic', label: '流量' },
  { value: 'Product Launch', label: '新品发布' },
  { value: 'Retargeting', label: '再营销' },
];
const exampleCategories = ['日常场景', '产品演示', '问题回应'];
const fieldLabels = { headline: '广告标题', body: '广告正文', description: '画面与创意描述' };
const fieldPlaceholders = { headline: '粘贴你想理解的广告标题…', body: '粘贴广告正文，观察它如何提出问题、解释价值与引导行动。', description: '可选：补充画面、镜头或使用场景。' };

function ExampleCover({ index }: { index: number }) {
  return <div className={`insp-cover insp-cover-${index}`} aria-hidden="true">
    <span className="insp-cover-number">0{index + 1} / STRUCTURE STUDY</span>
    {index === 0 ? <>
      <div className="insp-routine-orbit" />
      <div className="insp-routine-card"><Sun size={26} strokeWidth={1.5} /><span>A small part of<br />your everyday routine.</span><i /></div>
      <span className="insp-cover-caption">场景 <ArrowRight size={12} /> 使用 <ArrowRight size={12} /> 日常</span>
    </> : index === 1 ? <>
      <div className="insp-focus-orbit"><Focus size={62} strokeWidth={1.1} /><i /></div>
      <strong className="insp-detail-title">Look<br />closer.</strong>
      <span className="insp-cover-caption">提出疑问 <ArrowRight size={12} /> 核对细节</span>
    </> : <>
      <strong className="insp-question-mark">?</strong>
      <div className="insp-question-notes"><span>你的需求</span><span>商品细节 <Check size={13} /></span></div>
      <span className="insp-cover-caption">问题 <ArrowRight size={12} /> 信息 <ArrowRight size={12} /> 选择</span>
    </>}
  </div>;
}

export default function InspirationPage() {
  const [input, setInput] = useState<InspirationInput>({ headline: '', body: '', description: '' });
  const [analysis, setAnalysis] = useState<ReturnType<typeof analyzeInspiration> | null>(null);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [objective, setObjective] = useState('all');
  const normalizedQuery = query.trim().toLowerCase();
  const visiblePatterns = patterns.filter(pattern => (objective === 'all' || pattern.bestFor === objective) && (!normalizedQuery || `${pattern.name} ${pattern.description} ${pattern.exampleStructure}`.toLowerCase().includes(normalizedQuery)));

  function analyze(e: React.FormEvent) {
    e.preventDefault();
    try {
      setAnalysis(analyzeInspiration(input));
      setError('');
    } catch (e) {
      setAnalysis(null);
      setError((e as Error).message);
    }
  }

  function analyzeExample(example: (typeof inspirationExamples)[number]) {
    setInput({ headline: example.headline, body: example.body, description: example.description });
    setAnalysis(analyzeInspiration(example));
    setError('');
    document.getElementById('inspiration-analyze')?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
  }

  return <div className="page insp-page">
    <header className="insp-hero">
      <div className="insp-hero-copy">
        <p className="insp-eyebrow"><Sparkles size={14} /> CREATIVE INSPIRATION</p>
        <h1>好的表达，<br />从看懂创意开始<span>。</span></h1>
        <p className="insp-hero-description">拆解开场、叙事和行动引导，<br className="insp-desktop-break" />把启发变成属于你商品的原创表达。</p>
        <a className="insp-button insp-button-dark" href="#inspiration-analyze">分析你的广告 <ArrowDown size={15} /></a>
      </div>
      <div className="insp-hero-note">
        <span className="insp-note-icon"><Lightbulb size={23} strokeWidth={1.5} /></span>
        <p>借鉴创意的结构，<br /><strong>写自己的故事。</strong></p>
        <span>原创教学示例 · 12 种创意结构</span>
      </div>
    </header>

    <section className="insp-examples-section" aria-labelledby="inspiration-examples-title">
      <div className="insp-section-heading"><div><p className="insp-eyebrow">CURATED STUDIES</p><h2 id="inspiration-examples-title">从三个简单示例开始</h2></div><span className="insp-section-note">原创教学示例</span></div>
      <div className="insp-example-grid">{inspirationExamples.map((example, index) => <article className="insp-example-card" key={example.id}>
        <ExampleCover index={index} />
        <div className="insp-example-content">
          <span className="insp-category">{exampleCategories[index]}</span>
          <h3>{example.name}</h3>
          <p className="insp-example-headline" lang="en">{example.headline}</p>
          <p className="insp-example-body" lang="en">{example.body}</p>
          <p className="insp-example-boundary">{example.description}</p>
          <button className="insp-example-action" onClick={() => analyzeExample(example)}>分析这个结构 <ArrowUpRight size={17} /></button>
        </div>
      </article>)}</div>
    </section>

    <section className="insp-analysis-section" id="inspiration-analyze" aria-labelledby="inspiration-analyze-title">
      <div className="insp-section-heading"><div><p className="insp-eyebrow">BREAK IT DOWN</p><h2 id="inspiration-analyze-title">看懂一条广告的创意结构</h2></div></div>
      <div className="insp-analysis-grid">
        <form className="insp-input-panel" onSubmit={analyze}>
          <div className="insp-panel-heading"><span className="insp-step">01</span><div><h3>放入你的参考广告</h3><p>选择上方示例，或粘贴你想分析的内容。</p></div></div>
          {(['headline', 'body', 'description'] as const).map(key => <label className="insp-field" key={key}><span>{fieldLabels[key]}{key === 'description' && <small>可选</small>}</span><textarea rows={key === 'body' ? 4 : 2} value={input[key]} placeholder={fieldPlaceholders[key]} maxLength={key === 'body' ? 3000 : key === 'description' ? 1500 : 500} onChange={e => { setInput({ ...input, [key]: e.target.value }); setAnalysis(null); setError(''); }} /></label>)}
          {error && <p className="error-banner" role="alert">{error}</p>}
          <div className="insp-form-bottom"><button className="insp-button insp-button-dark" type="submit"><Sparkles size={15} /> 分析创意结构 <ArrowRight size={15} /></button><p>内容仅用于当前页面的结构分析。</p></div>
        </form>
        <section className="insp-insight-panel" aria-live="polite">
          <div className="insp-panel-heading"><span className="insp-step">02</span><div><h3>Creative Insight</h3><p>把可借鉴的叙事顺序整理出来。</p></div></div>
          {analysis ? <>
            <dl className="insp-insights">{analysis.dimensions.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
            <Link className="insp-button insp-button-dark" href={`/projects/new?pattern=${analysis.patternId}`}>用这个结构创建新 Brief <ArrowRight size={15} /></Link>
            <p className="insp-analysis-boundary">仅携带结构选择，广告原文不会进入你的项目。下一步填写自己的商品 Brief。</p>
          </> : <div className="insp-insight-empty"><div className="insp-empty-diagram" aria-hidden="true"><span>Hook</span><ArrowDown size={15} /><span>Story</span><ArrowDown size={15} /><span>CTA</span></div><h4>结构比句子更值得借鉴</h4><p>选择教学示例或粘贴广告，<br />查看开场、表达角度和行动引导。</p></div>}
          <p className="insp-insight-disclaimer">启发式结构分析，未核实竞品信息、投放效果或真实受众。请使用自己的商品事实和原创表达。</p>
        </section>
      </div>
    </section>

    <section className="insp-pattern-library" aria-labelledby="inspiration-patterns-title">
      <div className="insp-section-heading"><div><p className="insp-eyebrow">YOUR CREATIVE TOOLKIT</p><h2 id="inspiration-patterns-title">Creative Pattern Library</h2><p className="insp-section-description">从叙事结构开始，为你的下一个创意找到方向。</p></div><span className="insp-pattern-count">{patterns.length} 种结构</span></div>
      <div className="insp-pattern-toolbar">
        <div className="insp-pattern-filters" aria-label="按广告目标筛选">{objectives.map(item => <button key={item.value} type="button" className={objective === item.value ? 'is-selected' : ''} aria-pressed={objective === item.value} onClick={() => setObjective(item.value)}>{item.label}</button>)}</div>
        <label className="insp-pattern-search"><Search size={16} /><input aria-label="搜索创意结构" placeholder="搜索结构…" value={query} onChange={e => setQuery(e.target.value)} /></label>
      </div>
      <p className="insp-filter-result" role="status">{objective === 'all' && !normalizedQuery ? '为不同创意目标准备的 12 种起点' : `找到 ${visiblePatterns.length} 种结构`}</p>
      {visiblePatterns.length ? <div className="insp-pattern-grid">{visiblePatterns.map(pattern => <article className="insp-pattern-card" key={pattern.id}>
        <div className="insp-pattern-top"><span className="insp-pattern-number">{String(patterns.findIndex(item => item.id === pattern.id) + 1).padStart(2, '0')}</span><span>{objectives.find(item => item.value === pattern.bestFor)?.label}</span></div>
        <h3>{pattern.name}</h3><p className="insp-pattern-description">{pattern.description}</p>
        <p className="insp-pattern-structure">{pattern.exampleStructure}</p>
        <div className="insp-pattern-bottom"><span>{pattern.platformFit.join(' · ')}</span><Link href={`/projects/new?pattern=${pattern.id}`} aria-label={`使用 ${pattern.name} 结构创建原创项目`}>使用结构 <ArrowUpRight size={16} /></Link></div>
      </article>)}</div> : <div className="insp-pattern-empty"><Search size={23} /><h3>暂时没有匹配的结构</h3><p>试试其他关键词，或查看全部创意目标。</p><button className="insp-button insp-button-light" onClick={() => { setQuery(''); setObjective('all'); }}>查看全部结构 <ArrowRight size={15} /></button></div>}
    </section>
  </div>;
}
