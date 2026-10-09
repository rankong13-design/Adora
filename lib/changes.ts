import type { CreativeContent, ProductInput } from './types.ts';
import { contentOf, synchronizeEditedScript } from './creative.ts';

export { changedElements } from './diff.ts';
import { changedElements } from './diff.ts';
// Focused edits accept only fields relevant to the chosen goal. Independently edited
// scenes remain intact; Hook/CTA-linked words are synchronized by equality.
export function focusedImprovement(previous:CreativeContent,proposal:CreativeContent,goal:string):CreativeContent {
  if(goal==='regenerate')return contentOf(proposal);
  const next=contentOf(previous);
  const fields=goal==='hook'?['hook']:goal==='cta'?['cta']:goal==='concise'?['body']:goal==='value'?['body','buyingReason']:goal==='platform'?['firstFrame','props']:goal==='native'||goal==='claims'?['hook','body','headline','cta']:goal==='premium'||goal==='ugc'||goal==='emotional'?['hook','firstFrame']:[];
  for(const key of fields){const k=key as 'hook'|'body'|'headline'|'cta'|'buyingReason'|'firstFrame'|'props';if(proposal[k]!==undefined)next[k]=proposal[k];}
  const synced=synchronizeEditedScript(previous,next);
  if(changedElements(previous,synced).length)synced.rationale=proposal.rationale;
  return synced;
}
export const localizationDisclaimer='Localization is based on language and creative conventions. Human review is recommended.';
export function priceMentions(content:CreativeContent) {
  const text=[content.hook,content.body,content.headline,content.cta,...content.script.flatMap(s=>[s.voiceover,s.subtitle])].join(' ');
  return [...new Set(text.match(/(?:USD|GBP|JPY|SGD|IDR|US\$|S\$|\$|£|¥|￥|Rp)\s*\d(?:[\d,.]*\d)?/gi)??[])];
}
export function localizationWarnings(original:CreativeContent,localized:CreativeContent,input:ProductInput,mode:'mock'|'ai') {
  const warnings=[localizationDisclaimer,'未核实商品事实或当地消费者偏好，请检查字幕时长、语气与行动提示。'];
  const prices=priceMentions(original);
  if(prices.length)warnings.push(`源价格 ${prices.join(' / ')} ${prices.every(p=>priceMentions(localized).includes(p))?'保留原值':'部分未出现在新文案中'}；Brief 未提供目标市场售价，不自动换算。`);
  if(input.price)warnings.push(`Brief 价格 ${input.price} 仅供核对，未自动转为当地售价。`);
  if(mode==='mock')warnings.push('Demo 是有限模板；跨语言可能未保留你的独立编辑，请逐项对照原文。');
  return warnings;
}
