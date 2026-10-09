'use client';
export default function ErrorPage({reset}:{reset:()=>void}){return <div className="empty-state"><h1>页面暂时遇到了问题</h1><p>你的已保存项目仍保留在当前浏览器中。</p><button className="button primary" onClick={reset}>重新尝试</button></div>;}
