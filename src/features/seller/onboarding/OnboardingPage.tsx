import { useState, type ChangeEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  FileUp,
  Sprout,
  Trash2,
} from 'lucide-react';
import { CategoryPicker } from '@/components/pickers/CategoryPicker';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Select } from '@/components/ui/Select';
import { uploadToPresignedUrl } from '@/lib/s3-upload';
import { ApiError } from '@/types/api';
import {
  useKycUploadUrl,
  useSellerMe,
  useSellerRegister,
} from '@/features/seller/profile/api';
import type { KycDocument } from '@/features/sellers/types';

// Local doc carries the full KYC shape for display; only type+s3Key are submitted.
type Doc = KycDocument & { fileName?: string };

const DOC_TYPES = [
  { value: 'pan', label: 'PAN' },
  { value: 'aadhaar', label: 'Aadhaar' },
  { value: 'fssai', label: 'FSSAI' },
  { value: 'gst', label: 'GST' },
  { value: 'other', label: 'Other' },
] as const;

export const SellerOnboardingPage = () => {
  const navigate = useNavigate();
  const { data: profile } = useSellerMe();
  const register = useSellerRegister();
  const kycUrl = useKycUploadUrl();

  const isResubmit = profile?.status === 'INFO_REQUESTED' || profile?.status === 'REJECTED';

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [farmName, setFarmName] = useState(profile?.farmName ?? '');
  const [line1, setLine1] = useState(profile?.address.line1 ?? '');
  const [line2, setLine2] = useState(profile?.address.line2 ?? '');
  const [city, setCity] = useState(profile?.address.city ?? '');
  const [state, setState] = useState(profile?.address.state ?? '');
  const [pincode, setPincode] = useState(profile?.pincode ?? '');
  const [categoryIds, setCategoryIds] = useState<string[]>(profile?.categoryIds ?? []);
  const [docs, setDocs] = useState<Doc[]>(
    profile?.kycDocuments.map((d) => ({ ...d, fileName: d.s3Key.split('/').pop() })) ?? [],
  );
  const [error, setError] = useState<string | null>(null);

  const [pendingType, setPendingType] = useState<(typeof DOC_TYPES)[number]['value']>('pan');
  const [uploading, setUploading] = useState(false);

  const onFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = ''; // allow re-select
    if (!f) return;
    setError(null);
    setUploading(true);
    try {
      const presigned = await kycUrl.mutateAsync({
        type: pendingType,
        contentType: f.type || 'application/octet-stream',
        ext: f.name.split('.').pop(),
      });
      const key = await uploadToPresignedUrl(presigned, f);
      setDocs((prev) => [
        ...prev,
        {
          type: pendingType,
          s3Key: key,
          status: 'pending',
          uploadedAt: new Date().toISOString(),
          fileName: f.name,
        },
      ]);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : (err as Error).message);
    } finally {
      setUploading(false);
    }
  };

  const removeDoc = (idx: number) => setDocs((prev) => prev.filter((_, i) => i !== idx));

  const submit = async () => {
    setError(null);
    try {
      await register.mutateAsync({
        farmName: farmName.trim(),
        address: {
          line1: line1.trim(),
          line2: line2.trim() || undefined,
          city: city.trim(),
          state: state.trim(),
          pincode: pincode.trim(),
        },
        pincode: pincode.trim(),
        categoryIds,
        // Only type + s3Key are accepted; the server stamps status/uploadedAt.
        kycDocuments: docs.map(({ type, s3Key }) => ({ type, s3Key })),
      });
      setStep(3);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Submission failed');
    }
  };

  const canAdvanceStep1 =
    farmName.trim().length >= 2 &&
    line1.trim().length >= 2 &&
    city.trim() &&
    state.trim() &&
    /^\d{6}$/.test(pincode);
  const canAdvanceStep2 = categoryIds.length > 0 && docs.length > 0;

  if (profile && profile.status === 'APPROVED') {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            You're approved
          </CardTitle>
          <CardDescription>
            Your account is live. Head to your dashboard to start selling.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={() => navigate('/')}>Open dashboard</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
          <Sprout className="h-6 w-6 text-primary" />
          {isResubmit ? 'Resubmit your details' : 'Welcome — let’s get you set up'}
        </h1>
        <p className="text-muted-foreground">
          We need a little information about your farm and your KYC documents before you can
          start listing products. Takes about 5 minutes.
        </p>
      </div>

      <ol className="flex items-center gap-3">
        <StepPill n={1} label="Farm & address" active={step === 1} done={step > 1} />
        <span className="h-px flex-1 bg-border" />
        <StepPill n={2} label="Categories & KYC" active={step === 2} done={step > 2} />
        <span className="h-px flex-1 bg-border" />
        <StepPill n={3} label="Submitted" active={step === 3} done={step > 3} />
      </ol>

      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>About your farm</CardTitle>
            <CardDescription>
              This appears on your public storefront. You can edit later.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="ob-name">Farm / business name *</Label>
              <Input
                id="ob-name"
                value={farmName}
                onChange={(e) => setFarmName(e.target.value)}
                maxLength={200}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ob-line1">Address line 1 *</Label>
              <Input id="ob-line1" value={line1} onChange={(e) => setLine1(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ob-line2">Address line 2 (optional)</Label>
              <Input id="ob-line2" value={line2} onChange={(e) => setLine2(e.target.value)} />
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor="ob-city">City *</Label>
                <Input id="ob-city" value={city} onChange={(e) => setCity(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ob-state">State *</Label>
                <Input id="ob-state" value={state} onChange={(e) => setState(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ob-pin">Pincode *</Label>
                <Input
                  id="ob-pin"
                  value={pincode}
                  onChange={(e) => setPincode(e.target.value)}
                  pattern="\d{6}"
                  maxLength={6}
                />
              </div>
            </div>
            <div className="flex justify-end pt-2">
              <Button onClick={() => setStep(2)} disabled={!canAdvanceStep1}>
                Continue
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle>Categories & KYC documents</CardTitle>
            <CardDescription>
              Pick the categories you'll sell in, and upload at least one identity / business
              proof. We accept PAN, Aadhaar, FSSAI, GST and other government documents.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label>Categories you'll sell in *</Label>
              <CategoryPicker
                multi
                values={categoryIds}
                onChange={setCategoryIds}
                placeholder="Pick one or more categories…"
              />
            </div>

            <div className="space-y-2">
              <Label>KYC documents *</Label>
              <div className="flex flex-wrap items-end gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="ob-doctype" className="text-xs">
                    Type
                  </Label>
                  <Select
                    id="ob-doctype"
                    value={pendingType}
                    onChange={(e) => setPendingType(e.target.value as typeof pendingType)}
                    className="w-40"
                  >
                    {DOC_TYPES.map((d) => (
                      <option key={d.value} value={d.value}>
                        {d.label}
                      </option>
                    ))}
                  </Select>
                </div>
                <label className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-md border border-input bg-background px-3 text-sm font-medium hover:bg-accent">
                  <FileUp className="h-4 w-4" />
                  {uploading ? 'Uploading…' : 'Upload document'}
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    onChange={onFile}
                    disabled={uploading}
                    className="hidden"
                  />
                </label>
              </div>

              {docs.length > 0 && (
                <ul className="divide-y divide-border rounded-md border border-border">
                  {docs.map((d, i) => (
                    <li key={i} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                      <div className="flex min-w-0 items-center gap-2">
                        <Badge variant="muted">{d.type}</Badge>
                        <span className="truncate">{d.fileName ?? d.s3Key.split('/').pop()}</span>
                        {d.status === 'approved' && <Badge variant="success">approved</Badge>}
                        {d.status === 'rejected' && <Badge variant="destructive">rejected</Badge>}
                      </div>
                      <Button size="sm" variant="ghost" onClick={() => removeDoc(i)} title="Remove">
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <div className="flex justify-between pt-2">
              <Button variant="outline" onClick={() => setStep(1)}>
                <ChevronLeft className="h-4 w-4" />
                Back
              </Button>
              <Button onClick={submit} disabled={!canAdvanceStep2 || register.isPending}>
                {register.isPending ? 'Submitting…' : isResubmit ? 'Resubmit' : 'Submit for review'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 3 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              Submitted — awaiting review
            </CardTitle>
            <CardDescription>
              An admin will review your KYC shortly. You'll get a notification when it's
              approved (typically within 24 hours).
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate('/')}>Continue to dashboard</Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

const StepPill = ({
  n,
  label,
  active,
  done,
}: {
  n: number;
  label: string;
  active: boolean;
  done: boolean;
}) => (
  <li
    className={`flex items-center gap-2 rounded-full px-3 py-1 text-sm ${
      done
        ? 'bg-emerald-100 text-emerald-700'
        : active
          ? 'bg-primary/10 text-primary'
          : 'bg-secondary text-muted-foreground'
    }`}
  >
    <span
      className={`flex h-5 w-5 items-center justify-center rounded-full text-xs ${
        done ? 'bg-emerald-600 text-white' : active ? 'bg-primary text-primary-foreground' : 'bg-muted'
      }`}
    >
      {done ? '✓' : n}
    </span>
    {label}
  </li>
);
