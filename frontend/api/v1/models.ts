// Model picker: Groq's chat models, default model first.
import { GROQ_BASE, DEFAULT_MODEL, json, groqKey, isChatModel } from '../_lib/groq.js';

export async function GET(): Promise<Response> {
  const key = groqKey();
  if (!key) return json({ object: 'list', data: [] });
  const res = await fetch(`${GROQ_BASE}/models`, { headers: { Authorization: `Bearer ${key}` } });
  if (!res.ok) return json({ error: { message: `Groq models request failed: ${res.status}` } }, 502);
  const body = (await res.json()) as { data?: { id: string; created?: number; owned_by?: string }[] };
  const data = (body.data || [])
    .filter((m) => isChatModel(m.id))
    .map((m) => ({ id: m.id, object: 'model', created: m.created ?? 0, owned_by: m.owned_by ?? 'groq' }))
    .sort((a, b) => (a.id === DEFAULT_MODEL ? -1 : b.id === DEFAULT_MODEL ? 1 : a.id.localeCompare(b.id)));
  return json({ object: 'list', data });
}
