'use client';
import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { useProjects } from '@/components/project-provider';
import type { SignalContext } from '@/lib/signals';
import { track } from '@/lib/analytics';

const CopySignalContext=createContext<SignalContext|undefined>(undefined);
export function SignalScope({context,children}:{context?:SignalContext;children:React.ReactNode}){return <CopySignalContext.Provider value={context}>{children}</CopySignalContext.Provider>;}
export function CopyButton({text, label,signal}: {text: string; label: string;signal?:SignalContext|null}) {
  const inherited=useContext(CopySignalContext);const context=signal===null?undefined:signal??inherited;const {recordSignal}=useProjects();
  const [state, setState] = useState<'idle' | 'done' | 'error' | 'unrecorded'>('idle');
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const version = useRef({number:0});
  useEffect(() => {
    const token=version.current;token.number++;
    setState('idle');
    return () => { token.number++; if (timer.current) clearTimeout(timer.current); };
  }, [text]);
  async function copy() {
    const current = version.current.number;
    try {
      await navigator.clipboard.writeText(text);
      if (current !== version.current.number) return;
      setState('done');
      if(context)try{recordSignal('copy',context);}catch{setState('unrecorded');}
      track('creative_copied',{asset:label});
    } catch {
      if (current !== version.current.number) return;
      setState('error');
    }
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setState('idle'), 2500);
  }
  return <button type="button" className="text-button single-copy" aria-label={`复制${label}`} onClick={copy}><span aria-live="polite">{state === 'done' ? '已复制' : state==='unrecorded'?'已复制 · 记录未保存':state === 'error' ? '复制失败，请手动选择' : '复制'}</span></button>;
}
