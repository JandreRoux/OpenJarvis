// Health probe the UI uses to show the "connected" state.
import { json, groqKey } from './_lib/groq.js';

export function GET(): Response {
  return json({ status: groqKey() ? 'ok' : 'missing GROQ_API_KEY', backend: 'groq' });
}
