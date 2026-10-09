export type GenerationProgress={phase:'generating'|'receiving'|'repairing'|'validating';attempt:number;receivedCharacters:number};
export type GenerationEvent={type:'progress';progress:GenerationProgress}|{type:'result';data:unknown}|{type:'error';message:string};

// Read complete lines across arbitrary network chunks, including split UTF-8 characters.
export async function* responseLines(body:ReadableStream<Uint8Array>,signal?:AbortSignal) {
  const reader=body.getReader(),decoder=new TextDecoder();let pending='';
  const cancel=()=>{void reader.cancel().catch(()=>{});};
  signal?.addEventListener('abort',cancel,{once:true});
  try {
    while(true){
      signal?.throwIfAborted();
      const {done,value}=await reader.read();
      if(done){pending+=decoder.decode();break;}
      pending+=decoder.decode(value,{stream:true});
      if(pending.length>100000)throw new Error('服务返回的单条内容过长。');
      let at:number;
      while((at=pending.indexOf('\n'))>=0){const line=pending.slice(0,at).replace(/\r$/,'');pending=pending.slice(at+1);yield line;}
    }
    signal?.throwIfAborted();
    if(pending.trim())yield pending.replace(/\r$/,'');
  }finally{signal?.removeEventListener('abort',cancel);await reader.cancel().catch(()=>{});reader.releaseLock();}
}

export async function readGenerationResponse(response:Response,onProgress:(progress:GenerationProgress)=>void,signal?:AbortSignal):Promise<unknown> {
  if(!response.ok||!response.headers.get('content-type')?.includes('application/x-ndjson')){
    const data=await response.json();if(!response.ok)throw new Error(data.error||'生成失败，请稍后重试。');return data;
  }
  if(!response.body)throw new Error('生成连接没有返回内容。');
  for await(const line of responseLines(response.body,signal)){
    if(!line.trim())continue;
    const event=JSON.parse(line) as GenerationEvent;
    if(event.type==='error')throw new Error(event.message);
    if(event.type==='result')return event.data;
    if(event.type==='progress'){
      const p=event.progress;
      if(!p||!['generating','receiving','repairing','validating'].includes(p.phase)||![1,2].includes(p.attempt)||!Number.isInteger(p.receivedCharacters)||p.receivedCharacters<0)throw new Error('生成状态格式异常。');
      onProgress(p);
    }
  }
  throw new Error('生成连接已中断，未收到完整结果；已有创意保留。');
}

export async function readProviderCompletion(response:Response,signal:AbortSignal,onCharacters:(count:number)=>void) {
  if(!response.headers.get('content-type')?.includes('text/event-stream'))return response.json();
  if(!response.body)throw new Error('AI 返回空连接。');
  let content='',finishReason:string|undefined,terminated=false,lastReported=0;
  for await(const line of responseLines(response.body,signal)){
    if(!line.startsWith('data:'))continue;
    const value=line.slice(5).trim();if(!value)continue;
    if(value==='[DONE]'){terminated=true;break;}
    const data=JSON.parse(value) as {error?:unknown;choices?:{delta?:{content?:string};finish_reason?:string|null}[]};
    if(data.error)throw new Error('AI 流式响应异常。');
    const choice=data.choices?.[0];
    if(typeof choice?.delta?.content==='string')content+=choice.delta.content;
    if(content.length>80000)throw new Error('AI 生成内容过长。');
    if(choice?.finish_reason)finishReason=choice.finish_reason;
    if(content.length-lastReported>=160){lastReported=content.length;onCharacters(content.length);}
  }
  if(!terminated||!finishReason)throw new Error('AI 连接中断，未收到完整结果。');
  onCharacters(content.length);
  return {choices:[{finish_reason:finishReason,message:{content}}]};
}
