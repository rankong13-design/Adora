import Link from 'next/link';
export default function NotFound(){return <div className="empty-state"><h1>这个页面不存在</h1><p>返回工作台，开始新的创意。</p><Link href="/" className="button primary">返回首页</Link></div>;}
