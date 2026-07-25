import { useState, type ChangeEvent, type SyntheticEvent } from 'react';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import FormHelperText from '@mui/material/FormHelperText';
import CircularProgress from '@mui/material/CircularProgress';
import { alpha } from '@mui/material/styles';

import { Iconify } from './iconify';
import { uploadToPresignedUrl } from '@/lib/s3-upload';
import { ApiError } from '@/types/api';
import { useAdminImageUpload } from '@/features/uploads/api';

// ----------------------------------------------------------------------

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
 * Upload an image to S3 and store its public URL — the admin picks a file, it
 * uploads via a presigned URL, and the resolved public URL is stored and
 * previewed immediately. The whole box is the drop target / file picker.
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
  const isWide = variant === 'wide';
  const isDisabled = disabled || uploading;

  return (
    <Stack spacing={1} sx={{ width: isWide ? 1 : 'auto' }}>
      <Box sx={{ position: 'relative', width: isWide ? 1 : 'fit-content' }}>
        <Box
          component="label"
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            overflow: 'hidden',
            borderRadius: 1.5,
            cursor: isDisabled ? 'default' : 'pointer',
            transition: (theme) => theme.transitions.create(['opacity', 'border-color']),
            border: (theme) => `1px dashed ${alpha(theme.palette.grey[500], 0.24)}`,
            bgcolor: (theme) => alpha(theme.palette.grey[500], 0.08),
            ...(isWide ? { width: 1, aspectRatio: '3 / 1' } : { width: 96, height: 96 }),
            ...(isDisabled
              ? { opacity: 0.64 }
              : { '&:hover': { opacity: 0.72, borderColor: 'primary.main' } }),
          }}
        >
          {preview ? (
            <Box
              component="img"
              src={preview}
              alt=""
              sx={{ width: 1, height: 1, objectFit: 'cover' }}
              onError={(ev: SyntheticEvent<HTMLImageElement>) => {
                ev.currentTarget.style.display = 'none';
              }}
            />
          ) : (
            <Stack spacing={0.5} alignItems="center" sx={{ px: 1, color: 'text.disabled' }}>
              <Iconify icon="eva:cloud-upload-fill" width={isWide ? 32 : 24} />
              <Typography variant="caption" sx={{ textAlign: 'center' }}>
                Upload image
              </Typography>
            </Stack>
          )}

          <input type="file" accept="image/*" hidden disabled={isDisabled} onChange={onFile} />

          {uploading && (
            <Stack
              alignItems="center"
              justifyContent="center"
              sx={{
                inset: 0,
                position: 'absolute',
                bgcolor: (theme) => alpha(theme.palette.grey[900], 0.48),
              }}
            >
              <CircularProgress size={isWide ? 32 : 24} sx={{ color: 'common.white' }} />
            </Stack>
          )}
        </Box>

        {value && !uploading && (
          <IconButton
            size="small"
            onClick={() => {
              setLocalPreview(null);
              onChange('');
            }}
            sx={{
              top: 4,
              right: 4,
              position: 'absolute',
              color: 'common.white',
              bgcolor: (theme) => alpha(theme.palette.grey[900], 0.48),
              '&:hover': { bgcolor: (theme) => alpha(theme.palette.grey[900], 0.72) },
            }}
          >
            <Iconify icon="mingcute:close-line" width={16} />
          </IconButton>
        )}
      </Box>

      {error && <FormHelperText error>{error}</FormHelperText>}
    </Stack>
  );
};
