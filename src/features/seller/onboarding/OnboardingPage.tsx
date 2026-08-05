import { useEffect, useMemo, useState, type ChangeEvent, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  FileText,
  FileUp,
  Hourglass,
  MapPin,
  Sprout,
  Store,
  Trash2,
} from 'lucide-react';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import MenuItem from '@mui/material/MenuItem';
import Stepper from '@mui/material/Stepper';
import Step from '@mui/material/Step';
import StepLabel from '@mui/material/StepLabel';
import TextField from '@mui/material/TextField';
import { CategoryPicker } from '@/components/pickers/CategoryPicker';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Label } from '@/components/ui/Label';
import { useAuth } from '@/lib/auth';
import { uploadToPresignedUrl } from '@/lib/s3-upload';
import { INDIA_STATES, districtsForState } from '@/utils/india-geo';
import { ApiError } from '@/types/api';
import {
  useKycUploadUrl,
  useSellerMe,
  useSellerRegister,
  useStorefrontAssetUploadUrl,
} from '@/features/seller/profile/api';
import type { KycDocType } from '@/features/sellers/types';

// ─── Step / option constants ────────────────────────────────────────────────

const STEPS = [
  'Account',
  'Business',
  'Products',
  'Documents',
  'Banking',
  'Store',
  'Agreement',
] as const;

const BUSINESS_TYPES = [
  { value: 'individual', label: 'Individual / Farmer' },
  { value: 'proprietorship', label: 'Sole proprietorship' },
  { value: 'partnership', label: 'Partnership' },
  { value: 'pvt_ltd', label: 'Private Limited' },
  { value: 'llp', label: 'LLP' },
  { value: 'fpo_cooperative', label: 'FPO / Cooperative' },
  { value: 'other', label: 'Other' },
];

const LISTING_BUCKETS = ['1-10', '11-50', '51-200', '200+'];
const STORE_LANGUAGES = ['English', 'Hindi', 'Bengali', 'Marathi', 'Telugu', 'Tamil', 'Gujarati', 'Kannada', 'Malayalam', 'Punjabi'];

// Document slots — PAN + one ID + Bank proof are required; GST/FSSAI optional.
const DOC_SLOTS: Array<{ type: KycDocType; label: string; hint: string; required: boolean }> = [
  { type: 'pan', label: 'PAN Card', hint: 'Business or individual PAN', required: true },
  { type: 'aadhaar', label: 'Aadhaar / Passport', hint: 'Government ID of the signatory', required: true },
  { type: 'bank_proof', label: 'Bank Account Proof', hint: 'Cancelled cheque or bank statement', required: true },
  { type: 'gst', label: 'GST Registration Certificate', hint: 'Optional — only if GST-registered', required: false },
  { type: 'fssai', label: 'FSSAI License', hint: 'Only for Grocery / Food sellers', required: false },
];

// ─── Persisted wizard state ─────────────────────────────────────────────────

interface WizardForm {
  farmName: string;
  businessType: string;
  gstNumber: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  pincode: string;
  categoryIds: string[];
  ownsBrand: string; // '', 'yes', 'no'
  expectedMonthlyListings: string;
  averagePriceInr: string;
  fulfillmentPreference: string;
  docKeys: Partial<Record<KycDocType, string>>;
  docNames: Partial<Record<KycDocType, string>>;
  accountHolderName: string;
  bankName: string;
  accountNumber: string;
  reAccountNumber: string;
  ifsc: string;
  accountType: string;
  displayName: string;
  storeLanguage: string;
  supportEmail: string;
  description: string;
  logoKey: string;
  logoName: string;
  returnsPincode: string;
  returnsLine: string;
  agAcceptedPolicies: boolean;
  agAuthorized: boolean;
  agDataConsent: boolean;
  agBackgroundCheck: boolean;
  agFeeTerms: boolean;
  legalName: string;
}

const emptyForm = (): WizardForm => ({
  farmName: '',
  businessType: '',
  gstNumber: '',
  line1: '',
  line2: '',
  city: '',
  state: '',
  pincode: '',
  categoryIds: [],
  ownsBrand: '',
  expectedMonthlyListings: '',
  averagePriceInr: '',
  fulfillmentPreference: '',
  docKeys: {},
  docNames: {},
  accountHolderName: '',
  bankName: '',
  accountNumber: '',
  reAccountNumber: '',
  ifsc: '',
  accountType: '',
  displayName: '',
  storeLanguage: 'English',
  supportEmail: '',
  description: '',
  logoKey: '',
  logoName: '',
  returnsPincode: '',
  returnsLine: '',
  agAcceptedPolicies: false,
  agAuthorized: false,
  agDataConsent: false,
  agBackgroundCheck: false,
  agFeeTerms: false,
  legalName: '',
});

export const SellerOnboardingPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: profile } = useSellerMe();
  const register = useSellerRegister();
  const kycUrl = useKycUploadUrl();
  const logoUrl = useStorefrontAssetUploadUrl();

  const isResubmit = profile?.status === 'INFO_REQUESTED' || profile?.status === 'REJECTED';
  const storageKey = `buydesi.seller-onboarding.${user?.id ?? 'anon'}`;

  const [step, setStep] = useState(0);
  const [form, setForm] = useState<WizardForm>(() => {
    try {
      const raw = localStorage.getItem(`buydesi.seller-onboarding.${user?.id ?? 'anon'}`);
      if (raw) return { ...emptyForm(), ...(JSON.parse(raw) as Partial<WizardForm>) };
    } catch {
      /* ignore corrupt cache */
    }
    // Prefill from an existing profile (resubmission).
    if (profile) {
      return {
        ...emptyForm(),
        farmName: profile.farmName ?? '',
        line1: profile.address.line1 ?? '',
        line2: profile.address.line2 ?? '',
        city: profile.address.city ?? '',
        state: profile.address.state ?? '',
        pincode: profile.pincode ?? '',
        categoryIds: profile.categoryIds ?? [],
      };
    }
    return emptyForm();
  });
  const [uploadingSlot, setUploadingSlot] = useState<KycDocType | 'logo' | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Persist to localStorage on every change so a refresh doesn't lose progress.
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(form));
    } catch {
      /* storage full / disabled — non-fatal */
    }
  }, [form, storageKey]);

  const set = <K extends keyof WizardForm>(key: K, value: WizardForm[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const uploadDoc = async (slot: KycDocType, e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    setError(null);
    setUploadingSlot(slot);
    try {
      const presigned = await kycUrl.mutateAsync({
        type: slot,
        contentType: f.type || 'application/octet-stream',
        ext: f.name.split('.').pop(),
      });
      const key = await uploadToPresignedUrl(presigned, f);
      setForm((prev) => ({
        ...prev,
        docKeys: { ...prev.docKeys, [slot]: key },
        docNames: { ...prev.docNames, [slot]: f.name },
      }));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : (err as Error).message);
    } finally {
      setUploadingSlot(null);
    }
  };

  const uploadLogo = async (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    setError(null);
    setUploadingSlot('logo');
    try {
      const presigned = await logoUrl.mutateAsync({
        kind: 'profile',
        contentType: f.type || 'image/png',
        ext: f.name.split('.').pop(),
      });
      const key = await uploadToPresignedUrl(presigned, f);
      set('logoKey', key);
      set('logoName', f.name);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : (err as Error).message);
    } finally {
      setUploadingSlot(null);
    }
  };

  // ─── Per-step validation ───
  const stepValid = useMemo(() => {
    const pinOk = (p: string) => /^\d{6}$/.test(p);
    return [
      true, // Account (read-only)
      form.farmName.trim().length >= 2 &&
        form.line1.trim().length >= 2 &&
        form.city.trim().length >= 2 &&
        !!form.state &&
        pinOk(form.pincode), // Business
      form.categoryIds.length > 0, // Products
      Boolean(form.docKeys.pan && form.docKeys.aadhaar && form.docKeys.bank_proof), // Documents
      form.accountHolderName.trim().length >= 2 &&
        /^\d{9,18}$/.test(form.accountNumber) &&
        form.accountNumber === form.reAccountNumber &&
        /^[A-Z]{4}0[A-Z0-9]{6}$/.test(form.ifsc.toUpperCase()) &&
        form.bankName.trim().length >= 2 &&
        !!form.accountType, // Banking
      form.displayName.trim().length >= 2, // Store
      form.agAcceptedPolicies &&
        form.agAuthorized &&
        form.agDataConsent &&
        form.agBackgroundCheck &&
        form.agFeeTerms &&
        form.legalName.trim().length >= 2, // Agreement
    ];
  }, [form]);

  const submit = async () => {
    setError(null);
    try {
      await register.mutateAsync({
        farmName: form.farmName.trim(),
        address: {
          line1: form.line1.trim(),
          line2: form.line2.trim() || undefined,
          city: form.city.trim(),
          state: form.state,
          pincode: form.pincode.trim(),
        },
        pincode: form.pincode.trim(),
        categoryIds: form.categoryIds,
        kycDocuments: (Object.entries(form.docKeys) as Array<[KycDocType, string | undefined]>)
          .filter(([, v]) => Boolean(v))
          .map(([type, s3Key]) => ({ type, s3Key: s3Key as string })),
        businessType: (form.businessType || undefined) as never,
        gstNumber: form.gstNumber.trim() || undefined,
        businessProfile: {
          ownsBrand: form.ownsBrand ? form.ownsBrand === 'yes' : undefined,
          expectedMonthlyListings: (form.expectedMonthlyListings || undefined) as never,
          averagePriceInr: form.averagePriceInr ? Number(form.averagePriceInr) : undefined,
          fulfillmentPreference: (form.fulfillmentPreference || undefined) as never,
        },
        bankDetails: {
          accountNumber: form.accountNumber,
          ifsc: form.ifsc.toUpperCase(),
          accountHolderName: form.accountHolderName.trim(),
          bankName: form.bankName.trim(),
          accountType: form.accountType as 'current' | 'savings',
        },
        displayName: form.displayName.trim() || undefined,
        storeLanguage: form.storeLanguage || undefined,
        supportEmail: form.supportEmail.trim() || undefined,
        description: form.description.trim() || undefined,
        logo: form.logoKey || undefined,
        returnsAddress:
          /^\d{6}$/.test(form.returnsPincode) && form.returnsLine.trim()
            ? { pincode: form.returnsPincode, line: form.returnsLine.trim() }
            : undefined,
        agreement: {
          acceptedPolicies: true,
          authorizedToBind: true,
          dataConsent: true,
          backgroundCheck: true,
          feeTerms: true,
          legalName: form.legalName.trim(),
          signedAt: new Date().toISOString(),
        },
      });
      localStorage.removeItem(storageKey);
      setStep(STEPS.length); // show the done panel
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Submission failed');
    }
  };

  const ifscInvalid = Boolean(form.ifsc) && !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(form.ifsc.toUpperCase());
  const accountNumInvalid = Boolean(form.accountNumber) && !/^\d{9,18}$/.test(form.accountNumber);

  if (profile && profile.status === 'APPROVED') {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-emerald-600" /> You're approved
          </CardTitle>
          <CardDescription>Your account is live. Head to your dashboard to start selling.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={() => navigate('/')}>Open dashboard</Button>
        </CardContent>
      </Card>
    );
  }

  // Submitted and awaiting review — show a clean status screen, not the form.
  if (profile && profile.status === 'PENDING') {
    return (
      <Stack spacing={3} sx={{ mx: 'auto', maxWidth: 672, width: '100%' }}>
        <Card className="overflow-hidden">
          <div className="flex items-start gap-4 border-b border-border bg-amber-50 p-6">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-600">
              <Hourglass className="h-6 w-6" />
            </div>
            <div>
              <Typography variant="h5" component="h1">Application under review</Typography>
              <p className="mt-1 text-sm text-muted-foreground">
                Thanks{profile.farmName ? `, ${profile.farmName}` : ''}! We've received your
                details and an admin is reviewing your KYC — usually within 24 hours. You'll get a
                notification the moment it's approved.
              </p>
            </div>
          </div>
          <CardContent className="space-y-4 pt-6">
            <p className="text-sm font-medium text-muted-foreground">What you submitted</p>
            <dl className="grid gap-4 sm:grid-cols-2">
              <SummaryRow icon={Store} label="Business" value={profile.farmName} />
              <SummaryRow
                icon={MapPin}
                label="Location"
                value={[profile.address?.city, profile.address?.state].filter(Boolean).join(', ') || '—'}
              />
              <SummaryRow
                icon={Sprout}
                label="Categories"
                value={`${profile.categoryIds?.length ?? 0} selected`}
              />
              <SummaryRow
                icon={FileText}
                label="Documents"
                value={`${profile.kycDocuments?.length ?? 0} uploaded`}
              />
            </dl>
            <div className="rounded-md border border-border bg-secondary/30 p-3 text-xs text-muted-foreground">
              Product listing and payouts unlock once your account is approved. We'll email and
              notify you here.
            </div>
            <div className="flex flex-wrap gap-2 pt-1">
              <Button onClick={() => navigate('/')}>Go to dashboard</Button>
              <Button variant="outline" onClick={() => navigate('/seller/support')}>
                Contact support
              </Button>
            </div>
          </CardContent>
        </Card>
      </Stack>
    );
  }

  const submitted = step >= STEPS.length;

  return (
    <Stack spacing={3} sx={{ width: '100%' }}>
      <div>
        <Typography
          variant="h4"
          component="h1"
          sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
        >
          <Sprout className="h-6 w-6 text-primary" />
          {isResubmit ? 'Resubmit your details' : 'Welcome — let’s get you set up'}
        </Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          Tell us about your business, upload your documents and set up your store. Your progress is
          saved automatically.
        </Typography>
      </div>

      {/* Stepper */}
      <Stepper activeStep={submitted ? STEPS.length : step} alternativeLabel sx={{ mb: 1 }}>
        {STEPS.map((label) => (
          <Step key={label}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>

      {submitted ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" /> Submitted — awaiting review
            </CardTitle>
            <CardDescription>
              An admin will review your KYC shortly. You'll get a notification when it's approved
              (typically within 24 hours).
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate('/')}>Continue to dashboard</Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="space-y-4 pt-6">
            {/* ── Step 1: Account ── */}
            {step === 0 && (
              <>
                <Typography variant="h6">Your account</Typography>
                <p className="text-sm text-muted-foreground">
                  You're signed in with this account. The rest of the wizard sets up your seller
                  profile.
                </p>
                <dl className="grid gap-3 rounded-md border border-border p-4 text-sm sm:grid-cols-3">
                  <div>
                    <dt className="text-muted-foreground">Name</dt>
                    <dd className="font-medium">{user?.name ?? '—'}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Email</dt>
                    <dd className="font-medium">{user?.email ?? '—'}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Mobile</dt>
                    <dd className="font-medium">{user?.mobile ?? '—'}</dd>
                  </div>
                </dl>
              </>
            )}

            {/* ── Step 2: Business ── */}
            {step === 1 && (
              <>
                <Typography variant="h6">Business details</Typography>
                <div className="grid gap-3 sm:grid-cols-2">
                  <TextField
                    fullWidth
                    label="Farm / business name"
                    required
                    value={form.farmName}
                    onChange={(e) => set('farmName', e.target.value)}
                    InputLabelProps={{ shrink: true }}
                    inputProps={{ maxLength: 200 }}
                  />
                  <TextField
                    select
                    fullWidth
                    label="Business type"
                    value={form.businessType}
                    onChange={(e) => set('businessType', e.target.value)}
                    InputLabelProps={{ shrink: true }}
                  >
                    <MenuItem value="">Select…</MenuItem>
                    {BUSINESS_TYPES.map((b) => (
                      <MenuItem key={b.value} value={b.value}>
                        {b.label}
                      </MenuItem>
                    ))}
                  </TextField>
                </div>
                <TextField
                  fullWidth
                  label="GST number (optional)"
                  value={form.gstNumber}
                  onChange={(e) => set('gstNumber', e.target.value.toUpperCase())}
                  placeholder="15-character GSTIN (leave blank if exempt)"
                  InputLabelProps={{ shrink: true }}
                  inputProps={{ maxLength: 15 }}
                />
                <TextField
                  fullWidth
                  label="Address line 1"
                  required
                  value={form.line1}
                  onChange={(e) => set('line1', e.target.value)}
                  InputLabelProps={{ shrink: true }}
                />
                <TextField
                  fullWidth
                  label="Address line 2 (optional)"
                  value={form.line2}
                  onChange={(e) => set('line2', e.target.value)}
                  InputLabelProps={{ shrink: true }}
                />
                <div className="grid gap-3 sm:grid-cols-3">
                  <TextField
                    select
                    fullWidth
                    label="State"
                    required
                    value={form.state}
                    onChange={(e) => {
                      set('state', e.target.value);
                      set('city', '');
                    }}
                    InputLabelProps={{ shrink: true }}
                  >
                    <MenuItem value="">Select…</MenuItem>
                    {INDIA_STATES.map((s) => (
                      <MenuItem key={s} value={s}>
                        {s}
                      </MenuItem>
                    ))}
                  </TextField>
                  <TextField
                    fullWidth
                    label="City / District"
                    required
                    value={form.city}
                    onChange={(e) => set('city', e.target.value)}
                    disabled={!form.state}
                    placeholder={form.state ? 'Pick or type…' : 'Select a state first'}
                    InputLabelProps={{ shrink: true }}
                    inputProps={{ list: 'ob-city-list' }}
                  />
                  <datalist id="ob-city-list">
                    {districtsForState(form.state).map((d) => (
                      <option key={d} value={d} />
                    ))}
                  </datalist>
                  <TextField
                    fullWidth
                    label="Pincode"
                    required
                    value={form.pincode}
                    onChange={(e) => set('pincode', e.target.value)}
                    InputLabelProps={{ shrink: true }}
                    inputProps={{ maxLength: 6 }}
                  />
                </div>
              </>
            )}

            {/* ── Step 3: Products ── */}
            {step === 2 && (
              <>
                <Typography variant="h6">Products & categories</Typography>
                <div>
                  <Typography variant="subtitle2" sx={{ mb: 1 }}>
                    Categories you'll sell in *
                  </Typography>
                  <CategoryPicker
                    multi
                    values={form.categoryIds}
                    onChange={(v) => set('categoryIds', v)}
                    placeholder="Pick one or more categories…"
                  />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <TextField
                    select
                    fullWidth
                    label="Do you own a brand?"
                    value={form.ownsBrand}
                    onChange={(e) => set('ownsBrand', e.target.value)}
                    InputLabelProps={{ shrink: true }}
                  >
                    <MenuItem value="">Select…</MenuItem>
                    <MenuItem value="no">No — I resell / sell my produce</MenuItem>
                    <MenuItem value="yes">Yes — I have my own brand</MenuItem>
                  </TextField>
                  <TextField
                    select
                    fullWidth
                    label="Expected monthly listings"
                    value={form.expectedMonthlyListings}
                    onChange={(e) => set('expectedMonthlyListings', e.target.value)}
                    InputLabelProps={{ shrink: true }}
                  >
                    <MenuItem value="">Select…</MenuItem>
                    {LISTING_BUCKETS.map((b) => (
                      <MenuItem key={b} value={b}>
                        {b}
                      </MenuItem>
                    ))}
                  </TextField>
                  <TextField
                    fullWidth
                    type="number"
                    label="Average product price (₹)"
                    value={form.averagePriceInr}
                    onChange={(e) => set('averagePriceInr', e.target.value)}
                    InputLabelProps={{ shrink: true }}
                    inputProps={{ min: 0 }}
                  />
                  <TextField
                    select
                    fullWidth
                    label="Fulfilment preference"
                    value={form.fulfillmentPreference}
                    onChange={(e) => set('fulfillmentPreference', e.target.value)}
                    InputLabelProps={{ shrink: true }}
                  >
                    <MenuItem value="">Select…</MenuItem>
                    <MenuItem value="delhivery_pickup">Delhivery pickup from my address</MenuItem>
                    <MenuItem value="self_drop">Self-drop at a Delhivery centre</MenuItem>
                  </TextField>
                </div>
              </>
            )}

            {/* ── Step 4: Documents ── */}
            {step === 3 && (
              <>
                <Typography variant="h6">Identity & tax documents</Typography>
                <p className="text-sm text-muted-foreground">
                  Documents are encrypted and used only for verification. PAN, a government ID and a
                  bank proof are required.
                </p>
                <ul className="divide-y divide-border rounded-md border border-border">
                  {DOC_SLOTS.map((slot) => (
                    <li key={slot.type} className="flex items-center justify-between gap-3 px-3 py-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 text-sm font-medium">
                          {slot.label}
                          {slot.required ? (
                            <span className="text-destructive">*</span>
                          ) : (
                            <Badge variant="muted">optional</Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">{slot.hint}</p>
                        {form.docKeys[slot.type] && (
                          <p className="mt-0.5 flex items-center gap-1 text-xs text-emerald-600">
                            <CheckCircle2 className="h-3 w-3" />
                            {form.docNames[slot.type] ?? 'Uploaded'}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <label className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-md border border-input bg-background px-3 text-sm font-medium hover:bg-accent">
                          <FileUp className="h-4 w-4" />
                          {uploadingSlot === slot.type
                            ? 'Uploading…'
                            : form.docKeys[slot.type]
                              ? 'Replace'
                              : 'Upload'}
                          <input
                            type="file"
                            accept="image/*,application/pdf"
                            className="hidden"
                            disabled={uploadingSlot !== null}
                            onChange={(e) => uploadDoc(slot.type, e)}
                          />
                        </label>
                        {form.docKeys[slot.type] && (
                          <Button
                            size="sm"
                            variant="ghost"
                            title="Remove"
                            onClick={() =>
                              setForm((prev) => {
                                const dk = { ...prev.docKeys };
                                const dn = { ...prev.docNames };
                                delete dk[slot.type];
                                delete dn[slot.type];
                                return { ...prev, docKeys: dk, docNames: dn };
                              })
                            }
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </>
            )}

            {/* ── Step 5: Banking ── */}
            {step === 4 && (
              <>
                <Typography variant="h6">Bank account details</Typography>
                <p className="text-sm text-muted-foreground">
                  Where should we deposit your earnings? The account should be in your business name.
                </p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <TextField
                    fullWidth
                    label="Account holder name"
                    required
                    value={form.accountHolderName}
                    onChange={(e) => set('accountHolderName', e.target.value)}
                    InputLabelProps={{ shrink: true }}
                  />
                  <TextField
                    fullWidth
                    label="Bank name"
                    required
                    value={form.bankName}
                    onChange={(e) => set('bankName', e.target.value)}
                    InputLabelProps={{ shrink: true }}
                  />
                  <TextField
                    fullWidth
                    label="Account number"
                    required
                    value={form.accountNumber}
                    onChange={(e) => set('accountNumber', e.target.value)}
                    InputLabelProps={{ shrink: true }}
                    error={accountNumInvalid}
                    helperText={accountNumInvalid ? 'Account number must be 9–18 digits.' : undefined}
                  />
                  <TextField
                    fullWidth
                    label="Re-enter account number"
                    required
                    value={form.reAccountNumber}
                    onChange={(e) => set('reAccountNumber', e.target.value)}
                    InputLabelProps={{ shrink: true }}
                  />
                  <TextField
                    fullWidth
                    label="IFSC code"
                    required
                    value={form.ifsc}
                    onChange={(e) => set('ifsc', e.target.value.toUpperCase())}
                    placeholder="ICIC0006515"
                    InputLabelProps={{ shrink: true }}
                    inputProps={{ maxLength: 11 }}
                    error={ifscInvalid}
                    helperText={
                      ifscInvalid
                        ? 'Invalid IFSC. Format: 4 letters + “0” + 6 characters (e.g. ICIC0006515).'
                        : '11 characters — 4 bank letters, then 0, then the branch code.'
                    }
                  />
                  <TextField
                    select
                    fullWidth
                    label="Account type"
                    required
                    value={form.accountType}
                    onChange={(e) => set('accountType', e.target.value)}
                    InputLabelProps={{ shrink: true }}
                  >
                    <MenuItem value="">Select…</MenuItem>
                    <MenuItem value="current">Current</MenuItem>
                    <MenuItem value="savings">Savings</MenuItem>
                  </TextField>
                </div>
                {form.accountNumber && form.reAccountNumber && form.accountNumber !== form.reAccountNumber && (
                  <Alert severity="error">Account numbers don't match.</Alert>
                )}
              </>
            )}

            {/* ── Step 6: Store ── */}
            {step === 5 && (
              <>
                <Typography variant="h6">Set up your storefront</Typography>
                <div className="grid gap-3 sm:grid-cols-2">
                  <TextField
                    fullWidth
                    label="Store / display name"
                    required
                    value={form.displayName}
                    onChange={(e) => set('displayName', e.target.value)}
                    placeholder="What buyers will see"
                    InputLabelProps={{ shrink: true }}
                    inputProps={{ maxLength: 50 }}
                  />
                  <TextField
                    select
                    fullWidth
                    label="Store language"
                    value={form.storeLanguage}
                    onChange={(e) => set('storeLanguage', e.target.value)}
                    InputLabelProps={{ shrink: true }}
                  >
                    {STORE_LANGUAGES.map((l) => (
                      <MenuItem key={l} value={l}>
                        {l}
                      </MenuItem>
                    ))}
                  </TextField>
                </div>
                <TextField
                  fullWidth
                  type="email"
                  label="Customer service email"
                  value={form.supportEmail}
                  onChange={(e) => set('supportEmail', e.target.value)}
                  placeholder="support@yourbrand.com"
                  InputLabelProps={{ shrink: true }}
                />
                <TextField
                  fullWidth
                  multiline
                  minRows={3}
                  label="Store description"
                  value={form.description}
                  onChange={(e) => set('description', e.target.value)}
                  placeholder="Tell customers about your farm, produce and what makes you unique…"
                  InputLabelProps={{ shrink: true }}
                  inputProps={{ maxLength: 2000 }}
                />
                <Field label="Store logo (optional)">
                  <div className="flex items-center gap-3">
                    <label className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-md border border-input bg-background px-3 text-sm font-medium hover:bg-accent">
                      <FileUp className="h-4 w-4" />
                      {uploadingSlot === 'logo' ? 'Uploading…' : form.logoKey ? 'Replace logo' : 'Upload logo'}
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        disabled={uploadingSlot !== null}
                        onChange={uploadLogo}
                      />
                    </label>
                    {form.logoName && <span className="text-xs text-muted-foreground">{form.logoName}</span>}
                  </div>
                </Field>
                <div className="grid gap-3 sm:grid-cols-3">
                  <TextField
                    fullWidth
                    label="Returns PIN code"
                    value={form.returnsPincode}
                    onChange={(e) => set('returnsPincode', e.target.value)}
                    InputLabelProps={{ shrink: true }}
                    inputProps={{ maxLength: 6 }}
                  />
                  <div className="sm:col-span-2">
                    <TextField
                      fullWidth
                      label="Returns address"
                      value={form.returnsLine}
                      onChange={(e) => set('returnsLine', e.target.value)}
                      InputLabelProps={{ shrink: true }}
                    />
                  </div>
                </div>
              </>
            )}

            {/* ── Step 7: Agreement ── */}
            {step === 6 && (
              <>
                <Typography variant="h6">Seller agreement & verification</Typography>
                <div className="space-y-2">
                  {[
                    ['agAcceptedPolicies', 'I have read and agree to the Buy Desi Seller Agreement and all applicable policies.'],
                    ['agAuthorized', 'I confirm I am authorised to legally bind this business and that all information is accurate.'],
                    ['agDataConsent', 'I consent to Buy Desi processing my personal and business data for onboarding and account management.'],
                    ['agBackgroundCheck', 'I understand Buy Desi may conduct verification and contact regulatory authorities to validate my details.'],
                    ['agFeeTerms', 'I agree to the commission / fee schedule, delivery terms and disbursement policy.'],
                  ].map(([key, text]) => (
                    <FormControlLabel
                      key={key}
                      sx={{ alignItems: 'flex-start', display: 'flex', m: 0 }}
                      control={
                        <Checkbox
                          sx={{ py: 0 }}
                          checked={form[key as keyof WizardForm] as boolean}
                          onChange={(e) => set(key as keyof WizardForm, e.target.checked as never)}
                        />
                      }
                      label={<span className="text-sm">{text}</span>}
                    />
                  ))}
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <TextField
                    fullWidth
                    label="Full legal name (e-signature)"
                    required
                    value={form.legalName}
                    onChange={(e) =>
                      // An e-signature is a person's name — letters, spaces and
                      // the punctuation real names use. No digits or symbols.
                      set('legalName', e.target.value.replace(/[^A-Za-z\s.'-]/g, ''))
                    }
                    placeholder="Sign by typing your legal name"
                    helperText="Letters only — this is your signature"
                    InputLabelProps={{ shrink: true }}
                  />
                  <TextField
                    fullWidth
                    label="Date"
                    value={new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                    disabled
                    InputLabelProps={{ shrink: true }}
                  />
                </div>
              </>
            )}

            {error && <Alert severity="error">{error}</Alert>}

            {/* Nav */}
            <div className="flex items-center justify-between gap-4 border-t border-border pt-4">
              <Button variant="outline" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}>
                <ChevronLeft className="h-4 w-4" /> Back
              </Button>
              {!stepValid[step] && (
                <span className="text-xs text-muted-foreground">
                  Complete the required fields (*) to continue.
                </span>
              )}
              {step < STEPS.length - 1 ? (
                <Button onClick={() => setStep((s) => s + 1)} disabled={!stepValid[step]}>
                  Save and continue <ChevronRight className="h-4 w-4" />
                </Button>
              ) : (
                <Button onClick={submit} disabled={!stepValid[step] || register.isPending}>
                  {register.isPending ? 'Submitting…' : 'Submit registration'}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </Stack>
  );
};

const Field = ({ label, children }: { label: string; children: ReactNode }) => (
  <div className="space-y-1.5">
    <Label>{label}</Label>
    {children}
  </div>
);

const SummaryRow = ({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Store;
  label: string;
  value: string;
}) => (
  <div className="flex items-center gap-3 rounded-md border border-border p-3">
    <div className="flex h-9 w-9 items-center justify-center rounded-md bg-secondary text-muted-foreground">
      <Icon className="h-4 w-4" />
    </div>
    <div className="min-w-0">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="truncate text-sm font-medium">{value}</dd>
    </div>
  </div>
);
