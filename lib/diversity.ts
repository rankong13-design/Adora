import type { CreativeContent } from './types.ts';

function grams(text:string) {
  const clean=text.normalize('NFKC').toLowerCase().replace(/[\p{P}\p{Z}\s]/gu,'');
  return new Set(Array.from({length:Math.max(0,clean.length-2)},(_,i)=>clean.slice(i,i+3)));
}
export function textSimilarity(a:string,b:string) {
  if(!a.trim()||!b.trim())return 0;
  const left=grams(a),right=grams(b);
  if(!left.size||!right.size)return a.trim()===b.trim()?1:0;
  return 2*[...left].filter(g=>right.has(g)).length/(left.size+right.size);
}
export function diversityWarnings(items:CreativeContent[]) {
  const warnings:string[]=[];
  items.forEach((a,i)=>items.slice(i+1).forEach((b,j)=>{
    const hook=textSimilarity(a.hook,b.hook);
    const logic=textSimilarity(a.concept??a.subtitle,b.concept??b.subtitle);
    // Shared timing/CTA are a format contract, not evidence of identical strategy.
    const scenes=textSimilarity(a.script.slice(0,-1).map(s=>s.visual).join(' '),b.script.slice(0,-1).map(s=>s.visual).join(' '));
    if(hook>=0.84||logic>=0.9&&scenes>=0.88)warnings.push(`第${i+1}与第${i+j+2}套${hook>=0.84?'开场高度相似':'创意逻辑与关键画面接近'}，建议修改后再比较。`);
  }));
  return warnings;
}
