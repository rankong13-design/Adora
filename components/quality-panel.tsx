'use client';
import { contentSnapshot } from '@/lib/creative';
import { useState } from 'react';
import type { Creative, Project } from '@/lib/types';
import { autoChecks, currentReview, rubric, verdict, type QualityReview, type QualityKey } from '@/lib/quality';
import { useProjects } from './project-provider';

export function QualityPanel({project,creative}:{project:Project;creative:Creative}) {
  const {update,error}=useProjects();
  const existing=currentReview(creative,project.reviews?.[creative.id]);
  const [scores,setScores]=useState<Partial<Record<QualityKey,number>>>(existing?.scores||{});
  const [facts,setFacts]=useState<QualityReview['facts']>(existing?.facts||'pending');
  const [notes,setNotes]=useState(existing?.notes||'');
  const [message,setMessage]=useState('');
  const [dirty,setDirty]=useState(false);
  const checks=autoChecks(creative);
  const states=project.creatives.map(c=>verdict(c,project.reviews?.[c.id]));
  const reviewed=states.filter(s=>s!=='pending').length;
  const failed=states.filter(s=>s==='fail').length;
  const state=verdict(creative,existing);
  const reasons=[...checks.filter(c=>!c.pass).map(c=>c.reason),...(existing?.facts==='unsupported'?['存在无依据或与资料矛盾的事实，需删除承诺或补充可信证据。']:[]),...rubric.filter(r=>existing?.scores[r.key]!==undefined&&existing.scores[r.key]!<2).map(r=>`${r.label}：${r.anchors[existing!.scores[r.key]!]}`)];
  function save(){
    const review:QualityReview={version:1,snapshot:contentSnapshot(creative),scores,facts,notes,savedAt:new Date().toISOString()};
    try{update({...project,updatedAt:new Date().toISOString(),reviews:{...project.reviews,[creative.id]:review}});setDirty(false);setMessage('评审已保存到当前浏览器。');}
    catch(e){setMessage((e as Error).message);}
  }
  return <section className="quality-panel panel" aria-label="创意质量检查">
    <div className="quality-heading"><h2>这套创意，准备好了吗？</h2><span className="pill">{dirty?'有未保存评审':state==='pass'?'按当前标准通过':state==='fail'?'待修改':'待人工评审'}</span></div>
    <p className="quality-description">先检查完整性，再判断是否值得拍。自动检查不验证产品事实，也不能证明广告有效。</p>
    <details><summary>查看验收标准与评测统计</summary><div className="quality-rules">
      <p>试行标准 v1：下方5项各评0–2分，均达到2分、事实核对通过且自动检查通过，才算通过。事实准确性为硬性门槛，不以总分抵消。该标准尚未经过用户验证。</p>
      <p>统计单位：本项目当前版本的单套创意。已完成评审 {reviewed}/{project.creatives.length} 套；不合格 {failed} 套；不合格率 {reviewed?`${Math.round(failed/reviewed*100)}%（${failed}/${reviewed}）`:'暂无，尚无完整评审'}。</p>
      <p>未评完的创意不计入分母。这里只反映当前小样本人工评审，不是模型失败率或投放效果。内容变更后旧评审失效。</p>
    </div></details>
    <div className="quality-checks">{checks.map(c=><p key={c.label}><span>{c.pass?'✓':'○'}</span>{c.label}<small>{c.pass?'结构通过':'需修改'}</small></p>)}</div>
    <details className="quality-review"><summary>人工评审 · {existing?'查看或修改记录':'开始评分'}</summary><div className="quality-fields">
      <label className="field">事实准确性 · 必须对照商品资料<select value={facts} onChange={e=>{setFacts(e.target.value as QualityReview['facts']);setDirty(true);setMessage('');}}><option value="pending">尚未核对</option><option value="verified">已逐项核对，有依据且无矛盾</option><option value="unsupported">发现无依据或矛盾的事实</option></select><small>检查参数、功效、优惠、兼容性与测试结果。商品输入本身也不自动等于真实证据。</small></label>
      {rubric.map(r=><label className="field" key={r.key}>{r.label}<small>{r.hint}</small><select value={scores[r.key]??''} onChange={e=>{setScores(prev=>({...prev,[r.key]:e.target.value===''?undefined:Number(e.target.value)}));setDirty(true);setMessage('');}}><option value="">待评审</option>{r.anchors.map((a,n)=><option key={n} value={n}>{n} · {a}</option>)}</select></label>)}
      <label className="field">证据来源与修改建议<textarea rows={3} maxLength={2000} value={notes} placeholder="记录资料链接、具体问题、需要补拍的镜头；不要只写“还不错”。" onChange={e=>{setNotes(e.target.value);setDirty(true);setMessage('');}}/></label>
      <button className="button secondary" onClick={save} disabled={!!error}>保存评审</button><p role="status" className="quality-description">{message || (dirty?'尚未保存；切换创意前请保存。':'评分反映评审者判断，不由系统自动代填。')}</p>
    </div></details>
    {!!reasons.length && <div className="quality-reasons"><p>待修改原因{dirty?'（基于已保存记录）':''}</p><ul>{reasons.map(r=><li key={r}>{r}</li>)}</ul></div>}
  </section>;
}
