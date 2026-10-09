'use client';
import { useEffect,useState } from 'react';
import type { GenerationProgress } from '@/lib/generation-stream';

export function GenerationStatus({startedAt,progress,hasResults,onCancel}:{startedAt:number;progress:GenerationProgress|null;hasResults:boolean;onCancel:()=>void}) {
  const [elapsed,setElapsed]=useState(0);
  useEffect(()=>{const tick=()=>setElapsed(Math.floor((Date.now()-startedAt)/1000));tick();const timer=setInterval(tick,1000);return ()=>clearInterval(timer);},[startedAt]);
  const title=progress?.phase==='repairing'?'正在修正不完整内容':progress?.phase==='validating'?'内容已返回，正在检查':progress?.phase==='receiving'?'正在接收创意内容':'正在等待 AI 响应';
  return <section className="generation-waiting" aria-label="生成状态">
    <div><span className="spinner" aria-hidden="true"/><span role="status">{title}{progress?.receivedCharacters?` · 已接收 ${progress.receivedCharacters} 字符`:''}</span><span className="generation-elapsed">已等待 {elapsed} 秒</span></div>
    <p>{hasResults?'下方保留上一次结果，生成成功后才替换。':'收到所选方向的完整结果并通过检查后，会显示在这里。'}{elapsed>=25?' 当前模型响应较慢，可取消等待。':''} 最多等待 75 秒。</p>
    <button className="text-button" onClick={onCancel}>取消本次生成</button>
  </section>;
}
