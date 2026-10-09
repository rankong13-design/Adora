'use client';
import { useEffect, useState } from 'react';

export function GenerationControls({busy,blocked,hasResults,selected,onGenerate}:{busy:boolean;blocked:boolean;hasResults:boolean;selected?:string;onGenerate:(mode:'mock'|'ai')=>void}) {
  const [mode,setMode]=useState<'mock'|'ai'>('mock');
  const [service,setService]=useState<{available:boolean;provider?:string;model?:string}|null>(null);
  const [statusError,setStatusError]=useState(false);
  const [check,setCheck]=useState(0);
  useEffect(()=>{
    const controller=new AbortController();
    setService(null); setStatusError(false);
    fetch('/api/generate',{signal:controller.signal}).then(async r=>{
      if(!r.ok)throw new Error(); const data=await r.json();
      if(typeof data.available!=='boolean')throw new Error();
      setService(data);
    }).catch(()=>{if(!controller.signal.aborted)setStatusError(true);});
    return ()=>controller.abort();
  },[check]);
  return <section className="generation-controls" aria-label="生成方式">
    <div className="generation-choice"><label>生成方式<select aria-label="生成方式" value={mode} disabled={busy} onChange={e=>setMode(e.target.value as 'mock'|'ai')}><option value="mock">本地演示</option><option value="ai">真实 AI</option></select></label>
      <button className="button primary" disabled={busy||blocked||!selected||(mode==='ai'&&!service?.available)} onClick={()=>onGenerate(mode)}>{busy?'正在生成…':hasResults?'重新生成所选方向':'生成所选方向'}</button></div>
    <p>{selected?`所选方向：${selected==='pain-point'?'Pain Point':selected==='product-demo'?'Product Demo':'Lifestyle'}。`:'请先选择上方策略方向。'} {mode==='mock'?'使用固定模板验证流程；未识别的卖点不会自动翻译或核实。':service?.available?`使用 ${service.provider} · ${service.model}。点击生成会把商品资料发送到该服务，可能产生费用；每小时最多请求6次。`:statusError?'无法检查 AI 配置，请稍后重试。':service?'真实 AI 尚未配置，可先使用本地演示。':'正在检查 AI 配置…'}</p>
    {mode==='ai'&&(!service?.available)&&<button className="text-button" disabled={busy} onClick={()=>setCheck(n=>n+1)}>重新检查配置</button>}
    {mode==='ai'&&service?.available&&<p>内容不完整时最多自动修正一次，每次修正也计入请求额度；认证、限流或连接失败不自动重试。</p>}
    {hasResults&&<p>成功后为所选方向添加新版本，保留历史与副本；旧评分失效；失败时保留当前结果。</p>}
  </section>;
}
