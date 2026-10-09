'use client';
import { useRef, useState } from 'react';
import { X } from 'lucide-react';
import { contentOf, synchronizeEditedScript } from '@/lib/creative';
import { autoChecks } from '@/lib/quality';
import type { Creative, CreativeContent } from '@/lib/types';

export function CreativeEditor({creative,disabled,onSave}: {creative: Creative;disabled: boolean;onSave:(content: CreativeContent)=>boolean}) {
  const dialog=useRef<HTMLDialogElement>(null);
  const [draft,setDraft]=useState(()=>({...contentOf(creative),headline:creative.headline??creative.hook}));const [error,setError]=useState('');
  function open(){setDraft({...contentOf(creative),headline:creative.headline??creative.hook});setError('');dialog.current?.showModal();dialog.current?.querySelector('textarea')?.focus();}
  function save(e: React.FormEvent){
    e.preventDefault();
    const invalid=autoChecks({...creative,...draft}).find(c=>!c.pass);
    if(invalid){setError(invalid.reason);return;}
    if(!draft.headline?.trim()){setError('请填写广告标题');return;}
    if(onSave(synchronizeEditedScript(creative,draft)))dialog.current?.close();
  }
  return <><button className="button secondary" disabled={disabled} onClick={open}>编辑创意</button><dialog ref={dialog} className="workspace-dialog" aria-labelledby="editor-title">
    <form onSubmit={save}><div className="dialog-heading"><div><h2 id="editor-title">编辑当前创意</h2><p>保存为新版本，保留此前内容。</p></div><button type="button" aria-label="关闭编辑" onClick={()=>dialog.current?.close()}><X size={20}/></button></div>
      {(['hook','body','headline','cta'] as const).map(key=><label className="field" key={key}>{({hook:'Hook',body:'广告正文',headline:'Headline',cta:'CTA'})[key]}<textarea autoFocus={key==='hook'} required maxLength={key==='body'?4000:500} rows={key==='body'?4:2} value={draft[key]??''} onChange={e=>setDraft({...draft,[key]:e.target.value})}/></label>)}
      <details className="creative-inputs"><summary>编辑 15 秒视频脚本</summary>{draft.script.map((scene,index)=><fieldset key={index} className="scene-editor"><legend>镜头 {index+1} · {scene.time}</legend>{(['visual','voiceover','subtitle','sound'] as const).map(key=><label key={key} className="field">{({visual:'画面',voiceover:'旁白',subtitle:'屏幕字幕',sound:'声音'})[key]}<textarea maxLength={2000} rows={2} required={key==='visual'} value={scene[key]??''} onChange={e=>setDraft({...draft,script:draft.script.map((s,i)=>i===index?{...s,[key]:e.target.value}:s)})}/></label>)}</fieldset>)}</details>
      {error&&<p className="error-banner" role="alert">{error}</p>}<div className="dialog-actions"><button type="button" className="button secondary" onClick={()=>dialog.current?.close()}>取消</button><button disabled={disabled} className="button primary" type="submit">保存新版本</button></div>
    </form></dialog></>;
}
