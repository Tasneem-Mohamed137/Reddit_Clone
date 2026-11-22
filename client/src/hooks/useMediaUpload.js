import { useState } from 'react';
import { getErrorMessage } from '../api/client';
import { uploadFiles } from '../api/uploads';
import { useToast } from '../context/ToastContext';

export const MAX_MEDIA = 10;
const LIMIT_MB = { image: 10, video: 50 };

// Validates, uploads, and appends the stored URLs to a media list (setMedia must be a state setter).
export const useMediaUpload = (setMedia, currentCount) => {
  const toast = useToast();
  const [uploading, setUploading] = useState(false);

  const upload = async (fileList) => {
    const files = [...fileList].slice(0, MAX_MEDIA - currentCount);
    if (files.length === 0) {
      toast(`You can attach up to ${MAX_MEDIA} files`, 'error');
      return;
    }
    const tooBig = files.find((f) => f.size > LIMIT_MB[f.type.startsWith('video/') ? 'video' : 'image'] * 1024 * 1024);
    if (tooBig) {
      toast(`${tooBig.name} is too large (images up to 10 MB, videos up to 50 MB)`, 'error');
      return;
    }

    setUploading(true);
    try {
      const items = await uploadFiles(files);
      setMedia((list) => [...list, ...items.map((item) => item.url)]);
    } catch (err) {
      toast(getErrorMessage(err), 'error');
    } finally {
      setUploading(false);
    }
  };

  return { upload, uploading };
};