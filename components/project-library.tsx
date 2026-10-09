'use client';
import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Plus, Search, Trash2 } from 'lucide-react';
import { useProjects } from '@/components/project-provider';
import { PageHeading, LoadingState, EmptyState, ProjectCard } from '@/components/ui';
import { countries, type Project } from '@/lib/types';
import { downloadFile } from '@/lib/export';
import { parseProjects, isProject } from '@/lib/storage';

export function ProjectLibrary() {
  const {projects,ready,error,remove,duplicate,update,importProjects,rawBackup}=useProjects();const router=useRouter();
  const [query,setQuery]=useState('');const [market,setMarket]=useState('all');const [platform,setPlatform]=useState('all');const [status,setStatus]=useState('all');const [sort,setSort]=useState('updated');const [message,setMessage]=useState('');const [failed,setFailed]=useState(false);
  const [deleteId,setDeleteId]=useState<string|null>(null);const dialog=useRef<HTMLDialogElement>(null);const importing=useRef<HTMLInputElement>(null);
  const statusOf=(p: Project)=>p.status??(p.creatives.length?'active':'draft');
  const filtered=projects.filter(p=>(market==='all'||p.input.country===market)&&(platform==='all'||p.input.platform===platform)&&(status==='all'||statusOf(p)===status)&&`${p.input.name} ${p.input.audience} ${p.input.platform}`.toLowerCase().includes(query.trim().toLowerCase())).sort((a,b)=>sort==='name'?a.input.name.localeCompare(b.input.name):sort==='created'?b.createdAt.localeCompare(a.createdAt):b.updatedAt.localeCompare(a.updatedAt));
  function action(fn:()=>void){try{fn();setFailed(false);}catch(e){setMessage((e as Error).message);setFailed(true);}}
  function close(){dialog.current?.close();setDeleteId(null);}
  function backup(){action(()=>{downloadFile(rawBackup(),`Adora-browser-backup-${new Date().toISOString().slice(0,10)}.json`,'application/json');setMessage('已下载当前浏览器的原始备份。');});}
  async function importBackup(file: File) {
    try{
      if(error)throw new Error('本地数据读取异常，请先下载原始备份，暂不导入以免覆盖。');
      if(file.size>10000000)throw new Error('备份文件超过 10 MB');
      const raw=await file.text();const value:unknown=JSON.parse(raw);
      const incoming=isProject(value&&typeof value==='object'&&'project' in value?value.project:undefined)?[(value as {project:Project}).project]:parseProjects(raw);
      // Merge only new IDs; existing projects are never replaced by an import.
      const count=importProjects(incoming);
      setMessage(`已导入 ${count} 个新项目；已存在的项目未覆盖。`);setFailed(false);
    }catch(e){setMessage((e as Error).message);setFailed(true);}finally{if(importing.current)importing.current.value='';}
  }
  return <div className="page"><PageHeading eyebrow="CAMPAIGN LIBRARY" title="项目空间" description="打开、复用和整理每一个广告创作空间。" action={<Link href="/projects/new" className="button primary"><Plus size={16}/>新建项目</Link>}/>
    <div className="library-toolbar"><label className="search-box"><Search size={16}/><input value={query} aria-label="搜索项目" placeholder="搜索项目、受众或平台" onChange={e=>setQuery(e.target.value)}/></label><select aria-label="市场筛选" value={market} onChange={e=>setMarket(e.target.value)}><option value="all">全部市场</option>{Object.entries(countries).map(([key,c])=><option key={key} value={key}>{c.name}</option>)}</select><select aria-label="平台筛选" value={platform} onChange={e=>setPlatform(e.target.value)}><option value="all">全部平台</option>{['TikTok','Instagram','Facebook'].map(p=><option key={p}>{p}</option>)}</select><select aria-label="项目状态" value={status} onChange={e=>setStatus(e.target.value)}><option value="all">全部状态</option><option value="draft">待生成</option><option value="active">创作中</option><option value="archived">已归档</option></select><select aria-label="项目排序" value={sort} onChange={e=>setSort(e.target.value)}><option value="updated">最近编辑</option><option value="created">最近创建</option><option value="name">名称排序</option></select></div>
    <div className="library-backup"><span>{filtered.length} / {projects.length} 个项目 · 本地浏览器保存</span><div><button className="text-button" disabled={!ready} onClick={backup}>下载完整备份</button><button className="text-button" disabled={!ready||!!error} onClick={()=>importing.current?.click()}>导入 JSON 备份</button><input hidden type="file" accept="application/json,.json" ref={importing} onChange={e=>{const file=e.target.files?.[0];if(file)void importBackup(file);}}/></div></div>
    {(message||error)&&<p className={failed||error?'error-banner':'notice-banner'} role={failed||error?'alert':'status'}>{error||message}</p>}
    {!ready?<LoadingState/>:projects.length===0?<EmptyState/>:!filtered.length?<div className="quiet-empty"><p>没有匹配的项目。</p><button className="text-button" onClick={()=>{setQuery('');setMarket('all');setPlatform('all');setStatus('all');}}>清除筛选</button></div>:<div className="campaign-grid">{filtered.map(p=><article className="library-project" key={p.id}><ProjectCard project={p}/><div className="library-project-actions"><span className="pill">{statusOf(p)==='draft'?'待生成':statusOf(p)==='archived'?'已归档':'创作中'}</span><button className="text-button" disabled={!!error} onClick={()=>action(()=>router.push(`/projects/${duplicate(p.id).id}`))}>复制项目</button><button className="text-button" disabled={!!error} onClick={()=>action(()=>{update({...p,status:statusOf(p)==='archived'?'active':'archived',updatedAt:new Date().toISOString()});setMessage('项目状态已更新。');})}>{statusOf(p)==='archived'?'取消归档':'归档'}</button><button className="text-button" aria-label={`删除项目：${p.input.name}`} disabled={!!error} onClick={()=>{setDeleteId(p.id);dialog.current?.showModal();}}><Trash2 size={14}/>删除</button></div></article>)}</div>}
    <dialog ref={dialog} className="workspace-dialog compact-dialog" aria-labelledby="delete-project-title"><h2 id="delete-project-title">删除项目？</h2><p>「{projects.find(p=>p.id===deleteId)?.input.name}」及其创意、版本和本地化将被移除。可先下载备份。</p><div className="dialog-actions"><button autoFocus className="button secondary" onClick={close}>保留项目</button><button className="button danger" onClick={()=>action(()=>{if(deleteId)remove(deleteId);close();setMessage('项目已删除。');})}>确认删除</button></div></dialog>
  </div>;
}
