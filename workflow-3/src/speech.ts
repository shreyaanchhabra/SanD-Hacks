import type { SpeechAdapter } from './contracts.js';
export function elevenLabsSpeech(apiKey: string, voiceId: string, request: typeof fetch = fetch): SpeechAdapter {
 return {
  mode: 'elevenlabs-live',
  async speak(_stepId, text) {
   try {
    const response = await request(`https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}?output_format=mp3_44100_128`, {
     method: 'POST', headers: { 'xi-api-key': apiKey, 'Content-Type': 'application/json', Accept: 'audio/mpeg' },
     body: JSON.stringify({ text: text.slice(0,2000), model_id: 'eleven_multilingual_v2' }), signal: AbortSignal.timeout(20000),
    });
    if (!response.ok) throw new Error();
    const bytes = Buffer.from(await response.arrayBuffer());
    if (!bytes.length || bytes.length > 5000000) throw new Error();
    return { status: 'ready', audioBase64: bytes.toString('base64'), contentType: 'audio/mpeg' };
   } catch { throw new Error('Speech temporarily unavailable'); }
  },
 };
}
