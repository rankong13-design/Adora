import type { Creative, CreativeScore, ProductInput, ScoreDimension } from './types.ts';
import { contentSnapshot } from './creative.ts';
import { autoChecks } from './quality.ts';
import { outputLanguage } from './intelligence.ts';

export const scoreDisclaimer = 'Creative Score is an AI-assisted qualitative assessment, not a performance prediction. 此处为规则辅助评分，无法核实事实或预测 CTR / CVR。';
export function scoreCreative(c: Creative, input: ProductInput): CreativeScore {
  const words = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;
  const hookShort = outputLanguage(input)==='en' ? words(c.hook)<=12 : c.hook.length<=40;
  const signals = [
    ['hook','Hook Strength', !!c.hook.trim(), hookShort && /[?？!！]|look|picture|check|lihat|確認/i.test(c.hook),'开场文字非空，检查长度与提问／行动提示。','用一个具体问题或可见动作开始，避免泛泛介绍。'],
    ['clarity','Clarity', !!c.body.trim(), words(c.body)<=55 && c.body.length<=400,'检查正文长度；短文不一定有说服力。','缩短正文，让每句话传达一个信息。'],
    ['audience','Audience Fit', !!c.buyingReason, !!input.usageContext?.trim() && !!input.audience.trim(),'检查 Brief 的场景线索与购买理由是否存在，未验证真实需求。','补充受众在什么时刻、遇到什么顾虑。'],
    ['platform','Platform Fit',autoChecks(c).every(x=>x.pass),input.platform==='TikTok'?hookShort:c.body.length<=350,'检查 15 秒结构和文字密度，不评估实际版位表现。','检查首帧、字幕安全区与实际朗读时长。'],
    ['value','Value Proposition',!!c.coreBenefit.trim(),!!c.evidence && !/未提供|尚未提供/.test(c.evidence),'检查是否有卖点和证据备注；备注不等于事实已验证。','用可核实的产品特点说明具体用途。'],
    ['cta','CTA Strength',!!c.cta.trim(),c.cta.length<=50 && /tap|check|shop|see|discover|explore|look|lihat|cek|確認|見る|チェック/i.test(c.cta),'检查行动动词和长度，不评估用户行为。','给出一个具体的下一步，避免多个行动目标。'],
    ['localization','Localization Fit',!!c.rationale.trim(),c.rationale.length>=25 && !/通用表达/.test(c.rationale),'检查是否解释语言与市场调整，不验证文化适配。','请当地语言使用者审核语气、拼写和 CTA。'],
  ] as const;
  const dimensions: ScoreDimension[]=signals.map(([key,label,present,strong,reason,suggestion])=>({key,label,score:present?(strong?85:60):25,reason,suggestion}));
  return {total:Math.round(dimensions.reduce((sum,d)=>sum+d.score,0)/dimensions.length),dimensions,method:'heuristic-v1',snapshot:contentSnapshot(c),scoredAt:new Date().toISOString()};
}
