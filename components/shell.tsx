'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ArrowUpRight, Home, Compass, Layers3, History, Lightbulb, Plus, Laptop, ShieldCheck } from 'lucide-react';
import { ProjectProvider } from './project-provider';

export function Brand() {
  return <span className="adora-brand"><span className="adora-brand-mark" aria-hidden="true"><svg viewBox="0 0 36 36" width="36" height="36" fill="none"><path d="M7 27 16 7h6l-9 20H7Z" fill="currentColor"/><path d="m20 18 9 9H17l3-9Z" fill="currentColor"/><circle cx="28" cy="8" r="3" fill="#d1e47b"/></svg></span><span className="adora-brand-wordmark">Adora<span className="adora-brand-dot">.</span></span></span>;
}

const navigation = [
  { href: '/', label: '概览', Icon: Home },
  { href: '/projects/new', label: '开始创作', Icon: Compass },
  { href: '/projects', label: '项目空间', Icon: Layers3 },
  { href: '/history', label: '创意历史', Icon: History },
  { href: '/inspiration', label: '灵感库', Icon: Lightbulb },
];
const mobileLabels = ['首页', '创作', '项目', '历史', '灵感'];

export function Shell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const active = (href: string) => {
    if (href === '/') return path === '/';
    if (href === '/projects') return path === href || (path.startsWith('/projects/') && path !== '/projects/new' && !path.startsWith('/projects/new/'));
    return path === href || path.startsWith(`${href}/`);
  };
  const title = active('/projects/new') ? '开始一个新项目' : path.startsWith('/projects/') ? '广告创意工作台' : navigation.find(item => active(item.href))?.label ?? '工作空间';
  const navLink = ({ href, label, Icon }: typeof navigation[number]) => <Link key={href} href={href} className={`adora-sidebar-link ${active(href) ? 'is-active' : ''}`} aria-current={active(href) ? 'page' : undefined}><Icon size={18} strokeWidth={1.65} aria-hidden="true"/><span>{label}</span>{active(href) && <span className="adora-nav-indicator" aria-hidden="true"/>}</Link>;

  return <ProjectProvider><div className="app-shell adora-shell">
    <aside className="adora-sidebar" aria-label="Adora 工作空间">
      <Link href="/" className="adora-sidebar-brand" aria-label="Adora 首页"><Brand/><span className="adora-brand-caption">让好产品，被世界看见。</span></Link>
      <div className="adora-workspace-label"><span className="adora-workspace-symbol" aria-hidden="true">a</span><div><strong>我的创意工作空间</strong><span>Creative workspace</span></div></div>
      <nav className="adora-sidebar-nav" aria-label="主导航"><p className="adora-nav-group-label">工作空间</p>{navigation.slice(0,3).map(navLink)}<p className="adora-nav-group-label adora-nav-group-secondary">资源与记录</p>{navigation.slice(3).map(navLink)}</nav>
      <div className="adora-sidebar-bottom"><div className="adora-local-space"><Laptop size={16} strokeWidth={1.6} aria-hidden="true"/><div><strong>本地工作空间</strong><span>项目保存于当前浏览器</span></div><span className="adora-local-dot" aria-hidden="true"/></div><p>从一个想法，到一套可测试的广告。</p></div>
    </aside>
    <div className="main-shell adora-main-shell">
      <header className="adora-topbar">
        <Link href="/" className="adora-mobile-brand" aria-label="Adora 首页"><Brand/></Link>
        <div className="adora-topbar-location"><span>工作空间</span><span className="adora-topbar-divider" aria-hidden="true">/</span><strong>{title}</strong></div>
        <div className="adora-topbar-actions"><span className="adora-topbar-local"><ShieldCheck size={14} aria-hidden="true"/>仅本地保存</span><Link href="/projects/new" className="adora-new-project"><Plus size={16} aria-hidden="true"/><span>新建项目</span><ArrowUpRight size={14} className="adora-new-project-arrow" aria-hidden="true"/></Link></div>
      </header>
      <main>{children}</main>
      <footer className="adora-footer"><span>Adora · Creative ideas, across borders.</span><span>本地保存 · 创意需人工审核</span></footer>
    </div>
    <nav className="mobile-nav adora-mobile-nav" aria-label="手机导航">{navigation.map(({ href, Icon }, index) => <Link href={href} key={href} className={active(href) ? 'active' : ''} aria-current={active(href) ? 'page' : undefined}><Icon size={20} strokeWidth={active(href) ? 2 : 1.6} aria-hidden="true"/><span>{mobileLabels[index]}</span></Link>)}</nav>
  </div></ProjectProvider>;
}
