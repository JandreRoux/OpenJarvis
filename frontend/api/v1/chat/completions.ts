// Chat: forwards the UI's OpenAI-style request to Groq and streams the reply back.
import { GROQ_BASE, DEFAULT_MODEL, json, groqKey, checkPassword, firstAvailableModel } from '../../_lib/groq.js';

export const maxDuration = 60;

const SYSTEM_PROMPT =
  'You are Jarvis, a helpful, concise personal AI assistant. ' +
  'You are running in the cloud, so you cannot access the user\'s files, run code, or control their computer.';

// Fields Groq accepts; anything else the UI sends (agent/tool options meant for
// the local server) is dropped so Groq doesn't reject the request.
const ALLOWED = ['messages', 'stream', 'temperature', 'top_p', 'stop', 'max_tokens', 'seed'] as const;

export async function POST(req: Request): Promise<Response> {
  const denied = checkPassword(req);
  if (denied) return denied;
  const key = groqKey();
  if (!key) return json({ error: { message: 'Server not configured: set GROQ_API_KEY in Vercel.' } }, 500);

  let incoming: Record<string, unknown>;
  try {
    incoming = await req.json();
  } catch {
    return json({ error: { message: 'Invalid JSON body.' } }, 400);
  }

  const body: Record<string, unknown> = {};
  for (const k of ALLOWED) if (incoming[k] !== undefined) body[k] = incoming[k];
  if (typeof body.max_tokens === 'number') body.max_tokens = Math.min(body.max_tokens, 8192);

  const messages = Array.isArray(body.messages) ? (body.messages as { role?: string }[]) : [];
  if (!messages.some((m) => m.role === 'system')) {
    body.messages = [{ role: 'system', content: SYSTEM_PROMPT }, ...messages];
  }

  // Models saved from a local install (e.g. "qwen3:8b") don't exist on Groq.
  const requested = typeof incoming.model === 'string' ? incoming.model : '';
  body.model = requested && !requested.includes(':') ? requested : DEFAULT_MODEL;

  const send = (model: unknown) =>
    fetch(`${GROQ_BASE}/chat/completions`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...body, model }),
      signal: req.signal,
    });

  let upstream = await send(body.model);
  if (upstream.status === 404) {
    const fallback = await firstAvailableModel(key);
    if (fallback && fallback !== body.model) upstream = await send(fallback);
  }

  return new Response(upstream.body, {
    status: upstream.status,
    headers: {
      'Content-Type': upstream.headers.get('content-type') || 'application/json',
      'Cache-Control': 'no-cache',
    },
  });
}
