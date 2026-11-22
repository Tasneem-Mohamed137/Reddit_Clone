import { api } from './client';

// Sends files as multipart/form-data (axios sets the boundary header by itself).
// Resolves to [{ url, type: 'image' | 'video', size }].
export const uploadFiles = async (files) => {
  const form = new FormData();
  files.forEach((file) => form.append('files', file));
  return (await api.post('/uploads', form)).data.items;
};