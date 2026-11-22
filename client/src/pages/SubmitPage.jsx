import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronsUpDown } from 'lucide-react';
import { api, getErrorMessage } from '../api/client';
import RequireAuth from '../components/auth/RequireAuth';
import DraftsModal from '../components/post/DraftsModal';
import MediaTray from '../components/post/MediaTray';
import RichTextEditor from '../components/post/RichTextEditor';
import TagsPicker from '../components/post/TagsPicker';
import Avatar from '../components/ui/Avatar';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useClickOutside } from '../hooks/useClickOutside';
import { useCommunity } from '../hooks/useCommunity';
import { useDebounce } from '../hooks/useDebounce';
import { useDrafts } from '../hooks/useDrafts';
import { useMediaUpload } from '../hooks/useMediaUpload';
import { postPath } from '../utils/format';

function CommunityPicker({ value, onChange }) {
  const { user } = useAuth();
  const ref = useRef(null);
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const q = useDebounce(text.trim(), 300);
  useClickOutside(ref, () => setOpen(false));

  const joined = useQuery({
    queryKey: ['communities', 'joined'],
    queryFn: async () => (await api.get('/users/me/communities')).data.items,
    enabled: Boolean(user),
  });
  const found = useQuery({
    queryKey: ['search', 'communities', q, 'picker'],
    queryFn: async () => (await api.get('/search', { params: { q, type: 'communities', limit: 8 } })).data.items,
    enabled: q.length > 0,
  });
  const options = q ? (found.data ?? []) : (joined.data ?? []);

  const pick = (community) => {
    onChange({ name: community.name, iconUrl: community.iconUrl });
    setOpen(false);
    setText('');
  };

  return (
    <div ref={ref} className="relative w-full max-w-xs">
      <input
        value={open ? text : value ? `r/${value.name}` : ''}
        onChange={(e) => setText(e.target.value)}
        onFocus={() => setOpen(true)}
        placeholder="Select Community"
        className="h-11 w-full rounded-full border border-line bg-transparent px-5 pr-10 text-sm font-semibold outline-none placeholder:text-ink focus:border-link"
      />
      <ChevronsUpDown size={16} className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-muted" />
      {open && (
        <div className="absolute left-0 right-0 top-12 z-30 max-h-72 overflow-y-auto rounded-2xl border border-line bg-card py-2 shadow-xl">
          {!q && <div className="px-4 pb-1 text-xs uppercase tracking-wider text-muted">Your communities</div>}
          {options.map((c) => (
            <button key={c.id} onClick={() => pick(c)} className="flex w-full items-center gap-3 px-4 py-2 text-left hover:bg-hover">
              <Avatar name={c.name} src={c.iconUrl} size={28} />
              <span className="text-sm font-medium">r/{c.name}</span>
            </button>
          ))}
          {options.length === 0 && <p className="px-4 py-2 text-sm text-muted">{q ? 'No communities found' : 'Type to search communities'}</p>}
        </div>
      )}
    </div>
  );
}

function SubmitForm() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const toast = useToast();
  const [params] = useSearchParams();
  const preset = useCommunity(params.get('community'));
  const drafts = useDrafts();

  const [community, setCommunity] = useState(null);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [media, setMedia] = useState([]);
  const [linkUrl, setLinkUrl] = useState('');
  const [tags, setTags] = useState([]);
  const [draftId, setDraftId] = useState(null);
  const [showDrafts, setShowDrafts] = useState(false);
  const { upload, uploading } = useMediaUpload(setMedia, media.length);

  useEffect(() => {
    if (preset.data && !community) setCommunity({ name: preset.data.name, iconUrl: preset.data.iconUrl });
  }, [preset.data]); // eslint-disable-line react-hooks/exhaustive-deps

  const canPost = Boolean(community) && title.trim().length > 0 && !uploading;
  const hasContent = Boolean(title.trim() || body.trim() || media.length || linkUrl);

  const create = useMutation({
    mutationFn: async () =>
      (
        await api.post(`/communities/${community.name}/posts`, {
          title: title.trim(),
          body,
          mediaUrls: media,
          linkUrl: linkUrl || undefined,
          tags,
        })
      ).data.post,
    onSuccess: (post) => {
      if (draftId) drafts.remove(draftId);
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      toast('Post created');
      navigate(postPath(post));
    },
    onError: (err) => toast(getErrorMessage(err), 'error'),
  });

  const saveDraft = () => {
    setDraftId(drafts.save({ id: draftId, title, body, community, media, linkUrl, tags }));
    toast('Draft saved');
  };

  const loadDraft = (draft) => {
    setDraftId(draft.id);
    setTitle(draft.title);
    setBody(draft.body);
    setCommunity(draft.community);
    setMedia(draft.media);
    setLinkUrl(draft.linkUrl);
    setTags(draft.tags);
    setShowDrafts(false);
  };

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <CommunityPicker value={community} onChange={setCommunity} />
        <button onClick={() => setShowDrafts(true)} className="text-sm font-semibold hover:underline">
          Drafts{drafts.drafts.length > 0 && ` (${drafts.drafts.length})`}
        </button>
      </div>

      <div className="relative mt-4">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={300}
          placeholder="Title*"
          className="rtl-aware h-14 w-full rounded-2xl border border-line bg-transparent px-4 pr-16 text-lg font-semibold outline-none placeholder:text-muted focus:border-link"
        />
        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-muted">{title.length}/300</span>
      </div>

      <div className="mt-3">
        <TagsPicker value={tags} onChange={setTags} />
      </div>

      <div className="mt-3">
        <RichTextEditor
          value={body}
          onChange={setBody}
          rows={9}
          placeholder="Body text (optional)"
          onUpload={upload}
          onLink={setLinkUrl}
          uploading={uploading}
        />
        <MediaTray
          urls={media}
          onRemove={(url) => setMedia((list) => list.filter((u) => u !== url))}
          linkUrl={linkUrl}
          onRemoveLink={() => setLinkUrl('')}
        />
      </div>

      <div className="mt-4 flex justify-end gap-2">
        <button onClick={saveDraft} disabled={!hasContent} className="h-10 rounded-full bg-input px-5 text-sm font-semibold hover:bg-hover disabled:opacity-40">
          Save Draft
        </button>
        <button onClick={() => create.mutate()} disabled={!canPost || create.isPending} className="h-10 rounded-full bg-btn px-6 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-40">
          {create.isPending ? 'Posting...' : 'Post'}
        </button>
      </div>

      {showDrafts && (
        <DraftsModal drafts={drafts.drafts} onLoad={loadDraft} onDelete={drafts.remove} onClose={() => setShowDrafts(false)} />
      )}
    </div>
  );
}

export default function SubmitPage() {
  return (
    <RequireAuth>
      <SubmitForm />
    </RequireAuth>
  );
}