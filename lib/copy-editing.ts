import type { Language } from './types.ts';

// Native sentence boundaries preserve decimals, units, and URL punctuation.
export function copySentences(text:string,language:Language):string[] {
  return [...new Intl.Segmenter(language,{granularity:'sentence'}).segment(text)].map(s=>s.segment.trim()).filter(Boolean);
}
export function shorterCopy(text:string,language:Language):string {
  const sentences=copySentences(text,language);
  // Demo can remove generic trailing copy, but keeps sentences with numbers or
  // explicit qualifications. This is conservative editing, not fact verification.
  const qualified=/\p{N}|\b(?:not|never|no|only|unless|cannot|without|may|might|approximately|estimated|(?:don|can|won|doesn|isn|aren)[’']t|subject to|conditions apply|up to|unverified)\b|仅|未|不|限|除外|場合|のみ|ません|bukan|tidak|hanya|kecuali/iu;
  return sentences.filter((s,i)=>i<2||qualified.test(s)).join(' ');
}
