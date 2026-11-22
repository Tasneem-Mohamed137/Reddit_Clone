import { useRef, useState } from 'react';
import {
  Bold, Braces, CirclePlay, Code, Eye, EyeOff, Heading, Image as ImageIcon, Italic, Link as LinkIcon,
  Link2, List, ListOrdered, Quote, Strikethrough, Superscript, Table,
} from 'lucide-react';
import { isHttpUrl } from '../../utils/format';
import Markdown from '../ui/Markdown';

const FENCE = '`'.repeat(3);
const CODE_BLOCK = `\n${FENCE}\ncode\n${FENCE}\n`;
const TABLE = '\n| Column 1 | Column 2 |\n| --- | --- |\n| Cell | Cell |\n';
const IMAGE_TYPES = 'image/jpeg,image/png,image/gif,image/webp';
const VIDEO_TYPES = 'video/mp4,video/webm,video/quicktime';

function Tool({ label, onClick, disabled, children }) {
  return (
    <button type="button" title={label} aria-label={label} onClick={onClick} disabled={disabled} className="flex h-8 w-8 items-center justify-center rounded-md text-muted hover:bg-hover hover:text-ink disabled:opacity-40">
      {children}
    </button>
  );
}

const Divider = () => <span className="mx-1 h-5 w-px bg-line" />;

// Markdown editor with Reddit's toolbar. Attachments are optional:
//   onUpload(files) -> image/video buttons are shown; onLink(url) -> the attach-link button is shown.
export default function RichTextEditor({ value, onChange, placeholder, rows = 6, autoFocus = false, onUpload, onLink, uploading = false }) {
  const textarea = useRef(null);
  const imageInput = useRef(null);
  const videoInput = useRef(null);
  const [preview, setPreview] = useState(false);
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkText, setLinkText] = useState('');

  // Writes the new text, then puts the cursor/selection back after React re-rendered.
  const apply = (next, selectStart, selectEnd) => {
    onChange(next);
    requestAnimationFrame(() => {
      textarea.current?.focus();
      textarea.current?.setSelectionRange(selectStart, selectEnd);
    });
  };

  const wrap = (before, after = before, fallback = 'text') => {
    const { selectionStart: start, selectionEnd: end } = textarea.current;
    const selected = value.slice(start, end) || fallback;
    apply(value.slice(0, start) + before + selected + after + value.slice(end), start + before.length, start + before.length + selected.length);
  };

  // Adds a prefix to every selected line (lists, quotes, headings).
  const prefixLines = (prefixOf) => {
    const { selectionStart, selectionEnd } = textarea.current;
    const start = value.lastIndexOf('\n', selectionStart - 1) + 1;
    const newline = value.indexOf('\n', selectionEnd);
    const end = newline === -1 ? value.length : newline;
    const block = value
      .slice(start, end)
      .split('\n')
      .map((line, i) => prefixOf(i) + line)
      .join('\n');
    apply(value.slice(0, start) + block + value.slice(end), start, start + block.length);
  };

  const insert = (text) => {
    const position = textarea.current.selectionEnd;
    apply(value.slice(0, position) + text + value.slice(position), position + text.length, position + text.length);
  };

  const inlineLink = () => {
    const { selectionStart: start, selectionEnd: end } = textarea.current;
    const label = value.slice(start, end) || 'link text';
    const urlStart = start + label.length + 3; // right after "[label]("
    apply(`${value.slice(0, start)}[${label}](https://)${value.slice(end)}`, urlStart, urlStart + 8); // selects "https://"
  };

  const onKeyDown = (event) => {
    if (!(event.ctrlKey || event.metaKey)) return;
    const action = { b: () => wrap('**'), i: () => wrap('*'), k: inlineLink }[event.key.toLowerCase()];
    if (action) {
      event.preventDefault();
      action();
    }
  };

  const pickFiles = (event) => {
    const files = [...event.target.files];
    event.target.value = ''; // lets the same file be picked again later
    if (files.length > 0) onUpload(files);
  };

  const submitLink = () => {
    const url = linkText.trim();
    if (!isHttpUrl(url)) return;
    onLink(url);
    setLinkText('');
    setLinkOpen(false);
  };

  return (
    <div className="rounded-2xl border border-line focus-within:border-link">
      {preview ? (
        <div className="min-h-24 p-3">
          {value.trim() ? <Markdown>{value}</Markdown> : <p className="text-sm text-muted">Nothing to preview</p>}
        </div>
      ) : (
        <textarea
          ref={textarea}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={onKeyDown}
          rows={rows}
          maxLength={40000}
          autoFocus={autoFocus}
          placeholder={placeholder}
          className="rtl-aware block w-full resize-y bg-transparent p-3 text-sm outline-none placeholder:text-muted"
        />
      )}

      <div className="flex flex-wrap items-center gap-0.5 border-t border-line px-2 py-1.5">
        {onLink && (
          <Tool label="Attach a link" onClick={() => setLinkOpen((o) => !o)}><LinkIcon size={18} /></Tool>
        )}
        {onUpload && (
          <>
            <input ref={imageInput} type="file" accept={IMAGE_TYPES} multiple hidden onChange={pickFiles} />
            <input ref={videoInput} type="file" accept={VIDEO_TYPES} multiple hidden onChange={pickFiles} />
            <Tool label="Add images" onClick={() => imageInput.current.click()} disabled={uploading}><ImageIcon size={18} /></Tool>
            <Tool label="Add a video" onClick={() => videoInput.current.click()} disabled={uploading}><CirclePlay size={18} /></Tool>
          </>
        )}
        {(onLink || onUpload) && <Divider />}

        <Tool label="Bold (Ctrl+B)" onClick={() => wrap('**')} disabled={preview}><Bold size={18} /></Tool>
        <Tool label="Italic (Ctrl+I)" onClick={() => wrap('*')} disabled={preview}><Italic size={18} /></Tool>
        <Tool label="Strikethrough" onClick={() => wrap('~~')} disabled={preview}><Strikethrough size={18} /></Tool>
        <Tool label="Superscript" onClick={() => wrap('^(', ')')} disabled={preview}><Superscript size={18} /></Tool>
        <Tool label="Heading" onClick={() => prefixLines(() => '## ')} disabled={preview}><Heading size={18} /></Tool>
        <Divider />
        <Tool label="Link (Ctrl+K)" onClick={inlineLink} disabled={preview}><Link2 size={18} /></Tool>
        <Tool label="Bulleted list" onClick={() => prefixLines(() => '- ')} disabled={preview}><List size={18} /></Tool>
        <Tool label="Numbered list" onClick={() => prefixLines((i) => `${i + 1}. `)} disabled={preview}><ListOrdered size={18} /></Tool>
        <Divider />
        <Tool label="Spoiler" onClick={() => wrap('>!', '!<', 'spoiler')} disabled={preview}><EyeOff size={18} /></Tool>
        <Tool label="Quote" onClick={() => prefixLines(() => '> ')} disabled={preview}><Quote size={18} /></Tool>
        <Tool label="Inline code" onClick={() => wrap('`')} disabled={preview}><Code size={18} /></Tool>
        <Tool label="Code block" onClick={() => insert(CODE_BLOCK)} disabled={preview}><Braces size={18} /></Tool>
        <Tool label="Table" onClick={() => insert(TABLE)} disabled={preview}><Table size={18} /></Tool>

        <div className="ml-auto flex items-center gap-2">
          {uploading && <span className="text-xs text-muted">Uploading...</span>}
          <Tool label={preview ? 'Back to editing' : 'Preview'} onClick={() => setPreview((p) => !p)}><Eye size={18} /></Tool>
        </div>
      </div>

      {linkOpen && onLink && (
        <div className="flex items-center gap-2 border-t border-line p-2">
          <input
            value={linkText}
            onChange={(e) => setLinkText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), submitLink())}
            placeholder="https://..."
            autoFocus
            className="h-9 flex-1 rounded-full border border-line bg-transparent px-4 text-sm outline-none placeholder:text-muted focus:border-link"
          />
          <button type="button" onClick={submitLink} disabled={!isHttpUrl(linkText.trim())} className="h-9 rounded-full bg-btn px-4 text-sm font-semibold text-white disabled:opacity-40">
            Attach
          </button>
        </div>
      )}
    </div>
  );
}