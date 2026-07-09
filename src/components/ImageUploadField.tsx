import { useState, type ChangeEvent } from 'react';
import { ImageIcon, Trash2, Upload } from 'lucide-react';
import { uploadToPresignedUrl } from '@/lib/s3-upload';
import { ApiError } from '@/types/api';
import { useAdminImageUpload } from '@/features/uploads/api';

interface ImageUploadFieldProps {
  /** Current stored image URL (empty string when none). */
  value: string;
  /** Called with the new public URL, or '' when cleared. */
  onChange: (url: string) => void;
  /** Namespaces the S3 key, e.g. "category" / "promotion". */
  kind?: string;
  /** Preview aspect: square icon vs wide banner. */
  variant?: 'square' | 'wide';
  disabled?: boolean;
}

/**
 * Upload an image to S3 and store its public URL. Replaces the old "paste an
 * image URL" text inputs — the admin picks a file, it uploads via a presigned
 * URL, and the resolved public URL is stored + previewed immediately.
 */
export const ImageUploadField = ({
  value,
  onChange,
  kind = 'asset',
  variant = 'square',
  disabled,
}: ImageUploadFieldProps) => {
  const presign = useAdminImageUpload();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Instant local preview for the just-uploaded file (S3 read may lag / CORS).
  const [localPreview, setLocalPreview] = useState<string | null>(null);

  const onFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    setError(null);
    setUploading(true);
    try {
      const p = await presign.mutateAsync({
        contentType: f.type || 'image/jpeg',
        ext: f.name.split('.').pop(),
        kind,
      });
      const key = await uploadToPresignedUrl(p, f);
      const stored = p.publicUrl ?? p.s3Key ?? key;
      setLocalPreview(URL.createObjectURL(f));
      onChange(stored);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const preview = localPreview ?? (value || null);
  const boxCls =
    variant === 'wide'
      ? 'aspect-[3/1] w-full'
      : 'h-20 w-20 shrink-0';

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-3">
        <div
          className={`${boxCls} overflow-hidden rounded-md border border-border bg-secondary`}
        >
          {preview ? (
            <img
              src={preview}
              alt=""
              className="h-full w-full object-cover"
              onError={(ev) => {
                (ev.currentTarget as HTMLImageElement).style.display = 'none';
              }}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-muted-foreground">
              <ImageIcon className="h-5 w-5" />
            </div>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <label
            className={`inline-flex h-9 w-fit cursor-pointer items-center gap-2 rounded-md border border-input bg-background px-3 text-sm font-medium hover:bg-accent ${
              disabled || uploading ? 'pointer-events-none opacity-60' : ''
            }`}
          >
            <Upload className="h-4 w-4" />
            {uploading ? 'Uploading…' : value ? 'Replace image' : 'Upload image'}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              disabled={disabled || uploading}
              onChange={onFile}
            />
          </label>
          {value && !uploading && (
            <button
              type="button"
              onClick={() => {
                setLocalPreview(null);
                onChange('');
              }}
              className="inline-flex w-fit items-center gap-1 text-xs text-destructive hover:underline"
            >
              <Trash2 className="h-3 w-3" /> Remove
            </button>
          )}
        </div>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
};
