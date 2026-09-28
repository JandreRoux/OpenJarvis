// Shared helpers for the Vercel-hosted Groq backend.
//
// The web UI normally talks to a local `jarvis serve`. On Vercel there is no
// local server, so these functions stand in for the two endpoints chat needs
// (/v1/models and /v1/chat/completions) and forward them to Groq's
// OpenAI-compatible API. Files under api/_lib are not deployed as routes.

// The frontend package has no @types/node; this is all we need from it.
declare const process: { env: Record<string, string | undefined> };

export const GROQ_BASE = 'https://api.groq.com/openai/v1';
export const DEFAULT_MODEL = process.env.JARVIS_DEFAULT_MODEL || 'llama-3.3-70b-versatile';

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export function groqKey(): string | null {
  return process.env.GROQ_API_KEY || null;
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

// The UI sends Settings -> "API key" as `Authorization: Bearer <key>`.
// Returns an error Response when the caller is not allowed, else null.
export function checkPassword(req: Request): Response | null {
  const expected = process.env.JARVIS_PASSWORD;
  if (!expected) {
    return json({ error: { message: 'Server not configured: set JARVIS_PASSWORD in Vercel.' } }, 500);
  }
  const header = req.headers.get('authorization') || '';
  const given = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!timingSafeEqual(given, expected)) {
    return json({ error: { message: 'Wrong or missing password. Enter it in Settings -> API key.' } }, 401);
  }
  return null;
}

// Groq lists speech, guard and TTS models too; only chat models belong in the picker.
export function isChatModel(id: string): boolean {
  return !/whisper|guard|tts|playai|orpheus|distil/i.test(id);
}
