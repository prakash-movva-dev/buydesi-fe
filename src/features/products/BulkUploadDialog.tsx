import { useEffect, useState, type ChangeEvent } from 'react';
import { useMutation } from '@tanstack/react-query';
import { CheckCircle2, FileUp, Upload, XCircle } from 'lucide-react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { UserPicker } from '@/components/pickers/UserPicker';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { StatCard } from '@/components/ui/StatCard';
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
  'name,description,categorySlug,unit,standardPriceInr,stockQuantity,organicPriceInr,premiumPriceInr,stockThreshold,weightGrams,images';

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

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Bulk product upload"
      description="Create products in bulk on a seller's behalf. The CSV must include a header row matching the columns below."
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={upload.isPending}>
            Close
          </Button>
          {!summary && (
            <Button onClick={submit} disabled={upload.isPending}>
              <Upload className="h-4 w-4" />
              {upload.isPending ? 'Uploading…' : 'Upload'}
            </Button>
          )}
        </>
      }
      className="max-w-3xl"
    >
      <div className="space-y-4">
        {!summary && (
          <Stack spacing={2.5}>
            {error && <Alert severity="error">{error}</Alert>}
            {!forSelf && (
              <Stack spacing={1}>
                <Typography variant="subtitle2">Seller *</Typography>
                <UserPicker
                  role={UserRole.SELLER}
                  value={sellerId}
                  onChange={setSellerId}
                  placeholder="Pick the seller to upload for…"
                />
                <Typography variant="caption" color="text.secondary">
                  The seller must be approved (status=APPROVED).
                </Typography>
              </Stack>
            )}

            <Stack spacing={1}>
              <Typography variant="subtitle2">CSV file</Typography>
              <div className="flex items-center gap-3">
                <label className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-md border border-input bg-background px-3 text-sm font-medium hover:bg-accent">
                  <FileUp className="h-4 w-4" />
                  Choose file
                  <input
                    id="bulk-file"
                    type="file"
                    accept=".csv,text/csv,text/plain"
                    onChange={onFile}
                    className="hidden"
                  />
                </label>
                {fileName && (
                  <span className="truncate text-sm text-muted-foreground">{fileName}</span>
                )}
              </div>
            </Stack>

            <TextField
              fullWidth
              multiline
              minRows={8}
              label="Or paste CSV content"
              value={csv}
              onChange={(e) => {
                setCsv(e.target.value);
                setFileName(null);
              }}
              className="font-mono text-xs"
              placeholder={CSV_HEADER_HINT}
              InputLabelProps={{ shrink: true }}
              helperText="Required columns: name, description, categorySlug, unit, standardPriceInr, stockQuantity. Optional: organicPriceInr, premiumPriceInr, stockThreshold, weightGrams, images (pipe-separated URLs)."
            />
          </Stack>
        )}

        {summary && (
          <div className="space-y-3">
            <Box
              sx={{
                display: 'grid',
                gap: 2,
                gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' },
              }}
            >
              <StatCard label="Created" value={summary.created} tone="success" />
              <StatCard label="Skipped" value={summary.skipped} tone="default" />
              <StatCard label="Failed" value={summary.failed} tone="destructive" />
            </Box>
            <p className="text-sm text-muted-foreground">
              Processed {summary.totalRows} row(s). Created products land in PENDING — review
              them from the Products approval queue.
            </p>
            <div className="max-h-72 overflow-y-auto rounded-md border border-border">
              <table className="w-full text-sm">
                <thead className="bg-secondary/40 text-xs uppercase">
                  <tr>
                    <th className="p-2 text-left">Row</th>
                    <th className="p-2 text-left">Status</th>
                    <th className="p-2 text-left">Name</th>
                    <th className="p-2 text-left">Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.results.map((r) => (
                    <tr key={r.row} className="border-t border-border">
                      <td className="p-2">{r.row}</td>
                      <td className="p-2">
                        {r.status === 'created' && (
                          <Badge variant="success">
                            <CheckCircle2 className="mr-1 inline h-3 w-3" />
                            created
                          </Badge>
                        )}
                        {r.status === 'skipped' && <Badge variant="muted">skipped</Badge>}
                        {r.status === 'error' && (
                          <Badge variant="destructive">
                            <XCircle className="mr-1 inline h-3 w-3" />
                            error
                          </Badge>
                        )}
                      </td>
                      <td className="p-2">{r.name ?? '—'}</td>
                      <td className="p-2 text-xs text-muted-foreground">{r.reason ?? ''}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  upload.reset();
                  setCsv('');
                  setFileName(null);
                }}
              >
                Upload another
              </Button>
            </div>
          </div>
        )}
      </div>
    </Dialog>
  );
};
