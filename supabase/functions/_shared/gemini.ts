const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';
const DEFAULT_MODEL = 'gemini-flash-latest';
const DEFAULT_VISION_MODEL = 'gemini-flash-latest';

export type GeminiMessage = { role: 'system' | 'user' | 'assistant'; content: string };

export type GeminiVisionContent =
  | { type: 'text'; text: string }
  | { type: 'image_url'; image_url: { url: string } };

export type GeminiVisionMessage = { role: 'system' | 'user' | 'assistant'; content: string | GeminiVisionContent[] };

async function imageUrlToInlineData(url: string): Promise<{ mime_type: string; data: string }> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch image for Gemini: ${res.status}`);
  const mime_type = res.headers.get('content-type') || 'image/jpeg';
  const buffer = new Uint8Array(await res.arrayBuffer());
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < buffer.length; i += chunkSize) {
    binary += String.fromCharCode(...buffer.subarray(i, i + chunkSize));
  }
  return { mime_type, data: btoa(binary) };
}

async function requestGeminiJSON<T>(model: string, messages: (GeminiMessage | GeminiVisionMessage)[]): Promise<T> {
  const apiKey = Deno.env.get('GEMINI_API_KEY');
  if (!apiKey) throw new Error('GEMINI_API_KEY is not configured');

  const systemParts: string[] = [];
  const contents: { role: string; parts: unknown[] }[] = [];

  for (const m of messages) {
    if (m.role === 'system') {
      if (typeof m.content === 'string') systemParts.push(m.content);
      continue;
    }
    const parts = typeof m.content === 'string'
      ? [{ text: m.content }]
      : await Promise.all(
          m.content.map(async (c) =>
            c.type === 'text' ? { text: c.text } : { inline_data: await imageUrlToInlineData(c.image_url.url) }
          )
        );
    contents.push({ role: m.role === 'assistant' ? 'model' : 'user', parts });
  }

  const body: Record<string, unknown> = {
    contents,
    generationConfig: { responseMimeType: 'application/json', temperature: 0.4 },
  };
  if (systemParts.length) {
    body.systemInstruction = { parts: [{ text: systemParts.join('\n\n') }] };
  }

  const res = await fetch(`${GEMINI_API_BASE}/${model}:generateContent`, {
    method: 'POST',
    headers: {
      'x-goog-api-key': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Gemini API error ${res.status}: ${text}`);
  }

  const data = await res.json();
  const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (typeof content !== 'string') throw new Error('Gemini response missing content');

  try {
    return JSON.parse(content) as T;
  } catch {
    throw new Error(`Gemini did not return valid JSON: ${content}`);
  }
}

/**
 * Calls Gemini's generateContent endpoint in strict JSON mode and returns the
 * parsed response body. GEMINI_API_KEY is a Supabase Edge Function secret —
 * never present in client code or EXPO_PUBLIC_* env vars.
 */
export async function callGeminiJSON<T>(messages: GeminiMessage[]): Promise<T> {
  const model = Deno.env.get('GEMINI_MODEL') || DEFAULT_MODEL;
  return requestGeminiJSON<T>(model, messages);
}

/**
 * Same as callGeminiJSON but for multimodal (image + text) prompts. Image
 * URLs are fetched and inlined as base64 since Gemini's REST API does not
 * fetch arbitrary HTTP(S) URLs itself. Configure GEMINI_VISION_MODEL to
 * override the model.
 */
export async function callGeminiVisionJSON<T>(messages: GeminiVisionMessage[]): Promise<T> {
  const model = Deno.env.get('GEMINI_VISION_MODEL') || DEFAULT_VISION_MODEL;
  return requestGeminiJSON<T>(model, messages);
}
