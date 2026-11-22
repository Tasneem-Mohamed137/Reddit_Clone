export const timeAgo = (iso) => {
  const seconds = Math.max(0, (Date.now() - Date.parse(iso)) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min. ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hr. ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} ${days === 1 ? 'day' : 'days'} ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} mo. ago`;
  return `${Math.floor(months / 12)} yr. ago`;
};

export const formatCount = (n) => {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, '')}K`;
  return String(n);
};

export const formatDate = (iso) =>
  new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

export const isHttpUrl = (value) => {
  try {
    return ['http:', 'https:'].includes(new URL(value).protocol);
  } catch {
    return false;
  }
};

// Decides how to render a media URL; works for uploaded files and external links alike.
export const isVideoUrl = (url) => /\.(mp4|webm|mov)(\?.*)?$/i.test(url);

export const hostOf = (url) => {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
};

// Keeps letters/numbers of any language (Arabic included); everything else becomes "_".
export const slugify = (text) =>
  text.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '_').replace(/^_+|_+$/g, '').slice(0, 60) || 'post';

export const postUrl = (communityName, id, title) => `/r/${communityName}/comments/${id}/${slugify(title)}`;
export const postPath = (post) => postUrl(post.community.name, post.id, post.title);