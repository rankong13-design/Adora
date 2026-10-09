import { isDirectionId } from '@/lib/directions';
import { aiConfig, GenerationError, parseProductInput, requestCreatives, sameOriginRequest } from '@/lib/generation';
import type { GenerationEvent } from '@/lib/generation-stream';
import { consumeAIRequest } from '@/services/ai/allowance';

export const runtime='nodejs';
export const dynamic='force-dynamic';
const headers={'Cache-Control':'no-store'};

export function GET() {
  const config=aiConfig(process.env);
  return Response.json({available:!!config,provider:config?.provider,model:config?.model},{headers});
}

export async function POST(request:Request) {
  // This route is for a local demo. Reject cross-origin calls before any paid request.
  if(!sameOriginRequest(request)) return Response.json({error:'请从 Adora 页面发起生成。'},{status:403,headers});
  const config=aiConfig(process.env);
  if(!config)return Response.json({error:'真实 AI 尚未配置。可先使用本地演示；密钥由服务端配置。'},{status:503,headers});
  try {
    const body=await request.text();
    if(body.length>24000)throw new GenerationError('商品资料过长。',413);
    let data:unknown;
    try{data=JSON.parse(body);}catch{throw new GenerationError('请求格式不正确。',400);}
    if(!data||typeof data!=='object')throw new GenerationError('请求格式不正确。',400);
    const {input:raw,revision,direction}=data as {input:unknown;revision:unknown;direction:unknown};
    const input=parseProductInput(raw);
    if(direction!==undefined&&!isDirectionId(direction))throw new GenerationError('创意方向不正确。',400);
    if(!Number.isInteger(revision)||Number(revision)<0||Number(revision)>10000)throw new GenerationError('生成版本不正确。',400);
    const beforeRequest=consumeAIRequest;
    const cancel=new AbortController();
    const signal=AbortSignal.any([request.signal,cancel.signal,AbortSignal.timeout(70000)]);
    const encoder=new TextEncoder();let closed=false;
    const stream=new ReadableStream<Uint8Array>({
      async start(controller){
        const send=(event:GenerationEvent)=>{if(!closed)controller.enqueue(encoder.encode(JSON.stringify(event)+'\n'));};
        try {
          const started=Date.now();
          const creatives=await requestCreatives(config,input,Number(revision),signal,fetch,beforeRequest,progress=>send({type:'progress',progress}),direction);
          send({type:'result',data:{creatives,generation:{mode:'ai',provider:config.provider,model:config.model,generatedAt:new Date().toISOString()},durationMs:Date.now()-started}});
        }catch(error){send({type:'error',message:generationErrorMessage(error)});}
        finally{if(!closed){closed=true;controller.close();}}
      },
      cancel(){closed=true;cancel.abort();},
    });
    return new Response(stream,{headers:{...headers,'Content-Type':'application/x-ndjson; charset=utf-8','X-Accel-Buffering':'no'}});
  }catch(error){
    if(error instanceof GenerationError)return Response.json({error:error.message},{status:error.status,headers});
    if(error instanceof Error && ['TimeoutError','AbortError'].includes(error.name))return Response.json({error:generationErrorMessage(error)},{status:504,headers});
    return Response.json({error:'无法连接 AI 服务或响应格式异常，请检查配置后重试。'},{status:502,headers});
  }
}

function generationErrorMessage(error:unknown) {
  if(error instanceof GenerationError)return error.message;
  if(error instanceof Error&&error.name==='TimeoutError')return 'AI 服务在 70 秒内未完成生成，已停止等待；原有创意保留，可稍后重试。';
  if(error instanceof Error&&error.name==='AbortError')return '生成已取消，原有创意保留。';
  return 'AI 连接中断或响应格式异常，未保存新结果；原有创意保留，请重试。';
}
