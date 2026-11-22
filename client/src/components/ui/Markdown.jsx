import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { visit } from 'unist-util-visit';

// Reddit's two extra inline syntaxes:  ^word  /  ^(several words)  (superscript)  and  >!spoiler!<
// The spoiler is swapped for private marker characters BEFORE parsing, because a ">" at the start
// of a line would otherwise be read as a blockquote.
const OPEN = '\u0001';
const CLOSE = '\u0002';
const toMarkers = (source) => source.replace(/>!([\s\S]+?)!</g, `${OPEN}$1${CLOSE}`);

const INLINE = /\u0001([\s\S]+?)\u0002|\^\(([^)]+)\)|\^([^\s^]+)/g;

const splitInline = (value) => {
  const parts = [];
  let last = 0;
  for (const match of value.matchAll(INLINE)) {
    if (match.index > last) parts.push({ type: 'text', value: value.slice(last, match.index) });
    const [, spoiler, group, word] = match;
    const text = { type: 'text', value: spoiler ?? group ?? word };
    // data.hName tells react-markdown which HTML element (or custom component) to render.
    parts.push(
      spoiler !== undefined
        ? { type: 'spoiler', data: { hName: 'spoiler' }, children: [text] }
        : { type: 'superscript', data: { hName: 'sup' }, children: [text] },
    );
    last = match.index + match[0].length;
  }
  if (last < value.length) parts.push({ type: 'text', value: value.slice(last) });
  return parts;
};

// Text inside code is not "text" nodes, so code samples are never touched by this plugin.
const redditInline = () => (tree) => {
  visit(tree, 'text', (node, index, parent) => {
    if (!parent || index === undefined) return undefined;
    const parts = splitInline(node.value);
    if (parts.length === 1 && parts[0].type === 'text') return undefined;
    parent.children.splice(index, 1, ...parts);
    return index + parts.length; // skip the nodes we just inserted
  });
  return undefined;
};

function Spoiler({ children }) {
  const [shown, setShown] = useState(false);
  return (
    <span
      onClick={() => setShown(true)}
      className={shown ? 'rounded bg-input px-1' : 'cursor-pointer select-none rounded bg-muted px-1 text-transparent'}
    >
      {children}
    </span>
  );
}

const styled = (Tag, className) =>
  function Styled({ node, ...props }) { // eslint-disable-line no-unused-vars
    return <Tag {...props} className={className} />;
  };

// No raw HTML is ever rendered (react-markdown's default), and javascript: links are blocked.
const components = {
  a: ({ node, ...props }) => ( // eslint-disable-line no-unused-vars
    <a {...props} target="_blank" rel="noreferrer noopener nofollow" className="text-link hover:underline" />
  ),
  p: styled('p', 'my-2 first:mt-0 last:mb-0'),
  h1: styled('h1', 'my-3 text-xl font-bold'),
  h2: styled('h2', 'my-3 text-lg font-semibold'),
  h3: styled('h3', 'my-2 text-base font-semibold'),
  ul: styled('ul', 'my-2 list-disc pl-6'),
  ol: styled('ol', 'my-2 list-decimal pl-6'),
  blockquote: styled('blockquote', 'my-2 border-l-4 border-line pl-3 text-muted'),
  pre: styled('pre', 'my-2 overflow-x-auto rounded-xl bg-input p-3 text-xs [&_code]:bg-transparent [&_code]:p-0'),
  code: styled('code', 'rounded bg-input px-1 py-0.5 text-xs'),
  th: styled('th', 'border border-line px-3 py-1 text-left font-semibold'),
  td: styled('td', 'border border-line px-3 py-1'),
  hr: styled('hr', 'my-3 border-line'),
  img: styled('img', 'my-2 max-h-96 rounded-xl'),
  table: ({ node, ...props }) => ( // eslint-disable-line no-unused-vars
    <div className="my-2 overflow-x-auto">
      <table {...props} className="text-sm" />
    </div>
  ),
  spoiler: Spoiler,
};

export default function Markdown({ children, className = '' }) {
  return (
    <div className={`rtl-aware text-sm leading-relaxed [overflow-wrap:anywhere] ${className}`}>
      <ReactMarkdown remarkPlugins={[remarkGfm, redditInline]} components={components}>
        {toMarkers(children)}
      </ReactMarkdown>
    </div>
  );
}