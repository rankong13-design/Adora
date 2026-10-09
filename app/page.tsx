'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { ArrowRight, ArrowUpRight, FileText, Lightbulb, Layers3, Sparkles, Globe2 } from 'lucide-react';
import { useProjects } from '@/components/project-provider';
import { ProjectCard, LoadingState } from '@/components/ui';
import { usefulCounts } from '@/lib/signals';
import { countries } from '@/lib/types';


export default function Home() {
  const {projects,ready,error,openFeatured} = useProjects();
  const router = useRouter();
  const [message,setMessage] = useState('');
  const recent = [...projects].sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt)).slice(0,3);
  const creatives=projects.flatMap(p=>p.creatives.map(c=>({p,c}))).sort((a,b)=>b.p.updatedAt.localeCompare(a.p.updatedAt));
  const counts=usefulCounts(projects);
  function demo() { try { const p = openFeatured(); router.push(`/projects/${p.id}`); } catch(e) { setMessage((e as Error).message); } }
  return <div className="page studio-home">
    <section className="studio-hero" aria-labelledby="home-title"><div className="studio-hero-copy">
      <p className="studio-kicker"><span/> YOUR CREATIVE WORKSPACE</p>
      <h1 id="home-title">让好商品，<br/>拥有<span className="studio-word">好表达<svg viewBox="0 0 220 14" aria-hidden="true"><path d="M4 9Q105 -2 216 7"/></svg></span>。</h1>
      <p className="studio-hero-description">从商品信息到海外广告创意。找方向、写脚本、比较版本，再为下一个市场调整表达。</p>
      <div className="studio-hero-actions"><Link href="/projects/new" className="button primary">开始一份新创意 <ArrowUpRight size={17}/></Link><button className="button secondary" disabled={!ready||!!error} onClick={demo}>探索精选案例 <ArrowRight size={16}/></button></div>
      <p className="studio-hero-footnote"><Globe2 size={14}/> 5 个目标市场 · 3 种输出语言 · 你的判断始终在场</p>
    </div><div className="studio-art" aria-hidden="true"><div className="studio-art-top"><span>IDEAS WITHOUT BORDERS</span><Sparkles size={18}/></div>
      <svg className="studio-orbit" viewBox="0 0 340 240" fill="none"><circle cx="170" cy="120" r="88" stroke="currentColor" strokeWidth="1.3"/><ellipse cx="170" cy="120" rx="45" ry="88" stroke="currentColor" strokeWidth="1.3"/><ellipse cx="170" cy="120" rx="88" ry="35" stroke="currentColor" strokeWidth="1.3"/><path d="M82 120H258M170 32V208" stroke="currentColor" strokeWidth="1.3"/><path d="m265 38 7 23 23 7-23 7-7 23-7-23-23-7 23-7z" fill="currentColor"/><circle cx="86" cy="170" r="13" fill="#f6ac79" stroke="currentColor" strokeWidth="1.3"/><path d="m33 83 8 8-8 8-8-8z" fill="currentColor"/></svg>
      <div className="studio-art-card"><span className="art-card-icon"><FileText size={15}/></span><div><small>IT STARTS WITH YOUR PRODUCT</small><strong>一个真实卖点，一个新角度。</strong></div></div><div className="studio-art-bottom"><span>Brief → Creative → New market</span><ArrowUpRight size={20}/></div>
    </div></section>
    {(error||message)&&<div role="alert" className="error-banner">{error||message}</div>}
    <section className="studio-entry-grid" aria-label="选择创作起点">{[
      {href:'/projects/new',Icon:FileText,number:'01',title:'从商品开始',text:'整理卖点、人群与目标，为创意建立清楚的起点。',tone:'lime'},
      {href:'/inspiration',Icon:Lightbulb,number:'02',title:'找一个新角度',text:'探索原创示例和创意结构，让表达更有方向。',tone:'peach'},
      {href:'/history',Icon:Layers3,number:'03',title:'继续打磨',text:'回看版本、比较表达，把下一轮修改接着做。',tone:'lavender'},
    ].map(({href,Icon,number,title,text,tone})=><Link className={`studio-entry ${tone}`} href={href} key={href}><span className="studio-entry-icon"><Icon size={20}/></span><div><span className="studio-entry-number">{number} / EXPLORE</span><h2>{title}</h2><p>{text}</p></div><ArrowUpRight size={18}/></Link>)}</section>
    <section className="studio-overview" aria-labelledby="overview-title"><div className="studio-section-heading"><h2 id="overview-title">工作台一览</h2><span>当前浏览器 · 实际使用记录</span></div>{ready?<div className="studio-metrics">{[[counts.useful,'有用输出','Useful Outputs'],[counts.save,'已保存','Saved'],[counts.copy,'已复制','Copied'],[counts.export,'已导出','Exported'],[counts.iterate,'已迭代','Iterated'],[counts.localize,'已本地化','Localized']].map(([value,label,english])=><div key={label} className="studio-metric"><span>{label}</span><strong>{value}</strong><small>{english}</small></div>)}</div>:<LoadingState/>}<p className="assessment-note">按实际操作去重统计版本。导出记录表示发起下载，文件保存由浏览器完成。</p></section>
    <section className="studio-projects"><div className="studio-section-heading"><div><p className="studio-kicker">PICK UP WHERE YOU LEFT OFF</p><h2>最近的项目</h2></div><Link href="/projects">全部项目 <ArrowRight size={15}/></Link></div>{!ready?<LoadingState/>:recent.length?<div className="studio-project-grid">{recent.map(p=><ProjectCard key={p.id} project={p}/>)}</div>:<div className="studio-empty"><Layers3 size={28}/><div><h3>这里会留下你的下一次灵感。</h3><p>创建一份商品 Brief，开始第一个广告项目。</p></div><Link className="button secondary" href="/projects/new">创建项目 <ArrowRight size={15}/></Link></div>}</section>
    {ready&&creatives.length>0&&<section className="studio-recent-creatives"><div className="studio-section-heading"><h2>最近的创意表达</h2><Link href="/history">查看创意历史 <ArrowRight size={15}/></Link></div><div className="creative-library-grid">{creatives.slice(0,2).map(({p,c})=><Link className="studio-creative-card" key={`${p.id}/${c.id}`} href={`/projects/${p.id}?creative=${c.id}#creative-workbench`}><div className="studio-creative-meta"><span>{countries[p.input.country].name} / {p.input.platform}</span><ArrowUpRight size={18}/></div><h3>{c.hook}</h3><p>{p.input.name} · {c.direction}</p></Link>)}</div></section>}
  </div>;
}
