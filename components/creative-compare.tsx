'use client';
import { contentSnapshot } from '@/lib/creative';
import type { SignalContext } from '@/lib/signals';
import { CopyButton } from '@/components/copy-button';
import { creativeText, scriptText } from '@/lib/mock';
import type { Creative, ProductInput } from '@/lib/types';

export function CreativeCompare({creatives,label='创意比较'}: {creatives: (Creative & {signal?:SignalContext;compareLabel?:string;localizationLabel?:string})[];input: ProductInput;label?: string}) {
  return <section className="comparison" aria-label={label}><h3>{label}</h3><p className="page-description">比较策略与取舍。分数是规则提示，最终选择由你决定。</p><div className="compare-grid" style={{gridTemplateColumns:`repeat(${creatives.length},minmax(0,1fr))`}}>{creatives.map((c,index)=><article className="panel compare-card" key={`${c.id}-${index}`}><p className="label-caps">方向 {index+1}</p><h3>{c.compareLabel??c.direction}</h3><p>{c.subtitle}</p><p className="assessment-note">{c.generation?.mode==='ai'?`AI · ${c.generation.provider??'旧记录未记录供应商'} · ${c.generation.model??'未记录模型'}`:c.generation?.mode==='mock'?'Demo · 有限模板':'手动编辑或旧记录'}</p><dl>{[
    ['Hook',c.hook],['Headline',c.headline??c.hook],['Value Proposition',c.coreBenefit],['广告正文',c.body],['CTA',c.cta],['Script Structure',`${c.script.length} 镜 · ${c.script.map(s=>s.time+' '+(s.title??'')).join(' → ')}`],['Localization',c.localizationLabel??'源版本；尚未本地化'],['适合测试',c.buyingReason??c.rationale],['可能取舍',/痛点|Pain/.test(c.direction)?'问题开场明确，但需要验证受众是否具有该顾虑。':/演示|Demo|细节/.test(c.direction)?'使用过程更具体，拍摄需要真实商品与可验证细节。':'场景便于理解，需要验证使用情境与目标受众是否相关。'],
  ].map(([label,value])=><div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl><details className="compare-script"><summary>完整脚本 · 字幕与旁白</summary><pre>{scriptText(c)}</pre></details><p className="score-summary">{c.score?.snapshot===contentSnapshot(c)?`规则质量分 ${c.score.total}/100`:'此版本未评分'}</p><CopyButton text={creativeText(c)} label="比较中的创意" signal={c.signal??null}/></article>)}</div></section>;
}
