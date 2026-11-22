import { commentRepo } from '../repositories/index.js';
import { env } from '../config/env.js';
import { AppError } from '../utils/AppError.js';
import { findPostOrThrow } from './post.service.js';

// postId -> { summary, updatedAt }. A post edit changes updatedAt, which invalidates the entry.
// Only REAL summaries are cached, so adding an API key takes effect immediately.
const cache = new Map();

const REQUEST_TIMEOUT_MS = 15_000;

// If the chosen model is overloaded (503), out of quota (429), missing (404) or failing (500),
// the next model is tried before giving up. Any other error (bad key, blocked post) stops right away.
const GEMINI_FALLBACKS = ['gemini-flash-lite-latest', 'gemini-3.8-flash'];
const TRY_NEXT_MODEL = new Set([404, 429, 500, 503]);

const buildPrompt = (post, comments) =>
  [
    'Summarize this Reddit post in 3-4 short lines. Plain text only, no markdown, same language as the post.',
    `Title: ${post.title}`,
    post.body ? `Body: ${post.body.slice(0, 4000)}` : '',
    comments.length ? `Top comments:\n${comments.map((c) => `- ${c.body.slice(0, 300)}`).join('\n')}` : '',
  ]
    .filter(Boolean)
    .join('\n\n');

const readProviderMessage = (text) => {
  try {
    return JSON.parse(text).error?.message ?? text.slice(0, 200);
  } catch {
    return text.slice(0, 200);
  }
};

const post = async (url, headers, body) => {
  let response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS), // a hanging provider must not hang the request forever
    });
  } catch {
    throw new AppError(502, 'AI_PROVIDER_ERROR', 'Could not reach the AI provider (network error or timeout)');
  }
  if (!response.ok) {
    const text = await response.text();
    console.error(`[ai] provider answered ${response.status}:`, text.slice(0, 500));
    // The reason is shown to you while developing; in production only the status is returned.
    const detail = env.isProd ? '' : ` ${readProviderMessage(text)}`;
    const error = new AppError(502, 'AI_PROVIDER_ERROR', `The AI provider answered ${response.status}.${detail}`);
    error.providerStatus = response.status; // lets the caller decide whether another model is worth trying
    throw error;
  }
  return response.json();
};

const askGemini = async (model, prompt) => {
  const data = await post(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
    { 'x-goog-api-key': env.ai.apiKey },
    { contents: [{ parts: [{ text: prompt }] }] },
  );
  // Newer models can answer in several parts, so join all of them.
  const text = data.candidates?.[0]?.content?.parts?.map((part) => part.text ?? '').join('');
  if (!text && data.promptFeedback?.blockReason) {
    throw new AppError(502, 'AI_PROVIDER_ERROR', `The AI provider blocked this post (${data.promptFeedback.blockReason})`);
  }
  return text;
};

// The API key is read from the server env only; it never reaches the browser.
const providers = {
  async gemini(prompt) {
    const models = [...new Set([env.ai.model || 'gemini-flash-latest', ...GEMINI_FALLBACKS])];
    let lastError;
    for (const model of models) {
      try {
        return await askGemini(model, prompt);
      } catch (err) {
        if (!TRY_NEXT_MODEL.has(err.providerStatus)) throw err;
        console.warn(`[ai] ${model} failed (${err.providerStatus}), trying the next model`);
        lastError = err;
      }
    }
    throw lastError;
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