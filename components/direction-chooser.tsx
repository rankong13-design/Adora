'use client';
import { creativeDirections } from '@/lib/directions';
import type { DirectionId, Project } from '@/lib/types';
export function DirectionChooser({project:p,busy,onSelect}:{project:Project;busy:boolean;onSelect:(id:DirectionId)=>void}) {
 if(p.caseId)return null;
 const directions=creativeDirections(p.input);
 const chooser=<section className="direction-picker panel"><p className="label-caps">2 · CHOOSE A DIRECTION</p><h2>先选择一个策略方向</h2><p>策略参考与示例开场。选定后生成完整文案和脚本。</p><div className="direction-grid">{directions.map(d=><article key={d.id} className={p.selectedDirection===d.id?'direction-card selected':'direction-card'}><h3>{d.name}</h3><p className="label-caps">Strategy</p><p>{d.strategy}</p><p className="label-caps">Hook Example</p><blockquote>{d.hookExample}</blockquote><dl><dt>Logic</dt><dd>{d.logic}</dd><dt>Strength</dt><dd>{d.strength}</dd><dt>Best for</dt><dd>{d.bestFor}</dd></dl><button className="button secondary" aria-pressed={p.selectedDirection===d.id} disabled={busy} onClick={()=>onSelect(d.id)}>{p.selectedDirection===d.id?'已选择此方向':'选择此方向'}</button></article>)}</div></section>;
 return p.creatives.length?<details className="direction-review panel"><summary><span><small>当前策略</small><strong>{directions.find(d=>d.id===p.selectedDirection)?.name??'查看创意方向'}</strong></span><span>查看或切换方向</span></summary>{chooser}</details>:chooser;
}
