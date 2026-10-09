import type { Creative } from './types.ts';
import { contentSnapshot } from './creative.ts';

export const rubric = [
  {key:'specificity',label:'产品针对性',hint:'换一个商品名后仍然成立吗？',anchors:['可套用任何商品','提到了特点，关联较弱','情节依赖该产品的具体特点']},
  {key:'motivation',label:'购买动机',hint:'谁在什么时刻，为什么需要它？',anchors:['没有具体需求','有人群或场景，理由不清','人群、情境、购买理由连贯']},
  {key:'hook',label:'开场吸引力',hint:'前三秒凭什么让人停下来？这是评审判断，仍需观众反馈。',anchors:['空泛介绍','有切入点但缺少具体动作','有清楚的疑问、冲突、反差或动作']},
  {key:'shootability',label:'可拍摄性',hint:'拍摄者能否直接执行，不用重新创作？',anchors:['只有展示商品等概述','部分镜头具体，仍需补写','镜头、动作、字幕和声音可执行']},
  {key:'localization',label:'市场适配',hint:'是否有具体调整及依据，并标明情境假设？',anchors:['仅换语言或使用地域刻板印象','有具体调整，但依据不足','调整明确、来源可查，假设已标明']},
] as const;
export type QualityKey = typeof rubric[number]['key'];
export type QualityReview = {version:1; snapshot:string; scores:Partial<Record<QualityKey,number>>; facts:'pending'|'verified'|'unsupported'; notes:string; savedAt:string};
export function parseSceneTime(time:string):{start:number;end:number}|null {
  // Accept equivalent range typography and second units, never invent or repair durations.
  const match=/^(\d+)\s*(?:s|sec(?:onds?)?|秒)?\s*(?:[–—−~～-]|至|到)\s*(\d+)\s*(?:s|sec(?:onds?)?|秒)$/i.exec(time.normalize('NFKC').trim());
  if(!match)return null;
  return {start:Number(match[1]),end:Number(match[2])};
}
export function autoChecks(c:Creative) {
  let end=0;
  const timeline=c.script.length>0 && c.script.every(s=>{
    const range=parseSceneTime(s.time);
    if(!range || range.start!==end || range.end<=end) return false;
    end=range.end; return true;
  }) && end===15;
  return [
    {label:'基本内容完整',pass:[c.coreBenefit,c.hook,c.body,c.cta,c.rationale].every(s=>!!s.trim()),reason:'核心卖点、Hook、正文、CTA、市场说明均需填写。'},
    {label:'分镜覆盖 0–15 秒',pass:timeline,reason:'时间段必须连续、无重叠，总长为15秒；不代表实际朗读时长合适。'},
    {label:'每镜有画面与文字内容',pass:c.script.length>0&&c.script.every(s=>!!s.visual.trim()&&!!(s.voiceover.trim()||s.subtitle?.trim())),reason:'每镜需有画面，以及旁白或屏幕字幕。'},
  ];
}
export function currentReview(c:Creative,review?:QualityReview) {return review?.version===1 && (review.snapshot===JSON.stringify(c)||review.snapshot===contentSnapshot(c)) ? review : undefined;}
export function verdict(c:Creative,review?:QualityReview):'pending'|'pass'|'fail' {
  const r=currentReview(c,review);
  if(!r || r.facts==='pending' || !rubric.every(x=>[0,1,2].includes(r.scores[x.key] ?? -1))) return 'pending';
  return r.facts==='verified' && autoChecks(c).every(x=>x.pass) && rubric.every(x=>r.scores[x.key]===2) ? 'pass' : 'fail';
}
export function isQualityReview(value:unknown):value is QualityReview {
  if(!value||typeof value!=='object')return false;
  const r=value as QualityReview;
  return r.version===1 && typeof r.snapshot==='string' && !!r.scores && typeof r.scores==='object' &&
    rubric.every(x=>r.scores[x.key]===undefined||[0,1,2].includes(r.scores[x.key]!)) &&
    ['pending','verified','unsupported'].includes(r.facts) && typeof r.notes==='string' && typeof r.savedAt==='string';
}
