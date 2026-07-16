import { useEffect, useState, type ChangeEvent } from 'react';
import { BadgeCheck, FileUp, Plus, Trash2 } from 'lucide-react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Alert from '@mui/material/Alert';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/Card';
import { PageHeader } from '@/components/ui/PageHeader';
import { Skeleton } from '@/components/ui/Skeleton';
import {
  useSellerMe,
  useStorefrontAssetUploadUrl,
  useUpdateStorefront,
} from '@/features/seller/profile/api';
import { uploadToPresignedUrl } from '@/lib/s3-upload';
import { ApiError } from '@/types/api';

export const SellerStorefrontPage = () => {
  const { data: me, isLoading } = useSellerMe();
  const update = useUpdateStorefront();
  const assetUrl = useStorefrontAssetUploadUrl();

  const [farmName, setFarmName] = useState('');
  const [banner, setBanner] = useState('');
  const [profilePhoto, setProfilePhoto] = useState('');
  const [description, setDescription] = useState('');
  const [practices, setPractices] = useState<string[]>([]);
  const [practiceDraft, setPracticeDraft] = useState('');
  const [certifications, setCertifications] = useState<string[]>([]);
  const [certDraft, setCertDraft] = useState('');

  // Bank details — only writable section, never echoed back from server.
  const [showBank, setShowBank] = useState(false);
  const [accountNumber, setAccountNumber] = useState('');
  const [ifsc, setIfsc] = useState('');
  const [accountHolderName, setAccountHolderName] = useState('');
  const [bankName, setBankName] = useState('');

  const [uploading, setUploading] = useState<'banner' | 'profile' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<Date | null>(null);

  useEffect(() => {
    if (!me) return;
    setFarmName(me.farmName);
    setBanner(me.storefront.banner ?? '');
    setProfilePhoto(me.storefront.profilePhoto ?? '');
    setDescription(me.storefront.description ?? '');
    setPractices(me.storefront.practices);
    setCertifications(me.storefront.certifications);
  }, [me]);

  const uploadAsset = async (kind: 'banner' | 'profile', file: File) => {
    setUploading(kind);
    setError(null);
    try {
      const presigned = await assetUrl.mutateAsync({
        kind,
        contentType: file.type || 'image/jpeg',
        ext: file.name.split('.').pop(),
      });
      const key = await uploadToPresignedUrl(presigned, file);
      if (kind === 'banner') setBanner(key);
      else setProfilePhoto(key);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Upload failed');
    } finally {
      setUploading(null);
    }
  };

  const onBannerFile = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (f) void uploadAsset('banner', f);
  };
  const onPhotoFile = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (f) void uploadAsset('profile', f);
  };

  const addPractice = () => {
    const v = practiceDraft.trim();
    if (!v) return;
    setPractices((prev) => [...prev, v]);
    setPracticeDraft('');
  };
  const addCertification = () => {
    const v = certDraft.trim();
    if (!v) return;
    setCertifications((prev) => [...prev, v]);
    setCertDraft('');
  };

  const submit = async () => {
    if (!me) return;
    setError(null);
    try {
      const patch: Parameters<typeof update.mutateAsync>[0]['patch'] = {
        farmName: farmName.trim(),
        banner: banner || undefined,
        profilePhoto: profilePhoto || undefined,
        description: description.trim() || undefined,
        practices,
        certifications,
      };
      if (showBank && accountNumber && ifsc && accountHolderName && bankName) {
        patch.bankDetails = {
          accountNumber: accountNumber.trim(),
          ifsc: ifsc.trim().toUpperCase(),
          accountHolderName: accountHolderName.trim(),
          bankName: bankName.trim(),
        };
      }
      await update.mutateAsync({ id: me.id, patch });
      setSavedAt(new Date());
      setShowBank(false);
      setAccountNumber('');
      setIfsc('');
      setAccountHolderName('');
      setBankName('');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Save failed');
    }
  };

  if (isLoading || !me) return <Skeleton className="h-96 w-full" />;

  return (
    <Stack spacing={3} sx={{ mx: 'auto', maxWidth: 768, width: '100%' }}>
      <PageHeader
        title="Storefront"
        description="How buyers see your farm. Bank details are encrypted at rest — only the last 4 digits of the account are echoed back."
        action={
          me.verifiedBadge ? (
            <Badge variant="info">
              <BadgeCheck className="mr-1 inline h-3 w-3" />
              Verified by Buy Desi
            </Badge>
          ) : undefined
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>Basics</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <TextField
            fullWidth
            label="Farm / business name *"
            value={farmName}
            onChange={(e) => setFarmName(e.target.value)}
            InputLabelProps={{ shrink: true }}
            inputProps={{ maxLength: 200 }}
          />
          <TextField
            fullWidth
            multiline
            minRows={4}
            label="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Tell buyers what makes your farm special — practices, location, history."
            InputLabelProps={{ shrink: true }}
            inputProps={{ maxLength: 5000 }}
          />
        </CardContent>
      </Card>

      <Box
        sx={{
          display: 'grid',
          gap: 2,
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(2,1fr)' },
        }}
      >
        <AssetCard
          title="Banner"
          description="Wide hero image at the top of your storefront."
          src={banner}
          onClear={() => setBanner('')}
          uploading={uploading === 'banner'}
          onFile={onBannerFile}
        />
        <AssetCard
          title="Profile photo"
          description="Square logo / face that appears next to your name."
          src={profilePhoto}
          onClear={() => setProfilePhoto('')}
          uploading={uploading === 'profile'}
          onFile={onPhotoFile}
        />
      </Box>

      <Card>
        <CardHeader>
          <CardTitle>Practices</CardTitle>
          <CardDescription>
            E.g. "Organic farming", "Free range", "Chemical-free". Free-text chips — buyers
            see them as filters.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-1.5">
            {practices.map((p, i) => (
              <Badge key={`${p}-${i}`} variant="muted">
                {p}
                <button
                  type="button"
                  onClick={() => setPractices((prev) => prev.filter((_, idx) => idx !== i))}
                  className="ml-1.5"
                >
                  ×
                </button>
              </Badge>
            ))}
            {practices.length === 0 && (
              <span className="text-sm text-muted-foreground">No practices listed yet.</span>
            )}
          </div>
          <div className="flex gap-2">
            <TextField
              fullWidth
              value={practiceDraft}
              onChange={(e) => setPracticeDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addPractice();
                }
              }}
              placeholder="Add a practice and press Enter"
              inputProps={{ maxLength: 200 }}
            />
            <Button variant="outline" onClick={addPractice}>
              <Plus className="h-4 w-4" />
              Add
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Certifications</CardTitle>
          <CardDescription>E.g. "FSSAI", "USDA Organic", "GI Tag".</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-1.5">
            {certifications.map((c, i) => (
              <Badge key={`${c}-${i}`} variant="muted">
                {c}
                <button
                  type="button"
                  onClick={() => setCertifications((prev) => prev.filter((_, idx) => idx !== i))}
                  className="ml-1.5"
                >
                  ×
                </button>
              </Badge>
            ))}
            {certifications.length === 0 && (
              <span className="text-sm text-muted-foreground">None listed.</span>
            )}
          </div>
          <div className="flex gap-2">
            <TextField
              fullWidth
              value={certDraft}
              onChange={(e) => setCertDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addCertification();
                }
              }}
              placeholder="Add a certification and press Enter"
              inputProps={{ maxLength: 200 }}
            />
            <Button variant="outline" onClick={addCertification}>
              <Plus className="h-4 w-4" />
              Add
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Bank details (for payouts)</CardTitle>
          <CardDescription>
            Encrypted at rest with AES-256-GCM. We only ever show the last 4 digits back.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {me.hasBankDetails && !showBank ? (
            <div className="flex items-center justify-between text-sm">
              <span>Account ending •••• {me.bankAccountLast4 ?? '----'}</span>
              <Button variant="outline" size="sm" onClick={() => setShowBank(true)}>
                Update bank details
              </Button>
            </div>
          ) : !me.hasBankDetails && !showBank ? (
            <Button onClick={() => setShowBank(true)}>
              <Plus className="h-4 w-4" />
              Add bank details
            </Button>
          ) : (
            <div className="space-y-3">
              <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { sm: 'repeat(2,1fr)' } }}>
                <TextField
                  fullWidth
                  label="Account number *"
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                  inputProps={{ pattern: '\\d{9,18}' }}
                />
                <TextField
                  fullWidth
                  label="IFSC *"
                  value={ifsc}
                  onChange={(e) => setIfsc(e.target.value.toUpperCase())}
                  InputLabelProps={{ shrink: true }}
                  inputProps={{ pattern: '[A-Z]{4}0[A-Z0-9]{6}', maxLength: 11 }}
                />
                <TextField
                  fullWidth
                  label="Account holder name *"
                  value={accountHolderName}
                  onChange={(e) => setAccountHolderName(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                />
                <TextField
                  fullWidth
                  label="Bank name *"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                />
              </Box>
              <Button variant="ghost" size="sm" onClick={() => setShowBank(false)}>
                Hide
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {error && <Alert severity="error">{error}</Alert>}

      <div className="flex items-center justify-end gap-3">
        {savedAt && (
          <span className="text-sm text-emerald-700">
            Saved {savedAt.toLocaleTimeString('en-IN')}
          </span>
        )}
        <Button onClick={submit} disabled={update.isPending}>
          {update.isPending ? 'Saving…' : 'Save changes'}
        </Button>
      </div>
    </Stack>
  );
};

const AssetCard = ({
  title,
  description,
  src,
  onClear,
  uploading,
  onFile,
}: {
  title: string;
  description: string;
  src: string;
  onClear: () => void;
  uploading: boolean;
  onFile: (e: ChangeEvent<HTMLInputElement>) => void;
}) => (
  <Card>
    <CardHeader>
      <CardTitle className="text-base">{title}</CardTitle>
      <CardDescription>{description}</CardDescription>
    </CardHeader>
    <CardContent className="space-y-3">
      {src ? (
        <div className="relative overflow-hidden rounded-md border border-border bg-secondary">
          <img src={src} alt={title} className="w-full object-cover" />
          <button
            type="button"
            onClick={onClear}
            className="absolute right-2 top-2 rounded-md bg-black/60 p-1 text-white"
            title="Remove"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : (
        <div className="flex h-32 items-center justify-center rounded-md border border-dashed border-border bg-secondary/30 text-xs text-muted-foreground">
          No image yet
        </div>
      )}
      <label className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-md border border-input bg-background px-3 text-sm font-medium hover:bg-accent">
        <FileUp className="h-4 w-4" />
        {uploading ? 'Uploading…' : src ? 'Replace' : 'Upload'}
        <input
          type="file"
          accept="image/*"
          onChange={onFile}
          disabled={uploading}
          className="hidden"
        />
      </label>
    </CardContent>
  </Card>
);
