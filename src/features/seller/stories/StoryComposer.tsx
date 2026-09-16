import { useEffect, useState } from 'react';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Divider from '@mui/material/Divider';
import Tooltip from '@mui/material/Tooltip';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import LoadingButton from '@mui/lab/LoadingButton';

import { ApiError } from '@/types/api';
import { Iconify } from '@/components/iconify';
import { ImageUploadField } from '@/components/ImageUploadField';

import { useCreateStory, useUpdateStory } from './api';
import type { FarmerStory } from './types';

// ----------------------------------------------------------------------

const MAX_IMAGES = 6;
const TITLE_MAX = 140;
const BODY_MAX = 5000;
const BODY_MIN = 10;

type Props = {
  open: boolean;
  /** Null when writing something new. */
  editing: FarmerStory | null;
  onClose: () => void;
  onDone?: (published: boolean) => void;
};

/**
 * Where a seller writes a post.
 *
 * There is no draft state and no approval step: pressing publish puts it on
 * the storefront immediately, so the dialog says so rather than letting anyone
 * discover it afterwards.
 */
export function StoryComposer({ open, editing, onClose, onDone }: Props) {
  const isEdit = Boolean(editing);
  const createMut = useCreateStory();
  const updateMut = useUpdateStory();
  const busy = createMut.isPending || updateMut.isPending;

  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [pendingImage, setPendingImage] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setPendingImage('');
    setTitle(editing?.title ?? '');
    setBody(editing?.body ?? '');
    setImages(editing?.images ?? []);
  }, [open, editing]);

  // The uploader hands back one URL at a time; collect them into the list.
  useEffect(() => {
    if (!pendingImage) return;
    setImages((prev) =>
      prev.includes(pendingImage) || prev.length >= MAX_IMAGES
        ? prev
        : [...prev, pendingImage],
    );
    setPendingImage('');
  }, [pendingImage]);

  const submit = async () => {
    setError(null);
    const t = title.trim();
    const b = body.trim();

    if (t.length < 2) {
      setError('Give the story a title — even a few words.');
      return;
    }
    if (b.length < BODY_MIN) {
      setError('Write a little more. Readers came here for the story.');
      return;
    }

    try {
      if (editing) {
        await updateMut.mutateAsync({
          id: editing.id,
          patch: { title: t, body: b, images },
        });
      } else {
        await createMut.mutateAsync({ title: t, body: b, images });
      }
      onDone?.(!isEdit);
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not save that');
    }
  };

  return (
    <Dialog open={open} onClose={busy ? undefined : onClose} fullWidth maxWidth="md">
      <DialogTitle sx={{ pb: 2 }}>
        <Stack direction="row" spacing={1.5} alignItems="center">
          <Iconify width={24} icon="solar:pen-new-square-bold" sx={{ color: 'primary.main' }} />
          {isEdit ? 'Edit your story' : 'Write a story'}
        </Stack>
      </DialogTitle>

      <DialogContent>
        <Stack spacing={2.5} sx={{ pt: 1 }}>
          <Alert severity="info" icon={<Iconify icon="solar:bolt-bold" />}>
            {isEdit
              ? 'Your changes go live on the storefront as soon as you save. Nobody reviews them first.'
              : 'This publishes straight to the storefront — no approval, no waiting. You can edit or hide it afterwards from your list.'}
          </Alert>

          {error && <Alert severity="error">{error}</Alert>}

          <TextField
            fullWidth
            required
            autoFocus
            label="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="The monsoon came late, and the palm leaves waited"
            InputLabelProps={{ shrink: true }}
            inputProps={{ maxLength: TITLE_MAX }}
            helperText={`${title.length}/${TITLE_MAX} · what a reader sees first`}
          />

          <TextField
            fullWidth
            required
            multiline
            minRows={8}
            label="Your story"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder={
              'Write it the way you would tell it.\n\nLeave a blank line between paragraphs — the storefront keeps them.'
            }
            InputLabelProps={{ shrink: true }}
            inputProps={{ maxLength: BODY_MAX }}
            helperText={`${body.trim().length}/${BODY_MAX} · line breaks are kept exactly as you type them`}
          />

          <Divider sx={{ borderStyle: 'dashed' }}>
            <Box sx={{ typography: 'caption', color: 'text.disabled' }}>
              photos — optional
            </Box>
          </Divider>

          {images.length > 0 && (
            <Box
              sx={{
                display: 'grid',
                gap: 1.5,
                gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))',
              }}
            >
              {images.map((src, i) => (
                <Box
                  key={src}
                  sx={{
                    position: 'relative',
                    borderRadius: 1.5,
                    overflow: 'hidden',
                    aspectRatio: '1 / 1',
                    bgcolor: 'background.neutral',
                  }}
                >
                  <Box
                    component="img"
                    src={src}
                    alt=""
                    sx={{ width: 1, height: 1, objectFit: 'cover' }}
                  />
                  {i === 0 && (
                    <Box
                      sx={{
                        position: 'absolute',
                        left: 6,
                        top: 6,
                        px: 0.75,
                        py: 0.25,
                        borderRadius: 0.75,
                        bgcolor: 'primary.main',
                        color: 'primary.contrastText',
                        typography: 'caption',
                        fontWeight: 'fontWeightBold',
                      }}
                    >
                      Cover
                    </Box>
                  )}
                  <Tooltip title="Remove" placement="top" arrow>
                    <IconButton
                      size="small"
                      onClick={() => setImages((p) => p.filter((u) => u !== src))}
                      sx={{
                        position: 'absolute',
                        right: 4,
                        top: 4,
                        bgcolor: 'common.white',
                        '&:hover': { bgcolor: 'error.lighter' },
                      }}
                    >
                      <Iconify width={16} icon="solar:trash-bin-trash-bold" />
                    </IconButton>
                  </Tooltip>
                </Box>
              ))}
            </Box>
          )}

          {images.length < MAX_IMAGES ? (
            <Box>
              <Box sx={{ mb: 1, typography: 'caption', color: 'text.secondary' }}>
                The first photo becomes the cover. Up to {MAX_IMAGES}.
              </Box>
              <ImageUploadField
                value={pendingImage}
                onChange={setPendingImage}
                kind="promotion"
                variant="wide"
              />
            </Box>
          ) : (
            <Alert severity="info">
              That is {MAX_IMAGES} photos — remove one to add another.
            </Alert>
          )}
        </Stack>
      </DialogContent>

      <DialogActions>
        <Button variant="outlined" color="inherit" onClick={onClose} disabled={busy}>
          Cancel
        </Button>
        <LoadingButton variant="contained" loading={busy} onClick={submit}>
          {isEdit ? 'Save changes' : 'Publish story'}
        </LoadingButton>
      </DialogActions>
    </Dialog>
  );
}
