import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api, getErrorMessage } from '../api/client';
import RequireAuth from '../components/auth/RequireAuth';
import ImageUploadField from '../components/ui/ImageUploadField';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

const input = 'w-full rounded-2xl border border-line bg-transparent px-4 text-sm outline-none placeholder:text-muted focus:border-link';

function ProfileForm() {
  const { user, setUser } = useAuth();
  const queryClient = useQueryClient();
  const toast = useToast();
  const [form, setForm] = useState({ displayName: user.displayName, bio: user.bio, avatarUrl: user.avatarUrl ?? '' });
  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const save = useMutation({
    mutationFn: async () =>
      (await api.patch('/users/me', { displayName: form.displayName, bio: form.bio, avatarUrl: form.avatarUrl || null })).data.user,
    onSuccess: (updated) => {
      setUser(updated);
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      toast('Profile updated');
    },
    onError: (err) => toast(getErrorMessage(err), 'error'),
  });

  return (
    <div className="rounded-2xl bg-card p-6 ring-1 ring-line">
      <h1 className="text-2xl font-semibold">Edit profile</h1>
      <div className="mt-1 text-sm text-muted">u/{user.username}</div>

      <div className="mt-5 space-y-5">
        <ImageUploadField label="Avatar" value={form.avatarUrl} onChange={(url) => setForm((f) => ({ ...f, avatarUrl: url }))} />
        <input value={form.displayName} onChange={set('displayName')} maxLength={30} placeholder="Display name" className={`${input} rtl-aware h-12`} />
        <div>
          <textarea value={form.bio} onChange={set('bio')} maxLength={200} rows={3} placeholder="About you" className={`${input} rtl-aware resize-y py-3`} />
          <p className="px-2 text-right text-xs text-muted">{form.bio.length}/200</p>
        </div>
      </div>

      <div className="mt-5 flex justify-end">
        <button onClick={() => save.mutate()} disabled={!form.displayName.trim() || save.isPending} className="h-10 rounded-full bg-btn px-6 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-40">
          {save.isPending ? 'Saving...' : 'Save'}
        </button>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <RequireAuth>
      <ProfileForm />
    </RequireAuth>
  );
}