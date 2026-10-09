import { GenerationError } from '../../lib/generation.ts';

const state=globalThis as typeof globalThis & { adoraAllowance?: {start:number;count:number} };
// One process-wide budget, shared by generation, improvement, localization and repairs.
export function consumeAIRequest(now=Date.now()) {
  const previous=state.adoraAllowance;
  const allowance=previous&&now-previous.start<3600000?previous:{start:now,count:0};
  if(allowance.count>=6)throw new GenerationError('本地演示每小时最多 6 次模型请求（含改进、本地化与修正）。原有内容保留，请稍后重试。',429);
  allowance.count++;state.adoraAllowance=allowance;
}
