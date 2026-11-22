import { commentRepo } from '../repositories/index.js';
import { env } from '../config/env.js';
import { AppError } from '../utils/AppError.js';
import { findPostOrThrow } from './post.service.js';

// postId -> { summary, updatedAt }. A post edit changes updatedAt, which invalidates the entry.
// Only REAL summaries are cached, so adding an API key takes effect immediately.
const cache = new Map();

const buildPrompt = (post, comments) =>
  [
    'Summarize this Reddit post in 3-4 short lines. Plain text only, no markdown, same language as the post.',
    `Title: ${post.title}`,
    post.body ? `Body: ${post.body.slice(0, 4000)}` : '',
    comments.length ? `Top comments:\n${comments.map((c) => `- ${c.body.slice(0, 300)}`).join('\n')}` : '',
  ]
    .filter(Boolean)
    .join('\n\n');

const post = async (url, headers, body) => {
  let response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify(body),
    });
  } catch {
    throw new AppError(502, 'AI_PROVIDER_ERROR', 'Could not reach the AI provider');
  }
  if (!response.ok) {
    // The provider's own message (invalid key, quota, wrong model...) stays in the server log.
    console.error(`[ai] provider answered ${response.status}:`, (await response.text()).slice(0, 500));
    throw new AppError(502, 'AI_PROVIDER_ERROR', `The AI provider answered ${response.status}. Check AI_API_KEY and AI_MODEL in server/.env`);
  }
  return response.json();
};

// The API key is read from the server env only; it never reaches the browser.
const providers = {
  async gemini(prompt) {
    const model = env.ai.model || 'gemini-flash-latest';
    const data = await post(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
      { 'x-goog-api-key': env.ai.apiKey },
      { contents: [{ parts: [{ text: prompt }] }] },
    );
    return data.candidates?.[0]?.content?.parts?.[0]?.text;
  },

  async openai(prompt) {
    const data = await post(
      'https://api.openai.com/v1/chat/completions',
      { Authorization: `Bearer ${env.ai.apiKey}` },
      { model: env.ai.model || 'gpt-4o-mini', messages: [{ role: 'user', content: prompt }] },
    );
    return data.choices?.[0]?.message?.content;
  },

  async anthropic(prompt) {
    const data = await post(
      'https://api.anthropic.com/v1/messages',
      { 'x-api-key': env.ai.apiKey, 'anthropic-version': '2023-06-01' },
      { model: env.ai.model || 'claude-sonnet-5-5', max_tokens: 300, messages: [{ role: 'user', content: prompt }] },
    );
    return data.content?.[0]?.text;
  },
};

export const isRealAiConfigured = () => Boolean(env.ai.apiKey) && Boolean(providers[env.ai.provider]);

const mockSummary = (p) =>
  `[Mock summary: no AI key configured] "${p.title}". ${p.body ? p.body.slice(0, 160) : 'This post has no body text.'}`;

export const aiService = {
  async summarize(postId) {
    const target = await findPostOrThrow(postId);
    const cached = cache.get(postId);
    if (cached && cached.updatedAt === target.updatedAt) return { summary: cached.summary, cached: true };

    if (!isRealAiConfigured()) return { summary: mockSummary(target), cached: false };

    const comments = (await commentRepo.listByPost(postId)).filter((c) => !c.deleted).slice(0, 5);
    const summary = (await providers[env.ai.provider](buildPrompt(target, comments)))?.trim();
    if (!summary) throw new AppError(502, 'AI_PROVIDER_ERROR', 'The AI provider returned an empty summary');

    cache.set(postId, { summary, updatedAt: target.updatedAt });
    return { summary, cached: false };
  },
};