import { aiConfig, GenerationError, sameOriginRequest } from '@/lib/generation';
import { parseCreativeTask, requestCreativeTask } from '@/services/ai/tasks';
import { consumeAIRequest } from '@/services/ai/allowance';

export const runtime='nodejs';
export const dynamic='force-dynamic';
const headers={'Cache-Control':'no-store'};
export async function POST(request: Request) {
  if(!sameOriginRequest(request))return Response.json({error:'请从 Adora 页面发起操作'},{status:403,headers});
  const config=aiConfig(process.env);
  if(!config)return Response.json({error:'AI 未配置，可使用本地演示'},{status:503,headers});
  try {
    const text=await request.text();if(text.length>40000)throw new GenerationError('创意请求过长',413);
    let raw:unknown;try{raw=JSON.parse(text);}catch{throw new GenerationError('请求不是有效 JSON',400);}
    const task=parseCreativeTask(raw);
    const result=await requestCreativeTask(config,task,AbortSignal.any([request.signal,AbortSignal.timeout(65000)]),consumeAIRequest);
    return Response.json({...result,mode:'ai',model:config.model,provider:config.provider},{headers});
  }catch(e){
    if(e instanceof GenerationError)return Response.json({error:e.message},{status:e.status,headers});
    return Response.json({error:e instanceof Error&&['TimeoutError','AbortError'].includes(e.name)?'操作超时或取消，原有内容保留':'无法连接 AI 服务，原有内容保留'},{status:502,headers});
  }
}
