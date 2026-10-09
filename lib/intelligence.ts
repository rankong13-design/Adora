import type { Country, Language, ProductInput } from './types.ts';

export const marketRules: Record<Country, { language: Language; spelling: string; currency: string; guidance: string }> = {
  US: { language:'en', spelling:'American English', currency:'USD', guidance:'直接、清晰地解释用途；仅引用已提供的价格与证据。' },
  GB: { language:'en', spelling:'British English', currency:'GBP', guidance:'使用英式拼写与自然表达，避免夸大和强迫性的购买语言。' },
  SG: { language:'en', spelling:'Singapore English', currency:'SGD', guidance:'使用清晰英语，避免假设所有东南亚国家使用相同语言；不强行添加 Singlish。' },
  ID: { language:'id', spelling:'Bahasa Indonesia', currency:'IDR', guidance:'使用自然印尼语；对俚语和宗教文化保持谨慎，不推断当地受众偏好。' },
  JP: { language:'ja', spelling:'Japanese', currency:'JPY', guidance:'使用短句与温和 CTA；保留可核对的规格，不捏造认证。' },
};
export const platformRules = {
  TikTok: { hook:'前 3 秒展示明确动作或问题', copy:'短、口语化；让字幕和画面共同叙事', visual:'竖屏原生内容、真实使用过程；字幕避开界面遮挡' },
  Instagram: { hook:'首帧呈现清楚的产品价值', copy:'利益清晰，正文与标题相互补充', visual:'适合 Feed / Stories 的产品细节、留白和字幕安全区' },
  Facebook: { hook:'用受众熟悉的问题引入', copy:'清晰的价值、购买理由和具体行动提示', visual:'画面与正文能独立理解，不依赖声音' },
} as const;
export const outputLanguage = (input: ProductInput): Language => input.language ?? marketRules[input.country].language;
export const patterns = [
  ['problem-solution','Problem / Solution','先提出购买顾虑，再用已知特点回应。','Conversion','问题 → 特点演示 → CTA'],
  ['before-after','Before / After','比较工作流程；不捏造功效前后对比。','Traffic','原流程 → 使用过程 → 新流程'],
  ['ugc','UGC Walkthrough','创作者口吻展示使用过程；不虚构客户评价。','Awareness','个人视角 → 实际演示 → 选择建议'],
  ['demo','Product Demo','用可执行的镜头展示产品细节。','Product Launch','首帧 → 动作 → 细节 → CTA'],
  ['myth','Myth Busting','拆解常见疑问，结论必须有依据。','Awareness','疑问 → 可核实证据 → 解释'],
  ['proof','Evidence-led','展示可核实的规格或证据，避免虚构社会认同。','Retargeting','疑问 → 证据 → 限制 → CTA'],
  ['benefit','Feature → Benefit','说明商品特点如何服务一个具体场景。','Conversion','特点 → 使用场景 → 价值'],
  ['offer','Limited Offer','仅使用卖家确认的促销与时效。','Conversion','已确认优惠 → 适用条件 → CTA'],
  ['founder','Founder Story','由卖家提供真实的设计动机。','Awareness','真实起点 → 设计选择 → 商品'],
  ['comparison','Comparison','对比可核实的选购维度，避免无依据排名。','Retargeting','维度 → 证据 → 取舍'],
  ['lifestyle','Lifestyle','把商品放入受众可以想象的日常。','Traffic','场景 → 使用 → 下一段日常'],
  ['curiosity','Curiosity Hook','用具体问题吸引注意，及时兑现。','Awareness','问题 → 细节揭示 → CTA'],
].map(([id,name,description,bestFor,exampleStructure])=>({id,name,description,bestFor,exampleStructure,platformFit:['TikTok','Instagram','Facebook']}));

export function promptContext(input: ProductInput) {
  return {
    product:{name:input.name,description:input.description,benefits:input.benefits,category:input.category,price:input.price,url:input.productUrl,evidence:input.evidenceSources},
    audience:{market:input.country,language:outputLanguage(input),audience:input.audience,painPoints:input.painPoints,usageContext:input.usageContext,purchaseConcern:input.purchaseConcern},
    campaign:{platform:input.platform,objective:input.objective??'Conversion',tone:input.tone??input.style,offer:input.offer,cta:input.desiredCta},
    rules:{market:marketRules[input.country],platform:platformRules[input.platform as keyof typeof platformRules],pattern:patterns.find(p=>p.id===input.patternId)},
  };
}
