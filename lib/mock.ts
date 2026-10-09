import type { Creative, ProductInput } from './types.ts';
import { countries, languages, objectives, tones } from './types.ts';
import { outputLanguage, patterns, platformRules, marketRules } from './intelligence.ts';

export const exampleInput: ProductInput = { name: '轻量随行保温杯', benefits: '316 不锈钢内胆；500ml 容量；防漏杯盖；适合日常通勤', category: '家居生活', country: 'US', audience: '25–35 岁的都市通勤人群', platform: 'TikTok', style: '真实种草' };
export const emptyInput: ProductInput = { name: '', benefits: '', category: '家居生活', country: 'US', audience: '', platform: 'TikTok', style: '真实种草' };
const dictionary: [RegExp, string, string][] = [
  [/316.*不锈钢/, '316 stainless steel interior', '316ステンレス製の内側'],
  [/500\s*ml/i, '500 ml capacity', '500mlの容量'],
  [/防漏/, 'a leak-resistant lid', '漏れにくいふた'],
  [/轻量|轻便/, 'a lightweight design', '軽量デザイン'],
  [/便携/, 'a portable design', '持ち運びやすいデザイン'],
  [/可折叠|折叠/, 'a foldable design', '折りたたみ式デザイン'],
  [/无线/, 'a wireless design', 'ワイヤレス設計'],
];
export function validateInput(input: ProductInput): string | null {
  if (!input || ['name','benefits','category','country','audience','platform','style'].some(k => typeof input[k as keyof ProductInput] !== 'string')) return '商品信息格式不正确';
  for (const key of ['usageContext','purchaseConcern','evidenceSources'] as const) {
    if (input[key] !== undefined && (typeof input[key] !== 'string' || input[key]!.length > (key==='evidenceSources'?2000:500))) return '补充信息格式不正确或超过长度限制';
  }
  for (const key of ['description','price','productUrl','offer','desiredCta','painPoints','patternId'] as const) {
    if(input[key]!==undefined&&(typeof input[key]!=='string'||input[key]!.length>(key==='description'?1000:500)))return 'Brief 信息格式不正确或超过长度限制';
  }
  if(input.language!==undefined&&!Object.hasOwn(languages,input.language))return '请选择支持的输出语言';
  if(input.objective!==undefined&&!objectives.includes(input.objective))return '请选择营销目标';
  if(input.tone!==undefined&&!Object.hasOwn(tones,input.tone))return '请选择支持的语气';
  if(input.patternId&& !patterns.some(p=>p.id===input.patternId))return '请选择支持的创意模式';
  if(input.productUrl){try{if(!['https:','http:'].includes(new URL(input.productUrl).protocol))return '商品链接须为 HTTP / HTTPS';}catch{return '请输入完整商品链接';}}
  if (!input.name.trim()) return '请填写商品名称';
  if (!input.benefits.split(/[；;\n]/).some(s=>s.trim())) return '请填写至少一项商品卖点';
  if (!input.audience.trim()) return '请填写目标用户';
  if (input.name.length > 80 || input.benefits.length > 800 || input.audience.length > 160) return '输入内容超过长度限制';
  if (!Object.hasOwn(countries,input.country)) return '请选择支持的目标国家';
  if (!['家居生活','美妆个护','服饰配件','数码电子','运动户外','其他'].includes(input.category)) return '请选择产品类别';
  if (!['TikTok','Instagram','Facebook'].includes(input.platform)) return '请选择广告平台';
  if (!['真实种草','痛点解决','简洁高级'].includes(input.style)) return '请选择广告风格';
  return null;
}
export function generateCreatives(input: ProductInput, revision = 0): Creative[] {
  const error = validateInput(input); if (error) throw new Error(error);
  const jp = outputLanguage(input) === 'ja';
  const isCup = /杯/.test(input.name) && input.category === '家居生活';
  const leak = isCup && /防漏/.test(input.benefits);
  const subject = isCup ? (jp ? 'このタンブラー' : 'this tumbler') : (jp ? 'このアイテム' : 'this everyday pick');
  const known = dictionary.filter(([re]) => re.test(input.benefits)).map(([,en,ja]) => jp ? ja : en);
  const feature = known.slice(0, 2).join(jp ? '、' : ' and ');
  const benefits = input.benefits.split(/[；;\n]/).map(s=>s.trim()).filter(Boolean);
  const core = [leak ? benefits.find(s=>/防漏/.test(s))! : benefits[0], benefits.find(s=>/通勤|日常|便携|轻量|轻便/.test(s)) || benefits[0], benefits.find(s=>/材质|不锈钢|容量|结构|ml/i.test(s)) || benefits[0]];
  const favorite = input.country === 'GB' ? 'favourite' : 'favorite';
  const hooks = jp ? [
    [leak ? 'バッグに入れる前、ふたを確認していますか？' : '選ぶとき、何が気になりますか？', '買う前に、気になる点をチェック。'],
    ['いつもの一日に、こんな選択。','朝から始まる、小さな日常。'],
    ['そのディテール、近くで見てみよう。','選ぶ前に、細部をチェック。']
  ] : [
    [leak ? `Your ${favorite} bag. A lid worth checking.` : `What matters in your next everyday ${favorite}?`, 'Before you buy, what matters most?'],
    ['One morning. Part of your routine.','Picture this in your everyday routine.'],
    ['Look closer before you choose.','The details, up close.']
  ];
  const styleHooks = jp ? ['気になる点から、選ぶ。','日常に、余白を。','細部を見る。'] : ['Choose with care.','Everyday. Considered.','Details. Up close.'];
  const rhythm = input.tone==='Demonstrative'?'固定机位，先完整展示动作再给细节字幕':input.tone==='Energetic'?'短促切镜与明确动作，保持字幕可读':input.style === '简洁高级'||input.tone==='Premium'||input.tone==='Minimal' ? '干净背景、简短字幕、缓慢运镜' : input.style === '痛点解决' ? '以提问字幕突出选择时的顾虑，不制作未经验证的效果对比' : '自然光、手持镜头、真实使用动作';
  const context = input.usageContext?.trim() || (isCup ? '出门准备、通勤途中、到达工位' : '按商品实际用途选择准备、使用、收纳三个连续场景（待确认）');
  const bodies = jp ? [
    `${leak ? '持ち歩く前に、ふたの構造を確認。' : '自分が気になるポイントから、商品を見てみよう。'}${subject}の${known.length ? feature : '詳しい情報'}をチェック。購入前に商品ページで仕様を確認。`,
    `${subject}を使う場面を、朝の準備から想像してみよう。${known.length ? feature + '。' : ''}自分の生活に合うか、使い方を見て選ぼう。`,
    `${subject}を近くで見てみよう。${known.length ? feature + '。' : ''}写真や仕様を見比べて、気になる細部を商品ページで確認。`
  ] : [
    `${leak ? 'Packing your bag? Start by checking the lid.' : 'Start with what matters to you before you buy.'} Take a look at ${subject}${known.length ? ` with ${feature}` : ''}. Check the product specifications before deciding.`,
    `From getting ready to your next everyday moment, picture where ${subject} could fit. ${known.length ? `Explore ${feature}. ` : ''}Watch the routine and decide if it suits yours.`,
    `See ${subject} up close. ${known.length ? `Look at ${feature}. ` : ''}Pause on the details, compare the specifications, and take a closer look on the product page.`
  ];
  const ctas = jp ? ['仕様を確認','使い方をチェック','細部を見る'] : input.platform === 'TikTok' ? ['Tap to check the specs','Explore your everyday fit','Take a closer look'] : ['Check the specifications','See it in your routine','Discover the details'];
  const openVisuals = [
    leak ? '用准备把杯子放进包里的动作提出“出门前，你会检查杯盖吗？”；不拍漏水或绝对防漏的效果承诺' : '用选择商品时的一个疑问开场，让字幕提出需求，不预设商品具有未提供的功效',
    `用连续动作交代生活场景：${context}`,
    '从商品整体切到一个资料中已确认的细节近景，不添加没有依据的品质认证'
  ];
  const middleVisuals = [
    leak ? '近拍杯盖的开合和结构，对应已提供的防漏卖点；不做无依据的极限测试' : `展示与「${core[0]}」相关的实际结构或动作，回答开场的选择问题`,
    `将「${input.name}」放入上述场景，完整展示一次实际使用动作`,
    `特写「${core[2]}」，用字幕标注卖家提供的事实；未确认的参数不展示`
  ];
  const proofVisuals = [
    '回到开场的问题，列出购买前应核对的规格，让观众自行判断是否满足需求',
    '用下一段生活动作承接商品使用过程，突出场景连续性，不做功效前后对比',
    '切换第二个角度或另一项已确认的细节，留出时间看清结构和参数'
  ];
  const closingVoices = jp ? ['購入前に、仕様を確認。','自分の一日を、想像してみよう。','細部を見て、選んでみよう。'] : ['Check what matters before you choose.','Picture where it fits in your day.','Pause. Look closer. Then decide.'];
  const result: Creative[] = ['痛点解决','生活场景','产品细节'].map((direction,index) => {
    const focusedFeatures = dictionary.filter(([re]) => re.test(core[index])).map(([,en,ja]) => jp ? ja : en);
    const directionFeature = focusedFeatures.length ? focusedFeatures.join(jp ? '、' : ' and ') : feature;
    const baseHook = hooks[index][revision % 2];
    const hook = (input.style === '简洁高级'||input.tone==='Premium'||input.tone==='Minimal') && revision % 2 === 0 ? styleHooks[index] : input.style === '痛点解决' ? `${jp ? '選ぶ前に。' : 'Before you choose. '}${baseHook}` : baseHook;
    return {
      id: `creative-${revision}-${index}`, direction,
      subtitle: ['为什么需要：从选择顾虑切入','怎样使用：讲一段完整日常','为什么考虑：用具体细节帮助判断'][index],
      concept: ['提出一个购买顾虑，再通过商品的已知特点回答问题。','围绕一次具体使用过程，串联准备、使用与收纳。','以商品结构或规格近景，帮助观众判断是否适合自己。'][index] + '（本地模板草案）',
      buyingReason: input.purchaseConcern?.trim() ? `围绕卖家提供的顾虑「${input.purchaseConcern.trim()}」组织表达；需确认商品特点能否回应。` : '尚未提供具体购买顾虑，需要人工补充，不代表已识别出真实需求。',
      firstFrame: `${input.usageContext?.trim() ? `情境：${input.usageContext.trim()}。` : '场景尚待确认。'}${openVisuals[index]}。`,
      props: `「${input.name}」、对应使用环境的真实道具、拍摄手机与稳定支架；道具清单需按商品实际用途细化。`,
      evidence: input.evidenceSources?.trim() ? `卖家提供的待核对资料：${input.evidenceSources.trim()}。本地模板未访问链接或验证事实，不得据此声称已核实。` : '未提供证据资料；参数、功效与演示动作须人工核对，不承诺未确认的效果。',
      coreBenefit: core[index], hook, headline:jp?'日常に合う選択':input.platform==='TikTok'?'A closer look':'Made for your everyday routine', body: feature ? bodies[index].replace(feature,directionFeature) : bodies[index], cta: input.desiredCta?.trim() || ctas[index],
      script: [
        {time:'0–3s', visual:`面向「${input.audience}」。${openVisuals[index]}。屏幕出现 Hook。`,voiceover:hook},
        {time:'3–8s', visual:`${middleVisuals[index]}。拍摄风格：${rhythm}。`,voiceover:jp ? `${subject}。${directionFeature || '商品情報をチェック'}。` : `Explore ${subject}. ${directionFeature || 'Check the product details'}.`},
        {time:'8–12s', visual:proofVisuals[index],voiceover:closingVoices[index]},
        {time:'12–15s', visual:`商品定格，显示与本方向对应的 CTA；按 ${input.platform} 实际版位调整字幕安全区。`,voiceover:ctas[index]}
      ],
      rationale: `${marketRules[input.country].guidance}输出语言：${outputLanguage(input)}。${['本方向先提出购买顾虑，再展示可核对的商品特点，适合用来测试观众是否关心这一需求。','本方向用连续的使用场景帮助观众代入，适合测试商品与目标人群日常生活的关联。','本方向以近景和具体规格帮助判断，适合测试观众对商品细节的兴趣。'][index]}面向「${input.audience}」，以${input.style}风格编排 ${input.platform} 内容。这是 Mock 本地化假设，需由当地用户评审与投放测试验证。${known.length ? '外语卖点仅覆盖演示词库识别的部分，请对照中文信息审核。' : '当前卖点不在演示词库中，外语文案采用通用表达；中文原始卖点保留供审核。'}`
    };
  });
  if(outputLanguage(input)==='id')result.forEach((c,index)=>{
    c.hook=['Apa yang penting sebelum memilih?','Bayangkan dalam rutinitasmu.','Lihat detailnya lebih dekat.'][index];
    c.body=['Mulai dari kebutuhanmu. Periksa detail produk sebelum memutuskan.','Lihat cara produk ini dapat masuk dalam rutinitasmu. Pastikan sesuai kebutuhanmu.','Perhatikan detail dan spesifikasinya. Bandingkan sebelum memilih.'][index];
    c.cta=input.desiredCta?.trim()||'Lihat detail produk';c.headline='Pilihan untuk keseharianmu';
    c.script=c.script.map((s,i)=>({...s,voiceover:i===0?c.hook:i===3?c.cta:['Periksa detail produk.','Sesuaikan dengan kebutuhanmu.'][i-1],subtitle:i===0?c.hook:i===3?c.cta:'Lihat cara penggunaannya.'}));
  });
  result.forEach(c=>{
    const rule=platformRules[input.platform as keyof typeof platformRules];
    c.rationale+=` 平台指导：${rule.hook}；${rule.visual}。营销目标：${input.objective??'Conversion'}。`;
    if(input.patternId)c.rationale+=`参考结构：${patterns.find(p=>p.id===input.patternId)?.exampleStructure}；模板需人工适配。`;
    if(input.tone)c.rationale+=`语气：${tones[input.tone]}；Demo 仅调整有限节奏与表达。`;
    c.script[c.script.length-1].voiceover=c.cta;
    c.script=c.script.map((s,i)=>({...s,title:['开场问题','实际使用','产品细节','下一步行动'][i],subtitle:s.subtitle||s.voiceover,sound:input.style==='简洁高级'?'轻环境声；字幕出现时停顿':'自然动作声，避免盖过旁白'}));
  });
  return result;
}
export function scriptText(creative: Creative): string {
  return creative.script.map(s => `${s.time}${s.title ? ' · '+s.title : ''}\n画面：${s.visual}${s.subtitle ? '\n屏幕字幕：'+s.subtitle : ''}\n旁白：${s.voiceover || '无'}${s.sound ? '\n声音：'+s.sound : ''}`).join('\n\n') + (creative.props ? `\n\n拍摄准备：${creative.props}` : '') + (creative.evidence ? `\n\n拍摄证据与限制：${creative.evidence}` : '');
}
export function creativeText(creative: Creative): string {
  const brief = creative.concept ? `创意概念：${creative.concept}\n购买理由：${creative.buyingReason}\n首帧画面：${creative.firstFrame}\n\n` : '';
  return `【${creative.direction}】\n${brief}核心卖点：${creative.coreBenefit}\n\nHook\n${creative.hook}\n\n广告正文\n${creative.body}\n\nHeadline\n${creative.headline??''}\n\nCTA\n${creative.cta}\n\n15 秒短视频脚本\n${scriptText(creative)}\n\n为什么适合这个市场\n${creative.rationale}`;
}
