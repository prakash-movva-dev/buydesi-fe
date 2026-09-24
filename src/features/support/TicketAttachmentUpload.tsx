import { useRef, useState, type ChangeEvent } from 'react';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Tooltip from '@mui/material/Tooltip';
import IconButton from '@mui/material/IconButton';
import LinearProgress from '@mui/material/LinearProgress';

import { varAlpha } from '@/theme/styles';
import { ApiError } from '@/types/api';
import { uploadToPresignedUrl } from '@/lib/s3-upload';

import { Iconify } from '@/components/iconify';

import { useAppendTicketAttachment, useTicketAttachmentUploadUrl } from './api';

// ----------------------------------------------------------------------

/** The API caps a ticket at 10 attachments. */
export const MAX_ATTACHMENTS = 10;

/**
 * Per file. Nothing enforces this server-side, so it is a courtesy: a 40MB
 * phone photo over a rural connection fails slowly and confusingly, and it is
 * kinder to say no immediately.
 */
const MAX_FILE_BYTES = 10 * 1024 * 1024;

const ACCEPT = 'image/*,application/pdf';

const EXT_ICON: Record<string, string> = {
  pdf: 'solar:file-text-bold',
  png: 'solar:gallery-bold',
  jpg: 'solar:gallery-bold',
  jpeg: 'solar:gallery-bold',
  webp: 'solar:gallery-bold',
  heic: 'solar:gallery-bold',
};

export const extOf = (name: string): string =>
  name.includes('.') ? name.split('.').pop()!.toLowerCase() : '';

export const iconForFile = (nameOrKey: string): string =>
  EXT_ICON[extOf(nameOrKey)] ?? 'solar:paperclip-bold';

const prettySize = (bytes: number): string =>
  bytes >= 1024 * 1024
    ? `${(bytes / (1024 * 1024)).toFixed(1)} MB`
    : `${Math.max(1, Math.round(bytes / 1024))} KB`;

// ----------------------------------------------------------------------

/** One file the user has chosen but not yet sent. */
export interface PendingFile {
  id: string;
  file: File;
}

export const makePending = (file: File): PendingFile => ({
  id: `${file.name}-${file.size}-${file.lastModified}-${Math.random().toString(36).slice(2, 7)}`,
  file,
});

/**
 * Validate a browser FileList against what is already queued or stored.
 * Returns the files worth keeping plus a message for anything refused, so the
 * caller can say why rather than silently dropping them.
 */
export const screenFiles = (
  list: FileList | null,
  alreadyHave: number,
): { accepted: PendingFile[]; problem: string | null } => {
  const files = [...(list ?? [])];
  if (files.length === 0) return { accepted: [], problem: null };

  const tooBig = files.filter((f) => f.size > MAX_FILE_BYTES);
  const fits = files.filter((f) => f.size <= MAX_FILE_BYTES);
  const room = Math.max(0, MAX_ATTACHMENTS - alreadyHave);
  const accepted = fits.slice(0, room).map(makePending);

  const problems: string[] = [];
  if (tooBig.length) {
    problems.push(
      `${tooBig.map((f) => f.name).join(', ')} — over ${prettySize(MAX_FILE_BYTES)}`,
    );
  }
  if (fits.length > room) {
    problems.push(`only ${MAX_ATTACHMENTS} files per ticket, so ${fits.length - room} skipped`);
  }
  return { accepted, problem: problems.length ? problems.join('. ') : null };
};

/**
 * Uploads each pending file to a ticket and records it.
 *
 * Returns the names that failed rather than throwing on the first one: a
 * half-attached ticket is still a raised ticket, and the person needs to know
 * which file to try again, not that "something went wrong".
 */
export const uploadPendingFiles = async (
  ticketId: string,
  pending: PendingFile[],
  presign: (input: {
    ticketId: string;
    contentType: string;
    ext?: string;
  }) => Promise<{ url: string; headers?: Record<string, string>; s3Key?: string; key?: string }>,
  append: (input: { ticketId: string; s3Key: string }) => Promise<unknown>,
): Promise<{ failed: string[] }> => {
  const failed: string[] = [];

  for (const item of pending) {
    try {
      const signed = await presign({
        ticketId,
        contentType: item.file.type || 'application/octet-stream',
        ext: extOf(item.file.name) || undefined,
      });
      const key = await uploadToPresignedUrl(signed, item.file);
      if (!key) throw new Error('No key returned');
      await append({ ticketId, s3Key: key });
    } catch {
      failed.push(item.file.name);
    }
  }

  return { failed };
};

// ----------------------------------------------------------------------

type PickerProps = {
  pending: PendingFile[];
  onChange: (next: PendingFile[]) => void;
  /** Files already stored on the ticket, so the cap counts them too. */
  existingCount?: number;
  disabled?: boolean;
};

/**
 * Choose files now, send them later — used when raising a ticket, where the
 * ticket does not exist yet and so has no id to upload against.
 */
export function TicketAttachmentPicker({
  pending,
  onChange,
  existingCount = 0,
  disabled,
}: PickerProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [problem, setProblem] = useState<string | null>(null);

  const total = pending.length + existingCount;
  const full = total >= MAX_ATTACHMENTS;

  const onPick = (e: ChangeEvent<HTMLInputElement>) => {
    const { accepted, problem: why } = screenFiles(e.target.files, total);
    setProblem(why);
    if (accepted.length) onChange([...pending, ...accepted]);
    // Let the same file be chosen again after a removal.
    e.target.value = '';
  };

  return (
    <Stack spacing={1.5}>
      <input
        ref={inputRef}
        type="file"
        hidden
        multiple
        accept={ACCEPT}
        onChange={onPick}
        disabled={disabled || full}
      />

      <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap" useFlexGap>
        <Button
          variant="outlined"
          color="inherit"
          disabled={disabled || full}
          onClick={() => inputRef.current?.click()}
          startIcon={<Iconify icon="solar:paperclip-bold" />}
        >
          Attach files
        </Button>
        <Box sx={{ typography: 'caption', color: 'text.disabled' }}>
          Photos or PDFs, up to {prettySize(MAX_FILE_BYTES)} each · {total} of {MAX_ATTACHMENTS}
        </Box>
      </Stack>

      {problem && (
        <Alert severity="warning" onClose={() => setProblem(null)}>
          {problem}
        </Alert>
      )}

      {pending.length > 0 && (
        <Stack spacing={1}>
          {pending.map((item) => (
            <Stack
              key={item.id}
              direction="row"
              spacing={1.5}
              alignItems="center"
              sx={{
                p: 1,
                pl: 1.5,
                borderRadius: 1,
                bgcolor: 'background.neutral',
              }}
            >
              <Iconify
                width={20}
                icon={iconForFile(item.file.name)}
                sx={{ flexShrink: 0, color: 'text.secondary' }}
              />
              <Box
                sx={{
                  flexGrow: 1,
                  minWidth: 0,
                  typography: 'body2',
                  overflow: 'hidden',
                  whiteSpace: 'nowrap',
                  textOverflow: 'ellipsis',
                }}
              >
                {item.file.name}
              </Box>
              <Box sx={{ flexShrink: 0, typography: 'caption', color: 'text.disabled' }}>
                {prettySize(item.file.size)}
              </Box>
              <Tooltip title="Remove" placement="top" arrow>
                <IconButton
                  size="small"
                  disabled={disabled}
                  onClick={() => onChange(pending.filter((p) => p.id !== item.id))}
                >
                  <Iconify width={16} icon="mingcute:close-line" />
                </IconButton>
              </Tooltip>
            </Stack>
          ))}
        </Stack>
      )}
    </Stack>
  );
}

// ----------------------------------------------------------------------

type UploaderProps = {
  ticketId: string;
  /** Files already on the ticket, so the cap is honest. */
  existingCount: number;
  disabled?: boolean;
  onDone?: (result: { added: number; failed: string[] }) => void;
};

/**
 * Pick and send in one step — used on a ticket that already exists, where the
 * files can go straight up.
 */
export function TicketAttachmentUploader({
  ticketId,
  existingCount,
  disabled,
  onDone,
}: UploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const presign = useTicketAttachmentUploadUrl();
  const append = useAppendTicketAttachment();

  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<{ severity: 'warning' | 'error'; text: string } | null>(null);

  const full = existingCount >= MAX_ATTACHMENTS;

  const onPick = async (e: ChangeEvent<HTMLInputElement>) => {
    const { accepted, problem } = screenFiles(e.target.files, existingCount);
    e.target.value = '';
    if (problem) setNote({ severity: 'warning', text: problem });
    if (accepted.length === 0) return;

    setBusy(true);
    try {
      const { failed } = await uploadPendingFiles(
        ticketId,
        accepted,
        presign.mutateAsync,
        append.mutateAsync,
      );
      if (failed.length) {
        setNote({
          severity: 'error',
          text: `Could not attach ${failed.join(', ')}. Try again — nothing else was lost.`,
        });
      }
      onDone?.({ added: accepted.length - failed.length, failed });
    } catch (err) {
      setNote({
        severity: 'error',
        text: err instanceof ApiError ? err.message : 'Upload failed',
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Stack spacing={1.5}>
      <input
        ref={inputRef}
        type="file"
        hidden
        multiple
        accept={ACCEPT}
        onChange={onPick}
        disabled={disabled || busy || full}
      />

      <Box
        onClick={() => !busy && !full && !disabled && inputRef.current?.click()}
        sx={{
          p: 2.5,
          borderRadius: 1.5,
          textAlign: 'center',
          cursor: busy || full || disabled ? 'default' : 'pointer',
          border: (theme) =>
            `dashed 1px ${varAlpha(theme.vars.palette.grey['500Channel'], 0.32)}`,
          bgcolor: (theme) => varAlpha(theme.vars.palette.grey['500Channel'], 0.04),
          transition: (theme) => theme.transitions.create(['border-color', 'background-color']),
          ...(!busy &&
            !full &&
            !disabled && {
              '&:hover': {
                borderColor: 'primary.main',
                bgcolor: (theme) => varAlpha(theme.vars.palette.primary.mainChannel, 0.04),
              },
            }),
        }}
      >
        <Iconify
          width={28}
          icon={full ? 'solar:folder-check-bold-duotone' : 'solar:cloud-upload-bold-duotone'}
          sx={{ color: 'text.disabled' }}
        />
        <Box sx={{ mt: 0.5, typography: 'subtitle2' }}>
          {full
            ? `All ${MAX_ATTACHMENTS} slots used`
            : busy
              ? 'Uploading…'
              : 'Add a photo or PDF'}
        </Box>
        {!full && (
          <Box sx={{ typography: 'caption', color: 'text.disabled' }}>
            Up to {prettySize(MAX_FILE_BYTES)} each · {existingCount} of {MAX_ATTACHMENTS} used
          </Box>
        )}
      </Box>

      {busy && <LinearProgress />}

      {note && (
        <Alert severity={note.severity} onClose={() => setNote(null)}>
          {note.text}
        </Alert>
      )}
    </Stack>
  );
}
