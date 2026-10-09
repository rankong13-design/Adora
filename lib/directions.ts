import { directionIds, type Creative, type CreativeDirection, type DirectionId, type ProductInput } from './types.ts';
import { outputLanguage } from './intelligence.ts';

export function isDirectionId(value:unknown):value is DirectionId {
  return typeof value==='string'&&directionIds.includes(value as DirectionId);
}
export const directionIndex:Record<DirectionId,number>={'pain-point':0,'product-demo':2,lifestyle:1};
export function directionOf(c:Creative,index=0):DirectionId {
  if(c.directionId)return c.directionId;
  if(/生活|lifestyle/i.test(c.direction))return 'lifestyle';
  if(/细节|演示|demo/i.test(c.direction))return 'product-demo';
  if(/痛点|问题|解决|pain/i.test(c.direction))return 'pain-point';
  return (['pain-point','lifestyle','product-demo'] as const)[index%3];
}
export function creativeDirections(input:ProductInput):CreativeDirection[] {
  const language=outputLanguage(input);
  const examples=language==='ja'?['選ぶ前に、何を確認しますか？','使い方を、近くで見てみよう。','いつもの一日、こんな使い方。']:language==='id'?['Apa yang penting sebelum memilih?','Lihat cara kerjanya lebih dekat.','Satu langkah dalam rutinitasmu.']:['What would you check before choosing?','See how it works, up close.','Your routine, one step at a time.'];
  const concern=input.purchaseConcern||input.painPoints;
  const feature=input.benefits.split(/[；;\n]/).find(s=>s.trim())?.trim()||'卖家提供的商品特点';
  return [
    {id:'pain-point',name:'Pain Point · 选购疑问',strategy:concern?`从「${concern}」切入，再检查商品特点是否能回应。`:'提出一个待验证的选购顾虑，不虚构用户痛点。',hookExample:examples[0],logic:'疑问 → 可核实特点 → 核对规格 → 下一步',strength:'问题先行，让观众快速理解这条广告在回答什么。',bestFor:`${input.platform} · 测试用户是否关注某个选购问题`},
    {id:'product-demo',name:'Product Demo · 产品演示',strategy:`把「${feature}」变成能看清楚的结构或使用动作。`,hookExample:examples[1],logic:'动作首帧 → 实际操作 → 细节近景 → 查看信息',strength:'依靠画面解释商品，减少抽象的品质形容词。',bestFor:`${input.platform} · Consideration / 需要解释用途的商品`},
    {id:'lifestyle',name:'Lifestyle · 日常场景',strategy:input.usageContext?`围绕「${input.usageContext}」讲一次连贯的使用过程。`:`为「${input.audience}」提出一个日常使用场景，需人工确认。`,hookExample:examples[2],logic:'日常起点 → 使用过程 → 下一个时刻 → 探索选择',strength:'把商品放入具体生活动作，帮助用户想象用途。',bestFor:`${input.platform} · Awareness / 日常关联的测试`},
  ];
}
