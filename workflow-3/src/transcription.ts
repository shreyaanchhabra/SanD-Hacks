import {z} from 'zod';
export const transcriptionSchema=z.object({consent:z.literal(true),mimeType:z.literal('audio/webm'),data:z.string().min(8).max(1333336).regex(/^[A-Za-z0-9+/]+={0,2}$/)}).strict().refine(value=>{
 const bytes=Buffer.from(value.data,'base64');return bytes.length<=1_000_000&&bytes.subarray(0,4).equals(Buffer.from([0x1a,0x45,0xdf,0xa3]))&&bytes.toString('base64')===value.data;
},{message:'Invalid recording'});
export type Recording=z.infer<typeof transcriptionSchema>;
export type Transcribe=(input:Recording)=>Promise<{text:string}>;
export function elevenLabsTranscription(apiKey:string,request:typeof fetch=fetch):Transcribe{
 return async raw=>{
  const input=transcriptionSchema.parse(raw);
  try{
   const form=new FormData();form.set('model_id','scribe_v2');form.set('tag_audio_events','false');form.set('timestamps_granularity','none');form.set('file',new Blob([Buffer.from(input.data,'base64')],{type:input.mimeType}),'question.webm');
   const response=await request('https://api.elevenlabs.io/v1/speech-to-text',{method:'POST',headers:{'xi-api-key':apiKey},body:form,signal:AbortSignal.timeout(30000)});
   if(!response.ok)throw new Error();
   const result=await response.json() as {text?:unknown};
   if(typeof result.text!=='string'||!result.text.trim())throw new Error();
   return{text:result.text.trim().slice(0,2000)};
  }catch{throw new Error('Voice transcription unavailable. Try again or type your question.');}
 };
}
