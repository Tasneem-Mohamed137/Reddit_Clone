import { env } from '../config/env.js';

const { provider, apiKey, model } = env.ai;
console.log(`provider=${provider}  model=${model || '(default)'}  key=${apiKey ? `set (${apiKey.length} characters)` : 'MISSING'}`);

if (!apiKey) {
  console.error('AI_API_KEY is empty. Put your key in server/.env and run this again.');
  process.exit(1);
}
if (provider !== 'gemini') {
  console.log(`This check only covers Gemini (your provider is "${provider}").`);
  process.exit(0);
}

const base = 'https://generativelanguage.googleapis.com/v1beta';
const headers = { 'x-goog-api-key': apiKey, 'Content-Type': 'application/json' };

const list = await fetch(`${base}/models?pageSize=200`, { headers });
const listBody = await list.json();
if (!list.ok) {
  console.error(`Could not list models: HTTP ${list.status}: ${listBody.error?.message}`);
  process.exit(1);
}
const usable = listBody.models
  .filter((m) => m.supportedGenerationMethods?.includes('generateContent'))
  .map((m) => m.name.replace('models/', ''));
console.log(`\nModels your key can use:\n  ${usable.join('\n  ')}\n`);

const chosen = model || 'gemini-flash-latest';
const res = await fetch(`${base}/models/${chosen}:generateContent`, {
  method: 'POST',
  headers,
  body: JSON.stringify({ contents: [{ parts: [{ text: 'Reply with the single word: OK' }] }] }),
});
const data = await res.json();
console.log(
  res.ok
    ? `OK with "${chosen}": ${data.candidates?.[0]?.content?.parts?.[0]?.text?.trim()}`
    : `FAILED with "${chosen}": HTTP ${res.status}: ${data.error?.message}`,
);