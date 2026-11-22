import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2 } from 'lucide-react';
import { api, getErrorMessage } from '../api/client';
import RequireAuth from '../components/auth/RequireAuth';
import ImageUploadField from '../components/ui/ImageUploadField';
import { useToast } from '../context/ToastContext';
import { useCommunity } from '../hooks/useCommunity';

const input = 'w-full rounded-2xl border border-line bg-transparent px-4 text-sm outline-none placeholder:text-muted focus:border-link';

function Form({ community }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const toast = useToast();
  const [description, setDescription] = useState(community.description);
  const [iconUrl, setIconUrl] = useState(community.iconUrl ?? '');
  const [bannerUrl, setBannerUrl] = useState(community.bannerUrl ?? '');
  const [rules, setRules] = useState(community.rules ?? []);

  const setRule = (index, field, value) =>
    setRules((list) => list.map((rule, i) => (i === index ? { ...rule, [field]: value } : rule)));

  const save = useMutation({
    mutationFn: async () =>
      (
        await api.patch(`/communities/${community.name}`, {
          description,
          iconUrl: iconUrl || null,
          bannerUrl: bannerUrl || null,
          rules: rules.filter((rule) => rule.title.trim()),
        })
      ).data.community,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['community', community.name] });
      queryClient.invalidateQueries({ queryKey: ['communities'] });
      toast('Community updated');
      navigate(`/r/${community.name}`);
    },
    onError: (err) => toast(getErrorMessage(err), 'error'),
  });

  return (
    <div className="rounded-2xl bg-card p-6 ring-1 ring-line">
      <h1 className="text-2xl font-semibold">Edit r/{community.name}</h1>
      <div className="mt-5 space-y-5">
        <div>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} maxLength={500} rows={4} placeholder="Description" className={`${input} rtl-aware resize-y py-3`} />
          <p className="px-2 text-right text-xs text-muted">{description.length}/500</p>
        </div>
        <ImageUploadField label="Icon" value={iconUrl} onChange={setIconUrl} />
        <ImageUploadField label="Banner" value={bannerUrl} onChange={setBannerUrl} previewClass="h-20 w-48 rounded-xl" />

        <div>
          <h2 className="mb-2 px-1 text-xs font-medium uppercase tracking-wider text-muted">Rules ({rules.length}/10)</h2>
          <div className="space-y-3">
            {rules.map((rule, i) => (
              <div key={i} className="flex items-start gap-2">
                <div className="flex-1 space-y-2">
                  <input value={rule.title} onChange={(e) => setRule(i, 'title', e.target.value)} maxLength={100} placeholder={`Rule ${i + 1}`} className={`${input} rtl-aware h-11`} />
                  <input value={rule.description} onChange={(e) => setRule(i, 'description', e.target.value)} maxLength={500} placeholder="Description (optional)" className={`${input} rtl-aware h-11`} />
                </div>
                <button onClick={() => setRules((list) => list.filter((_, idx) => idx !== i))} className="mt-1 flex h-9 w-9 items-center justify-center rounded-full hover:bg-hover" aria-label="Remove rule">
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
          {rules.length < 10 && (
            <button onClick={() => setRules((list) => [...list, { title: '', description: '' }])} className="mt-3 flex h-9 items-center gap-1.5 rounded-full px-3 text-sm font-medium text-link hover:bg-hover">
              <Plus size={16} /> Add a rule
            </button>
          )}
        </div>
      </div>

      <div className="mt-5 flex justify-end gap-2">
        <Link to={`/r/${community.name}`} className="flex h-10 items-center rounded-full bg-input px-5 text-sm font-semibold hover:bg-hover">Cancel</Link>
        <button onClick={() => save.mutate()} disabled={save.isPending} className="h-10 rounded-full bg-btn px-6 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-40">
          {save.isPending ? 'Saving...' : 'Save'}
        </button>
      </div>
    </div>
  );
}

function EditCommunity() {
  const { name } = useParams();
  const { data: community, isLoading, isError } = useCommunity(name);

  if (isLoading) return <div className="skeleton h-48" />;
  if (isError) return <p className="py-24 text-center text-muted">r/{name} does not exist.</p>;
  if (!community.isModerator) {
    return (
      <div className="py-24 text-center">
        <p className="text-muted">Only moderators can edit r/{name}.</p>
        <Link to={`/r/${name}`} className="mt-4 inline-block rounded-full bg-btn px-5 py-2.5 text-sm font-semibold text-white">Back to r/{name}</Link>
      </div>
    );
  }
  return <Form community={community} />;
}

export default function EditCommunityPage() {
  return (
    <RequireAuth>
      <EditCommunity />
    </RequireAuth>
  );
}