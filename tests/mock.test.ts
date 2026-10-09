import { test } from 'node:test';
import assert from 'node:assert/strict';
import { exampleInput, generateCreatives, validateInput, creativeText } from '../lib/mock.ts';
import { draftKey, parseDraft } from '../lib/draft.ts';
import { featuredCreatives, featuredInput } from '../lib/featured-case.ts';
import { scriptText } from '../lib/mock.ts';
import { autoChecks, rubric, verdict, isQualityReview, type QualityReview } from '../lib/quality.ts';
import { aiConfig, GenerationError, generationMessages, parseProductInput, parseGeneratedContent, requestCreatives, sameOriginRequest } from '../lib/generation.ts';
import { readGenerationResponse,readProviderCompletion,type GenerationProgress } from '../lib/generation-stream.ts';

function chunkedResponse(text:string,contentType:string) {
  const bytes=new TextEncoder().encode(text);
  return new Response(new ReadableStream<Uint8Array>({start(controller){for(let i=0;i<bytes.length;i+=7)controller.enqueue(bytes.slice(i,i+7));controller.close();}}),{headers:{'Content-Type':contentType}});
}

test('流式状态跨网络分块正确读取，断流不当成功，取消结束读取',async()=>{
  const progress:GenerationProgress={phase:'receiving',attempt:1,receivedCharacters:320};
  const result={creatives:['中文结果'],generation:{mode:'ai'}};
  const lines=[{type:'progress',progress},{type:'result',data:result}].map(x=>JSON.stringify(x)).join('\n')+'\n';
  const seen:GenerationProgress[]=[];
  assert.deepEqual(await readGenerationResponse(chunkedResponse(lines,'application/x-ndjson'),p=>seen.push(p)),result);
  assert.deepEqual(seen,[progress]);
  await assert.rejects(()=>readGenerationResponse(chunkedResponse(JSON.stringify({type:'progress',progress})+'\n','application/x-ndjson'),()=>{}),/未收到完整结果/);
  await assert.rejects(()=>readGenerationResponse(chunkedResponse(JSON.stringify({type:'error',message:'额度不足'})+'\n','application/x-ndjson'),()=>{}),/额度不足/);
  const abort=new AbortController();let cancelled=false;
  const pending=new Response(new ReadableStream<Uint8Array>({cancel(){cancelled=true;}}),{headers:{'Content-Type':'application/x-ndjson'}});
  const reading=readGenerationResponse(pending,()=>{},abort.signal);
  abort.abort();await assert.rejects(()=>reading,error=>error instanceof Error&&error.name==='AbortError');
  assert.equal(cancelled,true);
});

test('小米逐段内容拼接后校验，接收进度来自实际文字，提前断流或服务错误被拒绝',async()=>{
  const content=JSON.stringify({creatives:featuredCreatives()});
  const parts=[content.slice(0,230),content.slice(230)];
  const events=parts.map(text=>'data: '+JSON.stringify({choices:[{delta:{content:text},finish_reason:null}]})+'\r\n\r\n').join('');
  const finish='data: '+JSON.stringify({choices:[{delta:{},finish_reason:'stop'}]})+'\n\ndata: [DONE]\n\n';
  const seen:number[]=[];
  const response=await readProviderCompletion(chunkedResponse(events+finish,'text/event-stream'),new AbortController().signal,n=>seen.push(n));
  assert.equal(response.choices[0].message.content,content);
  assert.equal(seen.at(-1),content.length);
  assert.ok(seen[0]>0&&seen[0]<content.length);
  await assert.rejects(()=>readProviderCompletion(chunkedResponse(events,'text/event-stream'),new AbortController().signal,()=>{}),/未收到完整结果/);
  await assert.rejects(()=>readProviderCompletion(chunkedResponse('data: {"error":{"message":"private provider details"}}\n\n','text/event-stream'),new AbortController().signal,()=>{}),error=>error instanceof Error&&error.message==='AI 流式响应异常。');
});

test('接受Next内部地址转换后的同源请求，拒绝外部或无来源请求',()=>{
  assert.equal(sameOriginRequest(new Request('http://localhost:3000/api/generate',{headers:{host:'127.0.0.1:3000',origin:'http://127.0.0.1:3000'}})),true);
  assert.equal(sameOriginRequest(new Request('http://localhost:3000/api/generate',{headers:{host:'127.0.0.1:3000',origin:'https://example.com'}})),false);
  assert.equal(sameOriginRequest(new Request('http://localhost:3000/api/generate')),false);
});

test('补充线索保留在草稿和生成提示中，旧输入依然有效',()=>{
  const input={...exampleInput,usageContext:'离开图书馆时手机快没电',purchaseConcern:'忘记连接线',evidenceSources:'规格来自商品页，尚未核对'};
  assert.deepEqual(parseDraft(JSON.stringify(input)),input);
  assert.equal(validateInput(exampleInput),null);
  assert.deepEqual(parseProductInput({...input,extra:'ignore'}),input);
  assert.match(generationMessages(input,0)[1].content,/忘记连接线/);
  assert.throws(()=>parseProductInput({...input,evidenceSources:123}));
  assert.throws(()=>parseProductInput({...input,usageContext:'a'.repeat(501)}));
  assert.ok(validateInput({...input,benefits:'；；'}));
});

test('AI 输出拒绝缺字段、重叠分镜、重复开场和缺失字幕，不把JSON解析当质量通过',()=>{
  const result=featuredCreatives();
  assert.equal(parseGeneratedContent(JSON.stringify({creatives:result}),2).length,3);
  for(const mutate of [
    (items:typeof result)=>{delete items[0].buyingReason;},
    (items:typeof result)=>{items[0].script[1].time='1–5s';},
    (items:typeof result)=>{items[1].hook=items[0].hook;},
    (items:typeof result)=>{items[0].script[0].subtitle='';items[0].script[0].voiceover='';},
  ]){
    const items=featuredCreatives();mutate(items);
    assert.throws(()=>parseGeneratedContent(JSON.stringify({creatives:items}),0));
  }
  assert.throws(()=>parseGeneratedContent('not json',0));
  assert.throws(()=>parseGeneratedContent(JSON.stringify({creatives:result.slice(0,2)}),0));
  assert.equal(verdict(result[0]),'pending');
});

test('兼容同义秒数格式但不掩盖重叠、空档或缺失的分镜文字',()=>{
  for(const format of [(a:string,b:string)=>`${a}–${b}s`,(a:string,b:string)=>` ${a}s – ${b}s `,(a:string,b:string)=>`${a}—${b}秒`,(a:string,b:string)=>`${a} 至 ${b} seconds`]){
    const items=featuredCreatives();
    for(const c of items)for(const s of c.script){const [a,b]=s.time.slice(0,-1).split('–');s.time=format(a,b);}
    const parsed=parseGeneratedContent(JSON.stringify({creatives:items}),0);
    assert.deepEqual(parsed[0].script.map(s=>s.time),featuredCreatives()[0].script.map(s=>s.time));
    assert.ok(autoChecks(items[0]).every(x=>x.pass));
  }
  for(const value of ['1–3s','0–1s','0–4s','0.0–3.0s','around three seconds']){
    const items=featuredCreatives();items[0].script[0].time=value;
    assert.throws(()=>parseGeneratedContent(JSON.stringify({creatives:items}),0),/第 1 套创意/);
  }
  const empty=featuredCreatives();empty[1].script[2].subtitle='';empty[1].script[2].voiceover='';
  assert.throws(()=>parseGeneratedContent(JSON.stringify({creatives:empty}),0),/第 2 套创意的第 3 镜缺少字幕和旁白/);
});

test('未配置或不安全的服务地址不启用AI',()=>{
  assert.equal(aiConfig({}),null);
  assert.equal(aiConfig({ADORA_AI_API_KEY:'test',ADORA_AI_MODEL:'test',ADORA_AI_BASE_URL:'http://example.com'}),null);
  assert.equal(aiConfig({ADORA_AI_API_KEY:'test',ADORA_AI_MODEL:'test',ADORA_AI_BASE_URL:'https://example.com/?key=secret'}),null);
  assert.equal(aiConfig({ADORA_AI_API_KEY:'test',ADORA_AI_MODEL:'test',ADORA_AI_BASE_URL:'https://example.com/v1/'} )?.baseUrl,'https://example.com/v1');
});

test('AI适配器正确提交资料，拒绝限流、认证失败、空内容和截断；测试不访问网络',async()=>{
  const config={baseUrl:'https://example.com/v1',key:'test-only',model:'test-model',provider:'test'};
  const signal=new AbortController().signal;
  const fake:typeof fetch=async(url,options)=>{
    assert.equal(url,'https://example.com/v1/chat/completions');
    const body=JSON.parse(String(options?.body));
    assert.equal(body.model,'test-model');
    assert.equal(body.response_format.type,'json_object');
    return Response.json({choices:[{finish_reason:'stop',message:{content:JSON.stringify({creatives:featuredCreatives()})}}]});
  };
  const result=await requestCreatives(config,exampleInput,0,signal,fake);
  assert.equal(result.length,3);
  for(const response of [new Response('',{status:401}),new Response('',{status:429}),Response.json({choices:[]}),Response.json({choices:[{finish_reason:'length'}]})]){
    await assert.rejects(()=>requestCreatives(config,exampleInput,0,signal,async()=>response));
  }
});

test('小米官方接口使用api-key认证和受限的非思考输出，其他地址保持通用协议',async()=>{
  for(const baseUrl of ['https://api.xiaomimimo.com/v1','https://example.com/v1']){
    await requestCreatives({baseUrl,key:'test-only',model:'test-model',provider:'MiMo'},exampleInput,0,new AbortController().signal,async(url,options)=>{
      assert.equal(url,`${baseUrl}/chat/completions`);
      const headers=new Headers(options?.headers);
      const body=JSON.parse(String(options?.body));
      if(baseUrl.includes('xiaomimimo')){
        assert.equal(headers.get('api-key'),'test-only');
        assert.equal(headers.has('authorization'),false);
        assert.equal(body.max_completion_tokens,6500);
        assert.equal(body.max_tokens,undefined);
        assert.deepEqual(body.thinking,{type:'disabled'});
        assert.equal(body.temperature,0.4);
        assert.equal(body.stream,true);
      }else{
        assert.equal(headers.get('authorization'),'Bearer test-only');
        assert.equal(headers.has('api-key'),false);
        assert.equal(body.max_tokens,6500);
        assert.equal(body.thinking,undefined);
      }
      assert.equal(options?.redirect,'error');
      return Response.json({choices:[{finish_reason:'stop',message:{content:JSON.stringify({creatives:featuredCreatives()})}}]});
    });
  }
});

test('分镜缺失反馈给模型修正一次，修正也计额度；仍不合格或额度不足不继续请求',async()=>{
  const config={baseUrl:'https://example.com/v1',key:'test-only',model:'test-model',provider:'test'};
  const broken=featuredCreatives();broken[0].script[3].subtitle='';broken[0].script[3].voiceover='';
  const invalid=JSON.stringify({creatives:broken});
  const valid=JSON.stringify({creatives:featuredCreatives()});
  let calls=0,charged=0;
  const result=await requestCreatives(config,exampleInput,0,new AbortController().signal,async(url,options)=>{
    calls++;
    const messages=JSON.parse(String(options?.body)).messages;
    if(calls===2){
      assert.equal(messages.at(-2).role,'assistant');
      assert.equal(messages.at(-2).content,invalid);
      assert.match(messages.at(-1).content,/第 1 套创意的第 4 镜缺少字幕和旁白/);
      assert.match(messages.at(-1).content,/不添加无依据/);
    }
    return Response.json({choices:[{finish_reason:'stop',message:{content:calls===1?invalid:valid}}]});
  },()=>{charged++;});
  assert.equal(result.length,3);assert.equal(calls,2);assert.equal(charged,2);
  calls=0;
  await assert.rejects(()=>requestCreatives(config,exampleInput,0,new AbortController().signal,async()=>{
    calls++;return Response.json({choices:[{finish_reason:'stop',message:{content:invalid}}]});
  }),/已自动修正一次/);
  assert.equal(calls,2);
  calls=0;charged=0;
  await assert.rejects(()=>requestCreatives(config,exampleInput,0,new AbortController().signal,async()=>{
    calls++;return Response.json({choices:[{finish_reason:'stop',message:{content:invalid}}]});
  },()=>{if(++charged===2)throw new GenerationError('额度不足',429);}),error=>error instanceof GenerationError&&error.status===429);
  assert.equal(calls,1);
  calls=0;
  await assert.rejects(()=>requestCreatives(config,exampleInput,0,new AbortController().signal,async()=>{
    calls++;return new Response('',{status:401});
  }),/认证失败/);
  assert.equal(calls,1);
});

test('质量评审未完成不算通过，事实错误不能被高分抵消，变更后失效',()=>{
  const c=featuredCreatives()[0];
  const review:QualityReview={version:1,snapshot:JSON.stringify(c),scores:Object.fromEntries(rubric.map(r=>[r.key,2])),facts:'verified',notes:'官方资料核对',savedAt:new Date().toISOString()};
  assert.ok(autoChecks(c).every(x=>x.pass));
  assert.equal(verdict(c), 'pending');
  assert.equal(verdict(c,review),'pass');
  assert.equal(verdict(c,{...review,facts:'unsupported'}),'fail');
  assert.equal(verdict(c,{...review,facts:'pending'}),'pending');
  assert.equal(verdict(c,{...review,scores:{}}),'pending');
  assert.equal(verdict(c,{...review,scores:{...review.scores,hook:1}}),'fail');
  assert.equal(verdict({...c,hook:'changed'},review),'pending');
  const broken={...c,script:c.script.map((s,i)=>i===1?{...s,time:'1–5s'}:s)};
  assert.equal(verdict(broken,{...review,snapshot:JSON.stringify(broken)}),'fail');
  assert.equal(isQualityReview({...review,scores:{hook:5}}),false);
});

test('精选案例分镜覆盖15秒，复制包含字幕、声音和拍摄限制',()=>{
  assert.equal(validateInput(featuredInput),null);
  const items=featuredCreatives();
  assert.equal(items.length,3);
  for(const c of items){
    assert.ok(c.concept&&c.buyingReason&&c.firstFrame&&c.props&&c.evidence);
    let end=0;
    for(const s of c.script){
      const times=s.time.replace('s','').split('–').map(Number);
      assert.equal(times[0],end); assert.ok(times[1]>times[0]); end=times[1];
      assert.ok(s.title&&s.subtitle&&s.sound&&s.visual);
      assert.ok(scriptText(c).includes(s.subtitle));
    }
    assert.equal(end,15);
    assert.ok(creativeText(c).includes(c.firstFrame));
    assert.ok(scriptText(c).includes(c.evidence));
  }
  items[0].script[0].visual='changed';
  assert.notEqual(featuredCreatives()[0].script[0].visual,'changed');
});

test('草稿支持未填完的内容，并拒绝损坏或不受支持的数据',()=>{
  const draft={...exampleInput,name:'',benefits:'',audience:''};
  assert.deepEqual(parseDraft(JSON.stringify(draft)),draft);
  assert.equal(parseDraft(null),null);
  for(const value of ['{','null','{}',JSON.stringify({...draft,country:'XX'}),JSON.stringify({...draft,name:' '.repeat(81)})]) assert.throws(()=>parseDraft(value));
  assert.notEqual(draftKey(''),draftKey('project-1'));
});

test('三套方向在正文、CTA和关键分镜上有区别，不补充保温时长或绝对防漏承诺',()=>{
  for(const country of ['US','GB','JP'] as const){
    const items=generateCreatives({...exampleInput,country});
    assert.deepEqual(items.map(c=>c.direction),['痛点解决','生活场景','产品细节']);
    assert.equal(new Set(items.map(c=>c.body)).size,3);
    assert.equal(new Set(items.map(c=>c.cta)).size,3);
    assert.equal(new Set(items.map(c=>c.script[1].visual)).size,3);
    for(const c of items) assert.doesNotMatch([c.hook,c.body,...c.script.map(s=>s.voiceover)].join(' '),/24|100%|leak.proof|guaranteed/i);
  }
});
test('每个支持市场都生成三套完整的十五秒创意',()=>{for(const country of ['US','GB','JP'] as const){const items=generateCreatives({...exampleInput,country});assert.equal(items.length,3);for(const c of items){assert.ok(c.coreBenefit&&c.hook&&c.body&&c.cta&&c.rationale);assert.deepEqual(c.script.map(s=>s.time),['0–3s','3–8s','8–12s','12–15s']);assert.ok(c.script.every(s=>s.visual&&s.voiceover));assert.ok(creativeText(c).includes(c.hook));}}});
test('市场、风格、重新生成分别改变文案',()=>{assert.notEqual(generateCreatives(exampleInput)[0].hook,generateCreatives({...exampleInput,country:'GB'})[0].hook);assert.match(generateCreatives({...exampleInput,country:'JP'})[0].body,/[\u3040-\u30ff]/);assert.notEqual(generateCreatives(exampleInput)[0].hook,generateCreatives({...exampleInput,style:'简洁高级'})[0].hook);assert.notEqual(generateCreatives(exampleInput)[0].hook,generateCreatives(exampleInput,1)[0].hook);});
test('未知商品不继承保温杯材质或功效',()=>{const result=generateCreatives({...exampleInput,name:'运动帽',category:'服饰配件',benefits:'可调节帽围',audience:'户外运动爱好者',platform:'Instagram'});for(const c of result){assert.doesNotMatch(c.body,/tumbler|stainless|500|leak/);assert.match(c.rationale,/通用表达/);assert.match(c.script[0].visual,/户外运动爱好者/);assert.equal(c.coreBenefit,'可调节帽围');assert.ok(c.cta);}});
test('阻止空白及无效字段，不接受未知市场',()=>{assert.ok(validateInput({...exampleInput,name:'  '}));assert.ok(validateInput({...exampleInput,benefits:' '}));assert.ok(validateInput({...exampleInput,audience:''}));assert.ok(validateInput({...exampleInput,name:'a'.repeat(81)}));assert.ok(validateInput({...exampleInput,country:'XX' as 'US'}));assert.throws(()=>generateCreatives({...exampleInput,name:''}));assert.equal(validateInput(exampleInput),null);});
