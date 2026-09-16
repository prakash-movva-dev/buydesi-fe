import { useEffect, useState, type ChangeEvent } from 'react';
import { useMutation } from '@tanstack/react-query';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { UserPicker } from '@/components/pickers/UserPicker';
import Button from '@mui/material/Button';
import Table from '@mui/material/Table';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import LoadingButton from '@mui/lab/LoadingButton';
import { Label } from '@/components/label';
import { Iconify } from '@/components/iconify';
import { Scrollbar } from '@/components/scrollbar';
import { Dialog } from '@/components/ui/Dialog';
import { TableHeadCustom } from '@/components/table';
import { api } from '@/lib/api';
import { ApiError, UserRole } from '@/types/api';

interface Props {
  open: boolean;
  onClose: () => void;
  /** When true (seller flow), hides the seller picker and posts without sellerId. */
  forSelf?: boolean;
}

interface BulkRowResult {
  row: number;
  productId?: string;
  name?: string;
  status: 'created' | 'skipped' | 'error';
  reason?: string;
}

interface BulkUploadSummary {
  totalRows: number;
  created: number;
  skipped: number;
  failed: number;
  results: BulkRowResult[];
}

const CSV_HEADER_HINT =
  'name,description,categorySlug,unit,priceInr,stockQuantity,kind,stockThreshold,weightGrams,images';

export const BulkUploadDialog = ({ open, onClose, forSelf = false }: Props) => {
  const [sellerId, setSellerId] = useState<string | null>(null);
  const [csv, setCsv] = useState('');
  const [fileName, setFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setSellerId(null);
      setCsv('');
      setFileName(null);
      setError(null);
      upload.reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const upload = useMutation({
    mutationFn: (input: { sellerId: string | null; csv: string }) =>
      api.post<BulkUploadSummary>(
        input.sellerId
          ? `/products/bulk-upload?sellerId=${encodeURIComponent(input.sellerId)}`
          : '/products/bulk-upload',
        { csv: input.csv },
      ),
  });

  const onFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFileName(f.name);
    const text = await f.text();
    setCsv(text);
  };

  const submit = async () => {
    setError(null);
    if (!forSelf && !sellerId) {
      setError('Pick a seller first.');
      return;
    }
    if (!csv.trim()) {
      setError('Paste a CSV or upload a file.');
      return;
    }
    try {
      await upload.mutateAsync({ sellerId: forSelf ? null : sellerId, csv });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Upload failed');
    }
  };

  const summary = upload.data;

  const RESULT_HEAD = [
    { id: 'row', label: 'Row', width: 70 },
    { id: 'status', label: 'What happened', width: 140 },
    { id: 'name', label: 'Product' },
    { id: 'reason', label: 'Why', width: 260 },
  ];

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Upload products from a spreadsheet"
      description="Creates products on a seller's behalf. The first row must name the columns."
      footer={
        <>
          <Button color="inherit" variant="outlined" onClick={onClose} disabled={upload.isPending}>
            Close
          </Button>
          {!summary && (
            <LoadingButton
              variant="contained"
              loading={upload.isPending}
              onClick={submit}
              startIcon={<Iconify icon="solar:upload-bold" />}
            >
              Upload
            </LoadingButton>
          )}
        </>
      }
    >
      {!summary ? (
        <Stack spacing={2.5}>
          {error && <Alert severity="error">{error}</Alert>}

          {!forSelf && (
            <UserPicker
              label="Seller"
              required
              role={UserRole.SELLER}
              value={sellerId}
              onChange={setSellerId}
              placeholder="Whose products are these…"
            />
          )}

          <Stack spacing={1}>
            <Typography variant="subtitle2">The file</Typography>
            <Stack direction="row" spacing={2} alignItems="center">
              <Button
                component="label"
                variant="outlined"
                startIcon={<Iconify icon="solar:file-text-bold" />}
                sx={{ flexShrink: 0 }}
              >
                Choose a CSV
                <Box
                  component="input"
                  id="bulk-file"
                  type="file"
                  accept=".csv,text/csv,text/plain"
                  onChange={onFile}
                  sx={{ display: 'none' }}
                />
              </Button>
              {fileName && (
                <Typography variant="body2" noWrap sx={{ color: 'text.secondary' }}>
                  {fileName}
                </Typography>
              )}
            </Stack>
          </Stack>

          <TextField
            fullWidth
            multiline
            minRows={8}
            label="Or paste it here"
            value={csv}
            onChange={(e) => {
              setCsv(e.target.value);
              setFileName(null);
            }}
            placeholder={CSV_HEADER_HINT}
            InputLabelProps={{ shrink: true }}
            InputProps={{ sx: { typography: 'caption', fontFamily: 'monospace' } }}
            helperText="Needs name, description, categorySlug, unit, priceInr and stockQuantity. Optional: kind (standard / organic / premium, standard if left out), stockThreshold, weightGrams, images separated by pipes."
          />
        </Stack>
      ) : (
        <Stack spacing={2.5}>
          <Box
            sx={{
              display: 'grid',
              gap: 2,
              gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' },
            }}
          >
            <Tally label="Created" value={summary.created} color="success" />
            <Tally label="Skipped" value={summary.skipped} color="default" />
            <Tally label="Failed" value={summary.failed} color="error" />
          </Box>

          <Alert severity={summary.failed > 0 ? 'warning' : 'success'}>
            {summary.totalRows} row{summary.totalRows === 1 ? '' : 's'} read. Anything created
            starts as pending — approve it from the products queue.
          </Alert>

          <Scrollbar sx={{ maxHeight: 320 }}>
            <Table size="small" sx={{ minWidth: 620 }}>
              <TableHeadCustom headLabel={RESULT_HEAD} />
              <TableBody>
                {summary.results.map((r) => (
                  <TableRow key={r.row}>
                    <TableCell sx={{ color: 'text.disabled' }}>{r.row}</TableCell>
                    <TableCell>
                      <Label
                        variant="soft"
                        color={
                          (r.status === 'created' && 'success') ||
                          (r.status === 'error' && 'error') ||
                          'default'
                        }
                      >
                        {r.status}
                      </Label>
                    </TableCell>
                    <TableCell sx={{ typography: 'body2' }}>{r.name ?? '—'}</TableCell>
                    <TableCell sx={{ typography: 'caption', color: 'text.secondary' }}>
                      {r.reason ?? ''}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Scrollbar>

          <Box>
            <Button
              variant="outlined"
              onClick={() => {
                upload.reset();
                setCsv('');
                setFileName(null);
              }}
              startIcon={<Iconify icon="solar:restart-bold" />}
            >
              Upload another
            </Button>
          </Box>
        </Stack>
      )}
    </Dialog>
  );
};

// ----------------------------------------------------------------------

function Tally({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: 'success' | 'error' | 'default';
}) {
  return (
    <Box sx={{ p: 2, borderRadius: 1.5, bgcolor: 'background.neutral' }}>
      <Typography variant="h4">{value}</Typography>
      <Label variant="soft" color={color}>
        {label}
      </Label>
    </Box>
  );
}
