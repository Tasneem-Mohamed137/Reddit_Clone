import { useRef, useState } from 'react';
import { ImagePlus, Trash2 } from 'lucide-react';
import { getErrorMessage } from '../../api/client';
import { uploadFiles } from '../../api/uploads';
import { useToast } from '../../context/ToastContext';

const MAX_MB = 10;

// One picture with an upload button. `value` is the stored URL ('' when empty).
export default function ImageUploadField({ label, value, onChange, previewClass = 'h-20 w-20 rounded-full' }) {
  const toast = useToast();
  const input = useRef(null);
  const [uploading, setUploading] = useState(false);

  const pick = async (event) => {
    const file = event.target.files[0];
    event.target.value = '';
    if (!file) return;
    if (file.size > MAX_MB * 1024 * 1024) {
      toast(`The image must be ${MAX_MB} MB or smaller`, 'error');
      return;
    }
    setUploading(true);
    try {
      const [item] = await uploadFiles([file]);
      onChange(item.url);
    } catch (err) {
      toast(getErrorMessage(err), 'error');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <div className="mb-1.5 px-1 text-xs font-medium text-muted">{label}</div>
      <div className="flex items-center gap-4">
        <div className={`flex shrink-0 items-center justify-center overflow-hidden bg-input ${previewClass}`}>
          {value ? <img src={value} alt="" className="h-full w-full object-cover" /> : <ImagePlus size={24} className="text-muted" />}
        </div>
        <input ref={input} type="file" accept="image/jpeg,image/png,image/gif,image/webp" hidden onChange={pick} />
        <button type="button" onClick={() => input.current.click()} disabled={uploading} className="h-9 rounded-full bg-btn px-4 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50">
          {uploading ? 'Uploading...' : value ? 'Change' : 'Upload image'}
        </button>
        {value && (
          <button type="button" onClick={() => onChange('')} className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-hover" aria-label="Remove image">
            <Trash2 size={16} />
          </button>
        )}
      </div>
    </div>
  );
}