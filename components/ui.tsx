import { projectProgress } from '@/lib/signals';
import Link from 'next/link';
import { ArrowRight, ArrowUpRight, Globe2, Layers3 } from 'lucide-react';
import { countries, type Project } from '@/lib/types';
export function PageHeading({ eyebrow, title, description, action }: { eyebrow?: string; title: string; description: string; action?: React.ReactNode }) {
  return <div className="page-heading adora-page-heading"><div>{eyebrow && <p className="eyebrow">{eyebrow}</p>}<h1>{title}</h1><p className="page-description">{description}</p></div>{action && <div className="adora-page-heading-action">{action}</div>}</div>;
}
const progressLabels: Record<string, string> = { Brief: '需求', Directions: '策略', Generate: '生成', Evaluate: '评估', Improve: '迭代', Localize: '本地化' };
export function ProjectCard({project}: {project: Project}) {
  const progress = projectProgress(project);
  const completed = progress.filter(step => step.done).length;
  const next = progress.find(step => !step.done);
  return <Link href={`/projects/${project.id}`} className="project-card adora-project-card" data-market={project.input.country}>
    <div className="adora-project-card-top"><span className="adora-project-symbol" aria-hidden="true"><Layers3 size={21} strokeWidth={1.55}/></span><span className="adora-project-updated">更新于 {new Date(project.updatedAt).toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' })}</span></div>
    <div className="project-summary adora-project-summary"><h3>{project.input.name}</h3><p className="adora-project-meta"><span>{countries[project.input.country].flag} {countries[project.input.country].name}</span><span>{project.input.platform}</span></p></div>
    <div className="adora-project-progress" aria-label={`创作进度：${completed} 项已完成，共 ${progress.length} 项`}>{progress.map(step => <span key={step.label} className={step.done ? 'is-complete' : ''} title={`${progressLabels[step.label]}：${step.done ? '已完成' : '待完成'}`}><i aria-hidden="true"/>{progressLabels[step.label]}</span>)}</div>
    <div className="adora-project-card-bottom"><div className="adora-project-next"><span>{project.creatives.length ? `${project.creatives.length} 套创意` : '等待第一套创意'}</span><small>{next ? `下一步 · ${progressLabels[next.label]}` : '继续复核与导出'}</small></div><span className="adora-project-open" aria-hidden="true"><ArrowUpRight size={17}/></span></div>
  </Link>;
}
export function EmptyState({title='还没有创意项目',description='从一个商品开始，探索适合海外市场的表达。'}: {title?: string; description?: string}) { return <div className="empty-state adora-empty-state"><span className="adora-empty-icon" aria-hidden="true"><Globe2 size={29} strokeWidth={1.35}/></span><h3>{title}</h3><p>{description}</p><Link href="/projects/new" className="button primary">创建第一个项目 <ArrowRight size={16} aria-hidden="true"/></Link></div>; }
export function LoadingState({text='正在读取项目…'}: {text?: string}) { return <div className="loading-state adora-loading-state" role="status"><span className="spinner" aria-hidden="true"/>{text}</div>; }
