export type InspirationInput = { headline:string;body:string;description:string };
export const inspirationExamples: (InspirationInput & {id:string;name:string;patternId:string})[] = [
  {id:'routine',name:'日常产品演示',patternId:'lifestyle',headline:'A small part of your everyday routine.',body:'See the product in use. Check the details and decide if it fits your day.',description:'原创教学示例：准备出门 → 实际使用 → 产品细节 → CTA；不是来自真实广告库。'},
  {id:'detail',name:'细节探索',patternId:'demo',headline:'Look closer before you choose.',body:'A close-up, a clear demonstration, and the details you need before buying. Explore the specifications.',description:'原创教学示例：近景提出疑问，以可核实规格回应；不包含真实性能数据。'},
  {id:'question',name:'选购疑问',patternId:'problem-solution',headline:'What matters most in your next purchase?',body:'Start with your needs. Compare the product details, see how it works, and make your own choice.',description:'原创教学示例：问题 → 实际动作 → 核对规格；不虚构功效承诺。'},
];
export function analyzeInspiration(input: InspirationInput) {
  if(!input.headline.trim()&&!input.body.trim())throw new Error('请提供标题或广告正文');
  if(input.headline.length>500||input.body.length>3000||input.description.length>1500)throw new Error('广告内容超过长度限制');
  const text=`${input.headline} ${input.body}`;
  const question=/[?？]/.test(input.headline);const demonstration=/see|look|detail|show|展示|细节|演示/i.test(text);
  const patternId=question?'problem-solution':demonstration?'demo':'lifestyle';
  return {patternId,dimensions:[
    ['Hook type',question?'疑问型开场':demonstration?'细节／演示型开场':'场景／陈述型开场'],
    ['Angle',question?'选购顾虑 → 信息回应':demonstration?'产品细节 → 选择依据':'日常场景 → 用途关联'],
    ['Value proposition','需要对照商品事实和受众研究核对；规则不能从文案验证真实价值。'],
    ['CTA',/shop|buy|购买/i.test(text)?'购买行动':/explore|check|see|look|查看|了解/i.test(text)?'探索／查看信息':'未发现明确行动词，建议人工检查'],
    ['Tone',/[!！]/.test(text)?'语气可能偏强，需结合上下文判断':'语气可能偏平实，需人工复核'],
    ['Audience','无法仅凭文案可靠推断真实受众，创建 Brief 时自行定义。'],
    ['Creative pattern',patternId],
    ['What can be learned','借鉴问题、信息揭示与 CTA 的顺序；使用你自己的商品事实与原创表达。'],
  ]};
}
