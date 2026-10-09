'use client';
import { createContext, useContext, useEffect, useState } from 'react';
import type { Project, ProductInput } from '@/lib/types';
import { LocalStorageProjectRepository, STORAGE_KEY } from '@/lib/storage';
import { featuredCaseId, featuredInput, featuredCreatives } from '@/lib/featured-case';
import { validateInput } from '@/lib/mock';
import { outputLanguage } from '@/lib/intelligence';
import { duplicateProject } from '@/lib/creative';
import { appendSignals, type SignalContext } from '@/lib/signals';
import type { UsefulSignal } from '@/lib/types';
import { track } from '@/lib/analytics';
type Context = { projects: Project[]; ready: boolean; error: string; openFeatured: () => Project; create: (input: ProductInput, isExample?: boolean) => Project; update: (project: Project, expectedUpdatedAt?: string) => void; duplicate: (id: string) => Project; remove: (id: string) => void; importProjects:(projects: Project[])=>number; rawBackup:()=>string; recordSignal:(type:UsefulSignal['type'],context:SignalContext)=>void; recordSignals:(type:UsefulSignal['type'],contexts:SignalContext[])=>void };
const ProjectContext = createContext<Context | null>(null);
export function ProjectProvider({children}: {children: React.ReactNode}) {
  const [projects,setProjects] = useState<Project[]>([]); const [ready,setReady] = useState(false); const [error,setError] = useState('');
  useEffect(() => { const load = () => { try { setProjects(new LocalStorageProjectRepository(localStorage).list()); setError(''); } catch { setError('无法读取本地项目数据。为避免覆盖已有数据，暂时停用保存；可在项目页下载原始备份后重试。'); } setReady(true); }; load(); const sync = (e: StorageEvent) => { if (e.key === STORAGE_KEY || e.key===null) load(); }; window.addEventListener('storage',sync); return () => window.removeEventListener('storage',sync); },[]);
  function repository() { if(!ready||error)throw new Error('本地存储暂不可用');return new LocalStorageProjectRepository(localStorage); }
  function persist(project: Project, expectedUpdatedAt?: string) {
    const repo=repository();
    try { const stored=repo.list().find(p=>p.id===project.id);const signals=[...new Map([...(stored?.signals??[]),...(project.signals??[])].map(s=>[s.id,s])).values()];repo.save({...project,signals},expectedUpdatedAt); } catch(e) { if(e instanceof DOMException)throw new Error('保存失败，浏览器存储可能已满或被禁用；原有数据保留。');throw e; }
    setProjects(repo.list());
  }
  function create(input: ProductInput, isExample = false) { const invalid = validateInput(input); if (invalid) throw new Error(invalid); const time = new Date().toISOString(); const project: Project = { id: crypto.randomUUID(), createdAt: time, updatedAt: time, input: { ...input,tone:input.tone??'Casual',objective:input.objective??'Conversion',language:outputLanguage(input), name: input.name.trim(), benefits: input.benefits.trim(), audience: input.audience.trim() }, creatives: [], revision: 0, isExample, status:'draft' }; persist(project); track('project_created');track('brief_completed');return project; }
  function openFeatured() {
      const existing=repository().list().find(p=>p.caseId===featuredCaseId);
      if(existing)return existing;
      const time=new Date().toISOString();
      const result: Project={id:crypto.randomUUID(),createdAt:time,updatedAt:time,input:{...featuredInput},creatives:featuredCreatives(),revision:0,isExample:true,caseId:featuredCaseId,status:'active'};
      persist(result);return result;
  }
  function update(project: Project, expectedUpdatedAt?: string) { const previous=projects.find(p=>p.id===project.id);if(!previous)throw new Error('项目已删除，请返回项目列表。');persist(project,expectedUpdatedAt??previous.updatedAt); }
  function duplicate(id: string) { const source=repository().list().find(p=>p.id===id);if(!source)throw new Error('项目不存在');const result=duplicateProject(source);persist(result);return result; }
  function remove(id: string) { const repo=repository();repo.remove(id);setProjects(repo.list());track('project_deleted'); }
  function importProjects(incoming: Project[]){const repo=repository();const count=repo.merge(incoming);setProjects(repo.list());return count;}
  function recordSignals(type:UsefulSignal['type'],contexts:SignalContext[]){if(!contexts.length)return;const projectId=contexts[0].projectId;if(contexts.some(c=>c.projectId!==projectId))throw new Error('批量记录必须来自同一项目。');const repo=repository();const p=repo.list().find(p=>p.id===projectId);if(!p)throw new Error('项目不存在');persist(appendSignals(p,type,contexts),p.updatedAt);}
  function recordSignal(type:UsefulSignal['type'],context:SignalContext){recordSignals(type,[context]);}
  function rawBackup(){return localStorage.getItem(STORAGE_KEY)??'[]';}
  return <ProjectContext.Provider value={{projects,ready,error,create,update,openFeatured,duplicate,remove,importProjects,rawBackup,recordSignal,recordSignals}}>{children}</ProjectContext.Provider>;
}
export function useProjects() { const context = useContext(ProjectContext); if (!context) throw new Error('Missing ProjectProvider'); return context; }
