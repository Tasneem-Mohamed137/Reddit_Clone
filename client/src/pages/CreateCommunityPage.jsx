import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api, getErrorMessage } from '../api/client';
import RequireAuth from '../components/auth/RequireAuth';
import ImageUploadField from '../components/ui/ImageUploadField';
import { useToast } from '../context/ToastContext';

const NAME_RE = /^[A-Za-z0-9_]{3,21}$/;
const input = 'w-full rounded-2xl border border-line bg-transparent px-4 text-sm outline-none placeholder:text-muted focus:border-link';

function CreateCommunityForm() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const toast = useToast();
  const [form, setForm] = useState({ name: '', description: '', iconUrl: '', bannerUrl: '' });
  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  const setImage = (field) => (url) => setForm((f) => ({ ...f, [field]: url }));

  const create = useMutation({
    mutationFn: async () => {
      const payload = { name: form.name, description: form.description };
      if (form.iconUrl) payload.iconUrl = form.iconUrl;
      if (form.bannerUrl) payload.bannerUrl = form.bannerUrl;
      return (await api.post('/communities', payload)).data.community;
    },
    onSuccess: (community) => {
      queryClient.invalidateQueries({ queryKey: ['communities'] });
      toast(`r/${community.name} created`);
      navigate(`/r/${community.name}`);
    },
    onError: (err) => toast(getErrorMessage(err), 'error'),
  });

  return (
    <div className="rounded-2xl bg-card p-6 ring-1 ring-line">
      <h1 className="text-2xl font-semibold">Create a community</h1>
      <div className="mt-5 space-y-5">
        <div>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-muted">r/</span>
            <input value={form.name} onChange={set('name')} maxLength={21} placeholder="Community name" className={`${input} h-12 pl-9`} />
          </div>
          <p className={`mt-1 px-2 text-xs ${form.name && !NAME_RE.test(form.name) ? 'text-danger' : 'text-muted'}`}>
            3-21 characters: letters, numbers or _
          </p>
        </div>
        <div>
          <textarea value={form.description} onChange={set('description')} maxLength={500} rows={4} placeholder="Description" className={`${input} rtl-aware resize-y py-3`} />
          <p className="px-2 text-right text-xs text-muted">{form.description.length}/500</p>
        </div>
        <ImageUploadField label="Icon" value={form.iconUrl} onChange={setImage('iconUrl')} />
        <ImageUploadField label="Banner" value={form.bannerUrl} onChange={setImage('bannerUrl')} previewClass="h-20 w-48 rounded-xl" />
      </div>
      <div className="mt-5 flex justify-end">
        <button onClick={() => create.mutate()} disabled={!NAME_RE.test(form.name) || create.isPending} className="h-10 rounded-full bg-btn px-6 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-40">
          {create.isPending ? 'Creating...' : 'Create community'}
        </button>
      </div>
    </div>
  );
}

export default function CreateCommunityPage() {
  return (
    <RequireAuth>
      <CreateCommunityForm />
    </RequireAuth>
  );
}