import type { ProductInput } from './types.ts';
import { emptyInput, validateInput } from './mock.ts';

export const draftKey = (source: string) => `adora-draft-v1:${source || 'new'}`;
export const readDraft = (source: string) => parseDraft(localStorage.getItem(draftKey(source)));
export const writeDraft = (source: string,input: ProductInput) => localStorage.setItem(draftKey(source),JSON.stringify(input));
export const removeDraft = (source: string) => localStorage.removeItem(draftKey(source));

// Incomplete text fields are valid drafts; choices and length limits still apply.
export function parseDraft(raw: string | null): ProductInput | null {
  if (raw === null) return null;
  const value: unknown = JSON.parse(raw);
  if (!value || typeof value !== 'object') throw new Error('草稿格式不正确');
  const record = value as Record<string, unknown>;
  const input = Object.fromEntries(Object.keys(emptyInput).map(key => [key, record[key]])) as ProductInput;
  for (const key of ['usageContext','purchaseConcern','evidenceSources','description','price','productUrl','language','objective','tone','offer','desiredCta','painPoints','patternId'] as const) {
    if (record[key] !== undefined) {
      if (typeof record[key] !== 'string') throw new Error('草稿补充信息格式不正确');
      Object.assign(input,{[key]:record[key]});
    }
  }
  if (Object.values(input).some(value => typeof value !== 'string') ||
      validateInput({...input, name: input.name.trim() || '草稿', benefits: input.benefits.trim() || '草稿', audience: input.audience.trim() || '草稿'}) ||
      input.name.length > 80 || input.benefits.length > 800 || input.audience.length > 160) {
    throw new Error('草稿内容无法读取');
  }
  return input;
}
