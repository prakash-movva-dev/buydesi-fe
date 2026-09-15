import { useState, type ChangeEvent } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';
import { alpha } from '@mui/material/styles';

import { toast } from '@/components/snackbar';
import { Iconify } from '@/components/iconify';

import { ApiError } from '@/types/api';
import { uploadToPresignedUrl } from '@/lib/s3-upload';
import { useStorefrontAssetUploadUrl, useUpdateStorefront } from './api';

// ----------------------------------------------------------------------

const MAX_BYTES = 3 * 1024 * 1024;

const fData = (bytes: number) => `${(bytes / 1024 / 1024).toFixed(1)} MB`;

type Props = {
  sellerId?: string;
  photoUrl?: string;
  name?: string;
};

/**
 * The circular avatar uploader from Minimal's account page. The whole disc is
 * the file picker, and the photo it writes is the seller's storefront profile
 * photo — the same image buyers see, so there is only ever one to keep current.
 */
export function AccountAvatarCard({ sellerId, photoUrl, name }: Props) {
  const presign = useStorefrontAssetUploadUrl();
  const updateStorefront = useUpdateStorefront();

  const [uploading, setUploading] = useState(false);
  // S3 reads can lag the write, so the just-picked file previews locally.
  const [localPreview, setLocalPreview] = useState<string | null>(null);

  const onFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    if (file.size > MAX_BYTES) {
      toast.error(`That image is too large — keep it under ${fData(MAX_BYTES)}`);
      return;
    }
    if (!sellerId) {
      toast.error('Finish onboarding before adding a photo');
      return;
    }

    setUploading(true);
    try {
      const presigned = await presign.mutateAsync({
        kind: 'profile',
        contentType: file.type || 'image/jpeg',
        ext: file.name.split('.').pop(),
      });
      const key = await uploadToPresignedUrl(presigned, file);
      const stored = presigned.publicUrl ?? presigned.s3Key ?? key;

      setLocalPreview(URL.createObjectURL(file));
      await updateStorefront.mutateAsync({ id: sellerId, patch: { profilePhoto: stored } });
      toast.success('Photo updated');
    } catch (err) {
      setLocalPreview(null);
      toast.error(err instanceof ApiError ? err.message : 'Could not upload the photo');
    } finally {
      setUploading(false);
    }
  };

  const preview = localPreview ?? photoUrl ?? null;
  const initial = name?.trim().charAt(0).toUpperCase() ?? '?';

  return (
    <Card sx={{ pt: 10, pb: 5, px: 3, textAlign: 'center', height: 1 }}>
      <Box
        component="label"
        sx={{
          mx: 'auto',
          width: 144,
          height: 144,
          cursor: uploading ? 'default' : 'pointer',
          display: 'flex',
          overflow: 'hidden',
          borderRadius: '50%',
          alignItems: 'center',
          position: 'relative',
          justifyContent: 'center',
          p: 1,
          border: (theme) => `1px dashed ${alpha(theme.palette.grey[500], 0.2)}`,
        }}
      >
        <Box
          sx={{
            width: 1,
            height: 1,
            display: 'flex',
            overflow: 'hidden',
            borderRadius: '50%',
            alignItems: 'center',
            position: 'relative',
            justifyContent: 'center',
            bgcolor: (theme) => alpha(theme.palette.grey[500], 0.08),
            '&:hover .upload-overlay': { opacity: 1 },
          }}
        >
          {preview ? (
            <Box
              component="img"
              src={preview}
              alt=""
              sx={{ width: 1, height: 1, objectFit: 'cover' }}
            />
          ) : (
            <Typography variant="h2" sx={{ color: 'text.disabled' }}>
              {initial}
            </Typography>
          )}

          <Stack
            className="upload-overlay"
            spacing={0.5}
            alignItems="center"
            justifyContent="center"
            sx={{
              inset: 0,
              opacity: 0,
              position: 'absolute',
              color: 'common.white',
              transition: (theme) => theme.transitions.create('opacity'),
              bgcolor: (theme) => alpha(theme.palette.grey[900], 0.64),
            }}
          >
            <Iconify icon="solar:camera-add-bold" width={26} />
            <Box component="span" sx={{ typography: 'caption' }}>
              Update photo
            </Box>
          </Stack>

          {uploading && (
            <Stack
              alignItems="center"
              justifyContent="center"
              sx={{
                inset: 0,
                position: 'absolute',
                bgcolor: (theme) => alpha(theme.palette.grey[900], 0.64),
              }}
            >
              <CircularProgress size={28} sx={{ color: 'common.white' }} />
            </Stack>
          )}
        </Box>

        <input type="file" accept="image/*" hidden disabled={uploading} onChange={onFile} />
      </Box>

      <Typography
        variant="caption"
        sx={{ mt: 3, mx: 'auto', display: 'block', textAlign: 'center', color: 'text.disabled' }}
      >
        Allowed *.jpeg, *.jpg, *.png, *.gif
        <br /> max size of {fData(MAX_BYTES)}
      </Typography>
    </Card>
  );
}
