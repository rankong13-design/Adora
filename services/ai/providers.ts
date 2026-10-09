import type { Creative, CreativeContent, GenerationRequest, Language, Country, ProductInput } from '../../lib/types.ts';
import { copySentences, shorterCopy } from '../../lib/copy-editing.ts';
import { directionIndex } from '../../lib/directions.ts';
import { focusedImprovement } from '../../lib/changes.ts';
import { contentOf } from '../../lib/creative.ts';
import { generateCreatives } from '../../lib/mock.ts';
import { marketRules, outputLanguage } from '../../lib/intelligence.ts';
import { scoreCreative } from '../../lib/score.ts';

export const improvements = { hook:'Stronger Hook', value:'Clearer Value', concise:'Shorter', native:'More Native', platform:'More Platform-Specific', cta:'Stronger CTA', claims:'Safer Claims', ugc:'More UGC', premium:'More Premium', emotional:'More Emotional', regenerate:'重新生成同方向创意，换一种表达并保留事实' } as const;
export type Improvement = keyof typeof improvements;
export type LocalizationRequest = { input: ProductInput; creative: Creative; targetMarket: Country; language: Language; tone: string };
export interface CreativeGenerationProvider { generate(request: GenerationRequest): Promise<Creative[]> }
export interface LocalizationProvider { localize(request: LocalizationRequest): Promise<{content:CreativeContent;notes:string[]}> }
export interface CreativeAnalysisProvider { analyze(creative: Creative,input: ProductInput): ReturnType<typeof scoreCreative> }
export const mockGenerationProvider: CreativeGenerationProvider = {async generate({input,revision,direction}){const items=generateCreatives(input,revision);return direction?[{...items[directionIndex[direction]],directionId:direction}]:items;}};
export const heuristicAnalysisProvider: CreativeAnalysisProvider = {analyze:scoreCreative};

export function improveDemo(c: Creative, input: ProductInput, improvement: Improvement): CreativeContent {
  if(improvement==='regenerate'){
    const index=/生活|Lifestyle/.test(c.direction)?1:/细节|Demo/.test(c.direction)?2:0;
    const alternatives=[generateCreatives(input,0)[index],generateCreatives(input,1)[index]];
    const next=alternatives.find(candidate=>candidate.hook!==c.hook)??alternatives[0];
    return {...contentOf(next),direction:c.direction,rationale:`${next.rationale} 单套重新生成 · 有限模板表达，未调用真实 AI。`};
  }
  const content=contentOf(c);const lang=outputLanguage(input);
  const text=lang==='ja'?{hook:'選ぶ前に、ここをチェック。',cta:'商品情報を確認',ugc:'使い方を、一緒に見てみよう。',emotional:'いつもの一日を、思い浮かべて。'}:lang==='id'?{hook:'Sebelum memilih, lihat detail ini.',cta:'Lihat detail produk',ugc:'Mari lihat cara penggunaannya.',emotional:'Bayangkan dalam keseharianmu.'}:{hook:input.platform==='TikTok'?'Before you choose, look at this.':'What matters in your next everyday choice?',cta:input.objective==='Awareness'?'Explore the story':'Check the product details',ugc:'Come along for a closer look.',emotional:'Picture your next everyday moment.'};
  if(improvement==='hook')content.hook=text.hook;
  if(improvement==='cta')content.cta=text.cta;
  if(improvement==='concise')content.body=shorterCopy(content.body,lang);
  if(improvement==='ugc'||improvement==='native'){content.hook=text.ugc;content.firstFrame='创作者手持拍摄一次真实使用动作；不编造个人体验与用户评价。';}
  if(improvement==='premium'){content.hook=lang==='ja'?'細部を、ゆっくり。':lang==='id'?'Detail yang patut dilihat.':'Details worth a closer look.';content.firstFrame='干净背景，产品细节特写，留白字幕；不新增品质或认证主张。';}
  if(improvement==='emotional'){content.hook=text.emotional;content.firstFrame='从 Brief 已提供的日常场景开始；情感动机为待验证假设。';}
  if(improvement==='value'){const first=input.benefits.split(/[，,；;\n]/)[0].trim();content.buyingReason=`购买前确认 ${first} 是否符合 ${input.audience} 的实际需要；卖家信息待核实。`;content.body=[...new Set(copySentences(content.body,lang))].join(' ');}
  if(improvement==='platform'){content.firstFrame=input.platform==='TikTok'?'竖屏近景：先完成一次可见的产品动作，再用短字幕交代卖点。':input.platform==='Instagram'?'竖屏细节近景：保留画面留白，商品动作与短字幕同步。':'先用清晰产品近景交代用途，再展示已提供的商品特点。';content.props='使用 Brief 已提供的商品与真实环境，字幕避开平台界面区域。';}
  if(improvement==='claims'){const clean=(t:string)=>t.replace(/\b(guaranteed|best ever|100% effective|miracle|risk.free)\b[!?.]?/gi,'').replace(/保证有效|全网第一|绝对有效|百分百有效/g,'').trim();content.hook=clean(content.hook)||text.hook;content.body=clean(content.body)||c.coreBenefit;content.headline=clean(content.headline??'')||content.hook;content.cta=clean(content.cta)||text.cta;}
  content.rationale+=` 本地模板改进：${improvements[improvement]}；未进行真实 AI 评估，不保证质量提升。`;
  return focusedImprovement(c,content,improvement);
}
export const mockLocalizationProvider: LocalizationProvider = {async localize({input,creative,targetMarket,language,tone}) {
  const original=contentOf(creative);
  let content: CreativeContent;
  const sameLanguage=language===outputLanguage(input);
  if(sameLanguage){
    content=structuredClone(original);
    const adapt=(s: string)=>language==='en'?targetMarket==='GB'?s.replace(/\bfavorite\b/gi,'favourite').replace(/\bcolor\b/gi,'colour').replace(/\borganize\b/gi,'organise'):targetMarket==='US'?s.replace(/\bfavourite\b/gi,'favorite').replace(/\bcolour\b/gi,'color').replace(/\borganise\b/gi,'organize'):s:s;
    content.hook=adapt(content.hook);content.body=adapt(content.body);content.headline=adapt(content.headline??'');
    content.cta=language==='en'?(tone==='简洁高级'?'Explore the details':'Take a closer look'):content.cta;
    content.script=content.script.map((s,i)=>({...s,voiceover:i===content.script.length-1&&s.voiceover===original.cta?content.cta:adapt(s.voiceover),subtitle:i===content.script.length-1&&s.subtitle===original.cta?content.cta:adapt(s.subtitle??'')}));
  }else{
    const candidates=generateCreatives({...input,country:targetMarket,language,style:tone==='简洁高级'?'简洁高级':'真实种草',desiredCta:undefined});
    const index=/生活|Lifestyle/.test(creative.direction)?1:/细节|Demo/.test(creative.direction)?2:0;
    content=contentOf(candidates[index]);
    content.direction=original.direction;content.coreBenefit=original.coreBenefit;
  }
  content.rationale=`本地化模板 · ${marketRules[targetMarket].spelling}。${marketRules[targetMarket].guidance}语气：${tone}。需当地语言使用者复核。`;
  return {content,notes:[
    sameLanguage?'同语言演示保留原文，调整有限拼写与 CTA；不代表完整文化适配。':'跨语言演示根据原 Brief 与创意方向重建有限模板，不是逐句翻译；用户编辑的表达需人工核对。',
    `目标市场：${marketRules[targetMarket].spelling}；语气：${tone}。${marketRules[targetMarket].guidance}`,
    `目标货币为 ${marketRules[targetMarket].currency}。未提供当地售价与汇率，保持原币种，不自动换算。`,
    '不编造价格、计量单位转换、客户评价或当地表现；商品名与原始中文卖点保留供审核。',
  ]};
}};
