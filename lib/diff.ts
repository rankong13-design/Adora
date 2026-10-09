import type { CreativeContent } from './types.ts';
export function changedElements(before:CreativeContent,after:CreativeContent):string[] {
  const labels={hook:'Hook',body:'Primary Copy',headline:'Headline',cta:'CTA',coreBenefit:'Value Proposition',concept:'Creative Logic',buyingReason:'购买理由',firstFrame:'首帧',props:'拍摄准备',evidence:'证据备注'} as const;
  const changed=Object.entries(labels).filter(([key])=>before[key as keyof typeof labels]!==after[key as keyof typeof labels]).map(([,label])=>`${label} 已修改`);
  if(before.script.length!==after.script.length)changed.push('镜头数量已修改');
  after.script.forEach((s,i)=>{
    const old=before.script[i];
    if(!old){changed.push(`新增镜头 ${i+1}`);return;}
    for(const [field,label] of Object.entries({time:'时间',visual:'画面',voiceover:'旁白',subtitle:'字幕',sound:'声音',title:'任务'}))if(old[field as keyof typeof s]!==s[field as keyof typeof s])changed.push(`镜头 ${i+1} ${label}已修改`);
  });
  return changed;
}
